import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: "postgresql://postgres:KE4o8KBopuFoteOSmfZNQHREeLOYpBSp@207.180.211.48:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const { rows } = await pool.query("SELECT id, name, phone, whatsapp_id, created_at FROM public.leads ORDER BY created_at DESC LIMIT 10");
        console.log("=== LATEST LEADS IN DATABASE ===");
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error("Error reading leads:", e);
    } finally {
        await pool.end();
    }
}

run();
