const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const VITE_SUPABASE_URL = urlMatch ? urlMatch[1].trim() : '';
const VITE_SUPABASE_ANON_KEY = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

async function checkData() {
    console.log('Checking URL:', VITE_SUPABASE_URL);

    const { data, error } = await supabase.from('sales').select('*');
    if (error) {
        console.error('Error fetching sales:', error);
    } else {
        console.log('Total sales records:', data ? data.length : 0);
    }

    const { data: users, error: uError } = await supabase.from('users').select('*');
    if (uError) {
        console.error('Error fetching users:', uError);
    } else {
        console.log('Total users:', users ? users.length : 0);
    }
}

checkData();
