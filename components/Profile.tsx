import React, { useState, useRef } from 'react';
import { User, Lock, Mail, Camera, Save, Phone, User as UserIcon, Shield } from 'lucide-react';
import { useNotification } from './NotificationContext';
import { db } from '../services/db';
import { User as UserType } from '../types';

interface ProfileProps {
    currentUser: UserType | null;
    onUpdateUser: (user: UserType) => void;
}

const Profile: React.FC<ProfileProps> = ({ currentUser, onUpdateUser }) => {
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    // Form States
    const [formData, setFormData] = useState({
        name: currentUser?.name || '',
        phone: currentUser?.phone || '',
        username: currentUser?.username || ''
    });

    const [securityData, setSecurityData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    if (!currentUser) return null;

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const updatedUser = {
                ...currentUser,
                name: formData.name,
                phone: formData.phone,
                username: formData.username
            };

            const result = await db.updateUser(updatedUser);

            if (result.success) {
                onUpdateUser(updatedUser);
                addNotification({
                    title: 'Perfil actualizado',
                    message: 'Tus datos personales han sido guardados.',
                    type: 'success'
                });
            } else {
                addNotification({
                    title: 'Error',
                    message: result.message || 'No se pudo actualizar el perfil.',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error(error);
            addNotification({ title: 'Error', message: 'Ocurrió un error inesperado.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (securityData.newPassword !== securityData.confirmPassword) {
            addNotification({ title: 'Error', message: 'las contraseñas no coinciden.', type: 'error' });
            return;
        }

        if (securityData.newPassword.length < 6) {
            addNotification({ title: 'Error', message: 'La contraseña debe tener al menos 6 caracteres.', type: 'error' });
            return;
        }

        setLoading(true);

        try {
            const result = await db.changePassword(currentUser.id, securityData.currentPassword, securityData.newPassword);

            if (result.success) {
                addNotification({
                    title: 'Contraseña actualizada',
                    message: 'Tu contraseña ha sido cambiada exitosamente.',
                    type: 'success'
                });
                setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                addNotification({
                    title: 'Error',
                    message: result.message || 'La contraseña actual es incorrecta.',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error(error);
            addNotification({ title: 'Error', message: 'Ocurrió un error al cambiar la contraseña.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploadingAvatar(true);

        try {
            const file = e.target.files[0];
            const url = await db.uploadImage(file);

            if (url) {
                const updatedUser = { ...currentUser, avatar: url };
                const result = await db.updateUser(updatedUser);

                if (result.success) {
                    onUpdateUser(updatedUser);
                    addNotification({ title: 'Foto actualizada', message: 'Tu foto de perfil se ha actualizado.', type: 'success' });
                }
            }
        } catch (error) {
            console.error(error);
            addNotification({ title: 'Error', message: 'No se pudo subir la imagen.', type: 'error' });
        } finally {
            setUploadingAvatar(false);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5 border border-primary/20">
                        <UserIcon size={16} />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-bold text-text-main tracking-tight">Mi Perfil</h3>
                        <p className="text-[9px] text-text-muted font-bold opacity-40">Gestiona tu información personal y seguridad</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Left Column: Avatar & Basic Info */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-surface/50 backdrop-blur-xl border border-white/5 rounded-xl p-4 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        <div className="flex flex-col items-center text-center">
                            <div className="relative w-24 h-24 mb-3 group/avatar">
                                <div className="w-full h-full rounded-2xl bg-input-bg border-2 border-surface shadow-2xl overflow-hidden flex items-center justify-center relative">
                                    {currentUser.avatar ? (
                                        <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserIcon size={48} className="text-text-muted/20" />
                                    )}

                                    {uploadingAvatar && (
                                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
                                            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={uploadingAvatar}
                                    className="absolute bottom-0 right-0 p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all hover:scale-110 active:scale-95 z-10"
                                >
                                    <Camera size={16} />
                                </button>
                                <input
                                    type="file"
                                    ref={avatarInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                />
                            </div>

                            <h2 className="text-[15px] font-bold text-text-main tracking-tight">{currentUser.name}</h2>
                            <p className="text-[10px] text-text-muted font-bold opacity-40 mb-2">@{currentUser.username}</p>

                            <div className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-widest inline-flex items-center gap-1.5 ${currentUser.role === 'SuperAdmin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                currentUser.role === 'Admin' ? 'bg-primary/10 text-primary border-primary/20' :
                                    'bg-secondary/10 text-secondary border-secondary/20'
                                }`}>
                                <Shield size={10} />
                                {currentUser.role}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Forms */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Personal Information Form */}
                    <div className="bg-surface/30 backdrop-blur-xl border border-white/5 rounded-xl p-4 shadow-sm">
                        <h4 className="text-[13px] font-bold text-text-main mb-3 flex items-center gap-2">
                            <UserIcon size={14} className="text-primary" />
                            Información Personal
                        </h4>

                        <form onSubmit={handleUpdateProfile} className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-input-bg border border-white/10 rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all"
                                        placeholder="Tu nombre completo"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Nombre de Usuario</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full bg-input-bg border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all"
                                        placeholder="username"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Teléfono</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40 group-focus-within:text-primary transition-all" size={14} />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full bg-input-bg border border-white/10 rounded-xl pl-10 pr-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all"
                                            placeholder="+51..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Correo Electrónico</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40" size={14} />
                                        <input
                                            type="email"
                                            value={currentUser.email}
                                            disabled
                                            className="w-full bg-black/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[11px] font-bold text-text-muted outline-none cursor-not-allowed shadow-inner"
                                        />
                                    </div>
                                    <p className="text-[9px] text-text-muted italic opacity-50 pl-1">El correo no puede ser modificado.</p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-primary hover:bg-primary/90 text-white px-5 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Save size={14} /> Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Security Form */}
                    <div className="bg-surface/30 backdrop-blur-xl border border-white/5 rounded-xl p-4 shadow-sm">
                        <h4 className="text-[13px] font-bold text-text-main mb-3 flex items-center gap-2">
                            <Lock size={14} className="text-secondary" />
                            Seguridad
                        </h4>

                        <form onSubmit={handleChangePassword} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Contraseña Actual</label>
                                <input
                                    type="password"
                                    value={securityData.currentPassword}
                                    onChange={e => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                                    className="w-full bg-input-bg border border-white/10 rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-secondary shadow-inner transition-all"
                                    placeholder="••••••"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        value={securityData.newPassword}
                                        onChange={e => setSecurityData({ ...securityData, newPassword: e.target.value })}
                                        className="w-full bg-input-bg border border-white/10 rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-secondary shadow-inner transition-all"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Confirmar Contraseña</label>
                                    <input
                                        type="password"
                                        value={securityData.confirmPassword}
                                        onChange={e => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                                        className="w-full bg-input-bg border border-white/10 rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-secondary shadow-inner transition-all"
                                        placeholder="Repetir nueva contraseña"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={loading || !securityData.currentPassword || !securityData.newPassword}
                                    className="bg-secondary hover:bg-secondary/90 text-white px-5 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-bold shadow-lg shadow-secondary/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Lock size={14} /> Actualizar Contraseña
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
