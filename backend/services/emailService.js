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
  auth: { user: email, pass: password },
  tls: { rejectUnauthorized: false }
});

// ─── Read AI rules from settings.json ────────────────────────────────────────
const getAiRules = () => {
  try {
    const p = path.resolve('settings.json');
    if (!fs.existsSync(p)) return '';
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    return data.ai_system_rules || '';
  } catch { return ''; }
};

// ─── COLD EMAIL GENERATION ───────────────────────────────────────────────────
export const generateColdEmail = async (lead, senderName, senderRole) => {
  const aiRules = getAiRules();
  const extraRules = aiRules ? `\nADDITIONAL RULES FROM YOUR MANAGER:\n${aiRules}\n` : '';

  // Proven angle frameworks — rotate to guarantee variety
  const angles = [
    `SPECIFIC PAIN: Reference a real pain point in their industry or company stage. Then show how ${senderName} as a ${senderRole} solves exactly that.`,
    `COMPANY HOOK: Call out something specific about their company (from the notes), then connect it to why you (${senderName}) are reaching out now.`,
    `CURIOSITY GAP: Start with a question about something specific to their company/role that only someone who did real research would ask.`,
    `PEER SOCIAL PROOF: Mention a similar company or role you've worked with (or would work well with), then bridge to them.`,
    `ULTRA BRIEF + HOOK: 2 sentences max — one genuinely specific hook about them, one CTA. Example: "Saw [Company] just launched X — impressive. Any room for a ${senderRole} on the team?"`,
  ];

  const angle = angles[Math.floor(Math.random() * angles.length)];

  const prompt = `You are an elite B2B cold email copywriter who gets 40%+ reply rates. Write a cold outreach email.

SENDER: ${senderName}, ${senderRole}
RECIPIENT: ${lead.name || 'the hiring manager'} at ${lead.company || 'the company'}
COMPANY CONTEXT / NOTES: ${lead.notes || 'A growing company that may be hiring.'}

FRAMEWORK TO USE: ${angle}
${extraRules}
HARD RULES (follow perfectly or this fails):
1. Length: 60–90 words in the body. Not a word more.
2. Opening: Never start with "I", "My name is", or "I hope". Start with THEM — their company, their role, their product.
3. Tone: Warm, direct, and human. Like a message from a smart friend — not a recruiter template.
4. CTA: One soft question at the end. NOT "please let me know if you're interested." Something like "Worth a quick chat?" or "Is this on your radar?"
5. P.S.: Add one single P.S. line that adds a tiny bit of extra value or personality.
6. Subject: 2–5 words, lowercase preferred, highly specific to their company. NOT generic like "quick question" or "following up".
7. Sign-off: Simple. Just first name.

Return ONLY valid JSON (no markdown): {"subject": "...", "body": "... (use \\n for line breaks)"}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o-mini',
      temperature: 0.9,
      response_format: { type: 'json_object' }
    });
    const result = JSON.parse(completion.choices[0].message.content);
    if (!result.subject || !result.body) throw new Error('Malformed AI response');
    return result;
  } catch (err) {
    console.error(`⚠️ OpenAI generation failed: ${err.message}. Using fallback.`);
    const firstName = lead.name ? lead.name.split(' ')[0] : 'there';
    return {
      subject: `opportunity at ${lead.company || 'your company'}`,
      body: `${firstName},\n\nLoved what ${lead.company || 'your team'} is building. As a ${senderRole}, I've been watching your space and think my background could add real value.\n\nI've attached my resume — even if timing isn't right now, would love to be on your radar.\n\nWorth a quick chat?\n\n${senderName}\n\nP.S. Happy to share specific examples of past work if that'd help.`
    };
  }
};

// ─── FOLLOW-UP EMAIL GENERATION ──────────────────────────────────────────────
export const generateFollowUpEmail = async (lead, senderName, senderRole, originalSubject) => {
  const prompt = `You are a cold email expert. Write a short, friendly follow-up to a cold email that got no reply.

SENDER: ${senderName}, ${senderRole}
RECIPIENT: ${lead.name || 'the hiring manager'} at ${lead.company || 'the company'}
ORIGINAL SUBJECT: ${originalSubject}
NOTES: ${lead.notes || 'N/A'}

RULES:
1. MAX 30 words. A "bump" — not a re-pitch.
2. Acknowledge you already emailed. Don't pretend it's the first message.
3. No guilt. No "just checking in". Be light and human.
4. Same tone as a casual Slack message.
5. Subject: Re: [original subject] (always reply to same thread feel)

Return ONLY valid JSON: {"subject": "Re: ${originalSubject}", "body": "..."}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o-mini',
      temperature: 0.8,
      response_format: { type: 'json_object' }
    });
    return JSON.parse(completion.choices[0].message.content);
  } catch (err) {
    console.error(`⚠️ Follow-up generation failed: ${err.message}`);
    return {
      subject: `Re: ${originalSubject}`,
      body: `${lead.name ? lead.name.split(' ')[0] : 'Hey'},\n\nJust bumping this up — wanted to make sure it didn't get buried.\n\nStill happy to chat if the timing works.\n\n${senderName}`
    };
  }
};

