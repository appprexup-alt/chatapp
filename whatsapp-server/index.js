import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    Browsers,
    downloadMediaMessage
} from '@whiskeysockets/baileys';
import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
const { Pool } = pkg;
import pino from 'pino';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import QRCode from 'qrcode';

if (fs.existsSync(path.resolve(process.cwd(), '../.env'))) {
    dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
} else {
    dotenv.config(); // Fallback to current dir or process env
}

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors()); // Allow all
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use((req, res, next) => {
    console.log(`[Proxy] ${req.method} ${req.url} | Body: ${JSON.stringify(req.body)}`);
    next();
});
const PORT = process.env.PORT || 3001;

import multer from 'multer';
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const ORG_ID = process.env.ORG_ID || '00000000-0000-0000-0000-000000000000';
const BASE_URL = process.env.BASE_URL || ''; // Public URL of the API
const DB_SCHEMA = process.env.DB_SCHEMA || 'public'; // Database schema (public for Supabase, proxied for local)

const logger = pino({ level: 'debug' });

// Global socket map to support future multiple instances if needed
const sessions = new Map();
const lidToPhoneMap = new Map(); // Store LID -> Phone mapping
let lastQR = null;

// --- Database Service Wrapper ---
class DbService {
    constructor() {
        this.usePostgres = !!DATABASE_URL;
        if (this.usePostgres) {
            console.log('[DB] Using direct PostgreSQL connection');
            this.pool = new Pool({
                connectionString: DATABASE_URL,
                ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
            });
        } else if (SUPABASE_URL && SUPABASE_KEY && SUPABASE_URL !== 'your-supabase-url') {
            console.log('[DB] Using Supabase connection');
            this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        } else {
            console.warn('⚠️ [DB] No valid database configuration found.');
        }
    }

    isReady() { return !!(this.pool || this.supabase); }

    async findLeadByPhone(phone, orgId) {
        if (!this.isReady()) return { data: null };
        if (this.usePostgres) {
            const { rows } = await this.pool.query(
                `SELECT id, phone FROM ${DB_SCHEMA}.leads WHERE organization_id = $1 AND (phone LIKE $2 OR $3 LIKE '%' || phone)`,
                [orgId, `%${phone}`, phone]
            );
            return { data: rows[0] };
        } else {
            const { data } = await this.supabase.from('leads').select('id, phone').eq('organization_id', orgId);
            const lead = data?.find(l => {
                const lPhone = l.phone.replace(/\D/g, '');
                return lPhone.endsWith(phone) || phone.endsWith(lPhone);
            });
            return { data: lead };
        }
    }

    async createLead(name, phone, orgId) {
        if (!this.isReady()) return { data: null };

        let firstStageId = null;
        try {
            if (this.usePostgres) {
                const { rows } = await this.pool.query(`SELECT id FROM ${DB_SCHEMA}.pipeline_stages ORDER BY "order" ASC LIMIT 1`);
                if (rows.length > 0) firstStageId = rows[0].id;
            } else {
                const { data } = await this.supabase.from('pipeline_stages').select('id').order('order', { ascending: true }).limit(1).single();
                if (data) firstStageId = data.id;
            }
        } catch (e) {
            console.error('[DB] Error fetching first stage:', e);
        }

        if (this.usePostgres) {
            const { rows } = await this.pool.query(
                `INSERT INTO ${DB_SCHEMA}.leads (organization_id, name, phone, status, source, pipeline_stage_id) VALUES ($1, $2, $3, 'Nuevo', 'WhatsApp', $4) RETURNING *`,
                [orgId, name, phone, firstStageId]
            );
            return { data: rows[0] };
        } else {
            return await this.supabase.from('leads').insert([{
                organization_id: orgId, name, phone, status: 'Nuevo', source: 'WhatsApp', pipeline_stage_id: firstStageId
            }]).select().single();
        }
    }

