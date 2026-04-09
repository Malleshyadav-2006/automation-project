import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkMessageLogs() {
  const { data } = await supabase.from('message_logs').select('*').order('created_at', { ascending: false }).limit(5);
  console.log(data);
}

checkMessageLogs().then(() => process.exit(0));
