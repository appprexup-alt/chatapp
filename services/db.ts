import { evolutionService } from './evolutionService';
import { supabase } from './supabaseClient';
import {
  Property,
  Lead,
  Client,
  Appointment,
  Task,
  Developer,
  User,
  PipelineStage,
  LeadSource,
  AppSettings,
  Organization,
  Message,
  QuickReply,
  MediaType,
  FollowUpConfig,
  Campaign,
  CampaignLog,
  ClientAutomation,
  ClientAutomationLog,
  OtherIncome,
  Sale,
  Transaction,
  FinancialClient
} from '../types';

// Helper to handle empty strings as null for foreign keys
const toNullable = (value: any) => {
  if (!value) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
};

// Helper to get current user from localStorage for filtering logic
const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem('inmocrm_user');
  return stored ? JSON.parse(stored) : null;
};

// Response Type for UI
type DbResult = { success: boolean; message?: string; data?: any };

class SupabaseDatabase {
  private async proxyFetch(method: string, table: string, body?: any, orgId?: string): Promise<any> {
    try {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiUrl = import.meta.env.VITE_API_URL || '';
      let url = isDev ? `http://${window.location.hostname}:4000/db/${table}` : `${apiUrl}/db/${table}`;

      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors'
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      console.log(`[DB Proxy] ${method} ${url}`, body);

      if (method === 'PUT' || method === 'DELETE' || (method === 'GET' && typeof body === 'string')) {
        const id = typeof body === 'string' ? body : body?.id;
        if (id) url += `/${id}`;
      }

      if (orgId && method === 'GET') {
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}orgId=${orgId}`;
      }

      const res = await fetch(url, options);
      const data = await res.json();

      if (!res.ok) {
        return { data: null, error: new Error(data.error || `Proxy error: ${res.statusText}`) };
      }

      return { data, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  }

  // Generic executor to try Proxy then Supabase
  async exec(table: string, op: 'select' | 'insert' | 'update' | 'delete', payload?: any, filters?: any): Promise<{ data: any, error: any }> {
    const user = getCurrentUser();
    const orgId = user?.organizationId;

    // TRY PROXY (Priority)
    const res = await this.proxyFetch(
      op === 'select' ? 'GET' : (op === 'insert' ? 'POST' : (op === 'update' ? 'PUT' : 'DELETE')),
      table,
      payload,
      orgId
    );

    // If proxy answered (even with error status), we use its data/error
    // We only fallback if there was a network transport error (proxy down)
    if (res.error && res.error.message?.includes('Failed to fetch')) {
      console.warn("Proxy connection failed, trying legacy Supabase...");
    } else {
      return res;
    }

    // FALLBACK TO SUPABASE (Hidden behind proxy issues)
    let query: any = supabase.from(table);
    if (op === 'select') query = query.select('*');
    if (op === 'insert') query = query.insert(Array.isArray(payload) ? payload : [payload]);
    if (op === 'update') query = query.update(payload);
    if (op === 'delete') query = query.delete();

    if (filters) {
      Object.keys(filters).forEach(k => {
        query = query.eq(k, filters[k]);
      });
    } else if (user?.organizationId && table !== 'organizations') {
      query = query.eq('organization_id', user.organizationId);
    }

    if (op === 'update' || op === 'delete') {
      const id = typeof payload === 'string' ? payload : payload?.id;
      if (id) query = query.eq('id', id);
    }

    return await query;
  }

  // --- AUTH ---
  async login(emailOrUsername: string, password?: string): Promise<User | null> {
    const cleanLogin = emailOrUsername.trim();

    // Try local proxy authentication first to bypass Supabase 401 issues
    try {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const loginUrl = isDev ? `http://${window.location.hostname}:4000/auth/login` : `${apiUrl}/auth/login`;

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: cleanLogin, password: password?.trim() })
      });

      if (response.ok) {
        const { user: data } = await response.json();
        console.log("Login successful via Local Proxy:", data.email);
        return {
          id: data.id,
          organizationId: data.organization_id,
          name: data.name,
          email: data.email,
          username: data.username,
          role: data.role,
          avatar: data.avatar,
          status: data.status,
          phone: data.phone
        };
      }
    } catch (err) {
      console.warn("Local auth proxy not reachable, falling back to Supabase...");
    }

    // Fallback to direct Supabase (Original logic)
    let query = supabase
      .from('users')
      .select('*')
      .or(`email.ilike."${cleanLogin}",username.ilike."${cleanLogin}"`)
      .maybeSingle();

    const { data, error } = await query;

    if (error) {
      console.error("Login error:", error.message);
      return null;
    }

    if (!data) return null;

    if (password && data.password && data.password !== password.trim()) {
      console.error("Invalid password");
      return null;
    }

    if (data.status === 'inactive') {
      console.error("User is inactive");
      return null;
    }

    console.log("Login successful for:", data.email, "Role:", data.role);

    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      email: data.email,
      username: data.username,
      role: data.role,
      avatar: data.avatar,
      status: data.status,
      phone: data.phone
    };
  }

  // --- STORAGE (Managed via Proxy) ---

  // --- ORGANIZATIONS (Super Admin Only) ---
  async getOrganizations(): Promise<Organization[]> {
    const user = getCurrentUser();
    const { data } = await this.exec('organizations', 'select');
    let orgs = data || [];

    // Only SuperAdmin or system-wide admin should see all orgs. 
    // Regular Owners only see THEIR organization.
    if (user?.role !== 'SuperAdmin' && user?.organizationId) {
      orgs = orgs.filter((o: any) => o.id === user.organizationId);
    }

    return orgs.map((o: any) => ({
      id: o.id,
      name: o.name,
      plan: o.plan,
      status: o.status,
      logoUrl: o.logo_url,
      slogan: o.slogan,
      maxUsers: o.max_users,
      expiryDate: o.expiry_date,
      contactEmail: o.contact_email
    }));
  }

  async addOrganization(org: Partial<Organization>): Promise<{ success: boolean; data?: Organization; message?: string }> {
    const { data, error } = await this.exec('organizations', 'insert', {
      name: org.name,
      plan: org.plan || 'demo',
      status: org.status || 'active',
      logo_url: org.logoUrl,
      slogan: org.slogan,
      max_users: org.maxUsers || 5,
      expiry_date: org.expiryDate,
      contact_email: org.contactEmail
    });

    if (error) return { success: false, message: error.message };
    return {
      success: true, data: {
        id: data.id,
        name: data.name,
        plan: data.plan,
        status: data.status,
        maxUsers: data.max_users,
        expiryDate: data.expiry_date,
        contactEmail: data.contact_email
      } as Organization
    };
  }

  async registerTenant(orgName: string, ownerData: { name: string, email: string, username: string, password?: string, phone?: string }): Promise<DbResult> {
    try {
      // 0. Pre-validation: Check if user already exists
      const { data: existingUsers } = await this.exec('users', 'select', null, null); // Check all users
      const existingUser = (existingUsers || []).find((u: any) => u.email === ownerData.email || u.username === ownerData.username.trim());

      if (existingUser) {
        const conflict = existingUser.email === ownerData.email ? 'el correo electrónico' : 'el nombre de usuario';
        return { success: false, message: `Ya existe un usuario con ${conflict}. Elige uno diferente.` };
      }

      // 1. Create Organization
      const { data: org, error: orgError } = await this.exec('organizations', 'insert', {
        name: orgName.trim(),
        plan: 'pro',
        status: 'active',
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days trial
      });

      if (orgError) throw orgError;

      // 2. Create Owner User
      const { data: user, error: userError } = await this.exec('users', 'insert', {
        organization_id: org.id,
        name: ownerData.name,
        email: ownerData.email,
        username: ownerData.username,
        password: ownerData.password,
        role: 'Owner',
        status: 'active',
        phone: ownerData.phone
      });

      if (userError) throw userError;

      // 3. Initialize Default Pipeline Stages
      const defaultStages = [
        { label: 'Nuevo', color: 'bg-blue-500', order: 0 },
        { label: 'Contactado', color: 'bg-purple-500', order: 1 },
        { label: 'Interesado', color: 'bg-amber-500', order: 2 },
        { label: 'Calificado', color: 'bg-orange-500', order: 3 },
        { label: 'Cerrado', color: 'bg-green-500', order: 4 },
        { label: 'Perdido', color: 'bg-red-500', order: 5 }
      ];

      for (const stage of defaultStages) {
        await this.exec('pipeline_stages', 'insert', { ...stage, organization_id: org.id });
      }

      return { success: true, data: { orgId: org.id, userId: user.id } };
    } catch (err: any) {
      console.error("Registration Error:", err);
      return { success: false, message: err.message };
    }
  }

  async deleteOrganization(id: string): Promise<DbResult> {
    const user = getCurrentUser();
    if (user?.role !== 'Owner') return { success: false, message: "Permiso denegado" };

    // Prevent deleting the main system organization if it has a specific ID or name
    const { data: orgs } = await this.exec('organizations', 'select');
    const org = (orgs || []).find((o: any) => o.id === id);
    if (org?.name.toLowerCase().includes('prex')) {
      return { success: false, message: "No se puede eliminar la organización principal del sistema." };
    }

    const { error } = await this.exec('organizations', 'delete', id);
    if (error) return { success: false, message: "Error al eliminar: asegúrese que la organización no tenga usuarios ni datos vinculados." };
    return { success: true };
  }

  async getOrganizationUsers(orgId: string): Promise<User[]> {
    const { data } = await this.exec('users', 'select', { organization_id: orgId });
    return (data || []).map((u: any) => ({
      id: u.id,
      organizationId: u.organization_id,
      name: u.name,
      email: u.email,
      username: u.username,
      role: u.role,
      status: u.status,
      avatar: u.avatar
    }));
  }

  async updateOrganization(org: Partial<Organization>): Promise<DbResult> {
    const { error } = await this.exec('organizations', 'update', {
      id: org.id,
      name: org.name,
      plan: org.plan,
      status: org.status,
      logo_url: org.logoUrl,
      slogan: org.slogan,
      max_users: org.maxUsers,
      expiry_date: org.expiryDate,
      contact_email: org.contactEmail
    });
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- SETTINGS (Per Organization) ---
  async getSettings(): Promise<AppSettings> {
    const user = getCurrentUser();
    if (!user) return { id: 'default', logoUrl: '', slogan: '' };

    const { data } = await this.exec('organizations', 'select', user.organizationId);

    if (data) {
      return {
        id: user.organizationId,
        logoUrl: data.logo_url,
        slogan: data.slogan,
        plan: data.plan,
        status: data.status,
        maxUsers: data.max_users,
        expiryDate: data.expiry_date
      } as any; // Cast as AppSettings might need update or we handle in UI
    }
    return { id: 'default', logoUrl: '', slogan: '' };
  }

  async updateSettings(settings: AppSettings): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };
    if (user.role === 'Agent') return { success: false, message: "Permiso denegado" };

    const { error } = await this.exec('organizations', 'update', {
      id: user.organizationId,
      logo_url: settings.logoUrl,
      slogan: settings.slogan
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    const { data } = await this.exec('users', 'select');
    return (data || []).map((u: any) => ({
      id: u.id,
      organizationId: u.organization_id,
      name: u.name,
      email: u.email,
      username: u.username,
      role: u.role,
      status: u.status,
      avatar: u.avatar,
      phone: u.phone
    }));
  }

  async addUser(newUser: User): Promise<DbResult> {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, message: 'No autenticado' };
    if (currentUser.role === 'Agent') return { success: false, message: 'Permiso denegado' };

    const { error } = await this.exec('users', 'insert', {
      organization_id: currentUser.role === 'SuperAdmin' ? toNullable(newUser.organizationId) || currentUser.organizationId : currentUser.organizationId,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      password: newUser.password,
      phone: newUser.phone,
      role: newUser.role,
      status: newUser.status || 'active',
      avatar: newUser.avatar
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async updateUser(updatedUser: User): Promise<DbResult> {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, message: 'No autenticado' };

    if (currentUser.role === 'Agent' && currentUser.id !== updatedUser.id) {
      return { success: false, message: 'Permiso denegado' };
    }

    const { error } = await this.exec('users', 'update', {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      username: updatedUser.username,
      password: updatedUser.password,
      phone: updatedUser.phone,
      role: updatedUser.role,
      status: updatedUser.status,
      avatar: updatedUser.avatar
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteUser(id: string): Promise<DbResult> {
    const currentUser = getCurrentUser();
    if (currentUser?.role !== 'SuperAdmin' && currentUser?.role !== 'Owner') {
      return { success: false, message: 'Permiso denegado' };
    }

    const { error } = await this.exec('users', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async changePassword(id: string, oldPassword: string, newPassword: string): Promise<DbResult> {
    const { data: user } = await this.exec('users', 'select', id);

    if (!user) return { success: false, message: "Usuario no encontrado" };
    if (user.password !== oldPassword) return { success: false, message: "La contraseña actual es incorrecta" };

    const userRecord = getCurrentUser();
    if (!userRecord) return { success: false, message: "No autenticado" };

    const { error } = await this.exec('users', 'update', { id, password: newPassword });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async requestPasswordReset(email: string): Promise<DbResult> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return { success: false, message: "Ingrese un correo electrónico válido." };

    const { data: users } = await this.exec('users', 'select');
    const user = (users || []).find((u: any) => u.email.toLowerCase() === cleanEmail);

    if (!user) return { success: false, message: "No se encontró ninguna cuenta con ese correo electrónico." };

    // Generate a random temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let tempPassword = '';
    for (let i = 0; i < 8; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { error: updateError } = await this.exec('users', 'update', { id: user.id, password: tempPassword });

    if (updateError) return { success: false, message: "Error al restablecer la contraseña." };

    return {
      success: true,
      message: "Contraseña restablecida exitosamente.",
      data: { tempPassword, userName: user.name }
    };
  }

  // --- DEVELOPERS / PROJECTS ---
  async getDevelopers(): Promise<Developer[]> {
    const { data } = await this.exec('developers', 'select');
    return (data || []).map((d: any) => ({
      id: d.id,
      organizationId: d.organization_id,
      name: d.name,
      developerName: d.developer_name,
      contactName: d.contact_name,
      ruc: d.ruc,
      phone: d.phone,
      email: d.email,
      address: d.address,
      comments: d.comments
    }));
  }

  async addDeveloper(dev: Developer): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };

    const { error } = await this.exec('developers', 'insert', {
      organization_id: user.organizationId,
      name: dev.name,
      developer_name: dev.developerName,
      contact_name: dev.contactName,
      ruc: dev.ruc,
      phone: dev.phone,
      email: dev.email,
      address: dev.address,
      comments: dev.comments
    });
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async updateDeveloper(dev: Developer): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };

    const { error } = await this.exec('developers', 'update', {
      id: dev.id,
      name: dev.name,
      developer_name: dev.developerName,
      contact_name: dev.contactName,
      ruc: dev.ruc,
      phone: dev.phone,
      email: dev.email,
      address: dev.address,
      comments: dev.comments
    });
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteDeveloper(id: string): Promise<DbResult> {
    const { error } = await this.exec('developers', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- PIPELINE ---
  async getPipeline(): Promise<PipelineStage[]> {
    const { data } = await this.exec('pipeline_stages', 'select');
    return (data || []).sort((a: any, b: any) => a.order - b.order).map((s: any) => ({
      id: s.id,
      organizationId: s.organization_id,
      label: s.label,
      color: s.color,
      order: s.order,
      visible: s.visible !== false // Default to true
    }));
  }

  async updatePipeline(stages: PipelineStage[]): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };

    try {
      for (const s of stages) {
        // Use insert with individual calls since current proxy doesn't support bulk upsert
        // We handle logic by updating if id exists
        if (s.id && !s.id.startsWith('temp_')) {
          await this.exec('pipeline_stages', 'update', {
            id: s.id,
            organization_id: user.organizationId,
            label: s.label,
            color: s.color,
            "order": s.order,
            visible: s.visible
          });
        } else {
          await this.exec('pipeline_stages', 'insert', {
            organization_id: user.organizationId,
            label: s.label,
            color: s.color,
            "order": s.order,
            visible: s.visible
          });
        }
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async deletePipelineStage(id: string): Promise<DbResult> {
    const user = getCurrentUser();
    if (user?.role === 'Agent') return { success: false, message: "Permiso denegado" };

    const { error } = await this.exec('pipeline_stages', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- SOURCES ---
  async getSources(): Promise<LeadSource[]> {
    const { data } = await this.exec('sources', 'select');
    return (data || []).map((s: any) => ({
      id: s.id,
      organizationId: s.organization_id,
      name: s.name
    }));
  }

  async addSource(source: LeadSource): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false };
    const { error } = await this.exec('sources', 'insert', {
      organization_id: user.organizationId,
      name: source.name
    });
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteSource(id: string): Promise<DbResult> {
    const { error } = await this.exec('sources', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- PROPERTIES ---
  async getProperties(): Promise<Property[]> {
    const { data } = await this.exec('properties', 'select');
    return (data || []).map((p: any) => ({
      id: p.id,
      organizationId: p.organization_id,
      developerId: p.developer_id,
      projectName: p.project_name,
      lotNumber: p.lot_number,
      area: p.area,
      price: p.price,
      currency: p.currency || 'USD',
      location: p.location,
      status: p.status,
      features: p.features || [],
      description: p.description,
      images: p.images || []
    }));
  }

  async addProperty(prop: Property): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };

    const { error } = await this.exec('properties', 'insert', {
      organization_id: user.organizationId,
      developer_id: prop.developerId,
      project_name: prop.projectName,
      lot_number: prop.lotNumber,
      area: prop.area,
      price: prop.price,
      currency: prop.currency,
      location: prop.location,
      status: prop.status,
      features: prop.features,
      description: prop.description,
      images: prop.images
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async updateProperty(prop: Property): Promise<DbResult> {
    const { error } = await this.exec('properties', 'update', {
      id: prop.id,
      developer_id: prop.developerId,
      project_name: prop.projectName,
      lot_number: prop.lotNumber,
      area: prop.area,
      price: prop.price,
      currency: prop.currency,
      location: prop.location,
      status: prop.status,
      features: prop.features,
      description: prop.description,
      images: prop.images
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteProperty(id: string): Promise<DbResult> {
    const { error } = await this.exec('properties', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }



  // --- LEADS ---
  async getLeads(): Promise<Lead[]> {
    const user = getCurrentUser();
    const { data } = await this.exec('leads', 'select');
    let leads = data || [];

    if (user?.role === 'Agent') {
      leads = leads.filter((l: any) => l.assigned_to === user.id);
    }

    return leads.map((l: any) => ({
      id: l.id,
      organizationId: l.organization_id,
      name: l.name,
      phone: l.phone,
      email: l.email,
      status: l.status,
      source: l.source,
      interest: l.interest,
      budget: l.budget,
      currency: l.currency || 'USD',
      lastContact: l.last_contact,
      assignedTo: l.assigned_to,
      notes: l.notes,
      interestedPropertyIds: l.interested_property_ids || [],
      projectId: l.project_id,
      pipelineStageId: l.pipeline_stage_id,
      pipelineStageChangedAt: l.pipeline_stage_changed_at,
      chatbotActive: l.chatbot_active !== false,
      qualificationScore: l.qualification_score,
      tags: l.tags || [],
      aiAnalysis: l.ai_analysis,
      createdAt: l.created_at,
      updatedAt: l.updated_at
    }));
  }

  async addLead(lead: Lead): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "Sesión inválida" };

    const { error } = await this.exec('leads', 'insert', {
      organization_id: user.organizationId,
      name: lead.name,
      phone: lead.phone,
      email: toNullable(lead.email),
      status: lead.status,
      source: toNullable(lead.source),
      interest: lead.interest,
      budget: lead.budget,
      currency: lead.currency,
      last_contact: lead.lastContact,
      assigned_to: user.role === 'Agent' ? user.id : toNullable(lead.assignedTo),
      notes: lead.notes,
      interested_property_ids: lead.interestedPropertyIds,
      chatbot_active: lead.chatbotActive,
      project_id: toNullable(lead.projectId),
      pipeline_stage_id: lead.pipelineStageId,
      pipeline_stage_changed_at: new Date().toISOString(),
      tags: lead.tags || []
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async updateLead(lead: Lead): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false };

    // Fetch current state via proxy
    const { data: currentLeadData } = await this.exec('leads', 'select', lead.id);

    if (!currentLeadData) {
      return { success: false, message: "Lead no encontrado." };
    }

    // SECURITY: Agent can only update their own leads
    if (user.role === 'Agent' && currentLeadData.assigned_to !== user.id) {
      return {
        success: false,
        message: 'Este lead pertenece a otro asesor.'
      };
    }

    const stageChanged = currentLeadData.pipeline_stage_id !== lead.pipelineStageId;
    const stageChangedAt = stageChanged ? new Date().toISOString() : lead.pipelineStageChangedAt || currentLeadData.pipeline_stage_changed_at;

    const { error } = await this.exec('leads', 'update', {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: toNullable(lead.email),
      status: lead.status,
      pipeline_stage_id: lead.pipelineStageId,
      pipeline_stage_changed_at: stageChangedAt,
      source: toNullable(lead.source),
      interest: lead.interest,
      budget: lead.budget,
      currency: lead.currency,
      last_contact: lead.lastContact,
      assigned_to: toNullable(lead.assignedTo),
      notes: lead.notes,
      interested_property_ids: lead.interestedPropertyIds,
      chatbot_active: lead.chatbotActive,
      project_id: toNullable(lead.projectId),
      tags: lead.tags,
      updated_at: new Date().toISOString()
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteLead(id: string): Promise<DbResult> {
    const user = getCurrentUser();
    if (user?.role === 'Agent') return { success: false, message: 'Permiso denegado' };

    const { error } = await this.exec('leads', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async toggleChatbot(id: string, isActive: boolean): Promise<DbResult> {
    const { error } = await this.exec('leads', 'update', { id, chatbot_active: isActive });
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- MESSAGES (CHAT) ---
  async getMessages(leadId: string): Promise<Message[]> {
    const { data } = await this.exec('messages', 'select');
    // We filter by lead_id manually since the generic proxy returns all for org
    // In the future we can optimize GET /db/:table?lead_id=...
    return (data || []).filter((m: any) => m.lead_id === leadId).map((m: any) => ({
      id: m.id,
      organizationId: m.organization_id,
      leadId: m.lead_id,
      content: m.content,
      sender: m.sender,
      createdAt: m.created_at,
      mediaType: m.media_type || 'text',
      mediaUrl: m.media_url,
      mediaFilename: m.media_filename
    }));
  }

  async addMessage(msg: Partial<Message>): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false };

    const { data: lead } = await this.exec('leads', 'select', msg.leadId);

    const { error } = await this.exec('messages', 'insert', {
      organization_id: user.organizationId,
      lead_id: msg.leadId,
      content: msg.content || '',
      sender: msg.sender,
      media_type: msg.mediaType || 'text',
      media_url: msg.mediaUrl,
      media_filename: msg.mediaFilename
    });

    // Send via Evolution API
    if (!error && msg.sender === 'agent' && lead?.phone) {
      try {
        const mediaType = msg.mediaType || 'text';
        if (mediaType === 'text') {
          await evolutionService.sendText(user.organizationId, lead.phone, msg.content || '');
        } else if (mediaType === 'audio') {
          await evolutionService.sendAudio(user.organizationId, lead.phone, msg.mediaUrl || '');
        } else if (mediaType === 'document') {
          await evolutionService.sendDocument(user.organizationId, lead.phone, msg.mediaUrl || '', msg.mediaFilename || 'Documento');
        } else {
          // image or video
          await evolutionService.sendMedia(user.organizationId, lead.phone, msg.mediaUrl || '', mediaType as any, msg.content);
        }
      } catch (e) {
        console.error('[Evolution] Send failed:', e);
      }
    }

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- CAMPAIGNS ---
  async getCampaigns(): Promise<Campaign[]> {
    const { data } = await this.exec('campaigns', 'select');
    return (data || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((c: any) => ({
      id: c.id,
      organizationId: c.organization_id,
      title: c.title,
      description: c.description,
      content: c.content,
      mediaUrl: c.media_url,
      mediaType: c.media_type,
      filters: c.filters || {},
      scheduleDate: c.schedule_date,
      delaySeconds: c.delay_seconds || 5,
      status: c.status,
      stats: c.stats || { sent: 0, failed: 0, total: 0 },
      createdAt: c.created_at,
      createdBy: c.created_by
    }));
  }

  async addCampaign(campaign: Partial<Campaign>): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };
    if (user.role === 'Agent') return { success: false, message: "No tienes permisos para crear campañas" };

    const { error } = await this.exec('campaigns', 'insert', {
      organization_id: user.organizationId,
      title: campaign.title,
      description: campaign.description,
      content: campaign.content,
      media_url: campaign.mediaUrl,
      media_type: campaign.mediaType,
      filters: campaign.filters,
      schedule_date: campaign.scheduleDate,
      delay_seconds: campaign.delaySeconds,
      status: campaign.status || 'draft',
      stats: campaign.stats,
      created_by: user.id
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async updateCampaign(campaign: Partial<Campaign>): Promise<DbResult> {
    if (!campaign.id) return { success: false, message: "ID requerido" };
    const user = getCurrentUser();
    if (user?.role === 'Agent') return { success: false, message: "No tienes permisos para editar campañas" };

    const { error } = await this.exec('campaigns', 'update', {
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      content: campaign.content,
      media_url: campaign.mediaUrl,
      media_type: campaign.mediaType,
      filters: campaign.filters,
      schedule_date: campaign.scheduleDate,
      delay_seconds: campaign.delaySeconds,
      status: campaign.status,
      stats: campaign.stats
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteCampaign(id: string): Promise<DbResult> {
    const user = getCurrentUser();
    if (user?.role === 'Agent') return { success: false, message: "No tienes permisos" };

    const { error } = await this.exec('campaigns', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async addCampaignLog(log: Partial<CampaignLog>): Promise<DbResult> {
    const { error } = await this.exec('campaign_logs', 'insert', {
      campaign_id: log.campaignId,
      lead_id: log.leadId,
      status: log.status,
      error_message: log.errorMessage,
      sent_at: new Date().toISOString()
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- QUICK REPLIES ---
  async getQuickReplies(): Promise<QuickReply[]> {
    const { data } = await this.exec('quick_replies', 'select');
    return (data || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)).map((qr: any) => ({
      id: qr.id,
      organizationId: qr.organization_id,
      name: qr.name,
      type: qr.type || 'text',
      content: qr.content,
      mediaUrl: qr.media_url,
      mediaFilename: qr.media_filename,
      sortOrder: qr.sort_order || 0
    }));
  }

  async addQuickReply(qr: Partial<QuickReply>): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };
    if (user.role === 'Agent') return { success: false, message: "No tienes permisos" };

    const { error } = await this.exec('quick_replies', 'insert', {
      organization_id: user.organizationId,
      name: qr.name,
      type: qr.type || 'text',
      content: qr.content,
      media_url: qr.mediaUrl,
      media_filename: qr.mediaFilename,
      sort_order: qr.sortOrder || 0
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async updateQuickReply(qr: QuickReply): Promise<DbResult> {
    const { error } = await this.exec('quick_replies', 'update', {
      id: qr.id,
      name: qr.name,
      type: qr.type,
      content: qr.content,
      media_url: qr.mediaUrl,
      mediaFilename: qr.mediaFilename,
      sort_order: qr.sortOrder
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteQuickReply(id: string): Promise<DbResult> {
    const { error } = await this.exec('quick_replies', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- CLIENTS (Legacy) ---
  async getClients(): Promise<Client[]> {
    const { data } = await this.exec('clients', 'select');
    return (data || []).map((c: any) => ({
      id: c.id,
      organizationId: c.organization_id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      status: c.status,
      origin: c.origin,
      notes: c.notes,
      createdAt: c.created_at,
      birthDate: c.birth_date,
      interestedPropertyIds: c.interested_property_ids || []
    }));
  }

  async addClient(client: Client): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false };
    const { error } = await this.exec('clients', 'insert', {
      organization_id: user.organizationId,
      name: client.name,
      phone: client.phone,
      email: toNullable(client.email),
      status: client.status,
      origin: client.origin,
      notes: client.notes,
      created_at: client.createdAt,
      birth_date: toNullable(client.birthDate),
      interested_property_ids: client.interestedPropertyIds
    });
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async updateClient(client: Client): Promise<DbResult> {
    const { error } = await this.exec('clients', 'update', {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: toNullable(client.email),
      status: client.status,
      origin: client.origin,
      notes: client.notes,
      birth_date: toNullable(client.birthDate),
      interested_property_ids: client.interestedPropertyIds
    });
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteClient(id: string): Promise<DbResult> {
    const { error } = await this.exec('clients', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- TASKS ---
  async getTasks(): Promise<Task[]> {
    const user = getCurrentUser();
    const { data } = await this.exec('tasks', 'select');
    let tasks = data || [];

    if (user?.role === 'Agent') {
      tasks = tasks.filter((t: any) => t.assigned_to === user.id);
    }

    return tasks.map((t: any) => ({
      id: t.id,
      organizationId: t.organization_id,
      title: t.title,
      dueDate: t.due_date,
      status: t.status,
      assignedTo: t.assigned_to,
      relatedTo: t.related_to,
      leadId: t.lead_id,
      comments: t.comments,
      createdAt: t.created_at
    }));
  }

  async addTask(task: Task): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false };

    const { error } = await this.exec('tasks', 'insert', {
      organization_id: user.organizationId,
      title: task.title,
      due_date: task.dueDate,
      status: task.status,
      assigned_to: user.role === 'Agent' ? user.id : toNullable(task.assignedTo),
      related_to: task.relatedTo,
      lead_id: toNullable(task.leadId),
      comments: task.comments
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async updateTask(task: Task): Promise<DbResult> {
    const { error } = await this.exec('tasks', 'update', {
      id: task.id,
      title: task.title,
      due_date: task.dueDate,
      status: task.status,
      assigned_to: toNullable(task.assignedTo),
      related_to: task.relatedTo,
      lead_id: toNullable(task.leadId),
      comments: task.comments
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteTask(id: string): Promise<DbResult> {
    const { error } = await this.exec('tasks', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- APPOINTMENTS ---
  async getAppointments(): Promise<Appointment[]> {
    const user = getCurrentUser();
    const { data } = await this.exec('appointments', 'select');
    let appointments = data || [];

    if (user?.role !== 'SuperAdmin') {
      appointments = appointments.filter((a: any) => a.organization_id === user?.organizationId);
    }
    if (user?.role === 'Agent') {
      appointments = appointments.filter((a: any) => a.assigned_to === user.id);
    }

    return appointments.map((a: any) => ({
      id: a.id,
      organizationId: a.organization_id,
      title: a.title,
      date: a.date,
      leadId: a.lead_id,
      propertyId: a.property_id,
      notes: a.notes,
      status: a.status,
      assignedTo: a.assigned_to
    }));
  }

  async addAppointment(apt: Appointment): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false };

    const { error } = await this.exec('appointments', 'insert', {
      organization_id: user.organizationId,
      title: apt.title,
      date: apt.date,
      lead_id: toNullable(apt.leadId),
      property_id: toNullable(apt.propertyId),
      notes: apt.notes,
      status: apt.status,
      assigned_to: toNullable(apt.assignedTo)
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async updateAppointment(apt: Appointment): Promise<DbResult> {
    const { error } = await this.exec('appointments', 'update', {
      id: apt.id,
      title: apt.title,
      date: apt.date,
      lead_id: toNullable(apt.leadId),
      property_id: toNullable(apt.propertyId),
      notes: apt.notes,
      status: apt.status,
      assigned_to: toNullable(apt.assignedTo)
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteAppointment(id: string): Promise<DbResult> {
    const { error } = await this.exec('appointments', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- FOLLOW UP CAMPAIGNS ---
  async getFollowUpCampaigns(): Promise<FollowUpConfig[]> {
    const { data } = await this.exec('followup_campaigns', 'select');
    return (data || []).map((c: any) => ({
      id: c.id,
      organization_id: c.organization_id,
      name: c.name,
      pipeline_stage_id: c.pipeline_stage_id || c.trigger_stage_id,
      delay_hours: c.delay_hours,
      content: c.content,
      media_url: c.media_url,
      media_type: c.media_type,
      is_active: c.is_active,
      created_at: c.created_at,
      tags: c.tags,
      trigger_field: c.trigger_field,
      trigger_type: c.trigger_type
    }));
  }

  async addFollowUpCampaign(config: Partial<FollowUpConfig>): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user?.organizationId) return { success: false, message: 'No auth' };

    const { error } = await this.exec('followup_campaigns', 'insert', {
      organization_id: user.organizationId,
      trigger_stage_id: config.pipeline_stage_id,
      delay_hours: config.delay_hours,
      content: config.content,
      media_url: config.media_url,
      media_type: config.media_type,
      is_active: config.is_active ?? true,
      tags: config.tags,
      trigger_field: config.trigger_field,
      trigger_type: config.trigger_type
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async updateFollowUpCampaign(config: Partial<FollowUpConfig>): Promise<DbResult> {
    if (!config.id) return { success: false, message: 'ID required' };

    const { error } = await this.exec('followup_campaigns', 'update', {
      id: config.id,
      trigger_stage_id: config.pipeline_stage_id,
      delay_hours: config.delay_hours,
      content: config.content,
      media_url: config.media_url,
      media_type: config.media_type,
      is_active: config.is_active,
      tags: config.tags,
      trigger_field: config.trigger_field,
      trigger_type: config.trigger_type
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async checkFollowUpLog(configId: string, leadId: string): Promise<boolean> {
    try {
      const { data } = await this.exec('followup_activity', 'select');
      const logs = (data || []).filter((l: any) => l.config_id === configId && l.lead_id === leadId && l.status === 'sent');
      return logs.length > 0;
    } catch (e) {
      console.error('[DB] Check-log exception:', e);
      return true; // Fail safe
    }
  }

  async logFollowUpActivity(log: { config_id: string; lead_id: string; status: string }): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user?.organizationId) return { success: false, message: 'No auth' };

    // Final double-check: ensure no other process snuck in a 'sent' log
    if (log.status === 'sent') {
      const alreadyLogged = await this.checkFollowUpLog(log.config_id, log.lead_id);
      if (alreadyLogged) {
        console.warn(`[DB] Skipping log insertion: Duplicate 'sent' activity detected for lead ${log.lead_id}`);
        return { success: true };
      }
    }

    const { error } = await this.exec('followup_activity', 'insert', {
      ...log,
      organization_id: user.organizationId
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteFollowUpCampaign(id: string): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };

    const { error } = await this.exec('followup_campaigns', 'delete', id);

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- CLIENT AUTOMATIONS ---
  async getClientAutomations(): Promise<(ClientAutomation & { lastSentAt?: string })[]> {
    const user = getCurrentUser();
    if (!user?.organizationId) return [];

    const { data } = await this.exec('client_automations', 'select');
    const { data: logs } = await this.exec('client_automation_logs', 'select');

    const automations = (data || []).filter((a: any) => a.organization_id === user.organizationId);
    const automationLogs = (logs || []).filter((l: any) => l.organization_id === user.organizationId);

    return automations.map((auto: any) => {
      const relevantLogs = automationLogs.filter((l: any) => l.automation_id === auto.id);
      const lastSentAt = relevantLogs.length > 0
        ? relevantLogs.sort((a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0].sent_at
        : undefined;

      return {
        ...auto,
        lastSentAt
      };
    });
  }

  async addClientAutomation(automation: Partial<ClientAutomation>): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user?.organizationId) return { success: false, message: 'No auth' };

    const { data, error } = await this.exec('client_automations', 'insert', {
      organization_id: user.organizationId,
      name: automation.name,
      trigger_type: automation.trigger_type,
      content: automation.content,
      media_url: automation.media_url,
      media_type: automation.media_type,
      is_active: automation.is_active ?? true,
      time_to_send: automation.time_to_send
    });

    if (error) return { success: false, message: error.message };
    return { success: true, data };
  }

  async updateClientAutomation(automation: Partial<ClientAutomation>): Promise<DbResult> {
    if (!automation.id) return { success: false, message: 'ID required' };

    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };

    const { data, error } = await this.exec('client_automations', 'update', {
      id: automation.id,
      name: automation.name,
      trigger_type: automation.trigger_type,
      content: automation.content,
      media_url: automation.media_url,
      media_type: automation.media_type,
      is_active: automation.is_active,
      time_to_send: automation.time_to_send
    });

    if (error) return { success: false, message: error.message };
    return { success: true, data };
  }

  async deleteClientAutomation(id: string): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };

    const { error } = await this.exec('client_automations', 'delete', id);

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- AUTOMATION LOGS ---
  async logClientAutomation(log: Partial<ClientAutomationLog>): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user?.organizationId) return { success: false };

    const { error } = await this.exec('client_automation_logs', 'insert', {
      organization_id: user.organizationId,
      automation_id: log.automation_id,
      client_id: log.client_id,
      status: log.status,
      error_message: log.error_message
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async checkAutomationLog(automationId: string, clientId: string): Promise<boolean> {
    const { data } = await this.exec('client_automation_logs', 'select');
    const logs = (data || []).filter((l: any) => l.automation_id === automationId && l.client_id === clientId && l.status === 'sent');
    return logs.length > 0;
  }

  // --- SALES & TRANSACTIONS ---
  async getSales(): Promise<Sale[]> {
    const { data } = await this.exec('sales', 'select');
    return (data || []).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((s: any) => ({
      id: s.id,
      organizationId: s.organization_id,
      propertyId: s.property_id,
      leadId: s.lead_id,
      financialClientId: s.financial_client_id,
      clientName: s.client_name,
      agentId: s.agent_id,
      amount: s.amount,
      currency: s.currency,
      commissions: s.commissions || [],
      status: s.status,
      date: s.date,
      notes: s.notes,
      createdAt: s.created_at
    }));
  }

  async addSale(sale: Partial<Sale>): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: 'No autenticado' };

    const { error } = await this.exec('sales', 'insert', {
      organization_id: user.organizationId,
      property_id: sale.propertyId,
      lead_id: toNullable(sale.leadId),
      financial_client_id: toNullable(sale.financialClientId),
      client_name: sale.clientName,
      agent_id: sale.agentId,
      amount: sale.amount,
      currency: sale.currency,
      commissions: sale.commissions,
      status: sale.status || 'completed',
      date: sale.date || new Date().toISOString().split('T')[0],
      notes: sale.notes
    });

    if (error) return { success: false, message: error.message };

    // Update property status to SOLD
    if (sale.propertyId) {
      await this.exec('properties', 'update', { id: sale.propertyId, status: 'Vendido' });
    }

    return { success: true };
  }

  async updateSale(sale: Partial<Sale>): Promise<DbResult> {
    if (!sale.id) return { success: false, message: 'ID requerido' };

    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };

    const { error } = await this.exec('sales', 'update', {
      id: sale.id,
      property_id: sale.propertyId,
      lead_id: toNullable(sale.leadId),
      financial_client_id: toNullable(sale.financialClientId),
      client_name: sale.clientName,
      agent_id: sale.agentId,
      amount: sale.amount,
      currency: sale.currency,
      commissions: sale.commissions,
      status: sale.status,
      date: sale.date,
      notes: sale.notes
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- FINANCIAL CLIENTS ---
  async getFinancialClients(): Promise<FinancialClient[]> {
    const user = getCurrentUser();
    if (!user?.organizationId) return [];

    const { data, error } = await this.exec('financial_clients', 'select');

    if (error) {
      console.error('Error fetching financial clients:', error);
      return [];
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      organizationId: c.organization_id,
      name: c.name,
      document: c.document,
      address: c.address,
      civilStatus: c.civil_status,
      phone: c.phone,
      email: c.email,
      birthDate: c.birth_date,
      occupation: c.occupation,
      hasChildren: c.has_children,
      numberOfChildren: c.number_of_children,
      childrenDetails: c.children_details,
      spouseName: c.spouse_name,
      spouseDocument: c.spouse_document,
      spouseAddress: c.spouse_address,
      propertyId: c.property_id,
      notes: c.notes,
      createdAt: c.created_at
    }));
  }

  async addFinancialClient(client: Partial<FinancialClient>): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user?.organizationId) return { success: false, message: 'No auth' };

    const { data, error } = await this.exec('financial_clients', 'insert', {
      organization_id: user.organizationId,
      name: client.name,
      document: client.document,
      address: client.address,
      civil_status: client.civilStatus,
      phone: client.phone,
      email: client.email,
      birth_date: client.birthDate,
      occupation: client.occupation,
      has_children: client.hasChildren,
      number_of_children: client.numberOfChildren,
      children_details: client.childrenDetails,
      spouse_name: client.spouseName,
      spouse_document: client.spouseDocument,
      spouse_address: client.spouseAddress,
      property_id: client.propertyId,
      notes: client.notes,
      automation_enabled: client.automationEnabled
    });

    if (error) return { success: false, message: error.message };
    return { success: true, data };
  }

  async updateFinancialClient(client: Partial<FinancialClient>): Promise<DbResult> {
    if (!client.id) return { success: false, message: 'ID required' };

    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };

    const { data, error } = await this.exec('financial_clients', 'update', {
      id: client.id,
      name: client.name,
      document: client.document,
      address: client.address,
      civil_status: client.civilStatus,
      phone: client.phone,
      email: client.email,
      birth_date: client.birthDate,
      occupation: client.occupation,
      has_children: client.hasChildren,
      number_of_children: client.numberOfChildren,
      children_details: client.childrenDetails,
      spouse_name: client.spouseName,
      spouse_document: client.spouseDocument,
      spouse_address: client.spouseAddress,
      property_id: client.propertyId,
      notes: client.notes,
      automation_enabled: client.automationEnabled
    });

    if (error) return { success: false, message: error.message };
    return { success: true, data };
  }

  async deleteFinancialClient(id: string): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };
    const { error } = await this.exec('financial_clients', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async getBirthdayClients(): Promise<(FinancialClient & { projectName?: string; lastSentAt?: string })[]> {
    const user = getCurrentUser();
    if (!user?.organizationId) return [];

    const currentMonth = new Date().getMonth() + 1;
    const currentMonthStr = currentMonth.toString().padStart(2, '0');

    const { data: clients, error } = await this.exec('financial_clients', 'select');

    if (error) {
      console.error('Error fetching birthday clients:', error);
      return [];
    }

    return (clients || [])
      .filter((c: any) => c.organization_id === user.organizationId && c.birth_date)
      .filter((c: any) => {
        const parts = c.birth_date.split('-');
        let month = '';
        if (parts.length === 3) { month = parts[1]; } else if (parts.length === 2) { month = parts[0]; }
        return month === currentMonthStr;
      })
      .map((c: any) => ({
        id: c.id,
        organizationId: c.organization_id,
        name: c.name,
        document: c.document,
        address: c.address,
        civilStatus: c.civil_status,
        phone: c.phone,
        email: c.email,
        birthDate: c.birth_date,
        occupation: c.occupation,
        hasChildren: c.has_children,
        numberOfChildren: c.number_of_children,
        childrenDetails: c.children_details,
        spouseName: c.spouse_name,
        spouseDocument: c.spouse_document,
        spouseAddress: c.spouse_address,
        propertyId: c.property_id,
        notes: c.notes,
        automationEnabled: c.automation_enabled !== false,
        createdAt: c.created_at
      }));
  }

  async updateFinancialClientAutomation(clientId: string, enabled: boolean): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };

    const { error } = await this.exec('financial_clients', 'update', { id: clientId, automation_enabled: enabled });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteSale(id: string): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };
    const { error } = await this.exec('sales', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async getTransactions(): Promise<Transaction[]> {
    const user = getCurrentUser();
    if (!user) return [];

    const { data } = await this.exec('transactions', 'select');
    return (data || []).filter((t: any) => t.organization_id === user.organizationId).map((t: any) => ({
      id: t.id,
      organizationId: t.organization_id,
      description: t.description,
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      date: t.date,
      category: t.category,
      saleId: t.sale_id,
      notes: t.notes,
      createdAt: t.created_at
    }));
  }

  async addTransaction(tx: Partial<Transaction>): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: 'No autenticado' };

    const { error } = await this.exec('transactions', 'insert', {
      organization_id: user.organizationId,
      description: tx.description,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      date: tx.date || new Date().toISOString().split('T')[0],
      category: tx.category,
      sale_id: tx.saleId,
      notes: tx.notes
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async updateTransaction(tx: Partial<Transaction>): Promise<DbResult> {
    if (!tx.id) return { success: false, message: 'ID requerido' };

    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };

    const { error } = await this.exec('transactions', 'update', {
      id: tx.id,
      description: tx.description,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      date: tx.date,
      category: tx.category,
      sale_id: tx.saleId,
      notes: tx.notes
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteTransaction(id: string): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };
    const { error } = await this.exec('transactions', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async getOtherIncomes(): Promise<OtherIncome[]> {
    const user = getCurrentUser();
    if (!user) return [];

    const { data } = await this.exec('other_incomes', 'select');
    return (data || []).filter((i: any) => i.organization_id === user.organizationId).map((i: any) => ({
      id: i.id,
      organizationId: i.organization_id,
      description: i.description,
      amount: i.amount,
      currency: i.currency,
      date: i.date,
      category: i.category,
      propertyId: i.property_id
    }));
  }

  async addOtherIncome(income: Partial<OtherIncome>): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: 'No autenticado' };

    const { error } = await this.exec('other_incomes', 'insert', {
      organization_id: user.organizationId,
      description: income.description,
      amount: income.amount,
      currency: income.currency,
      date: income.date || new Date().toISOString().split('T')[0],
      category: income.category,
      property_id: income.propertyId
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async updateOtherIncome(income: Partial<OtherIncome>): Promise<DbResult> {
    if (!income.id) return { success: false, message: 'ID requerido' };

    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };

    const { error } = await this.exec('other_incomes', 'update', {
      id: income.id,
      description: income.description,
      amount: income.amount,
      currency: income.currency,
      date: income.date,
      category: income.category,
      property_id: income.propertyId
    });

    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  async deleteOtherIncome(id: string): Promise<DbResult> {
    const user = getCurrentUser();
    if (!user) return { success: false, message: "No autenticado" };
    const { error } = await this.exec('other_incomes', 'delete', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }

  // --- MEDIA UPLOAD ---
  async uploadImage(file: File): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('http://127.0.0.1:4000/db/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.url) return data.url;
      console.error('Upload failed:', data.error);
      return null;
    } catch (e) {
      console.error('Upload exception:', e);
      return null;
    }
  }

  async uploadCampaignMedia(file: File): Promise<string | null> {
    return this.uploadImage(file);
  }
}

export const db = new SupabaseDatabase();
// force rebuild.