// ─── HTML BUILDER (plain-text style — avoids spam filters) ───────────────────
const buildHtmlBody = (body) => {
  const paragraphs = body
    .split('\n')
    .filter(p => p.trim())
    .map(p => `<p style="margin: 0 0 14px 0; line-height: 1.7; font-size: 15px;">${p.trim()}</p>`)
    .join('');

  // Plain text style — no heavy branding, no unsubscribe footer (that signals mass mail)
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 560px; color: #1a1a1a;">${paragraphs}</div>`;
};

// ─── SEND EMAIL ───────────────────────────────────────────────────────────────
export const sendColdEmail = async (sender, lead, subject, body) => {
  const resumePath = path.resolve(__dirname, '..', 'assets', process.env.RESUME_FILENAME || 'resume.pdf');
  const attachments = [];
  if (fs.existsSync(resumePath)) {
    attachments.push({ filename: process.env.RESUME_FILENAME || 'resume.pdf', path: resumePath });
  }

  const transporter = createTransporter(sender.email, sender.app_password);
  const info = await transporter.sendMail({
    from: `"${sender.sender_name}" <${sender.email}>`,
    to: lead.email,
    subject,
    html: buildHtmlBody(body),
    text: body,
    attachments,
  });

  console.log(`✅ Sent from ${sender.email} → ${lead.email} | MsgID: ${info.messageId}`);
  return info;
};

// ─── MULTI-SENDER OUTREACH CYCLE ─────────────────────────────────────────────
export const runOutreachCycle = async () => {
  console.log('\n⚡ [OUTREACH] Running multi-sender cycle...');

  const { data: senders, error: sendersErr } = await supabase
    .from('senders').select('*').eq('status', 'Active')
    .order('last_used_at', { ascending: true, nullsFirst: true });

  if (sendersErr || !senders?.length) {
    console.log('✓ No active senders. Skipping.'); return;
  }

  // Query pending leads we *want* to process
  const { data: pendingLeads, error: pendingErr } = await supabase
    .from('leads').select('id').eq('status', 'Pending')
    .order('created_at', { ascending: true }).limit(senders.length);

  if (pendingErr || !pendingLeads?.length) {
    console.log('✓ No pending leads.'); return;
  }

  // Atomically claim these leads so other instances/crons running simultaneously skip them
  const leadIds = pendingLeads.map(l => l.id);
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .update({ status: 'Processing' })
    .in('id', leadIds)
    .eq('status', 'Pending')
    .select('*');

  if (leadsErr || !leads?.length) {
    console.log('✓ Pending leads were already claimed by another process.'); return;
  }

  console.log(`🚀 Sending ${leads.length} emails across ${senders.length} senders...`);

  await Promise.all(leads.map(async (lead, index) => {
    const sender = senders[index];
    try {
      console.log(`📧 [${sender.email}] → [${lead.email}]`);
      const { subject, body } = await generateColdEmail(lead, sender.sender_name, sender.sender_role);

      const { data: logData, error: logErr } = await supabase
        .from('message_logs').insert([{
          lead_id: lead.id,
          type: 'cold_outreach',
          subject,
          body,
          sender_email: sender.email,
          delivery_status: 'sending',
        }]).select().single();

      if (logErr) throw new Error('Log DB error: ' + logErr.message);

      const info = await sendColdEmail(sender, lead, subject, body);

      await supabase.from('message_logs').update({
        delivery_status: 'delivered',
        thread_id: info.messageId,
        sent_at: new Date().toISOString(),
      }).eq('id', logData.id);

      await supabase.from('leads').update({
        status: 'Sent',
        last_contacted_at: new Date().toISOString(),
        follow_up_sent: false,
      }).eq('id', lead.id);

      await supabase.from('senders').update({
        last_used_at: new Date().toISOString()
      }).eq('id', sender.id);

    } catch (err) {
      console.error(`❌ ${sender.email} → ${lead.email}: ${err.message}`);
      const bounceNote = `[BOUNCED] ${err.message}`;
      await supabase.from('leads').update({
        status: 'Bounced',
        notes: lead.notes ? `${lead.notes} | ${bounceNote}` : bounceNote
      }).eq('id', lead.id);
    }
  }));
};

