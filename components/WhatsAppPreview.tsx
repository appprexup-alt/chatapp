import React from 'react';
import { Users, Plus, MessageSquare, X, CheckCheck, Clock, Music, FileText, Image as ImageIcon, Video } from 'lucide-react';

interface WhatsAppPreviewProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    content: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'audio' | 'document' | 'none';
    mediaName?: string;
}

const WhatsAppPreview: React.FC<WhatsAppPreviewProps> = ({
    isOpen,
    onClose,
    title = 'Lead: Juan Perez',
    subtitle = 'En línea',
    content,
    mediaUrl,
    mediaType = 'none',
    mediaName
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#E5DDD5] dark:bg-slate-900 rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden border-[8px] border-slate-800 relative">
                {/* iPhone Notch Style */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-slate-800 rounded-b-2xl z-20"></div>

                {/* WhatsApp Header */}
                <div className="bg-[#075E54] p-4 pt-8 text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-border-color shrink-0 flex items-center justify-center text-text-muted">
                        <Users size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-sm leading-tight">{title}</p>
                        <p className="text-[10px] opacity-70">{subtitle}</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-2 h-2 rounded-full bg-white/20"></div>
                        <div className="w-2 h-2 rounded-full bg-white/20"></div>
                    </div>
                </div>

                {/* Chat Body */}
                <div className="h-[450px] overflow-y-auto p-4 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                    <div className="flex justify-end">
                        <div className="bg-white dark:bg-[#056162] dark:text-white rounded-lg shadow-sm max-w-[85%] overflow-hidden relative group">
                            {mediaUrl && (
                                <div className="p-1">
                                    {mediaType === 'image' && (
                                        <img src={mediaUrl} alt="Preview" className="w-full aspect-square object-cover rounded-md" />
                                    )}
                                    {mediaType === 'video' && (
                                        <div className="aspect-video bg-black flex items-center justify-center rounded-md relative group">
                                            <video src={mediaUrl} className="w-full h-full object-cover opacity-50" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                                                    <Plus size={20} className="text-white rotate-45" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {(mediaType === 'audio' || mediaType === 'document' || mediaType === 'audio' || mediaType === 'document') && (
                                        <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-3 rounded-md border border-black/5">
                                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                                {mediaType === 'audio' ? <Music size={20} /> : <FileText size={20} />}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-[11px] font-bold truncate">{mediaName || 'Archivo'}</p>
                                                <p className="text-[9px] opacity-50 uppercase mt-0.5">{mediaType}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="p-2 pt-1 pb-1">
                                <p className="text-[12px] whitespace-pre-wrap leading-relaxed pr-8">
                                    {content}
                                </p>
                                <div className="flex items-center justify-end gap-1 pb-1 pr-1">
                                    <span className="text-[9px] opacity-50 font-medium">10:45 AM</span>
                                    <CheckCheck size={12} className="text-[#34B7F1]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* WhatsApp Footer */}
                <div className="bg-[#F0F2F5] dark:bg-slate-800 p-3 flex items-center gap-3">
                    <Plus size={20} className="text-primary" />
                    <div className="flex-1 bg-white dark:bg-slate-700 h-9 rounded-full px-4 flex items-center">
                        <p className="text-xs text-text-muted">Escribe un mensaje</p>
                    </div>
                    <Clock size={20} className="text-text-muted" />
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center flex-col">
                    <button
                        onClick={onClose}
                        className="bg-primary hover:bg-primary/95 text-white w-12 h-12 rounded-full flex items-center justify-center mb-2 shadow-xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all font-bold border-2 border-white/20"
                    >
                        <X size={24} />
                    </button>
                    <span className="text-[10px] text-white/50 font-black uppercase tracking-widest">Cerrar Vista</span>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppPreview;
