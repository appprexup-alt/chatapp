const { Client } = require('pg');

const password = process.argv[2];

if (!password) {
    console.error("No password");
    process.exit(1);
}

const config = {
    host: '173.249.45.119',
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    ssl: false
};

const client = new Client(config);

async function run() {
    console.log("🚀 CONECTANDO SIN SSL AL PUERTO 5432...");
    try {
        await client.connect();
        console.log("✅ CONEXION EXITOSA!");

        const sql = `
            INSERT INTO organizations (id, name, plan, status) 
            VALUES ('05018c5a-19d8-4ddf-810d-766fc48afa7d', 'PrexApp Global', 'pro', 'active')
            ON CONFLICT (id) DO NOTHING;

            INSERT INTO users (organization_id, name, email, username, password, role, status)
            VALUES (
                '05018c5a-19d8-4ddf-810d-766fc48afa7d', 
                'Admin Principal', 
                'admin@example.com', 
                'admin', 
                'admin123', 
                'Owner', 
                'active'
            )
            ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, status = 'active';
        `;

        await client.query(sql);
        console.log("🎉 MIGRACION COMPLETADA CON EXITO!");
    } catch (err) {
        console.error("❌ ERROR:", err.message);
    } finally {
        await client.end();
        process.exit();
    }
}

run();
