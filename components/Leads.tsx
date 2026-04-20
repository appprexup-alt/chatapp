
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { supabase } from '../services/supabaseClient';
import {
  Search, Plus, LayoutGrid, List, Phone, Mail,
  MessageCircle, Edit, Trash2, Filter, X,
  Save, User as UserIcon, DollarSign, Bot, AlertTriangle,
  Clock, CheckSquare, Send, StickyNote, Banknote, Brain, MapPin,
  Paperclip, Mic, Image as ImageIcon, FileText, Video, Zap, ZapOff, Download, Play, Pause, Film,
  ChevronDown, Smile, Check, TrendingUp, Sparkles, Tag, Building
} from 'lucide-react';
import { Lead, User, Property, PipelineStage, LeadSource, Task, TaskStatus, Message, QuickReply, MediaType, Developer } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNotification } from './NotificationContext';
import LeadAnalysisPanel from './LeadAnalysisPanel';
import CustomModal from './CustomModal';

const Leads: React.FC = () => {
  const { addNotification } = useNotification();
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('pipeline');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [projects, setProjects] = useState<Developer[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
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

  // DETAILED MODAL STATE
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadTasks, setLeadTasks] = useState<Task[]>([]);
  const [leadMessages, setLeadMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Mobile Tab State for Detail Modal
  const [mobileTab, setMobileTab] = useState<'chat' | 'info' | 'tasks'>('chat');

  // Task Form State (New)
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [newTaskComments, setNewTaskComments] = useState('');

  // Task Edit State
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Note Form State
  const [newQuickNote, setNewQuickNote] = useState('');

  // Media & Chat Enhanced States
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [pendingFile, setPendingFile] = useState<{
    file?: File;
    preview: string;
    type: MediaType;
    caption: string;
    mediaUrl?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Quick Replies States
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState(false);
  const [showQuickReplyModal, setShowQuickReplyModal] = useState(false);
  const [editingQuickReply, setEditingQuickReply] = useState<QuickReply | null>(null);
  const [qrForm, setQrForm] = useState<Partial<QuickReply>>({ name: '', type: 'text', content: '' });
  const [qrFile, setQrFile] = useState<File | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [filteredQuickReplies, setFilteredQuickReplies] = useState<QuickReply[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Form State (Add/Edit Lead)
  const [currentLead, setCurrentLead] = useState<Partial<Lead>>({
    status: 'Nuevo',
    currency: 'USD',
    chatbotActive: true
  });
  const [phoneError, setPhoneError] = useState('');
  const [waConfig, setWaConfig] = useState<{ status: string, qr_code?: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Drag and Drop States
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  /* New Features States */
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null); // leadId
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize Input
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${Math.min(textAreaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setIsEmojiPickerOpen(false);
    textAreaRef.current?.focus();
  };

  const EMOJIS = ['👋', '👍', '🔥', '❤️', '😂', '😮', '😢', '🙏', '✅', '❌', '🎉', '🏠', '📍', '📞', '📅', '💰', '🔑', '🚪', '👀', '✨', '🤝', '💼', '📝', '📎'];
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('inmocrm_user') || 'null');
    setCurrentUser(user);
    loadData(user);
    loadQuickReplies();
  }, []);

  const loadQuickReplies = async () => {
    const qr = await db.getQuickReplies();
    setQuickReplies(qr);
  };

  // Upload file to Supabase Storage
  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error("Upload Error:", uploadError);
        addNotification({
          title: 'Error de Storage',
          message: uploadError.message || 'No se pudo subir el archivo.',
          type: 'error'
        });
        return null;
      }

      const { data: publicData } = supabase.storage.from('uploads').getPublicUrl(fileName);
      return publicData.publicUrl;
    } catch (err: any) {
      console.error("Upload Exception:", err);
      addNotification({
        title: 'Error',
        message: err.message || 'Error inesperado al subir archivo',
        type: 'error'
      });
      return null;
    }
  };

  // Determine media type from file
  const getMediaTypeFromFile = (file: File): MediaType => {
    const type = file.type.split('/')[0];
    if (type === 'image') return 'image';
    if (type === 'video') return 'video';
    if (type === 'audio') return 'audio';
    return 'document';
  };

  // Handle file attachment - show preview first
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedLead) return;

    const file = e.target.files[0];
    const mediaType = getMediaTypeFromFile(file);

    // Create preview
    let preview = '';
    if (mediaType === 'image' || mediaType === 'video') {
      preview = URL.createObjectURL(file);
    }

    setPendingFile({
      file,
      preview,
      type: mediaType,
      caption: ''
    });

    setIsAttachmentOpen(false);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send pending file
  const handleSendPendingFile = async () => {
    if (!pendingFile || !selectedLead) return;

    setIsSending(true);
    setUploadProgress(10);

    try {
      let mediaUrl = pendingFile.mediaUrl;

      // Only upload if we have a file and no pre-existing URL
      if (pendingFile.file && !mediaUrl) {
        const uploadedUrl = await uploadFile(pendingFile.file);
        if (!uploadedUrl) throw new Error("Error al subir archivo");
        mediaUrl = uploadedUrl;
      } else if (!mediaUrl) {
        throw new Error("No hay archivo ni URL para enviar");
      }

      setUploadProgress(70);

      const res = await db.addMessage({
        leadId: selectedLead.id,
        content: pendingFile.caption || (pendingFile.file ? pendingFile.file.name : ''),
        sender: 'agent',
        mediaType: pendingFile.type,
        mediaUrl: mediaUrl,
        mediaFilename: pendingFile.file ? pendingFile.file.name : `${pendingFile.type}_${Date.now()}`
      });

      // Add to local state for immediate feedback
      const newMsg: Message = {
        id: `temp-${Date.now()}`,
        organizationId: selectedLead.organizationId,
        leadId: selectedLead.id,
        content: pendingFile.caption || '',
        sender: 'agent',
        mediaType: pendingFile.type,
        mediaUrl: mediaUrl,
        mediaFilename: pendingFile.file ? pendingFile.file.name : undefined,
        createdAt: new Date().toISOString()
      };
      setLeadMessages(prev => [...prev, newMsg]);

      setUploadProgress(100);

      if (!res.success) throw new Error(res.message);

      addNotification({ title: 'Enviado', message: 'Archivo enviado correctamente', type: 'success' });
      setPendingFile(null);
    } catch (error: any) {
      addNotification({ title: 'Error', message: error.message, type: 'error' });
    } finally {
      setIsSending(false);
      setUploadProgress(0);
    }
  };

  // Cancel pending file
  const handleCancelPendingFile = () => {
    if (pendingFile?.preview) {
      URL.revokeObjectURL(pendingFile.preview);
    }
    setPendingFile(null);
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

        setIsSending(true);
        try {
          const mediaUrl = await uploadFile(file);
          if (!mediaUrl) throw new Error("Error al subir audio");

          await db.addMessage({
            leadId: selectedLead!.id,
            content: '',
            sender: 'agent',
            mediaType: 'audio',
            mediaUrl: mediaUrl,
            mediaFilename: file.name
          });

          // Optimistic Update
          const newMsg: Message = {
            id: `temp-${Date.now()}`,
            organizationId: selectedLead!.organizationId,
            leadId: selectedLead!.id,
            content: '',
            sender: 'agent',
            mediaType: 'audio',
            mediaUrl: mediaUrl,
            mediaFilename: file.name,
            createdAt: new Date().toISOString()
          };
          setLeadMessages(prev => [...prev, newMsg]);


          addNotification({ title: 'Enviado', message: 'Nota de voz enviada', type: 'success' });
        } catch (error: any) {
          addNotification({ title: 'Error', message: error.message, type: 'error' });
        } finally {
          setIsSending(false);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      addNotification({ title: 'Error', message: 'No se pudo acceder al micrófono', type: 'error' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Quick Reply handlers
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewMessage(text);

    if (text.startsWith('/')) {
      const query = text.slice(1).toLowerCase();
      const filtered = quickReplies.filter(qr =>
        qr.name.toLowerCase().includes(query) ||
        (qr.content && qr.content.toLowerCase().includes(query))
      );
      setFilteredQuickReplies(filtered);
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleUseQuickReply = async (qr: QuickReply) => {
    if (!selectedLead) return;
    setIsQuickRepliesOpen(false);
    setShowSlashMenu(false);

    if (qr.type === 'text') {
      setNewMessage(qr.content || '');
    } else {
      // Check if we have media URL
      if (!qr.mediaUrl) {
        addNotification({ title: 'Error', message: 'Esta respuesta rápida no tiene archivo adjunto', type: 'error' });
        return;
      }

      // Open confirmation modal instead of sending directly
      setPendingFile({
        file: undefined,
        preview: qr.mediaUrl,
        type: qr.type,
        caption: qr.content || '',
        mediaUrl: qr.mediaUrl
      });
    }
  };

  const handleQrFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQrFile(file);

      const type = getMediaTypeFromFile(file);
      const preview = URL.createObjectURL(file);

      setQrForm(prev => ({
        ...prev,
        type,
        mediaUrl: preview, // Preview URL
        mediaFilename: file.name
      }));
    }
  };

  const handleSaveQuickReply = async () => {
    if (!qrForm.name) return;

    try {
      let finalQr = { ...qrForm };

      // Upload file if selected
      if (qrFile) {
        const uploadedUrl = await uploadFile(qrFile);
        if (!uploadedUrl) throw new Error("Error al subir archivo de respuesta rápida");
        finalQr.mediaUrl = uploadedUrl;
        finalQr.mediaFilename = qrFile.name;
      }

      if (editingQuickReply) {
        await db.updateQuickReply({ ...editingQuickReply, ...finalQr } as QuickReply);
      } else {
        await db.addQuickReply(finalQr as QuickReply);
      }
      loadQuickReplies();
      setShowQuickReplyModal(false);
      setEditingQuickReply(null);
      setQrForm({ name: '', type: 'text', content: '' });
      setQrFile(null);
      addNotification({ title: 'Guardado', message: 'Respuesta rápida guardada', type: 'success' });
    } catch (error: any) {
      addNotification({ title: 'Error', message: error.message, type: 'error' });
    }
  };

  const handleDeleteQuickReply = async (id: string) => {
    if (!confirm('¿Eliminar esta respuesta rápida?')) return;
    await db.deleteQuickReply(id);
    loadQuickReplies();
  };

  const renderMessageContent = (msg: Message) => {
    const mediaType = msg.mediaType || 'text';

    switch (mediaType) {
      case 'image':
        return (
          <div className="space-y-1">
            <img
              src={msg.mediaUrl}
              alt="Imagen"
              className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setPreviewImage(msg.mediaUrl || null)}
            />
            {msg.content && <p className="text-[12px]">{msg.content}</p>}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-1">
            <video
              src={msg.mediaUrl}
              controls
              className="max-w-[280px] rounded-lg"
            />
            {msg.content && <p className="text-[12px]">{msg.content}</p>}
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-2 min-w-[200px]">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <Mic size={16} className="text-primary" />
            </div>
            <audio src={msg.mediaUrl} controls className="h-8 flex-1" />
          </div>
        );

      case 'document':
        return (
          <a
            href={msg.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold truncate">{msg.mediaFilename || 'Documento'}</p>
              <p className="text-[10px] opacity-60">Documento</p>
            </div>
            <Download size={18} className="text-primary" />
          </a>
        );

      default:
        return <p className="whitespace-pre-wrap leading-snug text-[12px]">{msg.content}</p>;
    }
  };

  // REALTIME SUBSCRIPTION FOR CHAT
  useEffect(() => {
    let subscription: any;

    if (showDetailModal && selectedLead) {
      const channel = supabase
        .channel('public:messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `lead_id=eq.${selectedLead.id}`,
          },
          (payload) => {
            const incomingMsg = payload.new;
            setLeadMessages((prev) => {
              if (prev.some(m => m.id === incomingMsg.id)) return prev;
              const newMessage: Message = {
                id: incomingMsg.id,
                organizationId: incomingMsg.organization_id,
                leadId: incomingMsg.lead_id,
                content: incomingMsg.content,
                sender: incomingMsg.sender,
                createdAt: incomingMsg.created_at,
                mediaType: incomingMsg.media_type,
                mediaUrl: incomingMsg.media_url,
                mediaFilename: incomingMsg.media_filename
              };
              return [...prev, newMessage];
            });
          }
        )
        .subscribe();

      subscription = channel;
    }

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [showDetailModal, selectedLead]);


  useEffect(() => {
    if (showDetailModal) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [leadMessages, showDetailModal, mobileTab]);

  const loadData = async (userParam?: User | null) => {
    const activeUser = userParam || currentUser;

    const [l, u, s, p, stages, devs] = await Promise.all([
      db.getLeads(),
      db.getUsers(),
      db.getSources(),
      db.getProperties(),
      db.getPipeline(),
      db.getDevelopers()
    ]);
    setLeads(l);
    setUsers(u);
    setSources(s);
    setProperties(p);
    setPipelineStages(stages.sort((a, b) => a.order - b.order));
    setProjects(devs);
  };

  const openDetailModal = async (lead: Lead) => {
    setSelectedLead(lead);
    setNewMessage('');
    setNewTaskTitle('');
    setNewTaskDate('');
    setNewTaskComments('');
    setNewQuickNote('');
    setTaskToEdit(null);
    setMobileTab('chat'); // Default to chat on mobile

    const allTasks = await db.getTasks();
    const specificTasks = allTasks.filter(t => t.leadId === lead.id);
    setLeadTasks(specificTasks);

    try {
      const msgs = await db.getMessages(lead.id);
      setLeadMessages(msgs);
    } catch (e) {
      setLeadMessages([]);
    }

    setShowDetailModal(true);
  };

  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    if (!selectedLead || !newMessage.trim() || isSending) return;

    const currentMsg = newMessage;
    setNewMessage('');
    setIsSending(true);

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      organizationId: selectedLead.organizationId,
      leadId: selectedLead.id,
      content: currentMsg,
      sender: 'agent',
      createdAt: new Date().toISOString()
    };
    setLeadMessages(prev => [...prev, tempMsg]);

    const res = await db.addMessage({
      leadId: selectedLead.id,
      content: currentMsg,
      sender: 'agent'
    });

    setIsSending(false);

    if (!res.success) {
      addNotification({ title: 'Error al enviar', message: res.message || 'Error desconocido en la base de datos.', type: 'error' });
      setLeadMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setNewMessage(currentMsg);
    }
  };

  const handleAddTask = async () => {
    if (!selectedLead || !newTaskTitle.trim() || !newTaskDate) {
      addNotification({ title: 'Datos incompletos', message: 'Título y fecha requeridos.', type: 'warning' });
      return;
    }

    const taskDate = new Date(newTaskDate);
    const now = new Date();
    if (taskDate < now) {
      addNotification({ title: 'Fecha Inválida', message: 'No puedes programar tareas en el pasado.', type: 'error' });
      return;
    }

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      organizationId: selectedLead.organizationId,
      title: newTaskTitle,
      dueDate: taskDate.toISOString(),
      status: TaskStatus.PENDING,
      assignedTo: selectedLead.assignedTo,
      leadId: selectedLead.id,
      comments: newTaskComments || 'Creada desde gestión de lead',
      createdAt: new Date().toISOString()
    };

    const res = await db.addTask(newTask);
    if (res.success) {
      setLeadTasks([...leadTasks, newTask]);
      setNewTaskTitle('');
      setNewTaskDate('');
      setNewTaskComments('');
      addNotification({ title: 'Tarea Programada', message: 'Tarea agregada al calendario.', type: 'success' });
    } else {
      addNotification({ title: 'Error', message: 'No se pudo crear la tarea.', type: 'error' });
    }
  };

  const handleUpdateTask = async () => {
    if (!taskToEdit || !taskToEdit.title) return;

    const res = await db.updateTask(taskToEdit);
    if (res.success) {
      setLeadTasks(leadTasks.map(t => t.id === taskToEdit.id ? taskToEdit : t));
      setTaskToEdit(null);
      addNotification({ title: 'Tarea Actualizada', message: 'Cambios guardados exitosamente.', type: 'success' });
    } else {
      addNotification({ title: 'Error', message: 'No se pudo actualizar la tarea.', type: 'error' });
    }
  };

  const handleSaveNote = async () => {
    if (!selectedLead || !newQuickNote.trim()) return;

    const timestamp = format(new Date(), "dd/MM HH:mm", { locale: es });
    const noteEntry = `[${timestamp}] ${newQuickNote}`;
    const updatedNotes = selectedLead.notes ? `${noteEntry}\n${selectedLead.notes}` : noteEntry;

    const res = await db.updateLead({ ...selectedLead, notes: updatedNotes });
    if (res.success) {
      setSelectedLead({ ...selectedLead, notes: updatedNotes });
      setNewQuickNote('');
      addNotification({ title: 'Nota Guardada', message: 'Historial actualizado.', type: 'success' });
      loadData();
    }
  };

  const handleDeleteNote = async (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedLead || !selectedLead.notes) return;

    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar Nota?',
      message: '¿Estás seguro de que deseas eliminar esta nota permanentemente?',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        if (!selectedLead || !selectedLead.notes) return; // Re-check
        const noteLines = selectedLead.notes.split('\n');
        noteLines.splice(index, 1);
        const newNotes = noteLines.join('\n');

        const res = await db.updateLead({ ...selectedLead, notes: newNotes });
        if (res.success) {
          setSelectedLead({ ...selectedLead, notes: newNotes });
          addNotification({ title: 'Nota Eliminada', message: 'La nota ha sido eliminada del historial.', type: 'info' });
          loadData();
        } else {
          addNotification({ title: 'Error', message: 'No se pudo eliminar la nota.', type: 'error' });
        }
      }
    });
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === TaskStatus.PENDING ? TaskStatus.COMPLETED : TaskStatus.PENDING;
    const res = await db.updateTask({ ...task, status: newStatus });
    if (res.success) {
      setLeadTasks(leadTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    }
  };

  const deleteTask = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar Tarea?',
      message: '¿Estás seguro de que deseas eliminar esta tarea?',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const res = await db.deleteTask(taskId);
        if (res.success) {
          setLeadTasks(prev => prev.filter(t => t.id !== taskId));
          addNotification({ title: 'Tarea Eliminada', message: 'La tarea ha sido removida.', type: 'info' });
        } else {
          addNotification({ title: 'Error', message: 'No se pudo eliminar la tarea.', type: 'error' });
        }
      }
    });
  };


  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || lead.phone.includes(searchTerm);
    const matchesSource = filterSource === 'all' || lead.source === filterSource;
    const matchesProject = filterProject === 'all' || lead.projectId === filterProject;
    const matchesUser = filterUser === 'all' ? true : filterUser === 'unassigned' ? !lead.assignedTo : lead.assignedTo === filterUser;
    return matchesSearch && matchesSource && matchesProject && matchesUser;
  }).sort((a, b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime());

  const unassignedCount = leads.filter(l => !l.assignedTo).length;

  const openAddModal = () => {
    setCurrentLead({
      status: 'Nuevo',
      currency: 'USD',
      source: 'WhatsApp',
      chatbotActive: true,
      budget: 0,
      assignedTo: currentUser?.role === 'Agent' ? currentUser.id : ''
    });
    setPhoneError('');
    setIsEditing(false);
    setShowAddModal(true);
  };

  const openEditModal = (lead: Lead) => {
    // Check assignment for Agents to show a warning
    if (currentUser?.role === 'Agent' && lead.assignedTo !== currentUser.id) {
      addNotification({
        title: 'Solo Lectura',
        message: `Este lead pertenece a ${getAgentName(lead.assignedTo)}. No podrás guardar cambios.`,
        type: 'warning'
      });
    }

    setCurrentLead({ ...lead });
    setPhoneError('');
    setIsEditing(true);
    setShowAddModal(true);
  };

  const handleDeleteClick = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar Lead?',
      message: 'Esta acción no se puede deshacer. Se eliminarán todas las tareas, historial y datos asociados.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        const res = await db.deleteLead(id);
        if (res.success) {
          addNotification({ title: 'Lead Eliminado', message: 'Eliminado correctamente.', type: 'info' });
          loadData();
        } else {
          addNotification({ title: 'Error', message: res.message || 'Error al eliminar.', type: 'error' });
        }
      }
    });
  };

  const handleToggleChatbot = async (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();

    // Check assignment for Agents
    if (currentUser?.role === 'Agent' && lead.assignedTo !== currentUser.id) {
      addNotification({
        title: 'Gestión Denegada',
        message: `Este lead pertenece a ${getAgentName(lead.assignedTo)}. Pide al supervisor la asignación si necesitas gestionarlo.`,
        type: 'warning'
      });
      return;
    }

    const newState = !lead.chatbotActive;
    const res = await db.toggleChatbot(lead.id, newState);
    if (res.success) {
      loadData();
      addNotification({
        title: newState ? 'Chatbot Activado' : 'Chatbot Pausado',
        message: `Asistente ${newState ? 'habilitado' : 'deshabilitado'} para ${lead.name}.`,
        type: newState ? 'success' : 'warning'
      });
    }
  };

  const handleCall = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:${phone}`, '_self');
  };

  const handleSave = async () => {
    if (!currentLead.name || !currentLead.phone) {
      addNotification({ title: 'Error', message: 'Nombre y teléfono obligatorios.', type: 'error' });
      return;
    }
    const phoneRegex = /^\+?[0-9\s-]{7,15}$/;
    if (!phoneRegex.test(currentLead.phone)) {
      setPhoneError('Formato inválido (Mín 7 dígitos)');
      return;
    }

    const leadData = {
      ...currentLead,
      lastContact: new Date().toISOString(),
      budget: Number(currentLead.budget) || 0
    } as Lead;

    let res;
    if (isEditing && currentLead.id) res = await db.updateLead(leadData);
    else res = await db.addLead({ ...leadData, id: Math.random().toString(36).substr(2, 9) });

    if (res.success) {
      setShowAddModal(false);
      loadData();
      addNotification({ title: 'Guardado', message: 'Lead procesado correctamente.', type: 'success' });
    } else {
      addNotification({ title: 'Error', message: res.message || 'Error al guardar.', type: 'error' });
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.setData('leadId', lead.id);
    e.dataTransfer.effectAllowed = 'move';

    // Add a ghost image styling if needed
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = e.dataTransfer.getData('leadId');
    const leadToUpdate = leads.find(l => l.id === leadId);

    if (leadToUpdate && leadToUpdate.pipelineStageId !== stageId) {
      // Check assignment for Agents
      if (currentUser?.role === 'Agent' && leadToUpdate.assignedTo !== currentUser.id) {
        addNotification({
          title: 'Movimiento Denegado',
          message: `Este lead pertenece a ${getAgentName(leadToUpdate.assignedTo)}. No puedes moverlo.`,
          type: 'warning'
        });
        return;
      }

      const updatedLead = { ...leadToUpdate, pipelineStageId: stageId, status: pipelineStages.find(s => s.id === stageId)?.label || leadToUpdate.status };
      const res = await db.updateLead(updatedLead);

      if (res.success) {
        addNotification({
          title: 'Etapa Actualizada',
          message: `Lead movido a ${pipelineStages.find(s => s.id === stageId)?.label}`,
          type: 'success'
        });
        loadData();
        // Optional: Open detail modal for the moved lead
        // openDetailModal(updatedLead);
      } else {
        addNotification({ title: 'Error', message: res.message || 'No se pudo mover el lead.', type: 'error' });
      }
    }
  };

  const getStageBadgeStyles = (colorClass: string) => {
    if (colorClass.includes('blue')) return 'bg-primary/10 text-primary border-primary/20 shadow-sm';
    if (colorClass.includes('purple')) return 'bg-primary/10 text-primary border-primary/20 shadow-sm';
    if (colorClass.includes('amber')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-sm';
    if (colorClass.includes('orange')) return 'bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-sm';
    if (colorClass.includes('green')) return 'bg-green-500/10 text-green-500 border-green-500/20 shadow-sm';
    if (colorClass.includes('emerald')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-sm';
    if (colorClass.includes('red')) return 'bg-red-500/10 text-red-500 border-red-500/20 shadow-sm';
    return 'bg-text-muted/10 text-text-muted border-text-muted/20 shadow-sm';
  };

  const getStageTitleColor = (colorClass: string) => {
    if (colorClass.includes('blue')) return 'text-primary/80';
    if (colorClass.includes('purple')) return 'text-primary/80';
    if (colorClass.includes('amber')) return 'text-amber-500/80';
    if (colorClass.includes('orange')) return 'text-orange-500/80';
    if (colorClass.includes('green')) return 'text-green-500/80';
    if (colorClass.includes('emerald')) return 'text-emerald-500/80';
    if (colorClass.includes('red')) return 'text-red-500/80';
    return 'text-text-main/80';
  };

  const getSourceName = (id: string) => sources.find(s => s.id === id)?.name || id;
  const getAgentName = (id?: string) => users.find(u => u.id === id)?.name.split(' ')[0] || 'Sin asignar';
  const isAgent = currentUser?.role === 'Agent';

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Mobile-only Header */}
      <div className="md:hidden pt-2">
        <h2 className="text-2xl font-bold text-electric-accent flex items-center gap-1.5">
          Leads
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Gestión</span>
        </h2>
        <p className="text-xs text-text-muted font-bold opacity-60">Seguimiento de prospectos y ventas</p>
      </div>

      {/* Action Bar (Search & Main Actions) */}
      <div className="bg-surface p-2 md:p-2 rounded-2xl border border-border-color flex flex-row items-center gap-1.5 md:gap-2.5 shadow-xl shadow-black/5 relative overflow-hidden shrink-0 mt-3">
        {/* Mobile-only logic for search expansion */}
        <div className={`flex-1 flex items-center gap-1.5 transition-all duration-300 ${isMobileSearchOpen ? 'w-full' : 'w-auto'}`}>

          {/* Search - Mobile Expanded & Desktop */}
          <div className={`relative group flex-1 ${!isMobileSearchOpen ? 'hidden md:block' : 'block'}`}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" size={14} />
            <input
              autoFocus={isMobileSearchOpen}
              type="text"
              placeholder="Buscar..."
              className="w-full bg-input-bg border border-border-color text-text-main text-[11px] font-bold rounded-xl pl-10 pr-4 py-2 placeholder:text-text-muted/40 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all shadow-inner"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onBlur={() => !searchTerm && setIsMobileSearchOpen(false)}
            />
            {isMobileSearchOpen && (
              <button
                onClick={() => setIsMobileSearchOpen(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 md:hidden text-text-muted hover:text-text-main"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Mobile Search Trigger Icon */}
          {!isMobileSearchOpen && (
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="md:hidden w-10 h-10 flex items-center justify-center bg-input-bg text-text-muted border border-border-color rounded-xl active:scale-95 transition-all"
            >
              <Search size={16} />
            </button>
          )}

          {/* Action Buttons */}
          {!isMobileSearchOpen && (
            <div className="flex gap-1.5 shrink-0 items-center">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center h-10 px-3 md:px-5 text-[10px] font-bold rounded-xl transition-all border ${showFilters
                  ? 'bg-primary/10 border-primary/30 text-primary shadow-inner'
                  : 'bg-input-bg text-zinc-400 hover:text-primary border-border-color'
                  }`}
              >
                <Filter size={16} />
                <span className="hidden md:inline ml-2">Filtros</span>
                {(filterSource !== 'all' || filterProject !== 'all' || filterUser !== 'all') && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary ml-2 animate-pulse" />
                )}
              </button>

              <div className="hidden md:flex items-center h-10 bg-input-bg p-1 rounded-xl border border-border-color">
                <button
                  onClick={() => setViewMode('pipeline')}
                  className={`px-3 focus:outline-none h-full rounded-lg transition-all flex items-center gap-1.5 text-[10px] ${viewMode === 'pipeline' ? 'bg-primary text-white font-bold shadow-sm' : 'text-zinc-400 hover:text-zinc-300 font-bold'}`}
                >
                  <LayoutGrid size={14} />
                  <span>Pipeline</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 focus:outline-none h-full rounded-lg transition-all flex items-center gap-1.5 text-[10px] ${viewMode === 'list' ? 'bg-primary text-white font-bold shadow-sm' : 'text-zinc-400 hover:text-zinc-300 font-bold'}`}
                >
                  <List size={14} />
                  <span>Lista</span>
                </button>
              </div>

              <button
                onClick={openAddModal}
                className="bg-primary hover:bg-primary/95 text-white h-10 w-10 md:w-auto md:px-5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 shrink-0 group active:scale-95"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                <span className="hidden md:inline font-bold text-[10px]">Nuevo lead</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {unassignedCount > 0 && !isAgent && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-4 py-2.5 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={16} className="shrink-0 text-amber-500" />
            <span className="font-bold text-body-main tracking-tight text-amber-800 dark:text-amber-300">
              Tienes <span className="underline decoration-2 underline-offset-4">{unassignedCount}</span> leads nuevos pendientes de asignación.
            </span>
          </div>
          <button
            onClick={() => { setFilterUser('unassigned'); setShowFilters(true); }}
            className="px-3 py-1.5 bg-amber-500 text-slate-200 rounded-lg text-body-secondary font-bold hover:bg-amber-600 transition-all shadow-sm active:scale-95"
          >
            Asignar ahora
          </button>
        </div>
      )}

      {/* Unified & Polished Collapsible Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-surface p-5 rounded-2xl border border-border-color animate-in fade-in slide-in-from-top-2 shadow-xl shadow-black/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/40 to-transparent"></div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted pl-1 opacity-70">Origen de lead</label>
            <select
              className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2 text-xs font-bold text-zinc-300 outline-none focus:border-border-color shadow-inner transition-all appearance-none cursor-pointer"
              value={filterSource}
              onChange={e => setFilterSource(e.target.value)}
            >
              <option value="all">Todas las fuentes</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted pl-1 opacity-70">Proyecto de Interés</label>
            <select
              className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2 text-xs font-bold text-zinc-300 outline-none focus:border-border-color shadow-inner transition-all appearance-none cursor-pointer"
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
            >
              <option value="all">Todos los proyectos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {!isAgent && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted pl-1 opacity-70">Asesor asignado</label>
              <select
                className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2 text-xs font-bold text-text-main outline-none focus:border-border-color0 shadow-inner transition-all appearance-none cursor-pointer"
                value={filterUser}
                onChange={e => setFilterUser(e.target.value)}
              >
                <option value="all">Todos los asesores</option>
                <option value="unassigned" className="text-amber-500">Sin asignar (Nuevos)</option>
                {users.filter(u => u.role !== 'SuperAdmin').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-end md:col-start-4">
            <button
              onClick={() => { setFilterSource('all'); setFilterProject('all'); setFilterUser('all'); setSearchTerm(''); }}
              className="w-full h-10 px-4 rounded-xl text-xs font-bold text-zinc-400 hover:text-danger hover:bg-danger/10 border border-border-color border-dashed transition-all active:scale-95"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {/* PIPELINE / LIST VIEW */}
      {viewMode === 'pipeline' ? (
        <div className="flex-1 -mx-4 md:-mx-6 px-4 md:px-6 h-full overflow-hidden">
          {/* Mobile: Horizontal Row with Snap, Desktop: Horizontal Row */}
          <div className="flex flex-row gap-3 md:gap-1.5 w-full h-full overflow-x-auto snap-x snap-mandatory md:snap-none custom-scrollbar pb-4">
            {pipelineStages.filter(s => s.visible !== false).map((stage, idx) => {
              const stageLeads = filteredLeads.filter(l => l.pipelineStageId === stage.id || l.status === stage.id);
              return (
                <div
                  key={stage.id}
                  className={`flex-1 min-w-[85vw] md:min-w-[280px] md:max-w-[25%] flex flex-col snap-center shrink-0 transition-all duration-300 h-full bg-surface/50 border border-border-color rounded-2xl md:rounded-[1.5rem] relative overflow-hidden md:overflow-visible ${dragOverStage === stage.id ? 'border-primary/40 shadow-lg shadow-primary/10' : 'shadow-none'
                    }`}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  onDragLeave={() => setDragOverStage(null)}
                >
                  {/* Column Header */}
                  <div className="p-3 md:p-2.5 flex justify-between items-center sticky top-0 z-10 shrink-0 border-b border-border-color bg-surface/80 backdrop-blur-sm md:bg-transparent">
                    <div className="flex items-center gap-2 md:gap-1.5 overflow-hidden">
                      <div className={`w-1.5 h-6 rounded-full ${stage.color.replace('bg-', 'bg-').split(' ')[0]}`} />
                      <h3 className={`font-bold text-[14px] truncate tracking-tight ${getStageTitleColor(stage.color)}`}>
                        {stage.label}
                      </h3>
                    </div>
                    <span className="bg-background text-text-muted text-[10px] px-2 py-0.5 rounded-lg font-bold border border-border-color shadow-inner">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 p-2 overflow-y-auto custom-scrollbar space-y-1.5 pb-20 md:pb-2">
                    {stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, lead)}
                        onDragEnd={handleDragEnd}
                        onDoubleClick={() => openDetailModal(lead)}
                        className="bg-surface px-2 py-2 md:py-2.5 rounded-xl border border-border-color hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group relative cursor-pointer active:cursor-grabbing hover:-translate-y-1 overflow-hidden"
                      >
                        {/* Premium Accent Line */}
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/0 group-hover:bg-primary/20 transition-all" />

                        <div className="flex justify-between items-start mb-1.5 md:mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-zinc-300 text-[12px] md:text-[13px] leading-snug group-hover:text-primary transition-colors truncate tracking-tight">
                              {lead.name}
                            </h4>
                            <div className="flex items-center gap-0.5 mt-0.5 opacity-60">
                              <Phone size={11} className="md:size-[12] text-text-muted" />
                              <span className="text-[10px] md:text-[11px] font-medium text-text-muted">{lead.phone}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleToggleChatbot(lead, e)}
                            className={`w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-lg transition-all shadow-inner ${lead.chatbotActive ? 'bg-success/10 text-success' : 'bg-background text-text-muted opacity-30 hover:opacity-100'}`}
                          >
                            <Bot size={16} className={lead.chatbotActive ? 'animate-pulse' : ''} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between mb-1.5 md:mb-2 w-full gap-2">
                          <div className="flex flex-wrap gap-1.5 min-h-[22px] md:min-h-[26px]">
                            {lead.budget && (
                              <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg border border-emerald-500/10 shadow-inner">
                                <Banknote size={14} className="md:size-[15]" />
                                <span>{lead.currency === 'PEN' ? 'S/' : '$'} {lead.budget.toLocaleString()}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center">
                            {lead.qualificationScore ? (() => {
                              const score = lead.qualificationScore;
                              // Estilo compacto en tonos azules (primary)
                              const colorClass = 'text-primary bg-primary/10 border-primary/20 shadow-primary/5';
                              return (
                                <div className={`flex items-center gap-1 text-[11px] md:text-[12px] font-black px-2 py-1 rounded-lg border shadow-sm ${colorClass}`} title={`Calificación IA: ${score}/10`}>
                                  <Sparkles size={14} className="md:size-[15] animate-pulse" />
                                  <span>{score}/10</span>
                                </div>
                              );
                            })() : (
                              <div className="flex items-center justify-center p-1 text-red-400/30 hover:text-red-400/50 transition-colors" title="Pendiente de evaluación IA">
                                <ZapOff size={18} strokeWidth={2.5} />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Closing Potential (only if score is not present or if specifically needed) */}
                        {lead.aiAnalysis?.closingPotential != null && !lead.qualificationScore && (() => {
                          const cp = lead.aiAnalysis!.closingPotential!;
                          const barColor = cp >= 70 ? 'bg-emerald-500' : cp >= 40 ? 'bg-amber-500' : 'bg-red-400';
                          const textColor = cp >= 70 ? 'text-emerald-500' : cp >= 40 ? 'text-amber-500' : 'text-red-400';
                          return (
                            <div className="flex items-center gap-1 flex-1 min-w-[70px] md:min-w-[80px]" title={`Potencial de cierre: ${cp}%`}>
                              <TrendingUp size={11} className={textColor} />
                              <div className="flex-1 h-1 md:h-1.5 bg-background rounded-full border border-border-color overflow-hidden shadow-inner">
                                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${cp}%` }} />
                              </div>
                              <span className={`text-[8px] md:text-[9px] font-bold ${textColor}`}>{cp}%</span>
                            </div>
                          );
                        })()}

                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-1 md:gap-1.5">
                            <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[9px] md:text-[10px] font-black shadow-inner">
                              {getAgentName(lead.assignedTo).charAt(0)}
                            </div>
                            <span className={`text-[9px] md:text-[10px] font-bold ${!lead.assignedTo ? "text-amber-500/80 italic" : "text-text-muted opacity-60"}`}>
                              {getAgentName(lead.assignedTo)}
                            </span>
                          </div>

                          <div className="flex gap-1">
                            {/* Mobile Move Button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowMoveMenu(showMoveMenu === lead.id ? null : lead.id); }}
                              className="md:hidden w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-lg active:scale-95 transition-all"
                            >
                              <TrendingUp size={13} />
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(lead); }}
                              className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                            >
                              <Edit size={13} className="md:size-[14]" />
                            </button>
                            <button
                              onClick={(e) => handleCall(lead.phone, e)}
                              className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all shadow-sm active:scale-95"
                            >
                              <Phone size={13} className="md:size-[14]" />
                            </button>
                          </div>
                        </div>

                        {/* Mobile Move Menu Overlay */}
                        {showMoveMenu === lead.id && (
                          <div className="absolute inset-0 z-20 bg-surface/95 backdrop-blur-md p-2 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-2 px-1">
                              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Mover lead a:</span>
                              <button onClick={(e) => { e.stopPropagation(); setShowMoveMenu(null); }} className="p-1 text-text-muted"><X size={14} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 overflow-y-auto custom-scrollbar flex-1 pr-1">
                              {pipelineStages.filter(s => s.id !== stage.id).map(s => (
                                <button
                                  key={s.id}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setShowMoveMenu(null);
                                    const updatedLead = { ...lead, pipelineStageId: s.id, status: s.label };
                                    const res = await db.updateLead(updatedLead);
                                    if (res.success) {
                                      addNotification({ title: 'Lead Movido', message: `Pasado a ${s.label}`, type: 'success' });
                                      loadData();
                                    }
                                  }}
                                  className="flex items-center gap-1.5 px-2 py-2 rounded-lg border border-border-color bg-background/50 text-[10px] font-bold text-zinc-300 active:bg-primary active:text-white transition-all text-left"
                                >
                                  <div className={`w-1 h-3 rounded-full ${s.color.split(' ')[0]}`} />
                                  <span className="truncate">{s.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {(lead.projectId || (lead.tags && lead.tags.length > 0)) && (
                          <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-black/30 dark:border-white/10">
                            {lead.projectId && (
                              <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md max-w-[120px]">
                                <Building size={11} className="shrink-0" />
                                <span className="truncate">{projects.find(p => p.id === lead.projectId)?.name}</span>
                              </div>
                            )}
                            {lead.tags && lead.tags.slice(0, 1).map((tag, i) => (
                              <span key={i} className="text-[9px] md:text-[10px] font-bold bg-background px-1.5 py-0.5 rounded-md border border-border-color text-text-muted/60 lowercase italic truncate max-w-[80px]">#{tag}</span>
                            ))}
                            {lead.tags && lead.tags.length > 1 && <span className="text-[9px] font-bold text-text-muted opacity-40">+{lead.tags.length - 1}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border-color overflow-hidden flex-1 flex flex-col shadow-sm">
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface/50 backdrop-blur-md z-10 border-b border-border-color">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider">Nombre del lead</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider">Contacto</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider">Interés</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider text-center">Estado</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider">Proyecto</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider">Asesor</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider text-center">Integración</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-text-muted uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {filteredLeads.map(lead => (
                  <tr key={lead.id} onDoubleClick={() => openDetailModal(lead)} className="hover:bg-primary/[0.02] transition-all group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shadow-inner">
                          {lead.name.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-zinc-300 font-bold text-[13px] tracking-tight group-hover:text-primary transition-colors truncate">{lead.name}</span>
                          <span className="text-[10px] font-medium text-text-muted opacity-50 tracking-tight lowercase">#{getSourceName(lead.source)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-zinc-300 font-bold text-[11px] tracking-tight"><Phone size={10} className="text-primary opacity-60" /> {lead.phone}</span>
                        {lead.email && <span className="flex items-center gap-1.5 text-text-muted text-[10px] font-medium tracking-tight opacity-60"><Mail size={10} /> {lead.email}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[11px] font-medium text-text-muted line-clamp-1 max-w-[150px] italic opacity-70" title={lead.interest}>
                        {lead.interest || 'Sin especificar'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {(() => {
                        const stage = pipelineStages.find(s => s.id === lead.pipelineStageId || s.id === lead.status);
                        return (
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold border shadow-sm whitespace-nowrap ${getStageBadgeStyles(stage?.color || '')}`}>
                            {stage?.label || lead.status}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[10px] font-bold text-text-muted bg-background/50 px-2 py-1 rounded-lg border border-border-color shadow-inner whitespace-nowrap">
                        {projects.find(p => p.id === lead.projectId)?.name || 'Sin proyecto'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-background/50 border border-border-color shadow-inner flex items-center justify-center text-[8px] font-black text-text-muted">
                          {getAgentName(lead.assignedTo).charAt(0)}
                        </div>
                        <span className={`text-[11px] font-bold whitespace-nowrap ${!lead.assignedTo ? "text-amber-500/80 italic font-medium" : "text-zinc-300"}`}>
                          {getAgentName(lead.assignedTo)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={(e) => handleToggleChatbot(lead, e)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all shadow-inner ${lead.chatbotActive ? 'bg-success/10 text-success' : 'bg-background text-text-muted opacity-30 hover:opacity-100'}`}
                      >
                        <Bot size={14} className={lead.chatbotActive ? 'animate-pulse' : ''} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-3 group-hover:translate-x-0">
                        <button onClick={(e) => { e.stopPropagation(); handleCall(lead.phone, e); }} className="w-7 h-7 flex items-center justify-center bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all shadow-sm"><Phone size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(lead); }} className="w-7 h-7 flex items-center justify-center bg-background border border-border-color text-text-muted hover:text-primary hover:border-primary/40 rounded-lg transition-all shadow-sm"><Edit size={12} /></button>
                        {currentUser?.role !== 'Agent' && (
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(lead.id); }} className="w-7 h-7 flex items-center justify-center bg-background border border-border-color text-text-muted hover:text-danger hover:border-danger/40 rounded-lg transition-all shadow-sm"><Trash2 size={12} /></button>
                        )}
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

      {/* DETAIL MODAL (LEAD MANAGEMENT CENTER) */}

      {
        showDetailModal && selectedLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-surface rounded-none md:rounded-2xl w-full max-w-[95vw] lg:max-w-5xl shadow-2xl flex flex-col h-[100dvh] lg:h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">

              {/* NEW UNIFIED HEADER - Premium Slim */}
              <div className="px-4 py-3 bg-surface border-b border-white/5 flex justify-between items-center shrink-0 z-30 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-black shadow-inner">
                    {selectedLead.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-sm md:text-base font-bold text-text-main tracking-tight leading-none mb-1">{selectedLead.name}</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-text-muted opacity-60 tracking-wider">#{getSourceName(selectedLead.source)}</span>
                      <span className="w-1 h-1 rounded-full bg-border-color" />
                      <span className="text-[9px] font-bold text-primary italic">{selectedLead.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="w-9 h-9 flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all border border-transparent hover:border-danger/10"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Mobile/Tablet Tab Toggle - Compact Style */}
              <div className="lg:hidden flex bg-surface border-b border-white/5 shrink-0 p-1.5 gap-1.5 bg-black/5">
                <button
                  onClick={() => setMobileTab('info')}
                  className={`flex-1 py-2 px-3 rounded-lg text-[9px] font-black tracking-wider flex items-center justify-center gap-2 transition-all ${mobileTab === 'info' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-primary/5'}`}
                >
                  <Brain size={12} /> Inteligencia
                </button>

                <button
                  onClick={() => setMobileTab('tasks')}
                  className={`flex-1 py-2 px-3 rounded-lg text-[9px] font-black tracking-wider flex items-center justify-center gap-2 transition-all ${mobileTab === 'tasks' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-primary/5'}`}
                >
                  <CheckSquare size={12} /> Gestión
                </button>
              </div>

              {/* Main Content Area: Split View */}
              <div className="flex flex-1 overflow-hidden relative lg:flex-row">

                {/* Left Sidebar: AI Analysis Panel */}
                <div className={`w-full lg:w-1/2 bg-black/5 flex flex-col border-r border-white/5 ${mobileTab === 'info' ? 'flex flex-1' : 'hidden'} lg:flex lg:h-full`}>
                  <div className="flex-1 overflow-hidden">
                    <LeadAnalysisPanel
                      lead={selectedLead}
                      messages={leadMessages}
                      onAnalysisComplete={(updatedLead) => {
                        setSelectedLead(updatedLead);
                        loadData();
                      }}
                    />
                  </div>
                </div>

                {/* Right Sidebar: Tasks & Notes */}
                <div className={`w-full lg:w-1/2 bg-surface flex flex-col ${mobileTab === 'tasks' ? 'flex flex-1' : 'hidden'} lg:flex lg:h-full`}>

                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-5">
                    {/* 1. Task Creation Area - Compact */}
                    <div className="bg-input-bg p-2.5 rounded-xl shadow-inner space-y-2 border border-border-color">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Plus size={10} className="text-primary" />
                        <h4 className="text-[9px] font-black text-text-muted tracking-widest uppercase opacity-40">Nueva actividad</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-1 space-y-0.5">
                          <label className="text-[8px] font-bold text-text-muted opacity-40 tracking-wider pl-1">TIPO</label>
                          <div className="relative group/select">
                            <select
                              className="w-full bg-surface border border-border-color rounded-lg px-2 py-1.5 text-[10px] font-bold text-text-main outline-none focus:border-primary shadow-sm appearance-none cursor-pointer transition-all"
                              value={newTaskTitle}
                              onChange={e => setNewTaskTitle(e.target.value)}
                            >
                              <option value="">Seleccionar...</option>
                              <option value="Llamar">Llamar</option>
                              <option value="Visita al proyecto">Visita</option>
                              <option value="Reunión en oficina">Reunión oficina</option>
                              <option value="Reunión Virtual">Reunión virtual</option>
                              <option value="Otros">Otros</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                          </div>
                        </div>
                        <div className="col-span-1 space-y-0.5">
                          <label className="text-[8px] font-bold text-text-muted opacity-40 tracking-wider pl-1">FECHA</label>
                          <input
                            type="datetime-local"
                            className="w-full bg-surface border border-border-color rounded-lg px-2 py-1.5 text-[10px] font-bold text-text-main outline-none focus:border-primary shadow-sm transition-all"
                            value={newTaskDate}
                            onChange={e => setNewTaskDate(e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 space-y-0.5">
                          <textarea
                            className="w-full bg-surface border border-border-color rounded-lg px-3 py-2 text-[10px] font-medium text-text-main outline-none focus:border-primary shadow-sm transition-all resize-none h-14 placeholder:text-text-muted/40"
                            placeholder="Detalles de la actividad..."
                            value={newTaskComments}
                            onChange={e => setNewTaskComments(e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleAddTask}
                        className="w-full bg-primary hover:bg-primary/95 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                      >
                        <Plus size={12} /> Agendar
                      </button>
                    </div>

                    {/* 2. Tasks List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-2">
                        <h4 className="text-[10px] font-bold text-text-muted tracking-widest opacity-60">Actividades pendientes</h4>
                        <span className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-white/10 shadow-inner">
                          {leadTasks.filter(t => t.status !== TaskStatus.COMPLETED).length}
                        </span>
                      </div>

                      {leadTasks.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-black/5">
                          <p className="text-[10px] font-bold text-text-muted opacity-40 tracking-widest">Sin actividades agendadas</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {leadTasks.map(task => (
                            <div key={task.id} className="group relative bg-input-bg border border-white/5 p-3 rounded-lg shadow-inner hover:border-white/10 transition-all">
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => toggleTaskStatus(task)}
                                  className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all shadow-inner ${task.status === TaskStatus.COMPLETED ? 'bg-success border-success text-white' : 'border-white/10 bg-black/20 hover:border-primary/40'}`}
                                >
                                  <Check size={12} className={task.status === TaskStatus.COMPLETED ? 'opacity-100' : 'opacity-0'} />
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[11px] font-bold text-text-main leading-tight mb-1.5 tracking-tight ${task.status === TaskStatus.COMPLETED ? 'opacity-40 line-through' : ''}`}>{task.title}</p>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-white/10">
                                      <Clock size={10} strokeWidth={2.5} />
                                      {format(new Date(task.dueDate), 'dd MMM, HH:mm', { locale: es })}
                                    </div>
                                    {task.comments && (
                                      <p className="text-[9px] font-medium text-text-muted italic opacity-60 truncate max-w-[150px]">"{task.comments}"</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => setTaskToEdit(task)} className="w-6 h-6 flex items-center justify-center bg-surface/50 border border-white/10 text-text-muted hover:text-primary rounded-md transition-all"><Edit size={12} /></button>
                                  <button onClick={(e) => deleteTask(task.id, e)} className="w-6 h-6 flex items-center justify-center bg-surface/50 border border-white/10 text-text-muted hover:text-danger rounded-md transition-all"><Trash2 size={12} /></button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3. Administrative Notes - Streamlined */}
                    <div className="pt-2">
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <StickyNote size={14} className="text-amber-500" />
                        <h4 className="text-[9px] font-black text-text-muted tracking-widest uppercase opacity-40">Notas internas</h4>
                      </div>

                      <div className="bg-input-bg rounded-xl overflow-hidden border border-border-color flex flex-col shadow-inner">
                        <div className="p-2.5 overflow-y-auto custom-scrollbar space-y-2 max-h-[250px] min-h-[100px]">
                          {selectedLead.notes ? (
                            selectedLead.notes.split('\n').filter(Boolean).map((line, i) => (
                              <div key={i} className="group relative text-[10px] font-bold text-text-main leading-snug bg-surface/50 border border-white/5 p-2 rounded-lg flex justify-between items-start gap-2 hover:border-white/10 transition-all shadow-sm">
                                <span className="flex-1 opacity-80">{line}</span>
                                <button onClick={(e) => handleDeleteNote(i, e)} className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all rounded-md hover:bg-danger/10 shrink-0"><Trash2 size={10} /></button>
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center py-6 opacity-20">
                              <StickyNote size={24} className="mb-2" />
                              <p className="text-[8px] font-black tracking-widest">Sin notas</p>
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex gap-2 bg-surface border-t border-white/5">
                          <input
                            className="flex-1 bg-surface border border-border-color rounded-xl px-4 py-2 text-[10px] font-bold text-text-main outline-none focus:border-amber-500/50 shadow-sm transition-all placeholder:text-text-muted/30"
                            placeholder="Nueva nota..."
                            value={newQuickNote}
                            onChange={e => setNewQuickNote(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveNote()}
                          />
                          <button
                            onClick={handleSaveNote}
                            className="bg-amber-500 hover:bg-amber-600 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* EDIT TASK MODAL (Nested) - Compact Premium */}
      {
        taskToEdit && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-surface border border-border-color rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-border-color bg-surface relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary shadow-inner">
                    <Edit size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-main tracking-tight whitespace-nowrap">Editar actividad</h3>
                    <p className="text-[10px] font-medium text-text-muted">Gestión de tareas</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-text-muted pl-1">Título / Actividad</label>
                  <input
                    className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all"
                    value={taskToEdit.title}
                    onChange={e => setTaskToEdit({ ...taskToEdit, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-text-muted pl-1">Fecha y hora</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-input-bg border border-border-color rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all"
                      value={taskToEdit.dueDate ? new Date(taskToEdit.dueDate).toISOString().slice(0, 16) : ''}
                      onChange={e => setTaskToEdit({ ...taskToEdit, dueDate: new Date(e.target.value).toISOString() })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-text-muted pl-1">Estado</label>
                    <div className="relative group/select">
                      <select
                        className="w-full bg-input-bg border border-border-color rounded-xl px-3 py-2 text-[11px] font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all"
                        value={taskToEdit.status}
                        onChange={e => setTaskToEdit({ ...taskToEdit, status: e.target.value as any })}
                      >
                        <option value={TaskStatus.PENDING}>Pendiente</option>
                        <option value={TaskStatus.COMPLETED}>Completada</option>
                        <option value={TaskStatus.CANCELLED}>Cancelada</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-text-muted pl-1">Notas</label>
                  <textarea
                    className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2 text-[11px] font-medium text-text-main h-20 resize-none outline-none focus:border-primary shadow-inner transition-all leading-relaxed"
                    value={taskToEdit.comments || ''}
                    onChange={e => setTaskToEdit({ ...taskToEdit, comments: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-5 border-t border-border-color flex justify-end gap-2 bg-surface/50">
                <button
                  onClick={() => setTaskToEdit(null)}
                  className="px-4 py-2 text-[10px] font-bold text-text-muted hover:text-text-main transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateTask}
                  className="px-6 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-[10px] font-bold transition-all shadow-lg shadow-primary/20 active:scale-95"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card-bg border border-border-color rounded-2xl w-full max-w-lg shadow-2xl flex flex-col h-auto max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-3 shrink-0 flex justify-between items-center border-b border-border-color">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isEditing ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-primary text-white shadow-lg shadow-primary/30'}`}>
                    {isEditing ? <Edit size={16} /> : <Plus size={16} />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-main tracking-tight leading-none">
                      {isEditing ? 'Editar lead' : 'Nuevo prospecto'}
                    </h4>
                    <div className="flex items-center gap-1 mt-1">
                      <UserIcon size={10} className="text-text-muted" />
                      <span className="text-[10px] font-medium text-text-muted">Gestión comercial</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="transition-colors text-text-muted hover:text-danger"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {/* 1. Información de Contacto */}
                <div className="bg-surface border border-border-color rounded-2xl p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <UserIcon size={14} className="text-primary" />
                    <h5 className="text-[11px] font-bold text-text-main uppercase tracking-wider">Datos del Prospecto</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">NOMBRE COMPLETO *</label>
                      <input
                        className="w-full bg-input-bg border border-border-color rounded-xl px-3.5 py-2 text-xs font-bold outline-none focus:border-primary shadow-inner text-text-main transition-all"
                        value={currentLead.name || ''}
                        onChange={e => setCurrentLead({ ...currentLead, name: e.target.value })}
                        placeholder="Nombre del cliente"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">TELÉFONO *</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40" />
                        <input
                          className={`w-full bg-input-bg border ${phoneError ? 'border-danger/50' : 'border-border-color'} rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all`}
                          value={currentLead.phone || ''}
                          onChange={e => { setCurrentLead({ ...currentLead, phone: e.target.value }); setPhoneError(''); }}
                          placeholder="+51..."
                        />
                      </div>
                      {phoneError && <p className="text-[9px] font-bold text-danger px-1 mt-1">{phoneError}</p>}
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">CORREO ELECTRÓNICO</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40" />
                        <input
                          type="email"
                          className="w-full bg-input-bg border border-border-color rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all"
                          value={currentLead.email || ''}
                          onChange={e => setCurrentLead({ ...currentLead, email: e.target.value })}
                          placeholder="email@ejemplo.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Gestión Comercial */}
                <div className="bg-surface border border-border-color rounded-2xl p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-secondary" />
                    <h5 className="text-[11px] font-bold text-text-main uppercase tracking-wider">Gestión de Venta</h5>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">PROYECTO INTERÉS</label>
                      <div className="relative group/select">
                        <select
                          className="w-full bg-input-bg border border-border-color rounded-xl px-3.5 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all"
                          value={currentLead.projectId || ''}
                          onChange={e => setCurrentLead({ ...currentLead, projectId: e.target.value })}
                        >
                          <option value="">Seleccionar...</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">ASESOR ASIGNADO</label>
                      <div className="relative group/select">
                        <select
                          className={`w-full bg-input-bg border border-border-color rounded-xl px-3.5 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all ${isAgent ? 'opacity-50 cursor-not-allowed' : ''}`}
                          value={currentLead.assignedTo || ''}
                          onChange={e => setCurrentLead({ ...currentLead, assignedTo: e.target.value })}
                          disabled={isAgent}
                        >
                          <option value="">Sin asignar</option>
                          {users.filter(u => u.role !== 'SuperAdmin').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">ETAPA DEL PIPELINE</label>
                      <div className="relative group/select">
                        <select
                          className="w-full bg-input-bg border border-border-color rounded-xl px-3.5 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all"
                          value={currentLead.status}
                          onChange={e => setCurrentLead({ ...currentLead, status: e.target.value })}
                        >
                          {pipelineStages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Presupuesto y Preferencias */}
                <div className="bg-surface border border-border-color rounded-2xl p-4 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-emerald-500" />
                    <h5 className="text-[11px] font-bold text-text-main uppercase tracking-wider">Perfil Económico</h5>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="col-span-2 md:col-span-1 space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">CANAL ORIGEN</label>
                      <div className="relative group/select">
                        <select
                          className="w-full bg-input-bg border border-border-color rounded-xl px-3.5 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all"
                          value={currentLead.source}
                          onChange={e => setCurrentLead({ ...currentLead, source: e.target.value })}
                        >
                          {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">PRESUPUESTO</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-[10px]">
                          {currentLead.currency === 'PEN' ? 'S/' : '$'}
                        </span>
                        <input
                          type="number"
                          className="w-full bg-input-bg border border-border-color rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-emerald-500 outline-none focus:border-primary shadow-inner transition-all"
                          value={currentLead.budget || ''}
                          onChange={e => setCurrentLead({ ...currentLead, budget: Number(e.target.value) })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">MONEDA</label>
                      <div className="relative group/select">
                        <select
                          className="w-full bg-input-bg border border-border-color rounded-xl px-3.5 py-2 text-xs font-bold text-text-main outline-none focus:border-primary shadow-inner appearance-none cursor-pointer transition-all"
                          value={currentLead.currency || 'USD'}
                          onChange={e => setCurrentLead({ ...currentLead, currency: e.target.value })}
                        >
                          <option value="USD">USD</option>
                          <option value="PEN">PEN</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted opacity-40 group-hover/select:opacity-100 transition-all" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1">DETALLES DE INTERÉS</label>
                      <textarea
                        className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-2.5 text-xs font-medium text-text-main outline-none focus:border-primary shadow-inner transition-all h-20 resize-none leading-relaxed placeholder:opacity-30"
                        value={currentLead.interest || ''}
                        onChange={e => setCurrentLead({ ...currentLead, interest: e.target.value })}
                        placeholder="Ej: Busca departamento de 3 dormitorios con vista al parque..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted/60 pl-1 uppercase tracking-wider">Etiquetas (separar por coma)</label>
                      <div className="relative">
                        <Tag size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary opacity-40" />
                        <input
                          className="w-full bg-input-bg border border-border-color rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-primary outline-none focus:border-primary shadow-inner transition-all"
                          value={currentLead.tags?.join(', ') || ''}
                          onChange={e => setCurrentLead({ ...currentLead, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                          placeholder="VIP, CALIENTE, INVERSIONISTA..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-2.5 bg-background/30 border-t border-border-color flex items-center justify-end gap-2 shrink-0">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1 text-[10px] font-bold text-text-muted hover:text-text-main transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 text-xs font-bold"
                >
                  <Save size={14} />
                  <span>{isEditing ? 'Guardar' : 'Crear'}</span>
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* FILE PREVIEW MODAL - Premium Experience */}
      {
        pendingFile && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-card-bg rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-8 flex justify-between items-center bg-card-bg/50 backdrop-blur-md shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <Paperclip size={24} />
                  </div>
                  <h3 className="text-xl font-black text-text-main uppercase tracking-[0.2em]">Confirmar envío</h3>
                </div>
                <button
                  onClick={handleCancelPendingFile}
                  className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-background/50 flex items-center justify-center min-h-[400px] p-10">
                {pendingFile.type === 'image' && (
                  <div className="relative group">
                    <img src={pendingFile.preview} alt="Preview" className="max-w-full max-h-[50vh] rounded-2xl shadow-2xl object-contain transition-transform group-hover:scale-[1.02] duration-500" />
                    <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_80px_rgba(0,0,0,0.1)] pointer-events-none"></div>
                  </div>
                )}
                {pendingFile.type === 'video' && (
                  <div className="w-full relative rounded-2xl overflow-hidden shadow-2xl">
                    <video src={pendingFile.preview} controls className="w-full max-h-[50vh]" />
                  </div>
                )}
                {pendingFile.type === 'audio' && (
                  <div className="w-full max-w-sm bg-card-bg p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary animate-pulse">
                      <Mic size={40} />
                    </div>
                    <audio src={pendingFile.preview} controls className="w-full custom-audio-player" />
                  </div>
                )}
                <div className="text-center space-y-4">
                  <p className="font-black text-text-main text-xl uppercase tracking-tighter mb-1">{pendingFile.file?.name}</p>
                  <p className="text-body-secondary font-black text-text-muted opacity-50">{(pendingFile.file?.size || 0 / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>

              <div className="p-8 border-t border-border-color bg-card-bg/50 backdrop-blur-md flex justify-between items-center gap-6">
                <button
                  onClick={handleCancelPendingFile}
                  className="px-8 py-4 text-xs font-black uppercase tracking-widest text-text-muted hover:text-text-main transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendPendingFile}
                  disabled={isSending}
                  className="flex-1 max-w-xs px-10 py-5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-body-secondary font-black shadow-xl shadow-primary/25 flex items-center justify-center gap-4 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : <Send size={20} />}
                  {isSending ? 'Enviando...' : 'Enviar ahora'}
                </button>
              </div>
            </div>
          </div>
        )
      }


      {
        isQuickRepliesOpen && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-surface border border-white/10 rounded-[2.5rem] w-full max-w-3xl shadow-2xl flex flex-col h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-white/10 bg-surface relative overflow-hidden shrink-0">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
                <div className="flex justify-between items-center relative z-10 w-full">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 shadow-inner border border-white/5">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-text-main tracking-tight uppercase">Respuestas rápidas</h3>
                      <p className="text-[10px] font-medium text-text-muted">Productivity boost</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {currentUser?.role !== 'Agent' && (
                      <button
                        onClick={() => setShowQuickReplyModal(true)}
                        className="bg-primary hover:bg-primary/95 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-xl shadow-primary/20 flex items-center gap-2 transition-all active:scale-95"
                      >
                        <Plus size={16} /> Nueva respuesta
                      </button>
                    )}
                    <button onClick={() => setIsQuickRepliesOpen(false)} className="w-10 h-10 flex items-center justify-center hover:bg-danger/10 text-text-muted hover:text-danger rounded-xl transition-all">
                      <X size={24} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-4 overflow-y-auto custom-scrollbar bg-black/5 flex-1">
                {quickReplies.length === 0 ? (
                  <div className="py-24 text-center opacity-40 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-black/20 rounded-full flex items-center justify-center shadow-inner">
                      <Zap size={32} className="text-text-muted" strokeWidth={1} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">Aún no hay respuestas guardadas</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quickReplies.map(qr => (
                      <div key={qr.id} className="group relative bg-input-bg border border-white/5 p-5 rounded-2xl hover:border-primary/30 transition-all flex gap-5 items-center cursor-pointer shadow-inner">
                        <button
                          onClick={() => handleUseQuickReply(qr)}
                          className="absolute inset-0 z-10 bg-transparent rounded-2xl"
                          title="Usar esta respuesta"
                        />

                        <div className="shrink-0 z-20">
                          {qr.mediaUrl ? (
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shadow-inner bg-black flex items-center justify-center">
                              {qr.type === 'image' ? (
                                <img src={qr.mediaUrl} alt={qr.name} className="w-full h-full object-cover" />
                              ) : qr.type === 'video' ? (
                                <div className="relative w-full h-full flex items-center justify-center bg-black">
                                  <video src={qr.mediaUrl} className="w-full h-full object-cover opacity-60" />
                                  <Film size={20} className="text-white absolute" />
                                </div>
                              ) : qr.type === 'audio' ? (
                                <div className="w-full h-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                  <Mic size={24} />
                                </div>
                              ) : (
                                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary">
                                  <FileText size={24} />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-2xl border border-white/5 shadow-inner flex items-center justify-center text-text-muted opacity-20 group-hover:opacity-60 transition-opacity bg-black/40">
                              <MessageCircle size={24} />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-center z-20">
                          <div className="flex items-center gap-3 mb-1.5">
                            <span className="font-bold text-text-main text-sm tracking-tight truncate uppercase">{qr.name}</span>
                            <span className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-lg border border-white/10">
                              /{qr.name.toLowerCase().replace(/\s+/g, '')}
                            </span>
                          </div>
                          <p className="text-[10px] font-medium text-text-muted line-clamp-2 leading-relaxed opacity-60">
                            {qr.content || "Media sin mensaje..."}
                          </p>
                        </div>

                        {currentUser?.role !== 'Agent' && (
                          <div className="flex flex-col gap-2 items-end pl-2 z-30 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingQuickReply(qr); setQrForm(qr); setShowQuickReplyModal(true); }}
                              className="p-2 bg-surface/50 border border-white/10 text-text-muted hover:text-primary rounded-xl transition-all shadow-sm"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteQuickReply(qr.id); }}
                              className="p-2 bg-surface/50 border border-white/10 text-text-muted hover:text-danger rounded-xl transition-all shadow-sm"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div >
          </div >
        )
      }

      {
        showQuickReplyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-surface border border-border-color rounded-[2.5rem] max-w-xl w-full shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-border-color bg-surface relative overflow-hidden shrink-0">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
                <div className="flex justify-between items-center relative z-10 w-full">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
                      {editingQuickReply ? <Edit size={24} /> : <Plus size={24} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-text-main tracking-tight uppercase">
                        {editingQuickReply ? 'Editar respuesta' : 'Nueva respuesta'}
                      </h3>
                      <p className="text-[10px] font-medium text-text-muted">Configuración de mensaje</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowQuickReplyModal(false); setEditingQuickReply(null); }}
                    className="w-10 h-10 flex items-center justify-center hover:bg-danger/10 text-text-muted hover:text-danger rounded-xl transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-text-muted pl-1 font-semibold">Atajo / Shortcut</label>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-bold text-xl opacity-60">/</span>
                    <input
                      placeholder="bienvenida"
                      className="w-full bg-input-bg border border-border-color rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-text-main outline-none focus:border-primary shadow-inner transition-all placeholder:text-text-muted/40"
                      value={qrForm.name}
                      onChange={e => setQrForm({ ...qrForm, name: e.target.value.replace(/\s+/g, '').toLowerCase() })}
                    />
                  </div>
                  <p className="text-[10px] font-medium text-text-muted px-2 opacity-50 italic">Escribe "/" en el chat para disparar esta respuesta.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-text-muted pl-1">Contenido del mensaje</label>
                  <textarea
                    placeholder="Escribe el contenido de tu respuesta rápida aquí..."
                    className="w-full bg-input-bg border border-border-color rounded-2xl px-6 py-4 text-xs font-medium text-text-main h-32 resize-none outline-none focus:border-primary shadow-inner transition-all leading-relaxed placeholder:text-text-muted/40"
                    value={qrForm.content}
                    onChange={e => setQrForm({ ...qrForm, content: e.target.value })}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <label className="text-[10px] font-medium text-text-muted pl-1">Archivo adjunto (Opcional)</label>

                  <input
                    type="file"
                    ref={qrFileInputRef}
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    onChange={handleQrFileSelect}
                  />

                  {!qrForm.mediaUrl ? (
                    <button
                      onClick={() => qrFileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-3 p-8 rounded-3xl border border-dashed border-border-color hover:border-primary/40 hover:bg-primary/5 transition-all text-text-muted hover:text-primary group shadow-inner bg-black/10"
                    >
                      <div className="p-3 bg-surface border border-border-color rounded-xl group-hover:border-border-color shadow-sm transition-all">
                        <Paperclip size={24} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Cargar archivo multimedia</span>
                    </button>
                  ) : (
                    <div className="relative group p-5 bg-input-bg border border-border-color rounded-2xl flex items-center gap-5 shadow-inner">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-border-color shadow-inner bg-black flex items-center justify-center shrink-0">
                        {qrForm.type === 'image' ? (
                          <img src={qrForm.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : qrForm.type === 'video' ? (
                          <div className="w-full h-full bg-black flex items-center justify-center">
                            <Film size={20} className="text-white" />
                          </div>
                        ) : qrForm.type === 'audio' ? (
                          <div className="w-full h-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <Mic size={24} />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center">
                            <FileText size={24} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-text-main truncate tracking-tight">{qrForm.mediaFilename || 'Archivo vinculado'}</p>
                        <p className="text-[9px] font-bold text-primary uppercase opacity-60 tracking-wider">{qrForm.type}</p>
                      </div>

                      <button
                        onClick={() => {
                          setQrFile(null);
                          setQrForm({ ...qrForm, mediaUrl: undefined, mediaFilename: undefined, type: 'text' });
                          if (qrFileInputRef.current) qrFileInputRef.current.value = '';
                        }}
                        className="p-3 bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-xl transition-all"
                        title="Quitar archivo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-border-color bg-surface/50 flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => { setShowQuickReplyModal(false); setEditingQuickReply(null); }}
                  className="px-6 py-3 text-xs font-bold text-text-muted hover:text-text-main transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveQuickReply}
                  className="px-8 py-3 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs font-bold shadow-xl shadow-primary/20 transition-all active:scale-95"
                >
                  Guardar respuesta
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* IMAGE PREVIEW MODAL - Minimalist Premium */}
      {
        previewImage && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-500" onClick={() => setPreviewImage(null)}>
            <button className="absolute top-8 right-8 p-4 bg-white/5 hover:bg-danger hover:text-slate-200 rounded-2xl text-slate-200/50 transition-all z-10 hover:scale-110 active:scale-90">
              <X size={32} />
            </button>
            <div className="relative group max-w-full max-h-full">
              <img
                src={previewImage}
                alt="Full Preview"
                className="max-w-full max-h-[90vh] object-contain rounded-3xl shadow-[0_0_100px_rgba(255,255,255,0.1)] transition-transform duration-700"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
        )
      }

      <CustomModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
};

export default Leads;