    async saveMessage(msgData) {
        if (!this.isReady()) return;
        if (this.usePostgres) {
            await this.pool.query(
                `INSERT INTO ${DB_SCHEMA}.messages (organization_id, lead_id, content, sender, media_type, media_url, media_filename, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [msgData.organization_id, msgData.lead_id, msgData.content, msgData.sender, msgData.media_type, msgData.media_url, msgData.media_filename, JSON.stringify(msgData.payload)]
            );
        } else {
            await this.supabase.from('messages').insert([msgData]);
        }
    }

    async updateWhatsappStatus(orgId, status, extra = {}) {
        if (!this.isReady()) return;
        try {
            if (this.usePostgres) {
                let q = `UPDATE ${DB_SCHEMA}.whatsapp_config SET status = $1, updated_at = NOW()`;
                const p = [status];
                let i = 2;
                if (extra.qr_code !== undefined) { q += `, qr_code = $${i++}`; p.push(extra.qr_code); }
                if (extra.phone_number !== undefined) { q += `, phone_number = $${i++}`; p.push(extra.phone_number); }
                q += ` WHERE organization_id = $${i}`; p.push(orgId);
                await this.pool.query(q, p);
            } else {
                await this.supabase.from('whatsapp_config').update({ status, ...extra }).eq('organization_id', orgId);
            }
        } catch (err) {
            console.warn('[DB Warning] Could not update whatsapp status:', err.message);
        }
    }
}

const db = new DbService();

// --- WHATSAPP CONTROL ---
app.get('/whatsapp/reset', async (req, res) => {
    const orgId = req.query.orgId || ORG_ID;
    try {
        console.log(`[Control] Manual reset requested for Org: ${orgId}`);
        const sock = sessions.get(orgId);
        if (sock) {
            sock.logout();
            sessions.delete(orgId);
        }
        const authPath = path.join(__dirname, 'auth', orgId);
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
        }
        // Restart after cleanup
        setTimeout(() => initWhatsApp(orgId), 2000);
        res.json({ success: true, message: 'Sesión reiniciada y archivos limpiados.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function initWhatsApp(orgId) {
    console.log(`[Baileys] Initializing session for Org: ${orgId}`);
    const authPath = path.join(__dirname, 'auth', orgId);
    if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        auth: state,
        printQRInTerminal: true,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        syncFullHistory: false
    });

    sessions.set(orgId, sock);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log(`[QR] Org ${orgId} generated new code`);
            try {
                const qrBase64 = await QRCode.toDataURL(qr, { scale: 8 });
                lastQR = qrBase64;
                await db.updateWhatsappStatus(orgId, 'qr', { qr_code: qrBase64 });
            } catch (e) {
                lastQR = qr; // fallback
            }
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode
                : 0;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log(`[Conn] Org ${orgId} closed. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`);
            if (lastDisconnect?.error) console.error('[Conn] Error detail:', lastDisconnect.error);

            if (!shouldReconnect) {
                console.log(`[Auth] Logging out and clearing auth for Org: ${orgId}`);
                fs.rmSync(authPath, { recursive: true, force: true });
                sessions.delete(orgId);
            }

            await db.updateWhatsappStatus(orgId, 'disconnected', { qr_code: null });
            if (shouldReconnect) setTimeout(() => initWhatsApp(orgId), 5000);
        } else if (connection === 'open') {
            console.log(`[Conn] Org ${orgId} connected successfully`);
            lastQR = null;
            await db.updateWhatsappStatus(orgId, 'connected', { qr_code: null, phone_number: sock.user?.id });
        }
    });

    sock.ev.on('messaging-history.set', async ({ chats, contacts, messages, isLatest }) => {
        console.log(`[Sync] Received messaging history: ${chats.length} chats, ${messages.length} messages`);
        for (const msg of messages) {
            try {
                if (!msg.message || 
                    msg.key.remoteJid === 'status@broadcast' || 
                    msg.key.remoteJid.endsWith('@g.us') || 
                    msg.key.remoteJid.endsWith('@newsletter')
                ) continue;

                const from = msg.key.remoteJid;
                const normalized = jidNormalizedUser(from);
                let phone = normalized.split('@')[0];

                // If it's a LID, try to find the PN in our map
                if (from.endsWith('@lid')) {
                    if (lidToPhoneMap.has(from)) {
                        phone = lidToPhoneMap.get(from);
                    } else {
                        // Skip unresolved LIDs if we strictly want phone numbers
                        // or continue and allow the ID to be the 'phone' for now
                    }
                }
                
                // Sanitize phone: keep only digits
                phone = phone.replace(/\D/g, '');
                if (!phone) continue; // Skip if no numeric part found (unresolved LID or invalid)

                const isMe = msg.key.fromMe;

                let content = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                let mediaType = 'text';

                if (msg.message.imageMessage) mediaType = 'image';
                else if (msg.message.videoMessage) mediaType = 'video';
                else if (msg.message.audioMessage) mediaType = 'audio';
                else if (msg.message.documentMessage) mediaType = 'document';

                const { data: lead } = await db.findLeadByPhone(phone, orgId);
                let leadId = lead?.id;
                if (!lead && !isMe) {
                    const pushName = msg.pushName || (contacts || []).find(c => c.id === from)?.name || phone;
                    const { data: newLead } = await db.createLead(pushName, phone, orgId);
                    leadId = newLead?.id;
                }

                if (leadId) {
                    await db.saveMessage({
                        organization_id: orgId,
                        lead_id: leadId,
                        content: content || `[${mediaType}]`,
                        sender: isMe ? 'agent' : 'client',
                        media_type: mediaType,
                        payload: msg.message,
                        created_at: new Date(msg.messageTimestamp * 1000).toISOString()
                    });
                }
            } catch (err) { }
        }
        console.log('[Sync] History sync complete.');
    });

    sock.ev.on('contacts.upsert', (contacts) => {
        for (const contact of contacts) {
            if (contact.id && contact.id.endsWith('@lid') && contact.id.includes(':')) {
                // Some LIDs come with :suffix, normalize it
            }
            if (contact.id && contact.id.endsWith('@s.whatsapp.net')) {
                // If we get both, we might be able to map them, but Baileys usually doesn't give them together here.
            }
        }
    });

    sock.ev.on('contacts.update', (updates) => {
        for (const update of updates) {
            if (update.id && update.id.endsWith('@lid') && update.phoneNumber) {
                lidToPhoneMap.set(update.id, update.phoneNumber);
                console.log(`[Identity] Mapped ${update.id} to ${update.phoneNumber}`);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
            try {
                const from = msg.key.remoteJid;
                if (from === 'status@broadcast' || from.endsWith('@g.us') || from.endsWith('@newsletter')) {
                    console.log(`[Msg] Skipping non-direct JID: ${from}`);
                    continue;
                }

                const normalized = jidNormalizedUser(from);
                let phone = normalized.split('@')[0];

                if (from.endsWith('@lid')) {
                    if (lidToPhoneMap.has(from)) {
                        phone = lidToPhoneMap.get(from);
                        console.log(`[Msg] LID resolved to PN: ${phone}`);
                    } else {
                        console.log(`[Msg] Unresolved LID: ${from}`);
                    }
                }

                // Sanitize phone: keep only digits
                phone = phone.replace(/\D/g, '');
                if (!phone) continue;

                const isMe = msg.key.fromMe;

                let content = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
                let mediaType = 'text';
                let mediaUrl = null;

                if (msg.message.imageMessage) {
                    mediaType = 'image';
                    content = msg.message.imageMessage.caption || '';
                } else if (msg.message.videoMessage) {
                    mediaType = 'video';
                    content = msg.message.videoMessage.caption || '';
                } else if (msg.message.audioMessage) {
                    mediaType = 'audio';
                } else if (msg.message.documentMessage) {
                    mediaType = 'document';
                    content = msg.message.documentMessage.fileName || '';
                }

                if (mediaType !== 'text') {
                    try {
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
                        // Simple extension detection
                        const mime = msg.message.imageMessage?.mimetype || msg.message.videoMessage?.mimetype || msg.message.audioMessage?.mimetype || msg.message.documentMessage?.mimetype || '';
                        let ext = 'bin';
                        if (mime.includes('image/jpeg')) ext = 'jpg';
                        else if (mime.includes('image/png')) ext = 'png';
                        else if (mime.includes('video/mp4')) ext = 'mp4';
                        else if (mime.includes('audio')) ext = 'mp3';
                        else if (mime.includes('pdf')) ext = 'pdf';

                        const fileName = `wa_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
                        const filePath = path.join(__dirname, 'uploads', fileName);
                        fs.writeFileSync(filePath, buffer);
                        
                        // Dynamic URL detection for media
                        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
                        const host = req.headers['x-forwarded-host'] || req.get('host');
                        const detectedBaseUrl = BASE_URL || `${protocol}://${host}`;
                        mediaUrl = `${detectedBaseUrl}/uploads/${fileName}`;
                    } catch (err) {
                        console.error('[Media] Download failed:', err);
                    }
                }

                const { data: lead } = await db.findLeadByPhone(phone, orgId);
                let leadId = lead?.id;

                if (!lead && !isMe) {
                    const { data: newLead } = await db.createLead(msg.pushName || phone, phone, orgId);
                    leadId = newLead?.id;
                }

                if (leadId) {
                    await db.saveMessage({
                        organization_id: orgId,
                        lead_id: leadId,
                        content: content || (mediaType === 'audio' ? 'Nota de voz' : `[${mediaType}]`),
                        sender: isMe ? 'agent' : 'client',
                        media_type: mediaType,
                        media_url: mediaUrl,
                        media_filename: msg.message.documentMessage?.fileName || null,
                        payload: msg.message,
                        created_at: new Date(msg.messageTimestamp * 1000).toISOString()
                    });
                }
            } catch (err) {
                console.error('[Msg Error]', err.message);
            }
        }
    });

    return sock;
}

