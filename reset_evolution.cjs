const http = require('http');

const API_HOST = '207.180.211.48';
const API_PORT = 4000;
const INSTANCE_NAME = 'main'; // Nombre de instancia por defecto en Evolution
const API_KEY = 'internal';   // ApiKey por defecto configurada en el proxy

function request(path, method = 'DELETE') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: path,
            method: method,
            headers: { 
                'Content-Type': 'application/json',
                'apikey': API_KEY 
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: data ? JSON.parse(data) : data });
                } catch (e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        console.log('--- Iniciando Reset de Evolution API ---');
        
        // 1. Logout
        console.log('Paso 1: Cerrando sesión actual...');
        const logoutRes = await request(`/instance/logout/${INSTANCE_NAME}`);
        console.log('   Resultado:', logoutRes.status);
        
        // 2. Delete
        console.log('Paso 2: Eliminando instancia antigua...');
        const deleteRes = await request(`/instance/delete/${INSTANCE_NAME}`);
        console.log('   Resultado:', deleteRes.status, deleteRes.data);
        
        console.log('\n--- RESET COMPLETADO ---');
        console.log('Por favor, regresa a la página de vinculación de WhatsApp y refresca la página.');
        console.log('Se generará una instancia nueva automáticamente.');

    } catch (err) {
        console.error('❌ Error fatal:', err.message);
    }
}

run();
