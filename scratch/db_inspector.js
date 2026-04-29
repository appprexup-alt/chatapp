const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://postgres:KE4o8KBopuFoteOSmfZNQHREeLOYpBSp@207.180.211.48:5432/postgres'
});

async function run() {
    try {
        const res = await pool.query("SELECT id, name, phone FROM public.leads WHERE name ILIKE '%Elvis%' OR phone LIKE '%309499%'");
        console.log('--- LEADS ENCONTRADOS ---');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

run();
