import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkLeads() {
  const { data } = await supabase.from('leads').select('*').eq('status', 'Bounced');
  console.log(data);
}

checkLeads().then(() => process.exit(0));
