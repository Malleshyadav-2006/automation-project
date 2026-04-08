import { ImapFlow } from 'imapflow';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const checkInboxForSender = async (sender) => {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: true,
    auth: {
      user: sender.email,
      pass: sender.app_password
    },
    logger: false
  });

  try {
    await client.connect();
    let lock = await client.getMailboxLock('INBOX');
    try {
      console.log(`[IMAP] Checking inbox for sender: ${sender.email}`);
      const search = await client.search({ unseen: true });
      if (search.length === 0) {
          console.log(`  └ No new messages for ${sender.email}`);
          return;
      }

      for await (let msg of client.fetch(search, { envelope: true })) {
         if(!msg.envelope || !msg.envelope.from) continue;
         const fromEmail = msg.envelope.from[0].address;
         
         const { data: lead } = await supabase.from('leads')
             .select('id, status')
             .eq('email', fromEmail)
             .single();
             
         if (lead && lead.status !== 'Replied') {
             console.log(`🎉 Reply detected from lead: ${fromEmail}`);
             await supabase.from('leads').update({ status: 'Replied' }).eq('id', lead.id);
             await supabase.from('reply_logs').insert([{
                 lead_id: lead.id,
                 snippet: msg.envelope.subject || 'No Subject',
                 matched_thread_id: msg.envelope.inReplyTo || ''
             }]);
         }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error(`⚠️ IMAP Error for ${sender.email}:`, err.message);
  }
};

export const checkReplies = async () => {
  const { data: senders, error } = await supabase
    .from('senders')
    .select('*')
    .eq('status', 'Active');

  if (error) {
    console.error('Failed to fetch senders for IMAP check:', error.message);
    return;
  }
  if (!senders || senders.length === 0) {
    console.log('No active senders to check for replies.');
    return;
  }

  for (const sender of senders) {
    await checkInboxForSender(sender);
  }
};
