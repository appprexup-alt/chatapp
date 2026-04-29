const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/ChatApp/.env' });

async function inspect() {
    console.log("Connecting to:", process.env.DATABASE_URL);
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const { rows: orgs } = await pool.query('SELECT * FROM public.organizations');
        console.log("Organizations:", orgs);

        const { rows: users } = await pool.query('SELECT id, organization_id, email, name FROM public.users');
        console.log("Users:", users);

        const { rows: leads } = await pool.query('SELECT id, organization_id, name, phone FROM public.leads ORDER BY created_at DESC LIMIT 5');
        console.log("Leads:", leads);
    } catch (e) {
        console.error("Error inspecting:", e);
    } finally {
        await pool.end();
    }
}

inspect();
