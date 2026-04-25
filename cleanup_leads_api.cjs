const http = require('http');

const API_HOST = '207.180.211.48';
const API_PORT = 4000;
// ID extraído de la sesión del usuario
const ORG_ID = '00000000-0000-0000-0000-000000000000';

function request(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : '';
        const options = {
            hostname: API_HOST,
            port: API_PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = http.request(options, (res) => {
            let resData = '';
            res.on('data', (chunk) => { resData += chunk; });
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: resData ? JSON.parse(resData) : null });
                } catch (e) {
                    resolve({ status: res.statusCode, data: resData });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(data);
        req.end();
    });
}

async function cleanup() {
    try {
        console.log('--- Iniciando limpieza profunda con ORG_ID:', ORG_ID, '---');
        
        // 1. Obtener leads específicos de esta organización
        const { status, data: leads } = await request(`/db/leads?orgId=${ORG_ID}`);
        
        if (status !== 200) {
            console.error('❌ Error del servidor:', status, leads);
            return;
        }

        const leadsList = Array.isArray(leads) ? leads : [];
        console.log(`Leads encontrados para esta organización: ${leadsList.length}`);

        const invalidLeads = leadsList.filter(l => {
            const phone = String(l.phone || '');
            const name = String(l.name || '');
            // Filtros: IDs de grupo, LIDs, estados, números extra largos
            return /[a-zA-Z:@]/.test(phone) || phone.length > 15 || phone.startsWith('12036') || name.toLowerCase() === 'status';
        });

        console.log(`Leads inválidos a eliminar: ${invalidLeads.length}`);

        for (const lead of invalidLeads) {
            console.log(`Eliminando: "${lead.name}" (${lead.phone})...`);
            const { status: delStatus } = await request(`/db/leads/${lead.id}`, 'DELETE');
            if (delStatus === 200) console.log('  ✅ OK');
            else console.log(`  ❌ Error (${delStatus})`);
        }

        console.log('\n--- Limpieza completada ---');
        console.log('Si la lista sigue igual en la web, por favor refresca la página (F5).');

    } catch (err) {
        console.error('❌ Error crítico:', err.message);
    }
}

cleanup();