// --- API ROUTES (Evolution API Emulation) ---

app.post('/auth/login', async (req, res) => {
    const { login, password } = req.body;
    console.log(`[Auth] Attempt login for: ${login}`);
    try {
        if (db.usePostgres && db.pool) {
            const { rows } = await db.pool.query(
                `SELECT id, organization_id, name, email, role, status, password FROM ${DB_SCHEMA}.users WHERE (email = $1 OR username = $1) AND status = 'active'`,
                [login]
            );
            if (rows.length > 0 && rows[0].password === password) {
                const { password: _, ...userWithoutPassword } = rows[0];
                return res.json({ user: userWithoutPassword });
            }
        } else if (db.supabase) {
            const { data, error } = await db.supabase
                .from('users')
                .select('id, organization_id, name, email, role, status, password')
                .or(`email.eq.${login},username.eq.${login}`)
                .eq('status', 'active')
                .maybeSingle();

            if (data && data.password === password) {
                const { password: _, ...userWithoutPassword } = data;
                return res.json({ user: userWithoutPassword });
            }
        }
        res.status(401).json({ error: 'Credenciales inválidas' });
    } catch (e) {
        console.error('[Auth Error]', e.message);
        res.status(500).json({ error: e.message });
    }
});

// --- GENERIC DB PROXY ---
app.use('/uploads', express.static('uploads'));

