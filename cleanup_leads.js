const pkg = require('pg');
const { Pool } = pkg;
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

async function cleanup() {
    try {
        console.log('--- Cleaning up invalid Leads (Groups, Broadcasts, IDs) ---');
        
        // Delete leads that look like Group IDs (12036...) or contain non-digits
        const res = await pool.query(`
            DELETE FROM proxied.leads 
            WHERE phone ~ '[^0-9]' 
               OR length(phone) > 15 
               OR phone LIKE '12036%'
        `);
        
        console.log(`Deleted ${res.rowCount} invalid leads.`);
        
    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await pool.end();
    }
}

cleanup();
