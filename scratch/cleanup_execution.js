import pkg from 'pg';
const { Pool } = pkg;

const DATABASE_URL = 'postgresql://postgres:KE4o8KBopuFoteOSmfZNQHREeLOYpBSp@207.180.211.48:5432/postgres';

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: false
});

async function runCleanup() {
    try {
        console.log('--- Starting Database Cleanup ---');
        
        // 1. Remove 'WA-' prefix
        const res1 = await pool.query("UPDATE proxied.leads SET phone = REPLACE(phone, 'WA-', '') WHERE phone LIKE 'WA-%'");
        console.log(`Updated ${res1.rowCount} leads by removing 'WA-' prefix.`);
        
        // 2. Delete status leads
        const res2 = await pool.query("DELETE FROM proxied.leads WHERE phone = 'status' OR phone LIKE '%@status%' OR phone LIKE '%@broadcast%'");
        console.log(`Deleted ${res2.rowCount} system/status leads.`);
        
        // 3. Normalize LIDs
        const res3 = await pool.query("UPDATE proxied.leads SET whatsapp_id = phone, phone = 'SOLICITAR' WHERE length(phone) > 15 AND (whatsapp_id IS NULL OR whatsapp_id = '') AND phone ~ '^[0-9]+$'");
        console.log(`Moved ${res3.rowCount} long numeric IDs to whatsapp_id.`);

        console.log('--- Cleanup Finished ---');
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await pool.end();
    }
}

runCleanup();
