
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Organization, User } from '../types';
import {
    Plus, Edit, Globe, Mail, Calendar, Users,
    CheckCircle, XCircle, AlertCircle, Search,
    ChevronRight, LayoutDashboard, CreditCard, Shield
} from 'lucide-react';
import { useNotification } from './NotificationContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Subscribers: React.FC = () => {
    const { addNotification } = useNotification();
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [currentOrg, setCurrentOrg] = useState<Partial<Organization>>({
        plan: 'demo',
        status: 'active',
        maxUsers: 5
    });
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', username: '', password: '' });
    const [stats, setStats] = useState({ total: 0, active: 0, expiring: 0, totalUsers: 0 });

    useEffect(() => {
        loadOrgs();
    }, []);

    const loadOrgs = async () => {
        setLoading(true);
        try {
            const [orgsData, usersData] = await Promise.all([
                db.getOrganizations(),
                db.getUsers() // Owner sees all users
            ]);
            setOrgs(orgsData);

            // Calculate Stats
            const active = orgsData.filter(o => o.status === 'active').length;
            const expiring = orgsData.filter(o => {
                if (!o.expiryDate) return false;
                const days = (new Date(o.expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24);
                return days > 0 && days < 7;
            }).length;

            setStats({
                total: orgsData.length,
                active,
                expiring,
                totalUsers: usersData.length
            });
        } catch (error) {
            console.error("Error loading organizations:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentOrg.name) {
            addNotification({ title: 'Error', message: 'El nombre es obligatorio.', type: 'error' });
            return;
        }

        try {
            if (currentOrg.id) {
                await db.updateOrganization(currentOrg);
                addNotification({ title: 'Éxito', message: 'Suscripción actualizada correctamente.', type: 'success' });
            } else {
                const result = await db.addOrganization(currentOrg);
                if (result.success && result.data) {
                    addNotification({ title: 'Éxito', message: 'Nueva empresa registrada. ¿Deseas crear su primer administrador?', type: 'success' });
                    setCurrentOrg(result.data);
                    setShowAdminModal(true);
                } else {
                    throw new Error(result.message);
                }
            }
            setShowModal(false);
            loadOrgs();
        } catch (error: any) {
            addNotification({ title: 'Error', message: error.message || 'No se pudo guardar la información.', type: 'error' });
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar a "${name}"? Esta acción no se puede deshacer.`)) return;

        const result = await db.deleteOrganization(id);
        if (result.success) {
            addNotification({ title: 'Eliminado', message: 'Organización eliminada correctamente.', type: 'success' });
            loadOrgs();
        } else {
            addNotification({ title: 'Error', message: result.message || 'Error al eliminar.', type: 'error' });
        }
    };

    const handleCreateAdmin = async () => {
        if (!newAdmin.username || !newAdmin.password) {
            addNotification({ title: 'Error', message: 'Usuario y Contraseña son requeridos.', type: 'error' });
            return;
        }

        try {
            await db.addUser({
                id: '',
                organizationId: currentOrg.id!,
                name: newAdmin.name || currentOrg.name!,
                email: newAdmin.email,
                username: newAdmin.username,
                password: newAdmin.password,
                role: 'SuperAdmin',
                status: 'active'
            });
            addNotification({ title: 'Éxito', message: 'Administrador creado correctamente.', type: 'success' });
            setShowAdminModal(false);
            setNewAdmin({ name: '', email: '', username: '', password: '' });
        } catch (error: any) {
            addNotification({ title: 'Error', message: error.message || 'Error al crear administrador.', type: 'error' });
        }
    };

    const filteredOrgs = orgs.filter(o =>
        o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getPlanBadge = (plan?: string) => {
        const plans: Record<string, string> = {
            demo: 'bg-primary/10 text-primary border-primary/20',
            mensual: 'bg-primary/20 text-primary border-primary/30',
            anual: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            permanente: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
        };
        return plans[plan?.toLowerCase() || 'demo'] || plans.demo;
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="md:hidden">
                    <h2 className="text-2xl font-bold text-text-main flex items-center gap-2">
                        <Shield className="text-primary" size={24} /> Suscriptores
                    </h2>
                </div>
                <div />
                <button
                    onClick={() => {
                        setCurrentOrg({ plan: 'demo', status: 'active', maxUsers: 5 });
                        setShowModal(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus size={18} /> <span className="text-xs font-bold">Nueva Empresa</span>
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                <div className="bg-card-bg border border-border-color p-2.5 rounded-xl flex items-center gap-2.5 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Globe size={16} />
                    </div>
                    <div>
                        <p className="text-[9px] text-text-muted uppercase font-black tracking-wider">Empresas</p>
                        <p className="text-lg font-black text-text-main leading-none">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-card-bg border border-border-color p-2.5 rounded-xl flex items-center gap-2.5 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <CheckCircle size={16} />
                    </div>
                    <div>
                        <p className="text-[9px] text-text-muted uppercase font-black tracking-wider">Activas</p>
                        <p className="text-lg font-black text-text-main leading-none">{stats.active}</p>
                    </div>
                </div>
                <div className="bg-card-bg border border-border-color p-2.5 rounded-xl flex items-center gap-2.5 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Calendar size={16} />
                    </div>
                    <div>
                        <p className="text-[9px] text-text-muted uppercase font-black tracking-wider">Vencen pronto</p>
                        <p className="text-lg font-black text-text-main leading-none">{stats.expiring}</p>
                    </div>
                </div>
                <div className="bg-card-bg border border-border-color p-2.5 rounded-xl flex items-center gap-2.5 shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Users size={16} />
                    </div>
                    <div>
                        <p className="text-[9px] text-text-muted uppercase font-black tracking-wider">Usuarios</p>
                        <p className="text-lg font-black text-text-main leading-none">{stats.totalUsers}</p>
                    </div>
                </div>
            </div>

            <div className="bg-card-bg border border-border-color rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
                <div className="p-2 border-b border-border-color bg-background/50 flex flex-col md:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            className="w-full bg-input-bg border border-border-color rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-text-muted text-[9px] uppercase font-black tracking-wider border-b border-border-color bg-background/30">
                                <th className="px-3 py-2">Empresa</th>
                                <th className="px-3 py-2">Plan / Estado</th>
                                <th className="px-3 py-2">Límites</th>
                                <th className="px-3 py-2">Vencimiento</th>
                                <th className="px-3 py-2 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-text-muted">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                                            <span className="text-[10px] font-medium">Cargando suscriptores...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredOrgs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-text-muted">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle size={24} className="opacity-20" />
                                            <span className="text-[10px] font-medium">No se encontraron empresas.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredOrgs.map(org => (
                                <tr key={org.id} className="hover:bg-primary/5 transition-colors group">
                                    <td className="px-3 py-1.5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-text-main text-xs">{org.name}</span>
                                            <span className="text-[9px] text-text-muted flex items-center gap-1">
                                                <Mail size={9} /> {org.contactEmail || 'Sin email'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getPlanBadge(org.plan)}`}>
                                                {org.plan}
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${org.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {org.status === 'active' ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex items-center gap-1 text-text-main">
                                            <Users size={12} className="text-primary" />
                                            <span className="font-bold text-xs">{org.maxUsers || 5}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex items-center gap-1 text-text-main">
                                            <Calendar size={12} className="text-primary" />
                                            <span className="font-medium text-[10px]">
                                                {org.expiryDate
                                                    ? format(new Date(org.expiryDate), 'dd MMM yyyy', { locale: es })
                                                    : 'Permanente'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => { setCurrentOrg(org); setShowModal(true); }}
                                                className="p-1 hover:bg-primary/10 text-primary rounded-md transition-colors"
                                                title="Editar Suscripción"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(org.id, org.name)}
                                                className="p-1 hover:bg-red-500/10 text-red-500 rounded-md transition-colors"
                                                title="Eliminar Empresa"
                                            >
                                                <XCircle size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-300 backdrop-blur-sm">
                    <div className="bg-card-bg border border-border-color rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] md:max-h-none animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-border-color bg-background/40 flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-bold text-text-main tracking-tight">Configurar Suscripción</h3>
                                <p className="text-text-muted text-[10px] font-bold opacity-60 uppercase tracking-wider">Define los límites y el estado de la cuenta comercial.</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1.5 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded-lg transition-colors active:scale-95"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-muted ml-1 opacity-60">Nombre Comercial</label>
                                    <input
                                        className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2.5 text-[11px] font-bold text-text-main focus:border-primary outline-none transition-all shadow-inner"
                                        value={currentOrg.name || ''}
                                        onChange={e => setCurrentOrg({ ...currentOrg, name: e.target.value })}
                                        placeholder="Ej: Inmobiliaria PREX"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-muted ml-1 opacity-60">Email de Contacto</label>
                                    <input
                                        className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2.5 text-[11px] font-bold text-text-main focus:border-primary outline-none transition-all shadow-inner"
                                        value={currentOrg.contactEmail || ''}
                                        onChange={e => setCurrentOrg({ ...currentOrg, contactEmail: e.target.value })}
                                        placeholder="admin@empresa.com"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-muted ml-1 opacity-60">Plan de Suscripción</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2.5 text-[11px] font-bold text-text-main focus:border-primary outline-none transition-all appearance-none cursor-pointer shadow-inner"
                                            value={currentOrg.plan || 'demo'}
                                            onChange={e => setCurrentOrg({ ...currentOrg, plan: e.target.value })}
                                        >
                                            <option value="demo">Demo (Prueba)</option>
                                            <option value="mensual">Mensual</option>
                                            <option value="anual">Anual</option>
                                            <option value="permanente">Permanente</option>
                                        </select>
                                        <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-text-muted pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-muted ml-1 opacity-60">Límite de Usuarios</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2.5 text-[11px] font-bold text-text-main focus:border-primary outline-none transition-all shadow-inner"
                                            value={currentOrg.maxUsers || 5}
                                            onChange={e => setCurrentOrg({ ...currentOrg, maxUsers: parseInt(e.target.value) })}
                                        />
                                        <Users size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-muted ml-1 opacity-60">Fecha de Expiración</label>
                                    <input
                                        type="date"
                                        className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2.5 text-[11px] font-bold text-text-main focus:border-primary outline-none transition-all shadow-inner"
                                        value={currentOrg.expiryDate?.split('T')[0] || ''}
                                        onChange={e => setCurrentOrg({ ...currentOrg, expiryDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-text-muted ml-1 opacity-60">Estado de Cuenta</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentOrg({ ...currentOrg, status: 'active' })}
                                            className={`flex-1 py-2.5 rounded-xl font-bold transition-all text-[10px] border ${currentOrg.status === 'active' ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-input-bg border-border-color text-text-muted hover:bg-background'}`}
                                        >
                                            Activo
                                        </button>
                                        <button
                                            onClick={() => setCurrentOrg({ ...currentOrg, status: 'inactive' })}
                                            className={`flex-1 py-2.5 rounded-xl font-bold transition-all text-[10px] border ${currentOrg.status === 'inactive' ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-input-bg border-border-color text-text-muted hover:bg-background'}`}
                                        >
                                            Inactivo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-border-color bg-background/40 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 text-text-muted text-[10px] font-bold hover:text-text-main transition-colors active:scale-95"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 text-[10px] flex items-center gap-2"
                            >
                                <CheckCircle size={14} />
                                Guardar Configuración
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showAdminModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-300 backdrop-blur-sm">
                    <div className="bg-card-bg border border-border-color rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-border-color bg-background/40">
                            <h3 className="text-base font-bold text-text-main tracking-tight">Crear Administrador</h3>
                            <p className="text-text-muted text-[10px] font-bold opacity-60 uppercase tracking-wider">Provisión inicial para "{currentOrg.name}"</p>
                        </div>
                        <div className="p-5 space-y-3.5">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold uppercase text-text-muted opacity-60">Nombre del Admin</label>
                                <input
                                    className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2.5 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner"
                                    placeholder="Ej: Administrador Principal"
                                    value={newAdmin.name}
                                    onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold uppercase text-text-muted opacity-60">Usuario</label>
                                <input
                                    className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2.5 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner"
                                    placeholder="ej: admin_empresa"
                                    value={newAdmin.username}
                                    onChange={e => setNewAdmin({ ...newAdmin, username: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold uppercase text-text-muted opacity-60">Contraseña</label>
                                <input
                                    type="password"
                                    className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2.5 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner"
                                    value={newAdmin.password}
                                    onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold uppercase text-text-muted opacity-60">Email (Opcional)</label>
                                <input
                                    className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2.5 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner"
                                    placeholder="admin@empresa.com"
                                    value={newAdmin.email}
                                    onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-border-color bg-background/40 flex justify-end gap-3">
                            <button onClick={() => setShowAdminModal(false)} className="px-4 py-2.5 text-text-muted text-[10px] font-bold hover:text-text-main transition-colors active:scale-95">Omitir</button>
                            <button onClick={handleCreateAdmin} className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-[10px] font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95">Crear Acceso</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Subscribers;
