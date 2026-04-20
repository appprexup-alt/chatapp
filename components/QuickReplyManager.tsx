import React, { useState, useRef, useEffect } from 'react';
import {
    X,
    Search,
    Plus,
    MessageCircle,
    Image as ImageIcon,
    Mic,
    Video,
    FileText,
    Trash2,
    Edit,
    ChevronLeft,
    Save,
    UploadCloud,
    Zap,
    Eye,
    ChevronDown,
    Paperclip,
    Music,
    Upload,
    Loader2,
    CheckCircle2,
    MessageSquare
} from 'lucide-react';
import { QuickReply, MediaType } from '../types';
import CustomModal from './CustomModal';
import WhatsAppPreview from './WhatsAppPreview';

interface QuickReplyManagerProps {
    isOpen: boolean;
    onClose: () => void;
    quickReplies: QuickReply[];
    onSave: (reply: Partial<QuickReply>, file?: File) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export default function QuickReplyManager({ isOpen, onClose, quickReplies, onSave, onDelete }: QuickReplyManagerProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState<Partial<QuickReply>>({
        name: '',
        type: 'text',
        content: ''
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [previewMessage, setPreviewMessage] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'confirm' | 'alert' | 'danger' | 'success' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    useEffect(() => {
        if (isOpen) {
            setViewMode('list');
            setSearchTerm('');
            setIsCreating(false);
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setFormData({ name: '', type: 'text', content: '' });
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const handleEdit = (qr: QuickReply) => {
        setFormData(qr);
        setPreviewUrl(qr.mediaUrl || null);
        setSelectedFile(null);
        setViewMode('form');
        setIsCreating(false);
    };

    const handleCreate = () => {
        setFormData({ name: '', type: 'text', content: '' });
        setSelectedFile(null);
        setPreviewUrl(null);
        setIsCreating(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleSubmit = async () => {
        if (!formData.name) return;

        setConfirmModal({
            isOpen: true,
            title: '¿Guardar Cambios?',
            message: '¿Estás seguro de que deseas guardar esta respuesta rápida?',
            type: 'info',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                setIsSubmitting(true);
                try {
                    await onSave(formData, selectedFile || undefined);
                    setViewMode('list');
                    setIsCreating(false);
                    resetForm();
                } catch (error) {
                    console.error("Error saving quick reply:", error);
                } finally {
                    setIsSubmitting(false);
                }
            }
        });
    };

    const handleDeleteClick = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            title: '¿Eliminar Respuesta?',
            message: 'Esta acción no se puede deshacer. ¿Deseas continuar?',
            type: 'danger',
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                await onDelete(id);
            }
        });
    };

    const handleRemoveFile = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFile(null);
        setPreviewUrl(null);
        setFormData(prev => ({ ...prev, mediaUrl: undefined, mediaFilename: undefined }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const filteredReplies = quickReplies.filter(qr =>
        qr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        qr.content?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTypeIcon = (type: MediaType) => {
        switch (type) {
            case 'image': return <ImageIcon size={18} />;
            case 'video': return <Video size={18} />;
            case 'audio': return <Mic size={18} />;
            case 'document': return <FileText size={18} />;
            default: return <MessageSquare size={18} />;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">

            <div className="bg-card-bg border border-border-color rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">

                {/* Header */}
                <div className="px-5 py-4 border-b border-border-color flex justify-between items-center bg-surface">
                    <div>
                        <h2 className="text-[13px] font-black text-text-main flex items-center gap-2 tracking-tight">
                            <Zap className="text-primary fill-primary/20" size={16} />
                            {viewMode === 'list' ? 'Plantillas rápidas' : (formData.id ? 'Editar respuesta' : 'Nueva respuesta')}
                        </h2>
                        <p className="text-[9px] text-text-muted font-bold tracking-widest mt-0.5 uppercase opacity-60">Atajos para mensajes frecuentes</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {(viewMode === 'list' && !isCreating) && (
                            <button
                                onClick={handleCreate}
                                className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                                title="Nueva Respuesta"
                            >
                                <Plus size={16} />
                            </button>
                        )}
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-danger/10 text-text-muted hover:text-danger rounded-full transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-background/30">

                    {viewMode === 'list' ? (
                        <div className="space-y-4">
                            {/* Search */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="Buscar atajo o contenido..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-input-bg border border-border-color rounded-xl pl-8 pr-3 py-2 text-[11px] font-bold text-text-main focus:outline-none focus:border-primary shadow-inner placeholder:text-text-muted/50"
                                />
                            </div>

                            {/* Inline Creation Form */}
                            {isCreating && (
                                <div className="bg-surface p-3 rounded-2xl border-2 border-border-color shadow-xl animate-in slide-in-from-top-2 duration-300 space-y-3">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-black">/</span>
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Comando"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-background border border-border-color rounded-lg pl-6 pr-3 py-1.5 text-[11px] font-bold text-text-main focus:border-primary outline-none shadow-inner"
                                            />
                                        </div>
                                        <div className="flex bg-background rounded-xl p-0.5 border border-border-color">
                                            {(['text', 'image', 'document'] as MediaType[]).map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setFormData({ ...formData, type })}
                                                    className={`p-1.5 rounded-lg transition-all ${formData.type === type ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'}`}
                                                    title={type}
                                                >
                                                    {getTypeIcon(type)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {formData.type === 'text' ? (
                                        <textarea
                                            value={formData.content}
                                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                                            placeholder="Mensaje de respuesta..."
                                            className="w-full bg-background border border-border-color rounded-lg px-2.5 py-2 text-[11px] font-medium text-text-main focus:border-primary outline-none resize-none h-20 shadow-inner"
                                        />
                                    ) : (
                                        <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border-color hover:border-border-color0 rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all bg-background text-text-muted hover:text-primary">
                                            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                                            {previewUrl ? (
                                                <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                                                    {formData.type === 'image' ? <img src={previewUrl} className="h-10 w-10 object-cover rounded shadow-md" /> : <Paperclip size={14} />}
                                                    <span className="truncate max-w-[150px]">{selectedFile?.name || 'Archivo seleccionado'}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload size={14} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Subir {formData.type}</span>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center pt-1">
                                        <button
                                            onClick={() => setPreviewMessage({ ...formData, mediaUrl: previewUrl })}
                                            className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:bg-primary/5 px-2 py-1 rounded"
                                        >
                                            <Eye size={10} /> Preview
                                        </button>
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsCreating(false)} className="px-3 py-1.5 text-[9px] font-black text-text-muted uppercase hover:text-text-main">Cancelar</button>
                                            <button onClick={async () => { await onSave(formData, selectedFile || undefined); setIsCreating(false); resetForm(); }} disabled={!formData.name} className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md shadow-primary/20 disabled:opacity-50">Guardar</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Compact List View */}
                            <div className="space-y-2">
                                {filteredReplies.map(qr => (
                                    <div
                                        key={qr.id}
                                        className="bg-surface p-2.5 rounded-2xl border border-border-color hover:border-primary/40 transition-all group flex items-center gap-3 cursor-pointer shadow-sm relative overflow-hidden"
                                        onClick={() => handleEdit(qr)}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-border-color shadow-inner ${qr.type === 'text' ? 'bg-background text-primary' : 'bg-primary/5 text-primary'
                                            }`}>
                                            {qr.mediaUrl && qr.type === 'image' ? (
                                                <img src={qr.mediaUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                getTypeIcon(qr.type)
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="font-bold text-[12px] text-text-main truncate tracking-tight">{qr.name}</h3>
                                                <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black">/{qr.name.toLowerCase().replace(/\s+/g, '')}</span>
                                            </div>
                                            <p className="text-[10px] font-medium text-text-muted truncate tracking-tight opacity-70 italic">
                                                {qr.type === 'text' ? qr.content : (qr.mediaFilename || 'Archivo adjunto')}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPreviewMessage(qr); }}
                                                className="p-1 px-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                                                title="Preview"
                                            >
                                                <Eye size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(qr); }}
                                                className="p-1 px-1.5 hover:bg-primary/10 text-text-muted hover:text-primary rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteClick(qr.id, e)}
                                                className="p-1 px-1.5 hover:bg-danger/10 text-text-muted hover:text-danger rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {filteredReplies.length === 0 && !isCreating && (
                                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
                                        <Zap size={32} className="mb-2" />
                                        <p className="text-[10px] uppercase font-black tracking-widest">Sin respuestas guardadas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-right-4 duration-300 space-y-4">
                            <button
                                onClick={() => setViewMode('list')}
                                className="text-[10px] font-black uppercase text-text-muted hover:text-primary flex items-center gap-1 transition-colors"
                            >
                                <ChevronLeft size={14} /> Volver a lista
                            </button>

                            <div className="space-y-4 px-1">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-black text-text-muted tracking-widest pl-1">Atajo de teclado</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-black">/</span>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="ej. precios"
                                            className="w-full bg-input-bg border border-border-color rounded-2xl pl-8 pr-4 py-3 text-sm font-bold text-text-main focus:border-primary outline-none transition-all shadow-inner uppercase"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-black text-text-muted tracking-widest pl-1">Tipo de Respuesta</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {(['text', 'image', 'video', 'audio', 'document'] as MediaType[]).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setFormData({ ...formData, type })}
                                                className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border-2 transition-all ${formData.type === type
                                                    ? 'bg-primary/5 border-primary text-primary shadow-sm'
                                                    : 'bg-input-bg border-transparent hover:border-border-color text-text-muted'
                                                    }`}
                                            >
                                                {getTypeIcon(type)}
                                                <span className="text-[8px] font-black uppercase tracking-tighter">{type === 'image' ? 'Img' : type === 'document' ? 'Doc' : type}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {formData.type === 'text' ? (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-black text-text-muted tracking-widest pl-1">Mensaje Predefinido</label>
                                        <textarea
                                            value={formData.content}
                                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                                            placeholder="Nuestro horario es..."
                                            rows={5}
                                            className="w-full bg-input-bg border border-border-color rounded-2xl px-4 py-3 text-sm font-medium text-text-main focus:border-primary outline-none transition-all shadow-inner resize-none leading-relaxed"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-black text-text-muted tracking-widest pl-1">Archivo Adjunto</label>
                                        <div
                                            onClick={() => !previewUrl && fileInputRef.current?.click()}
                                            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all ${previewUrl ? 'bg-primary/5 border-primary shadow-inner' : 'border-border-color cursor-pointer hover:border-border-color0 hover:bg-primary/5 text-text-muted hover:text-primary'
                                                }`}
                                        >
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileSelect}
                                                accept={formData.type === 'image' ? 'image/*' : formData.type === 'video' ? 'video/*' : formData.type === 'audio' ? 'audio/*' : '*/*'}
                                            />
                                            {previewUrl ? (
                                                <div className="relative group w-full flex flex-col items-center">
                                                    {formData.type === 'image' ? (
                                                        <img src={previewUrl} alt="Preview" className="max-h-32 object-contain rounded-xl shadow-lg border-2 border-white" />
                                                    ) : formData.type === 'video' ? (
                                                        <video src={previewUrl} className="max-h-32 rounded-xl shadow-lg" controls />
                                                    ) : (
                                                        <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center text-primary shadow-inner border border-border-color">
                                                            {getTypeIcon(formData.type!)}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2 mt-4 bg-white dark:bg-slate-700 px-3 py-1.5 rounded-full border border-border-color shadow-sm">
                                                        <Paperclip size={12} className="text-primary" />
                                                        <span className="text-[10px] font-black uppercase text-text-main truncate max-w-[180px]">
                                                            {selectedFile?.name || formData.mediaFilename || 'Archivo adjunto'}
                                                        </span>
                                                        <button
                                                            onClick={handleRemoveFile}
                                                            className="ml-1 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center shadow-sm border border-border-color text-primary">
                                                        <UploadCloud size={24} />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-text-main">Click para subir</p>
                                                        <p className="text-[8px] font-bold text-text-muted mt-0.5 uppercase">Tamaño máximo 16MB</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex justify-between items-center bg-surface -mx-6 -mb-4 px-6 py-4 border-t border-border-color">
                                <button
                                    onClick={() => setPreviewMessage({ ...formData, mediaUrl: previewUrl })}
                                    className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 hover:bg-primary/10 px-3 py-1.5 rounded-xl transition-all"
                                >
                                    <Eye size={16} /> Vista Previa
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-text-main"
                                    >
                                        Cerrar
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !formData.name}
                                        className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-105"
                                    >
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Guardar</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            <CustomModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
            />

            {/* Shared WhatsApp Preview */}
            <WhatsAppPreview
                isOpen={!!previewMessage}
                onClose={() => setPreviewMessage(null)}
                content={previewMessage?.content || ''}
                mediaUrl={previewMessage?.mediaUrl}
                mediaType={previewMessage?.type || previewMessage?.mediaType}
                mediaName={previewMessage?.mediaFilename || previewMessage?.name}
            />
        </div>
    );
}
