import React, { useState, useEffect, useRef } from 'react';
import {
    Send,
    Edit,
    Copy,
    Eye,
    ChevronRight,
    Plus,
    Trash2,
    Play,
    Pause,
    Calendar,
    Clock,
    Filter,
    Search,
    ChevronLeft,
    MoreVertical,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Users,
    MessageSquare,
    Image as ImageIcon,
    Video,
    Music,
    FileText,
    X,
    Paperclip,
    Upload,
    CheckCheck,
    Save,
    Loader2,
    Target
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { evolutionService } from '../services/evolutionService';
import { Campaign, Lead, PipelineStage } from '../types';
import { db } from '../services/db';
import { format } from 'date-fns';
import { replaceVariables, insertVariableAtCursor } from '../utils/textUtils';
import { es } from 'date-fns/locale';
import WhatsAppPreview from './WhatsAppPreview';
import CustomModal from './CustomModal';
import { useNotification } from './NotificationContext';

interface CampaignsProps { }

/**
 * Campaigns Component
 * Manages creation, listing, and execution of WhatsApp mass sending campaigns.
 */
const Campaigns: React.FC<CampaignsProps> = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
    const [previewMessage, setPreviewMessage] = useState<any | null>(null);

    // Campaign Builder State
    const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
        title: '',
        description: '',
        content: '',
        mediaType: 'text',
        filters: { tags: [], status: [], pipelineStageId: [] },
        delaySeconds: 5, // Default delay
        status: 'draft'
    });
    const [currentStep, setCurrentStep] = useState(1); // 1: Info, 2: Message, 3: Audience, 4: Review
    const [audienceCount, setAudienceCount] = useState(0);

    // Sending Logic State
    const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
    const [sendingProgress, setSendingProgress] = useState<{ sent: number; failed: number; total: number }>({ sent: 0, failed: 0, total: 0 });
    const [isSending, setIsSending] = useState(false);
    const sendingRef = useRef<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const { addNotification } = useNotification();

    // Custom Modal State
    const [alertConfig, setAlertConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'confirm' | 'alert' | 'danger' | 'success' | 'info';
        onConfirm?: () => void;
    }>({ isOpen: false, title: '', message: '', type: 'alert' });

    const showAlert = (title: string, message: string, type: any = 'alert', onConfirm?: () => void) => {
        setAlertConfig({ isOpen: true, title, message, type, onConfirm });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploading(true);
            try {
                const url = await db.uploadCampaignMedia(file);
                if (url) {
                    let type: Campaign['mediaType'] = 'document';
                    if (file.type.startsWith('image/')) type = 'image';
                    else if (file.type.startsWith('video/')) type = 'video';
                    else if (file.type.startsWith('audio/')) type = 'audio';

                    setNewCampaign(prev => ({ ...prev, mediaUrl: url, mediaType: type, mediaFilename: file.name }));
                } else {
                    showAlert("Error", "No se pudo subir el archivo.", "alert");
                }
            } catch (error) {
                console.error("Upload error:", error);
                showAlert("Error", "Error al procesar el archivo multimedia.", "danger");
            } finally {
                setUploading(false);
            }
        }
    };

    useEffect(() => {
        loadData();
        // Cleanup sending on unmount
        return () => { sendingRef.current = false; };
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedCampaigns, fetchedLeads, fetchedStages] = await Promise.all([
                db.getCampaigns(),
                db.getLeads(),
                db.getPipeline()
            ]);
            setCampaigns(fetchedCampaigns);
            setLeads(fetchedLeads);
            setPipelineStages(fetchedStages);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateAudience = (filters: any) => {
        let filtered = leads;

        if (filters.tags && filters.tags.length > 0) {
            filtered = filtered.filter(l => l.tags && l.tags.some(t => filters.tags.includes(t)));
        }

        if (filters.pipelineStageId && filters.pipelineStageId.length > 0) {
            filtered = filtered.filter(l => filters.pipelineStageId.includes(l.pipelineStageId || l.status));
        }

        return filtered.length;
    };

    useEffect(() => {
        if (showModal) {
            setAudienceCount(calculateAudience(newCampaign.filters || {}));
        }
    }, [newCampaign.filters, leads, showModal]);


    const handleCreateCampaign = async () => {
        if (!newCampaign.title || !newCampaign.content) return;

        setLoading(true);
        const campaignToSave = {
            ...newCampaign,
            stats: editingCampaignId ? newCampaign.stats : { sent: 0, failed: 0, total: audienceCount }
        };

        let res;
        if (editingCampaignId) {
            campaignToSave.id = editingCampaignId;
            res = await db.updateCampaign(campaignToSave as any);
        } else {
            res = await db.addCampaign(campaignToSave as any);
        }

        if (res.success) {
            loadData();
            setShowModal(false);
            resetForm();
            addNotification({ title: 'Éxito', message: 'Campaña guardada correctamente', type: 'success' });
        } else {
            showAlert("Error", "Error al guardar la campaña: " + res.message, "danger");
        }
        setLoading(false);
    };

    const resetForm = () => {
        setNewCampaign({
            title: '',
            description: '',
            content: '',
            mediaType: 'text',
            filters: { tags: [], status: [], pipelineStageId: [] },
            delaySeconds: 5,
            status: 'draft'
        });
        setCurrentStep(1);
        setEditingCampaignId(null);
    };

    const handleEdit = (campaign: Campaign) => {
        setNewCampaign({
            ...campaign
        });
        setEditingCampaignId(campaign.id);
        setCurrentStep(1);
        setShowModal(true);
    };

    const handleReuse = (campaign: Campaign) => {
        setNewCampaign({
            ...campaign,
            title: `${campaign.title} (Copia)`,
            status: 'draft',
            id: undefined,
            stats: { sent: 0, failed: 0, total: 0 }
        });
        setEditingCampaignId(null); // Create new
        setCurrentStep(1);
        setShowModal(true);
    };

    // --- SENDING LOGIC ---
    const startCampaign = async (campaign: Campaign) => {
        if (isSending && activeCampaignId !== campaign.id) {
            showAlert("Sistema ocupado", "Ya hay una campaña enviándose. Espere a que termine o págusela.", "info");
            return;
        }

        const storedUser = localStorage.getItem('inmocrm_user');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        const isConnected = await evolutionService.checkConnection(currentUser?.organizationId || '');
        if (!isConnected) {
            showAlert("Sin conexión", "Error de conexión: No se pudo contactar con el servidor de WhatsApp. Revisa tus integraciones.", "danger");
            return;
        }

        let targetLeads = leads;
        if (campaign.filters.tags && campaign.filters.tags.length > 0) {
            targetLeads = targetLeads.filter(l => l.tags && l.tags.some(t => campaign.filters.tags!.includes(t)));
        }
        if (campaign.filters.pipelineStageId && campaign.filters.pipelineStageId.length > 0) {
            targetLeads = targetLeads.filter(l => campaign.filters.pipelineStageId!.includes(l.pipelineStageId || l.status));
        }


        showAlert(
            "¿Iniciar envío?",
            `¿Estás seguro de iniciar el envío masivo a ${targetLeads.length} contactos? Esta acción no se puede deshacer una vez iniciada.`,
            "confirm",
            async () => {
                setActiveCampaignId(campaign.id);
                setIsSending(true);
                sendingRef.current = true;
                setSendingProgress({ sent: 0, failed: 0, total: targetLeads.length });

                await db.updateCampaign({ id: campaign.id, status: 'sending' });
                processQueue(campaign, targetLeads);
            }
        );
    };

    const processQueue = async (campaign: Campaign, targetLeads: Lead[]) => {
        let sentCount = 0;
        let failedCount = 0;

        for (const lead of targetLeads) {
            if (!sendingRef.current) break;

            try {
                const personalisedContent = replaceVariables(campaign.content, lead);

                if (campaign.mediaType === 'text') {
                    await evolutionService.sendText(campaign.organizationId, lead.phone, personalisedContent);
                } else {
                    if (campaign.mediaType === 'image' || campaign.mediaType === 'video') {
                        await evolutionService.sendMedia(campaign.organizationId, lead.phone, campaign.mediaUrl || '', campaign.mediaType, personalisedContent);
                    } else if (campaign.mediaType === 'audio') {
                        await evolutionService.sendAudio(campaign.organizationId, lead.phone, campaign.mediaUrl || '');
                    } else if (campaign.mediaType === 'document') {
                        await evolutionService.sendDocument(campaign.organizationId, lead.phone, campaign.mediaUrl || '', campaign.mediaFilename || 'Documento');
                    }
                }

                await db.addCampaignLog({
                    campaignId: campaign.id,
                    leadId: lead.id,
                    status: 'sent',
                    errorMessage: ''
                });
                sentCount++;
            } catch (error: any) {
                console.error(`Failed to send to ${lead.phone}:`, error);
                await db.addCampaignLog({
                    campaignId: campaign.id,
                    leadId: lead.id,
                    status: 'failed',
                    errorMessage: error.message || 'Error desconocido'
                });
                failedCount++;
            }

            setSendingProgress({ sent: sentCount, failed: failedCount, total: targetLeads.length });
            await new Promise(resolve => setTimeout(resolve, (campaign.delaySeconds || 5) * 1000));
        }

        setIsSending(false);
        sendingRef.current = false;
        setActiveCampaignId(null);

        await db.updateCampaign({
            id: campaign.id,
            status: 'completed',
            stats: { sent: sentCount, failed: failedCount, total: targetLeads.length }
        });

        loadData();
        showAlert("¡Envío completado!", "La campaña ha finalizado con éxito. Revisa las estadísticas en el panel.", "success");
    };

    const pauseCampaign = async (campaignId: string) => {
        sendingRef.current = false;
        setIsSending(false);
        await db.updateCampaign({ id: campaignId, status: 'paused' });
        loadData();
    };

    const handleDelete = async (id: string) => {
        showAlert(
            "¿Eliminar campaña?",
            "Esta acción eliminará permanentemente la campaña y todos sus registros de envío. ¿Deseas continuar?",
            "danger",
            async () => {
                await db.deleteCampaign(id);
                loadData();
                addNotification({ title: 'Eliminado', message: 'Campaña eliminada permanentemente', type: 'info' });
            }
        );
    }

    const allTags = Array.from(new Set(leads.flatMap(l => l.tags || [])));

    return (
        <div className="space-y-2">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-surface p-2 md:p-3 rounded-2xl border border-border-color shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-inner">
                        <Send size={20} className="text-primary" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-text-main tracking-tight">
                            Campañas masivas
                        </h3>
                        <p className="text-[10px] text-text-muted font-medium mt-0.5 opacity-60">Envíos directos a tu audiencia filtrada</p>
                    </div>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="bg-primary hover:bg-primary/95 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all text-xs font-bold shadow-lg shadow-primary/40 hover:scale-105 active:scale-95"
                >
                    <Plus size={18} />
                    Nueva campaña
                </button>
            </div>

            {/* Campaign Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {campaigns.length === 0 ? (
                    <div className="col-span-full p-12 border-2 border-dashed border-border-color rounded-2xl flex flex-col items-center justify-center text-text-muted opacity-50">
                        <Send size={40} className="mb-4" />
                        <p className="text-xs font-bold">No hay campañas activas</p>
                    </div>
                ) : (
                    campaigns.map(campaign => (
                        <div key={campaign.id} className="bg-card-bg border border-border-color rounded-2xl flex flex-col gap-0 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
                            {/* Card Accent Line */}
                            {campaign.status !== 'draft' && <div className="h-1 w-full bg-primary" />}

                            <div className="p-2 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex items-center gap-2 mb-1 overflow-hidden">
                                            <h4 className="font-bold text-xs text-text-main tracking-tight truncate">{campaign.title}</h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1.5 font-bold leading-none shrink-0 ${campaign.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                                campaign.status === 'sending' ? 'bg-primary/10 text-primary animate-pulse' :
                                                    campaign.status === 'draft' ? 'bg-text-muted/10 text-text-muted' :
                                                        'bg-amber-500/10 text-amber-500'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${campaign.status === 'completed' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' :
                                                    campaign.status === 'sending' ? 'bg-primary shadow-[0_0_8px_var(--primary-glow)]' :
                                                        campaign.status === 'draft' ? 'bg-text-muted' :
                                                            'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                                                    }`} />
                                                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-text-muted line-clamp-1 font-medium tracking-tight opacity-60 italic">{campaign.description || 'Sin descripción'}</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleDelete(campaign.id)} className="p-1.5 hover:bg-danger/10 text-text-muted hover:text-danger rounded-lg transition-colors">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Progress & Stats */}
                                <div className="space-y-1 bg-input-bg border border-border-color p-2 rounded-xl shadow-inner group-hover:border-primary/30 transition-colors">
                                    <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                                        <span className="text-text-muted">Progreso: {campaign.stats.sent + campaign.stats.failed} / {campaign.stats.total}</span>
                                        <span className="text-primary font-mono">{Math.round(((campaign.stats.sent + campaign.stats.failed) / (campaign.stats.total || 1)) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border-color/10">
                                        <div
                                            className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(140,82,255,0.4)]"
                                            style={{ width: `${((campaign.stats.sent + campaign.stats.failed) / (campaign.stats.total || 1)) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-medium pt-1 opacity-80">
                                        <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10} /> {campaign.stats.sent} ok</span>
                                        <span className="text-rose-500 flex items-center gap-1"><AlertCircle size={10} /> {campaign.stats.failed} err</span>
                                        <span className="text-text-muted flex items-center gap-1"><Users size={10} /> {campaign.stats.total} total</span>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-[10px] text-text-muted font-medium flex items-center gap-2 opacity-80">
                                        <Clock size={12} className="text-primary" />
                                        {format(new Date(campaign.createdAt), 'dd MMMM, HH:mm', { locale: es })}
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleReuse(campaign)} className="w-9 h-9 flex items-center justify-center bg-surface border border-border-color hover:border-primary text-text-muted hover:text-primary rounded-xl transition-all shadow-sm active:scale-90" title="Clonar">
                                            <Copy size={14} />
                                        </button>
                                        <button onClick={() => handleEdit(campaign)} className="w-9 h-9 flex items-center justify-center bg-surface border border-border-color hover:border-primary text-text-muted hover:text-primary rounded-xl transition-all shadow-sm active:scale-90" title="Editar">
                                            <Edit size={14} />
                                        </button>
                                        <button onClick={() => setPreviewMessage(campaign)} className="w-9 h-9 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-all shadow-sm active:scale-90 border border-border-color" title="Vista previa">
                                            <Eye size={14} />
                                        </button>

                                        {campaign.status === 'draft' && (
                                            <button onClick={() => startCampaign(campaign)} className="w-9 h-9 flex items-center justify-center bg-primary text-white hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all" title="Iniciar">
                                                <Play size={12} fill="currentColor" />
                                            </button>
                                        )}
                                        {campaign.status === 'sending' && (
                                            <button onClick={() => pauseCampaign(campaign.id)} className="w-9 h-9 flex items-center justify-center bg-amber-500 text-white hover:bg-amber-600 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all" title="Pausar">
                                                <Pause size={12} fill="currentColor" />
                                            </button>
                                        )}
                                        {campaign.status === 'paused' && (
                                            <button onClick={() => startCampaign(campaign)} className="w-9 h-9 flex items-center justify-center bg-primary text-white hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all" title="Reanudar">
                                                <Play size={12} fill="currentColor" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* New Campaign Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-card-bg border border-border-color rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                            {/* Modal Header */}
                            <div className="p-5 border-b border-border-color flex justify-between items-center bg-surface relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                                <div className="relative z-10">
                                    <h3 className="font-bold text-lg text-text-main tracking-tight flex items-center gap-2">
                                        <Target size={22} className="text-primary" />
                                        {editingCampaignId ? 'Editar campaña' : 'Nueva campaña'}
                                    </h3>
                                    <p className="text-[10px] text-text-muted font-medium opacity-60 mt-0.5">Estrategia de difusión masiva</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center hover:bg-danger/10 text-text-muted hover:text-danger rounded-full transition-all relative z-10"><X size={20} /></button>
                            </div>

                            {/* Steps Indicator */}
                            <div className="flex border-b border-border-color bg-background/30 p-1 lg:px-4">
                                {[
                                    { id: 1, label: 'Básico' },
                                    { id: 2, label: 'Mensaje' },
                                    { id: 3, label: 'Público' },
                                    { id: 4, label: 'Revisión' }
                                ].map(step => (
                                    <div key={step.id} className={`flex-1 py-1.5 text-center transition-all relative ${currentStep >= step.id ? 'text-primary' : 'text-text-muted'}`}>
                                        <span className={`text-[8px] font-black uppercase tracking-[0.15em] ${currentStep === step.id ? 'opacity-100' : 'opacity-40'}`}>{step.label}</span>
                                        {currentStep === step.id && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/40 mx-2 rounded-full" />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar scroll-smooth">

                                {currentStep === 1 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-text-muted pl-1 opacity-70">Identificador de la campaña</label>
                                            <input
                                                className="w-full bg-surface border border-border-color rounded-2xl px-4 py-3 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all tracking-tight"
                                                value={newCampaign.title}
                                                onChange={e => setNewCampaign({ ...newCampaign, title: e.target.value })}
                                                placeholder="Ej: Seguimiento lotes premium"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-text-muted pl-1 opacity-70">Descripción estratégica</label>
                                            <textarea
                                                className="w-full bg-surface border border-border-color rounded-2xl px-4 py-3 text-xs font-medium text-text-main outline-none focus:border-primary h-28 resize-none shadow-inner leading-relaxed tracking-tight"
                                                value={newCampaign.description}
                                                onChange={e => setNewCampaign({ ...newCampaign, description: e.target.value })}
                                                placeholder="Detalla el objetivo de esta campaña..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-bold text-text-muted opacity-70">Plantilla dinámica</label>
                                                <div className="flex gap-1.5 overflow-x-auto max-w-[60%] no-scrollbar">
                                                    {['Nombre', 'Telefono', 'Email'].map(v => (
                                                        <button
                                                            key={v}
                                                            onClick={() => {
                                                                const textarea = document.getElementById('campaign-content') as HTMLTextAreaElement;
                                                                if (textarea) insertVariableAtCursor(`{{${v}}}`, textarea, (txt) => setNewCampaign({ ...newCampaign, content: txt }));
                                                            }}
                                                            className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold rounded-lg transition-all shadow-sm active:scale-95 whitespace-nowrap hover:bg-primary hover:text-white"
                                                        >
                                                            + {v}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <textarea
                                                id="campaign-content"
                                                className="w-full h-44 bg-input-bg border border-border-color rounded-2xl px-4 py-4 text-xs font-medium text-text-main outline-none focus:border-primary resize-none shadow-inner leading-relaxed"
                                                value={newCampaign.content}
                                                onChange={e => setNewCampaign({ ...newCampaign, content: e.target.value })}
                                                placeholder="Hola {{Nombre}}, ¿cómo estás?..."
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-text-muted pl-1 opacity-70">Multimedia opcional</label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="flex gap-2 p-2 bg-input-bg border border-border-color rounded-xl shadow-inner h-14 items-center">
                                                    <div className="p-2 bg-background rounded-lg border border-border-color text-text-muted">
                                                        <Paperclip size={16} />
                                                    </div>
                                                    <select
                                                        className="flex-1 bg-transparent text-xs font-black uppercase text-text-main outline-none cursor-pointer"
                                                        value={newCampaign.mediaType}
                                                        onChange={e => setNewCampaign({ ...newCampaign, mediaType: e.target.value as any })}
                                                    >
                                                        <option value="text">Solo Texto</option>
                                                        <option value="image">Imagen</option>
                                                        <option value="video">Video</option>
                                                        <option value="audio">Audio</option>
                                                        <option value="document">Documento</option>
                                                    </select>
                                                </div>

                                                <div className="relative group h-14">
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        ref={fileInputRef}
                                                        onChange={handleFileSelect}
                                                    />
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={newCampaign.mediaType === 'text'}
                                                        className={`w-full h-full border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-all ${newCampaign.mediaType === 'text' ? 'opacity-30 cursor-not-allowed border-border-color' :
                                                            newCampaign.mediaUrl ? 'bg-primary/5 border-primary text-primary' : 'hover:border-primary hover:text-primary border-border-color text-text-muted'
                                                            }`}
                                                    >
                                                        {uploading ? <Loader2 size={16} className="animate-spin" /> : (
                                                            <>
                                                                {newCampaign.mediaUrl ? <div className="flex items-center gap-2 overflow-hidden px-4"><ImageIcon size={16} /><span className="text-[10px] font-black uppercase truncate">{newCampaign.mediaFilename || 'Cambiar Archivo'}</span></div> : <><Upload size={16} /><span className="text-[9px] font-black uppercase tracking-widest">Subir Archivo</span></>}
                                                            </>
                                                        )}
                                                    </button>
                                                    {newCampaign.mediaUrl && (
                                                        <button
                                                            onClick={() => setNewCampaign({ ...newCampaign, mediaUrl: '', mediaType: 'text' })}
                                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 3 && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 flex justify-between items-center relative overflow-hidden group">
                                            <div className="relative z-10">
                                                <h4 className="text-xs font-bold text-primary mb-1">Alcance estimado</h4>
                                                <p className="text-[11px] font-medium text-text-muted opacity-70">Leads impactados por esta configuración</p>
                                            </div>
                                            <div className="text-5xl font-bold text-primary relative z-10 font-mono tracking-tighter">{audienceCount}</div>
                                        </div>

                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-text-muted pl-1 opacity-70">Filtrar por etiquetas (Tags)</label>
                                                <div className="flex flex-wrap gap-2 p-4 bg-input-bg border border-border-color rounded-2xl shadow-inner min-h-[100px]">
                                                    {allTags.map(tag => (
                                                        <button
                                                            key={tag}
                                                            onClick={() => {
                                                                const currentTags = newCampaign.filters?.tags || [];
                                                                const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
                                                                setNewCampaign({ ...newCampaign, filters: { ...newCampaign.filters, tags: newTags } });
                                                            }}
                                                            className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-all ${newCampaign.filters?.tags?.includes(tag) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface text-text-muted border-border-color hover:border-primary'
                                                                }`}
                                                        >
                                                            # {tag}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-text-muted pl-1 opacity-70">Filtro por embudo (Pipeline)</label>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {pipelineStages.map(stage => (
                                                        <button
                                                            key={stage.id}
                                                            onClick={() => {
                                                                const currentStages = newCampaign.filters?.pipelineStageId || [];
                                                                const newStages = currentStages.includes(stage.id) ? currentStages.filter(s => s !== stage.id) : [...currentStages, stage.id];
                                                                setNewCampaign({ ...newCampaign, filters: { ...newCampaign.filters, pipelineStageId: newStages } });
                                                            }}
                                                            className={`px-3 py-3 rounded-xl text-[9px] font-black border transition-all uppercase text-center tracking-tight ${newCampaign.filters?.pipelineStageId?.includes(stage.id) ? 'bg-primary/10 text-primary border-primary shadow-sm' : 'bg-surface text-text-muted border-border-color hover:bg-primary/5'
                                                                }`}
                                                        >
                                                            {stage.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 4 && (
                                    <div className="flex flex-col md:flex-row gap-6 h-full animate-in slide-in-from-right-4 duration-300">
                                        <div className="flex-1 space-y-6">
                                            <div className="space-y-2 bg-surface p-5 rounded-3xl border border-border-color shadow-sm">
                                                <label className="text-[9px] uppercase font-black text-text-muted tracking-[0.2em] block pl-1 opacity-60">Delay de Protección</label>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="number"
                                                        className="w-20 bg-input-bg border border-border-color rounded-xl px-3 py-3 font-black text-sm text-primary text-center shadow-inner outline-none focus:border-primary"
                                                        value={newCampaign.delaySeconds}
                                                        onChange={e => setNewCampaign({ ...newCampaign, delaySeconds: Number(e.target.value) })}
                                                        min={1}
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-black text-text-main uppercase tracking-tight">Segundos por lead</p>
                                                        <p className="text-[8px] text-text-muted uppercase font-bold opacity-40">Evita el SPAM score de WhatsApp</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-6 bg-input-bg/40 border border-border-color rounded-3xl space-y-4 shadow-inner">
                                                <h4 className="font-black text-[9px] text-text-main uppercase tracking-[0.3em] pb-3 border-b border-border-color/50 opacity-60 text-center">Checkout de Configuración</h4>
                                                <div className="space-y-3">
                                                    <div className="flex justify-between text-[10px] uppercase font-black tracking-tight">
                                                        <span className="text-text-muted opacity-60">Título:</span>
                                                        <span className="text-text-main truncate max-w-[150px]">{newCampaign.title}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] uppercase font-black tracking-tight">
                                                        <span className="text-text-muted opacity-60">Alcance:</span>
                                                        <span className="text-primary">{audienceCount} Personas</span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] uppercase font-black tracking-tight">
                                                        <span className="text-text-muted opacity-60">Filtros:</span>
                                                        <span className="text-text-main">{(newCampaign.filters?.tags?.length || 0) + (newCampaign.filters?.pipelineStageId?.length || 0)} Activos</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3 items-start">
                                                <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                                                <p className="text-[9px] text-text-muted leading-relaxed uppercase font-bold">Asegúrate de tener una conexión activa antes de iniciar. Los mensajes se envían de forma automática.</p>
                                            </div>
                                        </div>

                                        <div className="w-full md:w-[260px] shrink-0">
                                            <div className="relative group cursor-pointer" onClick={() => setPreviewMessage(newCampaign)}>
                                                <h4 className="text-[10px] font-black text-text-main uppercase tracking-widest mb-3 pl-1">Preview WhatsApp</h4>
                                                <div className="bg-[#E5DDD5] dark:bg-slate-800 rounded-3xl p-3 border-4 border-slate-700 shadow-xl overflow-hidden h-[300px] relative pointer-events-none opacity-90 group-hover:scale-[1.02] transition-transform">
                                                    <div className="bg-[#075E54] h-8 -mx-3 -mt-3 mb-3 flex items-center px-3 gap-2">
                                                        <div className="w-4 h-4 rounded-full bg-white/20" />
                                                        <div className="w-16 h-2 rounded-full bg-white/20" />
                                                    </div>
                                                    <div className="bg-white dark:bg-[#056162] rounded-lg p-2 shadow-sm text-[10px] max-w-[85%] ml-auto">
                                                        {newCampaign.mediaUrl && (
                                                            <div className="w-full aspect-video bg-black/10 rounded mb-1 flex items-center justify-center">
                                                                <ImageIcon size={20} className="text-text-muted opacity-30" />
                                                            </div>
                                                        )}
                                                        <p className="line-clamp-6 leading-tight">{newCampaign.content || 'Sin mensaje...'}</p>
                                                        <div className="flex justify-end gap-0.5 mt-1 opacity-40">
                                                            <span className="text-[7px]">12:00</span>
                                                            <CheckCheck size={8} />
                                                        </div>
                                                    </div>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 flex items-center justify-center">
                                                        <div className="bg-white/90 p-2 rounded-full text-slate-900 shadow-xl">
                                                            <Eye size={20} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 border-t border-border-color flex justify-between bg-surface relative overflow-hidden">
                                <button
                                    onClick={() => currentStep > 1 && setCurrentStep(prev => prev - 1)}
                                    className={`px-8 py-2.5 rounded-2xl text-xs font-bold transition-all ${currentStep === 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-input-bg text-text-muted'}`}
                                >
                                    Atrás
                                </button>

                                <div className="flex gap-2">
                                    {currentStep < 4 ? (
                                        <button
                                            onClick={() => setCurrentStep(prev => prev + 1)}
                                            className="bg-primary hover:bg-primary/95 text-white px-10 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Siguiente
                                            <ChevronRight size={16} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleCreateCampaign}
                                            className="bg-green-600 hover:bg-green-700 text-white px-10 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-green-500/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                                            disabled={loading}
                                        >
                                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} />}
                                            {editingCampaignId ? 'Actualizar' : 'Lanzar campaña'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Shared Preview Modal */}
            <WhatsAppPreview
                isOpen={!!previewMessage}
                onClose={() => setPreviewMessage(null)}
                content={previewMessage?.content.replace('{{Nombre}}', 'Impacto') || ''}
                mediaUrl={previewMessage?.mediaUrl}
                mediaType={previewMessage?.mediaType}
                mediaName={previewMessage?.mediaFilename || previewMessage?.mediaName}
            />

            <CustomModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                onConfirm={() => {
                    alertConfig.onConfirm?.();
                    setAlertConfig({ ...alertConfig, isOpen: false });
                }}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />

        </div >
    );
};

export default Campaigns;
