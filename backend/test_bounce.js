import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { sendColdEmail, generateColdEmail } from './services/emailService.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testBounce() {
  // Get a bounced lead
  const { data: leads } = await supabase.from('leads').select('*').eq('status', 'Bounced').limit(2);
  const { data: senders } = await supabase.from('senders').select('*').limit(1);

  if (!leads || leads.length === 0) { console.log('No bounced leads found'); return; }
  
  const lead = leads[0];
  const sender = senders[0];

  console.log(`Testing with Lead: ${lead.email}`);
  try {
    const { subject, body } = await generateColdEmail(lead, sender.sender_name, sender.sender_role);
    await sendColdEmail(sender, lead, subject, body, 'dummy-id');
    console.log('Success!');
  } catch (err) {
    console.error('Email failed to send. Reason:', err);
  }
}

testBounce().then(() => process.exit(0));
