import { supabase } from './supabaseClient';

export interface WhatsAppConfig {
    apiUrl: string;
    instanceName: string;
}

class WhatsAppService {
    private getBaseUrl(): string {
        const apiUrlEnv = import.meta.env.VITE_API_URL || '';
        return apiUrlEnv || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? `http://${window.location.hostname}:4000` : '');
    }

    private async getConfig(organizationId: string): Promise<WhatsAppConfig> {
        const baseUrl = this.getBaseUrl();
        const response = await fetch(`${baseUrl}/db/whatsapp_config?orgId=${organizationId}`);
        const configs = await response.json();
        const data = configs[0];
        return {
            apiUrl: baseUrl,
            instanceName: data?.instance_name || 'main'
        };
    }

    // --- MESSAGING ---

    async sendText(organizationId: string, remoteJid: string, text: string) {
        const config = await this.getConfig(organizationId);
        const response = await fetch(`${config.apiUrl}/message/sendText/${config.instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: remoteJid, text })
        });
        return response.json();
    }

    async sendMedia(organizationId: string, remoteJid: string, mediaUrl: string, mediaType: 'image' | 'video', caption?: string) {
        const config = await this.getConfig(organizationId);
        const mimetypes: Record<string, string> = { 'image': 'image/jpeg', 'video': 'video/mp4' };
        const response = await fetch(`${config.apiUrl}/message/sendMedia/${config.instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

    async sendAudio(organizationId: string, remoteJid: string, audioUrl: string) {
        const config = await this.getConfig(organizationId);
        const response = await fetch(`${config.apiUrl}/message/sendWhatsAppAudio/${config.instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: remoteJid, audio: audioUrl })
        });
        return response.json();
    }

    async sendDocument(organizationId: string, remoteJid: string, documentUrl: string, filename: string, mimetype?: string) {
        const config = await this.getConfig(organizationId);
        const response = await fetch(`${config.apiUrl}/message/sendMedia/${config.instanceName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

    // --- CONNECTION ---

    async getQrCode(organizationId: string) {
        const config = await this.getConfig(organizationId);
        console.log(`[Baileys] Fetching QR for: ${config.instanceName} at ${config.apiUrl}`);

        const response = await fetch(`${config.apiUrl}/instance/connect/${config.instanceName}`);
        const data = await response.json();
        console.log('[Baileys] QR Response:', data);

        const qr = data.base64 || data.code || data.qrcode?.base64 || data.qrcode?.code || data.qrcode;
        if (!qr) {
            return { error: data.error || data.message || 'No QR', raw: data };
        }
        return typeof qr === 'string' ? qr : (qr.base64 || qr.code || { error: 'Invalid QR', raw: data });
    }

    async checkConnection(organizationId: string) {
        const config = await this.getConfig(organizationId);
        const response = await fetch(`${config.apiUrl}/instance/connectionState/${config.instanceName}`);
        const data = await response.json();
        return data.instance?.state === 'open' || data.state === 'open' || data.instance?.status === 'connected';
    }

    async deleteInstance(organizationId: string) {
        const config = await this.getConfig(organizationId);
        const response = await fetch(`${config.apiUrl}/instance/delete/${config.instanceName}`, {
            method: 'DELETE'
        });
        return response.json();
    }

    async logoutInstance(organizationId: string) {
        const config = await this.getConfig(organizationId);
        const response = await fetch(`${config.apiUrl}/instance/logout/${config.instanceName}`, {
            method: 'DELETE'
        });
        return response.json();
    }
}

export const whatsappService = new WhatsAppService();