// ─── 24H FOLLOW-UP CYCLE ─────────────────────────────────────────────────────
export const runFollowUpCycle = async () => {
  console.log('\n📬 [FOLLOW-UP] Checking for leads needing follow-up...');

  const { data: senders, error: sendersErr } = await supabase
    .from('senders').select('*').eq('status', 'Active')
    .order('last_used_at', { ascending: true, nullsFirst: true });

  if (sendersErr || !senders?.length) return;

  // Query leads that were sent >24h ago, not replied, no follow-up yet
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: pendingFollowUps, error: pendingErr } = await supabase
    .from('leads').select('id')
    .eq('status', 'Sent')
    .eq('follow_up_sent', false)
    .lt('last_contacted_at', cutoff)
    .limit(senders.length);

  if (pendingErr || !pendingFollowUps?.length) {
    console.log('✓ No follow-ups due.'); return;
  }

  // Atomically claim these follow-ups
  const leadIds = pendingFollowUps.map(l => l.id);
  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .update({ status: 'Processing Follow-up' })
    .in('id', leadIds)
    .eq('follow_up_sent', false)
    .select('*');

  if (leadsErr || !leads?.length) {
    console.log('✓ Follow-ups were already claimed by another process.'); return;
  }

  console.log(`📨 Sending ${leads.length} follow-ups...`);

  await Promise.all(leads.map(async (lead, index) => {
    const sender = senders[index % senders.length];
    try {
      // Fetch the original subject from message_logs
      const { data: originalLog } = await supabase
        .from('message_logs')
        .select('subject')
        .eq('lead_id', lead.id)
        .eq('type', 'cold_outreach')
        .order('sent_at', { ascending: true })
        .limit(1)
        .single();

      const originalSubject = originalLog?.subject || 'following up';
      const { subject, body } = await generateFollowUpEmail(lead, sender.sender_name, sender.sender_role, originalSubject);

      const { data: logData, error: logErr } = await supabase
        .from('message_logs').insert([{
          lead_id: lead.id,
          type: 'follow_up',
          subject,
          body,
          sender_email: sender.email,
          delivery_status: 'sending',
        }]).select().single();

      if (logErr) throw new Error(logErr.message);

      const info = await sendColdEmail(sender, lead, subject, body);

      await supabase.from('message_logs').update({
        delivery_status: 'delivered',
        thread_id: info.messageId,
        sent_at: new Date().toISOString(),
      }).eq('id', logData.id);

      await supabase.from('leads').update({ status: 'Follow-up', follow_up_sent: true }).eq('id', lead.id);

      console.log(`✅ Follow-up sent to ${lead.email}`);
    } catch (err) {
      console.error(`❌ Follow-up failed for ${lead.email}: ${err.message}`);
      await supabase.from('leads').update({ status: 'Sent' }).eq('id', lead.id);
    }
  }));
};
