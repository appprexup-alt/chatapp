import React, { useState, useRef, useEffect } from 'react';
import { db } from '../services/db';
import { FollowUpConfig, PipelineStage } from '../types';
import {
    Users,
    Send,
    ShoppingBag,
    Plus,
    Save,
    Clock,
    MessageSquare,
    X,
    ToggleLeft,
    ToggleRight,
    Search,
    ChevronDown,
    Zap,
    Image as ImageIcon,
    Video,
    Music,
    FileText,
    Upload,
    Trash2,
    Eye,
    CheckCheck,
    Paperclip,
    Loader2,
    Edit
} from 'lucide-react';
import Campaigns from './Campaigns';
import PostSalesAutomations from './PostSalesAutomations';
import WhatsAppPreview from './WhatsAppPreview';
import { useNotification } from './NotificationContext';

const Automations: React.FC = () => {
    const { addNotification } = useNotification();
    const [activeTab, setActiveTab] = useState<'followup' | 'campaigns' | 'postsales'>('followup');
    const [previewMessage, setPreviewMessage] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentCardId, setCurrentCardId] = useState<string | null>(null);

    const [configs, setConfigs] = useState<FollowUpConfig[]>([]);
    const [stages, setStages] = useState<PipelineStage[]>([]);
    const [selectedStageId, setSelectedStageId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Modal State for Follow-up
    const [showModal, setShowModal] = useState(false);
    const [currentAuto, setCurrentAuto] = useState<Partial<FollowUpConfig>>({
        name: '',
        content: '',
        delay_hours: 24,
        is_active: true,
        media_type: 'none'
    });
    const [uploading, setUploading] = useState(false);

    // Current User
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('inmocrm_user') || 'null');
        setCurrentUser(user);
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedConfigs, fetchedStages] = await Promise.all([
                db.getFollowUpCampaigns(),
                db.getPipeline()
            ]);
            setConfigs(fetchedConfigs);
            setStages(fetchedStages);
            if (fetchedStages.length > 0 && !selectedStageId) {
                setSelectedStageId(fetchedStages[0].id);
            }
        } catch (error) {
            console.error("Error loading automations data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateConfig = (id: string, updates: Partial<FollowUpConfig>) => {
        setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const handleAddConfig = () => {
        if (!selectedStageId) return;
        setCurrentAuto({
            name: '',
            content: 'Hola {{Nombre}}, ¿pudiste revisar la información?',
            pipeline_stage_id: selectedStageId,
            delay_hours: 24,
            media_type: 'none',
            is_active: true
        });
        setShowModal(true);
    };

    const handleEditConfig = (config: FollowUpConfig) => {
        setCurrentAuto(config);
        setShowModal(true);
    };

    const handleRemoveConfig = async (id: string) => {
        if (confirm('¿Eliminar esta configuración?')) {
            if (!id.startsWith('temp-')) {
                await db.deleteFollowUpCampaign(id);
            }
            setConfigs(prev => prev.filter(c => c.id !== id));
            addNotification('Configuración eliminada', 'info');
        }
    };

    const handleSaveAuto = async () => {
        if (!currentAuto.name || !currentAuto.content || !selectedStageId) return;

        setLoading(true);
        try {
            if (currentAuto.id && !currentAuto.id.startsWith('temp-')) {
                await db.updateFollowUpCampaign(currentAuto as FollowUpConfig);
                addNotification('Regla actualizada', 'success');
            } else {
                const { id, ...rest } = currentAuto;
                await db.addFollowUpCampaign({ ...rest, pipeline_stage_id: selectedStageId } as any);
                addNotification('Regla guardada', 'success');
            }
            setShowModal(false);
            loadData();
        } catch (error) {
            addNotification('Error al guardar', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            for (const config of configs) {
                if (config.id.startsWith('temp-')) {
                    const { id, ...rest } = config;
                    await db.addFollowUpCampaign(rest);
                } else {
                    await db.updateFollowUpCampaign(config);
                }
            }
            addNotification('Configuraciones guardadas exitosamente', 'success');
            loadData();
        } catch (error) {
            addNotification('Error al guardar las configuraciones', 'error');
        }
    };

    const insertVariable = (id: string, variable: string) => {
        const config = configs.find(c => c.id === id);
        if (config) {
            handleUpdateConfig(id, { content: config.content + ` {{${variable}}}` });
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploading(true);
            try {
                addNotification('Subiendo archivo...', 'info');
                const url = await db.uploadCampaignMedia(file);
                if (!url) {
                    addNotification('Error al subir el archivo', 'error');
                    return;
                }

                let type: any = 'document';
                if (file.type.startsWith('image/')) type = 'image';
                else if (file.type.startsWith('video/')) type = 'video';
                else if (file.type.startsWith('audio/')) type = 'audio';

                setCurrentAuto(prev => ({
                    ...prev,
                    media_url: url,
                    media_type: type
                }));
                addNotification('Archivo subido correctamente', 'success');
            } catch (error) {
                console.error("Error uploading file:", error);
                addNotification('Error al procesar el archivo', 'error');
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const triggerUpload = (id: string) => {
        setCurrentCardId(id);
        fileInputRef.current?.click();
    };

    const tabs = [
        { id: 'followup', label: 'Seguimiento', icon: Users },
        { id: 'campaigns', label: 'Campañas', icon: Send },
        { id: 'postsales', label: 'Post Venta', icon: ShoppingBag },
    ];

    return (
        <div className="flex flex-col h-full bg-background/50 animate-in fade-in duration-500 overflow-hidden">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Header / Tabs - Standardized & Compact */}
            <div className="bg-card-bg border-b border-border-color pb-0 pt-1 px-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm relative z-[20]">
                <div className="flex items-center gap-3 py-1">
                    <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner border border-primary/20 shrink-0">
                        <Zap size={18} className="fill-primary/20" />
                    </div>
                    <div>
                        <h2 className="text-[14px] font-black text-text-main tracking-tight flex items-center gap-1.5 leading-none">
                            Campañas
                        </h2>
                        <p className="text-[9px] text-text-muted font-bold opacity-50 mt-1">Automatizaciones e ia</p>
                    </div>
                </div>

                <div className="flex bg-background/50 border border-border-color p-1 rounded-xl gap-1 shrink-0 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('followup')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black transition-all active:scale-95 ${activeTab === 'followup' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
                    >
                        <Clock size={14} />
                        Seguimiento
                    </button>
                    <button
                        onClick={() => setActiveTab('campaigns')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black transition-all active:scale-95 ${activeTab === 'campaigns' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
                    >
                        <Send size={14} className={activeTab === 'campaigns' ? 'animate-pulse' : ''} />
                        Difusión
                    </button>
                    <button
                        onClick={() => setActiveTab('postsales')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black transition-all active:scale-95 ${activeTab === 'postsales' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
                    >
                        <ShoppingBag size={14} />
                        Post-venta
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 lg:p-3 bg-background/20 relative">

                {activeTab === 'followup' && (
                    <div className="max-w-7xl mx-auto animate-in slide-in-from-bottom-2 duration-500">
                        {/* Compact Stats Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                            <div className="bg-card-bg border border-border-color p-3 rounded-2xl shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-electric-accent/10 text-electric-accent rounded-xl flex items-center justify-center"><Users size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-text-muted leading-none">Reglas activas</p>
                                        <p className="text-xl font-black text-text-main mt-1 leading-none">{configs.filter(c => c.is_active).length}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-card-bg border border-border-color p-4 rounded-2xl shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center"><Zap size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-text-muted leading-none">Mensajes enviados</p>
                                        <p className="text-xl font-black text-text-main mt-1 leading-none">--</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-card-bg border border-border-color p-4 rounded-2xl shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center"><MessageSquare size={18} /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-text-muted leading-none">Interacciones</p>
                                        <p className="text-xl font-black text-text-main mt-1 leading-none">--</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pipeline Stage Selector - Compact Ribbon */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4 sticky top-0 z-10 bg-background/20 backdrop-blur-md -mx-4 lg:-mx-6 px-4 lg:px-6 py-2 border-b border-border-color/10">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex bg-surface border border-border-color rounded-xl p-1 shadow-inner h-9 overflow-hidden max-w-full">
                                    {stages.map(stage => (
                                        <button
                                            key={stage.id}
                                            onClick={() => setSelectedStageId(stage.id)}
                                            className={`px-3 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-widest transition-all shrink-0 whitespace-nowrap ${selectedStageId === stage.id ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text-main hover:bg-white/5'}`}
                                        >
                                            {stage.label || stage.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    className="h-9 px-4 bg-surface border border-border-color text-text-main hover:bg-background rounded-xl text-[10px] font-black flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all outline-none"
                                >
                                    <Save size={14} />
                                    Guardar
                                </button>
                                {currentUser?.role !== 'Agent' && (
                                    <button
                                        onClick={handleAddConfig}
                                        className="h-9 px-5 bg-primary hover:bg-primary/95 text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all outline-none"
                                    >
                                        <Plus size={16} />
                                        Nueva regla
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {configs.filter(c => c.pipeline_stage_id === selectedStageId).map((config, index) => {
                                const isDays = config.delay_hours >= 24 && config.delay_hours % 24 === 0;
                                const displayValue = isDays ? config.delay_hours / 24 : config.delay_hours;
                                const displayUnit = isDays ? 'días' : 'horas';

                                return (
                                    <div
                                        key={config.id}
                                        className={`bg-card-bg border-2 rounded-[2rem] overflow-hidden transition-all duration-300 flex flex-col group shadow-xl hover:shadow-primary/5 ${config.is_active ? 'border-primary/50' : 'border-border-color grayscale-[0.5] opacity-80'}`}
                                    >
                                        <div className="p-4 border-b border-border-color flex justify-between items-start bg-surface/50">
                                            <div className="flex items-center gap-3 overflow-hidden text-zinc-300">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${config.is_active ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-background text-text-muted'}`}>
                                                    {index + 1}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <h4 className="text-[11px] font-bold text-text-main truncate tracking-tight">{config.name}</h4>
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={10} className="text-text-muted" />
                                                        <span className="text-[9px] font-medium text-text-muted">A los {displayValue} {displayUnit}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {currentUser?.role !== 'Agent' && (
                                                    <button
                                                        onClick={() => handleUpdateConfig(config.id, { is_active: !config.is_active })}
                                                        className={`transition-colors ${config.is_active ? 'text-primary' : 'text-text-muted'}`}
                                                    >
                                                        {config.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="p-3 flex-1">
                                            <p className="text-[10px] text-zinc-300 font-medium italic line-clamp-2 opacity-60">
                                                "{config.content}"
                                            </p>
                                            {config.media_url && (
                                                <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/20 w-fit">
                                                    <Paperclip size={10} />
                                                    Multimedia
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-2.5 bg-background/30 border-t border-border-color flex items-center justify-between">
                                            {currentUser?.role !== 'Agent' ? (
                                                <button
                                                    onClick={() => handleRemoveConfig(config.id)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-danger/10 text-text-muted hover:text-danger rounded-xl transition-all active:scale-90"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            ) : <div />}
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => setPreviewMessage(config)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-primary/10 text-primary rounded-xl transition-all active:scale-90"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                {currentUser?.role !== 'Agent' && (
                                                    <button
                                                        onClick={() => handleEditConfig(config)}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-primary/10 text-primary rounded-xl transition-all active:scale-95 shadow-sm border border-primary/20"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'campaigns' && (
                    <Campaigns />
                )}

                {activeTab === 'postsales' && (
                    <PostSalesAutomations />
                )}

                {/* Premium Seguimiento Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-surface border border-border-color rounded-[2.5rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="p-5 border-b border-border-color flex justify-between items-center bg-surface relative overflow-hidden shrink-0">
                                <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                                <div className="flex gap-3 relative z-10">
                                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-inner">
                                        <Zap size={18} className="text-primary" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="text-base font-bold text-text-main tracking-tight leading-tight">
                                            Regla de seguimiento
                                        </h3>
                                        <p className="text-[10px] text-text-muted font-bold opacity-60">Configura tu estrategia de contacto secuencial</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="w-10 h-10 flex items-center justify-center hover:bg-danger/10 text-text-muted hover:text-danger rounded-full transition-all relative z-10 active:scale-95"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar scroll-smooth">
                                {/* Descriptive Name */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-text-muted pl-1 opacity-70">Nombre de la regla</label>
                                    <input
                                        className="w-full bg-input-bg border border-border-color rounded-2xl px-4 py-2.5 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all tracking-tight"
                                        value={currentAuto.name || ''}
                                        onChange={e => setCurrentAuto({ ...currentAuto, name: e.target.value })}
                                        placeholder="Ej: Seguimiento Día 1"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Delay Amount */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-text-muted pl-1 opacity-70">Demora (Espacio de tiempo)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-input-bg border border-border-color rounded-2xl px-4 py-2.5 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all tracking-tight"
                                            value={currentAuto.delay_hours ? (currentAuto.delay_hours >= 24 && currentAuto.delay_hours % 24 === 0 ? currentAuto.delay_hours / 24 : currentAuto.delay_hours) : ''}
                                            onChange={e => {
                                                const val = Number(e.target.value);
                                                // Determine unit based on current state or assume hours if changing
                                                const isCurrentlyDays = currentAuto.delay_hours ? (currentAuto.delay_hours >= 24 && currentAuto.delay_hours % 24 === 0) : true;
                                                setCurrentAuto({ ...currentAuto, delay_hours: isCurrentlyDays ? val * 24 : val });
                                            }}
                                            placeholder="1"
                                        />
                                    </div>

                                    {/* Delay Unit */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-text-muted pl-1 opacity-70">Unidad</label>
                                        <div className="relative group/select">
                                            <select
                                                className="w-full bg-input-bg border border-border-color rounded-2xl px-4 py-2.5 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer pr-10 transition-all font-sans"
                                                value={currentAuto.delay_hours && currentAuto.delay_hours >= 24 && currentAuto.delay_hours % 24 === 0 ? 'days' : 'hours'}
                                                onChange={e => {
                                                    const unit = e.target.value;
                                                    const currentVal = currentAuto.delay_hours ? (currentAuto.delay_hours >= 24 && currentAuto.delay_hours % 24 === 0 ? currentAuto.delay_hours / 24 : currentAuto.delay_hours) : 24;
                                                    setCurrentAuto({ ...currentAuto, delay_hours: unit === 'days' ? currentVal * 24 : currentVal });
                                                }}
                                            >
                                                <option value="hours">Horas</option>
                                                <option value="days">Días</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover/select:text-primary transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                {/* Message Body */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-bold text-text-muted opacity-70">Mensaje personalizado</label>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const textarea = document.getElementById('followup-content') as HTMLTextAreaElement;
                                                    if (textarea) {
                                                        const start = textarea.selectionStart;
                                                        const end = textarea.selectionEnd;
                                                        const text = currentAuto.content || '';
                                                        const before = text.substring(0, start);
                                                        const after = text.substring(end);
                                                        setCurrentAuto({ ...currentAuto, content: before + ' {{Nombre}} ' + after });
                                                    }
                                                }}
                                                className="bg-primary/10 text-primary hover:bg-primary/20 text-[9px] font-bold px-2 py-1 rounded-xl border border-border-color transition-all active:scale-95"
                                            >
                                                + Nombre
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-input-bg border border-border-color rounded-2xl p-4 shadow-inner min-h-[100px] flex flex-col focus-within:border-primary/40 transition-all">
                                        <textarea
                                            id="followup-content"
                                            className="w-full bg-transparent text-[11px] font-bold text-text-main outline-none resize-none flex-1 custom-scrollbar leading-relaxed placeholder:opacity-30"
                                            value={currentAuto.content || ''}
                                            onChange={e => setCurrentAuto({ ...currentAuto, content: e.target.value })}
                                            placeholder="Ej: Hola {{Nombre}}, ¿viste la info?..."
                                        />
                                        <div className="pt-2 flex justify-end">
                                            <span className="text-[9px] font-bold text-text-muted opacity-40">{currentAuto.content?.length || 0} carac.</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Multimedia / Adjuntar - Matching Reference Image */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-text-muted pl-1 opacity-70">Adjuntar</label>
                                    {!currentAuto.media_url ? (
                                        <div className="grid grid-cols-4 gap-2">
                                            <button onClick={() => triggerUpload('audio' as any)} className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-border-color bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-text-muted group shadow-sm active:scale-95">
                                                <Music size={16} className="opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all mb-1" />
                                                <span className="text-[9px] font-bold uppercase tracking-tighter opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all">Audio</span>
                                            </button>
                                            <button onClick={() => triggerUpload('image' as any)} className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-border-color bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-text-muted group shadow-sm active:scale-95">
                                                <ImageIcon size={16} className="opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all mb-1" />
                                                <span className="text-[9px] font-bold uppercase tracking-tighter opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all">Imagen</span>
                                            </button>
                                            <button onClick={() => triggerUpload('video' as any)} className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-border-color bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-text-muted group shadow-sm active:scale-95">
                                                <Video size={16} className="opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all mb-1" />
                                                <span className="text-[9px] font-bold uppercase tracking-tighter opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all">Video</span>
                                            </button>
                                            <button onClick={() => triggerUpload('document' as any)} className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-border-color bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-text-muted group shadow-sm active:scale-95">
                                                <FileText size={16} className="opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all mb-1" />
                                                <span className="text-[9px] font-bold uppercase tracking-tighter opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all">Doc</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 rounded-2xl border border-primary/20 bg-primary/5 animate-in slide-in-from-top-1 shadow-inner group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
                                                    {currentAuto.media_type === 'image' && <ImageIcon size={14} />}
                                                    {currentAuto.media_type === 'video' && <Video size={14} />}
                                                    {currentAuto.media_type === 'audio' && <Music size={14} />}
                                                    {currentAuto.media_type === 'document' && <FileText size={14} />}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <span className="text-[11px] font-bold text-text-main truncate block">Archivo adjunto listo</span>
                                                    <span className="text-[9px] font-bold text-text-muted opacity-60">Se enviará como {currentAuto.media_type}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setCurrentAuto({ ...currentAuto, media_url: undefined, media_type: 'none' })}
                                                className="p-2 hover:bg-danger text-text-muted hover:text-white rounded-xl transition-all active:scale-95"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-5 border-t border-border-color bg-surface flex justify-between items-center gap-4 shrink-0 relative overflow-hidden">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-2.5 text-[11px] font-bold text-text-muted hover:text-text-main transition-all active:scale-95"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveAuto}
                                    disabled={loading || !currentAuto.name || !currentAuto.content}
                                    className="bg-primary hover:bg-primary/95 text-white px-6 py-3 rounded-2xl text-[11px] font-bold shadow-xl shadow-primary/20 flex items-center gap-2 disabled:opacity-40 active:scale-95 transition-all"
                                >
                                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    {currentAuto.id && !currentAuto.id.startsWith('temp-') ? 'Actualizar regla' : 'Guardar regla'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* WhatsApp Preview Modal */}
                <WhatsAppPreview
                    isOpen={!!previewMessage}
                    onClose={() => setPreviewMessage(null)}
                    content={previewMessage?.content.replace('{{Nombre}}', 'Juan') || ''}
                    mediaUrl={previewMessage?.media_url}
                    mediaType={previewMessage?.media_type}
                />
            </div>
        </div>
    );
};

export default Automations;
