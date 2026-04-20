import React, { useEffect, useState } from 'react';
import { format, isPast, isSameDay, isSameMonth, addHours, addDays, subDays, differenceInDays, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { Property, Lead, Task, Appointment, PropertyStatus, TaskStatus, PipelineStage, Developer, User, LeadSource } from '../types';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, FunnelChart, Funnel, LabelList, CartesianGrid, Legend
} from 'recharts';
import {
  Users,
  MapPin,
  Calendar as CalIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Calendar,
  Building,
  User as UserIcon,
  Lock,
  Plus,
  ArrowRight,
  TrendingUp,
  UserPlus,
  ChevronDown,
  MessageCircle,
  Facebook,
  Instagram,
  Globe,
  DollarSign,
  BarChart,
  Target,
  ListTodo,
  ArrowUpRight,
  TrendingDown,
  LayoutDashboard
} from 'lucide-react';

// --- MOCK DATA FOR DEMO MODE ---
const MOCK_STAGES: PipelineStage[] = [
  { id: 'new', label: 'Nuevo', color: 'border-primary', order: 1, organizationId: 'demo' },
  { id: 'contacted', label: 'Contactado', color: 'border-secondary', order: 2, organizationId: 'demo' },
  { id: 'interested', label: 'Interesado', color: 'border-amber-500', order: 3, organizationId: 'demo' },
  { id: 'qualified', label: 'Calificado', color: 'border-orange-500', order: 4, organizationId: 'demo' },
  { id: 'closed', label: 'Cierre', color: 'border-green-500', order: 5, organizationId: 'demo' }
];

const MOCK_USERS: User[] = [
  { id: 'demo-user-id', name: 'Usuario Demo', role: 'SuperAdmin', organizationId: 'demo', email: 'demo@prex.com' },
  { id: 'agent-1', name: 'Ana Garcia', role: 'Agent', organizationId: 'demo', email: 'ana@prex.com' },
  { id: 'agent-2', name: 'Carlos Ruiz', role: 'Agent', organizationId: 'demo', email: 'carlos@prex.com' }
];

const MOCK_PROPERTIES: Property[] = [
  { id: '1', projectName: 'Altos del Mar', lotNumber: 'A-12', price: 45000, currency: 'USD', status: PropertyStatus.AVAILABLE, area: 120, organizationId: 'demo', developerId: 'd1', location: 'Lima', features: [] },
  { id: '2', projectName: 'Altos del Mar', lotNumber: 'B-05', price: 48000, currency: 'USD', status: PropertyStatus.SOLD, area: 130, organizationId: 'demo', developerId: 'd1', location: 'Lima', features: [] },
  { id: '3', projectName: 'Villa Verde', lotNumber: 'C-01', price: 35000, currency: 'USD', status: PropertyStatus.AVAILABLE, area: 100, organizationId: 'demo', developerId: 'd2', location: 'Ica', features: [] },
  { id: '4', projectName: 'Villa Verde', lotNumber: 'C-02', price: 35000, currency: 'USD', status: PropertyStatus.RESERVED, area: 100, organizationId: 'demo', developerId: 'd2', location: 'Ica', features: [] },
  { id: '5', projectName: 'Oasis Park', lotNumber: 'H-10', price: 60000, currency: 'USD', status: PropertyStatus.AVAILABLE, area: 150, organizationId: 'demo', developerId: 'd3', location: 'Piura', features: [] },
];

const MOCK_LEADS: Lead[] = [
  { id: 'l1', name: 'Roberto Gomez', phone: '+51999999991', status: 'new', source: 'Facebook Ads', lastContact: new Date().toISOString(), organizationId: 'demo', currency: 'USD', createdAt: new Date().toISOString() },
  { id: 'l2', name: 'Maria Lopez', phone: '+51999999992', status: 'contacted', source: 'WhatsApp', lastContact: new Date().toISOString(), organizationId: 'demo', currency: 'USD', createdAt: new Date().toISOString() },
  { id: 'l3', name: 'Juan Perez', phone: '+51999999993', status: 'interested', source: 'Web', lastContact: new Date().toISOString(), organizationId: 'demo', currency: 'USD', assignedTo: 'agent-1', createdAt: new Date().toISOString() },
  { id: 'l4', name: 'Lucia Diaz', phone: '+51999999994', status: 'qualified', source: 'Referido', lastContact: new Date().toISOString(), organizationId: 'demo', currency: 'USD', assignedTo: 'agent-2', createdAt: new Date().toISOString() },
  { id: 'l5', name: 'Pedro Silva', phone: '+51999999995', status: 'closed', source: 'Facebook Ads', lastContact: new Date().toISOString(), organizationId: 'demo', currency: 'USD', assignedTo: 'agent-1', createdAt: new Date().toISOString() },
  { id: 'l6', name: 'Elena Torres', phone: '+51999999996', status: 'interested', source: 'Instagram', lastContact: new Date().toISOString(), organizationId: 'demo', currency: 'USD', createdAt: new Date().toISOString() },
];

const MOCK_APPOINTMENTS: Appointment[] = [
  { id: 'a1', title: 'Visita Lote A-12', date: addHours(new Date(), 2).toISOString(), status: 'Pendiente', leadId: 'l3', organizationId: 'demo', assignedTo: 'demo-user-id' },
  { id: 'a2', title: 'Firma de Contrato', date: addHours(new Date(), 5).toISOString(), status: 'Pendiente', leadId: 'l5', organizationId: 'demo', assignedTo: 'demo-user-id' },
];

