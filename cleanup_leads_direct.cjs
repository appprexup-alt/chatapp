const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function cleanup() {
    try {
        console.log('--- Limpiando Leads con IDs inválidos directamente en la DB ---');
        
        // Eliminar leads con caracteres no numéricos, IDs muy largos o IDs de grupo (12036...)
        const res = await pool.query(`
            DELETE FROM proxied.leads 
            WHERE phone ~ '[^0-9]' 
               OR length(phone) > 15 
               OR phone LIKE '12036%'
        `);
        
        console.log(`✅ Se eliminaron ${res.rowCount} leads inválidos.`);
        
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

cleanup();
