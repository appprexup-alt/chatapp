import React, { useState } from 'react';
import { db } from '../services/db';
import { Building2, User, Mail, Lock, Phone, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface RegisterTenantProps {
    onBack: () => void;
    onSuccess: () => void;
}

const RegisterTenant: React.FC<RegisterTenantProps> = ({ onBack, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Registration Data
    const [orgName, setOrgName] = useState('');
    const [ownerData, setOwnerData] = useState({
        name: '',
        email: '',
        username: '',
        password: '',
        phone: ''
    });

    const handleNext = () => {
        if (step === 1 && !orgName) {
            setError('Nombre de la organización es obligatorio');
            return;
        }
        setError('');
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await db.registerTenant(orgName, ownerData);
            if (res.success) {
                setStep(3);
                setTimeout(() => onSuccess(), 3000);
            } else {
                setError(res.message || 'Error en el registro. Intente nuevamente.');
            }
        } catch (err: any) {
            setError(err.message || 'Error inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-card-bg border border-border-color rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-primary tracking-tight">Registro de Organización</h1>
                <p className="text-text-muted text-xs font-medium mt-1">Únete a la gestión inteligente</p>
            </div>

            {error && (
                <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-xl text-xs mb-6 flex items-center gap-2">
                    <AlertCircle className="shrink-0" size={16} />
                    {error}
                </div>
            )}

            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div>
                        <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Nombre de tu Empresa / Proyecto</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted opacity-40" size={18} />
                            <input
                                type="text"
                                className="w-full bg-input-bg border border-border-color text-text-main rounded-xl pl-10 pr-4 py-3 outline-none focus:border-primary transition-all shadow-inner"
                                placeholder="Ej. Domus Inmobiliaria"
                                value={orgName}
                                onChange={e => setOrgName(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onBack} className="flex-1 px-4 py-3 rounded-xl border border-border-color text-text-muted font-bold text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-2">
                            <ArrowLeft size={16} /> Volver
                        </button>
                        <button onClick={handleNext} className="flex-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                            Siguiente <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 opacity-60">Nombre Completo del Administrador</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted opacity-40" size={16} />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-input-bg border border-border-color text-text-main rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-primary transition-all text-sm"
                                    placeholder="Juan Perez"
                                    value={ownerData.name}
                                    onChange={e => setOwnerData({ ...ownerData, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 opacity-60">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted opacity-40" size={16} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-input-bg border border-border-color text-text-main rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-primary transition-all text-sm"
                                    placeholder="email@ejemplo.com"
                                    value={ownerData.email}
                                    onChange={e => setOwnerData({ ...ownerData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 opacity-60">Teléfono</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted opacity-40" size={16} />
                                <input
                                    type="text"
                                    className="w-full bg-input-bg border border-border-color text-text-main rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-primary transition-all text-sm"
                                    placeholder="+51..."
                                    value={ownerData.phone}
                                    onChange={e => setOwnerData({ ...ownerData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="col-span-1">
                            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 opacity-60">Usuario</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-input-bg border border-border-color text-text-main rounded-xl px-4 py-2.5 outline-none focus:border-primary transition-all text-sm"
                                placeholder="admin123"
                                value={ownerData.username}
                                onChange={e => setOwnerData({ ...ownerData, username: e.target.value })}
                            />
                        </div>

                        <div className="col-span-1">
                            <label className="block text-[10px] font-black text-text-muted uppercase tracking-widest mb-1.5 opacity-60">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted opacity-40" size={16} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-input-bg border border-border-color text-text-main rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-primary transition-all text-sm"
                                    placeholder="••••••••"
                                    value={ownerData.password}
                                    onChange={e => setOwnerData({ ...ownerData, password: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setStep(1)} className="flex-1 px-4 py-3 rounded-xl border border-border-color text-text-muted font-bold text-sm hover:bg-white/5 transition-all">
                            Atrás
                        </button>
                        <button type="submit" disabled={loading} className="flex-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? 'Procesando...' : 'Completar Registro'}
                        </button>
                    </div>
                </form>
            )}

            {step === 3 && (
                <div className="text-center py-8 animate-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-success/20">
                        <CheckCircle2 size={40} className="animate-bounce" />
                    </div>
                    <h2 className="text-2xl font-black text-text-main mb-2">¡Todo Listo!</h2>
                    <p className="text-text-muted text-sm font-medium">Tu organización ha sido creada. <br /> Redirigiendo al login...</p>
                </div>
            )}
        </div>
    );
};

export default RegisterTenant;
