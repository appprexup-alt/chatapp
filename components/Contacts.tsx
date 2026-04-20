
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Lead, Client, LeadStatus, Property } from '../types';
import {
  Search, Plus, LayoutGrid, List, Phone, Mail,
  MessageCircle, MapPin, Edit, Trash2, Eye, Filter, AlertCircle, DollarSign
} from 'lucide-react';
import { useNotification } from './NotificationContext';
import CustomModal from './CustomModal';

// Unified Type for Display
type UnifiedContact = {
  id: string;
  originalId: string;
  type: 'lead' | 'client';
  name: string;
  phone: string;
  email?: string;
  status: LeadStatus;
  notes?: string;
  sourceOrInterest?: string;
  createdAt?: string;
  interestedPropertyIds?: string[];
};

const Contacts: React.FC = () => {
  const { addNotification } = useNotification();
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('pipeline');
  const [contacts, setContacts] = useState<UnifiedContact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'lead' | 'client'>('all');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

  // Form/Detail State
  const [selectedContact, setSelectedContact] = useState<UnifiedContact | null>(null);
  const [phoneError, setPhoneError] = useState('');

  // Simplified Form State
  const [formData, setFormData] = useState<{
    type: 'lead' | 'client';
    name: string;
    phone: string;
    email: string;
    status: LeadStatus;
    notes: string;
    extraInfo: string; // Source for lead, Origin for client
  }>({
    type: 'lead',
    name: '',
    phone: '',
    email: '',
    status: LeadStatus.NEW,
    notes: '',
    extraInfo: ''
  });

  // Interest Management (for detail view)
  const [propertyToAdd, setPropertyToAdd] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [l, c, p] = await Promise.all([
      db.getLeads(),
      db.getClients(),
      db.getProperties()
    ]);

    const unifiedLeads: UnifiedContact[] = l.map(lead => ({
      id: `lead_${lead.id}`,
      originalId: lead.id,
      type: 'lead',
      name: lead.name,
      phone: lead.phone,
      status: lead.status as LeadStatus,
      sourceOrInterest: lead.interest || lead.source,
      notes: lead.source // Just storing source in notes for display simplicity if needed, or handle separately
    }));

    const unifiedClients: UnifiedContact[] = c.map(client => ({
      id: `client_${client.id}`,
      originalId: client.id,
      type: 'client',
      name: client.name,
      phone: client.phone,
      email: client.email,
      status: (client.status as LeadStatus) || LeadStatus.NEW,
      notes: client.notes,
      sourceOrInterest: client.origin,
      createdAt: client.createdAt,
      interestedPropertyIds: client.interestedPropertyIds
    }));

    setContacts([...unifiedLeads, ...unifiedClients]);
    setProperties(p);
  };

  // Filter Logic
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  // Pipeline Columns
  const pipelineColumns = [
    { id: LeadStatus.NEW, label: 'Nuevos', color: 'primary', hex: '#db2adf' },
    { id: LeadStatus.CONTACTED, label: 'Contactados', color: 'secondary', hex: '#8B5CF6' },
    { id: LeadStatus.INTERESTED, label: 'Interesados', color: 'amber-500', hex: '#F59E0B' },
    { id: LeadStatus.QUALIFIED, label: 'Calificados', color: 'orange-500', hex: '#F97316' },
    { id: LeadStatus.CLOSED, label: 'Cerrados', color: 'green-500', hex: '#10B981' },
    { id: LeadStatus.LOST, label: 'Perdidos', color: 'zinc-500', hex: '#71717A' },
  ];

  // Handlers
  const openAddModal = () => {
    setFormData({
      type: 'lead',
      name: '',
      phone: '',
      email: '',
      status: LeadStatus.NEW,
      notes: '',
      extraInfo: ''
    });
    setPhoneError('');
    setIsEditing(false);
    setShowAddModal(true);
  };

  const openEditModal = (contact: UnifiedContact) => {
    setFormData({
      type: contact.type,
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      status: contact.status,
      notes: contact.notes || '',
      extraInfo: contact.sourceOrInterest || ''
    });
    setPhoneError('');
    setSelectedContact(contact);
    setIsEditing(true);
    setShowAddModal(true);
  };

  const openDetailModal = (contact: UnifiedContact) => {
    setSelectedContact(contact);
    setShowDetailModal(true);
  };

  const handleDelete = async (contact: UnifiedContact) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar Contacto?',
      message: `¿Eliminar ${contact.type === 'client' ? 'cliente' : 'lead'} permanentemente?`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        let res;
        if (contact.type === 'lead') {
          res = await db.deleteLead(contact.originalId);
        } else {
          res = await db.deleteClient(contact.originalId);
        }

        if (res?.success) {
          addNotification({ title: 'Contacto Eliminado', message: 'Registro eliminado exitosamente.', type: 'info' });
          loadData();
          setShowDetailModal(false);
        } else {
          addNotification({ title: 'Error', message: res?.message || 'No se pudo eliminar.', type: 'error' });
        }
      }
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) return;

    // Phone Validation
    const phoneRegex = /^\+?[0-9\s-]{7,15}$/;
    if (!phoneRegex.test(formData.phone)) {
      setPhoneError('Número inválido (mín 7 dígitos)');
      return;
    }
    setPhoneError('');

    let res;

    if (formData.type === 'lead') {
      const leadData: Partial<Lead> = {
        name: formData.name,
        phone: formData.phone,
        status: formData.status,
        source: isEditing ? undefined : (formData.extraInfo || 'Manual'), // Preserve source if editing
        interest: formData.extraInfo,
        lastContact: new Date().toISOString()
      };

      if (isEditing && selectedContact?.type === 'lead') {
        res = await db.updateLead({ ...leadData, id: selectedContact.originalId } as Lead);
      } else {
        res = await db.addLead({ ...leadData, id: Math.random().toString(36).substr(2, 9) } as Lead);
      }
    } else {
      // Client
      const clientData: Partial<Client> = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        status: formData.status,
        notes: formData.notes,
        origin: (formData.extraInfo as any) || 'WhatsApp'
      };

      if (isEditing && selectedContact?.type === 'client') {
        // Preserve existing data we might not have in form
        const existingClient = await db.getClients().then(cs => cs.find(c => c.id === selectedContact.originalId));
        res = await db.updateClient({ ...existingClient, ...clientData, id: selectedContact.originalId } as Client);
      } else {
        res = await db.addClient({
          ...clientData,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
          interestedPropertyIds: []
        } as Client);
      }
    }

    if (res.success) {
      setShowAddModal(false);
      loadData();
      addNotification({ title: 'Guardado', message: 'Contacto actualizado correctamente.', type: 'success' });
    } else {
      addNotification({ title: 'Error', message: res.message || 'Error al guardar.', type: 'error' });
    }
  };

  const handleAddInterest = async () => {
    if (!selectedContact || selectedContact.type !== 'client' || !propertyToAdd) return;
    const allClients = await db.getClients();
    const realClient = allClients.find(c => c.id === selectedContact.originalId);
    if (realClient) {
      const currentInterests = realClient.interestedPropertyIds || [];
      if (!currentInterests.includes(propertyToAdd)) {
        await db.updateClient({ ...realClient, interestedPropertyIds: [...currentInterests, propertyToAdd] });
        const updatedContact = { ...selectedContact, interestedPropertyIds: [...currentInterests, propertyToAdd] };
        setSelectedContact(updatedContact);
        loadData();
      }
    }
    setPropertyToAdd('');
  };

  const handleRemoveInterest = async (propId: string) => {
    if (!selectedContact || selectedContact.type !== 'client') return;
    const allClients = await db.getClients();
    const realClient = allClients.find(c => c.id === selectedContact.originalId);
    if (realClient) {
      const currentInterests = realClient.interestedPropertyIds || [];
      await db.updateClient({ ...realClient, interestedPropertyIds: currentInterests.filter(id => id !== propId) });
      const updatedContact = { ...selectedContact, interestedPropertyIds: currentInterests.filter(id => id !== propId) };
      setSelectedContact(updatedContact);
      loadData();
    }
  };

  const getPropertiesForSelected = () => {
    if (!selectedContact || !selectedContact.interestedPropertyIds) return [];
    return properties.filter(p => selectedContact.interestedPropertyIds!.includes(p.id));
  };

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <div>
            <h2 className="text-3xl font-bold text-zinc-300">Contactos</h2>
            <p className="text-zinc-500">Unifica la gestión de Leads y Clientes</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-card-bg p-1 rounded-xl border border-border-color shadow-sm">
          <button onClick={() => setViewMode('pipeline')} className={`p-2 rounded-lg flex items-center gap-2 transition-colors ${viewMode === 'pipeline' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-500 hover:bg-background/20 hover:text-zinc-300'}`}>
            <LayoutGrid size={20} />
            <span className="text-sm font-medium hidden sm:inline">Pipeline</span>
          </button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-500 hover:bg-background/20 hover:text-zinc-300'}`}>
            <List size={20} />
            <span className="text-sm font-medium hidden sm:inline">Lista</span>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 shrink-0 px-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-primary" size={18} />
          <input
            type="text"
            placeholder="Buscar contactos, teléfonos o fuentes..."
            className="w-full bg-zinc-900/40 border border-primary/10 text-zinc-200 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-primary/40 focus:bg-zinc-900/60 shadow-inner transition-all placeholder:text-zinc-700 font-medium"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/40 rounded-2xl border border-primary/10 p-1.5 shadow-inner">
          <button onClick={() => setFilterType('all')} className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-600 hover:text-zinc-300'}`}>Todos</button>
          <button onClick={() => setFilterType('lead')} className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filterType === 'lead' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-600 hover:text-zinc-300'}`}>Leads</button>
          <button onClick={() => setFilterType('client')} className={`px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${filterType === 'client' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-600 hover:text-zinc-300'}`}>Clientes</button>
        </div>

        <button onClick={openAddModal} className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-primary/20 transition-all font-black text-[11px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95">
          <Plus size={18} />
          <span>Nuevo</span>
        </button>
      </div>

      {/* Views */}
      {viewMode === 'pipeline' ? (
        <div className="flex-1 overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-[1400px] h-full">
            {pipelineColumns.map(col => (
              <div key={col.id} className="flex-1 flex flex-col bg-zinc-950/40 rounded-3xl border border-primary/20 min-w-[300px] shadow-2xl overflow-hidden scroll-smooth transition-all duration-300">
                {/* Column Header */}
                <div
                  className="px-6 py-5 flex justify-between items-center sticky top-0 z-20 backdrop-blur-xl border-b border-white/20"
                  style={{ backgroundColor: `${col.hex}`, opacity: 0.85 }}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="font-black text-[13px] uppercase tracking-[0.25em] text-white drop-shadow-md">
                      {col.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-2xl border border-white/20 shadow-2xl">
                    <span className="text-white/60 text-[9px] font-black tracking-widest uppercase">Leads</span>
                    <span className="text-white text-[11px] font-black font-mono">
                      {filteredContacts.filter(c => c.status === col.id).length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-2 overflow-y-auto custom-scrollbar space-y-3">
                  {filteredContacts
                    .filter(c => c.status === col.id)
                    .map(contact => (
                      <div
                        key={contact.id}
                        onClick={() => contact.type === 'client' ? openDetailModal(contact) : openEditModal(contact)}
                        className={`bg-zinc-900/60 border-2 p-4 rounded-2xl shadow-sm cursor-pointer transition-all group relative hover:-translate-y-1 hover:shadow-xl ${contact.type === 'client' ? 'border-primary/30 bg-primary/[0.03]' : 'border-zinc-800/80 hover:border-zinc-700'}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-2.5 h-2.5 rounded-full shadow-lg"
                              style={{ backgroundColor: col.hex }}
                            />
                            <div className="flex flex-col">
                              <h4 className="font-black text-[13px] leading-tight text-white">
                                {contact.name}
                              </h4>
                              <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter mt-0.5">Asignado: Admin</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {contact.type === 'client' && <span className="text-[8px] bg-primary/20 text-primary border border-primary/20 px-1.5 rounded font-black shadow-inner">CLIENTE</span>}
                            <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 group-hover:text-primary transition-colors">
                              <LayoutGrid size={12} />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
                            <Phone size={11} className="text-zinc-600" />
                            <span>{contact.phone}</span>
                          </div>

                          {/* BUDGET / PRICE INDICATOR (Simulated if price in sourceOrInterest) */}
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[10px] font-black">
                              <DollarSign size={10} />
                              <span>{contact.sourceOrInterest?.match(/\$\s?\d+/) ? contact.sourceOrInterest.match(/\$\s?\d+/)[0] : '$ 10k+'}</span>
                            </div>
                          </div>

                          {/* TAGS / SOURCE */}
                          <div className="flex flex-wrap gap-1.5 font-bold">
                            {contact.sourceOrInterest?.includes('#') ? (
                              contact.sourceOrInterest.split(' ').map(tag => tag.startsWith('#') && (
                                <span key={tag} className="text-[9px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded italic">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-[9px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded-lg uppercase tracking-tight">
                                {contact.sourceOrInterest || 'Sin origen'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-border-color/30">
                          <div className="flex gap-3">
                            <button onClick={(e) => { e.stopPropagation(); openEditModal(contact); }} className="hover:text-primary text-zinc-600 transition-colors"><Edit size={13} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(contact); }} className="hover:text-danger text-zinc-600 transition-colors"><Trash2 size={13} /></button>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
                              <MessageCircle size={14} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // LIST VIEW
        <div className="bg-card-bg rounded-xl border border-border-color overflow-hidden flex-1 flex flex-col shadow-sm">
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-zinc-900 z-10">
                <tr className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.2em] border-b border-border-color/30">
                  <th className="p-5 font-black">Nombre / Tipo</th>
                  <th className="p-5 font-black">Contacto</th>
                  <th className="p-5 font-black">Estado</th>
                  <th className="p-5 font-black">Interés / Origen</th>
                  <th className="p-5 font-black text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {filteredContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-background/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-inner ${contact.type === 'client' ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-input-bg text-zinc-300 border border-border-color'}`}>
                          {contact.name.charAt(0)}
                        </div>
                        <div>
                          <p className={`font-bold text-[13px] ${contact.type === 'client' ? 'text-primary' : 'text-zinc-300'}`}>{contact.name}</p>
                          <span className="text-[9px] font-black uppercase tracking-tighter text-zinc-500">{contact.type === 'client' ? 'Cliente' : 'Prospect'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-[12px] text-zinc-500">
                        <span className="flex items-center gap-2 font-bold text-zinc-400"><Phone size={12} className="text-primary/50" /> {contact.phone}</span>
                        {contact.email && <span className="flex items-center gap-2"><Mail size={12} /> {contact.email}</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs border ${contact.status === LeadStatus.CLOSED ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                        contact.status === LeadStatus.NEW ? 'bg-primary/10 text-primary border-primary/20' :
                          'bg-input-bg text-text-muted border-border-color'
                        }`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-text-muted">
                      {contact.sourceOrInterest}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {contact.type === 'client' && (
                          <button onClick={() => openDetailModal(contact)} className="p-2 hover:text-primary text-text-muted" title="Ver Detalles"><Eye size={18} /></button>
                        )}
                        <button onClick={() => openEditModal(contact)} className="p-2 hover:text-primary text-text-muted" title="Editar"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(contact)} className="p-2 hover:text-danger text-text-muted" title="Eliminar"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
      }

      {/* ADD / EDIT MODAL */}
      {
        showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-border-color/30 rounded-none md:rounded-[2rem] w-full md:max-w-md shadow-2xl flex flex-col h-full md:h-auto md:max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-border-color/30 shrink-0 bg-zinc-900/50">
                <h3 className="text-xl font-black text-zinc-100 uppercase tracking-tight">{isEditing ? 'Editar Contacto' : 'Nuevo Contacto'}</h3>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 bg-zinc-950/20">
                {!isEditing && (
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="ctype" checked={formData.type === 'lead'} onChange={() => setFormData({ ...formData, type: 'lead' })} className="accent-primary" />
                      <span className="text-text-main">Lead</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="ctype" checked={formData.type === 'client'} onChange={() => setFormData({ ...formData, type: 'client' })} className="accent-primary" />
                      <span className="text-text-main">Cliente</span>
                    </label>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Nombre</label>
                  <input className="w-full bg-zinc-900/50 border border-border-color/30 rounded-xl p-3 text-zinc-300 focus:border-primary outline-none transition-all placeholder:text-zinc-700 font-medium" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Juan Perez" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Teléfono</label>
                  <input
                    className={`w-full bg-zinc-900/50 border rounded-xl p-3 text-zinc-300 focus:border-primary outline-none transition-all ${phoneError ? 'border-danger' : 'border-border-color/30'}`}
                    value={formData.phone}
                    onChange={e => { setFormData({ ...formData, phone: e.target.value }); setPhoneError(''); }}
                    placeholder="+51 999 999 999"
                  />
                  {phoneError && <div className="flex items-center gap-1 mt-1 text-[10px] text-danger font-bold"><AlertCircle size={12} /> {phoneError}</div>}
                </div>

                {formData.type === 'client' && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Email</label>
                    <input className="w-full bg-zinc-900/50 border border-border-color/30 rounded-xl p-3 text-zinc-300 focus:border-primary outline-none transition-all" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Estado</label>
                    <select className="w-full bg-zinc-900/50 border border-border-color/30 rounded-xl p-3 text-zinc-300 focus:border-primary outline-none appearance-none cursor-pointer" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as LeadStatus })}>
                      {Object.values(LeadStatus).map(s => <option key={s} value={s} className="bg-zinc-900">{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">{formData.type === 'lead' ? 'Fuente' : 'Origen'}</label>
                    <input className="w-full bg-zinc-900/50 border border-border-color/30 rounded-xl p-3 text-zinc-300 focus:border-primary outline-none transition-all" value={formData.extraInfo} onChange={e => setFormData({ ...formData, extraInfo: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 ml-1">Notas</label>
                  <textarea className="w-full bg-zinc-900/50 border border-border-color/30 rounded-xl p-3 text-zinc-300 h-24 resize-none focus:border-primary outline-none transition-all placeholder:text-zinc-700" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Detalles adicionales..." />
                </div>
              </div>
              <div className="p-6 border-t border-border-color/30 flex justify-end gap-3 bg-zinc-900/50 shrink-0">
                <button onClick={() => setShowAddModal(false)} className="px-6 py-2.5 text-zinc-500 hover:text-zinc-100 font-bold text-[11px] uppercase tracking-widest transition-colors">Cancelar</button>
                <button onClick={handleSave} className="px-8 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 font-black text-[11px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95">Guardar</button>
              </div>
            </div>
          </div>
        )
      }

      {/* CLIENT DETAILS MODAL */}
      {
        showDetailModal && selectedContact && selectedContact.type === 'client' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-border-color/30 rounded-none md:rounded-[2rem] w-full md:max-w-3xl shadow-2xl flex flex-col h-full md:h-auto md:max-h-[90vh] overflow-hidden">
              <div className="p-8 border-b border-border-color/30 flex justify-between items-start bg-zinc-900/50 shrink-0">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-primary/20 rotate-3 group-hover:rotate-0 transition-transform">
                    {selectedContact.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-zinc-100 flex items-center gap-4 tracking-tighter">
                      {selectedContact.name}
                      <span className={`text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border bg-zinc-950/40 ${pipelineColumns.find(c => c.id === selectedContact.status)?.color?.replace('border-', 'text-') || 'text-zinc-500'}`}>
                        {selectedContact.status}
                      </span>
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-zinc-500 text-sm font-medium">
                      <span className="flex items-center gap-2 border-r border-border-color/30 pr-4"><Phone size={14} className="text-primary/50" /> {selectedContact.phone}</span>
                      {selectedContact.email && <span className="flex items-center gap-2"><Mail size={14} className="text-secondary/50" /> {selectedContact.email}</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="text-zinc-600 hover:text-zinc-100 p-2 transition-colors"><Eye size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-zinc-950/20">
                {/* Notes Section */}
                <div className="relative group">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
                    <MessageCircle size={14} className="text-primary" /> Notas de Gestión
                  </h4>
                  <div className="bg-zinc-900/50 p-6 rounded-2xl border border-border-color/30 text-zinc-300 leading-relaxed text-sm shadow-inner group-hover:border-primary/20 transition-colors">
                    {selectedContact.notes || "No hay notas adicionales registradas en este perfil."}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                      <MapPin size={14} className="text-primary" /> Propiedades de Interés
                    </h4>
                    <div className="flex gap-3">
                      <select className="bg-zinc-900 border border-border-color/30 rounded-xl px-4 py-2 text-xs text-zinc-300 outline-none focus:border-primary w-56 appearance-none shadow-inner" value={propertyToAdd} onChange={(e) => setPropertyToAdd(e.target.value)}>
                        <option value="" className="bg-zinc-900">Agregar propiedad...</option>
                        {properties.filter(p => !selectedContact.interestedPropertyIds?.includes(p.id)).map(p => (<option key={p.id} value={p.id} className="bg-zinc-900">{p.projectName} - {p.lotNumber}</option>))}
                      </select>
                      <button onClick={handleAddInterest} disabled={!propertyToAdd} className="bg-primary hover:bg-primary/90 disabled:opacity-30 text-white w-9 h-9 flex items-center justify-center rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"><Plus size={18} /></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getPropertiesForSelected().map(prop => (
                      <div key={prop.id} className="bg-zinc-900/60 border border-border-color/30 rounded-2xl p-4 flex flex-col gap-3 relative group hover:border-primary/30 transition-all shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-bold text-[14px] text-zinc-100">{prop.projectName}</h5>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Lote {prop.lotNumber}</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter bg-zinc-950/40 text-primary border border-primary/20">{prop.status}</span>
                        </div>
                        <button onClick={() => handleRemoveInterest(prop.id)} className="absolute -top-2 -right-2 p-1.5 bg-zinc-900 text-zinc-600 hover:text-danger hover:bg-danger/10 rounded-xl border border-border-color/30 shadow-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={13} /></button>
                      </div>
                    ))}
                    {getPropertiesForSelected().length === 0 && <p className="col-span-full text-zinc-600 text-[11px] font-bold uppercase tracking-wide italic p-6 bg-zinc-900/40 rounded-2xl border border-dashed border-border-color/30 text-center">No hay propiedades asociadas en este momento.</p>}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-border-color/30 flex justify-end bg-zinc-900/50 shrink-0">
                <button onClick={() => setShowDetailModal(false)} className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl shadow-lg font-black text-[11px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95">Cerrar Detalle</button>
              </div>
            </div>
          </div>
        )
      }
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

export default Contacts;
