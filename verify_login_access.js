require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están definidas en el .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserAccess() {
    console.log(`Intentando conectar a: ${supabaseUrl}`);
    console.log(`Usando Key: ${supabaseKey.substring(0, 10)}...${supabaseKey.substring(supabaseKey.length - 10)}`);

    try {
        const { data, error, status } = await supabase
            .from('users')
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.error(`\n❌ Error de Supabase (Status ${status}):`);
            console.error(`Mensaje: ${error.message}`);
            console.error(`Detalle: ${error.details || 'N/A'}`);
            console.error(`Sugerencia: Si el error es 'Unauthorized', revisa tu SUPABASE_ANON_KEY o asegúrate de que Kong/PostgREST estén activos en el VPS.`);
        } else {
            console.log(`\n✅ Conexión exitosa.`);
            console.log(`Acceso a la tabla 'users' verificado.`);
        }
    } catch (err) {
        console.error(`\n❌ Error inesperado:`, err.message);
    }
}

testUserAccess();
