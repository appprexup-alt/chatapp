import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { ClientAutomation, PipelineStage, FinancialClient } from '../types';
import {
    Plus,
    Trash2,
    Edit,
    Save,
    X,
    Clock,
    Calendar,
    MessageSquare,
    Image as ImageIcon,
    Video,
    FileText,
    CheckCircle,
    AlertCircle,
    Eye,
    ToggleLeft,
    ToggleRight,
    Zap,
    ChevronDown,
    Search,
    Paperclip,
    Music,
    Upload,
    Loader2,
    ShoppingBag,
    User,
    Users
} from 'lucide-react';
import { insertVariableAtCursor } from '../utils/textUtils';
import WhatsAppPreview from './WhatsAppPreview';

interface PostSalesAutomationsProps {
    // No props needed as it manages its own state from DB
}

const PostSalesAutomations: React.FC<PostSalesAutomationsProps> = () => {
    const [automations, setAutomations] = useState<ClientAutomation[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [previewMessage, setPreviewMessage] = useState<any | null>(null);
    const [currentAuto, setCurrentAuto] = useState<Partial<ClientAutomation & { lastSentAt?: string }>>({
        trigger_type: 'birthday',
        content: '',
        is_active: true,
        time_to_send: '10:00:00',
        media_type: 'none'
    });

    const [birthdayClients, setBirthdayClients] = useState<(FinancialClient & { projectName?: string; lastSentAt?: string })[]>([]);
    const [allFinancialClients, setAllFinancialClients] = useState<(FinancialClient & { projectName?: string; lastSentAt?: string })[]>([]);
    const [showAllClients, setShowAllClients] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showClientModal, setShowClientModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Partial<FinancialClient> | null>(null);

    useEffect(() => {
        loadAutomations();
        loadBirthdayClients();
    }, []);

    const loadAutomations = async () => {
        setLoading(true);
        const data = await db.getClientAutomations();
        setAutomations(data);
        setLoading(false);
    };

    const loadBirthdayClients = async () => {
        const birthdayData = await db.getBirthdayClients();
        setBirthdayClients(birthdayData);

        // Also load all for comparison/debugging if needed
        const allData = await db.getFinancialClients();
        // Map allData to include projectName for consistency if possible
        setAllFinancialClients(allData as any);
    };

    const handleToggleAutomation = async (clientId: string, currentStatus: boolean) => {
        const nextStatus = !currentStatus;
        const result = await db.updateFinancialClientAutomation(clientId, nextStatus);
        if (result.success) {
            setBirthdayClients(prev => prev.map(c => c.id === clientId ? { ...c, automationEnabled: nextStatus } : c));
        } else {
            alert('Error al actualizar el estado de automatización');
        }
    };



    const handleSaveClient = async () => {
        if (!editingClient || !editingClient.id) return;
        setLoading(true);
        console.log('[PostSales] Updating client:', editingClient);

        const res = await db.updateFinancialClient(editingClient);

        if (res.success) {
            setShowClientModal(false);
            loadBirthdayClients();
        } else {
            alert('Error al guardar: ' + res.message);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!currentAuto.name || !currentAuto.content) {
            alert('Por favor completa el nombre y el contenido del mensaje');
            return;
        }

        setLoading(true);
        console.log('[PostSales] Saving automation:', currentAuto);
        let result;
        if (currentAuto.id) {
            result = await db.updateClientAutomation(currentAuto);
        } else {
            result = await db.addClientAutomation(currentAuto);
        }

        if (result.success) {
            setShowModal(false);
            loadAutomations();
        } else {
            console.error('[PostSales] Save error:', result.message);
            alert('Error al guardar la regla: ' + result.message);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Eliminar esta automatización?')) {
            await db.deleteClientAutomation(id);
            loadAutomations();
        }
    };

    const toggleActive = async (auto: ClientAutomation) => {
        const updated = { ...auto, is_active: !auto.is_active };
        await db.updateClientAutomation(updated);
        loadAutomations();
    };

    const openEdit = (auto: ClientAutomation) => {
        setCurrentAuto(auto);
        setShowModal(true);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setUploading(true);

        try {
            const url = await db.uploadCampaignMedia(file);
            if (url) {
                let type: 'image' | 'video' | 'audio' | 'document' = 'document';
                if (file.type.startsWith('image/')) type = 'image';
                else if (file.type.startsWith('video/')) type = 'video';
                else if (file.type.startsWith('audio/')) type = 'audio';

                setCurrentAuto(prev => ({
                    ...prev,
                    media_url: url,
                    media_type: type,
                    media_name: file.name
                }));
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Error al subir archivo');
        } finally {
            setUploading(false);
        }
    };

    const openNew = () => {
        setCurrentAuto({
            name: 'Saludo de Cumpleaños',
            trigger_type: 'birthday',
            content: '¡Feliz Cumpleaños {{Nombre}}! 🎉\nEsperamos que tengas un día increíble.\n\nSaludos,\n{{Empresa}}',
            is_active: true,
            time_to_send: '10:00:00',
            media_type: 'none'
        });
        setShowModal(true);
    };

    const displayClients = showAllClients ? allFinancialClients : birthdayClients;

    const filteredBirthdays = displayClients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery) ||
        (c.projectName && c.projectName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-4 flex flex-col h-[calc(100vh-100px)]">
            {/* Dashboard Header */}
            <div className="flex flex-col gap-1 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl shadow-primary/5">
                        <ShoppingBag size={24} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-text-main tracking-tight leading-none mb-1">Impacto post-venta</h2>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-text-muted opacity-60">
                            <span>Relaciones directas</span>
                            <div className="w-1 h-1 rounded-full bg-primary" />
                            <span>Automatización inteligente</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-10">
                {/* Automation Rules Grid */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <Zap size={18} />
                            </div>
                            <div>
                                <h4 className="text-[13px] font-bold text-text-main tracking-tight">Reglas activas</h4>
                                <p className="text-[9px] text-text-muted font-bold opacity-40 italic">Inyectando confianza vía WhatsApp</p>
                            </div>
                        </div>
                        <button
                            onClick={openNew}
                            className="group flex items-center gap-2 bg-primary/10 hover:bg-primary text-primary hover:text-white px-4 py-2 rounded-xl text-[10px] font-bold transition-all active:scale-95 shadow-lg shadow-primary/5"
                        >
                            <Plus size={14} className="transition-transform group-hover:rotate-90 duration-300" />
                            Nueva regla
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {automations.map(auto => (
                            <div
                                key={auto.id}
                                className="relative bg-surface/40 backdrop-blur-md border border-border-color rounded-[2rem] p-5 flex flex-col gap-5 hover:border-primary/40 transition-all group overflow-hidden shadow-2xl hover:shadow-primary/5"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                    <MessageSquare size={60} />
                                </div>

                                <div className="flex justify-between items-start relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                        <Calendar size={18} />
                                    </div>
                                    <button
                                        onClick={() => toggleActive(auto)}
                                        className={`w-12 h-6 rounded-full p-1 transition-all ${auto.is_active ? 'bg-primary' : 'bg-white/10'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white transition-all shadow-md ${auto.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </button>
                                </div>

                                <div className="space-y-2 relative z-10">
                                    <h5 className="text-[15px] font-bold text-text-main tracking-tight group-hover:text-primary transition-colors leading-tight">{auto.name}</h5>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted">
                                            <Clock size={12} className="text-primary" />
                                            <span>{auto.time_to_send?.slice(0, 5)}</span>
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-border-color" />
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted">
                                            <Zap size={12} className="text-primary" />
                                            <span className="capitalize">{auto.trigger_type}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/[0.02] border border-border-color p-4 rounded-2xl italic text-[11px] text-text-muted leading-relaxed font-medium relative z-10 min-h-[80px]">
                                    "{auto.content}"
                                </div>

                                <div className="flex items-center justify-between pt-5 border-t border-border-color mt-auto relative z-10">
                                    <div className="flex flex-col gap-0.5 text-left">
                                        <span className="text-[8px] font-bold text-text-muted opacity-40">Último envío</span>
                                        <span className="text-[10px] font-bold text-text-main tracking-tight">
                                            {auto.lastSentAt ? new Date(auto.lastSentAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Historial vacío'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={() => handleDelete(auto.id)} className="w-8 h-8 flex items-center justify-center hover:bg-danger/10 text-white/20 hover:text-danger rounded-lg transition-all">
                                            <Trash2 size={14} />
                                        </button>
                                        <button onClick={() => openEdit(auto)} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 text-white/20 hover:text-text-main rounded-lg transition-all">
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => setPreviewMessage({ ...auto, mediaUrl: auto.media_url, mediaType: auto.media_type, mediaName: auto.media_name })}
                                            className="w-9 h-9 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all shadow-lg shadow-primary/5 border border-primary/20"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {automations.length === 0 && (
                            <div className="col-span-full py-16 text-center border-2 border-dashed border-border-color rounded-[2.5rem] bg-white/[0.02] flex flex-col items-center justify-center">
                                <div className="w-16 h-16 rounded-3xl bg-surface border border-border-color flex items-center justify-center text-white/10 mb-4 shadow-2xl">
                                    <Zap size={32} />
                                </div>
                                <p className="text-[11px] font-bold text-text-muted opacity-30">No hay reglas de fidelización activas</p>
                                <button onClick={openNew} className="mt-6 text-[11px] text-primary font-bold hover:scale-105 transition-transform px-6 py-2 border border-primary/20 rounded-xl bg-primary/5">Inyectar mi primera regla</button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Birthday List Section */}
                <section className="space-y-4 pb-20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xl shadow-primary/5">
                                <Calendar size={20} />
                            </div>
                            <div>
                                <h4 className="text-[15px] font-bold text-text-main tracking-tight">Agenda de cumpleaños</h4>
                                <p className="text-[10px] text-text-muted font-bold opacity-40">
                                    {showAllClients ? 'Todos los clientes registrados' : 'Planificación mensual'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-1 justify-end max-w-xl">
                            <button
                                onClick={() => setShowAllClients(!showAllClients)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all border ${showAllClients
                                    ? 'bg-primary/20 border-primary text-primary'
                                    : 'bg-white/[0.02] border-primary/10 text-text-muted hover:border-primary/20'
                                    }`}
                            >
                                {showAllClients ? 'Ver solo mes actual' : 'Ver todos los clientes'}
                            </button>
                            <div className="relative group/search flex-1">
                                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-primary transition-colors" />
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Buscar cliente..."
                                    className="w-full bg-surface/30 border border-border-color rounded-xl pl-10 pr-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/40 focus:bg-surface/50 transition-all shadow-2xl backdrop-blur-xl"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface/30 backdrop-blur-xl border border-border-color rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border-color">
                                        <th className="px-6 py-4 text-[9px] font-bold text-text-muted opacity-40">Cliente / Proyecto</th>
                                        <th className="px-6 py-4 text-[9px] font-bold text-text-muted opacity-40">WhatsApp</th>
                                        <th className="px-6 py-4 text-[9px] font-bold text-text-muted opacity-40">Fecha nac.</th>
                                        <th className="px-6 py-4 text-[9px] font-bold text-text-muted opacity-40">Historial</th>
                                        <th className="px-6 py-4 text-[9px] font-bold text-text-muted opacity-40 text-right">Emisión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredBirthdays.map(client => (
                                        <tr key={client.id} className="hover:bg-primary/5 transition-all group/row">
                                            <td className="px-6 py-3.5">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-text-main tracking-tight group-hover/row:text-primary transition-colors">{client.name}</span>
                                                    <span className="text-[9px] font-bold text-text-muted/60 flex items-center gap-1.5 italic">
                                                        <ShoppingBag size={8} className="text-primary/40" />
                                                        {client.projectName || 'Sin proyecto'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-text-muted/80 tracking-tight">
                                                    <div className="w-1 h-1 rounded-full bg-green-500/50" />
                                                    {client.phone}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-[11px] font-bold text-text-main tracking-tighter opacity-80">
                                                {client.birthDate ? new Date(client.birthDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : 'No definida'}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-bold text-text-muted opacity-30">Última captura</span>
                                                    <span className="text-[9px] font-bold text-text-muted/80 tracking-tight">
                                                        {client.lastSentAt ? new Date(client.lastSentAt).toLocaleDateString() : 'Pendiente'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setEditingClient(client);
                                                            setShowClientModal(true);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/20 hover:text-text-main rounded-xl transition-all active:scale-90"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleAutomation(client.id, !!client.automationEnabled)}
                                                        className={`flex flex-col items-end gap-1 group/toggle transition-all`}
                                                    >
                                                        <span className={`text-[8px] font-bold ${client.automationEnabled ? 'text-primary' : 'text-text-muted/40'}`}>
                                                            {client.automationEnabled ? 'Activo' : 'Pausado'}
                                                        </span>
                                                        <div className={`w-10 h-5 rounded-full p-1 transition-all ${client.automationEnabled ? 'bg-primary' : 'bg-white/10'}`}>
                                                            <div className={`w-3.5 h-3.5 rounded-full bg-white transition-all shadow-md ${client.automationEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                                        </div>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredBirthdays.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-[11px] font-bold text-text-muted opacity-30 italic">
                                                {searchQuery ? 'Cero coincidencias en el radar' : (showAllClients ? 'No hay clientes registrados en el sistema' : 'Sin registros para este ciclo mensual')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div >

            {/* Client Edit Modal - Premium Redesign ("Limpio") */}
            {
                showClientModal && editingClient && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-surface border border-border-color rounded-3xl w-full max-w-lg shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh]">
                            {/* Header Section */}
                            <div className="p-5 border-b border-border-color flex justify-between items-center bg-white/[0.02] relative shrink-0">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xl shadow-primary/5">
                                        <ShoppingBag size={20} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="text-[15px] font-bold text-text-main tracking-tight leading-tight">
                                            Editar perfil del cliente
                                        </h3>
                                        <p className="text-[9px] text-text-muted font-bold opacity-40">Gestión de datos y post-venta</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowClientModal(false)} className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all active:scale-95">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content Area - Optimized Space */}
                            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar bg-surface/30">
                                {/* GRUPO 1: IDENTIDAD */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                            <CheckCircle size={12} />
                                        </div>
                                        <span className="text-[10px] font-bold text-primary">Identidad y registro</span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-text-muted/40 pl-1 leading-none">Nombre completo</label>
                                            <input
                                                className="w-full bg-white/[0.03] border border-border-color focus:border-primary/30 rounded-xl px-4 py-2.5 text-xs font-bold text-text-main outline-none focus:bg-white/[0.05] transition-all shadow-inner tracking-tight placeholder:opacity-20"
                                                placeholder="Nombre y Apellidos del cliente"
                                                value={editingClient.name || ''}
                                                onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-text-muted/40 pl-1 leading-none">Documento</label>
                                                <input
                                                    className="w-full bg-white/[0.03] border border-border-color focus:border-primary/30 rounded-xl px-4 py-2.5 text-xs font-bold text-text-main outline-none focus:bg-white/[0.05] transition-all shadow-inner tracking-tight font-mono"
                                                    placeholder="DNI / RUC"
                                                    value={editingClient.document || ''}
                                                    onChange={e => setEditingClient({ ...editingClient, document: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-text-muted/40 pl-1 leading-none">Nacimiento</label>
                                                <input
                                                    type="date"
                                                    className="w-full bg-white/[0.03] border border-border-color focus:border-primary/30 rounded-xl px-4 py-2.5 text-xs font-bold text-text-main outline-none focus:bg-white/[0.05] transition-all shadow-inner [color-scheme:dark]"
                                                    value={editingClient.birthDate || ''}
                                                    onChange={e => setEditingClient({ ...editingClient, birthDate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* GRUPO 2: CONTACTO Y UBICACIÓN */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-5 h-5 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                                            <MessageSquare size={12} />
                                        </div>
                                        <span className="text-[10px] font-bold text-amber-500">Contacto y ubicación</span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-text-muted/40 pl-1 leading-none">WhatsApp</label>
                                                <div className="relative">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary opacity-20"><Plus size={10} /></div>
                                                    <input
                                                        className="w-full bg-white/[0.03] border border-border-color focus:border-primary/30 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-text-main outline-none focus:bg-white/[0.05] transition-all shadow-inner"
                                                        placeholder="519..."
                                                        value={editingClient.phone || ''}
                                                        onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-text-muted/40 pl-1 leading-none">Profesión</label>
                                                <input
                                                    className="w-full bg-white/[0.03] border border-border-color focus:border-primary/30 rounded-xl px-4 py-2.5 text-xs font-bold text-text-main outline-none focus:bg-white/[0.05] transition-all shadow-inner"
                                                    placeholder="Ocupación"
                                                    value={editingClient.occupation || ''}
                                                    onChange={e => setEditingClient({ ...editingClient, occupation: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-bold text-text-muted/40 pl-1 leading-none">Dirección de domicilio</label>
                                            <input
                                                className="w-full bg-white/[0.03] border border-border-color focus:border-primary/30 rounded-xl px-4 py-2.5 text-xs font-bold text-text-main outline-none focus:bg-white/[0.05] transition-all shadow-inner"
                                                placeholder="Ej: Av. Principal 123..."
                                                value={editingClient.address || ''}
                                                onChange={e => setEditingClient({ ...editingClient, address: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* GRUPO 3: PERFIL FAMILIAR */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                            <CheckCircle size={12} />
                                        </div>
                                        <span className="text-[10px] font-bold text-primary">Perfil familiar</span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-bold text-text-muted/40 pl-1 leading-none">Estado civil</label>
                                                <div className="relative group/select">
                                                    <select
                                                        className="w-full bg-white/[0.03] border border-border-color focus:border-primary/30 rounded-xl px-4 py-2.5 text-xs font-bold text-text-main outline-none appearance-none cursor-pointer transition-all"
                                                        value={editingClient.civilStatus || 'Soltero'}
                                                        onChange={e => setEditingClient({ ...editingClient, civilStatus: e.target.value as any })}
                                                    >
                                                        <option value="Soltero">Soltero/a</option>
                                                        <option value="Casado">Casado/a</option>
                                                        <option value="Divorciado">Divorciado/a</option>
                                                        <option value="Viudo">Viudo/a</option>
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white/[0.03] border border-border-color rounded-xl px-4 py-2 shadow-inner">
                                                <button
                                                    onClick={() => setEditingClient({ ...editingClient, hasChildren: !editingClient.hasChildren })}
                                                    className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${editingClient.hasChildren ? 'bg-primary' : 'bg-white/10'}`}
                                                >
                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editingClient.hasChildren ? 'left-6' : 'left-1'}`} />
                                                </button>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-text-main tracking-tight leading-none mb-0.5">Hijos</span>
                                                    <span className="text-[8px] text-text-muted font-bold opacity-40 leading-none">Post-venta</span>
                                                </div>
                                            </div>
                                        </div>

                                        {editingClient.civilStatus === 'Casado' && (
                                            <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl space-y-3 animate-in zoom-in-95 duration-200">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary"><User size={10} /></div>
                                                    <span className="text-[9px] font-bold text-primary leading-none">Cónyuge</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-bold text-primary/40 pl-1 leading-none">Nombre</label>
                                                        <input
                                                            className="w-full bg-white/[0.03] border border-border-color focus:border-primary/20 rounded-lg px-3 py-2 text-[10px] font-bold text-text-main outline-none transition-all"
                                                            value={editingClient.spouseName || ''}
                                                            onChange={e => setEditingClient({ ...editingClient, spouseName: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-bold text-primary/40 pl-1 leading-none">Documento</label>
                                                        <input
                                                            className="w-full bg-white/[0.03] border border-border-color focus:border-primary/20 rounded-lg px-3 py-2 text-[10px] font-bold text-text-main outline-none transition-all font-mono"
                                                            value={editingClient.spouseDocument || ''}
                                                            onChange={e => setEditingClient({ ...editingClient, spouseDocument: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer - Sincronizar Action */}
                            <div className="p-5 border-t border-border-color flex justify-between items-center bg-white/[0.02] shrink-0">
                                <button onClick={() => setShowClientModal(false)} className="text-[10px] font-bold text-text-muted hover:text-text-main transition-all">
                                    Descartar
                                </button>
                                <button
                                    onClick={handleSaveClient}
                                    className="bg-primary hover:bg-primary/95 text-white px-8 py-3.5 rounded-2xl text-[10px] font-bold shadow-2xl shadow-primary/20 flex items-center gap-2.5 active:scale-95 transition-all"
                                >
                                    <Save size={16} />
                                    Sincronizar captura
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {
                showModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-surface border border-border-color rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 shadow-primary/10">
                            {/* Modal Header */}
                            <div className="p-4 border-b border-border-color flex justify-between items-center bg-white/[0.02] relative shrink-0">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                                <div className="flex gap-3 relative z-10">
                                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-xl shadow-primary/5">
                                        <Zap size={18} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="text-[14px] font-bold text-text-main tracking-tight leading-none mb-1">
                                            Núcleo de automatización
                                        </h3>
                                        <p className="text-[8px] text-text-muted font-bold opacity-40 leading-none">Regla maestra de fidelización</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-danger/10 text-white/20 hover:text-danger rounded-xl transition-all relative z-10 active:scale-95"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar scroll-smooth bg-surface/30">
                                {/* Descriptive Name */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-primary pl-1">Nombre de la regla</label>
                                    <input
                                        className="w-full bg-white/[0.03] border border-border-color rounded-xl px-5 py-2 text-xs font-bold text-text-main outline-none focus:border-primary/50 focus:bg-white/[0.05] shadow-inner transition-all tracking-tight placeholder:opacity-20"
                                        value={currentAuto.name || ''}
                                        onChange={e => setCurrentAuto({ ...currentAuto, name: e.target.value })}
                                        placeholder="Ej: Saludo de Fidelización"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Event Type */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-primary pl-1">Motor de disparo</label>
                                        <div className="relative group/select">
                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary opacity-40">
                                                <Calendar size={13} />
                                            </div>
                                            <select
                                                className="w-full bg-white/[0.03] border border-border-color rounded-xl pl-12 pr-10 py-2 text-xs font-bold text-text-main outline-none focus:border-primary/50 appearance-none cursor-pointer transition-all shadow-inner"
                                                value={currentAuto.trigger_type}
                                                onChange={e => setCurrentAuto({ ...currentAuto, trigger_type: e.target.value as any })}
                                            >
                                                <option value="birthday">Cumpleaños</option>
                                            </select>
                                            <ChevronDown size={13} className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-hover/select:text-primary transition-colors" />
                                        </div>
                                    </div>

                                    {/* Scheduled Time */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-primary pl-1">Ventana horaria</label>
                                        <div className="flex items-center bg-white/[0.03] border border-border-color rounded-xl px-5 py-2 shadow-inner focus-within:border-primary/50 transition-all">
                                            <div className="flex items-center gap-1.5">
                                                <div className="bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                                                    <input
                                                        type="text"
                                                        maxLength={2}
                                                        className="w-5 bg-transparent text-[11px] font-bold text-primary outline-none text-center font-mono"
                                                        value={currentAuto.time_to_send?.split(':')[0] ?? ''}
                                                        placeholder="10"
                                                        onChange={e => {
                                                            let h = e.target.value.replace(/\D/g, '').slice(0, 2);
                                                            if (h && parseInt(h) > 23) h = '23';
                                                            const m = currentAuto.time_to_send?.split(':')[1] || '00';
                                                            const s = currentAuto.time_to_send?.split(':')[2] || '00';
                                                            setCurrentAuto({ ...currentAuto, time_to_send: `${h}:${m}:${s}` });
                                                        }}
                                                        onBlur={() => {
                                                            let [h, m, s] = (currentAuto.time_to_send || '10:00:00').split(':');
                                                            if (!h) h = '10';
                                                            if (!m) m = '00';
                                                            if (!s) s = '00';
                                                            setCurrentAuto({ ...currentAuto, time_to_send: `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}` });
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-primary font-bold">:</span>
                                                <div className="bg-primary/5 px-2 py-0.5 rounded-lg border border-border-color">
                                                    <input
                                                        type="text"
                                                        maxLength={2}
                                                        className="w-5 bg-transparent text-[11px] font-bold text-primary/70 outline-none text-center font-mono"
                                                        value={currentAuto.time_to_send?.split(':')[1] ?? ''}
                                                        placeholder="00"
                                                        onChange={e => {
                                                            const m = e.target.value.replace(/\D/g, '').slice(0, 2);
                                                            const h = currentAuto.time_to_send?.split(':')[0] || '10';
                                                            const s = currentAuto.time_to_send?.split(':')[2] || '00';
                                                            setCurrentAuto({ ...currentAuto, time_to_send: `${h}:${m}:${s}` });
                                                        }}
                                                        onBlur={() => {
                                                            let [h, m, s] = (currentAuto.time_to_send || '10:00:00').split(':');
                                                            if (!h) h = '10';
                                                            if (!m) m = '00';
                                                            if (!s) s = '00';
                                                            setCurrentAuto({ ...currentAuto, time_to_send: `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${s.padStart(2, '0')}` });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="ml-auto w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Clock size={12} className="text-primary" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Last Sent Info */}
                                {currentAuto.lastSentAt && (
                                    <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex items-center justify-between shadow-xl shadow-primary/5 backdrop-blur-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                                                <Zap size={16} className="animate-pulse" />
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-bold text-primary block leading-none mb-1 opacity-60">Historial reciente</span>
                                                <span className="text-[11px] font-bold text-text-main block tracking-tight">
                                                    Capturado el {new Date(currentAuto.lastSentAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                                            <span className="text-[8px] font-bold text-green-500">Inyectado</span>
                                        </div>
                                    </div>
                                )}

                                {/* Multimedia */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-primary pl-1">Captura multimedia (opcional)</label>
                                    <div className="relative group h-12">
                                        <input
                                            type="file"
                                            className="hidden"
                                            id="postsale-file"
                                            onChange={handleFileSelect}
                                        />
                                        <button
                                            onClick={() => document.getElementById('postsale-file')?.click()}
                                            className={`w-full h-full border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-all shadow-inner group ${currentAuto.media_url
                                                ? 'bg-primary/5 border-primary/30 text-primary'
                                                : 'border-border-color hover:border-primary/30 hover:bg-primary/5 text-text-muted hover:text-primary'
                                                }`}
                                        >
                                            {uploading ? <Loader2 size={16} className="animate-spin text-primary" /> : (
                                                <>
                                                    {currentAuto.media_url ? (
                                                        <div className="flex items-center gap-2 overflow-hidden px-4">
                                                            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
                                                                <Upload size={12} />
                                                            </div>
                                                            <div className="text-left overflow-hidden">
                                                                <span className="text-[10px] font-bold text-text-main truncate block tracking-tight">{currentAuto.media_name || 'Archivo adjunto'}</span>
                                                                <span className="text-[7px] font-bold text-text-muted block opacity-40 italic">Click para actualizar</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/20 group-hover:text-primary transition-colors">
                                                                <Upload size={12} />
                                                            </div>
                                                            <span className="text-[9px] font-bold text-text-muted opacity-40 group-hover:opacity-100 transition-opacity">Vincular recurso visual</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </button>
                                        {currentAuto.media_url && !uploading && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentAuto({ ...currentAuto, media_url: '', media_type: 'text', media_name: '' });
                                                }}
                                                className="absolute -top-2 -right-2 w-8 h-8 bg-danger text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all z-10 border-4 border-surface"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Message Body */}
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[9px] font-bold text-primary">Cuerpo del mensaje</label>
                                        <button
                                            onClick={() => {
                                                const textarea = document.getElementById('post-sale-content') as HTMLTextAreaElement;
                                                if (textarea) insertVariableAtCursor('{{Nombre}}', textarea, (txt) => setCurrentAuto({ ...currentAuto, content: txt }));
                                            }}
                                            className="bg-primary/5 text-primary hover:bg-primary hover:text-white text-[9px] font-bold px-3 py-1 rounded-lg border border-primary/10 transition-all"
                                        >
                                            + Variable
                                        </button>
                                    </div>
                                    <div className="bg-white/[0.03] border border-border-color rounded-2xl p-3 shadow-inner min-h-[90px] flex flex-col focus-within:border-primary/30 transition-all bg-surface/50">
                                        <textarea
                                            id="post-sale-content"
                                            className="w-full bg-transparent text-[12px] font-bold text-text-main outline-none resize-none flex-1 custom-scrollbar leading-relaxed placeholder:opacity-20 scroll-smooth"
                                            value={currentAuto.content || ''}
                                            onChange={e => setCurrentAuto({ ...currentAuto, content: e.target.value })}
                                            placeholder="¡Hola {{Nombre}}!..."
                                        />
                                        <div className="pt-1 flex justify-end border-t border-border-color mt-1">
                                            <span className="text-[7px] font-bold text-text-muted opacity-30">{currentAuto.content?.length || 0} carácteres</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-border-color bg-white/[0.02] flex justify-between items-center gap-3 shrink-0">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-[10px] font-bold text-text-muted hover:text-text-main transition-all"
                                >
                                    Cancelar
                                </button>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPreviewMessage({ ...currentAuto, mediaUrl: currentAuto.media_url, mediaType: currentAuto.media_type, mediaName: currentAuto.media_name })}
                                        className="flex items-center gap-2 text-[10px] font-bold text-primary bg-primary/10 px-4 py-2.5 rounded-xl transition-all border border-primary/20 hover:bg-primary hover:text-white"
                                    >
                                        <Eye size={14} />
                                        Previsualizar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading || !currentAuto.name || !currentAuto.content}
                                        className="bg-primary hover:bg-primary/95 text-white px-6 py-2.5 rounded-xl text-[10px] font-bold shadow-2xl shadow-primary/20 flex items-center gap-2 disabled:opacity-40 active:scale-95 transition-all"
                                    >
                                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        Sincronizar regla
                                    </button>
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
                content={previewMessage?.content.replace('{{Nombre}}', 'Juan') || ''}
                mediaUrl={previewMessage?.mediaUrl}
                mediaType={previewMessage?.mediaType}
                mediaName={previewMessage?.mediaName}
            />
        </div >
    );
};

export default PostSalesAutomations;
