
export enum PropertyStatus {
  AVAILABLE = 'Disponible',
  RESERVED = 'Reservado',
  SOLD = 'Vendido',
}

export enum LeadStatus {
  NEW = 'Nuevo',
  CONTACTED = 'Contactado',
  INTERESTED = 'Interesado',
  QUALIFIED = 'Calificado',
  CLOSED = 'Cerrado',
  LOST = 'Perdido',
}

export enum TaskStatus {
  PENDING = 'Pendiente',
  COMPLETED = 'Realizado',
  CANCELLED = 'Cancelado',
  OVERDUE = 'Vencido',
}

export interface Organization {
  id: string;
  name: string;
  plan: string;
  status: string;
  logoUrl?: string;
  slogan?: string;
  maxUsers?: number;
  expiryDate?: string;
  contactEmail?: string;
}

export interface Developer {
  id: string;
  organizationId: string;
  name: string; // Acts as "Nombre del Proyecto"
  developerName?: string; // "Nombre del Desarrollador" (Empresa)
  contactName?: string; // New: Nombre de Contacto (Persona)
  code?: string; // Made optional as requested to remove from form
  ruc?: string;
  phone?: string;
  email?: string;
  address?: string;
  comments?: string;
}

export interface Property {
  id: string;
  organizationId: string;
  developerId: string;
  projectName: string;
  lotNumber: string;
  area: number; // m2
  price: number;
  currency: string; // 'USD' | 'PEN'
  location: string;
  status: PropertyStatus;
  features: string[];
  description?: string;
  images?: string[]; // Image Gallery
}

export interface Lead {
  id: string;
  organizationId: string;
  name: string;
  phone: string; // WhatsApp number
  email?: string;
  status: string; // Dynamic Status
  source: string; // Origin (Now dynamic)
  interest?: string; // General interest text
  budget?: number; // New: Presupuesto
  currency: string; // 'USD' | 'PEN'
  lastContact: string;
  assignedTo?: string; // User ID (Gestor)
  notes?: string;
  projectId?: string; // Selected Project ID (Developer ID)
  interestedPropertyIds?: string[]; // Specific property links
  pipelineStageId?: string; // Kanban Column ID
  chatbotActive?: boolean; // New: Chatbot toggle status
  qualificationScore?: number; // AI qualification score 1-10
  tags?: string[]; // New: Tags for filtering
  aiAnalysis?: {
    summary?: string;
    objections?: string[];
    urgency?: 'low' | 'medium' | 'high';
    budget?: { min?: number; max?: number };
    authority?: 'decision_maker' | 'influencer' | 'unknown';
    fitScore?: number;
    closingPotential?: number; // 0-100
    nextAction?: string;
    buyingSignals?: string[];
    closingActions?: string[];
    analyzedAt?: string;
  };
  createdAt: string;
  updatedAt?: string;
  pipelineStageChangedAt?: string;
}

export type MediaType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'none';

export interface Message {
  id: string;
  organizationId: string;
  leadId: string;
  content: string;
  sender: 'client' | 'agent' | 'bot';
  createdAt: string;
  mediaType?: MediaType;
  mediaUrl?: string;
  mediaFilename?: string;
}

export interface QuickReply {
  id: string;
  organizationId: string;
  name: string;
  type: MediaType;
  content?: string;
  mediaUrl?: string;
  mediaFilename?: string;
  sortOrder: number;
}

export interface Campaign {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  content: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  mediaFilename?: string;
  filters: {
    tags?: string[];
    status?: string[];
    pipelineStageId?: string[];
  };
  scheduleDate?: string;
  delaySeconds: number;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';
  stats: {
    sent: number;
    failed: number;
    total: number;
  };
  createdAt: string;
  createdBy?: string;
}

export interface CampaignLog {
  id: string;
  campaignId: string;
  leadId: string;
  status: 'sent' | 'failed' | 'pending';
  errorMessage?: string;
  sentAt: string;
}

