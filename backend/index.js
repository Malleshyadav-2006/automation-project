import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import * as xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import cron from 'node-cron';
import { runOutreachCycle } from './services/emailService.js';
import { checkReplies } from './services/imapService.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ─── HEALTH CHECK & KEEP-ALIVE ──────────────────────────────────────────────
app.get('/ping', (req, res) => res.status(200).json({ status: 'ok', uptime: process.uptime() }));
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// Self-ping to prevent Render free tier spin-down (every 14 minutes)
const SELF_PING_INTERVAL = 14 * 60 * 1000; // 14 minutes
const startKeepAlive = () => {
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL; // auto-set by Render
  if (!RENDER_URL) {
    console.log('⚠️  RENDER_EXTERNAL_URL not set — self-ping disabled (local dev mode).');
    return;
  }
  setInterval(async () => {
    try {
      const res = await fetch(`${RENDER_URL}/ping`);
      const data = await res.json();
      console.log(`🏓 Keep-alive ping OK — uptime: ${Math.round(data.uptime)}s`);
    } catch (err) {
      console.error('🏓 Keep-alive ping failed:', err.message);
    }
  }, SELF_PING_INTERVAL);
  console.log(`🏓 Self-ping keep-alive active (every 14 min) → ${RENDER_URL}/ping`);
};

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

// ─── LEADS API ──────────────────────────────────────────────────────────────

app.get('/api/leads', async (req, res) => {
  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/leads', async (req, res) => {
  const { data, error } = await supabase.from('leads').insert([req.body]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// Bulk insert — accepts an array of lead objects
app.post('/api/leads/bulk', async (req, res) => {
  const leads = req.body;
  if (!Array.isArray(leads) || leads.length === 0)
    return res.status(400).json({ error: 'Expected a non-empty array of leads' });

  const valid = leads.filter(l => l.email && l.email.trim());
  if (valid.length === 0)
    return res.status(400).json({ error: 'No valid email addresses found in the submitted leads' });

  const { data, error } = await supabase.from('leads').insert(valid).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: `Successfully added ${data.length} leads`, data });
});

// File Upload — supports CSV and Excel (.xlsx). Columns: Name, Email, Company, Role/Title, LinkedIn_URL, Website, Notes
app.post('/api/leads/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);
    
    fs.unlinkSync(req.file.path);

    const results = rows.map(row => ({
      name:         row.Name         || row.name         || '',
      company:      row.Company      || row.company      || '',
      email:        row.Email        || row.email        || null,
      role:         row.Role         || row.role         || row.Title || row.title || '',
      website:      row.Website      || row.website      || '',
      linkedin_url: row.LinkedIn_URL || row.linkedin_url || row.LinkedIn || row.linkedin || '',
      notes:        row.Notes        || row.notes        || '',
      status:       'Pending',
    }));

    const validLeads = results.filter(l => l.email);
    if (validLeads.length === 0) return res.status(400).json({ error: 'No valid emails found in file' });
    
    const { data, error } = await supabase.from('leads').insert(validLeads).select();
    if (error) throw new Error(error.message);
    
    res.json({ message: `Successfully imported ${validLeads.length} leads`, data });
  } catch (err) {
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error(err);
    res.status(500).json({ error: 'Failed to process file: ' + err.message });
  }
});

// ─── SENDERS API ─────────────────────────────────────────────────────────────

