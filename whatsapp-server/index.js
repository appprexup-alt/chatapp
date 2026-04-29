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
const DB_SCHEMA = process.env.DB_SCHEMA || 'public';

// Startup diagnostics
console.log('=== WhatsApp Server Starting ===');
console.log(`  PORT: ${PORT}`);
console.log(`  ORG_ID: ${ORG_ID}`);
console.log(`  DB_SCHEMA: ${DB_SCHEMA}`);
console.log(`  DATABASE_URL: ${DATABASE_URL ? 'SET (' + DATABASE_URL.split('@')[1]?.split('/')[0] + ')' : 'NOT SET'}`);
console.log(`  SUPABASE_URL: ${SUPABASE_URL || 'NOT SET'}`);
console.log(`  SUPABASE_KEY: ${SUPABASE_KEY ? 'SET (len=' + SUPABASE_KEY.length + ')' : 'NOT SET'}`);
console.log(`  BASE_URL: ${BASE_URL || 'NOT SET (will auto-detect)'}`);
console.log('================================');

const logger = pino({ level: 'warn' });

// Global socket map
const sessions = new Map();
const lidToPhoneMap = new Map();
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
        const clean = phone.replace(/\D/g, '');

        let actualOrgId = orgId;
        try {
            if (this.usePostgres) {
                const { rows } = await this.pool.query(`SELECT id FROM ${DB_SCHEMA}.organizations LIMIT 1`);
                if (rows.length > 0) actualOrgId = rows[0].id;
            } else {
                const { data } = await this.supabase.from('organizations').select('id').limit(1).maybeSingle();
                if (data) actualOrgId = data.id;
            }
        } catch (e) { }

        if (this.usePostgres) {
            try {
                // Try with whatsapp_id first
                const { rows } = await this.pool.query(
                    `SELECT * FROM ${DB_SCHEMA}.leads WHERE organization_id = $1 AND (phone = $2 OR whatsapp_id = $2 OR phone LIKE $3 OR $2 LIKE '%' || phone) LIMIT 1`,
                    [actualOrgId, clean, `%${clean}`]
                );
                return { data: rows[0] };
            } catch (e) {
                // whatsapp_id column might not exist, fallback
                const { rows } = await this.pool.query(
                    `SELECT * FROM ${DB_SCHEMA}.leads WHERE organization_id = $1 AND (phone = $2 OR phone LIKE $3 OR $2 LIKE '%' || phone) LIMIT 1`,
                    [actualOrgId, clean, `%${clean}`]
                );
                return { data: rows[0] };
            }
        } else {
            const { data } = await this.supabase.from('leads').select('*').eq('organization_id', actualOrgId);
            const lead = data?.find(l => {
                if (l.whatsapp_id === clean) return true;
                const lPhone = (l.phone || '').replace(/\D/g, '');
                return lPhone.endsWith(clean) || clean.endsWith(lPhone);
            });
            return { data: lead };
        }
    }

    async createLead(name, phoneOrLid, orgId) {
        if (!this.isReady()) return { data: null };
        if (!phoneOrLid || phoneOrLid === 'status' || phoneOrLid.includes('status@broadcast')) return { data: null };
        const clean = phoneOrLid.replace('WA-', '').replace(/\D/g, '');
        const isLid = clean.length >= 14;
        const displayPhone = isLid ? clean : clean; // always use the number we have

        let actualOrgId = orgId;
        try {
            if (this.usePostgres) {
                const { rows } = await this.pool.query(`SELECT id FROM ${DB_SCHEMA}.organizations LIMIT 1`);
                if (rows.length > 0) actualOrgId = rows[0].id;
            } else {
                const { data } = await this.supabase.from('organizations').select('id').limit(1).maybeSingle();
                if (data) actualOrgId = data.id;
            }
        } catch (e) { }

        let firstStageId = null;
        try {
            if (this.usePostgres) {
                const { rows } = await this.pool.query(`SELECT id FROM ${DB_SCHEMA}.pipeline_stages ORDER BY "order" ASC LIMIT 1`);
                if (rows.length > 0) firstStageId = rows[0].id;
            } else {
                const { data } = await this.supabase.from('pipeline_stages').select('id').order('order', { ascending: true }).limit(1).single();
                if (data) firstStageId = data.id;
            }
        } catch (e) { }

        if (this.usePostgres) {
            try {
                // Try with whatsapp_id column
                const { rows } = await this.pool.query(
                    `INSERT INTO ${DB_SCHEMA}.leads (organization_id, name, phone, whatsapp_id, status, source, pipeline_stage_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                    [actualOrgId, name || 'Nuevo Contacto', displayPhone, isLid ? clean : null, 'Nuevo', 'WhatsApp', firstStageId]
                );
                return { data: rows[0] };
            } catch (e) {
                // Fallback without whatsapp_id
                const { rows } = await this.pool.query(
                    `INSERT INTO ${DB_SCHEMA}.leads (organization_id, name, phone, status, source, pipeline_stage_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                    [actualOrgId, name || 'Nuevo Contacto', displayPhone, 'Nuevo', 'WhatsApp', firstStageId]
                );
                return { data: rows[0] };
            }
        } else {
            const leadData = {
                organization_id: actualOrgId,
                name: name || 'Nuevo Contacto',
                phone: displayPhone,
                status: 'Nuevo',
                source: 'WhatsApp',
                pipeline_stage_id: firstStageId
            };
            return await this.supabase.from('leads').insert([leadData]).select().single();
        }
    }

    async saveMessage(msgData) {
        if (!this.isReady()) return;
        const sender = msgData.sender || 'client';
        try {
            if (this.usePostgres) {
                await this.pool.query(
                    `INSERT INTO ${DB_SCHEMA}.messages (organization_id, lead_id, content, sender, media_type, media_url, media_filename) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [msgData.organization_id, msgData.lead_id, msgData.content || '', sender, msgData.media_type || 'text', msgData.media_url || null, msgData.media_filename || null]
                );
                console.log(`[DB] ✅ Message saved | lead=${msgData.lead_id} | sender=${sender}`);
            } else {
                const { payload, ...clean } = msgData;
                await this.supabase.from('messages').insert([{ ...clean, sender }]);
            }
        } catch (err) {
            console.error('[DB] ❌ saveMessage failed:', err.message);
        }
    }

    async updateWhatsappStatus(orgId, status, extra = {}) {
        if (!this.isReady()) return;
        let actualOrgId = orgId;
        try {
            if (this.usePostgres) {
                const { rows } = await this.pool.query(`SELECT id FROM ${DB_SCHEMA}.organizations LIMIT 1`);
                if (rows.length > 0) actualOrgId = rows[0].id;
            } else {
                const { data } = await this.supabase.from('organizations').select('id').limit(1).maybeSingle();
                if (data) actualOrgId = data.id;
            }
        } catch (e) { }

        console.log(`[DB] Upserting whatsapp_config: orgId=${actualOrgId}, status=${status}`);
        try {
            if (this.usePostgres) {
                await this.pool.query(
                    `INSERT INTO ${DB_SCHEMA}.whatsapp_config (organization_id, status, updated_at)
                     VALUES ($1, $2, NOW())
                     ON CONFLICT (organization_id) DO UPDATE SET status = $2, updated_at = NOW()`,
                    [actualOrgId, status]
                );
                if (extra.qr_code !== undefined) {
                    try { await this.pool.query(`UPDATE ${DB_SCHEMA}.whatsapp_config SET qr_code = $1 WHERE organization_id = $2`, [extra.qr_code, actualOrgId]); } catch(e) {}
                }
                if (extra.phone_number !== undefined) {
                    try { await this.pool.query(`UPDATE ${DB_SCHEMA}.whatsapp_config SET phone_number = $1 WHERE organization_id = $2`, [extra.phone_number, actualOrgId]); } catch(e) {}
                }
            } else {
                await this.supabase.from('whatsapp_config').upsert({ organization_id: actualOrgId, status, ...extra, updated_at: new Date().toISOString() }, { onConflict: 'organization_id' });
            }
            console.log(`[DB] ✅ Status upserted for Org ${actualOrgId} to: ${status}`);
        } catch (err) {
            console.error('[DB] ❌ Failed to upsert status:', err.message);
        }
    }

    async updateLeadPhone(leadId, newPhone, whatsappId = null) {
        if (!this.isReady()) return;
        try {
            if (this.usePostgres) {
                let q = `UPDATE ${DB_SCHEMA}.leads SET phone = $1, updated_at = NOW()`;
                const params = [newPhone];
                if (whatsappId) {
                    q += `, whatsapp_id = $2`;
                    params.push(whatsappId);
                }
                q += ` WHERE id = $${params.length + 1}`;
                params.push(leadId);
                await this.pool.query(q, params);
            } else {
                const updateData = { phone: newPhone, updated_at: new Date().toISOString() };
                if (whatsappId) updateData.whatsapp_id = whatsappId;
                await this.supabase.from('leads').update(updateData).eq('id', leadId);
            }
            console.log(`[DB] Lead ${leadId} updated. Phone: ${newPhone}, WA_ID: ${whatsappId}`);
        } catch (err) {
            console.error('[DB] Error updating lead:', err.message);
        }
    }

    async updateLeadName(leadId, newName) {
        if (!this.isReady()) return;
        try {
            if (this.usePostgres) {
                await this.pool.query(`UPDATE ${DB_SCHEMA}.leads SET name = $1, updated_at = NOW() WHERE id = $2`, [newName, leadId]);
            } else {
                await this.supabase.from('leads').update({ name: newName, updated_at: new Date().toISOString() }).eq('id', leadId);
            }
            console.log(`[DB] Lead ${leadId} name updated to: ${newName}`);
        } catch (err) {
            console.error('[DB] Error updating lead name:', err.message);
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
        browser: Browsers.ubuntu('Chrome'),
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
                let phone = normalized.split('@')[0].replace('WA-', '');

                // --- LID to Phone Resolution ---
                if (from.endsWith('@lid')) {
                    // Try to get the real phone number from the message itself if available
                    // or from our internal map built during contact sync
                    const contact = lidToPhoneMap.get(from);
                    if (contact) {
                        phone = contact;
                    } else {
                        // If not found, we keep the LID for now but it will be updated
                        // as soon as the contact sync completes
                    }
                }
                
                const finalPhone = phone.replace(/\D/g, '');
                if (!finalPhone) continue;

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

    sock.ev.on('contacts.upsert', async (contacts) => {
        console.log(`[Contacts] Received ${contacts.length} contacts`);
        for (const contact of contacts) {
            let resolvedLid = null;
            let resolvedPhone = null;

            if (contact.id && contact.id.endsWith('@s.whatsapp.net')) {
                const phone = contact.id.split('@')[0];
                const lid = contact.lid || contact.lidJid;
                if (lid) {
                    resolvedLid = lid;
                    resolvedPhone = phone;
                }
            } else if (contact.id && contact.id.endsWith('@lid')) {
                resolvedLid = contact.id;
                const rawNum = contact.phoneNumber || contact.number;
                if (rawNum) {
                    resolvedPhone = rawNum.replace(/\D/g, '');
                }
            }

            if (resolvedLid && resolvedPhone) {
                lidToPhoneMap.set(resolvedLid, resolvedPhone);
                console.log(`[Map] LID ${resolvedLid} -> Phone ${resolvedPhone}`);

                // Update database lead if it exists
                try {
                    const cleanLid = resolvedLid.split('@')[0].replace(/\D/g, '');
                    const { data: lead } = await db.findLeadByPhone(cleanLid, orgId);
                    if (lead && (lead.phone === cleanLid || lead.phone.includes('SOLICITAR') || lead.phone.startsWith('WA-') || lead.phone.length > 13)) {
                        await db.updateLeadPhone(lead.id, resolvedPhone, cleanLid);
                        console.log(`[DB Update] Updated lead ${lead.id} with resolved phone: ${resolvedPhone}`);
                    }
                } catch (e) {
                    console.error('[DB Update] Error updating resolved phone in upsert:', e.message);
                }
            }
        }
        console.log(`[Map] Total LID mappings: ${lidToPhoneMap.size}`);
    });

    sock.ev.on('contacts.update', async (updates) => {
        for (const update of updates) {
            console.log(`[ContactUpdate] id=${update.id} keys=${Object.keys(update).join(',')}`);
            if (update.id && update.id.endsWith('@lid')) {
                const rawNum = update.phoneNumber || update.number;
                if (rawNum) {
                    const resolvedLid = update.id;
                    const resolvedPhone = rawNum.replace(/\D/g, '');
                lidToPhoneMap.set(resolvedLid, resolvedPhone);
                console.log(`[Map] LID ${resolvedLid} -> Phone ${resolvedPhone}`);

                // Update database lead if it exists
                try {
                    const cleanLid = resolvedLid.split('@')[0].replace(/\D/g, '');
                    const { data: lead } = await db.findLeadByPhone(cleanLid, orgId);
                    if (lead && (lead.phone === cleanLid || lead.phone.includes('SOLICITAR') || lead.phone.startsWith('WA-') || lead.phone.length > 13)) {
                        await db.updateLeadPhone(lead.id, resolvedPhone, cleanLid);
                        console.log(`[DB Update] Updated lead ${lead.id} with resolved phone: ${resolvedPhone}`);
                    }
                } catch (e) { }
                }
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        console.log(`[Msg] Received messages upsert event of type: ${m.type}`);
        for (const msg of m.messages) {
            try {
                if (!msg.message) continue;
                const from = msg.key.remoteJid;
                // STRICT: Filter out Groups (@g.us), Channels (@newsletter), Statuses
                if (!from || from === 'status@broadcast' || from.endsWith('@g.us') || from.endsWith('@newsletter') || from.includes('-')) {
                    continue;
                }

                let phone = '';
                const isLid = from.endsWith('@lid');

                if (isLid) {
                    // 1. Try to resolve from alternate PN fields (WhatsApp Phone Number fallback)
                    const altJid = msg.key.remoteJidAlt || msg.key.participantAlt;
                    if (altJid && !altJid.endsWith('@lid')) {
                        phone = altJid.split('@')[0].replace(/\D/g, '');
                        lidToPhoneMap.set(from, phone);
                        console.log(`[Msg] LID resolved from Alt field: ${phone}`);
                    }

                    // 2. Try LID map next
                    if (!phone && lidToPhoneMap.has(from)) {
                        phone = lidToPhoneMap.get(from);
                        console.log(`[Msg] LID resolved from map: ${phone}`);
                    } else if (!phone) {
                        // Try to get phone from store contacts
                        const storeContacts = sock.store?.contacts || {};
                        for (const [jid, contact] of Object.entries(storeContacts)) {
                            if (contact && (contact.lid === from || contact.lidJid === from)) {
                                phone = jid.split('@')[0];
                                lidToPhoneMap.set(from, phone);
                                console.log(`[Msg] LID resolved from store: ${phone}`);
                                break;
                            }
                        }
                        // If still no phone, use the LID number part but mark as SOLICITAR NUMERO
                        if (!phone) {
                            const lidNum = from.split('@')[0].replace(/\D/g, '');
                            phone = lidNum;
                            console.log(`[Msg] LID unresolved, using raw identifier: ${phone}`);
                        }
                    }
                } else {
                    const normalized = jidNormalizedUser(from);
                    phone = normalized.split('@')[0].replace('WA-', '').replace(/\D/g, '');
                }

                if (!phone) continue;

                const isMe = msg.key.fromMe;

                // 2. Find or create lead
                let { data: lead } = await db.findLeadByPhone(phone, orgId);
                
                // If not found by real phone, but it was a LID, check if a lead was saved with the LID identifier
                if (!lead && isLid) {
                    const cleanLid = from.split('@')[0].replace(/\D/g, '');
                    const { data: lidLead } = await db.findLeadByPhone(cleanLid, orgId);
                    if (lidLead) {
                        lead = lidLead;
                        // Update the LID lead in the database with the real phone number
                        await db.updateLeadPhone(lead.id, phone, cleanLid);
                        lead.phone = phone;
                        console.log(`[DB Update] Automatically updated LID lead ${lead.id} to real phone: ${phone}`);
                    }
                }
                
                if (!lead && !isMe) {
                    const { data: newLead } = await db.createLead(msg.pushName || phone, phone, orgId);
                    lead = newLead;
                } else if (lead && msg.pushName && (lead.name === lead.phone || lead.name.includes('SOLICITAR') || lead.name.includes(':') || /^\d+$/.test(lead.name))) {
                    await db.updateLeadName(lead.id, msg.pushName);
                    lead.name = msg.pushName;
                }

                if (!lead) continue;

                // If lead has real phone, use it
                if (lead.phone) {
                    phone = lead.phone.replace(/\D/g, '');
                }

                // 3. Extract content
                let content = msg.message?.conversation 
                    || msg.message?.extendedTextMessage?.text 
                    || '';
                let mediaType = 'text';
                let mediaUrl = null;

                if (msg.message?.imageMessage) {
                    mediaType = 'image';
                    content = msg.message.imageMessage.caption || '';
                } else if (msg.message?.videoMessage) {
                    mediaType = 'video';
                    content = msg.message.videoMessage.caption || '';
                } else if (msg.message?.audioMessage) {
                    mediaType = 'audio';
                } else if (msg.message?.documentMessage) {
                    mediaType = 'document';
                    content = msg.message.documentMessage.fileName || '';
                }

                // 4. Download media if needed
                if (mediaType !== 'text') {
                    try {
                        const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
                        const mime = msg.message?.imageMessage?.mimetype || msg.message?.videoMessage?.mimetype || msg.message?.audioMessage?.mimetype || msg.message?.documentMessage?.mimetype || '';
                        let ext = 'bin';
                        if (mime.includes('image/jpeg')) ext = 'jpg';
                        else if (mime.includes('image/png')) ext = 'png';
                        else if (mime.includes('video/mp4')) ext = 'mp4';
                        else if (mime.includes('audio')) ext = 'mp3';
                        else if (mime.includes('pdf')) ext = 'pdf';

                        const fileName = `wa_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
                        const filePath = path.join(__dirname, 'uploads', fileName);
                        fs.writeFileSync(filePath, buffer);
                        
                        const detectedBaseUrl = BASE_URL || `http://localhost:${PORT}`;
                        mediaUrl = `${detectedBaseUrl}/uploads/${fileName}`;
                    } catch (err) {
                        console.error('[Media] Download failed:', err.message);
                    }
                }

                // 5. Save message
                const ts = msg.messageTimestamp ? new Date(Number(msg.messageTimestamp) * 1000).toISOString() : new Date().toISOString();
                await db.saveMessage({
                    organization_id: orgId,
                    lead_id: lead.id,
                    content: content || (mediaType === 'audio' ? 'Nota de voz' : `[${mediaType}]`),
                    sender: isMe ? 'agent' : 'client',
                    media_type: mediaType,
                    media_url: mediaUrl,
                    media_filename: msg.message?.documentMessage?.fileName || null
                });

                console.log(`[Msg] ${isMe ? 'OUT' : 'IN'} | ${phone} | ${mediaType} | ${content?.substring(0, 30) || '...'}`);
            } catch (err) {
                console.error('[Msg Error]', err.message, err.stack?.split('\n')[1]);
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
    const orgId = req.params.instanceName || ORG_ID;
    const sock = sessions.get(orgId);
    
    if (lastQR) {
        res.json({ qrcode: { base64: lastQR }, code: lastQR });
    } else if (sock?.user) {
        res.json({ message: 'CONNECTED', state: 'open' });
    } else {
        res.json({ message: 'Aún no hay QR, espera unos segundos...', state: 'connecting' });
    }
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
    let sock = sessions.get(ORG_ID);
    if (!sock && sessions.size > 0) sock = sessions.values().next().value;
    if (!sock) return res.status(500).json({ error: 'Instance not ready' });

    try {
        const cleanNumber = number.replace(/\D/g, '');
        // LIDs are 14+ digit internal WhatsApp IDs, regular phones are shorter
        const jid = number.includes('@') ? number : (cleanNumber.length >= 14 ? `${cleanNumber}@lid` : `${cleanNumber}@s.whatsapp.net`);
        console.log(`[Send] To: ${jid} | Text: ${text}`);
        const result = await sock.sendMessage(jid, { text });
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/message/sendMedia/:instanceName', async (req, res) => {
    const { number, media, mediatype, caption, fileName } = req.body;
    let sock = sessions.get(ORG_ID);
    if (!sock && sessions.size > 0) sock = sessions.values().next().value;
    if (!sock) return res.status(500).json({ error: 'Instance not ready' });

    try {
        const cleanNumber = number.replace(/\D/g, '');
        const jid = number.includes('@') ? number : (cleanNumber.length >= 14 ? `${cleanNumber}@lid` : `${cleanNumber}@s.whatsapp.net`);
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
    let sock = sessions.get(ORG_ID);
    if (!sock && sessions.size > 0) sock = sessions.values().next().value;
    if (!sock) return res.status(500).json({ error: 'Instance not ready' });
    try {
        const cleanNumber = number.replace(/\D/g, '');
        const jid = number.includes('@') ? number : (cleanNumber.length >= 14 ? `${cleanNumber}@lid` : `${cleanNumber}@s.whatsapp.net`);
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
    const orgId = req.params.instanceName || ORG_ID;
    console.log(`[Instance] Full reset/delete requested for: ${orgId}`);
    const sock = sessions.get(orgId);
    if (sock) {
        try { await sock.logout(); } catch (e) { }
        sessions.delete(orgId);
    }
    const sessionDir = path.join(__dirname, 'auth', orgId);
    try {
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            console.log(`[Instance] Deleted session dir: ${sessionDir}`);
        }
    } catch (e) { 
        console.error(`[Instance] Error deleting dir: ${e.message}`);
    }
    lastQR = null;
    // Short delay to ensure FS is ready
    setTimeout(() => {
        initWhatsApp(orgId).catch(console.error);
    }, 1000);
    res.json({ success: true, message: 'Instancia reiniciada desde cero.' });
});

app.post('/webhook/set/:instanceName', (req, res) => {
    res.json({ success: true, message: 'Webhook simulated' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Baileys Server] Emulating Evolution API on port ${PORT}`);
    initWhatsApp(ORG_ID).catch(console.error);
});
