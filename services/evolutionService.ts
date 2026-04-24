import { supabase } from './supabaseClient';

export interface EvolutionInstanceConfig {
    apiUrl: string;
    apiKey: string;
    instanceName: string;
}

class EvolutionService {
    private async getConfig(organizationId: string): Promise<EvolutionInstanceConfig | null> {
        const apiUrlEnv = import.meta.env.VITE_API_URL || '';
        const baseApiUrl = apiUrlEnv || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:4000` : '');

        const response = await fetch(`${baseApiUrl}/db/whatsapp_config?orgId=${organizationId}`);
        const configs = await response.json();
        const data = configs[0];

        return {
            apiUrl: baseApiUrl,
            apiKey: data?.evolution_api_key || 'internal',
            instanceName: data?.instance_name || 'main'
        };
    }

    private async getCorrectedConfig(organizationId: string): Promise<EvolutionInstanceConfig | null> {
        return await this.getConfig(organizationId);
    }

    async sendText(organizationId: string, remoteJid: string, text: string) {
        const config = await this.getCorrectedConfig(organizationId);
        if (!config) throw new Error('Evolution API not configured');

        const response = await fetch(`${config.apiUrl}/message/sendText/${config.instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.apiKey
            },
            body: JSON.stringify({
                number: remoteJid,
                text: text
            })
        });

        return response.json();
    }

    // Send image or video media
    async sendMedia(organizationId: string, remoteJid: string, mediaUrl: string, mediaType: 'image' | 'video', caption?: string) {
        const config = await this.getCorrectedConfig(organizationId);
        if (!config) throw new Error('Evolution API not configured');

        const mimetypes: Record<string, string> = {
            'image': 'image/jpeg',
            'video': 'video/mp4'
        };

        const response = await fetch(`${config.apiUrl}/message/sendMedia/${config.instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.apiKey
            },
            body: JSON.stringify({
                number: remoteJid,
                mediatype: mediaType,
                mimetype: mimetypes[mediaType],
                caption: caption || '',
                media: mediaUrl
            })
        });

        return response.json();
    }

    // Send audio/voice note
    async sendAudio(organizationId: string, remoteJid: string, audioUrl: string) {
        const config = await this.getCorrectedConfig(organizationId);
        if (!config) throw new Error('Evolution API not configured');

        const response = await fetch(`${config.apiUrl}/message/sendWhatsAppAudio/${config.instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.apiKey
            },
            body: JSON.stringify({
                number: remoteJid,
                audio: audioUrl
            })
        });

        return response.json();
    }

    // Send document file
    async sendDocument(organizationId: string, remoteJid: string, documentUrl: string, filename: string, mimetype?: string) {
        const config = await this.getCorrectedConfig(organizationId);
        if (!config) throw new Error('Evolution API not configured');

        const response = await fetch(`${config.apiUrl}/message/sendMedia/${config.instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.apiKey
            },
            body: JSON.stringify({
                number: remoteJid,
                mediatype: 'document',
                mimetype: mimetype || 'application/octet-stream',
                fileName: filename,
                media: documentUrl
            })
        });

        return response.json();
    }

    async getQrCode(organizationId: string) {
        const config = await this.getCorrectedConfig(organizationId);
        if (!config) throw new Error('Evolution API not configured');

        console.log(`[Evolution] Fetching QR for instance: ${config.instanceName} at ${config.apiUrl}`);

        const response = await fetch(`${config.apiUrl}/instance/connect/${config.instanceName}`, {
            method: 'GET',
            headers: {
                'apikey': config.apiKey
            }
        });

        const data = await response.json();
        console.log('[Evolution] QR Response:', data);

        const qr = data.base64 || data.code || data.qrcode?.base64 || data.qrcode?.code || data.qrcode;

        if (!qr) {
            if (data.error || data.message) return { error: data.error || data.message, raw: data };
            return { error: 'No se encontró QR en la respuesta', raw: data };
        }

        return typeof qr === 'string' ? qr : (qr.base64 || qr.code);
    }

    async checkConnection(organizationId: string) {
        const config = await this.getCorrectedConfig(organizationId);
        if (!config) throw new Error('Evolution API not configured');

        const response = await fetch(`${config.apiUrl}/instance/connectionState/${config.instanceName}`, {
            method: 'GET',
            headers: {
                'apikey': config.apiKey
            }
        });

        const data = await response.json();
        return data.instance?.state === 'open' || data.state === 'open' || data.instance?.status === 'connected';
    }

    async instanceExists(organizationId: string): Promise<string | null> {
        const config = await this.getConfig(organizationId);
        if (!config) return null;

        try {
            const response = await fetch(`${config.apiUrl}/instance/fetchInstances`, {
                method: 'GET',
                headers: { 'apikey': config.apiKey }
            });
            const data = await response.json();
            if (!Array.isArray(data)) return null;

            // Find the instance (case-insensitive) and return its ACTUAL name on the server
            const found = data.find((i: any) =>
                (i.name?.toLowerCase() === config.instanceName.toLowerCase()) ||
                (i.instanceName?.toLowerCase() === config.instanceName.toLowerCase())
            );
            return found ? (found.name || found.instanceName) : null;
        } catch (e) {
            return null;
        }
    }

    async createInstance(organizationId: string) {
        const config = await this.getConfig(organizationId);
        if (!config) throw new Error('Evolution API not configured');

        // Check if it already exists to avoid 401/409 on create
        const existingName = await this.instanceExists(organizationId);
        if (existingName) return { message: 'Instance already exists', instance: { instanceName: existingName } };

        const response = await fetch(`${config.apiUrl}/instance/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.apiKey
            },
            body: JSON.stringify({
                instanceName: config.instanceName,
                token: config.apiKey,
                qrcode: true
            })
        });

        const data = await response.json();
        if (response.status === 401) {
            console.error('[Evolution] 401 Unauthorized. This usually means the API Key is invalid or you are using an Instance Token instead of the Global API Key.');
            throw new Error('No autorizado. Asegúrate de estar usando la "Global API Key" de Evolution API, no el token de una instancia.');
        }
        return data;
    }

    async logoutInstance(organizationId: string) {
        const config = await this.getCorrectedConfig(organizationId);
        if (!config) throw new Error('Evolution API not configured');

        const response = await fetch(`${config.apiUrl}/instance/logout/${config.instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': config.apiKey }
        });

        const data = await response.json();
        return data;
    }

    async deleteInstance(organizationId: string) {
        const config = await this.getCorrectedConfig(organizationId);
        if (!config) throw new Error('Evolution API not configured');

        const response = await fetch(`${config.apiUrl}/instance/delete/${config.instanceName}`, {
            method: 'DELETE',
            headers: { 'apikey': config.apiKey }
        });

        const data = await response.json();
        return data;
    }

    async setWebhook(organizationId: string, url: string) {
        const config = await this.getCorrectedConfig(organizationId);
        if (!config) throw new Error('Evolution API not configured');

        console.log(`[Evolution] Setting webhook for ${config.instanceName} to ${url}`);

        const response = await fetch(`${config.apiUrl}/webhook/set/${config.instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.apiKey
            },
            body: JSON.stringify({
                url: url,
                enabled: true,
                webhook_by_events: false,
                events: [
                    "MESSAGES_UPSERT",
                    "MESSAGES_UPDATE",
                    "MESSAGES_DELETE",
                    "SEND_MESSAGE",
                    "CONTACTS_UPSERT",
                    "CONTACTS_UPDATE",
                    "INSTANCE_UPDATE",
                    "QRCODE_UPDATED"
                ]
            })
        });

        const data = await response.json();
        return data;
    }
}

export const evolutionService = new EvolutionService();
