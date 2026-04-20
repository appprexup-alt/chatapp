
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { User, Developer, PipelineStage, LeadSource, AppSettings, Organization } from '../types';
import {
  Plus, Edit, Trash2, Users, Building, Kanban,
  Check, X, MapPin, Phone, Mail, FileText, User as UserIcon, AlertCircle,
  Share2, AlertTriangle, Lock, Image, ToggleLeft, ToggleRight, Upload, Settings, Globe, Eye, EyeOff, ChevronDown, Search, Shield
} from 'lucide-react';
import { useNotification } from './NotificationContext';
import CustomModal from './CustomModal';

const Admin: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'projects' | 'pipeline' | 'sources' | 'settings' | 'orgs'>('orgs');
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('inmocrm_user') || 'null');
    setCurrentUser(user);
    if (user && user.role !== 'Owner') {
      setActiveTab('users');
    }
  }, []);



  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'SuperAdmin' || currentUser.role === 'Owner';
  const isOwner = currentUser.role === 'Owner';

  return (
    <div className="space-y-4">
      <div className="md:hidden">
        <h2 className="text-lg font-bold text-text-main tracking-tight">Administración</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border-color overflow-x-auto scrollbar-hide">
        {isOwner && (
          <button
            onClick={() => setActiveTab('orgs')}
            className={`px-3 py-2 flex items-center gap-1.5 font-bold transition-all border-b-2 whitespace-nowrap text-[11px] ${activeTab === 'orgs' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-text-main hover:bg-background'
              }`}
          >
            <Globe size={14} /> Organizaciones
          </button>
        )}
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-2 flex items-center gap-1.5 font-bold transition-all border-b-2 whitespace-nowrap text-[11px] ${activeTab === 'users' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-text-main hover:bg-background'
            }`}
        >
          <Users size={14} /> Usuarios
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-3 py-2 flex items-center gap-1.5 font-bold transition-all border-b-2 whitespace-nowrap text-[11px] ${activeTab === 'projects' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-text-main hover:bg-background'
            }`}
        >
          <Building size={14} /> Proyectos
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`px-3 py-2 flex items-center gap-1.5 font-bold transition-all border-b-2 whitespace-nowrap text-[11px] ${activeTab === 'pipeline' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-text-main hover:bg-background'
            }`}
        >
          <Kanban size={14} /> Pipelines
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-3 py-2 flex items-center gap-1.5 font-bold transition-all border-b-2 whitespace-nowrap text-[11px] ${activeTab === 'sources' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-text-main hover:bg-background'
            }`}
        >
          <Share2 size={14} /> Origen
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-2 flex items-center gap-1.5 font-bold transition-all border-b-2 whitespace-nowrap text-[11px] ${activeTab === 'settings' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-text-muted hover:text-text-main hover:bg-background'
            }`}
        >
          <Settings size={14} /> Configuración
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-card-bg border border-border-color rounded-2xl p-4 min-h-[500px] shadow-2xl overflow-hidden">
        {activeTab === 'orgs' && isOwner && <OrganizationsManager />}
        {activeTab === 'users' && <UsersManager />}
        {activeTab === 'projects' && <ProjectsManager />}
        {activeTab === 'pipeline' && <PipelineManager />}
        {activeTab === 'sources' && <SourcesManager />}
        {activeTab === 'settings' && <GeneralSettings />}
      </div>
    </div>
  );
};

