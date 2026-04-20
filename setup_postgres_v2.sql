-- FINAL Schema Migration for ChatPrex CRM
-- This file includes all tables required by services/db.ts
-- Execute this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'pro',
    status TEXT DEFAULT 'active',
    logo_url TEXT,
    slogan TEXT,
    max_users INTEGER DEFAULT 5,
    expiry_date TIMESTAMPTZ,
    contact_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'Agent',
    status TEXT DEFAULT 'active',
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Pipeline Stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    color TEXT,
    "order" INTEGER DEFAULT 0,
    visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Sources (Missing in v1)
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Developers (Projects)
CREATE TABLE IF NOT EXISTS developers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Project Name
    developer_name TEXT, -- Company Name
    contact_name TEXT,
    ruc TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Properties
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    developer_id UUID REFERENCES developers(id) ON DELETE SET NULL,
    project_name TEXT,
    lot_number TEXT,
    area NUMERIC,
    price NUMERIC,
    currency TEXT DEFAULT 'USD',
    location TEXT,
    status TEXT,
    features TEXT[],
    description TEXT,
    images TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Leads
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'Nuevo',
    source TEXT,
    interest TEXT,
    budget NUMERIC,
    currency TEXT DEFAULT 'USD',
    last_contact TIMESTAMPTZ DEFAULT NOW(),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    interested_property_ids UUID[],
    chatbot_active BOOLEAN DEFAULT TRUE,
    pipeline_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
    project_id UUID REFERENCES developers(id) ON DELETE SET NULL,
    qualification_score INTEGER DEFAULT 0,
    ai_analysis JSONB,
    tags TEXT[],
    pipeline_stage_changed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    content TEXT,
    sender TEXT NOT NULL, -- 'agent', 'client', or 'bot'
    media_type TEXT DEFAULT 'text',
    media_url TEXT,
    media_filename TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. WhatsApp Config
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'disconnected',
    qr_code TEXT,
    phone_number TEXT,
    instance_name TEXT,
    webhook_url TEXT,
    openai_api_key TEXT,
    groq_api_key TEXT,
    default_ai_provider TEXT DEFAULT 'groq_free',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Quick Replies
CREATE TABLE IF NOT EXISTS quick_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    media_filename TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    notes TEXT,
    status TEXT DEFAULT 'Pendiente',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Tasks (Missing in v1)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'Pendiente',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    related_to TEXT,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Financial Clients (Missing in v1)
CREATE TABLE IF NOT EXISTS financial_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    document TEXT,
    address TEXT,
    civil_status TEXT,
    phone TEXT,
    email TEXT,
    birth_date DATE,
    occupation TEXT,
    has_children BOOLEAN DEFAULT FALSE,
    number_of_children INTEGER DEFAULT 0,
    children_details TEXT,
    spouse_name TEXT,
    spouse_document TEXT,
    spouse_address TEXT,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    notes TEXT,
    automation_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Sales (Missing in v1)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    financial_client_id UUID REFERENCES financial_clients(id) ON DELETE SET NULL,
    client_name TEXT,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    commissions JSONB DEFAULT '[]',
    status TEXT DEFAULT 'pending',
    date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Transactions (Financials)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    type TEXT, -- 'income' or 'expense'
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    date DATE DEFAULT CURRENT_DATE,
    category TEXT,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Other Incomes (Missing in v1)
CREATE TABLE IF NOT EXISTS other_incomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    date DATE DEFAULT CURRENT_DATE,
    category TEXT,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Campaigns (Missing in v1)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    media_filename TEXT,
    filters JSONB DEFAULT '{}',
    schedule_date TIMESTAMPTZ,
    delay_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    stats JSONB DEFAULT '{"sent": 0, "failed": 0, "total": 0}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Campaign Logs (Missing in v1)
CREATE TABLE IF NOT EXISTS campaign_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Follow-Up Config / Campaigns (Missing in v1)
CREATE TABLE IF NOT EXISTS followup_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pipeline_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    delay_hours INTEGER DEFAULT 0,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    specific_time TEXT, -- HH:mm
    tags TEXT[],
    trigger_field TEXT,
    trigger_type TEXT DEFAULT 'time_delay',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Follow-Up Activity / Logs (Missing in v1)
CREATE TABLE IF NOT EXISTS followup_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    config_id UUID REFERENCES followup_campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. Client Automations (Birthday, etc) (Missing in v1)
CREATE TABLE IF NOT EXISTS client_automations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT, -- 'birthday' or 'anniversary'
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    time_to_send TEXT, -- HH:MM:SS
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. Client Automation Logs (Missing in v1)
CREATE TABLE IF NOT EXISTS client_automation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    automation_id UUID REFERENCES client_automations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES financial_clients(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'sent',
    error_message TEXT
);

-- Default Demo Data
INSERT INTO organizations (id, name, plan, status) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Demo PrexApp', 'pro', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (organization_id, name, email, username, password, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'Admin', 'admin@example.com', 'admin', 'admin123', 'Owner')
ON CONFLICT DO NOTHING;
