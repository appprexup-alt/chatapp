
import React from 'react';
import { X, AlertCircle, CheckCircle, HelpCircle, Save, Trash2, Info } from 'lucide-react';

export type ModalType = 'confirm' | 'alert' | 'danger' | 'success' | 'info';

interface CustomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    message: string;
    type?: ModalType;
    confirmText?: string;
    cancelText?: string;
    icon?: React.ReactNode;
}

const CustomModal: React.FC<CustomModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'confirm',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    icon
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        if (icon) return icon;
        switch (type) {
            case 'danger': return <Trash2 size={32} className="text-danger" />;
            case 'success': return <CheckCircle size={32} className="text-green-500" />;
            case 'info': return <Info size={32} className="text-primary" />;
            case 'alert': return <AlertCircle size={32} className="text-amber-500" />;
            default: return <HelpCircle size={32} className="text-primary" />;
        }
    };

    const isAlert = type === 'alert' || type === 'success' || type === 'info';

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#111111] border border-white/10 rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 flex flex-col items-center text-center gap-6">
                    <div className="p-4 bg-white/5 rounded-2xl">
                        {getIcon()}
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
                        <p className="text-sm text-text-muted leading-relaxed px-4">{message}</p>
                    </div>

                    <div className="w-full flex flex-col gap-3 pt-4 border-t border-white/5 mt-2">
                        {!isAlert && (
                            <button
                                onClick={onConfirm}
                                className="w-full py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                {confirmText}
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className={`w-full py-4 font-bold rounded-2xl transition-all active:scale-95 ${isAlert
                                    ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:scale-[1.02]'
                                    : 'text-text-muted hover:bg-white/5'
                                }`}
                        >
                            {isAlert ? 'Aceptar' : cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomModal;
