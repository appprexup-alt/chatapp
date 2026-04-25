const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const SUPABASE_URL = urlMatch ? urlMatch[1].trim() : '';
const SUPABASE_KEY = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanup() {
    console.log('--- Checking leads with invalid phone numbers ---');
    console.log('URL:', SUPABASE_URL);

    // 1. Fetch all leads
    const { data: leads, error } = await supabase.from('leads').select('id, name, phone');
    if (error) {
        console.error('Error fetching leads:', error);
        return;
    }

    console.log(`Total leads: ${leads.length}`);

    // Find invalid leads: phone contains non-digits, is too long, or looks like a group ID
    const invalidLeads = leads.filter(l => {
        const phone = l.phone || '';
        // Contains letters, colons, or @
        if (/[a-zA-Z:@]/.test(phone)) return true;
        // Way too long for a phone number (group IDs are 18+ digits)
        if (phone.replace(/\D/g, '').length > 15) return true;
        // Known group ID pattern
        if (phone.startsWith('12036')) return true;
        return false;
    });

    console.log(`\nFound ${invalidLeads.length} invalid leads:`);
    invalidLeads.forEach(l => {
        console.log(`  - [${l.name}] phone: "${l.phone}"`);
    });

    if (invalidLeads.length === 0) {
        console.log('\nNo invalid leads found. All clean!');
        return;
    }

    // 2. Delete invalid leads
    const idsToDelete = invalidLeads.map(l => l.id);
    
    // First delete messages for these leads
    for (const id of idsToDelete) {
        const { error: msgErr } = await supabase.from('messages').delete().eq('lead_id', id);
        if (msgErr) console.error(`  Error deleting messages for lead ${id}:`, msgErr.message);
    }

    // Then delete the leads themselves
    for (const id of idsToDelete) {
        const { error: delErr } = await supabase.from('leads').delete().eq('id', id);
        if (delErr) console.error(`  Error deleting lead ${id}:`, delErr.message);
        else console.log(`  Deleted lead: ${id}`);
    }

    console.log(`\nCleanup complete. Removed ${idsToDelete.length} invalid leads.`);
}

cleanup();
