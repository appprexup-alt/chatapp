-- SQL Migration for VPS PostgreSQL
-- Based on schema_utf8.json

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

-- 4. Developers (Projects)
CREATE TABLE IF NOT EXISTS developers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    developer_name TEXT,
    contact_name TEXT,
    ruc TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Properties
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

-- 6. Leads
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
    chatbot_enabled BOOLEAN DEFAULT TRUE,
    pipeline_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
    project_id UUID REFERENCES developers(id) ON DELETE SET NULL,
    qualification_score INTEGER DEFAULT 0,
    ai_analysis JSONB,
    tags TEXT[],
    pipeline_stage_changed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    content TEXT,
    sender TEXT NOT NULL, -- 'agent' or 'client'
    media_type TEXT DEFAULT 'text',
    media_url TEXT,
    media_filename TEXT,
    payload JSONB,
    topic TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WhatsApp Config
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'disconnected',
    qr_code TEXT,
    phone_number TEXT,
    evolution_api_url TEXT,
    evolution_api_key TEXT,
    instance_name TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Quick Replies
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

-- 10. Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    notes TEXT,
    status TEXT DEFAULT 'Programada',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Transactions (Financials)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    type TEXT, -- 'income' or 'expense'
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'PEN',
    date DATE DEFAULT CURRENT_DATE,
    category TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default demo organization and user
INSERT INTO organizations (id, name, plan, status) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Demo PrexApp', 'pro', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (organization_id, name, email, username, password, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'Admin', 'admin@example.com', 'admin', 'admin123', 'Owner')
ON CONFLICT DO NOTHING;