export interface Client { // Keeping legacy interface just in case, though unused in new Contacts logic
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  email?: string;
  status: string; // Dynamic Status
  origin: string;
  notes?: string;
  createdAt: string;
  interestedPropertyIds?: string[];
  birthDate?: string; // Format: YYYY-MM-DD
}

export interface ClientAutomation {
  id: string;
  organization_id: string;
  name: string;
  trigger_type: 'birthday' | 'anniversary';
  content: string;
  media_url?: string;
  media_type?: 'text' | 'image' | 'video' | 'audio' | 'document';
  is_active: boolean;
  time_to_send?: string; // HH:MM:SS
  created_at?: string;
}

export interface ClientAutomationLog {
  id: string;
  organization_id: string;
  automation_id: string;
  client_id: string;
  sent_at: string;
  status: 'sent' | 'failed';
  error_message?: string;
}

export interface Appointment {
  id: string;
  organizationId: string;
  title: string;
  date: string; // ISO String
  leadId: string;
  propertyId?: string;
  notes?: string;
  status: 'Pendiente' | 'Realizado' | 'Cancelado' | 'Vencido'; // Updated status list
  assignedTo?: string; // User ID
}

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  dueDate: string; // ISO String
  status: TaskStatus;
  assignedTo?: string; // Changed to Optional to prevent 'user1' error
  relatedTo?: string; // Client Name or Prop
  leadId?: string; // Direct link to Lead
  comments?: string; // Additional details
  createdAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  phone?: string;
  role: 'Owner' | 'SuperAdmin' | 'Admin' | 'Agent';
  status?: 'active' | 'inactive';
  avatar?: string;
}

export interface PipelineStage {
  id: string;
  organizationId: string;
  label: string;
  color: string; // Tailwind border color class or hex
  order: number;
  visible?: boolean;
}

export interface LeadSource {
  id: string;
  organizationId: string;
  name: string;
}

export interface AppSettings {
  id: string;
  logoUrl?: string;
  slogan?: string;
}

export interface FollowUpConfig {
  id: string;
  organization_id?: string;
  name: string;
  pipeline_stage_id: string; // Replaces trigger_stage_id
  delay_hours: number;
  content: string;
  media_url?: string;
  media_type: MediaType;
  is_active: boolean;
  specific_time?: string; // Format "HH:mm"
  created_at?: string;

  // New fields
  tags?: string[];
  trigger_field?: string;
  trigger_type?: 'time_delay' | 'date_match';
}

export interface OtherIncome {
  id: string;
  organizationId: string;
  description: string;
  amount: number;
  currency: string; // 'USD' | 'PEN'
  date: string;
  category: string; // 'Alquiler', 'Mantenimiento', 'Multa', 'Otros'
  propertyId?: string; // Optional link to a property
}

export interface FinancialClient {
  id: string;
  organizationId: string;
  name: string;
  document: string;
  address: string;
  civilStatus: 'Soltero' | 'Casado' | 'Divorciado' | 'Viudo';
  phone?: string;
  email?: string;
  birthDate?: string;
  occupation?: string;
  hasChildren?: boolean;
  numberOfChildren?: number;
  childrenDetails?: string;
  spouseName?: string;
  spouseDocument?: string;
  spouseAddress?: string;
  propertyId?: string; // Related property
  notes?: string;
  automationEnabled?: boolean;
  createdAt?: string;
}

export interface Sale {
  id: string;
  organizationId: string;
  propertyId: string;
  leadId?: string;
  financialClientId?: string; // New: Link to formal buyer
  clientName: string;
  agentId?: string;
  amount: number;
  currency: string; // 'USD' | 'PEN'
  commissions: { userId: string; percentage: number; amount: number }[];
  status: 'pending' | 'completed' | 'cancelled';
  date: string;
  notes?: string;
  createdAt?: string;
}

export interface Transaction {
  id: string;
  organizationId: string;
  description: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string; // 'USD' | 'PEN'
  date: string;
  category: string;
  saleId?: string; // Link to sale if commission-related
  notes?: string;
  createdAt?: string;
}
