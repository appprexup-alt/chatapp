const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const SUPABASE_URL = urlMatch ? urlMatch[1].trim() : '';
const SUPABASE_KEY = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanup() {
    console.log('--- Limpiando Supabase Directamente ---');
    console.log('URL:', SUPABASE_URL);

    // Intentamos leer los leads
    const { data: leads, error } = await supabase.from('leads').select('id, name, phone');
    
    if (error) {
        console.error('❌ Error de Supabase:', error.message);
        return;
    }

    console.log(`Total de leads encontrados: ${leads.length}`);

    const invalidLeads = (leads || []).filter(l => {
        const phone = String(l.phone || '');
        const name = String(l.name || '');
        // Filtros para grupos, LIDs y status
        return /[a-zA-Z:@]/.test(phone) || phone.length > 15 || phone.startsWith('12036') || name.toLowerCase() === 'status';
    });

    console.log(`Leads inválidos detectados: ${invalidLeads.length}`);

    for (const lead of invalidLeads) {
        console.log(`Eliminando: ${lead.name} (${lead.phone})...`);
        const { error: delErr } = await supabase.from('leads').delete().eq('id', lead.id);
        if (delErr) console.log('  ❌ Error:', delErr.message);
        else console.log('  ✅ OK');
    }

    console.log('--- Proceso terminado ---');
}

cleanup();
