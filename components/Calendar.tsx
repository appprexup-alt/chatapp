
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Appointment, Lead, Property, Task, TaskStatus, User } from '../types';
import {
  format,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  addDays,
  isPast,
  getHours,
  startOfMonth,
  startOfWeek
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Trash2, AlertTriangle, Save, AlertCircle, Calendar as CalendarIcon, List, CheckSquare, User as UserIcon, X, Edit, MapPin, FileText, AlignLeft, ListFilter, Plus, SlidersHorizontal, ChevronDown, Building, Users, CheckCircle2, ArrowRight, Menu } from 'lucide-react';
import { useNotification } from './NotificationContext';

const Calendar: React.FC = () => {
  const { addNotification } = useNotification();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Filter State
  const [filterUser, setFilterUser] = useState<string>('all');

  // Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Detail Card Modal State (NEW)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<'appointment' | 'task'>('appointment');

  // Selection State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [time, setTime] = useState('09:00');

  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'appointment' | 'task'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'cancelled' | 'overdue'>('all');

  // Quick Actions State
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Unified Form State
  const [entryType, setEntryType] = useState<'appointment' | 'task'>('appointment');

  // Data Holders
  const [currentApt, setCurrentApt] = useState<Partial<Appointment>>({});
  const [currentTask, setCurrentTask] = useState<Partial<Task>>({});

  // Validation State
  const [validationError, setValidationError] = useState('');

  // Confirmation States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 1024);

  const resetForm = (date?: Date) => {
    const d = date || new Date();
    setSelectedDate(d);

    let hours = d.getHours();
    let minutes = d.getMinutes();
    const remainder = minutes % 5;
    if (remainder !== 0) minutes = minutes + (5 - remainder);
    if (minutes === 60) { minutes = 0; hours = hours + 1; }

    const hStr = hours.toString().padStart(2, '0');
    const mStr = minutes.toString().padStart(2, '0');
    setTime(`${hStr}:${mStr}`);

    setCurrentApt({ status: 'Pendiente' });
    setCurrentTask({ status: TaskStatus.PENDING });
    setIsEditing(false);
    setValidationError('');
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [a, t, l, p, u] = await Promise.all([
      db.getAppointments(),
      db.getTasks(),
      db.getLeads(),
      db.getProperties(),
      db.getUsers()
    ]);
    setAppointments(a);
    setTasks(t.filter(task => task.status !== TaskStatus.CANCELLED));
    setLeads(l);
    setProperties(p);
    setUsers(u);
  };

  // Navigation Logic
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, -1));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  // --- INTERACTION HANDLERS ---

  const onDateClick = (day: Date, specificTime?: string) => {
    resetForm(day);
    if (specificTime) setTime(specificTime);
    setEntryType('appointment');
    setShowModal(true);
  };

  // Updated: Open Detail Card
  const onAppointmentClick = (e: React.MouseEvent, apt: Appointment) => {
    e.stopPropagation();
    setCurrentApt(apt);
    setSelectedItemType('appointment');
    setShowDetailModal(true);
  };

  // Updated: Open Detail Card
  const onTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setCurrentTask(task);
    setSelectedItemType('task');
    setShowDetailModal(true);
  };

  // Transition from Detail to Edit
  const handleEditFromDetail = () => {
    const isApt = selectedItemType === 'appointment';
    const dateStr = isApt ? currentApt.date! : currentTask.dueDate!;
    const d = new Date(dateStr);

    setSelectedDate(d);
    setEntryType(isApt ? 'appointment' : 'task');

    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    setTime(`${hours}:${minutes}`);

    setIsEditing(true);
    setValidationError('');
    setShowDetailModal(false);
    setShowModal(true);
  };

  // Transition from Detail to Delete
  const handleDeleteFromDetail = () => {
    setShowDetailModal(false);
    setShowDeleteConfirm(true);
  };

  // --- SAVE / DELETE LOGIC ---

  const handleSaveClick = () => {
    setValidationError('');

    if (!selectedDate || !time) {
      setValidationError('Fecha y hora requeridas.');
      return;
    }

    if (entryType === 'appointment') {
      // Validation for Appointments: Title is required. Lead is OPTIONAL (Personal Agenda).
      if (!currentApt.title) {
        setValidationError('El título de la cita es obligatorio.');
        return;
      }
    } else {
      // Validation for Tasks: Title AND Lead are REQUIRED (Exclusive for leads).
      if (!currentTask.title) {
        setValidationError('El título de la tarea es obligatorio.');
        return;
      }
      if (!currentTask.leadId) {
        setValidationError('Las tareas deben estar asociadas obligatoriamente a un Lead.');
        return;
      }
    }

    const finalDate = new Date(selectedDate);
    const [hours, minutes] = time.split(':').map(Number);
    finalDate.setHours(hours || 0, minutes || 0, 0, 0);
    const now = new Date();

    if (finalDate < now) {
      if (!isEditing) {
        setValidationError('No es posible programar en el pasado.');
        return;
      }
      if (isEditing) {
        let isPending = false;
        if (entryType === 'appointment') isPending = currentApt.status === 'Pendiente';
        else isPending = currentTask.status === TaskStatus.PENDING;

        if (isPending) {
          setValidationError('Para guardar en el pasado, cambia el estado a Realizado, Cancelado o Vencido.');
          return;
        }
      }
    }

    setShowSaveConfirm(true);
  };

  const executeSave = async () => {
    if (!selectedDate) return;

    const finalDate = new Date(selectedDate);
    const [hours, minutes] = time.split(':').map(Number);
    finalDate.setHours(hours || 0, minutes || 0, 0, 0);
    const isoDate = finalDate.toISOString();

    let res;

    if (entryType === 'appointment') {
      const appointmentData = {
        ...currentApt,
        date: isoDate,
        status: currentApt.status || 'Pendiente',
        assignedTo: currentApt.assignedTo,
        leadId: currentApt.leadId,
        propertyId: currentApt.propertyId
      } as Appointment;

      if (isEditing && currentApt.id) {
        res = await db.updateAppointment(appointmentData);
        if (res.success) addNotification({ title: 'Cita Actualizada', message: 'Cambios guardados.', type: 'success' });
      } else {
        res = await db.addAppointment({ ...appointmentData, id: Math.random().toString(36).substr(2, 9) });
        if (res.success) addNotification({ title: 'Cita Agendada', message: 'Nueva cita creada.', type: 'success' });
      }
    } else {
      const taskData = {
        ...currentTask,
        dueDate: isoDate,
        title: currentTask.title || '',
        status: currentTask.status || TaskStatus.PENDING,
        assignedTo: currentTask.assignedTo,
        leadId: currentTask.leadId
      } as Task;

      if (isEditing && currentTask.id) {
        res = await db.updateTask(taskData);
        if (res.success) addNotification({ title: 'Tarea Actualizada', message: 'Tarea modificada.', type: 'success' });
      } else {
        res = await db.addTask({ ...taskData, id: Math.random().toString(36).substr(2, 9) });
        if (res.success) addNotification({ title: 'Tarea Creada', message: 'Nueva tarea añadida.', type: 'success' });
      }
    }

    if (res?.success) {
      setShowSaveConfirm(false);
      setShowModal(false);
      loadData();
      setCurrentApt({});
      setCurrentTask({});
      setValidationError('');
    } else {
      addNotification({ title: 'Error', message: res?.message || 'Error al guardar.', type: 'error' });
    }
  };

  const confirmDelete = async () => {
    let res;
    // Determine what to delete based on context
    const typeToDelete = showDetailModal || isEditing ? selectedItemType : entryType;
    const idToDelete = typeToDelete === 'appointment' ? currentApt.id : currentTask.id;

    if (typeToDelete === 'appointment' && idToDelete) {
      res = await db.deleteAppointment(idToDelete);
      if (res.success) addNotification({ title: 'Cita Eliminada', message: 'Eliminada del calendario.', type: 'info' });
    } else if (typeToDelete === 'task' && idToDelete) {
      res = await db.deleteTask(idToDelete);
      if (res.success) addNotification({ title: 'Tarea Eliminada', message: 'Eliminada del calendario.', type: 'info' });
    }

    if (res?.success) {
      setShowDeleteConfirm(false);
      setShowModal(false);
      setShowDetailModal(false);
      loadData();
    } else {
      addNotification({ title: 'Error', message: res?.message || 'No se pudo eliminar.', type: 'error' });
    }
  };

  const handleQuickStatusUpdate = async (type: 'appointment' | 'task', id: string, newStatus: string) => {
    let res;
    if (type === 'appointment') {
      const apt = appointments.find(a => a.id === id);
      if (apt) {
        res = await db.updateAppointment({ ...apt, status: newStatus as any });
      }
    } else {
      const t = tasks.find(task => task.id === id);
      if (t) {
        res = await db.updateTask({ ...t, status: newStatus as any });
      }
    }

    if (res?.success) {
      addNotification({
        title: 'Estado Actualizado',
        message: `${type === 'appointment' ? 'Cita' : 'Tarea'} marcada como ${newStatus}.`,
        type: 'success'
      });
      loadData();
    } else {
      addNotification({ title: 'Error', message: 'No se pudo actualizar el estado.', type: 'error' });
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dayHours = Array.from({ length: 24 }, (_, i) => i);

  // STYLES: Red for Overdue
  const getAptStyle = (status: string, date: Date) => {
    if (status === 'Realizado') return 'bg-green-500/10 text-green-600 border-green-500/30 line-through opacity-70';
    if (status === 'Cancelado') return 'bg-text-muted/10 text-text-muted border-border-color line-through opacity-50';
    // Red if Overdue or Pending in Past
    if (status === 'Vencido' || (status === 'Pendiente' && isPast(date) && !isSameDay(date, new Date()))) return 'bg-red-500/10 text-red-600 border-red-500/30 font-semibold';
    return 'bg-primary/10 text-primary border-primary/20';
  };

  const getTaskStyle = (status: TaskStatus, date: Date) => {
    if (status === TaskStatus.COMPLETED) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 line-through opacity-60';
    // Red if Overdue or Pending in Past
    if (status === TaskStatus.OVERDUE || (status === TaskStatus.PENDING && isPast(date) && !isSameDay(date, new Date()))) return 'bg-red-500/10 text-red-600 border-red-500/30 font-semibold';
    return 'bg-text-muted/10 text-text-muted border-emerald-500/20';
  }

  // Filter functions
  const filteredAppointments = appointments.filter(a => {
    if (filterUser !== 'all' && a.assignedTo !== filterUser) return false;
    if (filterType === 'task') return false; // Hide appointments if filtering by task
    if (filterStatus !== 'all') {
      const status = a.status?.toLowerCase() || 'pendiente';
      if (filterStatus === 'pending' && status !== 'pendiente') return false;
      if (filterStatus === 'completed' && status !== 'realizado') return false;
      if (filterStatus === 'cancelled' && status !== 'cancelado') return false;
      if (filterStatus === 'overdue' && status !== 'vencido') return false;
    }
    return true;
  });

  const filteredTasks = tasks.filter(t => {
    if (filterUser !== 'all' && t.assignedTo !== filterUser) return false;
    if (filterType === 'appointment') return false; // Hide tasks if filtering by appointment
    if (filterStatus !== 'all') {
      const status = t.status;
      if (filterStatus === 'pending' && status !== TaskStatus.PENDING) return false;
      if (filterStatus === 'completed' && status !== TaskStatus.COMPLETED) return false;
      if (filterStatus === 'cancelled' && status !== TaskStatus.CANCELLED) return false;
      if (filterStatus === 'overdue' && status !== TaskStatus.OVERDUE) return false;
    }
    return true;
  });

  // Quick Action Handler
  const handleQuickAction = (type: 'appointment' | 'task') => {
    const now = new Date();
    setSelectedDate(now);

    // Set time to current time rounded to next 5 min
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const remainder = minutes % 5;
    if (remainder !== 0) minutes = minutes + (5 - remainder);
    if (minutes === 60) { minutes = 0; hours = hours + 1; }

    const hStr = hours.toString().padStart(2, '0');
    const mStr = minutes.toString().padStart(2, '0');
    setTime(`${hStr}:${mStr}`);

    setEntryType(type);
    setCurrentApt({ status: 'Pendiente' });
    setCurrentTask({ status: TaskStatus.PENDING });
    // Clear IDs
    setCurrentApt(prev => ({ ...prev, id: undefined }));
    setCurrentTask(prev => ({ ...prev, id: undefined }));

    setIsEditing(false);
    setValidationError('');
    setShowModal(true);
    setShowQuickActions(false);
  };

  // Time Generation Helpers
  const generateHourOptions = () => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const generateMinuteOptions = () => Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const getLeadName = (id?: string) => leads.find(l => l.id === id)?.name;
  const getPropName = (id?: string) => {
    const p = properties.find(p => p.id === id);
    return p ? `${p.projectName} - ${p.lotNumber}` : 'Ninguna';
  };
  const getAssigneeName = (id?: string) => users.find(u => u.id === id)?.name || 'Sin Asignar';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-text-main">
      {/* GOOGLE-STYLE HEADER */}
      <header className="flex items-center justify-between px-2 md:px-6 py-1.5 md:py-3 border-b border-border-color bg-surface shrink-0 z-30">
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-background rounded-full transition-colors hidden xl:block"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <CalendarIcon size={18} />
            </div>
            <h1 className="text-sm md:text-xl font-black tracking-tight hidden sm:block">Calendario</h1>
          </div>

          <div className="flex items-center gap-1 ml-2 md:ml-4">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-[11px] font-black border border-border-color rounded-md hover:bg-background transition-all active:scale-95 text-text-main/80"
            >
              Hoy
            </button>
            <div className="flex items-center ml-1">
              <button onClick={handlePrev} className="p-1.5 hover:bg-background rounded-full transition-colors text-text-muted"><ChevronLeft size={18} /></button>
              <button onClick={handleNext} className="p-1.5 hover:bg-background rounded-full transition-colors text-text-muted"><ChevronRight size={18} /></button>
            </div>
            <h2 className="text-[11px] md:text-lg font-black min-w-[100px] md:min-w-[120px] ml-1 md:ml-4">
              {format(currentDate, 'MMMM yyyy', { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-background p-0.5 rounded-lg border border-border-color shadow-inner">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-1.5 text-[10px] font-black rounded-md transition-all ${viewMode === 'month' ? 'bg-surface text-primary shadow-sm border border-border-color/50' : 'text-text-muted hover:text-text-main'}`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-1.5 text-[10px] font-black rounded-md transition-all ${viewMode === 'day' ? 'bg-surface text-primary shadow-sm border border-border-color/50' : 'text-text-muted hover:text-text-main'}`}
            >
              Día
            </button>
          </div>

          <button
            onClick={() => { setEntryType('appointment'); resetForm(); setShowModal(true); }}
            className="md:flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all active:scale-95 hidden"
          >
            <Plus size={16} />
            <span>Crear</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* GOOGLE-STYLE SIDEBAR (Centro de Gestión) */}
        <aside
          className={`
            ${showSidebar ? 'w-full md:w-72 border-r border-border-color' : 'w-0 overflow-hidden'} 
            bg-surface transition-all duration-300 flex flex-col shrink-0 z-20
            fixed inset-0 top-[53px] md:relative md:top-0
            ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <div className="p-4 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar">
            {/* Quick Filters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-black text-text-muted uppercase tracking-widest px-1">
                <span>Mis Calendarios</span>
                <SlidersHorizontal size={12} className="opacity-40" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 px-2 py-1.5 hover:bg-background rounded-lg cursor-pointer group transition-colors">
                  <div className="w-4 h-4 rounded border-2 border-primary bg-primary/10 flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary rounded-sm shadow-sm" />
                  </div>
                  <span className="text-xs font-bold text-text-main/80 group-hover:text-primary transition-colors">Citas</span>
                </div>
                <div className="flex items-center gap-3 px-2 py-1.5 hover:bg-background rounded-lg cursor-pointer group transition-colors">
                  <div className="w-4 h-4 rounded border-2 border-emerald-500 bg-emerald-500/10 flex items-center justify-center">
                    <div className="w-2 h-2 bg-emerald-500 rounded-sm shadow-sm" />
                  </div>
                  <span className="text-xs font-bold text-text-main/80 group-hover:text-emerald-500 transition-colors">Tareas</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-border-color opacity-30" />

            {/* UPCOMING EVENTS */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Próximos Eventos</h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-primary/70 uppercase px-1">Citas</span>
                  {appointments.filter(a => (a.status === 'Pendiente' || a.status === 'Vencido') && new Date(a.date) >= new Date()).length === 0 ? (
                    <p className="text-[10px] text-text-muted opacity-40 px-2 italic">Sin citas</p>
                  ) : (
                    appointments
                      .filter(a => (a.status === 'Pendiente' || a.status === 'Vencido'))
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .slice(0, 5)
                      .map(apt => (
                        <div key={apt.id} className="p-2.5 bg-background border border-primary/20 rounded-xl hover:border-primary/40 transition-all cursor-pointer group">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-[10px] font-black text-text-main truncate pr-2">{apt.title}</h4>
                            <span className="text-[8px] font-black text-primary shrink-0">{format(new Date(apt.date), 'HH:mm')}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[8px] text-text-muted truncate font-bold opacity-60">{format(new Date(apt.date), 'dd/MM')} • {getLeadName(apt.leadId) || 'Personal'}</p>
                            <button onClick={(e) => { e.stopPropagation(); handleQuickStatusUpdate('appointment', apt.id!, 'Realizado'); }} className="p-1 hover:bg-primary/10 rounded-md text-primary opacity-0 group-hover:opacity-100 transition-all"><CheckCircle2 size={12} /></button>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <span className="text-[9px] font-black text-emerald-600/70 uppercase px-1">Tareas</span>
                  {tasks.filter(t => t.status === TaskStatus.PENDING || t.status === TaskStatus.OVERDUE).length === 0 ? (
                    <p className="text-[10px] text-text-muted opacity-40 px-2 italic">Sin tareas</p>
                  ) : (
                    tasks
                      .filter(t => t.status === TaskStatus.PENDING || t.status === TaskStatus.OVERDUE)
                      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                      .slice(0, 5)
                      .map(task => (
                        <div key={task.id} className="p-2.5 bg-background border border-emerald-500/20 rounded-xl hover:border-emerald-500/40 transition-all cursor-pointer group">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-[10px] font-black text-text-main truncate pr-2">{task.title}</h4>
                            <span className={`text-[8px] font-black shrink-0 ${task.status === TaskStatus.OVERDUE ? 'text-danger' : 'text-text-muted'}`}>{format(new Date(task.dueDate), 'dd/MM')}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[8px] text-text-muted truncate font-bold opacity-60">Lead: {getLeadName(task.leadId)}</p>
                            <button onClick={(e) => { e.stopPropagation(); handleQuickStatusUpdate('task', task.id!, TaskStatus.COMPLETED); }} className="p-1 hover:bg-emerald-500/10 rounded-md text-emerald-600 opacity-0 group-hover:opacity-100 transition-all"><CheckSquare size={12} /></button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
            {/* Mobile close button */}
            <button onClick={() => setShowSidebar(false)} className="md:hidden w-full py-3 bg-background border border-border-color rounded-xl text-[10px] font-black text-text-muted uppercase tracking-widest mt-auto">Cerrar</button>
          </div>
        </aside>

        {/* MAIN CALENDAR GRID */}
        <main className="flex-1 flex flex-col bg-surface overflow-hidden relative z-10">
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 h-full relative">
            {viewMode === 'month' ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-auto custom-scrollbar bg-border-color/10">
                <div className="min-w-full md:min-w-[700px] h-full flex flex-col bg-surface">
                  <div className="grid grid-cols-7 border-b border-white/10 bg-surface sticky top-0 z-20 shadow-sm">
                    {weekDays.map(day => (
                      <div key={day} className="py-2.5 text-center text-[10px] font-black text-text-muted uppercase tracking-widest border-r last:border-r-0 border-white/10">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 grid grid-cols-7 min-h-0">
                    {calendarDays.map((day, idx) => {
                      const dayApts = filteredAppointments.filter(a => isSameDay(new Date(a.date), day)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                      const dayTasks = filteredTasks.filter(t => isSameDay(new Date(t.dueDate), day)).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
                      const isCurrentMonth = isSameMonth(day, monthStart);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div
                          key={idx}
                          onClick={() => onDateClick(day)}
                          className={`
                            min-h-[70px] md:min-h-[100px] border-b border-r border-white/5 last:border-r-0 p-0.5 md:p-1 flex flex-col gap-0.5 md:gap-1 transition-all group
                            ${!isCurrentMonth ? 'bg-background/20 opacity-40' : 'bg-surface hover:bg-primary/[0.02]'}
                            cursor-pointer
                          `}
                        >
                          <div className="flex justify-center mb-1">
                            <span
                              onClick={(e) => { e.stopPropagation(); setCurrentDate(day); setViewMode('day'); }}
                              className={`
                                w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full text-[9px] md:text-[11px] font-black transition-all
                                ${isToday ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-main/80 hover:bg-background'}
                              `}
                            >
                              {format(day, 'd')}
                            </span>
                          </div>
                          <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pb-1">
                            {dayApts.slice(0, 4).map(apt => (
                              <div
                                key={apt.id}
                                onClick={(e) => onAppointmentClick(e, apt)}
                                className={`text-[8px] md:text-[9px] px-1 md:px-2 py-0.5 md:py-1 rounded-md border truncate transition-all flex items-center gap-1 shadow-sm hover:scale-[1.02] active:scale-95 ${getAptStyle(apt.status, new Date(apt.date))}`}
                              >
                                <div className="w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-current opacity-60" />
                                <span className="font-mono opacity-80 text-[7px] md:text-[8px]">{format(new Date(apt.date), 'HH:mm')}</span>
                                <span className="truncate flex-1 font-black">{apt.title}</span>
                              </div>
                            ))}
                            {dayTasks.slice(0, 3).map(task => (
                              <div
                                key={task.id}
                                onClick={(e) => onTaskClick(e, task)}
                                className={`text-[8px] md:text-[9px] px-1 md:px-2 py-0.5 md:py-1 rounded-md border truncate transition-all flex items-center gap-1 shadow-sm hover:scale-[1.02] active:scale-95 ${getTaskStyle(task.status, new Date(task.dueDate))}`}
                              >
                                <CheckSquare size={9} md:size={10} className="shrink-0 opacity-60" />
                                <span className="truncate flex-1 font-black">{task.title}</span>
                              </div>
                            ))}
                            {(dayApts.length + dayTasks.length) > 7 && (
                              <div className="text-[8px] font-black text-text-muted/60 text-center py-0.5">
                                + {(dayApts.length + dayTasks.length) - 7} más
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden bg-surface">
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                  <div className="sticky top-0 z-20 bg-surface border-b border-white/10 py-2 md:py-4 text-center">
                    <p className="text-[9px] md:text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">{format(currentDate, 'EEEE', { locale: es })}</p>
                    <h3 className="text-xl md:text-3xl font-black text-primary flex items-center justify-center gap-4">
                      <button onClick={handlePrev} className="p-1.5 md:p-2 hover:bg-background rounded-full transition-colors"><ChevronLeft size={20} /></button>
                      {format(currentDate, 'dd')}
                      <button onClick={handleNext} className="p-1.5 md:p-2 hover:bg-background rounded-full transition-colors"><ChevronRight size={20} /></button>
                    </h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {dayHours.map(hour => {
                      const currentHourApts = filteredAppointments.filter(a => { const d = new Date(a.date); return isSameDay(d, currentDate) && getHours(d) === hour; });
                      const currentHourTasks = filteredTasks.filter(t => { const d = new Date(t.dueDate); return isSameDay(d, currentDate) && getHours(d) === hour; });

                      return (
                        <div key={hour} className="flex min-h-[60px] md:min-h-[80px] group transition-colors hover:bg-background/20">
                          <div className="w-14 md:w-24 border-r border-white/5 flex justify-center py-4">
                            <span className="text-[9px] md:text-xs font-black text-text-muted/50">{hour.toString().padStart(2, '0')}:00</span>
                          </div>
                          <div className="flex-1 p-2 md:p-3 relative cursor-pointer" onClick={() => onDateClick(currentDate, `${hour.toString().padStart(2, '0')}:00`)}>
                            <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/5" />
                            <div className="relative z-10 flex flex-wrap gap-1.5 md:gap-2">
                              {currentHourApts.map(apt => (
                                <div key={apt.id} onClick={(e) => onAppointmentClick(e, apt)} className={`flex-1 min-w-[150px] md:min-w-[260px] p-2 md:p-3 rounded-xl md:rounded-2xl border-2 text-[10px] md:text-sm flex flex-col shadow-lg shadow-black/5 cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all ${getAptStyle(apt.status, new Date(apt.date))}`}>
                                  <div className="flex justify-between font-black mb-1 items-start">
                                    <div className="flex items-center gap-1.5 md:gap-2 truncate"><Clock size={12} md:size={16} className="text-primary" /><span>{apt.title}</span></div>
                                    <span className="opacity-70 text-[8px] md:text-[10px]">{format(new Date(apt.date), 'HH:mm')}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-auto">
                                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary uppercase">
                                      {getLeadName(apt.leadId).charAt(0) || '?'}
                                    </div>
                                    <span className="opacity-80 truncate text-[10px] md:text-xs font-bold">{getLeadName(apt.leadId) || 'Sin Lead'}</span>
                                  </div>
                                </div>
                              ))}
                              {currentHourTasks.map(task => (
                                <div key={task.id} onClick={(e) => onTaskClick(e, task)} className={`flex-1 min-w-[150px] md:min-w-[260px] p-2 md:p-3 rounded-xl md:rounded-2xl border-2 text-[10px] md:text-sm flex flex-col shadow-lg shadow-black/5 cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all ${getTaskStyle(task.status, new Date(task.dueDate))}`}>
                                  <div className="flex justify-between font-black mb-1 items-start">
                                    <div className="flex items-center gap-1.5 md:gap-2 truncate"><CheckSquare size={12} md:size={16} className="text-emerald-600" /><span>{task.title}</span></div>
                                    <span className="opacity-70 text-[8px] md:text-[10px] italic">Tarea</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-auto">
                                    <UserIcon size={14} className="opacity-40" />
                                    <span className="opacity-80 truncate text-[10px] md:text-xs font-bold">{getLeadName(task.leadId) || 'General'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => { setEntryType('appointment'); resetForm(); setShowModal(true); }}
            className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 md:hidden z-40 border-4 border-surface"
          >
            <Plus size={28} />
          </button>
        </main>
      </div>

      {/* DETAIL CARD MODAL */}
      {
        showDetailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card-bg border border-white/10 rounded-none md:rounded-2xl w-full md:max-w-sm shadow-2xl animate-in zoom-in-95 h-full md:h-auto md:max-h-[90vh] flex flex-col">
              <div className={`p-3.5 border-b border-white/10 flex justify-between items-center shrink-0 ${selectedItemType === 'appointment' ? 'bg-primary/10' : 'bg-emerald-500/10'}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedItemType === 'appointment' ? 'bg-primary/20 text-primary' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    {selectedItemType === 'appointment' ? <Clock size={16} /> : <CheckSquare size={16} />}
                  </div>
                  <div>
                    <h3 className={`text-xs font-bold leading-tight ${selectedItemType === 'appointment' ? 'text-primary' : 'text-emerald-500'}`}>
                      {selectedItemType === 'appointment' ? 'Detalles de cita' : 'Detalles de tarea'}
                    </h3>
                    <p className="text-[9px] text-text-muted font-bold opacity-60">Seguimiento de evento</p>
                  </div>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-main hover:bg-black/5 rounded-full transition-all active:scale-95"><X size={16} /></button>
              </div>

              <div className="p-5 space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
                <div>
                  <h3 className="text-lg font-bold text-text-main tracking-tight leading-tight mb-0.5">
                    {selectedItemType === 'appointment' ? currentApt.title : currentTask.title}
                  </h3>
                  <p className="text-[11px] text-text-muted font-medium flex items-center gap-1 opacity-70">
                    <CalendarIcon size={13} />
                    {format(new Date(selectedItemType === 'appointment' ? currentApt.date! : currentTask.dueDate!), "eeee d 'de' MMMM, yyyy - HH:mm", { locale: es })}
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between p-2 bg-input-bg rounded-2xl border border-white/5 shadow-inner">
                    <span className="text-[10px] font-bold text-text-muted opacity-60">Estado</span>
                    <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border shadow-sm ${selectedItemType === 'appointment' ? getAptStyle(currentApt.status || '', new Date(currentApt.date!)) : getTaskStyle(currentTask.status || TaskStatus.PENDING, new Date(currentTask.dueDate!))}`}>
                      {selectedItemType === 'appointment' ? currentApt.status : currentTask.status}
                    </span>
                  </div>

                  {(selectedItemType === 'appointment' ? currentApt.leadId : currentTask.leadId) && (
                    <div className="flex items-start gap-2.5 p-2.5 bg-input-bg rounded-2xl border border-white/5 shadow-inner">
                      <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                        <UserIcon size={14} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-text-muted opacity-60">Cliente / lead</p>
                        <p className="text-xs font-bold text-text-main tracking-tight">{getLeadName(selectedItemType === 'appointment' ? currentApt.leadId : currentTask.leadId) || 'Agenda personal'}</p>
                      </div>
                    </div>
                  )}

                  {selectedItemType === 'appointment' && currentApt.propertyId && (
                    <div className="flex items-start gap-2.5 p-2.5 bg-input-bg rounded-2xl border border-white/5 shadow-inner">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/5 flex items-center justify-center text-amber-500 shrink-0">
                        <MapPin size={14} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-text-muted opacity-60">Propiedad</p>
                        <p className="text-xs font-bold text-text-main tracking-tight">{getPropName(currentApt.propertyId)}</p>
                      </div>
                    </div>
                  )}

                  {(selectedItemType === 'appointment' ? currentApt.assignedTo : currentTask.assignedTo) && (
                    <div className="flex items-start gap-2.5 p-2.5 bg-input-bg rounded-2xl border border-white/5 shadow-inner">
                      <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                        <AlignLeft size={14} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-text-muted opacity-60">Asignado a</p>
                        <p className="text-xs font-bold text-text-main tracking-tight">{getAssigneeName(selectedItemType === 'appointment' ? currentApt.assignedTo : currentTask.assignedTo)}</p>
                      </div>
                    </div>
                  )}

                  {(selectedItemType === 'appointment' ? currentApt.notes : currentTask.comments) && (
                    <div className="flex items-start gap-2.5 p-2.5 bg-input-bg rounded-2xl border border-white/5 shadow-inner">
                      <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                        <FileText size={14} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-text-muted opacity-60">Notas</p>
                        <p className="text-xs font-bold text-text-main italic tracking-tight truncate">"{selectedItemType === 'appointment' ? currentApt.notes : currentTask.comments}"</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3.5 border-t border-white/10 flex gap-2.5 bg-surface shrink-0">
                <button onClick={handleDeleteFromDetail} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-input-bg hover:bg-danger/10 text-text-muted hover:text-danger rounded-xl border border-white/5 transition-all text-[11px] font-bold active:scale-95">
                  <Trash2 size={14} /> Eliminar
                </button>
                <button onClick={handleEditFromDetail} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl transition-all text-[11px] font-bold shadow-lg shadow-primary/20 active:scale-95">
                  <Edit size={14} /> Editar
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* UNIFIED FORM MODAL (Add / Edit) */}
      {
        showModal && selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative">
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-surface relative overflow-hidden shrink-0">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                <div className="flex gap-3 items-center relative z-10">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${entryType === 'appointment' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {entryType === 'appointment' ? <Clock size={16} /> : <CheckSquare size={16} />}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-base font-bold text-text-main tracking-tight leading-tight">
                      {isEditing ? (entryType === 'appointment' ? 'Editar cita' : 'Editar tarea') : (entryType === 'appointment' ? 'Nueva cita' : 'Nueva tarea')}
                    </h3>
                    <p className="text-[10px] text-text-muted font-bold opacity-60">Seguimiento de evento</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                  {isEditing && !showDetailModal && (
                    <button onClick={() => setShowDeleteConfirm(true)} className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 rounded-full transition-all">
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-text-main hover:bg-black/5 rounded-full transition-all active:scale-95"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {!isEditing && (
                  <div className="flex p-0.5 bg-input-bg rounded-xl mb-1 border border-white/5 shadow-inner shrink-0">
                    <button onClick={() => setEntryType('appointment')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${entryType === 'appointment' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text-main'}`}>
                      <Clock size={13} /> Cita
                    </button>
                    <button onClick={() => setEntryType('task')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${entryType === 'task' ? 'bg-surface text-emerald-500 shadow-sm' : 'text-text-muted hover:text-text-main'}`}>
                      <CheckSquare size={13} /> Tarea
                    </button>
                  </div>
                )}

                {/* GRUPO 1: PROGRAMACIÓN */}
                <div className="bg-surface/50 border border-white/5 rounded-2xl p-3.5 space-y-3 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Clock size={12} />
                    </div>
                    <span className="text-[10px] font-bold text-text-main uppercase tracking-wider">Programación</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted/60 pl-1 uppercase">Fecha</label>
                      <div className="w-full bg-input-bg/50 border border-white/5 rounded-xl px-3 py-2 text-text-muted text-[11px] font-bold cursor-not-allowed shadow-inner">
                        {format(selectedDate, "d 'de' MMM, yyyy", { locale: es })}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted/60 pl-1 uppercase">Hora</label>
                      <div className="flex gap-1.5">
                        <select
                          className="w-full bg-input-bg border border-white/5 rounded-xl px-2 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary appearance-none cursor-pointer shadow-inner transition-all text-center"
                          value={time.split(':')[0]}
                          onChange={e => { const newHour = e.target.value; const currentMin = time.split(':')[1] || '00'; setTime(`${newHour}:${currentMin}`); setValidationError(''); }}
                        >
                          {generateHourOptions().map(h => (<option key={h} value={h}>{h}</option>))}
                        </select>
                        <span className="text-text-muted font-bold self-center opacity-40">:</span>
                        <select
                          className="w-full bg-input-bg border border-white/5 rounded-xl px-2 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary appearance-none cursor-pointer shadow-inner transition-all text-center"
                          value={time.split(':')[1]}
                          onChange={e => { const newMin = e.target.value; const currentHour = time.split(':')[0] || '09'; setTime(`${currentHour}:${newMin}`); setValidationError(''); }}
                        >
                          {generateMinuteOptions().map(m => (<option key={m} value={m}>{m}</option>))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRUPO 2: ASUNTO */}
                <div className="bg-surface/50 border border-white/5 rounded-2xl p-3.5 space-y-3 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <FileText size={12} />
                    </div>
                    <span className="text-[10px] font-bold text-text-main uppercase tracking-wider">Detalles del Evento</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-text-muted/60 pl-1 uppercase">Título / Asunto <span className="text-danger">*</span></label>
                    <input
                      className="w-full bg-input-bg border border-white/5 rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner placeholder:text-text-muted/30 transition-all"
                      placeholder={entryType === 'appointment' ? "Ej: Visita Lote 12" : "Ej: Enviar cotización"}
                      value={entryType === 'appointment' ? (currentApt.title || '') : (currentTask.title || '')}
                      onChange={e => entryType === 'appointment' ? setCurrentApt({ ...currentApt, title: e.target.value }) : setCurrentTask({ ...currentTask, title: e.target.value })}
                    />
                  </div>

                  {entryType === 'task' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-text-muted/60 pl-1 uppercase">Comentarios adicionales</label>
                      <textarea
                        className="w-full bg-input-bg border border-white/5 rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary resize-none h-16 shadow-inner placeholder:text-text-muted/30 transition-all"
                        placeholder="Detalles específicos de la tarea..."
                        value={currentTask.comments || ''}
                        onChange={e => setCurrentTask({ ...currentTask, comments: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {/* GRUPO 3: RELACIONES Y ASIGNACIÓN */}
                <div className="bg-surface/50 border border-white/5 rounded-2xl p-3.5 space-y-3 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Users size={12} />
                    </div>
                    <span className="text-[10px] font-bold text-text-main uppercase tracking-wider">Relaciones y Asesor</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className={`space-y-1 ${entryType === 'appointment' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : ''}`}>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-text-muted/60 pl-1 uppercase">
                          Lead relacionado {entryType === 'task' && <span className="text-danger">*</span>}
                        </label>
                        <div className="relative group/select">
                          <select
                            className="w-full bg-input-bg border border-border-color rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all pr-8"
                            value={entryType === 'appointment' ? (currentApt.leadId || '') : (currentTask.leadId || '')}
                            onChange={e => entryType === 'appointment' ? setCurrentApt({ ...currentApt, leadId: e.target.value }) : setCurrentTask({ ...currentTask, leadId: e.target.value })}
                          >
                            <option value="">{entryType === 'appointment' ? 'Sin lead (Personal)' : 'Seleccionar lead...'}</option>
                            {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                        </div>
                      </div>

                      {entryType === 'appointment' && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-text-muted/60 pl-1 uppercase">Propiedad</label>
                          <div className="relative group/select">
                            <select
                              className="w-full bg-input-bg border border-white/5 rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all pr-8"
                              value={currentApt.propertyId || ''}
                              onChange={e => setCurrentApt({ ...currentApt, propertyId: e.target.value })}
                            >
                              <option value="">Ninguna...</option>
                              {properties.map(p => <option key={p.id} value={p.id}>{p.projectName} - {p.lotNumber}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-text-muted/60 pl-1 uppercase">Asignado a</label>
                        <div className="relative group/select">
                          <select
                            className="w-full bg-input-bg border border-white/5 rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all pr-8"
                            value={entryType === 'appointment' ? (currentApt.assignedTo || '') : (currentTask.assignedTo || '')}
                            onChange={e => entryType === 'appointment' ? setCurrentApt({ ...currentApt, assignedTo: e.target.value }) : setCurrentTask({ ...currentTask, assignedTo: e.target.value })}
                          >
                            <option value="">{entryType === 'appointment' ? '-- Agenda personal --' : '-- Sin asignar --'}</option>
                            {users.filter(u => u.role !== 'SuperAdmin').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                        </div>
                      </div>

                      {isEditing && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-text-muted/60 pl-1 uppercase">Estado</label>
                          <div className="relative group/select">
                            <select
                              className="w-full bg-input-bg border border-white/5 rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all pr-8"
                              value={entryType === 'appointment' ? (currentApt.status || 'Pendiente') : (currentTask.status || TaskStatus.PENDING)}
                              onChange={e => { const val = e.target.value; if (entryType === 'appointment') setCurrentApt({ ...currentApt, status: val as any }); else setCurrentTask({ ...currentTask, status: val as any }); }}
                            >
                              <option value={entryType === 'appointment' ? "Pendiente" : TaskStatus.PENDING}>Pendiente</option>
                              <option value={entryType === 'appointment' ? "Realizado" : TaskStatus.COMPLETED}>Realizado</option>
                              <option value={entryType === 'appointment' ? "Cancelado" : TaskStatus.CANCELLED}>Cancelado</option>
                              <option value={entryType === 'appointment' ? "Vencido" : TaskStatus.OVERDUE}>Vencido</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {validationError && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/10 p-2.5 rounded-xl text-danger text-[10px] animate-in fade-in slide-in-from-top-1 mx-1">
                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                    <span className="font-bold">{validationError}</span>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/10 flex justify-between items-center gap-2 md:gap-4 bg-surface shrink-0">
                <button onClick={() => setShowModal(false)} className="px-4 md:px-6 py-2 text-[10px] md:text-[11px] font-bold text-text-muted hover:text-text-main transition-all active:scale-95">Cancelar</button>
                <button onClick={handleSaveClick} className={`px-4 md:px-7 py-2.5 text-[10px] md:text-[11px] font-bold text-white rounded-xl transition-all shadow-xl active:scale-95 flex items-center gap-2 ${entryType === 'appointment' ? 'bg-primary hover:bg-primary/95 shadow-primary/30' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'}`}>
                  {isEditing ? <Edit size={14} /> : <Save size={14} />}
                  <span className="truncate">
                    {isEditing ? (entryType === 'appointment' ? 'Guardar cambios' : 'Actualizar tarea') : (entryType === 'appointment' ? 'Agendar cita' : 'Guardar tarea')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Save Confirmation Modal */}
      {
        showSaveConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 flex flex-col items-center text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner ${entryType === 'appointment' ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600'}`}>
                  <Save size={32} />
                </div>
                <h3 className="text-xl font-bold text-text-main tracking-tight mb-2">¿Guardar {entryType === 'appointment' ? 'cita' : 'tarea'}?</h3>
                <p className="text-text-muted text-xs font-bold leading-relaxed opacity-60">Se {isEditing ? 'actualizarán los datos' : 'creará un nuevo evento'} en el calendario.</p>
              </div>
              <div className="p-6 border-t border-white/10 flex justify-center gap-4 bg-surface/50">
                <button onClick={() => setShowSaveConfirm(false)} className="flex-1 px-6 py-3 text-xs font-bold text-text-muted hover:text-text-main transition-all active:scale-95">Cancelar</button>
                <button onClick={executeSave} className={`flex-1 px-6 py-3 text-white rounded-2xl text-xs font-bold transition-all shadow-xl active:scale-95 ${entryType === 'appointment' ? 'bg-primary hover:bg-primary/95 shadow-primary/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'}`}>Confirmar</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      {
        showDeleteConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center text-danger mb-6 shadow-inner"><AlertTriangle size={32} /></div>
                <h3 className="text-xl font-bold text-text-main tracking-tight mb-2">¿Eliminar {selectedItemType === 'appointment' ? 'cita' : 'tarea'}?</h3>
                <p className="text-text-muted text-xs font-bold leading-relaxed opacity-60">Esta acción eliminará el evento del calendario permanentemente.</p>
              </div>
              <div className="p-6 border-t border-white/10 flex justify-center gap-4 bg-surface/50">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-6 py-3 text-xs font-bold text-text-muted hover:text-text-main transition-all active:scale-95">Cancelar</button>
                <button onClick={confirmDelete} className="flex-1 px-6 py-3 bg-danger hover:bg-red-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xl shadow-danger/20 active:scale-95 flex items-center justify-center gap-2"><Trash2 size={16} /><span>Eliminar</span></button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Calendar;
