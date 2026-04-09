import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function requeue() {
  const { data: leads } = await supabase.from('leads').select('id, email, status');
  const bounced = leads.filter(l => l.status === 'Bounced');
  
  console.log(`Total Leads: ${leads.length}`);
  console.log(`Bounced Leads: ${bounced.length}`);
  
  // Requeue bounced
  if (bounced.length > 0) {
    const { error } = await supabase.from('leads').update({ status: 'Pending' }).in('id', bounced.map(b => b.id));
    if (!error) console.log(`Requeued ${bounced.length} leads to Pending.`);
  }
}

requeue().then(() => process.exit(0));