// --- ORGS MANAGER (SUPER ADMIN ONLY) ---
const OrganizationsManager: React.FC = () => {
  const { addNotification } = useNotification();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [currentOrg, setCurrentOrg] = useState<Partial<Organization>>({ plan: 'free', status: 'active' });

  useEffect(() => { load(); }, []);
  const load = async () => setOrgs(await db.getOrganizations());

  const handleSave = async () => {
    if (!currentOrg.name) return;

    if (currentOrg.id) {
      await db.updateOrganization(currentOrg);
      addNotification({ title: 'Éxito', message: 'Organización actualizada correctamente.', type: 'success' });
    } else {
      await db.addOrganization(currentOrg);
      addNotification({ title: 'Éxito', message: 'Nueva organización registrada.', type: 'success' });
    }
    setShowModal(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5 border border-primary/20">
            <Globe size={18} />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-text-main tracking-tight">Organizaciones</h3>
            <p className="text-[10px] text-text-muted font-bold opacity-40">Gestión de empresas y planes</p>
          </div>
        </div>
        <button
          onClick={() => { setCurrentOrg({ plan: 'free', status: 'active' }); setShowModal(true); }}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold shadow-xl shadow-primary/20 transition-all active:scale-95 shrink-0"
        >
          <Plus size={16} /> Nueva organización
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orgs.map(org => (
          <div key={org.id} className="bg-surface/30 backdrop-blur-xl border border-white/5 p-4 rounded-[1.5rem] shadow-sm hover:border-primary/30 transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col">
                <h4 className="text-[13px] font-bold text-text-main pr-2 tracking-tight group-hover:text-primary transition-colors">{org.name}</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] font-bold text-text-muted/60 uppercase tracking-tight">{org.plan}</span>
                  <div className="w-1 h-1 rounded-full bg-border-color" />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${org.status === 'active' ? 'text-green-500' : 'text-danger'}`}>
                    {org.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setCurrentOrg(org); setShowModal(true); }}
                className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/20 hover:text-text-main rounded-xl transition-all active:scale-90 shrink-0"
              >
                <Edit size={14} />
              </button>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-text-muted font-medium opacity-40 italic">ID: {org.id?.slice(0, 8)}...</span>
              <div className={`w-2 h-2 rounded-full ${org.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-danger'}`} />
            </div>
          </div>
        ))}
        {orgs.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.02]">
            <Globe size={40} className="mx-auto text-text-muted opacity-10 mb-4" />
            <p className="text-[11px] font-bold text-text-muted opacity-40 italic tracking-widest uppercase">Cero organizaciones en el radar</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card-bg border border-white/10 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-3 shrink-0 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                  <Building size={18} />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-text-main tracking-tight leading-none">
                    {currentOrg.id ? 'Editar organización' : 'Nueva organización'}
                  </h4>
                  <p className="text-[10px] font-medium text-text-muted/60 mt-1 flex items-center gap-1.5">
                    <Globe size={10} /> Configuración de tenant
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-danger/10 text-text-muted hover:text-danger rounded-xl transition-all active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="bg-surface/50 border border-white/5 rounded-2xl p-3 shadow-sm space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Nombre de la empresa *</label>
                  <input
                    className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-zinc-300 outline-none focus:border-primary shadow-inner transition-all"
                    placeholder="Ej: Inmobiliaria Global"
                    value={currentOrg.name || ''}
                    onChange={e => setCurrentOrg({ ...currentOrg, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Plan</label>
                    <div className="relative group/select">
                      <select
                        className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-zinc-300 outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all"
                        value={currentOrg.plan}
                        onChange={e => setCurrentOrg({ ...currentOrg, plan: e.target.value as any })}
                      >
                        <option value="free">Gratis</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Estado</label>
                    <div className="relative group/select">
                      <select
                        className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-zinc-300 outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all"
                        value={currentOrg.status}
                        onChange={e => setCurrentOrg({ ...currentOrg, status: e.target.value as any })}
                      >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/5 bg-background/50 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-xl text-[11px] font-bold text-text-muted hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-[11px] font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {currentOrg.id ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SETTINGS SUB-COMPONENT ---
const GeneralSettings: React.FC = () => {
  const { addNotification } = useNotification();
  const [settings, setSettings] = useState<AppSettings>({ id: 'default', logoUrl: '', slogan: '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await db.getSettings();
    setSettings(s);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const url = await db.uploadImage(file);
    if (url) {
      setSettings(prev => ({ ...prev, logoUrl: url }));
      addNotification({ title: 'Éxito', message: 'El logo se ha cargado correctamente.', type: 'success' });
    } else {
      addNotification({ title: 'Error', message: 'No se pudo subir la imagen.', type: 'error' });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    await db.updateSettings(settings);
    addNotification({ title: 'Éxito', message: 'Configuración global guardada.', type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5 border border-primary/20">
            <Settings size={18} />
          </div>
          <div>
            <h3 className="text-[17px] font-bold text-text-main tracking-tight">Configuración general</h3>
            <p className="text-[10px] text-text-muted font-bold opacity-40">Personalización de marca y sistema</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold shadow-xl shadow-primary/20 transition-all active:scale-95 shrink-0"
        >
          <Check size={16} /> Guardar cambios
        </button>
      </div>

      <div className="bg-surface/30 backdrop-blur-xl border border-white/5 rounded-[1.5rem] p-4 shadow-sm space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logo Section */}
          <div className="space-y-3">
            <div>
              <h4 className="text-[12px] font-bold text-text-main tracking-tight mb-0.5">Logotipo de la empresa</h4>
              <p className="text-[10px] text-text-muted font-medium opacity-60">Esta imagen aparecerá en el panel lateral y reportes.</p>
            </div>

            <div className="flex items-center gap-5">
              <div className="w-24 h-24 border border-white/5 rounded-[1.5rem] flex items-center justify-center bg-background/50 overflow-hidden relative group shrink-0 shadow-inner">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform" />
                ) : (
                  <Image className="text-text-muted opacity-20" size={32} />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-10 px-4 bg-surface/50 hover:bg-surface border border-white/5 text-text-main rounded-xl flex items-center gap-2 text-[11px] font-bold transition-all shadow-sm active:scale-95"
                >
                  <Upload size={14} className="text-primary" /> Subir logotipo
                </button>
                <div className="space-y-1">
                  <p className="text-[9px] text-text-muted font-bold opacity-40 uppercase tracking-tighter italic">Recomendado: format 1:1</p>
                  <p className="text-[9px] text-text-muted font-bold opacity-40 uppercase tracking-tighter italic">tamaño max: 2mb</p>
                </div>
              </div>
            </div>
          </div>

          {/* Slogan Section */}
          <div className="space-y-3">
            <div>
              <h4 className="text-[12px] font-bold text-text-main tracking-tight mb-0.5">Identidad visual</h4>
              <p className="text-[10px] text-text-muted font-medium opacity-60">Define el slogan que acompaña a tu marca.</p>
            </div>

            <div className="bg-surface/50 border border-white/5 rounded-2xl p-3 shadow-sm space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Slogan o subtítulo</label>
                <input
                  className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-zinc-300 outline-none focus:border-primary/40 shadow-inner transition-all placeholder:font-normal placeholder:opacity-30"
                  placeholder="Ej: Gestión Inmobiliaria Inteligente"
                  value={settings.slogan || ''}
                  onChange={e => setSettings({ ...settings, slogan: e.target.value })}
                />
                <p className="text-[9px] text-text-muted mt-0.5 italic pl-1 opacity-60">Se mostrará debajo de la marca en el login y dashboards.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- USERS SUB-COMPONENT ---
const UsersManager: React.FC = () => {
  const { addNotification } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({
    role: 'Agent',
    status: 'active'
  });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [orgs, setOrgs] = useState<Organization[]>([]);

  // Confirmation Modal State
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
    const u = JSON.parse(localStorage.getItem('inmocrm_user') || 'null');
    setCurrentUser(u);
    load();
    if (u && (u.role === 'SuperAdmin' || u.role === 'Owner')) loadOrgs();
  }, []);

  const load = async () => setUsers(await db.getUsers());
  const loadOrgs = async () => setOrgs(await db.getOrganizations());

  const handleSave = async () => {
    if (!editingUser.name || !editingUser.email || !editingUser.username) {
      addNotification({ title: 'Error', message: 'Complete los campos obligatorios.', type: 'error' });
      return;
    }

    if (!editingUser.id && !editingUser.password) {
      addNotification({ title: 'Error', message: 'La contraseña es obligatoria para nuevos usuarios.', type: 'error' });
      return;
    }

    const userToSave = { ...editingUser };

    if (currentUser?.role !== 'SuperAdmin') {
      userToSave.organizationId = currentUser?.organizationId;
    } else {
      if (!userToSave.organizationId) userToSave.organizationId = currentUser?.organizationId;
    }

    let result;
    if (userToSave.id) {
      result = await db.updateUser(userToSave as User);
    } else {
      result = await db.addUser(userToSave as User);
    }

    if (result.success) {
      addNotification({ title: 'Éxito', message: 'Usuario guardado correctamente.', type: 'success' });
      setShowModal(false);
      load();
    } else {
      addNotification({ title: 'Error', message: result.message || 'Error al guardar.', type: 'error' });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingAvatar(true);
    const file = e.target.files[0];
    const url = await db.uploadImage(file);
    if (url) {
      setEditingUser(prev => ({ ...prev, avatar: url }));
    }
    setUploadingAvatar(false);
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar usuario?',
      message: 'Esta acción no se puede deshacer. ¿Deseas continuar?',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const res = await db.deleteUser(id);
        if (res.success) {
          addNotification({ title: 'Usuario Eliminado', message: 'El usuario ha sido removido.', type: 'info' });
          load();
        } else {
          addNotification({ title: 'Error', message: res.message || 'No se pudo eliminar.', type: 'error' });
        }
      }
    });
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5 border border-primary/20">
            <Users size={16} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-text-main tracking-tight">Usuarios</h3>
            <p className="text-[9px] text-text-muted font-bold opacity-40">Control de acceso y roles</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end max-w-xl">
          <div className="relative group/search flex-1 hidden sm:block">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-primary transition-colors" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar colaborador..."
              className="w-full bg-input-bg dark:bg-input-bg border border-border-color/50 rounded-xl pl-10 pr-4 py-2 text-[11px] font-bold text-zinc-300 outline-none focus:border-primary/40 transition-all shadow-inner placeholder:text-text-muted/40"
            />
          </div>
          <button
            onClick={() => { setEditingUser({ role: 'Agent', status: 'active', organizationId: currentUser?.organizationId }); setShowModal(true); }}
            className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold shadow-xl shadow-primary/20 transition-all active:scale-95 shrink-0"
          >
            <Plus size={14} /> Nuevo usuario
          </button>
        </div>
      </div>

      <div className="bg-surface/30 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden shadow-2xl relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="overflow-x-auto custom-scrollbar relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-4 py-2.5 text-[9px] font-bold text-text-muted opacity-60 uppercase tracking-widest first:pl-6">Colaborador</th>
                <th className="px-4 py-2.5 text-[9px] font-bold text-text-muted opacity-60 uppercase tracking-widest">Contacto</th>
                <th className="px-4 py-2.5 text-[9px] font-bold text-text-muted opacity-60 uppercase tracking-widest">Rol</th>
                <th className="px-4 py-2.5 text-[9px] font-bold text-text-muted opacity-60 uppercase tracking-widest">Estado</th>
                <th className="px-4 py-2.5 text-[9px] font-bold text-text-muted opacity-60 uppercase tracking-widest text-right last:pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-white/5 transition-all group/row">
                  <td className="px-4 py-2 first:pl-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-input-bg border border-white/5 shadow-sm overflow-hidden flex items-center justify-center group-hover/row:scale-110 transition-transform relative">
                        {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : <UserIcon size={16} className="text-text-muted/40" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-text-main tracking-tight group-hover/row:text-primary transition-colors">{u.username}</span>
                        <span className="text-[9px] font-bold text-text-muted/60 lowercase italic">{u.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-text-muted/80 tracking-tight flex items-center gap-1.5">
                        <Mail size={9} className="opacity-40" /> {u.email}
                      </span>
                      <span className="text-[9px] font-bold text-text-muted/40 flex items-center gap-1.5">
                        <Phone size={9} className="opacity-40" /> {u.phone || 'Sin télefono'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase tracking-widest inline-flex items-center gap-1.5 ${u.role === 'SuperAdmin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]' : u.role === 'Admin' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-secondary/10 text-secondary border-secondary/20'}`}>
                      <Shield size={10} />
                      {u.role === 'SuperAdmin' ? 'Super Admin' : u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`relative flex h-1.5 w-1.5`}>
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${u.status === 'active' ? 'bg-green-400' : 'bg-transparent'}`}></span>
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${u.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${u.status === 'active' ? 'text-text-main' : 'text-text-muted opacity-40'}`}>
                        {u.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right last:pr-6">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover/row:opacity-100 transition-all translate-x-2 group-hover/row:translate-x-0">
                      <button onClick={() => { setEditingUser(u); setShowModal(true); }} className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 text-text-muted hover:text-primary rounded-lg transition-all active:scale-95"><Edit size={12} /></button>
                      <button onClick={() => handleDelete(u.id)} className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 text-text-muted hover:text-danger rounded-lg transition-all active:scale-95"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <Users size={40} className="text-text-muted mb-4 animate-pulse" />
                      <p className="text-[11px] font-bold text-text-muted italic uppercase tracking-widest">
                        No se encontraron usuarios
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card-bg border border-white/10 rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-3 shrink-0 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                  <UserIcon size={18} />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-text-main tracking-tight leading-none">
                    {editingUser.id ? 'Editar colaborador' : 'Nuevo colaborador'}
                  </h4>
                  <p className="text-[10px] font-medium text-text-muted/60 mt-1 flex items-center gap-1.5">
                    <Lock size={10} /> Control de acceso
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-danger/10 text-text-muted hover:text-danger rounded-xl transition-all active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="bg-surface/50 border border-white/5 rounded-2xl p-3 shadow-sm space-y-3">
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 rounded-2xl bg-input-bg border border-white/5 flex items-center justify-center overflow-hidden shrink-0 relative group shadow-inner">
                    {editingUser.avatar ? <img src={editingUser.avatar} alt="Preview" className="w-full h-full object-cover" /> : <UserIcon size={24} className="text-text-muted/20" />}
                    {uploadingAvatar && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div></div>}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Foto de perfil</label>
                    <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="px-4 py-1.5 bg-input-bg hover:bg-background/80 border border-white/5 text-text-main rounded-xl text-[10px] font-bold flex items-center gap-2 transition-all shadow-sm"
                    >
                      <Upload size={14} /> Seleccionar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Username *</label>
                    <input className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all" placeholder="juan.perez" value={editingUser.username || ''} onChange={e => setEditingUser({ ...editingUser, username: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Nombre completo *</label>
                    <input className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all" placeholder="Juan Pérez" value={editingUser.name || ''} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Correo electrónico *</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40 group-focus-within:text-primary transition-all" size={14} />
                    <input className="w-full bg-input-bg border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all" placeholder="email@empresa.com" value={editingUser.email || ''} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Teléfono</label>
                    <div className="relative group">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40 group-focus-within:text-primary transition-all" size={14} />
                      <input className="w-full bg-input-bg border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all" placeholder="+51..." value={editingUser.phone || ''} onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Password {editingUser.id && '(Opcional)'}</label>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40 group-focus-within:text-primary transition-all" size={14} />
                      <input
                        type={passwordVisible ? "text" : "password"}
                        className="w-full bg-input-bg border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all"
                        placeholder="••••••"
                        value={editingUser.password || ''}
                        onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Rol de acceso</label>
                    <div className="relative group/select">
                      <select className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all" value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}>
                        <option value="Agent">Agente</option>
                        <option value="Admin">Administrador</option>
                        {currentUser?.role === 'SuperAdmin' && <option value="SuperAdmin">Super Admin</option>}
                        {currentUser?.role === 'Owner' && <option value="Owner">Owner (Global)</option>}
                      </select>
                      <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Estado de cuenta</label>
                    <button
                      onClick={() => setEditingUser({ ...editingUser, status: editingUser.status === 'active' ? 'inactive' : 'active' })}
                      className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all w-full justify-center text-[10px] font-bold ${editingUser.status === 'active'
                        ? 'bg-green-500/10 text-green-500 border-green-500/20 shadow-inner'
                        : 'bg-danger/10 text-danger border-danger/20 shadow-inner'
                        }`}
                    >
                      {editingUser.status === 'active' ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      {editingUser.status === 'active' ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                </div>

                {(currentUser?.role === 'SuperAdmin' || currentUser?.role === 'Owner') && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Empresa vinculada</label>
                    <div className="relative group/select">
                      <select
                        className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all"
                        value={editingUser.organizationId || ''}
                        onChange={e => setEditingUser({ ...editingUser, organizationId: e.target.value })}
                      >
                        <option value="">Seleccionar Organización...</option>
                        {orgs.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/5 bg-background/50 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-xl text-[11px] font-bold text-text-muted hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-[11px] font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {editingUser.id ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
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
    </div>
  );
};

// --- PROJECTS SUB-COMPONENT ---
const ProjectsManager: React.FC = () => {
  const { addNotification } = useNotification();
  const [devs, setDevs] = useState<Developer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDev, setEditingDev] = useState<Partial<Developer>>({});
  const [phoneError, setPhoneError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Confirmation Modal State
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

  useEffect(() => { load(); }, []);
  const load = async () => setDevs(await db.getDevelopers());

  const handleSave = async () => {
    if (!editingDev.name) return;

    if (editingDev.phone && !/^\+?[0-9\s-]{7,15}$/.test(editingDev.phone)) {
      setPhoneError('Formato inválido (Mín 7 dígitos)');
      return;
    }

    if (editingDev.id) {
      await db.updateDeveloper(editingDev as Developer);
      addNotification({ title: 'Éxito', message: 'Proyecto actualizado correctamente.', type: 'success' });
    } else {
      await db.addDeveloper(editingDev as Developer);
      addNotification({ title: 'Éxito', message: 'Nuevo proyecto registrado.', type: 'success' });
    }
    setShowModal(false);
    load();
  };

  const handleDeleteClick = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar proyecto?',
      message: 'Esta acción eliminará el proyecto y todas sus propiedades asociadas.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await db.deleteDeveloper(id);
        load();
        addNotification({ title: 'Proyecto eliminado', message: 'Se ha removido el desarrollo del sistema.', type: 'info' });
      }
    });
  };

  const filteredProjects = devs.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.developerName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5 border border-primary/20">
            <Building size={16} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-text-main tracking-tight">Proyectos</h3>
            <p className="text-[9px] text-text-muted font-bold opacity-40">Gestión de desarrollos inmobiliarios</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end max-w-xl">
          <div className="relative group/search flex-1 hidden sm:block">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-primary transition-colors" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar proyecto..."
              className="w-full bg-input-bg dark:bg-input-bg border border-border-color/50 rounded-xl pl-10 pr-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/40 transition-all shadow-inner placeholder:text-text-muted/40"
            />
          </div>
          <button
            onClick={() => { setEditingDev({}); setPhoneError(''); setShowModal(true); }}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold shadow-xl shadow-primary/20 transition-all active:scale-95 shrink-0"
          >
            <Plus size={16} /> Nuevo proyecto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredProjects.map(d => (
          <div key={d.id} className="bg-surface/30 backdrop-blur-xl border border-white/5 p-3 rounded-xl shadow-sm hover:border-primary/30 transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col flex-1 min-w-0 pr-2">
                <h4 className="text-[13px] font-bold text-text-main truncate tracking-tight group-hover:text-primary transition-colors">{d.name}</h4>
                <p className="text-[9px] font-bold text-text-muted/60 mt-0.5 truncate italic">{d.developerName || 'Constructora base'}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => { setEditingDev(d); setPhoneError(''); setShowModal(true); }}
                  className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/20 hover:text-text-main rounded-lg transition-all active:scale-90"
                >
                  <Edit size={12} />
                </button>
                <button
                  onClick={() => handleDeleteClick(d.id)}
                  className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/20 hover:text-danger rounded-lg transition-all active:scale-90"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              {d.contactName && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted/80">
                  <UserIcon size={12} className="text-primary/40" />
                  <span className="truncate">{d.contactName}</span>
                </div>
              )}
              {d.phone && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted/80">
                  <Phone size={12} className="text-green-500/40" />
                  <span className="font-mono">{d.phone}</span>
                </div>
              )}
              {d.address && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted/80">
                  <MapPin size={12} className="text-danger/40" />
                  <span className="truncate italic">{d.address}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-text-muted font-medium opacity-40 italic">ID: {d.id?.slice(0, 8)}...</span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
            </div>
          </div>
        ))}
        {filteredProjects.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.02]">
            <Building size={40} className="mx-auto text-text-muted opacity-10 mb-4" />
            <p className="text-[11px] font-bold text-text-muted opacity-40 italic tracking-widest uppercase">Cero proyectos registrados</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-card-bg border border-white/10 rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-3 shrink-0 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                  <Building size={18} />
                </div>
                <div>
                  <h4 className="text-[13px] font-bold text-text-main tracking-tight leading-none">
                    {editingDev.id ? 'Editar proyecto' : 'Nuevo proyecto'}
                  </h4>
                  <p className="text-[10px] font-medium text-text-muted/60 mt-1 flex items-center gap-1.5">
                    <FileText size={10} /> Información del desarrollo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center hover:bg-danger/10 text-text-muted hover:text-danger rounded-xl transition-all active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-[11px]">
              <div className="bg-surface/50 border border-white/5 rounded-2xl p-3 shadow-sm space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Nombre del proyecto *</label>
                  <input
                    className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all placeholder:font-normal"
                    placeholder="Ej: Residencial Los Jardines"
                    value={editingDev.name || ''}
                    onChange={e => setEditingDev({ ...editingDev, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Desarrolladora / Empresa</label>
                    <input
                      className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all placeholder:font-normal"
                      placeholder="Nombre de la empresa"
                      value={editingDev.developerName || ''}
                      onChange={e => setEditingDev({ ...editingDev, developerName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Contacto principal</label>
                    <input
                      className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all placeholder:font-normal"
                      placeholder="Nombre del contacto"
                      value={editingDev.contactName || ''}
                      onChange={e => setEditingDev({ ...editingDev, contactName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">RUC / ID Fiscal</label>
                    <input
                      className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all placeholder:font-normal"
                      placeholder="Número de RUC"
                      value={editingDev.ruc || ''}
                      onChange={e => setEditingDev({ ...editingDev, ruc: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Teléfono de contacto</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40" size={12} />
                      <input
                        className={`w-full bg-input-bg border ${phoneError ? 'border-danger/50' : 'border-white/5'} rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all placeholder:font-normal`}
                        placeholder="+51..."
                        value={editingDev.phone || ''}
                        onChange={e => { setEditingDev({ ...editingDev, phone: e.target.value }); setPhoneError(''); }}
                      />
                    </div>
                    {phoneError && <p className="text-[9px] font-bold text-danger px-1 mt-0.5">{phoneError}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40" size={12} />
                    <input
                      className="w-full bg-input-bg border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all placeholder:font-normal"
                      placeholder="ventas@desarrollo.com"
                      value={editingDev.email || ''}
                      onChange={e => setEditingDev({ ...editingDev, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Ubicación del proyecto</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40" size={12} />
                    <input
                      className="w-full bg-input-bg border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all placeholder:font-normal"
                      placeholder="Dirección completa"
                      value={editingDev.address || ''}
                      onChange={e => setEditingDev({ ...editingDev, address: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Notas adicionales</label>
                  <textarea
                    className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all h-16 resize-none placeholder:font-normal"
                    placeholder="Detalles del proyecto..."
                    value={editingDev.comments || ''}
                    onChange={e => setEditingDev({ ...editingDev, comments: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/5 bg-background/50 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-xl text-[11px] font-bold text-text-muted hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-[11px] font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {editingDev.id ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

// --- PIPELINE MANAGER ---
const PipelineManager: React.FC = () => {
  const { addNotification } = useNotification();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Confirmation Modal State
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
    const u = JSON.parse(localStorage.getItem('inmocrm_user') || 'null');
    setCurrentUser(u);
    load();
  }, []);

  const load = async () => setStages((await db.getPipeline()).sort((a, b) => a.order - b.order));

  const handleUpdate = async (index: number, field: keyof PipelineStage, value: any) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], [field]: value };
    setStages(newStages);
  };

  const handleAddStage = () => {
    if (!currentUser) return;
    const newStage: PipelineStage = {
      id: '',
      label: 'Nueva Etapa',
      color: 'border-border-color',
      order: stages.length + 1,
      organizationId: currentUser.organizationId
    };
    setStages([...stages, newStage]);
  };

  const handleDeleteStage = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar etapa?',
      message: '¿Estás seguro de que deseas eliminar esta etapa? Advertencia: esto podría afectar a los leads que estén en ella.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        // Optimistic UI update
        setStages(prev => prev.filter(s => s.id !== id));

        const res = await db.deletePipelineStage(id);
        if (res.success) {
          addNotification({ title: 'Éxito', message: 'Etapa eliminada correctamente.', type: 'info' });
          load();
        } else {
          addNotification({ title: 'Error', message: res.message || 'No se pudo eliminar la etapa.', type: 'error' });
          load(); // Revert optimistic update on failure
        }
      }
    });
  };

  const savePipeline = async () => {
    // Ensure order is correct
    const orderedStages = stages.map((s, i) => ({ ...s, order: i + 1 }));
    const res = await db.updatePipeline(orderedStages);
    if (res.success) {
      addNotification({ title: 'Éxito', message: 'Pipeline actualizado correctamente.', type: 'success' });
      load();
    } else {
      addNotification({ title: 'Error', message: res.message || 'No se pudo guardar el pipeline.', type: 'error' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5 border border-primary/20">
            <Kanban size={16} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-text-main tracking-tight">Pipeline de ventas</h3>
            <p className="text-[9px] text-text-muted font-bold opacity-40">Gestión de etapas y procesos comerciales</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAddStage}
            className="bg-surface/30 hover:bg-surface/50 text-text-main px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold border border-white/5 transition-all active:scale-95"
          >
            <Plus size={16} /> Agregar etapa
          </button>
          <button
            onClick={savePipeline}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 text-[11px] font-bold shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            <Check size={16} /> Guardar cambios
          </button>
        </div>
      </div>

      <div className="bg-surface/30 backdrop-blur-xl border border-white/5 rounded-xl p-3 shadow-sm">
        <div className="space-y-2 max-w-4xl mx-auto">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex flex-col md:flex-row items-start md:items-center gap-2 bg-surface/50 border border-white/5 p-1.5 rounded-xl group hover:border-primary/20 transition-all">
              <div className="w-7 h-7 flex items-center justify-center bg-background/50 rounded-xl font-bold text-text-muted text-[11px] border border-white/5 shrink-0 shadow-inner">
                {index + 1}
              </div>

              <div className="flex-[2] w-full">
                <input
                  className="w-full bg-input-bg border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary/40 shadow-inner transition-all placeholder:font-normal placeholder:opacity-30"
                  value={stage.label}
                  placeholder="Nombre de la etapa..."
                  onChange={(e) => handleUpdate(index, 'label', e.target.value)}
                />
              </div>

              <div className="flex-1 flex items-center gap-3 min-w-[160px] w-full md:w-auto bg-background/30 px-3 py-1.5 rounded-xl border border-white/5 shadow-inner">
                <div className="flex-1 grid grid-cols-6 gap-1.5">
                  {[
                    { name: 'blue', class: 'bg-blue-500' },
                    { name: 'purple', class: 'bg-purple-500' },
                    { name: 'amber', class: 'bg-amber-500' },
                    { name: 'orange', class: 'bg-orange-500' },
                    { name: 'emerald', class: 'bg-emerald-500' },
                    { name: 'red', class: 'bg-red-500' }
                  ].map(color => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => handleUpdate(index, 'color', `border-${color.name}-500`)}
                      className={`w-3.5 h-3.5 rounded-full border border-black/10 transition-all hover:scale-125 ${stage.color.includes(color.name) ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'opacity-60 hover:opacity-100'} ${color.class}`}
                    />
                  ))}
                </div>
                <div className={`w-7 h-7 rounded-lg shrink-0 border-2 ${stage.color} flex items-center justify-center bg-white/5 shadow-sm transition-all`}>
                  <div className={`w-3 h-3 rounded-full ${stage.color.replace('border', 'bg').split(' ')[0]}`}></div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 md:ml-auto">
                <button
                  onClick={() => handleUpdate(index, 'visible', stage.visible === false ? true : false)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${stage.visible !== false ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5' : 'bg-white/5 text-text-muted hover:text-text-main'}`}
                  title={stage.visible !== false ? 'Visible en leads' : 'Oculto en leads'}
                >
                  {stage.visible !== false ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                <button
                  onClick={() => handleDeleteStage(stage.id)}
                  className="w-9 h-9 flex items-center justify-center bg-white/5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                  title="Eliminar etapa"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {stages.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.02]">
              <Kanban size={40} className="mx-auto text-text-muted opacity-10 mb-4" />
              <p className="text-[11px] font-bold text-text-muted opacity-40 italic tracking-widest uppercase">Cero etapas configuradas</p>
            </div>
          )}

          <div className="mt-8 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
            <div className="flex gap-3">
              <AlertCircle size={18} className="text-primary shrink-0" />
              <div>
                <h5 className="text-[11px] font-bold text-text-main mb-1">Nota sobre cambios estructurales</h5>
                <p className="text-[10px] text-text-muted leading-relaxed italic">
                  Las modificaciones en las etapas del pipeline afectan directamente la visualización en el CRM. Asegúrate de guardar para aplicar los cambios a todos los usuarios.
                </p>
              </div>
            </div>
          </div>
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
    </div>
  );
};

// --- SOURCES MANAGER ---
const SourcesManager: React.FC = () => {
  const { addNotification } = useNotification();
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [newSource, setNewSource] = useState('');

  // Confirmation Modal State
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

  useEffect(() => { load(); }, []);
  const load = async () => setSources(await db.getSources());

  const handleAdd = async () => {
    if (!newSource.trim()) return;
    const res = await db.addSource({ name: newSource } as LeadSource);
    if (res.success) {
      setNewSource('');
      load();
      addNotification({ title: 'Éxito', message: 'Fuente de origen añadida correctamente.', type: 'success' });
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar fuente?',
      message: '¿Estás seguro de que deseas eliminar este origen de leads?',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const res = await db.deleteSource(id);
        if (res.success) {
          addNotification({ title: 'Éxito', message: 'Fuente eliminada.', type: 'info' });
          load();
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5 border border-primary/20">
            <Share2 size={16} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-text-main tracking-tight">Fuentes de origen</h3>
            <p className="text-[9px] text-text-muted font-bold opacity-40">Canales de captación de leads</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end max-w-md">
          <div className="relative flex-1">
            <input
              className="w-full bg-input-bg dark:bg-input-bg border border-border-color/50 rounded-xl pl-4 pr-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/40 transition-all shadow-inner placeholder:text-text-muted/40"
              placeholder="Nueva fuente (ej: Instagram Ads)..."
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <button
            onClick={handleAdd}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold shadow-xl shadow-primary/20 transition-all active:scale-95 shrink-0"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>
      </div>
      <div className="bg-surface/30 backdrop-blur-xl border border-white/5 rounded-xl p-3 shadow-sm">
        <div className="flex flex-wrap gap-2.5">
          {sources.map(s => (
            <div key={s.id} className="flex items-center gap-2 bg-surface/50 border border-white/5 pl-3 pr-1 py-1 rounded-xl group hover:border-primary/30 transition-all shadow-sm">
              <span className="text-[10px] font-bold text-text-main tracking-tight">{s.name}</span>
              <button
                onClick={() => handleDelete(s.id)}
                className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {sources.length === 0 && (
            <div className="w-full py-12 text-center border-2 border-dashed border-white/5 rounded-xl bg-white/[0.02]">
              <Share2 size={40} className="mx-auto text-text-muted opacity-10 mb-4" />
              <p className="text-[11px] font-bold text-text-muted opacity-40 italic tracking-widest uppercase">Cero orígenes configurados</p>
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
    </div >
  );
};

export default Admin;
