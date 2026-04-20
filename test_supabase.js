import { createClient } from '@supabase/supabase-js';

const url = 'http://supabasekong-h0c84kskg48sggooo00w84g0.173.249.45.119.sslip.io';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc2MjI3ODMwLCJleHAiOjIwOTE1ODc4MzB9.A2TANmFH1G78XIyZp25sV-2HR7Qjl9Fok9LBxKybMMI';

console.log('Testing Supabase connection...');
console.log('URL:', url);

const supabase = createClient(url, key);

try {
    const { data, error } = await supabase.from('whatsapp_config').select('*').limit(1);
    if (error) {
        console.error('❌ whatsapp_config error:', error.message, '| code:', error.code, '| details:', error.details);
    } else {
        console.log('✅ whatsapp_config OK. Rows:', data?.length);
        if (data?.length > 0) console.log('   Sample:', JSON.stringify(data[0]).substring(0, 200));
    }
} catch (e) {
    console.error('❌ Connection failed:', e.message);
}

try {
    const { data, error } = await supabase.from('leads').select('id').limit(1);
    if (error) {
        console.error('❌ leads error:', error.message, '| code:', error.code);
    } else {
        console.log('✅ leads OK. Rows:', data?.length);
    }
} catch (e) {
    console.error('❌ leads failed:', e.message);
}

process.exit(0);