app.get('/api/senders', async (req, res) => {
  const { data, error } = await supabase.from('senders').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/senders', async (req, res) => {
  const { data, error } = await supabase.from('senders').insert([req.body]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

app.delete('/api/senders/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('senders').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ─── AI EMAIL API ────────────────────────────────────────────────────────────

// Generate preview draft for one lead
app.post('/api/emails/generate', async (req, res) => {
  const { leadId } = req.body;
  if (!leadId) return res.status(400).json({ error: 'Lead ID required' });

  const { data: lead, error: leadError } = await supabase.from('leads').select('*').eq('id', leadId).single();
  if (leadError || !lead) return res.status(404).json({ error: 'Lead not found' });

  try {
    const senderName = process.env.SENDER_NAME || 'Job Seeker';
    const senderRole = process.env.SENDER_ROLE || 'Software Developer';

    const prompt = `You are helping ${senderName}, a ${senderRole}, write a genuine, warm cold email.
Prospect: ${lead.name || 'there'}, ${lead.role || 'Manager'} at ${lead.company || 'your company'}.
LinkedIn: ${lead.linkedin_url || 'N/A'}.
Write a friendly 100-word job outreach email. Mention resume is attached.
Return JSON: {"subject": "...", "body": "..."}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' }
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);

    const { data: log, error: logError } = await supabase.from('message_logs').insert([{
      lead_id: lead.id,
      type: 'initial_draft',
      subject: aiResponse.subject,
      body: aiResponse.body,
      delivery_status: 'draft'
    }]).select();

    if (logError) throw new Error(logError.message);
    await supabase.from('leads').update({ status: 'Drafted' }).eq('id', lead.id);
    res.json(log[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate email: ' + err.message });
  }
});

// Manually trigger one outreach cycle immediately (for testing without waiting 20m)
app.post('/api/emails/send-next', async (req, res) => {
  try {
    await runOutreachCycle();
    res.json({ success: true, message: 'Outreach cycle executed — check terminal logs.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SETTINGS API ──────────────────────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  try {
    const settingsPath = path.resolve('settings.json');
    const settingsData = fs.existsSync(settingsPath) ? fs.readFileSync(settingsPath, 'utf8') : '{"isRunning": false}';
    res.json(JSON.parse(settingsData));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const { isRunning } = req.body;
    const settingsPath = path.resolve('settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify({ isRunning }, null, 2), 'utf8');
    res.json({ success: true, isRunning });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DASHBOARD API ───────────────────────────────────────────────────────────

app.get('/api/stats', async (req, res) => {
  const [
    { count: totalLeads },
    { count: sent },
    { count: replied },
    { count: bounced },
    { count: pending }
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Sent'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Replied'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Bounced'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
  ]);
  res.json({ totalLeads: totalLeads || 0, sent: sent || 0, replied: replied || 0, bounced: bounced || 0, pending: pending || 0 });
});

// Audit trail — last 50 message logs
app.get('/api/logs', async (req, res) => {
  const { data, error } = await supabase
    .from('message_logs')
    .select('*, leads(name, email, company)')
    .order('sent_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ─── GET SYSTEM STATE ───
const getSystemState = () => {
  try {
    const p = path.resolve('settings.json');
    if (!fs.existsSync(p)) return false;
    return JSON.parse(fs.readFileSync(p, 'utf8')).isRunning === true;
  } catch { return false; }
};

// ─── CRON JOBS ───────────────────────────────────────────────────────────────

// Every 20 minutes: pick the next Pending lead, generate AI email, send with resume
cron.schedule('*/20 * * * *', () => {
  if (!getSystemState()) return console.log('⏸️ [CRON] Engine paused. Skipping outreach cycle.');
  console.log('\n🕐 [20-min CRON] Triggering outreach cycle...');
  runOutreachCycle();
});

// Every 15 minutes: check inbox for replies, halt follow-ups on those leads
cron.schedule('*/15 * * * *', () => {
  if (!getSystemState()) return; // Pause IMAP pulling if engine stopped
  console.log('🔍 [15-min CRON] Checking for replies...');
  checkReplies();
});

// Once a day: Re-queue all bounced leads to pending so they can be rotated to another sender
cron.schedule('0 0 * * *', async () => {
  console.log('♻️ [DAILY CRON] Re-queuing bounced leads...');
  await supabase.from('leads').update({ status: 'Pending' }).eq('status', 'Bounced');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Backend running on port ${PORT}`);
  console.log(`📧 Outreach cron: every 20 minutes`);
  console.log(`🔍 Reply detector: every 15 minutes`);
  startKeepAlive();
  console.log('');
});
