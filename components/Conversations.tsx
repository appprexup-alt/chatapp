import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { db } from '../services/db';
import { Lead, Message, User, QuickReply, MediaType, PipelineStage, LeadSource } from '../types';

import {
    MessageCircle, Search, MoreVertical, Phone, Video,
    Paperclip, Mic, Send, Image as ImageIcon, X,
    FileText, User as UserIcon, Calendar, Clock,
    Check, CheckCircle, ChevronDown, Filter, Zap,
    Play, Pause, Trash2, ArrowLeft, MoreHorizontal,
    Smile, TrendingUp, Download, MessageSquare, Film, CheckCheck, Plus, Edit, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { replaceVariables, insertVariableAtCursor } from '../utils/textUtils';
import { useNotification } from './NotificationContext';
import QuickReplyManager from './QuickReplyManager';

const Conversations: React.FC = () => {
    const isLID = (phone: string) => {
        if (!phone) return false;
        const clean = phone.replace(/\D/g, '');
        return clean.length >= 14 || /[a-zA-Z]/.test(phone) || phone.includes(':');
    };

    const formatPhone = (phone: string) => {
        if (!phone) return '';
        if (isLID(phone)) {
            return `📱 WA-${phone.slice(0, 6)}...`;
        }
        const clean = phone.replace(/\D/g, '');
        if (!clean) return phone;
        return `+${clean}`;
    };

    const { addNotification } = useNotification();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
    const [sources, setSources] = useState<LeadSource[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // Filter States
    const [showFilters, setShowFilters] = useState(false);
    const [filterStage, setFilterStage] = useState('all');
    const [filterSource, setFilterSource] = useState('all');
    const [filterAgent, setFilterAgent] = useState('all');
    const [appLogo, setAppLogo] = useState<string>('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Media states
    const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pending file for preview before sending
    const [pendingFile, setPendingFile] = useState<{
        file?: File;
        preview: string;
        type: MediaType;
        caption: string;
        mediaUrl?: string;
    } | null>(null);

    // Quick Replies states
    const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);

    // Phone editing state
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [editPhoneValue, setEditPhoneValue] = useState('');

    const handleSavePhone = async () => {
        if (!selectedLead || !editPhoneValue.trim()) return;
        const cleanPhone = editPhoneValue.replace(/\D/g, '');
        if (!cleanPhone) return;
        try {
            const updated = { ...selectedLead, phone: cleanPhone };
            await db.updateLead(updated);
            setSelectedLead(updated);
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            addNotification({ title: 'Actualizado', message: `Teléfono cambiado a +${cleanPhone}`, type: 'success' });
        } catch (e: any) {
            addNotification({ title: 'Error', message: e.message, type: 'error' });
        }
        setIsEditingPhone(false);
    };
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const [showQuickReplyModal, setShowQuickReplyModal] = useState(false);


    // Image preview modal
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Quick Reply file upload states


    // Slash command state
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [filteredQuickReplies, setFilteredQuickReplies] = useState<QuickReply[]>([]);



    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('inmocrm_user') || 'null');
        setCurrentUser(user);
        loadLeads();
        loadQuickReplies();
        loadSettings();

        // GLOBAL REALTIME: Listen for any new messages to update lead list instantly
        const globalChannel = supabase
            .channel('global_messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: user?.organizationId ? `organization_id=eq.${user.organizationId}` : undefined
            }, (payload) => {
                console.log('[Realtime] Global message received:', payload);
                loadLeads(); // Refresh lead durations/last contact

                // If the message is for the currently selected lead, loadMessages will handle it via its own subscription
                // but we could also trigger it here to be safe.
                if (selectedLead && payload.new.lead_id === selectedLead.id) {
                    loadMessages(selectedLead.id);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(globalChannel);
        };
    }, [selectedLead?.id]); // Re-subscribe if selected lead changes to ensure logic remains fresh

    const loadSettings = async () => {
        const settings = await db.getSettings();
        setAppLogo(settings.logoUrl || '');
    };

    const loadLeads = async () => {
        const [l, p, s, u] = await Promise.all([
            db.getLeads(),
            db.getPipeline(),
            db.getSources(),
            db.getUsers()
        ]);
        setLeads(l);
        setPipelineStages(p);
        setSources(s);
        setUsers(u);
    };

    const loadQuickReplies = async () => {
        const qr = await db.getQuickReplies();
        setQuickReplies(qr);
    };

    useEffect(() => {
        if (selectedLead) {
            loadMessages(selectedLead.id);

            const channel = supabase
                .channel(`chat_${selectedLead.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `lead_id=eq.${selectedLead.id}`
                }, (payload) => {
                    const msg = payload.new as any;
                    console.log('[Realtime] Message for selected lead:', msg);
                    setMessages(prev => {
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, {
                            id: msg.id,
                            organizationId: msg.organization_id,
                            leadId: msg.lead_id,
                            content: msg.content,
                            sender: msg.sender,
                            createdAt: msg.created_at,
                            mediaType: msg.media_type || 'text',
                            mediaUrl: msg.media_url,
                            mediaFilename: msg.media_filename
                        }];
                    });
                })
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [selectedLead?.id]); // Only re-subscribe if the ID actually changes

    const loadMessages = async (leadId: string) => {
        if (!leadId) return;
        const msgs = await db.getMessages(leadId);
        setMessages(msgs);
    };

    // Removed individual polling, using Realtime instead

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Upload file to local bridge or Supabase
    const uploadFile = async (file: File): Promise<string | null> => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const apiUrlEnv = import.meta.env.VITE_API_URL || '';
            const internalUrl = apiUrlEnv || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `http://${window.location.hostname}:4000` : '');

            console.log(`[Upload] Sending to: ${internalUrl}/db/upload`);
            const response = await fetch(`${internalUrl}/db/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Error al subir archivo al servidor local');
            }

            const data = await response.json();
            return data.url;
        } catch (err: any) {
            console.error("Upload Exception (Bridge):", err);

            // Try Supabase as fallback
            try {
                const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                const { error: uploadError } = await supabase.storage
                    .from('uploads')
                    .upload(fileName, file, { cacheControl: '3600', upsert: false });

                if (!uploadError) {
                    const { data: publicData } = supabase.storage.from('uploads').getPublicUrl(fileName);
                    return publicData.publicUrl;
                }
            } catch (sErr) {
                console.error("Supabase fallback failed too:", sErr);
            }

            addNotification({
                title: 'Error de envío',
                message: 'No se pudo subir el archivo. Asegúrate de que el servidor de WhatsApp esté encendido.',
                type: 'error'
            });
            return null;
        }
    };

    // Determine media type from file
    const getMediaTypeFromFile = (file: File): MediaType => {
        const type = file.type.split('/')[0];
        if (type === 'image') return 'image';
        if (type === 'video') return 'video';
        if (type === 'audio') return 'audio';
        return 'document';
    };

    // Handle file attachment - show preview first
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !selectedLead || !currentUser) return;

        const file = e.target.files[0];
        setIsAttachmentOpen(false);

        const mediaType = getMediaTypeFromFile(file);

        // Create preview
        let preview = '';
        if (mediaType === 'image' || mediaType === 'video') {
            preview = URL.createObjectURL(file);
        }

        setPendingFile({
            file,
            preview,
            type: mediaType,
            caption: ''
        });

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Send pending file
    const handleSendPendingFile = async () => {
        if (!pendingFile || !selectedLead || !currentUser) return;

        setIsSending(true);
        setUploadProgress(10);

        try {
            let mediaUrl = pendingFile.mediaUrl;

            // Only upload if we have a file and no pre-existing URL
            if (pendingFile.file && !mediaUrl) {
                const uploadedUrl = await uploadFile(pendingFile.file);
                if (!uploadedUrl) throw new Error("Error al subir archivo");
                mediaUrl = uploadedUrl;
            } else if (!mediaUrl) {
                throw new Error("No hay archivo ni URL para enviar");
            }

            setUploadProgress(70);

            const res = await db.addMessage({
                leadId: selectedLead.id,
                content: pendingFile.caption || '',
                sender: 'agent',
                mediaType: pendingFile.type,
                mediaUrl: mediaUrl,
                mediaFilename: pendingFile.file ? pendingFile.file.name : `${pendingFile.type}_${Date.now()}`
            });

            setUploadProgress(100);

            if (!res.success) throw new Error(res.message);

            addNotification({ title: 'Enviado', message: 'Archivo enviado correctamente', type: 'success' });
            setPendingFile(null);
        } catch (error: any) {
            addNotification({ title: 'Error', message: error.message, type: 'error' });
        } finally {
            setIsSending(false);
            setUploadProgress(0);
        }
    };

    // Cancel pending file
    const handleCancelPendingFile = () => {
        if (pendingFile?.preview) {
            URL.revokeObjectURL(pendingFile.preview);
        }
        setPendingFile(null);
    };

    // Voice recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

                setIsSending(true);
                try {
                    const mediaUrl = await uploadFile(file);
                    if (!mediaUrl) throw new Error("Error al subir audio");

                    await db.addMessage({
                        leadId: selectedLead!.id,
                        content: '',
                        sender: 'agent',
                        mediaType: 'audio',
                        mediaUrl: mediaUrl,
                        mediaFilename: file.name
                    });

                    addNotification({ title: 'Enviado', message: 'Nota de voz enviada', type: 'success' });
                } catch (error: any) {
                    addNotification({ title: 'Error', message: error.message, type: 'error' });
                } finally {
                    setIsSending(false);
                }

                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            addNotification({ title: 'Error', message: 'No se pudo acceder al micrófono', type: 'error' });
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            setIsRecording(false);
            setMediaRecorder(null);
        }
    };

    const handleSendMessage = async () => {
        if (!selectedLead || !newMessage.trim() || !currentUser || isSending) return;

        const content = replaceVariables(newMessage, selectedLead);
        setNewMessage('');
        setIsSending(true);

        const tempId = Date.now().toString();
        const tempMsg: Message = {
            id: tempId,
            organizationId: currentUser.organizationId,
            leadId: selectedLead.id,
            content: content,
            sender: 'agent',
            createdAt: new Date().toISOString(),
            mediaType: 'text'
        };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const res = await db.addMessage({
                leadId: selectedLead.id,
                content: content,
                sender: 'agent',
                mediaType: 'text'
            });

            if (!res.success) throw new Error(res.message);
        } catch (error: any) {
            addNotification({ title: 'Error', message: 'No se pudo enviar: ' + error.message, type: 'error' });
            setMessages(prev => prev.filter(m => m.id !== tempId));
            setNewMessage(content);
        } finally {
            setIsSending(false);
        }
    };

    // Quick Reply handlers
    const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setNewMessage(text);

        if (text.startsWith('/')) {
            const query = text.slice(1).toLowerCase();
            const filtered = quickReplies.filter(qr =>
                qr.name.toLowerCase().includes(query) ||
                (qr.content && qr.content.toLowerCase().includes(query))
            );
            setFilteredQuickReplies(filtered);
            setShowSlashMenu(true);
        } else {
            setShowSlashMenu(false);
        }
    };

    const handleUseQuickReply = async (qr: QuickReply) => {
        if (!selectedLead || !currentUser) return;
        setShowQuickReplies(false);
        setShowSlashMenu(false);

        if (qr.type === 'text') {
            setNewMessage(qr.content || '');
        } else {
            // Check if we have media URL
            if (!qr.mediaUrl) {
                addNotification({ title: 'Error', message: 'Esta respuesta rápida no tiene archivo adjunto', type: 'error' });
                return;
            }

            // Open confirmation modal instead of sending directly
            setPendingFile({
                file: undefined,
                preview: qr.mediaUrl,
                type: qr.type,
                caption: qr.content || '',
                mediaUrl: qr.mediaUrl
            });
        }
    };



    const handleDeleteQuickReply = async (id: string) => {
        if (!confirm('¿Eliminar esta respuesta rápida?')) return;
        await db.deleteQuickReply(id);
        loadQuickReplies();
    };

    const handleQuickReplyManagerSave = async (reply: Partial<QuickReply>, file?: File) => {
        try {
            let mediaUrl = reply.mediaUrl;
            let mediaFilename = reply.mediaFilename;

            if (file) {
                const url = await uploadFile(file);
                if (url) {
                    mediaUrl = url;
                    mediaFilename = file.name;
                } else {
                    throw new Error("Error al subir archivo");
                }
            }

            const replyData = { ...reply, mediaUrl, mediaFilename };

            if (reply.id) {
                await db.updateQuickReply(replyData as QuickReply);
            } else {
                await db.addQuickReply(replyData);
            }
            loadQuickReplies();
            addNotification({ title: 'Guardado', message: 'Respuesta rápida guardada', type: 'success' });
        } catch (error: any) {
            addNotification({ title: 'Error', message: error.message, type: 'error' });
            throw error;
        }
    };

    // Render message content based on type
    const renderMessageContent = (msg: Message) => {
        const mediaType = msg.mediaType || 'text';

        switch (mediaType) {
            case 'image':
                return (
                    <div className="space-y-1">
                        <img
                            src={msg.mediaUrl}
                            alt="Imagen"
                            className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setPreviewImage(msg.mediaUrl || null)}
                        />
                        {msg.content && <p className="text-[12px]">{msg.content}</p>}
                    </div>
                );

            case 'video':
                return (
                    <div className="space-y-1">
                        <video
                            src={msg.mediaUrl}
                            controls
                            className="max-w-[280px] rounded-lg"
                        />
                        {msg.content && <p className="text-[12px]">{msg.content}</p>}
                    </div>
                );

            case 'audio':
                return (
                    <div className="flex items-center gap-2 min-w-[200px]">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                            <Mic size={16} className="text-primary" />
                        </div>
                        <audio src={msg.mediaUrl} controls className="h-8 flex-1" />
                    </div>
                );

            case 'document':
                return (
                    <a
                        href={msg.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                            <FileText size={20} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold truncate">{msg.mediaFilename || 'Documento'}</p>
                            <p className="text-[10px] opacity-60">Documento</p>
                        </div>
                        <Download size={18} className="text-primary" />
                    </a>
                );

            default:
                return <p className="whitespace-pre-wrap leading-snug">{msg.content}</p>;
        }
    };

    const filteredLeads = leads.filter(l => {
        const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone.includes(searchTerm);
        const matchesStage = filterStage === 'all' || l.pipelineStageId === filterStage;
        const matchesSource = filterSource === 'all' || l.source === filterSource;
        const matchesAgent = filterAgent === 'all' || (filterAgent === 'unassigned' ? !l.assignedTo : l.assignedTo === filterAgent);

        return matchesSearch && matchesStage && matchesSource && matchesAgent;
    }).sort((a, b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime());

    return (
        <div className="flex h-[calc(98vh-100px)] bg-card-bg border border-border-color dark:border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />

            {/* Left Sidebar: Contacts List */}
            {/* Sidebar - Mobile Toggle */}
            <div className={`${selectedLead ? 'hidden md:flex' : 'flex'} w-full md:w-64 lg:w-72 flex-col border-r border-border-color dark:border-white/5 bg-surface relative z-10`}>
                <div className="p-1.5 bg-surface shrink-0 border-b border-border-color dark:border-white/5 flex justify-between items-center px-3">
                    <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-black border border-border-color text-[10px]">
                        {currentUser?.name.charAt(0)}
                    </div>
                    <div className="flex gap-1.5 text-text-muted">
                        <MessageCircle size={14} className="cursor-pointer hover:text-primary transition-colors" />
                        <MoreVertical size={14} className="cursor-pointer hover:text-primary transition-colors" />
                    </div>
                </div>

                <div className="p-3 space-y-2 shrink-0 relative z-10">
                    <div className="flex gap-2">
                        <div className="relative flex-1 group/search">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted opacity-40 group-focus-within/search:text-primary group-focus-within/search:opacity-100 transition-all" size={13} />
                            <input
                                type="text"
                                placeholder="Buscar chats..."
                                className="w-full bg-input-bg border border-border-color rounded-xl pl-9 pr-4 py-1.5 text-[11px] font-bold text-zinc-300 outline-none focus:border-primary transition-all shadow-inner"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-1.5 rounded-xl border transition-all active:scale-95 ${showFilters ? 'bg-primary/10 border-border-color text-primary shadow-inner shadow-primary/10' : 'bg-input-bg border-border-color text-text-muted hover:bg-black/5'}`}
                        >
                            <Filter size={13} />
                        </button>
                    </div>

                    {/* Advanced Filters Panel */}
                    {showFilters && (
                        <div className="bg-input-bg/30 p-3 rounded-2xl border border-border-color space-y-2 animate-in slide-in-from-top-2 duration-300 shadow-inner">
                            <div className="relative group/select">
                                <select
                                    className="w-full bg-surface border border-border-color rounded-xl px-3 py-1.5 text-[10px] font-bold text-zinc-300 outline-none focus:border-primary shadow-sm appearance-none cursor-pointer pr-8"
                                    value={filterStage}
                                    onChange={e => setFilterStage(e.target.value)}
                                >
                                    <option value="all">Etapa: todas</option>
                                    {pipelineStages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                                <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100" />
                            </div>

                            <div className="relative group/select">
                                <select
                                    className="w-full bg-surface border border-border-color rounded-xl px-3 py-1.5 text-[10px] font-bold text-zinc-300 outline-none focus:border-primary shadow-sm appearance-none cursor-pointer pr-8"
                                    value={filterSource}
                                    onChange={e => setFilterSource(e.target.value)}
                                >
                                    <option value="all">Fuente: todas</option>
                                    {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100" />
                            </div>

                            {currentUser?.role !== 'Agent' && (
                                <div className="relative group/select">
                                    <select
                                        className="w-full bg-surface border border-border-color rounded-xl px-3 py-1.5 text-[10px] font-bold text-zinc-300 outline-none focus:border-primary shadow-sm appearance-none cursor-pointer pr-8"
                                        value={filterAgent}
                                        onChange={e => setFilterAgent(e.target.value)}
                                    >
                                        <option value="all">Asesor: todos</option>
                                        <option value="unassigned">Sin asignar</option>
                                        {users.filter(u => u.role === 'Agent').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                    <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100" />
                                </div>
                            )}

                            <button onClick={() => { setFilterStage('all'); setFilterSource('all'); setFilterAgent('all'); setSearchTerm(''); }} className="w-full text-[10px] font-bold text-text-muted hover:text-primary py-1 transition-colors">
                                Limpiar filtros
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
                    <div className="flex flex-col">
                        {filteredLeads.map(lead => {
                            const stage = pipelineStages.find(s => s.id === lead.pipelineStageId);
                            const isSelected = selectedLead?.id === lead.id;

                            return (
                                <div
                                    key={lead.id}
                                    onClick={() => setSelectedLead(lead)}
                                    className={`flex items-start gap-2 px-3 py-1.5 cursor-pointer transition-all relative border-b border-border-color hover:bg-primary/[0.02] active:scale-[0.99] group ${isSelected ? 'bg-primary/[0.04]' : ''}`}
                                >
                                    {isSelected && <div className="absolute left-0 top-0 w-1 h-full bg-primary shadow-[2px_0_10px_rgba(140,82,255,0.4)]" />}

                                    <div className="relative shrink-0">
                                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-primary font-bold transition-transform group-hover:scale-110 shadow-inner border border-border-color ${isSelected ? 'bg-primary text-white border-transparent shadow-lg shadow-primary/20' : 'bg-primary/5'}`}>
                                            <UserIcon size={14} className="md:size-[16]" />
                                        </div>
                                        {stage && (
                                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-surface bg-green-500 shadow-sm" title={stage.label}></div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 py-0.5">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <h4 className={`font-bold text-[12px] md:text-[13px] truncate pr-2 tracking-tight transition-colors ${isSelected ? 'text-zinc-200' : 'text-zinc-300/80 group-hover:text-zinc-200'}`}>
                                                {lead.name}
                                            </h4>
                                            <span className="text-[9px] md:text-[10px] font-bold text-text-muted opacity-40">
                                                {lead.lastContact ? format(new Date(lead.lastContact), 'HH:mm') : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] md:text-[11px] font-bold text-zinc-400/60 truncate tracking-tight pr-2">
                                                {formatPhone(lead.phone)}
                                            </p>
                                            {stage && (
                                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-lg border tracking-tight transition-all ${isSelected ? 'bg-primary/20 border-border-color text-primary opacity-100' : 'bg-input-bg border-border-color text-text-muted opacity-40 group-hover:opacity-100 group-hover:bg-primary/5 group-hover:border-border-color'}`}>
                                                    {stage.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Area: Chat Window */}
            {selectedLead ? (
                <div className="flex-1 flex flex-col bg-background relative w-full">
                    {/* Helper to go back on mobile */}
                    <div className="md:hidden p-2 border-b border-border-color dark:border-white/5 flex items-center gap-2 bg-surface">
                        <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-input-bg rounded-lg text-zinc-300">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex flex-col">
                            <span className="font-bold text-zinc-300">{selectedLead?.name}</span>
                        </div>
                    </div>
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}></div>

                    {/* Chat Header */}
                    <div className="h-12 md:h-13 border-b border-border-color flex items-center justify-between px-4 md:px-5 bg-surface/80 backdrop-blur-md sticky top-0 z-20">
                        <div className="flex items-center gap-2.5">
                            <div className="relative">
                                <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner border border-border-color">
                                    <UserIcon size={14} />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface bg-green-500 shadow-sm" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-zinc-300 tracking-tight leading-tight">{selectedLead.name}</h3>
                                {isEditingPhone ? (
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-[10px] text-zinc-400">+</span>
                                        <input
                                            type="text"
                                            value={editPhoneValue}
                                            onChange={e => setEditPhoneValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleSavePhone(); if (e.key === 'Escape') setIsEditingPhone(false); }}
                                            className="bg-input-bg border border-primary rounded px-1.5 py-0.5 text-[10px] text-zinc-300 w-28 outline-none"
                                            placeholder="51957100..."
                                            autoFocus
                                        />
                                        <button onClick={handleSavePhone} className="text-green-500 hover:text-green-400">
                                            <Check size={12} />
                                        </button>
                                        <button onClick={() => setIsEditingPhone(false)} className="text-red-400 hover:text-red-300">
                                            <X size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-zinc-400 font-medium leading-tight mb-0.5 flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                                       onClick={() => { setEditPhoneValue(selectedLead.phone); setIsEditingPhone(true); }}
                                       title="Clic para editar el teléfono">
                                        {formatPhone(selectedLead.phone)}
                                        {isLID(selectedLead.phone) && <Edit size={9} className="text-orange-400" />}
                                    </p>
                                )}
                                <p className="text-[9px] text-green-500 font-bold opacity-70 flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                                    En línea
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 md:gap-2">
                            <button className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95 shadow-inner">
                                <Phone size={13} className="md:size-[14]" />
                            </button>
                            <button className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95 shadow-inner">
                                <Video size={13} className="md:size-[14]" />
                            </button>
                            <div className="w-px h-4 bg-primary/10 mx-0.5" />
                            <button className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-lg hover:bg-black/5 text-text-muted transition-all active:scale-95">
                                <MoreVertical size={14} className="md:size-[16]" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto px-4 py-2 md:px-6 md:py-3 space-y-3 relative z-10 custom-scrollbar scroll-smooth">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full opacity-30 select-none">
                                <MessageSquare size={48} className="text-primary mb-4" />
                                <p className="text-[11px] font-bold uppercase tracking-wider">Sin mensajes todavía</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                const isMe = msg.sender === 'agent' || msg.sender === 'bot';
                                return (
                                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-500`}>
                                        <div className={`max-w-[85%] md:max-w-[80%] rounded-xl md:rounded-[1rem] px-2.5 py-1 md:px-3 md:py-1.5 shadow-md transition-all hover:scale-[1.01] relative group/msg text-[12px] ${isMe
                                            ? 'bg-primary text-white dark:bg-primary/20 dark:text-text-main border border-primary/10 dark:border-primary/20 rounded-tr-none shadow-primary/10'
                                            : 'bg-white dark:bg-surface text-text-main border border-border-color dark:border-white/5 rounded-tl-none shadow-sm'
                                            }`}>
                                            {renderMessageContent(msg)}

                                            <div className={`absolute -bottom-5 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity ${isMe ? 'right-0' : 'left-0'}`}>
                                                <span className="text-[9px] font-bold text-text-muted opacity-40">
                                                    {format(new Date(msg.createdAt), 'HH:mm')}
                                                </span>
                                                {isMe && <CheckCheck size={10} className="text-primary opacity-60" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Upload Progress */}
                    {uploadProgress > 0 && (
                        <div className="absolute bottom-20 left-4 right-4 z-20">
                            <div className="bg-surface rounded-lg p-3 shadow-lg border border-border-color dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
                                        <Paperclip size={16} className="text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">Subiendo archivo...</p>
                                        <div className="w-full h-1.5 bg-border-color rounded-full mt-1">
                                            <div
                                                className="h-full bg-primary rounded-full transition-all"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Replies Panel - Floating Compact Design */}
                    {showQuickReplies && (
                        <div className="absolute left-6 bottom-[5.5rem] z-20 flex flex-col bg-card-bg/95 backdrop-blur-md border border-border-color rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5 duration-300 w-[320px] max-h-[350px]">
                            <div className="p-2 border-b border-border-color flex justify-between items-center shrink-0">
                                <h4 className="text-[10px] font-black text-text-muted flex items-center gap-2 uppercase tracking-[0.2em] pl-2">
                                    <Zap size={12} className="text-primary fill-primary/20" />
                                    Plantillas rápidas
                                </h4>
                                <div className="flex gap-0.5">
                                    <button
                                        onClick={() => { setShowQuickReplyModal(true); setShowQuickReplies(false); }}
                                        className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all"
                                    >
                                        <Edit size={14} />
                                    </button>
                                    <button
                                        onClick={() => setShowQuickReplies(false)}
                                        className="p-1.5 hover:bg-danger/10 text-text-muted hover:text-danger rounded-lg"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-y-auto p-2 custom-scrollbar flex-1">
                                {quickReplies.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 opacity-30">
                                        <Zap size={24} className="mb-2" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-center">Sin respuestas</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        {quickReplies.map(qr => (
                                            <button
                                                key={qr.id}
                                                onClick={() => handleUseQuickReply(qr)}
                                                className="w-full text-left p-2 hover:bg-primary/5 rounded-xl transition-all flex items-center gap-2.5 group border border-transparent hover:border-border-color bg-background/30"
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-border-color ${qr.type === 'text' ? 'bg-background text-primary shadow-inner' : 'bg-primary/5 text-primary'}`}>
                                                    {qr.type === 'text' && <MessageSquare size={12} />}
                                                    {qr.type === 'image' && <ImageIcon size={12} />}
                                                    {qr.type === 'video' && <Film size={12} />}
                                                    {qr.type === 'audio' && <Mic size={12} />}
                                                    {qr.type === 'document' && <FileText size={12} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-[12px] text-zinc-300 truncate group-hover:text-primary transition-colors">{qr.name}</span>
                                                        <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black">/{qr.name.toLowerCase().replace(/\s+/g, '')}</span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 truncate italic opacity-70">
                                                        {qr.type === 'text' ? qr.content : (qr.mediaFilename || qr.type)}
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Attachment Menu */}
                    {isAttachmentOpen && (
                        <div className="absolute bottom-[5.5rem] left-14 z-20 animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
                            <div className="bg-surface rounded-2xl p-2 shadow-2xl border border-border-color flex flex-col gap-0.5 min-w-[160px]">
                                <button
                                    onClick={() => { fileInputRef.current?.setAttribute('accept', 'image/*'); fileInputRef.current?.click(); }}
                                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/5 rounded-lg transition-all group/item active:scale-[0.98]"
                                >
                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/10 shadow-inner group-hover/item:scale-110 transition-transform">
                                        <ImageIcon size={16} className="text-primary" />
                                    </div>
                                    <span className="text-[11px] font-bold text-zinc-300">Imagen</span>
                                </button>
                                <button
                                    onClick={() => { fileInputRef.current?.setAttribute('accept', 'video/*'); fileInputRef.current?.click(); }}
                                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/5 rounded-lg transition-all group/item active:scale-[0.98]"
                                >
                                    <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/10 shadow-inner group-hover/item:scale-110 transition-transform">
                                        <Film size={16} className="text-red-500" />
                                    </div>
                                    <span className="text-[11px] font-bold text-zinc-300">Video</span>
                                </button>
                                <button
                                    onClick={() => { fileInputRef.current?.setAttribute('accept', '.pdf,.doc,.docx,.xls,.xlsx,.txt'); fileInputRef.current?.click(); }}
                                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/5 rounded-lg transition-all group/item active:scale-[0.98]"
                                >
                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/10 shadow-inner group-hover/item:scale-110 transition-transform">
                                        <FileText size={16} className="text-primary" />
                                    </div>
                                    <span className="text-[11px] font-bold text-zinc-300">Documento</span>
                                </button>
                                <button
                                    onClick={() => { fileInputRef.current?.setAttribute('accept', 'audio/*'); fileInputRef.current?.click(); }}
                                    className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-primary/5 rounded-lg transition-all group/item active:scale-[0.98]"
                                >
                                    <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center border border-green-500/10 shadow-inner group-hover/item:scale-110 transition-transform">
                                        <Mic size={16} className="text-green-500" />
                                    </div>
                                    <span className="text-[11px] font-bold text-zinc-300">Audio</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Slash Command Menu - Premium Compact List */}
                    {showSlashMenu && filteredQuickReplies.length > 0 && (
                        <div className="absolute bottom-[56px] left-4 z-30 bg-card-bg rounded-2xl shadow-2xl border border-border-color w-72 max-h-[250px] overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 duration-200">
                            <div className="px-3 py-1.5 border-b border-border-color bg-surface flex justify-between items-center">
                                <span className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">Comandos Rápidos</span>
                            </div>
                            <div className="overflow-y-auto custom-scrollbar flex-1">
                                {filteredQuickReplies.map(qr => (
                                    <button
                                        key={qr.id}
                                        onClick={() => handleUseQuickReply(qr)}
                                        className="w-full text-left p-2 hover:bg-primary/5 transition-all flex items-center gap-2 border-b border-border-color last:border-0 group"
                                    >
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-border-color group-hover:border-primary/30 transition-colors ${qr.type === 'text' ? 'bg-background text-primary shadow-inner' : 'bg-primary/5 text-primary'}`}>
                                            {qr.type === 'text' && <MessageSquare size={12} />}
                                            {qr.type === 'image' && <ImageIcon size={12} />}
                                            {qr.type === 'video' && <Film size={12} />}
                                            {qr.type === 'audio' && <Mic size={12} />}
                                            {qr.type === 'document' && <FileText size={12} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex justify-between items-center">
                                                <p className="font-bold text-zinc-300 text-[12px] truncate group-hover:text-primary transition-colors">{qr.name}</p>
                                                <span className="text-[8px] text-primary font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">/{qr.name.toLowerCase().replace(/\s+/g, '')}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input Area - Compact Design */}
                    <div className="p-2.5 md:p-3.5 bg-surface/80 backdrop-blur-md border-t border-border-color flex items-center gap-1.5 md:gap-2.5 shrink-0 relative z-10 lg:px-6 pb-4 md:pb-6">
                        <div className="flex items-center gap-0.5 p-0.5 md:p-1 bg-input-bg/50 border border-border-color rounded-2xl shadow-inner group/actions">
                            <button
                                onClick={() => { setShowQuickReplies(!showQuickReplies); setIsAttachmentOpen(false); }}
                                className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 ${showQuickReplies ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-text-muted hover:text-primary hover:bg-primary/10'}`}
                                title="Plantillas"
                            >
                                <Zap size={16} className={`${showQuickReplies ? 'fill-white' : ''} md:size-[18]`} />
                            </button>
                            <button
                                onClick={() => { setIsAttachmentOpen(!isAttachmentOpen); setShowQuickReplies(false); }}
                                className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 ${isAttachmentOpen ? 'bg-primary text-white shadow-xl shadow-primary/30' : 'text-text-muted hover:text-primary hover:bg-primary/10'}`}
                                title="Adjuntar"
                            >
                                <Paperclip size={16} className="md:size-[18]" />
                            </button>
                        </div>

                        <div className="flex-1 bg-input-bg border border-border-color rounded-2xl md:rounded-[1.5rem] px-2.5 md:px-3.5 py-1 md:py-1.5 transition-all focus-within:border-primary focus-within:shadow-lg focus-within:shadow-primary/5 shadow-inner">
                            <textarea
                                className="w-full bg-transparent text-[12px] md:text-[13px] font-medium text-zinc-300 outline-none resize-none h-8 md:h-10 pt-1 md:pt-1.5 custom-scrollbar"
                                placeholder="Escribe un mensaje..."
                                value={newMessage}
                                onChange={handleMessageChange}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            />
                        </div>

                        <div className="flex items-center">
                            {newMessage.trim() ? (
                                <button
                                    onClick={handleSendMessage}
                                    disabled={isSending}
                                    className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl bg-primary text-white shadow-xl shadow-primary/40 transition-all hover:bg-primary-dark hover:scale-105 active:scale-90 disabled:opacity-50"
                                >
                                    {isSending ? <Loader2 size={18} className="animate-spin md:size-[20]" /> : <Send size={18} className="md:size-[20]" />}
                                </button>
                            ) : (
                                <button
                                    onMouseDown={startRecording}
                                    onMouseUp={stopRecording}
                                    onMouseLeave={stopRecording}
                                    className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl transition-all active:scale-90 shadow-xl ${isRecording ? 'bg-red-500 text-white animate-pulse scale-110 shadow-red-500/40' : 'bg-primary/10 text-primary hover:bg-primary/20 shadow-inner border border-border-color'}`}
                                >
                                    <Mic size={18} className="md:size-[20]" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-surface relative">
                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")' }}></div>
                    <div className="text-center space-y-4 max-w-sm px-6 relative z-10">
                        {appLogo ? (
                            <div className="w-48 h-24 flex items-center justify-center overflow-hidden mx-auto mb-6">
                                <img src={appLogo} alt="Logo" className="max-w-full max-h-full object-contain drop-shadow-lg" />
                            </div>
                        ) : (
                            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-6">
                                <MessageCircle size={48} />
                            </div>
                        )}
                        <h2 className="text-2xl font-bold text-zinc-300">Gestión de Conversaciones</h2>
                        <p className="text-text-muted text-body-main leading-relaxed">
                            Selecciona una conversación para gestionar tus leads en tiempo real y brindar una atención personalizada.
                        </p>
                        <div className="pt-8 border-t border-border-color dark:border-white/5 flex items-center justify-center gap-1.5 text-body-secondary text-text-muted uppercase font-bold tracking-widest">
                            <CheckCircle size={14} className="text-primary" /> Conexión segura y encriptada
                        </div>
                    </div>
                </div>
            )
            }

            {/* Image Preview Modal */}
            {
                previewImage && (
                    <div
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                        onClick={() => setPreviewImage(null)}
                    >
                        <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20">
                            <X size={24} className="text-white" />
                        </button>
                        <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain" />
                    </div>
                )
            }

            {/* Pending File Preview Modal - Compact Square */}
            {
                pendingFile && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="relative w-full max-w-md aspect-square flex flex-col bg-surface rounded-2xl overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">

                            {/* Header */}
                            <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
                                        {pendingFile.type === 'image' && <ImageIcon size={16} className="text-primary" />}
                                        {pendingFile.type === 'video' && <Film size={16} className="text-red-400" />}
                                        {pendingFile.type === 'audio' && <Mic size={16} className="text-green-400" />}
                                        {pendingFile.type === 'document' && <FileText size={16} className="text-primary" />}
                                    </div>
                                    <span className="font-bold text-zinc-300 text-body-main truncate">{pendingFile.type.toUpperCase()}</span>
                                </div>
                                <button
                                    onClick={handleCancelPendingFile}
                                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Preview Content (Main Area) */}
                            <div className="flex-1 bg-black/40 relative flex items-center justify-center overflow-hidden group">
                                {pendingFile.type === 'image' && (
                                    <img
                                        src={pendingFile.preview}
                                        alt="Preview"
                                        className="w-full h-full object-contain"
                                    />
                                )}
                                {pendingFile.type === 'video' && (
                                    <video
                                        src={pendingFile.preview}
                                        controls
                                        className="w-full h-full object-contain"
                                    />
                                )}
                                {pendingFile.type === 'audio' && (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
                                            <Mic size={40} className="text-green-500" />
                                        </div>
                                        <p className="text-body-main font-mono text-text-main">{pendingFile.file?.name || 'Audio de respuesta rápida'}</p>
                                    </div>
                                )}
                                {pendingFile.type === 'document' && (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                                            <FileText size={40} className="text-primary" />
                                        </div>
                                        <p className="text-body-main font-mono text-text-main max-w-[200px] text-center">{pendingFile.file?.name || 'Documento adjunto'}</p>
                                    </div>
                                )}

                                {/* Caption Overlay */}
                                {(pendingFile.type === 'image' || pendingFile.type === 'video') && (
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <input
                                            type="text"
                                            className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/50 outline-none focus:border-primary backdrop-blur-sm"
                                            placeholder="Añadir comentario..."
                                            value={pendingFile.caption}
                                            onChange={e => setPendingFile({ ...pendingFile, caption: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-3 border-t border-white/10 bg-surface shrink-0 flex flex-col gap-2">
                                <p className="text-body-secondary text-center text-text-muted">
                                    ¿Confirmas el envío de este archivo a <strong>{selectedLead?.name}</strong>?
                                </p>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={handleCancelPendingFile}
                                        className="flex-1 py-2.5 text-body-secondary font-bold text-text-muted hover:bg-background rounded-xl transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSendPendingFile}
                                        disabled={isSending}
                                        className="flex-[2] py-2.5 bg-primary hover:bg-primary/90 text-white text-body-secondary font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                    >
                                        {isSending ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={14} />}
                                        Confirmar envío
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Quick Reply Modal - Replaced with Manager */}
            <QuickReplyManager
                isOpen={showQuickReplyModal}
                onClose={() => setShowQuickReplyModal(false)}
                quickReplies={quickReplies}
                onSave={handleQuickReplyManagerSave}
                onDelete={handleDeleteQuickReply}
            />

        </div >
    );
};

export default Conversations;
