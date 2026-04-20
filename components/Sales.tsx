
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Sale, Transaction, OtherIncome, Property, User as CRMUser, FinancialClient } from '../types';
import { format } from 'date-fns';
import {
    Plus,
    TrendingUp,
    TrendingDown,
    Wallet,
    PieChart,
    Building,
    User,
    ArrowUpRight,
    ArrowDownRight,
    X,
    Search,
    Filter,
    ChevronDown,
    Trash2,
    AlertTriangle,
    Calendar,
    Users,
    Briefcase,
    Baby,
    FileText,
    Edit2,
    Check,
    CheckCircle,
    Sparkles,
    MapPin
} from 'lucide-react';

const Sales: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'clients' | 'sales' | 'finance'>('clients');
    const [exchangeRate, setExchangeRate] = useState(3.85);
    const [showFinancialModal, setShowFinancialModal] = useState(false);
    const [financialType, setFinancialType] = useState<'income' | 'expense'>('income');
    const [incomeSubtype, setIncomeSubtype] = useState<'sale' | 'other'>('sale');

    // Date Filtering State
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const [sales, setSales] = useState<Sale[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [otherIncomes, setOtherIncomes] = useState<OtherIncome[]>([]);
    const [financialClients, setFinancialClients] = useState<FinancialClient[]>([]);
    const [properties, setProperties] = useState<Property[]>([]);
    const [agents, setAgents] = useState<CRMUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);

    // Client Details State
    const [selectedClient, setSelectedClient] = useState<FinancialClient | null>(null);
    const [showClientDetail, setShowClientDetail] = useState(false);
    const [isEditingClient, setIsEditingClient] = useState(false);

    // New Client State
    const [registerNewClient, setRegisterNewClient] = useState(false);
    const [newClient, setNewClient] = useState<Partial<FinancialClient>>({ civilStatus: 'Soltero' });

    const [newSale, setNewSale] = useState<Partial<Sale>>({ currency: 'USD', status: 'completed' });
    const [newTx, setNewTx] = useState<Partial<Transaction>>({ type: 'expense', currency: 'PEN' });
    const [newOtherIncome, setNewOtherIncome] = useState<Partial<OtherIncome>>({ currency: 'USD' });

    // Client Search State
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);

    // Deletion State
    const [idToDelete, setIdToDelete] = useState<string | null>(null);
    const [typeToDelete, setTypeToDelete] = useState<'sale' | 'transaction' | 'other' | 'client' | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [sData, tData, oData, pData, aData, cData] = await Promise.all([
                db.getSales(),
                db.getTransactions(),
                db.getOtherIncomes(),
                db.getProperties(),
                db.getUsers(),
                db.getFinancialClients()
            ]);
            setSales(sData);
            setTransactions(tData);
            setOtherIncomes(oData);
            setProperties(pData);
            setAgents(aData);
            setFinancialClients(cData);
        } catch (error) {
            console.error('Error loading sales data:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadData();
    }, []);

    // Filtered Content by current month/year selection
    const filterByDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    };

    // Calculations
    const monthlyIncomes = [
        ...sales.filter(s => filterByDate(s.date)).map(s => ({ amount: Number(s.amount), currency: s.currency })),
        ...otherIncomes.filter(i => filterByDate(i.date)).map(i => ({ amount: Number(i.amount), currency: i.currency })),
        ...transactions.filter(t => t.type === 'income' && filterByDate(t.date)).map(t => ({ amount: Number(t.amount), currency: t.currency }))
    ];

    const monthlyExpenses = transactions.filter(t => t.type === 'expense' && filterByDate(t.date)).map(t => ({ amount: Number(t.amount), currency: t.currency }));

    const totalIncomePEN = monthlyIncomes.reduce((acc, i) => acc + (i.currency === 'PEN' ? i.amount : i.amount * exchangeRate), 0);
    const totalExpensePEN = monthlyExpenses.reduce((acc, e) => acc + (e.currency === 'PEN' ? e.amount : e.amount * exchangeRate), 0);
    const totalIncomeUSD = monthlyIncomes.filter(i => i.currency === 'USD').reduce((acc, i) => acc + i.amount, 0);
    const totalIncomePEN_ONLY = monthlyIncomes.filter(i => i.currency === 'PEN').reduce((acc, i) => acc + i.amount, 0);

    const balancePEN = totalIncomePEN - totalExpensePEN;

    const handleAddSale = async () => {
        if (!newSale.propertyId || !newSale.amount || !newSale.financialClientId) return;

        let res;
        if (isEditing && editingId) {
            res = await db.updateSale({ ...newSale, id: editingId });
        } else {
            res = await db.addSale({ ...newSale });
        }

        if (res.success) {
            setShowFinancialModal(false);
            setIsEditing(false);
            setEditingId(null);
            setNewSale({ currency: 'USD', status: 'completed' });
            setClientSearchTerm('');
            loadData();
        }
    };

    const handleAddFinancialClient = async () => {
        if (!newClient.name || !newClient.document) return;
        setLoading(true);
        try {
            const res = await db.addFinancialClient(newClient);
            if (res.success) {
                setShowFinancialModal(false);
                setRegisterNewClient(false);
                setNewClient({ civilStatus: 'Soltero' });
                loadData();
            } else {
                alert(res.message);
            }
        } catch (error) {
            console.error('Error adding client:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTransaction = async () => {
        if (!newTx.description || !newTx.amount) return;

        let res;
        if (isEditing && editingId) {
            res = await db.updateTransaction({ ...newTx, id: editingId });
        } else {
            res = await db.addTransaction(newTx);
        }

        if (res.success) {
            setShowFinancialModal(false);
            setIsEditing(false);
            setEditingId(null);
            setNewTx({ type: 'expense', currency: 'PEN' });
            loadData();
        }
    };

    const handleAddOtherIncome = async () => {
        if (!newOtherIncome.description || !newOtherIncome.amount) return;

        let res;
        if (isEditing && editingId) {
            res = await db.updateOtherIncome({ ...newOtherIncome, id: editingId });
        } else {
            res = await db.addOtherIncome(newOtherIncome);
        }

        if (res.success) {
            setShowFinancialModal(false);
            setIsEditing(false);
            setEditingId(null);
            setNewOtherIncome({ currency: 'USD' });
            loadData();
        }
    };

    const confirmDelete = async () => {
        if (!idToDelete || !typeToDelete) return;

        let res;
        if (typeToDelete === 'sale') res = await db.deleteSale(idToDelete);
        else if (typeToDelete === 'transaction') res = await db.deleteTransaction(idToDelete);
        else if (typeToDelete === 'other') res = await db.deleteOtherIncome(idToDelete);
        else if (typeToDelete === 'client') res = await db.deleteFinancialClient(idToDelete);

        if (res?.success) {
            setShowDeleteConfirm(false);
            setIdToDelete(null);
            setTypeToDelete(null);
            loadData();
        }
    };

    const openDeleteModal = (id: string, type: 'sale' | 'transaction' | 'other' | 'client') => {
        setIdToDelete(id);
        setTypeToDelete(type);
        setShowDeleteConfirm(true);
    };

    const handleSaveClient = async () => {
        if (!selectedClient) return;
        setLoading(true);
        try {
            const res = await db.updateFinancialClient(selectedClient);
            if (res.success) {
                await loadData();
                setShowClientDetail(false);
                setIsEditingClient(false);
            } else {
                alert(res.message);
            }
        } catch (error) {
            console.error('Error saving client:', error);
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (item: any, type: 'sale' | 'transaction' | 'other') => {
        setIsEditing(true);
        setEditingId(item.id);
        setShowFinancialModal(true);

        if (type === 'sale') {
            setFinancialType('income');
            setIncomeSubtype('sale');
            setNewSale({
                propertyId: item.propertyId,
                amount: item.amount,
                currency: item.currency,
                financialClientId: item.financialClientId,
                clientName: item.clientName,
                agentId: item.agentId,
                status: item.status,
                date: item.date,
                notes: item.notes
            });
            setClientSearchTerm(item.clientName || '');
        } else if (type === 'transaction') {
            setFinancialType(item.type);
            setNewTx({
                description: item.description,
                type: item.type,
                amount: item.amount,
                currency: item.currency,
                category: item.category,
                date: item.date,
                notes: item.notes
            });
        } else if (type === 'other') {
            setFinancialType('income');
            setIncomeSubtype('other');
            setNewOtherIncome({
                description: item.description,
                amount: item.amount,
                currency: item.currency,
                category: item.category,
                date: item.date,
                propertyId: item.propertyId
            });
        }
    };

    // Filtering Logic (Search + Date)
    const filteredSales = sales.filter(s => {
        if (!filterByDate(s.date)) return false;
        const prop = properties.find(p => p.id === s.propertyId);
        const propTitle = prop ? `${prop.projectName}${prop.lotNumber ? ` - Lote ${prop.lotNumber}` : ''}` : '';
        const searchStr = `${s.clientName} ${propTitle}`.toLowerCase();
        return searchStr.includes(filterText.toLowerCase());
    });

    const filteredTransactions = transactions.filter(t => {
        if (!filterByDate(t.date)) return false;
        const searchStr = `${t.description} ${t.category}`.toLowerCase();
        return searchStr.includes(filterText.toLowerCase());
    });

    const filteredOtherIncomes = otherIncomes.filter(i => {
        if (!filterByDate(i.date)) return false;
        const searchStr = `${i.description} ${i.category}`.toLowerCase();
        return searchStr.includes(filterText.toLowerCase());
    });

    const filteredFinancialClients = financialClients.filter(c => {
        const prop = properties.find(p => p.id === c.propertyId);
        const propTitle = prop ? `${prop.projectName}${prop.lotNumber ? ` - Lote ${prop.lotNumber}` : ''}` : '';
        const searchStr = `${c.name} ${c.document} ${propTitle}`.toLowerCase();
        return searchStr.includes(filterText.toLowerCase());
    });

    const ledgerMovements = [
        ...filteredSales.map(s => {
            const prop = properties.find(p => p.id === s.propertyId);
            return {
                id: s.id,
                date: s.date,
                description: prop ? `${prop.projectName}${prop.lotNumber ? ` - Lote ${prop.lotNumber}` : ''}` : 'Venta de propiedad',
                category: 'Venta',
                amount: s.amount,
                currency: s.currency,
                type: 'income' as const,
                subType: 'sale' as const,
                clientName: s.clientName
            }
        }),
        ...filteredOtherIncomes.map(i => ({
            id: i.id,
            date: i.date,
            description: i.description || i.category,
            category: i.category,
            amount: i.amount,
            currency: i.currency,
            type: 'income' as const,
            subType: 'other' as const
        })),
        ...filteredTransactions.map(t => ({
            id: t.id,
            date: t.date,
            description: t.description,
            category: t.category,
            amount: t.amount,
            currency: t.currency,
            type: t.type,
            subType: 'tx' as const
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-3 animate-in fade-in duration-700 p-2 md:p-3 pb-10">
            {/* Header / Stats Overlay */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white/50 dark:bg-[#111318]/50 p-2 md:p-3 rounded-2xl border border-border-color shadow-xl backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 transition-all group-hover:bg-primary/10" />

                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20 shadow-lg">
                        <Wallet size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-text-main tracking-tight">Ventas & finanzas</h1>
                        <p className="text-[9px] text-text-muted font-bold opacity-40 mt-0.5">Gestión de cierres y movimientos</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 relative z-10">
                    {/* Date Selection (Desktop) */}
                    <div className="hidden lg:flex bg-input-bg dark:bg-[#16191f] border border-border-color dark:border-border-color p-0.5 rounded-xl items-center gap-0.5 shadow-inner">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent text-[10px] font-bold text-zinc-300 outline-none px-3 py-1.5 cursor-pointer hover:bg-white/[0.02] rounded-lg transition-colors"
                        >
                            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                        <div className="w-px h-3 bg-border-color/50 dark:bg-white/10" />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent text-[10px] font-bold text-zinc-300 outline-none px-2 py-1.5 cursor-pointer hover:bg-white/[0.02] rounded-lg transition-colors"
                        >
                            {Array.from({ length: 11 }, (_, i) => 2026 + i).map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div >

                    {/* T.C. (Desktop) */}
                    < div className="hidden xl:flex bg-input-bg dark:bg-[#16191f] border border-border-color dark:border-border-color px-2.5 py-1.5 rounded-xl items-center gap-1.5 shadow-inner group" >
                        <span className="text-[9px] font-bold text-text-muted uppercase tracking-tighter opacity-40 group-hover:opacity-100 transition-opacity">T.C. S/</span>
                        <input
                            type="number"
                            value={exchangeRate}
                            onChange={(e) => setExchangeRate(Number(e.target.value))}
                            className="w-10 bg-transparent text-[11px] font-black text-primary outline-none text-center"
                        />
                    </div >

                    {/* Search & Actions Area */}
                    < div className={`flex-1 flex items-center gap-1.5 transition-all duration-300 ${showMobileSearch ? 'w-full' : 'w-auto'}`}>
                        {/* Date select in mobile when NOT searching */}
                        {
                            !showMobileSearch && (
                                <div className="flex lg:hidden bg-input-bg dark:bg-[#16191f] border border-border-color dark:border-border-color p-0.5 rounded-xl items-center gap-0.5 shadow-inner">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                        className="bg-transparent text-[10px] font-bold text-text-main outline-none px-2 py-1.5"
                                    >
                                        {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                            <option key={i} value={i}>{m}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                                        className="bg-transparent text-[10px] font-bold text-text-main outline-none px-2 py-1.5"
                                    >
                                        {Array.from({ length: 11 }, (_, i) => 2026 + i).map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            )
                        }

                        {/* Desktop Search / Mobile Expandable Search */}
                        <div className={`relative group flex-1 ${!showMobileSearch ? 'hidden md:block' : 'block'}`}>
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" size={12} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="w-full bg-input-bg dark:bg-[#16191f] border border-border-color dark:border-border-color text-zinc-300 text-[11px] font-medium rounded-xl pl-9 pr-4 py-2 placeholder:text-text-muted/30 focus:border-primary/30 outline-none transition-all"
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
                        {
                            !showMobileSearch && (
                                <button
                                    onClick={() => setShowMobileSearch(true)}
                                    className="md:hidden w-10 h-10 flex items-center justify-center bg-input-bg dark:bg-[#16191f] text-text-muted border border-border-color dark:border-border-color rounded-xl active:scale-95 transition-all"
                                >
                                    <Search size={16} />
                                </button>
                            )
                        }

                        {/* Actions (Filter & Add) */}
                        {
                            !showMobileSearch && (
                                <div className="flex gap-1.5 shrink-0">
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`flex items-center justify-center w-10 h-10 md:w-auto md:px-5 md:py-2 text-[11px] font-bold rounded-xl transition-all border ${showFilters
                                            ? 'bg-primary/10 border-primary/20 text-primary'
                                            : 'bg-input-bg dark:bg-[#16191f] text-text-muted hover:text-text-main border-border-color dark:border-border-color'
                                            }`}
                                    >
                                        <Filter size={14} />
                                        <span className="hidden md:inline ml-2">Filtros</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowFinancialModal(true);
                                            if (activeTab === 'clients') {
                                                setFinancialType('income');
                                                setIncomeSubtype('sale');
                                                setRegisterNewClient(true);
                                            } else if (activeTab === 'sales') {
                                                setFinancialType('income');
                                                setIncomeSubtype('sale');
                                            } else if (activeTab === 'finance') {
                                                setFinancialType('expense');
                                            }
                                        }}
                                        className="bg-primary hover:bg-primary-hover text-white w-10 h-10 md:w-auto md:px-6 md:py-2.5 rounded-xl flex items-center justify-center md:gap-2 transition-all shadow-lg shadow-primary/10 active:scale-95 shrink-0"
                                    >
                                        <Plus size={18} />
                                        <span className="hidden md:inline font-bold text-[11px]">
                                            {activeTab === 'clients' ? 'Registrar' : activeTab === 'sales' ? 'Venta' : 'Egreso'}
                                        </span>
                                    </button>
                                </div>
                            )
                        }
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-2">
                <div className="bg-card-bg border border-border-color dark:border-border-color p-2 rounded-xl shadow-sm flex flex-col gap-0.5 md:gap-1 transition-all hover:border-green-500/30 group overflow-hidden relative">
                    <div className="flex items-center justify-between">
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg md:rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                            <TrendingUp size={12} className="md:size-[14]" />
                        </div>
                        <span className="text-[8px] md:text-[9px] font-bold text-green-500 bg-green-500/5 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Mes</span>
                    </div>
                    <div>
                        <p className="text-[8px] md:text-[9px] text-text-muted font-black tracking-widest leading-none mb-1 opacity-40">Ingresos pen</p>
                        <p className="text-sm md:text-base font-black text-text-main leading-none font-mono tracking-tighter">S/ {Number(totalIncomePEN_ONLY).toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-card-bg border border-border-color dark:border-border-color p-2 md:p-2 rounded-2xl shadow-sm flex flex-col gap-0.5 md:gap-1 transition-all hover:border-primary/30 group overflow-hidden relative">
                    <div className="flex items-center justify-between">
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Wallet size={12} className="md:size-[14]" />
                        </div>
                        <span className="text-[8px] md:text-[9px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Mes</span>
                    </div>
                    <div>
                        <p className="text-[8px] md:text-[9px] text-text-muted font-black tracking-widest leading-none mb-1 opacity-40">Ingresos usd</p>
                        <p className="text-sm md:text-base font-black text-text-main leading-none font-mono tracking-tighter">${Number(totalIncomeUSD).toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-card-bg border border-border-color dark:border-border-color p-2 md:p-2 rounded-2xl shadow-sm flex flex-col gap-0.5 md:gap-1 transition-all hover:border-red-500/30 group overflow-hidden relative">
                    <div className="flex items-center justify-between">
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg md:rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                            <TrendingDown size={12} className="md:size-[14]" />
                        </div>
                        <span className="text-[8px] md:text-[9px] font-bold text-red-500 bg-red-500/5 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Mes</span>
                    </div>
                    <div>
                        <p className="text-[8px] md:text-[9px] text-text-muted font-black tracking-widest leading-none mb-1 opacity-40">Gastos pen</p>
                        <p className="text-sm md:text-base font-black text-text-main leading-none font-mono tracking-tighter">S/ {Number(totalExpensePEN).toLocaleString()}</p>
                    </div>
                </div>

                <div className={`border border-border-color dark:border-border-color p-2 md:p-2 rounded-2xl shadow-lg flex flex-col gap-0.5 md:gap-1 group overflow-hidden relative transition-all ${balancePEN >= 0 ? 'bg-primary/5 shadow-primary/5 hover:border-primary/30' : 'bg-red-500/5 shadow-red-500/5 hover:border-red-500/30'}`}>
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <PieChart size={24} className={`md:size-[32] ${balancePEN >= 0 ? 'text-primary' : 'text-red-500'}`} />
                    </div>
                    <div className="flex items-center justify-between relative z-10">
                        <div className={`w-6 h-6 md:w-7 md:h-7 rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform ${balancePEN >= 0 ? 'bg-primary shadow-primary/30' : 'bg-red-500 shadow-red-500/30'}`}>
                            <PieChart size={12} className="md:size-[14]" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className={`text-[8px] md:text-[9px] font-black tracking-widest leading-none mb-1 ${balancePEN >= 0 ? 'text-primary/60' : 'text-red-500/60'}`}>Balance (s/)</p>
                        <p className={`text-sm md:text-base font-black leading-none font-mono tracking-tighter ${balancePEN >= 0 ? 'text-primary' : 'text-red-500'}`}>S/ {Number(balancePEN).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Tabs & Content */}
            <div className="bg-surface border border-border-color dark:border-border-color rounded-xl shadow-xl overflow-hidden flex flex-col min-h-[400px]">
                <div className="flex border-b border-border-color dark:border-border-color bg-input-bg dark:bg-background/20 px-1 md:px-2 pt-1 gap-0.5 md:gap-1 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('clients')}
                        className={`px-3 md:px-4 py-2 text-[10px] font-bold transition-all rounded-t-xl relative flex-shrink-0 ${activeTab === 'clients' ? 'text-primary bg-surface border-x border-t border-border-color dark:border-border-color -mb-px shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text-main hover:bg-primary/5'}`}
                    >
                        {activeTab === 'clients' && <div className="absolute top-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
                        Clientes
                    </button>
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`px-4 py-2 text-[10px] font-bold transition-all rounded-t-xl relative ${activeTab === 'sales' ? 'text-primary bg-surface border-x border-t border-border-color dark:border-border-color -mb-px shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text-main hover:bg-primary/5'}`}
                    >
                        {activeTab === 'sales' && <div className="absolute top-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
                        Registro de ventas
                    </button>
                    <button
                        onClick={() => setActiveTab('finance')}
                        className={`px-4 py-2 text-[10px] font-bold transition-all rounded-t-xl relative ${activeTab === 'finance' ? 'text-primary bg-surface border-x border-t border-border-color dark:border-border-color -mb-px shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.1)]' : 'text-text-muted hover:text-text-main hover:bg-primary/5'}`}
                    >
                        {activeTab === 'finance' && <div className="absolute top-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
                        Finanzas y caja
                    </button>
                </div>

                <div className="p-3 md:p-4 flex-1">
                    {loading ? (
                        <div className="h-40 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : activeTab === 'clients' ? (
                        <div className="space-y-4">
                            <div className="bg-surface/50 border border-border-color rounded-2xl md:p-5 p-4 shadow-xl shadow-black/5 transition-all group overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                                            <Users size={16} />
                                        </div>
                                        <div>
                                            <h3 className="text-[13px] font-bold text-text-main tracking-tight leading-none">Cartera de Clientes</h3>
                                            <p className="text-[9px] text-text-muted font-bold opacity-40 uppercase tracking-widest mt-1">Gestión de prospectos</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-border-color dark:border-border-color shadow-sm bg-background/20 backdrop-blur-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-primary text-white border-b border-primary/20">
                                                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider">Detalles del Cliente</th>
                                                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider">Documento</th>
                                                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider">Propiedad</th>
                                                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-color/30 dark:divide-white/[0.02]">
                                            {filteredFinancialClients.length === 0 ? (
                                                <tr><td colSpan={4} className="p-12 text-center text-text-muted text-[11px] font-medium italic opacity-60">No se encontraron clientes registrados</td></tr>
                                            ) : filteredFinancialClients.map(client => (
                                                <tr key={client.id} className="hover:bg-primary/[0.02] transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-border-color dark:border-border-color shadow-sm group-hover:scale-105 transition-transform duration-300">
                                                                <User size={18} />
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[12px] font-bold text-text-main line-clamp-1">{client.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-text-muted font-bold opacity-80">{client.phone}</span>
                                                                    {client.email && (
                                                                        <>
                                                                            <span className="text-[9px] text-text-muted/40 font-bold tracking-tighter">•</span>
                                                                            <span className="text-[10px] text-text-muted font-bold opacity-60">{client.email}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2.5 py-1 bg-input-bg dark:bg-surface border border-border-color dark:border-border-color rounded-lg text-[10px] font-bold text-text-muted shadow-sm">
                                                            {client.document}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-bold text-text-main line-clamp-1">
                                                                {(() => {
                                                                    const p = properties.find(p => p.id === client.propertyId);
                                                                    return p ? `${p.projectName}${p.lotNumber ? ` - Lote ${p.lotNumber}` : ''}` : 'No vinculada';
                                                                })()}
                                                            </span>
                                                            <span className="text-[9px] text-text-muted font-bold opacity-40 uppercase tracking-widest leading-none mt-1">
                                                                {client.createdAt ? format(new Date(client.createdAt), 'dd MMM, yyyy') : ''}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedClient(client);
                                                                    setShowClientDetail(true);
                                                                    setIsEditingClient(false);
                                                                }}
                                                                className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                                title="Ver detalles"
                                                            >
                                                                <FileText size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteModal(client.id, 'client')}
                                                                className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                                title="Eliminar cliente"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'sales' ? (
                        <div className="space-y-4">
                            <div className="bg-surface/50 border border-border-color rounded-2xl md:p-5 p-4 shadow-xl shadow-black/5 transition-all group overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />

                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                                            <Briefcase size={16} />
                                        </div>
                                        <div>
                                            <h3 className="text-[13px] font-bold text-text-main tracking-tight leading-none">Registro de Ventas</h3>
                                            <p className="text-[9px] text-text-muted font-bold opacity-40 uppercase tracking-widest mt-1">Cierres confirmados</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-border-color dark:border-border-color shadow-sm bg-background/20 backdrop-blur-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-primary text-white border-b border-primary/20">
                                                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider">Detalles de Venta</th>
                                                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-right">Comisión</th>
                                                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-center">Estado</th>
                                                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-color/30 dark:divide-white/[0.02]">
                                            {filteredSales.length === 0 ? (
                                                <tr><td colSpan={4} className="p-12 text-center text-text-muted text-[11px] font-medium italic opacity-60">No se encontraron ventas para este período</td></tr>
                                            ) : filteredSales.map(sale => (
                                                <tr key={sale.id} className="hover:bg-primary/[0.02] transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary border border-border-color dark:border-border-color shadow-sm group-hover:scale-105 transition-transform duration-300">
                                                                <Building size={18} />
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[12px] font-bold text-text-main line-clamp-1">
                                                                    {(() => {
                                                                        const p = properties.find(p => p.id === sale.propertyId);
                                                                        return p ? `${p.projectName}${p.lotNumber ? ` - Lote ${p.lotNumber}` : ''}` : 'Propiedad desconocida';
                                                                    })()}
                                                                </span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-text-muted font-bold flex items-center gap-1 opacity-80">
                                                                        <User size={10} className="text-primary/60" /> {sale.clientName}
                                                                    </span>
                                                                    <span className="text-[9px] text-text-muted/40 font-bold tracking-tighter">•</span>
                                                                    <span className="text-[10px] text-primary/60 font-bold">{format(new Date(sale.date), 'dd MMM, yyyy')}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="flex flex-col">
                                                            <span className="text-[12px] font-black font-mono text-text-main tracking-tighter">
                                                                {sale.currency === 'USD' ? '$' : 'S/'} {Number(sale.amount).toLocaleString()}
                                                            </span>
                                                            <span className="text-[8px] font-bold text-text-muted opacity-40 uppercase tracking-widest">{sale.currency}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm border ${sale.status === 'completed'
                                                            ? 'bg-green-500/10 text-green-500 border-green-500/10'
                                                            : 'bg-amber-500/10 text-amber-500 border-amber-500/10'}`}>
                                                            {sale.status === 'completed' ? 'Cerrada' : 'Pendiente'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => openEditModal(sale, 'sale')}
                                                                className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                                title="Editar venta"
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteModal(sale.id, 'sale')}
                                                                className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                                title="Eliminar venta"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'finance' ? (
                        <div className="space-y-4">
                            <div className="bg-surface/50 border border-border-color rounded-2xl md:p-5 p-4 shadow-xl shadow-black/5 transition-all group overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />

                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                                            <Wallet size={16} />
                                        </div>
                                        <div>
                                            <h3 className="text-[13px] font-bold text-text-main tracking-tight leading-none">Finanzas y Caja</h3>
                                            <p className="text-[9px] text-text-muted font-bold opacity-40 uppercase tracking-widest mt-1">Ingresos y egresos</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-border-color dark:border-border-color shadow-sm bg-background/20 backdrop-blur-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-primary text-white border-b border-primary/20">
                                                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider">Concepto y Movimiento</th>
                                                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider">Categoría</th>
                                                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-right">Monto</th>
                                                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-right">Monto (S/)</th>
                                                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-color dark:divide-white/[0.02]">
                                            {ledgerMovements.length === 0 ? (
                                                <tr><td colSpan={5} className="p-12 text-center text-text-muted text-[11px] font-medium italic opacity-60">No se encontraron movimientos registrados</td></tr>
                                            ) : ledgerMovements.map(m => (
                                                <tr key={m.id} className="hover:bg-background/40 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border border-border-color dark:border-border-color shadow-sm group-hover:scale-105 transition-transform duration-300 ${m.type === 'income'
                                                                ? 'bg-green-500/10 text-green-500'
                                                                : 'bg-red-500/10 text-red-500'
                                                                }`}>
                                                                {m.type === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-[12px] font-bold text-text-main line-clamp-1">{m.description}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-text-muted font-bold opacity-80">{format(new Date(m.date), 'dd MMM, yyyy')}</span>
                                                                    <span className="text-[9px] text-text-muted/40 font-bold tracking-tighter">•</span>
                                                                    <span className={`text-[9px] font-black uppercase tracking-wider ${m.type === 'income' ? 'text-green-500/70' : 'text-red-500/70'}`}>
                                                                        {m.type === 'income' ? 'Ingreso' : 'Egreso'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2.5 py-1 bg-input-bg dark:bg-surface border border-border-color dark:border-border-color rounded-lg text-[10px] font-bold text-text-muted shadow-sm">
                                                            {m.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="flex flex-col">
                                                            <span className={`text-[12px] font-black font-mono tracking-tighter ${m.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                                                {m.type === 'income' ? '+' : '-'} {m.currency === 'USD' ? '$' : 'S/'} {Number(m.amount).toLocaleString()}
                                                            </span>
                                                            <span className="text-[8px] font-bold text-text-muted opacity-40 uppercase tracking-widest">{m.currency}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="flex flex-col">
                                                            <span className={`text-[12px] font-black font-mono tracking-tighter ${m.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                                                {m.type === 'income' ? '+' : '-'} S/ {Number(m.currency === 'PEN' ? m.amount : m.amount * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                            <span className="text-[8px] font-bold text-text-muted opacity-40 uppercase tracking-widest">PEN</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => {
                                                                    const originalItem = m.subType === 'sale' ? sales.find(s => s.id === m.id) :
                                                                        m.subType === 'other' ? otherIncomes.find(i => i.id === m.id) :
                                                                            transactions.find(t => t.id === m.id);
                                                                    if (originalItem) openEditModal(originalItem, m.subType === 'sale' ? 'sale' : m.subType === 'other' ? 'other' : 'transaction');
                                                                }}
                                                                className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                                                title="Editar"
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteModal(m.id, m.subType === 'sale' ? 'sale' : m.subType === 'other' ? 'other' : 'transaction')}
                                                                className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                                                title="Eliminar movimiento"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center space-y-2 opacity-40">
                                <Search size={40} className="mx-auto text-text-muted mb-2" />
                                <p className="text-[11px] font-bold text-text-muted">Seleccione una pestaña válida</p>
                            </div>
                        </div>
                    )}
                </div>
            </div >

            {/* Premium Financial Modal */}
            {
                showFinancialModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-surface border border-border-color dark:border-border-color rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="p-4 md:p-5 border-b border-border-color dark:border-border-color bg-surface relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-full h-1 ${financialType === 'income' ? 'bg-primary' : 'bg-red-500'}`} />
                                <div className="flex justify-between items-center relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg ${financialType === 'income' ? 'bg-primary/20 text-primary' : 'bg-red-500/20 text-red-500'}`}>
                                            {financialType === 'income' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-text-main leading-tight">
                                                {activeTab === 'clients' ?
                                                    (isEditing ? 'Editar Perfil del Cliente' : 'Registrar Nuevo Cliente') :
                                                    (isEditing ? 'Editar Registro' : (
                                                        financialType === 'income' ?
                                                            (incomeSubtype === 'sale' ? 'Registrar Venta' : 'Registrar Otro Ingreso') :
                                                            'Registrar Egreso'
                                                    ))
                                                }
                                            </h3>
                                            <p className="text-[9px] text-text-muted font-bold opacity-40 uppercase tracking-widest leading-none mt-1">
                                                {activeTab === 'clients' ? 'Datos para seguimiento post-venta' : 'Registro de flujo de caja'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setShowFinancialModal(false); setIsEditing(false); setEditingId(null); }}
                                        className="p-2 hover:bg-background rounded-xl transition-colors text-text-muted"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 md:p-6 space-y-4 md:space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
                                <div className="space-y-4">
                                    {activeTab === 'clients' ? (
                                        <div className="space-y-3">
                                            {/* Identidad */}
                                            <div className="bg-input-bg dark:bg-[#16191f]/40 border border-border-color rounded-2xl p-4 space-y-2.5 shadow-sm">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary"><CheckCircle size={10} /></div>
                                                    <span className="text-[9px] font-bold text-text-main uppercase tracking-widest opacity-60">Identidad Digital</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Nombre completo / Razón Social</label>
                                                        <input className="w-full bg-input-bg dark:bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/30" placeholder="Nombre y apellidos" value={newClient.name || ''} onChange={e => setNewClient({ ...newClient, name: e.target.value })} />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Documento (DNI/RUC)</label>
                                                            <input className="w-full bg-input-bg dark:bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 font-mono" placeholder="88888888" value={newClient.document || ''} onChange={e => setNewClient({ ...newClient, document: e.target.value })} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Fecha Nacimiento</label>
                                                            <input type="date" className="w-full bg-input-bg dark:bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-zinc-300 outline-none focus:border-primary/30" value={newClient.birthDate || ''} onChange={e => setNewClient({ ...newClient, birthDate: e.target.value })} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contacto */}
                                            <div className="bg-input-bg dark:bg-[#16191f]/40 border border-border-color rounded-2xl p-4 space-y-2.5 shadow-sm">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <div className="w-4 h-4 rounded bg-amber-500/20 flex items-center justify-center text-amber-500"><Briefcase size={10} /></div>
                                                    <span className="text-[9px] font-bold text-text-main uppercase tracking-widest opacity-60">Contacto y Ubicación</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <input className="w-full bg-input-bg dark:bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none" placeholder="WhatsApp" value={newClient.phone || ''} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} />
                                                    <input className="w-full bg-input-bg dark:bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none" placeholder="Profesión" value={newClient.occupation || ''} onChange={e => setNewClient({ ...newClient, occupation: e.target.value })} />
                                                </div>
                                                <input className="w-full bg-input-bg dark:bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none" placeholder="Email" value={newClient.email || ''} onChange={e => setNewClient({ ...newClient, email: e.target.value })} />
                                                <input className="w-full bg-input-bg dark:bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none" placeholder="Dirección" value={newClient.address || ''} onChange={e => setNewClient({ ...newClient, address: e.target.value })} />
                                            </div>

                                            {/* Familia */}
                                            <div className="bg-input-bg dark:bg-[#16191f]/40 border border-border-color rounded-2xl p-4 space-y-2.5 shadow-sm">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary"><Users size={10} /></div>
                                                    <span className="text-[9px] font-bold text-text-main uppercase tracking-widest opacity-60">Familia y Estado Civil</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <select className="w-full bg-input-bg dark:bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none" value={newClient.civilStatus} onChange={e => setNewClient({ ...newClient, civilStatus: e.target.value as any })}>
                                                        <option value="Soltero">Soltero/a</option>
                                                        <option value="Casado">Casado/a</option>
                                                        <option value="Divorciado">Divorciado/a</option>
                                                        <option value="Viudo">Viudo/a</option>
                                                    </select>
                                                    <button onClick={() => setNewClient({ ...newClient, hasChildren: !newClient.hasChildren })} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl border transition-all ${newClient.hasChildren ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-border-color text-text-muted opacity-40'}`}>
                                                        <Users size={12} /> <span className="text-[9px] font-bold">Hijos</span>
                                                    </button>
                                                </div>
                                                {newClient.civilStatus === 'Casado' && (
                                                    <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl space-y-2 mt-2">
                                                        <input className="w-full bg-[#16191f] border border-border-color rounded-lg px-3 py-1.5 text-[10px] font-bold text-text-main outline-none" placeholder="Nombre cónyuge" value={newClient.spouseName || ''} onChange={e => setNewClient({ ...newClient, spouseName: e.target.value })} />
                                                        <input className="w-full bg-[#16191f] border border-border-color rounded-lg px-3 py-1.5 text-[10px] font-bold text-text-main outline-none font-mono" placeholder="DNI cónyuge" value={newClient.spouseDocument || ''} onChange={e => setNewClient({ ...newClient, spouseDocument: e.target.value })} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Type Toggle */}
                                            <div className="flex p-0.5 bg-input-bg dark:bg-[#16191f] rounded-xl border border-border-color shadow-inner">
                                                <button onClick={() => setFinancialType('income')} className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase ${financialType === 'income' ? 'bg-primary/20 text-primary border border-primary/20' : 'text-text-muted opacity-40'}`}><TrendingUp size={12} /> Ingreso</button>
                                                <button onClick={() => setFinancialType('expense')} className={`flex-1 py-1.5 text-[9px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 uppercase ${financialType === 'expense' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'text-text-muted opacity-40'}`}><TrendingDown size={12} /> Egreso</button>
                                            </div>

                                            {financialType === 'income' && (
                                                <div className="flex p-0.5 bg-input-bg dark:bg-[#16191f]/40 rounded-xl border border-border-color shadow-inner w-fit mx-auto">
                                                    <button onClick={() => setIncomeSubtype('sale')} className={`px-4 py-1.5 text-[8px] font-bold rounded-lg transition-all ${incomeSubtype === 'sale' ? 'bg-primary/10 text-primary' : 'text-text-muted opacity-30'}`}><Building size={11} /> Venta</button>
                                                    <button onClick={() => setIncomeSubtype('other')} className={`px-4 py-1.5 text-[8px] font-bold rounded-lg transition-all ${incomeSubtype === 'other' ? 'bg-primary/10 text-primary' : 'text-text-muted opacity-30'}`}><Wallet size={11} /> Otros</button>
                                                </div>
                                            )}

                                            {financialType === 'income' && incomeSubtype === 'sale' ? (
                                                <div className="space-y-3">
                                                    <div className="bg-input-bg dark:bg-[#16191f]/40 border border-border-color rounded-2xl p-4 space-y-2.5 shadow-sm">
                                                        <select className="w-full bg-[#16191f] border border-border-color rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none" value={newSale.propertyId || ''} onChange={e => { const pId = e.target.value; setNewSale({ ...newSale, propertyId: pId }); setNewClient({ ...newClient, propertyId: pId }); }}>
                                                            <option value="">Propiedad...</option>
                                                            {properties.map(p => <option key={p.id} value={p.id}>{p.projectName} {p.lotNumber ? `- Lote ${p.lotNumber}` : ''}</option>)}
                                                        </select>
                                                        <select className="w-full bg-[#16191f] border border-border-color rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none" value={newSale.agentId || ''} onChange={e => setNewSale({ ...newSale, agentId: e.target.value })}>
                                                            <option value="">Gestor...</option>
                                                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="bg-input-bg dark:bg-[#16191f]/40 border border-border-color rounded-2xl p-4 space-y-2.5 shadow-sm">
                                                        <div className="flex gap-2">
                                                            <select className="bg-[#16191f] border border-border-color rounded-xl px-2 py-2 text-[11px] font-bold text-primary outline-none" value={newSale.currency} onChange={e => setNewSale({ ...newSale, currency: e.target.value })}><option value="USD">$</option><option value="PEN">S/</option></select>
                                                            <input type="number" className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none" placeholder="Monto" value={newSale.amount || ''} onChange={e => setNewSale({ ...newSale, amount: Number(e.target.value) })} />
                                                        </div>
                                                    </div>
                                                    <div className="bg-input-bg dark:bg-[#16191f]/40 border border-border-color rounded-2xl p-4 space-y-2.5 shadow-sm">
                                                        <input className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none" placeholder="Sincronizar Cliente (ID o Nombre)..." value={clientSearchTerm} onChange={e => { setClientSearchTerm(e.target.value); setShowClientDropdown(true); }} />
                                                    </div>
                                                </div>
                                            ) : financialType === 'income' && incomeSubtype === 'other' ? (
                                                <div className="space-y-3">
                                                    <input className="w-full bg-[#16191f] border border-border-color rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none" placeholder="Descripción" value={newOtherIncome.description || ''} onChange={e => setNewOtherIncome({ ...newOtherIncome, description: e.target.value })} />
                                                    <div className="flex gap-2">
                                                        <select className="bg-[#16191f] border border-border-color rounded-xl px-2 py-2 text-[11px] font-bold text-primary outline-none" value={newOtherIncome.currency} onChange={e => setNewOtherIncome({ ...newOtherIncome, currency: e.target.value })}><option value="USD">$</option><option value="PEN">S/</option></select>
                                                        <input type="number" className="w-full bg-[#16191f] border border-border-color rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none" placeholder="Monto" value={newOtherIncome.amount || ''} onChange={e => setNewOtherIncome({ ...newOtherIncome, amount: Number(e.target.value) })} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    <input className="w-full bg-[#16191f] border border-border-color rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none" placeholder="Descripción de Gasto" value={newTx.description || ''} onChange={e => setNewTx({ ...newTx, description: e.target.value })} />
                                                    <div className="flex gap-2">
                                                        <select className="bg-[#16191f] border border-border-color rounded-xl px-2 py-2 text-[11px] font-bold text-red-500 outline-none" value={newTx.currency} onChange={e => setNewTx({ ...newTx, currency: e.target.value })}><option value="PEN">S/</option><option value="USD">$</option></select>
                                                        <input type="number" className="w-full bg-[#16191f] border border-border-color rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none" placeholder="Monto" value={newTx.amount || ''} onChange={e => setNewTx({ ...newTx, amount: Number(e.target.value) })} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 md:p-5 border-t border-border-color bg-surface/50 backdrop-blur-sm">
                                <button
                                    onClick={() => {
                                        if (activeTab === 'clients') handleAddFinancialClient();
                                        else if (financialType === 'income') {
                                            if (incomeSubtype === 'sale') handleAddSale();
                                            else handleAddOtherIncome();
                                        } else handleAddTransaction();
                                    }}
                                    className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-3 ${financialType === 'income' || activeTab === 'clients' ? 'bg-primary text-white shadow-primary/20 shadow-lg' : 'bg-red-500 text-white shadow-red-500/20 shadow-lg'}`}
                                >
                                    <Plus size={14} />
                                    <span>{activeTab === 'clients' ? (isEditing ? 'Sincronizar' : 'Registrar') : 'Guardar'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Delete Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-[#16191f] border border-border-color rounded-2xl w-full max-w-[320px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500 mb-4">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="text-sm font-bold text-text-main uppercase tracking-tighter mb-1">Confirmar Eliminación</h3>
                                <p className="text-[10px] text-text-muted font-bold opacity-40 leading-relaxed px-4">
                                    Esta acción es irreversible y eliminará permanentemente {
                                        typeToDelete === 'sale' ? 'esta venta' :
                                            typeToDelete === 'transaction' ? 'este egreso' :
                                                typeToDelete === 'client' ? 'este cliente' : 'este ingreso'
                                    }.
                                </p>
                            </div>
                            <div className="flex border-t border-border-color divide-x divide-border-color">
                                <button
                                    onClick={() => { setShowDeleteConfirm(false); setIdToDelete(null); setTypeToDelete(null); }}
                                    className="flex-1 py-3 text-[9px] font-black text-text-muted uppercase tracking-widest hover:bg-white/5 transition-all outline-none"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all text-[9px] font-black uppercase tracking-widest outline-none"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Client Detail Modal */}
            {
                showClientDetail && selectedClient && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-[#0b0e14] border border-border-color rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
                            {/* Simple Close Button for the edge */}
                            <button
                                onClick={() => { setShowClientDetail(false); setIsEditingClient(false); }}
                                className="absolute top-4 right-4 p-2 bg-[#16191f] border border-border-color rounded-xl hover:bg-white/5 transition-all text-text-muted active:scale-95 z-10"
                            >
                                <X size={16} />
                            </button>

                            <div className="p-6 md:p-8 border-b border-border-color">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-xl shadow-primary/20">
                                        <User size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-text-main tracking-tight uppercase tracking-widest truncate">{selectedClient.name}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">{selectedClient.document}</span>
                                            <span className="text-[10px] text-text-muted font-bold opacity-40 uppercase tracking-tighter">Expediente de Cliente</span>
                                        </div>
                                    </div>
                                    {!isEditingClient && (
                                        <button
                                            onClick={() => setIsEditingClient(true)}
                                            className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all active:scale-95 mr-10"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Personal Info Group */}
                                    <div className="bg-[#16191f]/40 border border-border-color rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary">
                                                <FileText size={10} />
                                            </div>
                                            <span className="text-[9px] font-bold text-text-main uppercase tracking-widest opacity-60">Datos Personales</span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Nombre Completo</label>
                                                <input
                                                    disabled={!isEditingClient}
                                                    className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all disabled:opacity-50"
                                                    value={selectedClient.name}
                                                    onChange={(e) => setSelectedClient({ ...selectedClient, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Documento (ID)</label>
                                                    <input
                                                        disabled={!isEditingClient}
                                                        className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all disabled:opacity-50"
                                                        value={selectedClient.document}
                                                        onChange={(e) => setSelectedClient({ ...selectedClient, document: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Nacimiento</label>
                                                    <input
                                                        type="date"
                                                        disabled={!isEditingClient}
                                                        className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all disabled:opacity-50 [color-scheme:dark]"
                                                        value={selectedClient.birthDate || ''}
                                                        onChange={(e) => setSelectedClient({ ...selectedClient, birthDate: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact & Location Group */}
                                    <div className="bg-[#16191f]/40 border border-border-color rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary">
                                                <MapPin size={10} />
                                            </div>
                                            <span className="text-[9px] font-bold text-text-main uppercase tracking-widest opacity-60">Ubicación y Contacto</span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">WhatsApp</label>
                                                    <input
                                                        disabled={!isEditingClient}
                                                        className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all disabled:opacity-50"
                                                        value={selectedClient.phone || ''}
                                                        onChange={(e) => setSelectedClient({ ...selectedClient, phone: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Profesión</label>
                                                    <input
                                                        disabled={!isEditingClient}
                                                        className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all disabled:opacity-50"
                                                        value={selectedClient.occupation || ''}
                                                        onChange={(e) => setSelectedClient({ ...selectedClient, occupation: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Correo Electrónico</label>
                                                <input
                                                    disabled={!isEditingClient}
                                                    className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all disabled:opacity-50"
                                                    value={selectedClient.email || ''}
                                                    onChange={(e) => setSelectedClient({ ...selectedClient, email: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Family Info Group */}
                                    <div className="bg-[#16191f]/40 border border-border-color rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary">
                                                <Users size={10} />
                                            </div>
                                            <span className="text-[9px] font-bold text-text-main uppercase tracking-widest opacity-60">Situación Familiar</span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Estado Civil</label>
                                                    <select
                                                        disabled={!isEditingClient}
                                                        className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all disabled:opacity-50 appearance-none cursor-pointer"
                                                        value={selectedClient.civilStatus}
                                                        onChange={(e) => setSelectedClient({ ...selectedClient, civilStatus: e.target.value as any })}
                                                    >
                                                        <option value="Soltero">Soltero/a</option>
                                                        <option value="Casado">Casado/a</option>
                                                        <option value="Divorciado">Divorciado/a</option>
                                                        <option value="Viudo">Viudo/a</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1 flex flex-col justify-end">
                                                    <div className="flex items-center gap-3 bg-[#0b0e14] p-1.5 px-3 rounded-xl border border-border-color">
                                                        <button
                                                            disabled={!isEditingClient}
                                                            onClick={() => setSelectedClient({ ...selectedClient, hasChildren: !selectedClient.hasChildren })}
                                                            className={`w-7 h-4 rounded-full transition-all relative ${selectedClient.hasChildren ? 'bg-primary' : 'bg-white/10'}`}
                                                        >
                                                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${selectedClient.hasChildren ? 'left-3.5' : 'left-0.5'}`} />
                                                        </button>
                                                        <span className="text-[10px] font-bold text-text-main">Hijos</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {selectedClient.hasChildren && (
                                                <div className="grid grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="col-span-1 space-y-1">
                                                        <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Cant.</label>
                                                        <input
                                                            type="number"
                                                            disabled={!isEditingClient}
                                                            className="w-full bg-[#0b0e14] border border-border-color rounded-xl px-2 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all disabled:opacity-50 text-center"
                                                            value={selectedClient.numberOfChildren || 0}
                                                            onChange={(e) => setSelectedClient({ ...selectedClient, numberOfChildren: Number(e.target.value) })}
                                                        />
                                                    </div>
                                                    <div className="col-span-3 space-y-1">
                                                        <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Edades/Nombres</label>
                                                        <input
                                                            disabled={!isEditingClient}
                                                            className="w-full bg-[#0b0e14] border border-border-color rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all disabled:opacity-50"
                                                            placeholder="Ej: 5, 8, 12..."
                                                            value={selectedClient.childrenDetails || ''}
                                                            onChange={(e) => setSelectedClient({ ...selectedClient, childrenDetails: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Spouse Info Group */}
                                    <div className="bg-[#16191f]/40 border border-border-color rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary">
                                                <User size={10} />
                                            </div>
                                            <span className="text-[9px] font-bold text-text-main uppercase tracking-widest opacity-60">Información del Cónyuge</span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Nombre Completo</label>
                                                <input
                                                    disabled={!isEditingClient || selectedClient.civilStatus !== 'Casado'}
                                                    className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all disabled:opacity-30"
                                                    value={selectedClient.spouseName || ''}
                                                    onChange={(e) => setSelectedClient({ ...selectedClient, spouseName: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Documento del Cónyuge</label>
                                                <input
                                                    disabled={!isEditingClient || selectedClient.civilStatus !== 'Casado'}
                                                    className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all disabled:opacity-30"
                                                    value={selectedClient.spouseDocument || ''}
                                                    onChange={(e) => setSelectedClient({ ...selectedClient, spouseDocument: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes Group */}
                                    <div className="md:col-span-2 bg-[#16191f]/40 border border-border-color rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-primary">
                                                <Building size={10} />
                                            </div>
                                            <span className="text-[9px] font-bold text-text-main uppercase tracking-widest opacity-60">Notas y Post-Venta</span>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Observaciones Estratégicas</label>
                                            <textarea
                                                disabled={!isEditingClient}
                                                className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-3 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all disabled:opacity-50 min-h-[80px] resize-none"
                                                placeholder="Detalles de interés, preferencias, historial..."
                                                value={selectedClient.notes || ''}
                                                onChange={(e) => setSelectedClient({ ...selectedClient, notes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {isEditingClient && (
                                <div className="p-4 md:p-6 border-t border-border-color bg-[#16191f]/40 flex justify-end gap-3 animate-in slide-in-from-bottom-2 duration-300">
                                    <button
                                        onClick={() => setIsEditingClient(false)}
                                        className="px-6 py-2.5 text-[10px] font-black text-text-muted hover:text-text-main uppercase tracking-widest transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveClient}
                                        className="px-8 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center gap-2"
                                    >
                                        <Check size={16} />
                                        <span>Guardar Historial</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default Sales;