app.post('/db/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const detectedBaseUrl = BASE_URL || `${protocol}://${host}`;
    const fileUrl = `${detectedBaseUrl}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

app.post('/db/sql', async (req, res) => {
    const { query, params } = req.body;
    try {
        if (db.pool) {
            const { rows } = await db.pool.query(query, params || []);
            res.json(rows);
        } else {
            res.status(500).json({ error: 'SQL queries require direct PostgreSQL connection' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/db/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    try {
        if (db.pool) {
            const q = `SELECT * FROM ${DB_SCHEMA}.${table} WHERE id = $1`;
            const { rows } = await db.pool.query(q, [id]);
            res.json(rows[0]);
        } else if (db.supabase) {
            const { data, error } = await db.supabase.from(table).select('*').eq('id', id).maybeSingle();
            if (error) throw error;
            res.json(data);
        } else {
            res.status(500).json({ error: 'No database configured' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/db/:table', async (req, res) => {
    const { table } = req.params;
    const orgId = req.query.orgId;
    try {
        if (db.pool) {
            let q = `SELECT * FROM ${DB_SCHEMA}.${table}`;
            const params = [];
            if (orgId && table !== 'organizations') {
                q += ` WHERE organization_id = $1`;
                params.push(orgId);
            }
            console.log(`[DB Proxy] GET ${table} | Query: ${q} | Params: ${JSON.stringify(params)}`);
            const { rows } = await db.pool.query(q, params);
            res.json(rows);
        } else if (db.supabase) {
            console.log(`[DB Proxy/Supabase] GET ${table} | orgId: ${orgId}`);
            let query = db.supabase.from(table).select('*');
            if (orgId && table !== 'organizations') {
                query = query.eq('organization_id', orgId);
            }
            const { data, error } = await query;
            if (error) throw error;
            res.json(data || []);
        } else {
            res.status(500).json({ error: 'No database configured' });
        }
    } catch (e) {
        console.error(`[DB Proxy Error] GET ${table}:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/db/:table', async (req, res) => {
    const { table } = req.params;
    const data = req.body;
    try {
        if (db.pool) {
            const keys = Object.keys(data).filter(k => k !== 'id');
            const vals = keys.map(k => data[k] === undefined ? null : data[k]);
            const quotedKeys = keys.map(k => `"${k}"`);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const q = `INSERT INTO ${DB_SCHEMA}.${table} (${quotedKeys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
            console.log(`[DB Proxy] POST ${table} | Query: ${q}`);
            const { rows } = await db.pool.query(q, vals);
            res.json(rows[0]);
        } else if (db.supabase) {
            console.log(`[DB Proxy/Supabase] POST ${table}`);
            const insertData = { ...data };
            delete insertData.id;
            const { data: result, error } = await db.supabase.from(table).insert([insertData]).select().single();
            if (error) throw error;
            res.json(result);
        } else {
            res.status(500).json({ error: 'No database configured' });
        }
    } catch (e) {
        console.error(`[DB Proxy Error] POST ${table}:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

app.put('/db/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const data = req.body;
    try {
        if (db.pool) {
            const keys = Object.keys(data).filter(k => k !== 'id');
            const vals = keys.map(k => data[k] === undefined ? null : data[k]);
            const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
            vals.push(id);
            const q = `UPDATE ${DB_SCHEMA}.${table} SET ${setClause} WHERE id = $${vals.length} RETURNING *`;
            console.log(`[DB Proxy] PUT ${table} | ID: ${id} | Query: ${q}`);
            const { rows } = await db.pool.query(q, vals);
            res.json(rows[0]);
        } else if (db.supabase) {
            console.log(`[DB Proxy/Supabase] PUT ${table} | ID: ${id}`);
            const updateData = { ...data };
            delete updateData.id;
            const { data: result, error } = await db.supabase.from(table).update(updateData).eq('id', id).select().single();
            if (error) throw error;
            res.json(result);
        } else {
            res.status(500).json({ error: 'No database configured' });
        }
    } catch (e) {
        console.error(`[DB Proxy Error] PUT ${table}:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

app.delete('/db/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    try {
        if (db.pool) {
            const q = `DELETE FROM ${DB_SCHEMA}.${table} WHERE id = $1 RETURNING *`;
            console.log(`[DB Proxy] DELETE ${table} | ID: ${id}`);
            const { rows } = await db.pool.query(q, [id]);
            res.json(rows[0]);
        } else if (db.supabase) {
            console.log(`[DB Proxy/Supabase] DELETE ${table} | ID: ${id}`);
            const { data, error } = await db.supabase.from(table).delete().eq('id', id).select().single();
            if (error) throw error;
            res.json(data);
        } else {
            res.status(500).json({ error: 'No database configured' });
        }
    } catch (e) {
        console.error(`[DB Proxy Error] DELETE ${table}:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/instance/connect/:instanceName', (req, res) => {
    if (lastQR) res.json({ qrcode: { base64: lastQR }, code: lastQR });
    else res.json({ message: 'Ya conectado o QR no listo' });
});

app.get('/instance/connectionState/:instanceName', async (req, res) => {
    const sock = sessions.get(ORG_ID);
    if (sock?.user) res.json({ instance: { state: 'open' } });
    else res.json({ instance: { state: 'close' } });
});

app.post('/instance/create', async (req, res) => {
    res.json({ instance: { instanceName: ORG_ID, status: 'created' } });
});

app.post('/message/sendText/:instanceName', async (req, res) => {
    const { number, text } = req.body;
    const sock = sessions.get(ORG_ID);
    if (!sock) return res.status(500).json({ error: 'Instance not ready' });

    try {
        const cleanNumber = number.replace(/\D/g, '');
        const jid = number.includes('@') ? number : (cleanNumber.startsWith('30') ? `${cleanNumber}@lid` : `${cleanNumber}@s.whatsapp.net`);
        console.log(`[Send] To: ${jid} | Text: ${text}`);
        const result = await sock.sendMessage(jid, { text });
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/message/sendMedia/:instanceName', async (req, res) => {
    const { number, media, mediatype, caption, fileName } = req.body;
    const sock = sessions.get(ORG_ID);
    if (!sock) return res.status(500).json({ error: 'Instance not ready' });

    try {
        const cleanNumber = number.replace(/\D/g, '');
        const jid = number.includes('@') ? number : (cleanNumber.startsWith('30') ? `${cleanNumber}@lid` : `${cleanNumber}@s.whatsapp.net`);
        console.log(`[Send Media] To: ${jid} | Type: ${mediatype}`);
        let message = {};
        if (mediatype === 'image') message = { image: { url: media }, caption: caption && caption !== 'undefined' ? caption : undefined };
        else if (mediatype === 'video') message = { video: { url: media }, caption: caption && caption !== 'undefined' ? caption : undefined };
        else if (mediatype === 'audio' || mediatype === 'ptt') message = { audio: { url: media }, mimetype: req.body.mimetype || 'audio/mp4', ptt: true };
        else if (mediatype === 'document') message = { document: { url: media }, fileName, mimetype: req.body.mimetype || 'application/pdf' };

        const result = await sock.sendMessage(jid, message);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/message/sendWhatsAppAudio/:instanceName', async (req, res) => {
    const { number, audio } = req.body;
    const sock = sessions.get(ORG_ID);
    if (!sock) return res.status(500).json({ error: 'Instance not ready' });
    try {
        const cleanNumber = number.replace(/\D/g, '');
        const jid = number.includes('@') ? number : (cleanNumber.startsWith('30') ? `${cleanNumber}@lid` : `${cleanNumber}@s.whatsapp.net`);
        const result = await sock.sendMessage(jid, { audio: { url: audio }, mimetype: 'audio/mp4', ptt: true });
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/instance/logout/:instanceName', async (req, res) => {
    const sock = sessions.get(ORG_ID);
    if (sock) {
        await sock.logout();
        res.json({ success: true });
    } else res.status(404).json({ error: 'Not found' });
});

app.delete('/instance/delete/:instanceName', async (req, res) => {
    const sock = sessions.get(ORG_ID);
    if (sock) {
        try { await sock.logout(); } catch (e) { }
        sessions.delete(ORG_ID);
    }
    const sessionDir = path.join(process.cwd(), 'auth', ORG_ID);
    try {
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
    } catch (e) { }
    lastQR = null;
    initWhatsApp(ORG_ID).catch(console.error);
    res.json({ success: true });
});

app.post('/webhook/set/:instanceName', (req, res) => {
    res.json({ success: true, message: 'Webhook simulated' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Baileys Server] Emulating Evolution API on port ${PORT}`);
    initWhatsApp(ORG_ID).catch(console.error);
});
