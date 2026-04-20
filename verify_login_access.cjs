const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están definidas en el .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserAccess() {
    console.log(`Intentando conectar a: ${supabaseUrl}`);

    try {
        // Try to count users
        const { count, error, status } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error(`\n❌ Error de Supabase (Status ${status}):`);
            console.error(`Mensaje: ${error.message}`);
            console.error(`Detalle: ${error.details || 'N/A'}`);
        } else {
            console.log(`\n✅ Conexión exitosa.`);
            console.log(`Total de usuarios encontrados: ${count}`);

            // Try to list schemas/tables if it was an admin key, but here it's anon
        }
    } catch (err) {
        console.error(`\n❌ Error inesperado:`, err.message);
    }
}

testUserAccess();