const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Enviar cotización actualizada', dueDate: new Date().toISOString(), status: TaskStatus.PENDING, leadId: 'l2', organizationId: 'demo', assignedTo: 'demo-user-id', createdAt: new Date().toISOString() },
  { id: 't2', title: 'Llamar para seguimiento', dueDate: addDays(new Date(), -1).toISOString(), status: TaskStatus.OVERDUE, leadId: 'l1', organizationId: 'demo', assignedTo: 'demo-user-id', createdAt: subDays(new Date(), 1).toISOString() },
];
const MOCK_SOURCES: LeadSource[] = [
  { id: 's1', name: 'Facebook Ads', organizationId: 'demo' },
  { id: 's2', name: 'WhatsApp', organizationId: 'demo' },
  { id: 's3', name: 'Web', organizationId: 'demo' },
  { id: 's4', name: 'Instagram', organizationId: 'demo' },
  { id: 's5', name: 'Referido', organizationId: 'demo' },
  { id: 's6', name: 'TikTok', organizationId: 'demo' }
];

// -----------------------------

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);

  const [trackFilterStatus, setTrackFilterStatus] = useState<string>('Pendiente');
  const [trackFilterType, setTrackFilterType] = useState<'all' | 'task' | 'appointment'>('all');
  const [trackFilterUser, setTrackFilterUser] = useState<string>('all');
  const [trackFilterStart, setTrackFilterStart] = useState<string>('');
  const [trackFilterEnd, setTrackFilterEnd] = useState<string>('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('inmocrm_user') || 'null');
    setCurrentUser(user);

    if (user) {
      if (user.id === 'demo-user-id') {
        // Load Mock Data for Demo
        setProperties(MOCK_PROPERTIES);
        setLeads(MOCK_LEADS);
        setTasks(MOCK_TASKS);
        setAppointments(MOCK_APPOINTMENTS);
        setPipelineStages(MOCK_STAGES);
        setUsers(MOCK_USERS);
        setLeadSources(MOCK_SOURCES);
      } else {
        // Load Real Data
        const fetchData = async () => {
          try {
            const [p, l, t, a, s, d, u, ls] = await Promise.all([
              db.getProperties(),
              db.getLeads(),
              db.getTasks(),
              db.getAppointments(),
              db.getPipeline(),
              db.getDevelopers(),
              db.getUsers(),
              db.getSources()
            ]);
            setProperties(p);
            setLeads(l);
            setTasks(t);
            setAppointments(a);
            setPipelineStages(s.sort((a, b) => a.order - b.order));
            setDevelopers(d);
            setUsers(u);
            setLeadSources(ls);
          } catch (error) {
            console.error("Failed to load dashboard data", error);
          }
        };
        fetchData();
      }
    }
  }, []);

  const isAgent = currentUser?.role === 'Agent';

  const availableProps = properties.filter(p => p.status === PropertyStatus.AVAILABLE).length;
  const soldProps = properties.filter(p => p.status === PropertyStatus.SOLD).length;

  // Filter today's appointments
  const todayAppointments = appointments.filter(a => {
    const aptDate = new Date(a.date).toDateString();
    const today = new Date().toDateString();
    return aptDate === today && a.status !== 'Cancelado';
  });

  // Calculate Leads created/updated today
  const leadsToday = leads.filter(l => l.lastContact && isSameDay(new Date(l.lastContact), new Date())).length;

  const getSourceColor = (sourceName: string) => {
    const s = leadSources.find(ls => ls.name.toLowerCase() === sourceName.toLowerCase());
    if (s && s.color) {
      if (s.color.startsWith('#')) return s.color;
      if (s.color.includes('-')) {
        const parts = s.color.split('-');
        const colorName = parts[1];
        // const shade = parts[2] || '500'; // Not used for hex conversion
        const colors: { [key: string]: string } = {
          blue: '#3B82F6', purple: '#8B5CF6', amber: '#F59E0B',
          orange: '#F97316', green: '#10B981', pink: '#EC4899',
          indigo: '#6366F1', cyan: '#06B6D4', teal: '#14B8A6',
          rose: '#F43F5E', slate: '#64748B', zinc: '#71717A'
        };
        return colors[colorName] || '#8B5CF6';
      }
    }
    // fallbacks matches user-provided model
    const sourceColors: { [key: string]: string } = {
      'instagram': '#F43F5E',
      'whatsapp': '#10B981',
      'facebook': '#1877F2',
      'facebook ads': '#1877F2',
      'tiktok': '#8B5CF6',
      'tik tok': '#8B5CF6',
      'web': '#3B82F6',
      'directo': '#FBBF24',
      'referido': '#FBBF24',
      'desconocido': '#FBBF24'
    };
    return sourceColors[sourceName.toLowerCase()] || '#8B5CF6';
  };

  const sourceChartData = React.useMemo(() => {
    if (!leads || leads.length === 0) return [];

    const counts: { [key: string]: number } = {};
    leads.forEach(l => {
      // Handle potential property name variations or missing data
      const sourceVal = l.source || (l as any).origin || 'Desconocido';
      // Look up human-readable name if sourceVal is an ID
      const sourceInfo = leadSources.find(ls => ls.id === sourceVal || ls.name.toLowerCase() === sourceVal.toLowerCase());
      const label = sourceInfo ? sourceInfo.name : sourceVal;
      counts[label] = (counts[label] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: getSourceColor(name)
    })).sort((a, b) => b.value - a.value);
  }, [leads, leadSources]);

  // Filter out advisors for performance metrics
  const advisors = users.filter(u => u.role === 'Agent' || u.role === 'SuperAdmin');

  const wonStage = pipelineStages.find(s => ['ganado', 'cerrado', 'venta', 'vendido', 'closed'].includes(s.label.toLowerCase()));

  const getLeadName = (id?: string) => {
    if (!id) return 'N/A';
    return leads.find(l => l.id === id)?.name || 'Desconocido';
  };

  const getAssignedUserName = (id?: string) => {
    if (!id) return 'Sin asignar';
    return users.find(u => u.id === id)?.name || 'Desconocido';
  };

  // --- SALES PERFORMANCE METRICS ---
  const currentMonth = new Date();

  // 1. Leads nuevos (Este mes)
  const newLeadsMonth = leads.filter(l => l.createdAt && isSameMonth(new Date(l.createdAt), currentMonth)).length;

  // 2. Leads calificados (Etapas 'Caliente' o 'Proceso')
  const qualifiedLeads = leads.filter(l => {
    const stage = pipelineStages.find(s => s.id === l.pipelineStageId);
    if (!stage) return false;
    const label = stage.label.toLowerCase();
    return ['caliente', 'proceso', 'calificado', 'qualified', 'hot'].includes(label);
  }).length;

  // 3. Citas agendadas (Pendientes o Confirmadas)
  const pendingAppointments = appointments.filter(a => a.status === 'Pendiente' || a.status === 'Confirmada').length;

  // 4. Ventas del mes (Etapa 'Ganado' este mes)
  const salesMonth = leads.filter(l =>
    l.pipelineStageId === wonStage?.id &&
    l.updatedAt && isSameMonth(new Date(l.updatedAt), currentMonth)
  ).length;

  // 5. Tasa de conversión (Ganados vs Total)
  const conversionRate = leads.length > 0 && wonStage
    ? ((leads.filter(l => l.pipelineStageId === wonStage.id).length / leads.length) * 100).toFixed(1)
    : '0';

  // 6. Tiempo promedio de cierre (Días desde creación hasta Ganado)
  const closedLeads = leads.filter(l => l.pipelineStageId === wonStage?.id && l.createdAt && l.updatedAt);
  const avgClosingTime = closedLeads.length > 0
    ? Math.round(closedLeads.reduce((acc, l) => acc + differenceInDays(new Date(l.updatedAt!), new Date(l.createdAt)), 0) / closedLeads.length)
    : 0;

  // Advisor Response Time Data
  const advisorResponseTimeData = advisors.map((user, idx) => {
    const userLeads = leads.filter(l => l.assignedTo === user.id);
    const convertedLeads = userLeads.filter(l => l.pipelineStageId === wonStage?.id);

    // Advisor Colors Palette
    const ADVISOR_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4', '#6366F1', '#F43F5E'];
    const color = ADVISOR_COLORS[idx % ADVISOR_COLORS.length];

    const leadTimes = userLeads.map(l => {
      const firstTask = tasks
        .filter(t => t.leadId === l.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

      if (!firstTask) return null;

      const leadCreated = new Date(l.createdAt);
      const taskCreated = new Date(firstTask.createdAt);
      return differenceInMinutes(taskCreated, leadCreated);
    }).filter((t): t is number => t !== null && t >= 0);

    const avgMinutes = leadTimes.length > 0
      ? Math.round(leadTimes.reduce((acc, t) => acc + t, 0) / leadTimes.length)
      : null;

    let formattedTime = 'N/A';
    if (avgMinutes !== null) {
      if (avgMinutes < 60) {
        formattedTime = `${avgMinutes}m`;
      } else {
        const hours = Math.floor(avgMinutes / 60);
        const mins = avgMinutes % 60;
        formattedTime = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }
    }

    const conversionRate = userLeads.length > 0
      ? Math.round((convertedLeads.length / userLeads.length) * 100)
      : 0;

    return {
      name: user.name.split(' ')[0],
      avgMinutes,
      formattedTime,
      count: leadTimes.length,
      conversionRate,
      color
    };
  }).sort((a, b) => (a.avgMinutes || Infinity) - (b.avgMinutes || Infinity));

  const conversionByAdvisorData = [...advisorResponseTimeData].sort((a, b) => b.conversionRate - a.conversionRate);

  const unifiedTrackingList = [
    ...tasks.map(t => ({
      id: t.id,
      type: 'task',
      title: t.title,
      date: t.dueDate,
      status: t.status,
      related: t.leadId ? getLeadName(t.leadId) : t.relatedTo,
      rawDate: new Date(t.dueDate),
      assignedTo: t.assignedTo
    })),
    ...appointments.map(a => ({
      id: a.id,
      type: 'appointment',
      title: a.title,
      date: a.date,
      status: a.status,
      related: getLeadName(a.leadId),
      rawDate: new Date(a.date),
      assignedTo: a.assignedTo
    }))
  ].sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

  const totalPendingActivities = unifiedTrackingList.filter(item =>
    (item.status === 'Pendiente' || item.status === TaskStatus.PENDING)
  ).length;

  const totalOverdueActivities = unifiedTrackingList.filter(item =>
    (item.status === 'Pendiente' || item.status === TaskStatus.PENDING) && isPast(item.rawDate)
  ).length;

  const filteredTracking = unifiedTrackingList.filter(item => {
    const matchesType = trackFilterType === 'all' || item.type === trackFilterType;
    const matchesUser = trackFilterUser === 'all' || item.assignedTo === trackFilterUser;

    // Status matching logic
    let matchesStatus = false;
    if (trackFilterStatus === 'all') {
      matchesStatus = true;
    } else if (trackFilterStatus === 'Vencido') {
      matchesStatus = (item.status === 'Pendiente' || item.status === TaskStatus.PENDING) && isPast(item.rawDate);
    } else if (trackFilterStatus === 'Pendiente') {
      matchesStatus = (item.status === 'Pendiente' || item.status === TaskStatus.PENDING) && !isPast(item.rawDate);
    } else {
      matchesStatus = item.status === trackFilterStatus;
    }

    // Date range filter
    const itemDate = new Date(item.rawDate).setHours(0, 0, 0, 0);
    const startDate = trackFilterStart ? new Date(trackFilterStart).setHours(0, 0, 0, 0) : null;
    const endDate = trackFilterEnd ? new Date(trackFilterEnd).setHours(0, 0, 0, 0) : null;

    let matchesDate = true;
    if (startDate && endDate) {
      matchesDate = itemDate >= startDate && itemDate <= endDate;
    } else if (startDate) {
      matchesDate = itemDate >= startDate;
    } else if (endDate) {
      matchesDate = itemDate <= endDate;
    }

    return matchesType && matchesUser && matchesStatus && matchesDate;
  });

  const getStatusColor = (status: string, date: Date) => {
    if (status === 'Realizado' || status === TaskStatus.COMPLETED) return 'text-green-600 bg-green-500/10 border-green-500/40 dark:text-green-400';
    if (status === 'Cancelado' || status === TaskStatus.CANCELLED) return 'text-text-muted bg-text-muted/10 border-border-color';
    if (status === 'Vencido' || status === TaskStatus.OVERDUE) return 'text-red-600 bg-red-500/10 border-red-500/40 dark:text-red-400';
    if (status === 'Pendiente' && isPast(date)) return 'text-red-500/90 bg-red-500/5 border-red-500/30 dark:text-red-400';
    return 'text-[#db2adf]/90 bg-[#db2adf]/5 border-[#db2adf]/30';
  };

  // Funnel Data (REQUIRED: Frio, Tibio, Caliente, Proceso, Ganado)
  const getStageColorHex = (colorClass: string) => {
    if (colorClass.includes('blue')) return '#db2adf';
    if (colorClass.includes('purple')) return '#db2adf';
    if (colorClass.includes('amber')) return '#FBBF24';
    if (colorClass.includes('orange')) return '#FB923C';
    if (colorClass.includes('green')) return '#34D399';
    if (colorClass.includes('slate')) return '#94A3B8';
    if (colorClass.includes('red')) return '#F87171';
    if (colorClass.includes('emerald')) return '#34D399';
    return '#db2adf';
  };

  const REQUIRED_FUNNEL_STAGES = ['Captación', 'Frio', 'Tibio', 'Caliente', 'Proceso', 'Ganado'];

  const funnelData = REQUIRED_FUNNEL_STAGES.map(label => {
    const semanticMappings: { [key: string]: string[] } = {
      'CAPTACIÓN': ['nuevo', 'new', 'captación', 'entrada'],
      'FRIO': ['frio', 'frío', 'contactado', 'contacted'],
      'TIBIO': ['tibio', 'interesado', 'interested'],
      'CALIENTE': ['caliente', 'calificado', 'qualified', 'hot'],
      'PROCESO': ['proceso', 'seguimiento', 'negociacion', 'negociación'],
      'GANADO': ['cerrado', 'closed', 'ganado', 'venta', 'vendido']
    };

    const possibleLabels = semanticMappings[label.toUpperCase()] || [label.toLowerCase()];

    // Find matching stages in pipeline
    const matchingStageIds = pipelineStages
      .filter(s => possibleLabels.includes(s.label.toLowerCase()))
      .map(s => s.id);

    // Count leads by stage ID or fallback to status string
    const count = leads.filter(l =>
      matchingStageIds.includes(l.pipelineStageId!) ||
      possibleLabels.includes((l.status || '').toLowerCase())
    ).length;

    return {
      name: label.toUpperCase(),
      value: count,
      fill: getStageColorHex(label)
    };
  });


  return (
    <div className="space-y-3 pt-2 md:pt-4" >

      <main className="p-2 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto min-h-screen">
        {/* --- KPI SECTION --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2 md:gap-3 px-1 md:px-0">
          <KpiCard
            title="Leads Mes"
            value={newLeadsMonth}
            icon={UserPlus}
            color="text-[#db2adf]"
            bgColor="bg-[#db2adf]/10"
            trend={leadsToday > 0 ? `+${leadsToday} hoy` : ''}
          />
          <KpiCard
            title="Calificados"
            value={qualifiedLeads}
            icon={Target}
            color="text-orange-500"
            bgColor="bg-orange-500/10"
          />
          <KpiCard
            title="Citas Hoy"
            value={todayAppointments.length}
            icon={Calendar}
            color="text-primary"
            bgColor="bg-primary/10"
          />
          <KpiCard
            title="Ventas Mes"
            value={salesMonth}
            icon={DollarSign}
            color="text-emerald-500"
            bgColor="bg-emerald-500/10"
            trend={conversionRate > '0' ? `${conversionRate}% conv` : ''}
          />
        </div>

        {/* Main Operational Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 md:gap-4 px-1 md:px-0">

          {/* 1. Agenda (Left on desktop, Top on mobile) */}
          <div className="xl:col-span-1 order-2 xl:order-1">
            <div className="bg-surface p-3 md:p-4 rounded-3xl border border-border-color shadow-sm flex flex-col gap-2 md:gap-3 h-full transition-all relative overflow-hidden">
              <h3 className="text-xs md:text-sm font-bold text-text-main flex items-center gap-2 tracking-tight">
                <Clock size={16} className="text-primary md:size-[18px]" />
                Agenda de hoy
              </h3>
              <div className="overflow-y-auto pr-1 space-y-1.5 md:space-y-2 max-h-[300px] md:max-h-[350px] custom-scrollbar flex-1">
                {todayAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 md:py-10 text-text-muted border border-dashed border-border-color rounded-xl md:rounded-2xl bg-input-bg/30">
                    <CheckCircle2 size={24} className="md:size-8 mb-2 opacity-10" />
                    <p className="text-[10px] md:text-[11px] font-bold opacity-40">Todo libre hoy</p>
                  </div>
                ) : (
                  todayAppointments.map(apt => (
                    <div key={apt.id} className="p-2.5 md:p-3.5 bg-input-bg border border-border-color rounded-xl md:rounded-2xl flex items-start gap-2 md:gap-2.5 hover:border-primary/30 transition-all cursor-pointer group shadow-inner">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform group-hover:scale-110">
                        <Clock size={12} className="md:size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start mb-0.5 md:mb-1">
                          <h4 className="text-[11px] md:text-xs font-bold text-text-main truncate tracking-tight">{apt.title}</h4>
                          <span className="text-[9px] md:text-[10px] font-bold text-primary bg-primary/10 px-1.5 md:px-2 py-0.5 rounded-lg">{format(new Date(apt.date), 'HH:mm')}</span>
                        </div>
                        <p className="text-[9px] md:text-[10px] text-text-muted truncate flex items-center gap-1 opacity-60">
                          <UserIcon size={9} className="md:size-2.5" /> {getLeadName(apt.leadId)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 2. Control Center (Right/Bottom) */}
          <div className="xl:col-span-2 order-1 xl:order-2">
            <div className="bg-surface p-3 md:p-4 rounded-3xl border border-border-color shadow-sm h-full transition-all overflow-hidden relative">
              <div className="space-y-2 mb-3 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-[#db2adf]/10 flex items-center justify-center text-[#db2adf] border-2 border-[#db2adf]/30 shadow-inner">
                    <CheckCircle2 size={16} className="md:size-4" />
                  </div>
                  <h3 className="text-xs md:text-sm font-bold text-text-main tracking-tight">
                    Centro de control
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 md:gap-2 w-full">
                  {!isAgent && (
                    <div className="relative group/select">
                      <select
                        className="bg-input-bg border border-[#db2adf]/30 rounded-lg md:rounded-xl px-2 md:px-3 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold text-zinc-300 outline-none focus:border-[#db2adf] transition-all shadow-inner appearance-none cursor-pointer pr-6 md:pr-7"
                        value={trackFilterUser}
                        onChange={e => setTrackFilterUser(e.target.value)}
                      >
                        <option value="all">Asesores</option>
                        {advisors.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-2 md:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40" />
                    </div>
                  )}

                  <div className="relative group/select">
                    <select
                      className="bg-input-bg border border-[#db2adf]/30 rounded-lg md:rounded-xl px-2 md:px-3 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold text-zinc-300 outline-none focus:border-[#db2adf] transition-all shadow-inner appearance-none cursor-pointer pr-6 md:pr-7"
                      value={trackFilterType}
                      onChange={e => setTrackFilterType(e.target.value as any)}
                    >
                      <option value="all">Actividades</option>
                      <option value="task">Tareas</option>
                      <option value="appointment">Citas</option>
                    </select>
                    <ChevronDown size={10} className="absolute right-2 md:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40" />
                  </div>

                  <div className="relative group/select">
                    <select
                      className="bg-input-bg border border-[#db2adf]/30 rounded-lg md:rounded-xl px-2 md:px-3 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold text-zinc-300 outline-none focus:border-[#db2adf] transition-all shadow-inner appearance-none cursor-pointer pr-6 md:pr-7"
                      value={trackFilterStatus}
                      onChange={e => setTrackFilterStatus(e.target.value)}
                    >
                      <option value="all">Estados</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Realizado">Realizado</option>
                      <option value="Vencido">Vencido</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                    <ChevronDown size={10} className="absolute right-2 md:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40" />
                  </div>

                  <div className="flex items-center gap-1.5 bg-input-bg border border-[#db2adf]/30 rounded-lg md:rounded-xl px-2 py-1 md:py-1.5 shadow-inner">
                    <span className="text-[9px] md:text-[10px] font-bold text-text-muted opacity-30 px-1">desde</span>
                    <input
                      type="date"
                      className="bg-transparent text-[9px] md:text-[10px] font-bold text-zinc-300/60 outline-none cursor-pointer"
                      value={trackFilterStart}
                      onChange={e => setTrackFilterStart(e.target.value)}
                    />
                    <div className="w-px h-2.5 bg-[#db2adf]/20 mx-0.5"></div>
                    <span className="text-[9px] md:text-[10px] font-bold text-text-muted opacity-30 px-1">hasta</span>
                    <input
                      type="date"
                      className="bg-transparent text-[9px] md:text-[10px] font-bold text-zinc-300/60 outline-none cursor-pointer"
                      value={trackFilterEnd}
                      onChange={e => setTrackFilterEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar max-h-[300px] md:max-h-[400px] relative z-10 px-0.5">
                <table className="w-full text-left border-collapse min-w-[500px] md:min-w-[600px]">
                  <thead className="sticky top-0 bg-surface z-10">
                    <tr className="border-b border-border-color">
                      <th className="py-2.5 pl-1 w-8 text-center text-[9px] md:text-[10px] font-bold text-text-muted opacity-50 uppercase">T</th>
                      <th className="py-2.5 px-2 text-[9px] md:text-[10px] font-bold text-text-muted opacity-50 uppercase">Actividad</th>
                      <th className="py-2.5 px-2 text-[9px] md:text-[10px] font-bold text-text-muted opacity-50 uppercase">Cliente</th>
                      <th className="py-2.5 px-2 text-[9px] md:text-[10px] font-bold text-text-muted opacity-50 uppercase">Asignado</th>
                      <th className="py-2.5 px-2 text-center text-[9px] md:text-[10px] font-bold text-text-muted opacity-50 uppercase">Estado</th>
                      <th className="py-2.5 pr-4 text-right text-[9px] md:text-[10px] font-bold text-text-muted opacity-50 uppercase">Ir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#db2adf]/15">
                    {filteredTracking.map(item => (
                      <tr key={`${item.type}-${item.id}`} className="hover:bg-primary/[0.02] transition-all group">
                        <td className="py-3 pl-1 align-middle text-center">
                          <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg mx-auto flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110 ${item.type === 'task' ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-primary/10 border-primary/50 text-primary'}`}>
                            {item.type === 'task' ? <FileText size={12} className="md:size-3.5" /> : <Calendar size={12} className="md:size-3.5" />}
                          </div>
                        </td>
                        <td className="py-3 px-2 align-middle">
                          <div className="text-[11px] md:text-xs font-bold text-text-main truncate max-w-[150px] md:max-w-[200px] tracking-tight">{item.title}</div>
                          <div className="text-[9px] md:text-[10px] text-text-muted opacity-40 font-medium">{format(item.rawDate, 'dd MMM, HH:mm')}</div>
                        </td>
                        <td className="py-3 px-2 align-middle">
                          <div className="flex items-center gap-1 text-[10px] md:text-[11px] font-bold text-text-muted opacity-60">
                            <span className="truncate max-w-[80px] md:max-w-none">{item.related}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 align-middle">
                          {item.assignedTo ? (
                            <div className="w-6 h-6 rounded-lg bg-[#db2adf]/10 text-[#db2adf]/90 text-[9px] flex items-center justify-center font-bold border border-[#db2adf]/40 shadow-inner">
                              {getAssignedUserName(item.assignedTo).charAt(0)}
                            </div>
                          ) : <span className="text-[9px] font-bold text-text-muted opacity-30">-</span>}
                        </td>
                        <td className="py-3 px-2 text-center align-middle">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border shadow-inner inline-block min-w-[70px] text-center transition-all ${getStatusColor(item.status, item.rawDate)}`}>
                            {item.status === 'Pendiente' && isPast(item.rawDate) ? 'Vencido' : item.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right align-middle">
                          <button
                            onClick={() => navigate('/calendar')}
                            className="p-1.5 md:p-2 bg-[#db2adf]/5 hover:bg-[#db2adf]/10 text-[#db2adf] border border-[#db2adf]/40 rounded-lg transition-all active:scale-95 group/btn"
                            title="Gestionar actividad"
                          >
                            <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredTracking.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 md:py-12 text-text-muted">
                          <div className="flex flex-col items-center">
                            <CheckCircle2 size={24} className="md:size-8 opacity-10 mb-2" />
                            <p className="text-[10px] md:text-[11px] font-bold opacity-40">Sin actividades</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section (Bottom Charts) - HIDDEN FOR AGENTS */}
        {
          currentUser && (
            isAgent ? (
              <div className="mt-12 p-12 border-2 border-dashed border-border-color rounded-[2.5rem] flex flex-col items-center justify-center text-text-muted bg-surface/30 shadow-inner group relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-5 bg-surface rounded-2xl mb-5 border border-border-color shadow-xl shadow-black/5 relative z-10 transition-transform group-hover:scale-110">
                  <Lock size={40} className="text-primary opacity-60" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-center opacity-40 mb-2 relative z-10">Privilegios insuficientes</p>
                <p className="text-xs font-bold text-text-main text-center opacity-60 max-w-xs relative z-10">Las estadísticas avanzadas y el análisis estratégico están reservados para administradores.</p>
              </div>
            ) : (
              <div className="mt-10 space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <LayoutDashboard size={18} className="text-primary" />
                  <h3 className="text-sm font-bold text-text-main tracking-tight">Análisis Estratégico</h3>
                  <div className="h-px bg-primary/10 flex-1 ml-2" />
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-bold text-text-muted uppercase opacity-40">Stock Propiedades</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-green-500">{availableProps} Libres</span>
                        <span className="text-[10px] font-bold text-text-muted">/</span>
                        <span className="text-[10px] font-bold text-text-main">{properties.length} Total</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">{leads.length} Leads</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                  <div className="bg-surface p-4 md:p-5 rounded-2xl md:rounded-[2.5rem] border-2 border-border-color shadow-xl shadow-black/5 transition-all hover:shadow-primary/5 group/chart">
                    <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border-2 border-[#f97316]/20 shadow-inner group-hover/chart:rotate-12 transition-transform">
                        <TrendingUp size={14} className="md:size-4" />
                      </div>
                      <h3 className="text-xs md:text-sm font-bold text-text-main tracking-tight">Embudo de conversión</h3>
                    </div>
                    <div className="h-[220px] md:h-[260px] relative bg-zinc-950/40 rounded-3xl border border-[#f97316]/20 flex flex-col items-center justify-center p-4 md:p-6 shadow-2xl overflow-hidden my-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-30 dark:opacity-50" />
                      {funnelData.some(d => d.value >= 0) ? (
                        <div className="w-full relative z-10 space-y-3 md:space-y-4 px-2">
                          {funnelData.map((stage, idx) => {
                            const totalFunnelLeads = leads.length;
                            const percentage = totalFunnelLeads > 0 ? Math.round((stage.value / totalFunnelLeads) * 100) : 0;

                            // Color mapping for bars
                            const barColors: { [key: string]: string } = {
                              'CAPTACIÓN': 'bg-primary/20',
                              'FRIO': 'bg-primary/40',
                              'TIBIO': 'bg-amber-500/80',
                              'CALIENTE': 'bg-orange-500/80',
                              'PROCESO': 'bg-secondary/80',
                              'GANADO': 'bg-emerald-500/80'
                            };
                            const barColor = barColors[stage.name] || 'bg-primary';

                            return (
                              <div key={idx} className="w-full flex flex-col gap-1 group/stage">
                                <div className="flex justify-between items-end px-1 leading-none">
                                  <span className="text-[6px] md:text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                                    {stage.name}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[7.5px] md:text-[9px] font-black text-zinc-300">
                                      {stage.value}
                                    </span>
                                    <span className="text-[6px] md:text-[8px] font-bold text-zinc-600">
                                      {percentage}%
                                    </span>
                                  </div>
                                </div>
                                <div className="h-2.5 md:h-3 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden p-[1px] shadow-inner">
                                  <div
                                    className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-out shadow-sm shadow-black/10`}
                                    style={{ width: `${Math.max(percentage, 3)}%`, minWidth: stage.value > 0 ? '3%' : '0%' }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 opacity-30 select-none">
                          <TrendingUp size={32} className="md:size-40 text-text-muted opacity-10" />
                          <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted">Sin datos</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-surface p-4 md:p-5 rounded-2xl md:rounded-[2.5rem] border border-[#f97316]/20 shadow-xl shadow-black/5 transition-all hover:shadow-primary/5 group/chart">
                    <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border-2 border-[#f97316]/20 shadow-inner group-hover/chart:rotate-12 transition-transform">
                        <Plus size={14} className="md:size-4" />
                      </div>
                      <h3 className="text-xs md:text-sm font-bold text-text-main tracking-tight">Origen de leads</h3>
                    </div>
                    <div className="h-64 md:h-72 relative bg-zinc-950/40 rounded-xl md:rounded-[2rem] border border-[#f97316]/20 p-3 md:p-4 shadow-inner overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-secondary/5 via-transparent to-primary/5 opacity-30 dark:opacity-50" />
                      {sourceChartData.length > 0 ? (
                        <div className="relative z-10 w-full h-full flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 overflow-visible">
                          {/* CUSTOM SVG DONUT CHART */}
                          <div className="relative w-full h-full min-h-[180px] md:min-h-0 flex-1 flex items-center justify-center">
                            <svg viewBox="0 0 160 160" className="h-full drop-shadow-xl max-w-[220px] md:max-w-[320px] overflow-visible">
                              {(() => {
                                let startAngle = -90;
                                const total = sourceChartData.reduce((acc, d) => acc + d.value, 0);
                                const radius = 58;
                                const innerRadius = 40;
                                const cx = 80;
                                const cy = 80;

                                return sourceChartData.map((d, i) => {
                                  const percentage = (d.value / total) * 100;
                                  const angle = (d.value / total) * 360;
                                  const endAngle = startAngle + angle;

                                  const x1 = cx + radius * Math.cos(Math.PI * startAngle / 180);
                                  const y1 = cy + radius * Math.sin(Math.PI * startAngle / 180);
                                  const x2 = cx + radius * Math.cos(Math.PI * endAngle / 180);
                                  const y2 = cy + radius * Math.sin(Math.PI * endAngle / 180);

                                  const ix1 = cx + innerRadius * Math.cos(Math.PI * startAngle / 180);
                                  const iy1 = cy + innerRadius * Math.sin(Math.PI * startAngle / 180);
                                  const ix2 = cx + innerRadius * Math.cos(Math.PI * endAngle / 180);
                                  const iy2 = cy + innerRadius * Math.sin(Math.PI * endAngle / 180);

                                  const largeArcFlag = angle > 180 ? 1 : 0;
                                  const pathData = [
                                    `M ${x1} ${y1}`,
                                    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                                    `L ${ix2} ${iy2}`,
                                    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}`,
                                    'Z'
                                  ].join(' ');

                                  const midAngle = startAngle + angle / 2;
                                  const lx = cx + (radius + 14) * Math.cos(Math.PI * midAngle / 180);
                                  const ly = cy + (radius + 14) * Math.sin(Math.PI * midAngle / 180);

                                  const currentStart = startAngle;
                                  startAngle = endAngle;

                                  return (
                                    <g key={i}>
                                      <path d={pathData} fill={d.fill} className="transition-all duration-500" />
                                      {percentage > 3 && (
                                        <text
                                          x={lx}
                                          y={ly}
                                          fill={d.fill}
                                          textAnchor="middle"
                                          dominantBaseline="middle"
                                          className="text-[7.5px] md:text-[9px] font-black pointer-events-none"
                                        >
                                          {Math.round(percentage)}%
                                        </text>
                                      )}
                                    </g>
                                  );
                                });
                              })()}
                            </svg>

                            {/* CENTER TEXT */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-[8px] font-black text-text-main opacity-30 uppercase tracking-tighter">TOTAL</span>
                              <span className="text-lg font-black text-text-main leading-none">{leads.length}</span>
                            </div>
                          </div>

                          <div className="flex flex-row md:flex-col flex-wrap justify-center gap-1.5 md:gap-1.5 px-2 md:pr-4 w-full md:min-w-[90px]">
                            {sourceChartData.map((source, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 md:gap-2 transition-all hover:translate-x-1">
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" style={{ backgroundColor: source.fill }} />
                                <span className="text-[7px] md:text-[8.5px] font-bold text-text-main uppercase tracking-tight truncate max-w-[60px] md:max-w-[70px]">{source.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-40">
                          <Plus size={24} className="md:size-8 mb-2" />
                          <p className="text-[10px] md:text-[11px] font-bold opacity-40">Sin datos</p>
                        </div>
                      )}
                    </div>
                  </div>


                  <div className="bg-surface p-4 md:p-5 rounded-2xl md:rounded-[2.5rem] border-2 border-border-color shadow-xl shadow-black/5 transition-all hover:shadow-primary/5 group/chart">
                    <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border-2 border-border-color shadow-inner group-hover/chart:rotate-12 transition-transform">
                        <Clock size={14} className="md:size-4" />
                      </div>
                      <h3 className="text-xs md:text-sm font-bold text-text-main tracking-tight">Tiempo promedio de respuesta</h3>
                    </div>
                    <div className="h-64 md:h-72 relative bg-surface/30 dark:bg-zinc-900/20 rounded-xl md:rounded-[2rem] border-2 border-border-color p-2.5 md:p-4 shadow-inner overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-transparent to-[#db2adf]/5 opacity-30 dark:opacity-50" />
                      {advisorResponseTimeData.length > 0 ? (
                        <div className="space-y-1.5 md:space-y-2 relative z-10 h-full overflow-y-auto pr-1 custom-scrollbar">
                          {advisorResponseTimeData.map((advisor, idx) => (
                            <div key={idx} className="bg-surface/50 backdrop-blur-sm border border-border-color rounded-lg md:rounded-xl px-2.5 py-2 md:px-3 md:py-2.5 transition-all hover:bg-surface/80 group/perf shadow-sm">
                              <div className="flex items-center justify-between mb-1 md:mb-1.5">
                                <div className="flex items-center gap-1.5 md:gap-2">
                                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-md md:rounded-lg flex items-center justify-center text-[8px] md:text-[10px] font-black text-white border border-white/10 shadow-inner group-hover/perf:rotate-6 transition-transform" style={{ backgroundColor: advisor.color }}>
                                    {advisor.name[0]}
                                  </div>
                                  <span className="text-[8.5px] md:text-[10.5px] font-black text-text-main">{advisor.name}</span>
                                </div>
                                <div className="flex gap-1.5 items-center">
                                  {advisor.count > 0 && (
                                    <span className="text-[7.5px] md:text-[9px] font-bold text-text-muted opacity-40">({advisor.count} leads)</span>
                                  )}
                                  <span className={`text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-inner ${advisor.avgMinutes === null ? 'bg-text-muted/10 text-text-muted border-border-color' :
                                    advisor.avgMinutes < 30 ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                      advisor.avgMinutes < 120 ? 'bg-warning/10 text-warning border-warning/20' :
                                        'bg-red-500/10 text-red-500 border-red-500/20'
                                    }`}>
                                    {advisor.formattedTime}
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                                <div
                                  className={`h-full transition-all duration-700 ${advisor.avgMinutes === null ? 'bg-text-muted' :
                                    advisor.avgMinutes < 30 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                      advisor.avgMinutes < 120 ? 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                        'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                    }`}
                                  style={{ width: `${Math.min(100, (advisor.avgMinutes || 0) / 2.4)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-40">
                          <Clock size={24} className="md:size-8 mb-2" />
                          <p className="text-[10px] md:text-[11px] font-bold opacity-40">Sin datos de respuesta</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-surface p-4 md:p-5 rounded-2xl md:rounded-[2.5rem] border-2 border-border-color shadow-xl shadow-black/5 transition-all hover:shadow-primary/5 group/chart">
                    <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border-2 border-border-color shadow-inner group-hover/chart:rotate-12 transition-transform">
                        <Target size={14} className="md:size-4" />
                      </div>
                      <h3 className="text-xs md:text-sm font-bold text-text-main tracking-tight">Tasa de conversión por asesor</h3>
                    </div>
                    <div className="h-64 md:h-72 relative bg-surface/30 dark:bg-zinc-900/20 rounded-xl md:rounded-[2rem] border-2 border-border-color p-3 md:p-4 shadow-inner overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-secondary/5 via-transparent to-[#db2adf]/5 opacity-30 dark:opacity-50" />
                      {conversionByAdvisorData.length > 0 ? (
                        <div className="space-y-1.5 md:space-y-2 relative z-10 h-full overflow-y-auto pr-1 custom-scrollbar">
                          {conversionByAdvisorData.map((advisor, index) => (
                            <div key={advisor.name} className="bg-surface/50 backdrop-blur-sm border border-border-color rounded-lg md:rounded-xl px-2.5 py-2 md:px-3 md:py-2.5 transition-all hover:bg-surface/80 group/perf shadow-sm">
                              <div className="flex items-center justify-between mb-1 md:mb-1.5">
                                <div className="flex items-center gap-1.5 md:gap-2">
                                  <div className="w-5 h-5 md:w-6 md:h-6 rounded-md md:rounded-lg flex items-center justify-center text-[8px] md:text-[10px] font-black text-white border border-white/10 shadow-inner group-hover/perf:rotate-6 transition-transform" style={{ backgroundColor: advisor.color }}>
                                    {advisor.name[0]}
                                  </div>
                                  <span className="text-[8.5px] md:text-[10.5px] font-black text-text-main">{advisor.name}</span>
                                </div>
                                <div className="flex gap-1.5 items-center">
                                  {advisor.count > 0 && (
                                    <span className="text-[7.5px] md:text-[9px] font-bold text-text-muted opacity-40">({advisor.count} leads)</span>
                                  )}
                                  <span className="text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded-lg border shadow-inner bg-primary/10 text-primary border-primary/20">
                                    {advisor.conversionRate}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                                <div
                                  className="h-full transition-all duration-1000 rounded-full"
                                  style={{
                                    width: `${advisor.conversionRate}%`,
                                    backgroundColor: advisor.color,
                                    boxShadow: `0 0 8px ${advisor.color}80`
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-40">
                          <Users size={24} className="md:size-8 mb-2" />
                          <p className="text-[10px] md:text-[11px] font-bold opacity-40">Sin datos de conversión</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
      </main>
    </div>
  );
};

const KpiCard = ({ title, value, icon: Icon, trend, color, bgColor }: any) => (
  <div className="bg-zinc-950/40 p-3 md:p-4 rounded-2xl border border-border-color hover:border-primary/40 transition-all shadow-sm group relative overflow-hidden flex flex-col h-full backdrop-blur-sm">
    <div className="absolute top-0 right-0 p-5 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity translate-x-4 -translate-y-4 pointer-events-none">
      <Icon size={120} className={`${color} -rotate-12`} />
    </div>

    <div className="flex justify-between items-start mb-2 relative z-10">
      <div className={`w-8 h-8 rounded-xl ${bgColor} ${color} flex items-center justify-center border border-current/10 shadow-inner group-hover:scale-110 transition-transform`}>
        <Icon size={18} />
      </div>
      {trend && (
        <span className="text-[9px] font-bold text-primary animate-pulse tracking-tight">
          {trend}
        </span>
      )}
    </div>

    <div className="relative z-10 mt-auto">
      <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.1em] opacity-50 m-0">{title}</p>
      <h4 className={`text-xl font-black ${color} tracking-tight leading-none mt-1`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </h4>
    </div>
  </div>
);

export default Dashboard;
