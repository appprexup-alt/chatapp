const fs = require('fs');

async function migrate() {
    try {
        const sql = fs.readFileSync('setup_postgres_v2.sql', 'utf8');
        // Add schema prefix
        let modifiedSql = 'CREATE SCHEMA IF NOT EXISTS proxied;\n' + sql;
        // Simple search-replace for table names in this specific file structure
        // This is safer than regexing the whole world
        modifiedSql = modifiedSql.replace(/CREATE TABLE IF NOT EXISTS /g, 'CREATE TABLE IF NOT EXISTS proxied.');
        modifiedSql = modifiedSql.replace(/REFERENCES /g, 'REFERENCES proxied.');
        modifiedSql = modifiedSql.replace(/INSERT INTO /g, 'INSERT INTO proxied.');
        modifiedSql = modifiedSql.replace(/ALTER TABLE /g, 'ALTER TABLE proxied.');

        const statements = modifiedSql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        for (const statement of statements) {
            console.log('Executing:', statement.substring(0, 50) + '...');
            const res = await fetch('http://127.0.0.1:4000/db/sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: statement + ';' })
            });
            const data = await res.json();
            if (data.error) {
                console.error('Error:', data.error);
            }
        }
        console.log('Migration to PROXIED schema finished.');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}
migrate();
