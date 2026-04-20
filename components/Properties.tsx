
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Property, PropertyStatus, Developer } from '../types';
import { Plus, Filter, Search, MapPin, Building, Edit, Trash2, DollarSign, X, AlertTriangle, Save, Image as ImageIcon, Upload, ChevronLeft, ChevronRight, Tag, ChevronDown, LayoutGrid } from 'lucide-react';
import { useNotification } from './NotificationContext';
import CustomModal from './CustomModal';

const Properties: React.FC = () => {
  const { addNotification } = useNotification();

  // Properties State
  const [properties, setProperties] = useState<Property[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);

  // Shared State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Search & Filter State
  const [filterText, setFilterText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all'); // New Project Filter
  const [filterMinArea, setFilterMinArea] = useState<string>('');
  const [filterMaxArea, setFilterMaxArea] = useState<string>('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Delete Modal State
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);

  // Save Modal State
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Form Selection State
  const [selectedDevFilter, setSelectedDevFilter] = useState<string>('');

  // Property Form State
  const [currentProp, setCurrentProp] = useState<Partial<Property>>({
    status: PropertyStatus.AVAILABLE,
    currency: 'USD',
    features: [],
    description: '',
    images: []
  });

  const [featureInput, setFeatureInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Current User State
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('inmocrm_user') || 'null');
    setCurrentUser(user);
    loadData();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterText, filterStatus, filterProject, filterMinArea, filterMaxArea]);

  const loadData = async () => {
    const [p, d] = await Promise.all([
      db.getProperties(),
      db.getDevelopers()
    ]);
    setProperties(p);
    setDevelopers(d);
  };

  // --- PROPERTY MODAL HANDLERS ---
  const openAddModal = () => {
    setCurrentProp({ status: PropertyStatus.AVAILABLE, currency: 'USD', features: [], description: '', images: [] });
    setFeatureInput('');
    setIsEditing(false);
    setSelectedDevFilter('');
    setShowModal(true);
  };

  const openEditModal = (prop: Property) => {
    setCurrentProp({ ...prop });
    setFeatureInput('');
    setIsEditing(true);

    const dev = developers.find(d => d.id === prop.developerId);
    setSelectedDevFilter(dev?.developerName || '');

    setShowModal(true);
  };

  const executeSaveIncome = () => { }; // Removed
  const confirmDeleteIncome = () => { }; // Removed

  const confirmDelete = async () => {
    if (propertyToDelete) {
      const res = await db.deleteProperty(propertyToDelete);
      if (res.success) {
        addNotification({ title: 'Propiedad Eliminada', message: 'La propiedad ha sido removida del inventario.', type: 'info' });
        loadData();
      } else {
        addNotification({ title: 'Error', message: res.message || 'No se pudo eliminar.', type: 'error' });
      }
      setPropertyToDelete(null);
    }
  };

  const handleAddFeature = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!featureInput.trim()) return;
    const currentFeatures = currentProp.features || [];
    if (!currentFeatures.includes(featureInput.trim())) {
      setCurrentProp({ ...currentProp, features: [...currentFeatures, featureInput.trim()] });
    }
    setFeatureInput('');
  };

  const handleRemoveFeature = (feature: string) => {
    const currentFeatures = currentProp.features || [];
    setCurrentProp({ ...currentProp, features: currentFeatures.filter(f => f !== feature) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFeature();
    }
  };

  const handleProjectChange = (devId: string) => {
    const selectedDev = developers.find(d => d.id === devId);
    if (selectedDev) {
      setCurrentProp({
        ...currentProp,
        developerId: devId,
        projectName: selectedDev.name
      });
    } else {
      setCurrentProp({ ...currentProp, developerId: devId, projectName: '' });
    }
  };

  const handleSaveClick = () => {
    if (!currentProp.developerId || !currentProp.price) {
      addNotification({ title: 'Datos incompletos', message: 'Seleccione proyecto y precio.', type: 'warning' });
      return;
    }
    setShowSaveConfirm(true);
  };

  const executeSave = async () => {
    const propertyData = {
      ...currentProp,
      area: Number(currentProp.area),
      price: Number(currentProp.price),
    } as Property;

    let res;
    if (isEditing && currentProp.id) {
      res = await db.updateProperty(propertyData);
      if (res.success) addNotification({ title: 'Propiedad Actualizada', message: 'Los cambios han sido guardados.', type: 'success' });
    } else {
      res = await db.addProperty({
        ...propertyData,
        id: Math.random().toString(36).substr(2, 9),
      });
      if (res.success) addNotification({ title: 'Propiedad Agregada', message: 'Nueva propiedad disponible en inventario.', type: 'success' });
    }

    if (res.success) {
      setShowSaveConfirm(false);
      setShowModal(false);
      loadData();
      setCurrentProp({ status: PropertyStatus.AVAILABLE, features: [], description: '' });
    } else {
      addNotification({ title: 'Error', message: res.message || 'Error al guardar propiedad.', type: 'error' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingImage(true);

    const newImages = [...(currentProp.images || [])];

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      const url = await db.uploadImage(file);
      if (url) {
        newImages.push(url);
      }
    }

    setCurrentProp({ ...currentProp, images: newImages });
    setUploadingImage(false);
    if (imageInputRef.current) imageInputRef.current.value = ''; // Reset input
  };

  const removeImage = (index: number) => {
    const newImages = [...(currentProp.images || [])];
    newImages.splice(index, 1);
    setCurrentProp({ ...currentProp, images: newImages });
  };

  const clearFilters = () => {
    setFilterText('');
    setFilterStatus('all');
    setFilterProject('all');
    setFilterMinArea('');
    setFilterMaxArea('');
  };

  // 1. Filtering Logic (Properties)
  const filteredProps = properties.filter(p => {
    const dev = developers.find(d => d.id === p.developerId);
    const devName = dev?.name || '';
    const companyName = dev?.developerName || '';

    const matchesText =
      p.projectName.toLowerCase().includes(filterText.toLowerCase()) ||
      p.location.toLowerCase().includes(filterText.toLowerCase()) ||
      p.lotNumber.toLowerCase().includes(filterText.toLowerCase()) ||
      devName.toLowerCase().includes(filterText.toLowerCase()) ||
      companyName.toLowerCase().includes(filterText.toLowerCase());

    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesProject = filterProject === 'all' || p.developerId === filterProject;

    const area = Number(p.area);
    const min = filterMinArea ? Number(filterMinArea) : 0;
    const max = filterMaxArea ? Number(filterMaxArea) : Infinity;
    const matchesArea = area >= min && area <= max;

    return matchesText && matchesStatus && matchesProject && matchesArea;
  });

  // 2. Pagination Logic
  const itemsToPaginate = filteredProps;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = itemsToPaginate.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(itemsToPaginate.length / itemsPerPage);

  const getStatusBadgeColor = (status: PropertyStatus) => {
    switch (status) {
      case PropertyStatus.AVAILABLE:
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case PropertyStatus.RESERVED:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case PropertyStatus.SOLD:
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-text-muted/10 text-text-muted border-text-muted/20';
    }
  };

  const uniqueDeveloperCompanies = Array.from(new Set(developers.map(d => d.developerName).filter(Boolean))) as string[];

  // Mobile Interaction State
  const [activeMobileId, setActiveMobileId] = useState<string | null>(null);

  const toggleMobileAction = (id: string) => {
    setActiveMobileId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-100px)]">
      <div className="flex flex-col gap-4 shrink-0">
        {/* Mobile-only Header */}
        <div className="md:hidden">
          <h2 className="text-xl font-bold text-electric-accent flex items-center gap-1.5">
            Propiedades
            <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">STOCK</span>
          </h2>
        </div>

        {/* Action Bar (Search & Main Actions) */}
        <div className="bg-surface p-1.5 md:p-1.5 rounded-xl border border-border-color flex flex-row items-center gap-1.5 md:gap-2 shadow-sm relative overflow-hidden">
          {/* Mobile Single Row Actions */}
          <div className={`flex-1 flex items-center gap-1.5 transition-all duration-300 ${showMobileSearch ? 'w-full' : 'w-auto'}`}>
            {/* Desktop Search / Mobile Expandable Search */}
            <div className={`relative group flex-1 ${!showMobileSearch ? 'hidden md:block' : 'block'}`}>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" size={14} />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full bg-input-bg border border-border-color text-text-main text-[11px] font-bold rounded-lg pl-10 pr-4 py-1.5 placeholder:text-text-muted/40 focus:border-primary outline-none transition-all"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
              {showMobileSearch && (
                <button
                  onClick={() => setShowMobileSearch(false)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 md:hidden text-text-muted hover:text-text-main"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Mobile Search Trigger Icon */}
            {!showMobileSearch && (
              <button
                onClick={() => setShowMobileSearch(true)}
                className="md:hidden w-10 h-10 flex items-center justify-center bg-input-bg text-text-muted border border-border-color rounded-xl active:scale-95 transition-all"
              >
                <Search size={16} />
              </button>
            )}

            {/* Mobile Actions (Filter & Add) in same row */}
            {!showMobileSearch && (
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center justify-center w-8 h-8 md:w-auto md:px-3 md:py-1.5 text-[10px] font-bold rounded-lg transition-all border ${showFilters
                    ? 'bg-primary/10 border-primary/20 text-primary shadow-inner'
                    : 'bg-input-bg text-text-muted hover:text-primary border-border-color'
                    }`}
                >
                  <Filter size={14} />
                  <span className="hidden md:inline ml-2">Filtros</span>
                </button>
                {currentUser?.role !== 'Agent' && (
                  <button
                    onClick={openAddModal}
                    className="bg-primary hover:bg-primary/95 text-white w-8 h-8 md:w-auto md:px-4 md:py-1.5 rounded-lg flex items-center justify-center md:gap-2 transition-all shadow-sm shrink-0 group active:scale-95"
                  >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                    <span className="hidden md:inline font-bold text-[10px]">Nueva Propiedad</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {
          showFilters && (
            <div className="bg-surface border border-border-color rounded-[2.5rem] p-5 grid grid-cols-1 md:grid-cols-5 gap-4 animate-in slide-in-from-top-2 shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                <Filter size={80} className="text-primary -rotate-12" />
              </div>

              <>
                <div className="relative z-10">
                  <label className="block text-[10px] font-bold text-text-muted mb-1.5 px-1 opacity-60">Proyecto</label>
                  <div className="relative group/select">
                    <select
                      className="w-full bg-input-bg border border-border-color rounded-2xl px-5 py-2.5 text-[10px] font-bold text-text-main outline-none focus:border-primary transition-all shadow-inner appearance-none cursor-pointer"
                      value={filterProject}
                      onChange={(e) => setFilterProject(e.target.value)}
                    >
                      <option value="all">Todos los proyectos</option>
                      {developers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                  </div>
                </div>
                <div className="relative z-10">
                  <label className="block text-[10px] font-bold text-text-muted mb-1.5 px-1 opacity-60">Estado</label>
                  <div className="relative group/select">
                    <select
                      className="w-full bg-input-bg border border-border-color rounded-2xl px-5 py-2.5 text-[10px] font-bold text-text-main outline-none focus:border-primary transition-all shadow-inner appearance-none cursor-pointer"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">Todos los estados</option>
                      {Object.values(PropertyStatus).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                  </div>
                </div>
                <div className="relative z-10">
                  <label className="block text-[10px] font-bold text-text-muted mb-1.5 px-1 opacity-60">Área mín (m²)</label>
                  <input
                    type="number"
                    className="w-full bg-input-bg border border-border-color rounded-2xl px-5 py-2.5 text-[10px] font-bold text-text-main outline-none focus:border-primary transition-all shadow-inner placeholder:text-text-muted/40"
                    placeholder="Ej: 100"
                    value={filterMinArea}
                    onChange={(e) => setFilterMinArea(e.target.value)}
                  />
                </div>
                <div className="relative z-10">
                  <label className="block text-[10px] font-bold text-text-muted mb-1.5 px-1 opacity-60">Área máx (m²)</label>
                  <input
                    type="number"
                    className="w-full bg-input-bg border border-border-color rounded-2xl px-5 py-2.5 text-[10px] font-bold text-text-main outline-none focus:border-primary transition-all shadow-inner placeholder:text-text-muted/40"
                    placeholder="Ej: 500"
                    value={filterMaxArea}
                    onChange={(e) => setFilterMaxArea(e.target.value)}
                  />
                </div>
              </>

              <div className="flex items-end relative z-10">
                <button
                  onClick={clearFilters}
                  className="w-full bg-input-bg hover:bg-danger/10 border border-border-color text-[10px] font-bold text-text-muted hover:text-danger px-4 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                >
                  <X size={14} />
                  Limpiar filtros
                </button>
              </div>
            </div>
          )
        }


      </div>

      {/* Main Content Area: List with Pagination (Desktop: Table, Mobile: Cards) */}
      <div className="flex-1 min-h-0 bg-surface rounded-2xl border border-border-color overflow-hidden shadow-2xl shadow-black/5 flex flex-col relative transition-all">

        {/* Main Content Area: List with Pagination (Always Table with Horizontal Scroll) */}
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar pb-4">
          <table className="w-full text-left border-collapse table-fixed min-w-[950px]">
            <thead>
              <tr className="border-b border-border-color bg-surface/50 sticky top-0 z-10 backdrop-blur-md">
                <th className="px-4 py-2 text-[9px] font-bold text-text-muted uppercase tracking-wider opacity-60 w-[200px]">Propiedad</th>
                <th className="px-4 py-2 text-[9px] font-bold text-text-muted uppercase tracking-wider opacity-60 w-[100px]">Precio</th>
                <th className="px-4 py-2 text-[9px] font-bold text-text-muted uppercase tracking-wider opacity-60 w-[90px]">Área</th>
                <th className="px-4 py-2 text-[9px] font-bold text-text-muted uppercase tracking-wider opacity-60 w-[120px]">Ubicación</th>
                <th className="px-4 py-2 text-[9px] font-bold text-text-muted uppercase tracking-wider opacity-60 w-[160px]">Detalles</th>
                <th className="px-4 py-2 text-[9px] font-bold text-text-muted uppercase tracking-wider opacity-60 w-[80px]">Estado</th>
                <th className="px-4 py-2 text-[9px] font-bold text-text-muted uppercase tracking-wider opacity-60 text-right w-[70px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-color">
              {// PROPERTIES LIST
                currentItems.map(item => {
                  const prop = item as Property;
                  const dev = developers.find(d => d.id === prop.developerId);
                  const pricePerM2 = prop.area > 0 ? (prop.price / prop.area) : 0;

                  return (
                    <tr key={prop.id} className="hover:bg-primary/[0.02] transition-all group cursor-default relative">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-input-bg border border-border-color overflow-hidden flex items-center justify-center shrink-0 shadow-inner group-hover:border-primary/20 transition-all">
                            {prop.images?.[0] ? (
                              <img src={prop.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Building size={16} className="text-text-muted opacity-20" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-xs text-text-main truncate tracking-tight">
                              {dev ? dev.name : (prop.projectName || 'Sin proyecto')}
                            </h4>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-border-color">Lote {prop.lotNumber}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-primary tracking-tight">
                            {prop.price > 0 ? `${prop.currency === 'PEN' ? 'S/' : '$'} ${prop.price.toLocaleString()}` : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 leading-tight">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-text-main">{prop.area} m²</span>
                          <span className="text-[10px] font-bold text-text-muted opacity-40">
                            {pricePerM2 > 0 ? `${prop.currency === 'PEN' ? 'S/' : '$'} ${pricePerM2.toLocaleString(undefined, { maximumFractionDigits: 2 })}/m²` : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-text-muted">
                          <MapPin size={12} className="shrink-0 text-primary opacity-30" />
                          <span className="text-[11px] font-medium truncate opacity-60">{prop.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1.5">
                          {prop.description && (
                            <p className="text-[10px] text-text-muted line-clamp-1 opacity-60 leading-snug">
                              {prop.description}
                            </p>
                          )}
                          {prop.features && prop.features.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {prop.features.slice(0, 3).map((f, i) => (
                                <span key={i} className="text-[9px] font-bold text-text-muted bg-primary/5 border border-border-color px-2 py-0.5 rounded-lg leading-none">
                                  {f}
                                </span>
                              ))}
                              {prop.features.length > 3 && (
                                <span className="text-[9px] font-bold text-text-muted opacity-30">+{prop.features.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-[10px] font-bold border shadow-sm ${getStatusBadgeColor(prop.status)}`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {currentUser?.role !== 'Agent' && (
                          <div className="flex justify-end items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                            <button
                              onClick={() => openEditModal(prop)}
                              className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl transition-all active:scale-90"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => setPropertyToDelete(prop.id)}
                              className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all active:scale-90"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {currentItems.length === 0 && (
            <div className="p-12 text-center text-text-muted">
              <Building size={48} className="mx-auto mb-3 opacity-20" />
              <p>No se encontraron registros.</p>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {
          itemsToPaginate.length > 0 && (
            <div className="px-6 py-3 border-t border-border-color bg-surface/80 backdrop-blur-md flex items-center justify-between shrink-0 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-primary/20" />
              <div className="text-[10px] font-bold text-text-muted hidden md:flex items-center gap-1.5">
                <span className="opacity-40">Inventario</span>
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                <span className="text-text-main tracking-tight">{Math.min(indexOfFirstItem + 1, itemsToPaginate.length)}-{Math.min(indexOfLastItem, itemsToPaginate.length)}</span>
                <span className="opacity-40 font-medium">de {itemsToPaginate.length}</span>
              </div>

              <div className="flex items-center gap-2.5 mx-auto md:mx-0">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-input-bg border border-border-color hover:border-primary/40 hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed text-text-muted transition-all active:scale-95 shadow-inner"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center">
                  <span className="text-[10px] font-bold text-text-main tracking-tight bg-black/20 px-4 py-2 rounded-xl border border-border-color shadow-inner">
                    Pág <span className="text-primary mx-0.5">{currentPage}</span> <span className="opacity-20 mx-0.5">/</span> <span className="opacity-40">{totalPages}</span>
                  </span>
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-input-bg border border-border-color hover:border-primary/40 hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed text-text-muted transition-all active:scale-95 shadow-inner"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )
        }
      </div>



      {/* Add/Edit Modal (Property) */}
      {
        showModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-surface border border-border-color rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 overflow-hidden relative">
              {/* Modal Header */}
              <div className="p-5 border-b border-border-color flex justify-between items-center bg-surface relative overflow-hidden shrink-0">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                <div className="flex gap-2.5 items-center relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-inner">
                    <Building size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-main tracking-tight leading-tight">
                      {isEditing ? 'Editar propiedad' : 'Nueva propiedad'}
                    </h3>
                    <p className="text-[10px] font-medium text-text-muted">Gestión de inventario premium</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-main hover:bg-black/5 rounded-lg transition-all active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar scroll-smooth">
                {/* 1. Información General */}
                <div className="bg-surface border border-white/5 rounded-2xl p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-1.5 pt-1">
                    <Building size={14} className="text-primary" />
                    <h5 className="text-[11px] font-bold text-text-main uppercase tracking-wider">Información General</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">PROYECTO / DESARROLLADORA</label>
                      <div className="relative group/select">
                        <select
                          className="w-full bg-input-bg border border-border-color rounded-xl px-3.5 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all"
                          value={selectedDevFilter}
                          onChange={(e) => {
                            setSelectedDevFilter(e.target.value);
                            setCurrentProp({ ...currentProp, developerId: '', projectName: '' });
                          }}
                        >
                          <option value="">Seleccionar empresa...</option>
                          {uniqueDeveloperCompanies.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">ETAPA / PROYECTO ESPECÍFICO</label>
                      <div className="relative group/select">
                        <select
                          className="w-full bg-input-bg border border-border-color rounded-xl px-3.5 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer disabled:opacity-50 transition-all"
                          value={currentProp.developerId || ''}
                          onChange={e => handleProjectChange(e.target.value)}
                          disabled={!selectedDevFilter}
                        >
                          <option value="">Seleccionar etapa...</option>
                          {developers
                            .filter(d => d.developerName === selectedDevFilter)
                            .map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))
                          }
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">LOTE / UNIDAD NO.</label>
                      <input
                        className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all placeholder:opacity-30"
                        value={currentProp.lotNumber || ''}
                        onChange={e => setCurrentProp({ ...currentProp, lotNumber: e.target.value })}
                        placeholder="Ej: Mz A L5"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">ESTADO ACTUAL</label>
                      <div className="relative group/select">
                        <select
                          className="w-full bg-input-bg border border-border-color rounded-xl px-3.5 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all"
                          value={currentProp.status}
                          onChange={(e) => setCurrentProp({ ...currentProp, status: e.target.value as PropertyStatus })}
                        >
                          {Object.values(PropertyStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Detalles Financieros y Medidas */}
                <div className="bg-surface border border-white/5 rounded-2xl p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pt-1">
                    <DollarSign size={14} className="text-emerald-500" />
                    <h5 className="text-[11px] font-bold text-text-main uppercase tracking-wider">Detalles Económicos y Área</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">PRECIO VENTA</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-[10px]">
                          {currentProp.currency === 'PEN' ? 'S/' : '$'}
                        </span>
                        <input
                          type="number"
                          className="w-full bg-input-bg border border-border-color rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-emerald-500 outline-none focus:border-primary shadow-inner transition-all"
                          value={currentProp.price || ''}
                          onChange={e => setCurrentProp({ ...currentProp, price: Number(e.target.value) })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">MONEDA</label>
                      <div className="relative group/select">
                        <select
                          className="w-full bg-input-bg border border-border-color rounded-xl px-3.5 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all"
                          value={currentProp.currency || 'USD'}
                          onChange={e => setCurrentProp({ ...currentProp, currency: e.target.value })}
                        >
                          <option value="USD">USD - Dólares</option>
                          <option value="PEN">PEN - Soles</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">ÁREA TOTAL (M²)</label>
                      <div className="relative">
                        <LayoutGrid size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40" />
                        <input
                          type="number"
                          className="w-full bg-input-bg border border-border-color rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all"
                          value={currentProp.area || ''}
                          onChange={e => setCurrentProp({ ...currentProp, area: Number(e.target.value) })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Ubicación y Características */}
                <div className="bg-surface border border-white/5 rounded-2xl p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pt-1">
                    <MapPin size={14} className="text-secondary" />
                    <h5 className="text-[11px] font-bold text-text-main uppercase tracking-wider">Ubicación y Atributos</h5>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">UBICACIÓN / REFERENCIA</label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40" />
                        <input
                          className="w-full bg-input-bg border border-border-color rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all placeholder:opacity-30"
                          value={currentProp.location || ''}
                          onChange={e => setCurrentProp({ ...currentProp, location: e.target.value })}
                          placeholder="Ej: Frente a parque, esquina, etc..."
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">CARACTERÍSTICAS (TAGS)</label>
                      <div className="flex gap-1.5">
                        <div className="relative flex-1">
                          <Tag size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40" />
                          <input
                            className="w-full bg-input-bg border border-border-color rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all placeholder:opacity-30"
                            placeholder="Ej: Vista al mar, agua blanca..."
                            value={featureInput}
                            onChange={e => setFeatureInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                          />
                        </div>
                        <button
                          onClick={(e) => handleAddFeature(e)}
                          type="button"
                          className="w-9 h-9 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center shrink-0 active:scale-95"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      {currentProp.features && currentProp.features.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {currentProp.features.map((f, i) => (
                            <span key={i} className="bg-primary/5 text-primary text-[9px] font-black px-2.5 py-1 rounded-lg border border-primary/10 flex items-center gap-1.5 cursor-pointer hover:bg-danger/10 hover:text-danger hover:border-danger/20 transition-all group animate-in zoom-in-90" onClick={() => handleRemoveFeature(f)}>
                              {f}
                              <X size={10} className="opacity-40 group-hover:opacity-100" />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">DESCRIPCIÓN ADICIONAL</label>
                      <textarea
                        className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-3 text-xs font-medium text-text-main h-20 resize-none outline-none focus:border-primary shadow-inner transition-all placeholder:opacity-30 leading-relaxed custom-scrollbar"
                        placeholder="Detalles específicos sobre la propiedad, medidas exactas, etc..."
                        value={currentProp.description || ''}
                        onChange={e => setCurrentProp({ ...currentProp, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Galería de Imágenes */}
                <div className="bg-surface border border-white/5 rounded-2xl p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pt-1">
                    <ImageIcon size={14} className="text-primary" />
                    <h5 className="text-[11px] font-bold text-text-main uppercase tracking-wider">Multimedia</h5>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-5 gap-1.5">
                    {currentProp.images?.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-xl border border-border-color overflow-hidden relative group bg-black/5 shadow-inner">
                        <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                          <button
                            onClick={() => removeImage(idx)}
                            className="w-7 h-7 bg-danger text-white rounded-xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="aspect-square rounded-xl border-2 border-dashed border-border-color flex flex-col items-center justify-center text-text-muted hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all gap-1.5 bg-black/5 shadow-inner group"
                    >
                      {uploadingImage ? (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Upload size={18} className="text-text-muted/30 group-hover:text-primary transition-colors" />
                          <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Añadir</span>
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type="file"
                    ref={imageInputRef}
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-border-color bg-surface flex justify-between items-center gap-4 shrink-0">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-[10px] font-bold text-text-muted hover:text-text-main transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveClick}
                  className="bg-primary hover:bg-primary/95 text-white px-6 py-2 rounded-xl text-[10px] font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Save size={14} />
                  {isEditing ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      <CustomModal
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={executeSave}
        title="¿Confirmar cambios?"
        message={`Se ${isEditing ? 'actualizará la propiedad' : 'creará una nueva propiedad'} en el sistema de inventario.`}
        type="confirm"
        icon={<Save size={32} className="text-primary" />}
      />

      <CustomModal
        isOpen={!!propertyToDelete}
        onClose={() => setPropertyToDelete(null)}
        onConfirm={confirmDelete}
        title="¿Eliminar propiedad?"
        message="Esta acción es irreversible y eliminará todos los datos asociados al lote. ¿Deseas continuar?"
        type="danger"
        confirmText="Eliminar"
      />

    </div >
  );
};

export default Properties;
