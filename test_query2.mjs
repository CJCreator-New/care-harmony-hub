
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('lab_orders')
    .select('id, test_name, status, priority, ordered_at, patient_id, ordered_by, patient:patients(id, first_name, last_name, mrn)')
    .limit(10);
    
  console.log('Error:', error);
}

run();

