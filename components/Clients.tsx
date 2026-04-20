
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Client, Property } from '../types';
import { Search, Phone, Mail, UserPlus, MessageCircle, Eye, MapPin, X, Plus, Trash2, DollarSign, Edit, AlertCircle } from 'lucide-react';
import CustomModal from './CustomModal';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [propertyToAdd, setPropertyToAdd] = useState<string>('');
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

  // Validation State
  const [phoneError, setPhoneError] = useState('');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  const [currentClient, setCurrentClient] = useState<Partial<Client>>({
    origin: 'WhatsApp'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [c, p] = await Promise.all([
      db.getClients(),
      db.getProperties()
    ]);
    setClients(c);
    setProperties(p);
  };

  const openAddModal = () => {
    setCurrentClient({ origin: 'WhatsApp', name: '', phone: '', email: '', notes: '' });
    setPhoneError('');
    setIsEditing(false);
    setShowAddModal(true);
  };

  const openEditModal = (client: Client) => {
    setCurrentClient({ ...client });
    setPhoneError('');
    setIsEditing(true);
    setShowAddModal(true);
  };

  const handleDeleteClient = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar Cliente?',
      message: '¿Estás seguro de que deseas eliminar este cliente? Se perderán sus notas e historial.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        await db.deleteClient(id);
        loadData();
        if (selectedClient?.id === id) setSelectedClient(null);
      }
    });
  };

  const handleSaveClient = async () => {
    if (!currentClient.name || !currentClient.phone) return;

    // Phone Validation
    const phoneRegex = /^\+?[0-9\s-]{7,15}$/;
    if (!phoneRegex.test(currentClient.phone)) {
      setPhoneError('Número inválido');
      return;
    }
    setPhoneError('');

    if (isEditing && currentClient.id) {
      await db.updateClient(currentClient as Client);
    } else {
      await db.addClient({
        ...currentClient,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        interestedPropertyIds: []
      } as Client);
    }

    setShowAddModal(false);
    loadData();
  };

  const handleAddInterest = async () => {
    if (!selectedClient || !propertyToAdd) return;
    const currentInterests = selectedClient.interestedPropertyIds || [];
    if (currentInterests.includes(propertyToAdd)) return;

    const updatedClient = {
      ...selectedClient,
      interestedPropertyIds: [...currentInterests, propertyToAdd]
    };

    await db.updateClient(updatedClient);
    setSelectedClient(updatedClient);
    setPropertyToAdd('');
    loadData();
  };

  const handleRemoveInterest = async (propertyId: string) => {
    if (!selectedClient) return;
    const currentInterests = selectedClient.interestedPropertyIds || [];
    const updatedClient = {
      ...selectedClient,
      interestedPropertyIds: currentInterests.filter(id => id !== propertyId)
    };

    await db.updateClient(updatedClient);
    setSelectedClient(updatedClient);
    loadData();
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const getInterestedProperties = (client: Client) => {
    if (!client.interestedPropertyIds) return [];
    return properties.filter(p => client.interestedPropertyIds!.includes(p.id));
  };

  return (
    <div className="space-y-4">
      {/* Mobile-only Header */}
      <div className="md:hidden pt-2">
        <h2 className="text-2xl font-bold text-electric-accent flex items-center gap-1.5">
          Clientes
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Base</span>
        </h2>
        <p className="text-xs text-text-muted font-bold opacity-60">Cartera de inversionistas y contactos</p>
      </div>

      {/* Action Bar (Search & Main Actions) */}
      <div className="bg-surface p-2 md:p-2 rounded-2xl border border-border-color flex flex-row items-center gap-1.5 md:gap-2.5 shadow-xl shadow-black/5 relative overflow-hidden shrink-0">
        <div className="flex-1 flex items-center gap-1.5 transition-all duration-300">
          {/* Search Bar */}
          <div className="relative group flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" size={14} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="w-full bg-input-bg border border-border-color text-text-main text-[11px] font-bold rounded-xl pl-10 pr-4 py-2 placeholder:text-text-muted/40 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all shadow-inner"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={openAddModal}
            className="bg-primary hover:bg-primary/95 text-white h-10 w-10 md:w-auto md:px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 group shrink-0"
          >
            <UserPlus size={18} className="group-hover:scale-110 transition-transform duration-300" />
            <span className="font-bold text-[10px] tracking-tight hidden md:inline">Nuevo Cliente</span>
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border-color overflow-hidden shadow-xl shadow-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-background/50 text-text-muted text-sm">
                <th className="p-4 font-medium">Nombre</th>
                <th className="p-4 font-medium">Contacto</th>
                <th className="p-4 font-medium">Origen</th>
                <th className="p-4 font-medium">Intereses</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {filteredClients.map(client => {
                const interests = getInterestedProperties(client);
                return (
                  <tr key={client.id} className="hover:bg-surface/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-text-main">{client.name}</p>
                          <p className="text-xs text-text-muted">Registrado: {new Date(client.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-text-muted text-sm">
                          <Phone size={14} />
                          <span>{client.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-text-muted text-sm">
                          <Mail size={14} />
                          <span>{client.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs bg-primary/10 text-primary border border-primary/20">
                        {client.origin}
                      </span>
                    </td>
                    <td className="p-4">
                      {interests.length > 0 ? (
                        <div className="flex -space-x-2 overflow-hidden">
                          {interests.slice(0, 3).map((p, i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-300" title={p.projectName}>
                              <MapPin size={12} />
                            </div>
                          ))}
                          {interests.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-300">
                              +{interests.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted italic">Sin propiedades asignadas</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Ver Detalles"
                        >
                          <Eye size={20} />
                        </button>
                        <button
                          onClick={() => openEditModal(client)}
                          className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={20} />
                        </button>
                        <button
                          onClick={() => handleDeleteClient(client.id)}
                          className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredClients.length === 0 && (
            <div className="p-8 text-center text-text-muted">
              No se encontraron clientes.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-color rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border-color">
              <h3 className="text-xl font-bold text-text-main">{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">Nombre Completo</label>
                <input
                  className="w-full bg-input-bg border border-border-color rounded-lg p-2 text-text-main"
                  value={currentClient.name || ''}
                  onChange={e => setCurrentClient({ ...currentClient, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Teléfono (WhatsApp)</label>
                <input
                  className={`w-full bg-input-bg border rounded-lg p-2 text-text-main ${phoneError ? 'border-danger' : 'border-border-color'}`}
                  value={currentClient.phone || ''}
                  onChange={e => { setCurrentClient({ ...currentClient, phone: e.target.value }); setPhoneError(''); }}
                  placeholder="+51 999 999 999"
                />
                {phoneError && <div className="flex items-center gap-1 mt-1 text-xs text-danger"><AlertCircle size={12} /> {phoneError}</div>}
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Email</label>
                <input
                  type="email"
                  className="w-full bg-input-bg border border-border-color rounded-lg p-2 text-text-main"
                  value={currentClient.email || ''}
                  onChange={e => setCurrentClient({ ...currentClient, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Fecha de Cumpleaños</label>
                <input
                  type="date"
                  className="w-full bg-input-bg border border-border-color rounded-lg p-2 text-text-main"
                  value={currentClient.birthDate || ''}
                  onChange={e => setCurrentClient({ ...currentClient, birthDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Notas</label>
                <textarea
                  className="w-full bg-input-bg border border-border-color rounded-lg p-2 text-text-main h-24 resize-none"
                  value={currentClient.notes || ''}
                  onChange={e => setCurrentClient({ ...currentClient, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="p-6 border-t border-border-color flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-text-muted hover:text-text-main"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveClient}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 text-sm font-bold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border-color rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border-color flex justify-between items-start bg-background/50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-primary/20 border-4 border-white/10">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-text-main">{selectedClient.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-text-muted text-sm font-medium">
                    <span className="flex items-center gap-1"><Phone size={14} /> {selectedClient.phone}</span>
                    <span className="w-1 h-1 rounded-full bg-border-color"></span>
                    <span className="flex items-center gap-1"><Mail size={14} /> {selectedClient.email}</span>
                    {selectedClient.birthDate && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-border-color"></span>
                        <span className="flex items-center gap-1">🎂 {new Date(selectedClient.birthDate).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-text-muted hover:text-text-main p-2 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

              {/* Notes Section */}
              <div>
                <h4 className="text-lg font-bold text-text-main mb-3 flex items-center gap-2">
                  <MessageCircle size={18} className="text-primary" /> Notas
                </h4>
                <div className="bg-input-bg p-4 rounded-xl border border-border-color text-text-main leading-relaxed shadow-inner">
                  {selectedClient.notes || "No hay notas registradas."}
                </div>
                <p className="text-xs text-text-muted mt-2 text-right italic font-medium">
                  Cliente desde: {new Date(selectedClient.createdAt).toLocaleDateString()}</p>
              </div>

              {/* Interested Properties Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-bold text-text-main flex items-center gap-2">
                    <MapPin size={18} className="text-primary" /> Propiedades de Interés
                  </h4>

                  <div className="flex gap-2">
                    <select
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-primary w-48"
                      value={propertyToAdd}
                      onChange={(e) => setPropertyToAdd(e.target.value)}
                    >
                      <option value="">Agregar propiedad...</option>
                      {properties
                        .filter(p => !selectedClient.interestedPropertyIds?.includes(p.id))
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.projectName} - {p.lotNumber}</option>
                        ))
                      }
                    </select>
                    <button
                      onClick={handleAddInterest}
                      disabled={!propertyToAdd}
                      className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white p-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getInterestedProperties(selectedClient).map(prop => (
                    <div key={prop.id} className="bg-background/40 border border-border-color rounded-xl p-4 flex flex-col gap-2 relative group hover:border-primary/30 transition-all shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-bold text-text-main text-sm">{prop.projectName}</h5>
                          <span className="text-[10px] text-text-muted font-bold font-mono">Lote {prop.lotNumber}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${prop.status === 'Disponible' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-text-muted/10 text-text-muted border-text-muted/20'
                          }`}>
                          {prop.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-bold text-text-main mt-1">
                        <span className="flex items-center gap-1 text-primary"><DollarSign size={14} /> {prop.price.toLocaleString()}</span>
                        <span className="w-1 h-1 rounded-full bg-border-color"></span>
                        <span>{prop.area} m²</span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] font-medium text-text-muted">
                        <MapPin size={12} /> {prop.location}
                      </div>

                      <button
                        onClick={() => handleRemoveInterest(prop.id)}
                        className="absolute top-2 right-2 p-1.5 bg-background text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-border-color"
                        title="Quitar de intereses"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {getInterestedProperties(selectedClient).length === 0 && (
                    <div className="col-span-full py-8 text-center border border-dashed border-border-color rounded-xl text-text-muted font-medium italic">
                      <MapPin size={32} className="mx-auto mb-2 opacity-20" />
                      <p>No ha mostrado interés en ninguna propiedad específica.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="p-6 border-t border-border-color flex justify-end bg-background/50">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-6 py-2 bg-input-bg hover:bg-border-color text-text-main font-bold rounded-xl transition-all shadow-sm active:scale-95 text-sm"
              >
                Cerrar
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

export default Clients;