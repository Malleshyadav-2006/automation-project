import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const createTransporter = (email, password) => nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: email,
    pass: password,
  },
  tls: { rejectUnauthorized: false }
});

export const generateColdEmail = async (lead, senderName, senderRole) => {
  const prompt = `You are a world-class copywriter helping ${senderName}, a ${senderRole}, write a highly unique, conversational, and personalized cold email. 

Prospect details:
- Name: ${lead.name || 'there'}
- Role/Title: ${lead.role || 'Hiring Manager'}
- Company: ${lead.company || 'your company'}
- LinkedIn URL: ${lead.linkedin_url || 'not provided'}
- Notes/Context: ${lead.notes || 'None'}

Goal: Write a friendly outreach email asking about job or networking opportunities.

CRITICAL INSTRUCTIONS TO BE UNIQUE:
- DO NOT use the exact same intro structure every time. Vary your opening hook (e.g. sometimes compliment their work, sometimes ask a question, sometimes mention a shared interest based on their title/notes).
- DO NOT sound corporate, robotic, or pushy. Keep it very conversational and warm.
- Briefly align ${senderName}'s background (${senderRole}) with what ${lead.company || 'their company'} does.
- Mention that a resume is attached for their convenience.
- End with a low-friction, soft open-ended question (e.g., "Would you be open to a quick chat?", "Are you planning to expand the team soon?", etc.)
- Keep the entire body under 100 words. Make it easily scannable.
- Generate a highly creative and relevant subject line (vary this significantly from person to person).

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{"subject": "string", "body": "string (use \\n for line breaks)"}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o-mini',
      temperature: 0.9, // Higher temp forces more creative/varied outputs
      response_format: { type: 'json_object' }
    });
    return JSON.parse(completion.choices[0].message.content);
  } catch (err) {
    console.error(`⚠️ OpenAI generation failed: ${err.message}. Using fallback template.`);
    return {
      subject: `Connecting regarding opportunities at ${lead.company || 'your company'}`,
      body: `Hi ${lead.name ? lead.name.split(' ')[0] : 'there'},\n\nI hope you're having a great week.\n\nI was looking into ${lead.company || 'your company'} and loved what your team is building. As a ${senderRole}, I've been searching for exciting roles and wanted to reach out directly.\n\nI've attached my resume here just in case you or the team might have any current or future openings that fit my background.\n\nWould be great to connect regardless!\n\nBest,\n${senderName}`
    };
  }
};

const buildHtmlBody = (body) => {
  const paragraphs = body
    .split('\n')
    .filter(p => p.trim())
    .map(p => `<p style="margin: 0 0 12px 0; line-height: 1.6;">${p.trim()}</p>`)
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; color: #333; padding: 20px;">
      ${paragraphs}
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">
        You're receiving this as a professional outreach email. Please feel free to ignore if not relevant.
      </p>
    </div>`;
};

export const sendColdEmail = async (sender, lead, subject, body, messageLogId) => {
  const resumePath = path.resolve(__dirname, '..', 'assets', process.env.RESUME_FILENAME || 'resume.pdf');

  const attachments = [];
  if (fs.existsSync(resumePath)) {
    attachments.push({
      filename: process.env.RESUME_FILENAME || 'resume.pdf',
      path: resumePath,
    });
  }

  const transporter = createTransporter(sender.email, sender.app_password);
  const htmlBody = buildHtmlBody(body);

  const info = await transporter.sendMail({
    from: `"${sender.sender_name}" <${sender.email}>`,
    to: lead.email,
    subject,
    html: htmlBody,
    text: body,
    attachments,
  });

  console.log(`✅ Email sent from ${sender.email} to ${lead.email} | Message-ID: ${info.messageId}`);
  return info;
};

// MULTI-SENDER OUTREACH CYCLE
export const runOutreachCycle = async () => {
  console.log('\n⚡ [CRON] Running multi-sender outreach cycle...');

  // 1. Get all active senders
  const { data: senders, error: sendersErr } = await supabase
    .from('senders')
    .select('*')
    .eq('status', 'Active')
    .order('last_used_at', { ascending: true, nullsFirst: true });

  if (sendersErr) { console.error('DB error fetching senders:', sendersErr.message); return; }
  if (!senders || senders.length === 0) { console.log('✓ No active senders configured in DB. Skipping run.'); return; }

  // 2. Fetch enough pending leads to distribute to our senders
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'Pending')
    .order('created_at', { ascending: true })
    .limit(senders.length);

  if (leadsErr) { console.error('DB error fetching leads:', leadsErr.message); return; }
  if (!leads || leads.length === 0) { console.log('✓ No pending leads found.'); return; }

  console.log(`🚀 Distributing ${leads.length} leads across ${senders.length} active senders...`);

  // 3. Process each lead concurrently assigned to a different sender
  await Promise.all(leads.map(async (lead, index) => {
    // If fewer leads than senders, the remaining senders do nothing this cycle
    const sender = senders[index];

    try {
      console.log(`📧 Sender [${sender.email}] processing lead: [${lead.email}]`);
      
      const { subject, body } = await generateColdEmail(lead, sender.sender_name, sender.sender_role);

      const { data: logData, error: logError } = await supabase
        .from('message_logs')
        .insert([{
          lead_id: lead.id,
          type: 'cold_outreach',
          subject,
          body,
          delivery_status: 'sending',
        }])
        .select()
        .single();

      if (logError) throw new Error('Log DB error: ' + logError.message);

      const info = await sendColdEmail(sender, lead, subject, body, logData.id);

      await supabase.from('message_logs').update({
        delivery_status: 'delivered',
        thread_id: info.messageId,
        sent_at: new Date().toISOString(),
      }).eq('id', logData.id);

      await supabase.from('leads').update({
        status: 'Sent',
        last_contacted_at: new Date().toISOString(),
      }).eq('id', lead.id);

      // Update sender last_used_at flag for round robin fairness
      await supabase.from('senders').update({
        last_used_at: new Date().toISOString()
      }).eq('id', sender.id);

    } catch (err) {
      console.error(`❌ Failed sender ${sender.email} -> lead ${lead.email}:`, err.message);
      await supabase.from('leads').update({ status: 'Bounced' }).eq('id', lead.id);
    }
  }));
};
