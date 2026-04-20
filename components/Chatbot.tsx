import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { User } from '../types';
import {
    Bot,
    MessageSquare,
    Mic,
    Settings,
    Shield,
    Zap,
    Sparkles,
    Key,
    Database,
    Save,
    Trash2,
    ChevronRight,
    Plus,
    Brain,
    Headphones,
    Globe,
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
    FileText,
    TrendingUp,
    Workflow,
    Cpu,
    Target,
    ChevronDown,
    X
} from 'lucide-react';
import { useNotification } from './NotificationContext';

interface AIPrompt {
    id: string;
    name: string;
    content: string;
    category: 'text' | 'voice';
}

interface ChatbotConfig {
    id?: string;
    organization_id: string;
    chatbot_text_enabled: boolean;
    chatbot_voice_enabled: boolean;
    api_key: string;
    api_provider: string;
    selected_model: string;
    text_prompt: string;
    voice_prompt: string;
    temperature: number;
    max_tokens: number;
}

const Chatbot: React.FC = () => {
    const { addNotification } = useNotification();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [activeTab, setActiveTab] = useState<'text' | 'voice' | 'settings'>('text');

    const [config, setConfig] = useState<ChatbotConfig>({
        organization_id: '',
        chatbot_text_enabled: false,
        chatbot_voice_enabled: false,
        api_key: '',
        api_provider: 'openai',
        selected_model: 'gpt-4o',
        text_prompt: '',
        voice_prompt: '',
        temperature: 0.7,
        max_tokens: 500
    });

    const [prompts, setPrompts] = useState<AIPrompt[]>([]);
    const [showPromptModal, setShowPromptModal] = useState(false);
    const [newPrompt, setNewPrompt] = useState({ name: '', content: '', category: 'text' as const });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('inmocrm_user') || 'null');
        if (user) {
            setCurrentUser(user);
            loadConfig(user.organizationId);
            loadPrompts(user.organizationId);
        }
    }, []);

    const loadConfig = async (orgId: string) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('ai_chatbot_config')
                .select('*')
                .eq('organization_id', orgId)
                .maybeSingle();

            if (data) {
                setConfig(data);
            } else {
                setConfig(prev => ({ ...prev, organization_id: orgId }));
            }
        } catch (e) {
            console.error("Error loading chatbot config", e);
        } finally {
            setLoading(false);
        }
    };

    const loadPrompts = async (orgId: string) => {
        try {
            const { data } = await supabase
                .from('ai_prompts')
                .select('*')
                .or(`organization_id.eq.${orgId},organization_id.is.null`);
            if (data) setPrompts(data);
        } catch (e) { }
    };

    const saveConfig = async () => {
        if (!currentUser?.organizationId) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('ai_chatbot_config')
                .upsert({
                    ...config,
                    organization_id: currentUser.organizationId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'organization_id' });

            if (error) throw error;
            addNotification({ title: 'Configuración Guardada', message: 'Chatbot IA actualizado.', type: 'success' });
        } catch (error: any) {
            addNotification({ title: 'Error', message: error.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const createPrompt = async () => {
        if (!currentUser?.organizationId || !newPrompt.name || !newPrompt.content) return;

        try {
            const { data, error } = await supabase
                .from('ai_prompts')
                .insert({
                    ...newPrompt,
                    organization_id: currentUser.organizationId
                })
                .select()
                .single();

            if (error) throw error;
            setPrompts([...prompts, data]);
            setShowPromptModal(false);
            setNewPrompt({ name: '', content: '', category: 'text' });
            addNotification({ title: 'Prompt Cargado', message: 'Se añadió a tu biblioteca.', type: 'success' });
        } catch (error: any) {
            addNotification({ title: 'Error', message: error.message, type: 'error' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-2 animate-in fade-in duration-700 p-1 md:p-2">
            {/* Toolbar Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-white/50 dark:bg-[#111318]/50 p-2 md:p-4 rounded-2xl border border-border-color shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                        <Bot size={24} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-text-main tracking-tight">Chatbot IA</h1>
                        <p className="text-[10px] text-text-muted font-bold opacity-40 mt-0.5">Automatización inteligente master</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-background/50 rounded-xl border border-border-color shadow-sm">
                        <span className="text-[10px] font-black text-text-muted opacity-40">Status:</span>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${config.chatbot_text_enabled ? 'bg-green-500 shadow-lg shadow-green-500/20' : 'bg-orange-500 animate-pulse'}`} />
                            <span className={`text-[10px] font-black tracking-tight ${config.chatbot_text_enabled ? 'text-green-500' : 'text-orange-500'}`}>
                                {config.chatbot_text_enabled ? 'Activo' : 'Offline'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={saveConfig}
                        disabled={saving}
                        className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl text-[10px] font-black shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                        {saving ? 'Guardando...' : 'Aplicar cambios'}
                    </button>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

                {/* Statistics / Status (Compact) */}
                <div className="lg:col-span-1 space-y-2">
                    <div className="bg-surface/50 border border-border-color rounded-xl p-3 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary" />
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                                <Zap size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-text-main tracking-tight">Motor activo</h3>
                                <p className="text-[9px] text-text-muted font-bold opacity-40">{config.api_provider} {config.selected_model}</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                <span className="opacity-40 text-text-muted">Consumo Hoy</span>
                                <span className="text-primary truncate max-w-[80px]">642 Tokens</span>
                            </div>
                            <div className="w-full h-1 bg-background rounded-full overflow-hidden">
                                <div className="w-1/3 h-full bg-primary" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface/50 border border-border-color rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                            <Shield size={16} className="text-green-500" />
                            <span className="text-[10px] font-black text-text-main">Seguridad ai</span>
                        </div>
                        <p className="text-[9px] text-text-muted font-bold opacity-40 leading-relaxed tracking-wider">
                            Toda la configuración se sincroniza con n8n y Baileys para respuesta inmediata.
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {['RAG', 'JWT', 'SSL'].map(tag => (
                                <span key={tag} className="px-2 py-0.5 bg-background/50 border border-border-color rounded text-[8px] font-black opacity-30 text-text-main">{tag}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Configuration Tabs Area */}
                <div className="lg:col-span-3">
                    <div className="bg-surface border border-border-color rounded-xl shadow-xl overflow-hidden flex flex-col min-h-[400px]">
                        {/* Tabs Navigation */}
                        <div className="flex border-b border-border-color bg-input-bg dark:bg-background/20 px-1 md:px-2 pt-1 gap-0.5 md:gap-1 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setActiveTab('text')}
                                className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all rounded-t-xl relative flex-shrink-0 ${activeTab === 'text' ? 'text-primary bg-surface border-x border-t border-border-color -mb-px shadow-sm' : 'text-text-muted hover:text-text-main hover:bg-primary/5'}`}
                            >
                                {activeTab === 'text' && <div className="absolute top-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
                                Chatbot de Texto
                            </button>
                            <button
                                onClick={() => setActiveTab('voice')}
                                className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all rounded-t-xl relative ${activeTab === 'voice' ? 'text-primary bg-surface border-x border-t border-border-color -mb-px shadow-sm' : 'text-text-muted hover:text-text-main hover:bg-primary/5'}`}
                            >
                                {activeTab === 'voice' && <div className="absolute top-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
                                Chatbot de Voz
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] transition-all rounded-t-xl relative ${activeTab === 'settings' ? 'text-primary bg-surface border-x border-t border-border-color -mb-px shadow-sm' : 'text-text-muted hover:text-text-main hover:bg-primary/5'}`}
                            >
                                {activeTab === 'settings' && <div className="absolute top-0 left-0 w-full h-1 bg-primary rounded-t-full" />}
                                Motor AI & Keys
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="p-4 md:p-6 flex-1 bg-surface/30">

                            {activeTab === 'text' && (
                                <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
                                    <div className="flex items-center justify-between border-b border-border-color pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                                <MessageSquare size={20} />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-black text-text-main uppercase tracking-tight">Personalidad Conversacional</h2>
                                                <p className="text-[9px] text-text-muted font-bold opacity-40 uppercase tracking-widest">WhatsApp & Web Integrated</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-black uppercase tracking-tight ${config.chatbot_text_enabled ? 'text-green-500' : 'text-text-muted'}`}>
                                                Habilitar Chat
                                            </span>
                                            <button
                                                onClick={() => setConfig({ ...config, chatbot_text_enabled: !config.chatbot_text_enabled })}
                                                className={`w-10 h-5 rounded-full transition-all relative ${config.chatbot_text_enabled ? 'bg-green-500' : 'bg-white/10'}`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-lg transition-all ${config.chatbot_text_enabled ? 'left-5' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Prompt Library Sidebar */}
                                        <div className="md:col-span-1 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60">Biblioteca</label>
                                                <button onClick={() => setShowPromptModal(true)} className="text-primary hover:opacity-80 transition-all">
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                            <div className="space-y-2 overflow-y-auto max-h-[300px] no-scrollbar pr-1">
                                                {prompts.filter(p => p.category === 'text').map(p => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => setConfig({ ...config, text_prompt: p.content })}
                                                        className={`w-full text-left p-3 rounded-xl border border-border-color transition-all group hover:border-primary/30 ${config.text_prompt === p.content ? 'bg-primary/10 border-primary/30' : 'bg-background/20'}`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                                                            <span className="text-[10px] font-bold text-text-main uppercase truncate overflow-hidden">{p.name}</span>
                                                            <ChevronRight size={10} className={`shrink-0 transition-transform ${config.text_prompt === p.content ? 'translate-x-1 text-primary' : 'opacity-20 translate-x-0'}`} />
                                                        </div>
                                                    </button>
                                                ))}
                                                {prompts.filter(p => p.category === 'text').length === 0 && (
                                                    <div className="p-4 border border-dashed border-border-color rounded-xl text-center">
                                                        <p className="text-[9px] text-text-muted font-bold opacity-30 uppercase tracking-widest">Sin prompts guardados</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Editor Area */}
                                        <div className="md:col-span-2 space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-text-muted/80 pl-1 uppercase tracking-wider flex items-center gap-2">
                                                    <Cpu size={12} className="text-primary" /> Instrucciones del Sistema
                                                </label>
                                                <div className="relative group">
                                                    <textarea
                                                        className="w-full bg-background border border-border-color rounded-2xl px-4 py-4 text-xs font-bold text-text-main outline-none focus:border-primary/30 shadow-inner transition-all min-h-[220px] resize-none leading-relaxed custom-scrollbar border-t-2 border-t-primary/20"
                                                        placeholder="Define el comportamiento de tu IA aquí..."
                                                        value={config.text_prompt}
                                                        onChange={(e) => setConfig({ ...config, text_prompt: e.target.value })}
                                                    />
                                                    <div className="absolute bottom-3 right-4 px-3 py-1 bg-surface/50 rounded-lg text-[9px] font-black text-text-muted opacity-30 uppercase tracking-widest border border-border-color">
                                                        Editor Maestro
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Compact parameters */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-background/40 border border-border-color rounded-xl p-3 px-4">
                                                    <div className="flex justify-between items-center text-[9px] font-black text-text-muted uppercase tracking-widest opacity-40 mb-2">
                                                        <span>Creatividad</span>
                                                        <span className="text-primary font-mono">{config.temperature}</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="1" step="0.1"
                                                        className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                                        value={config.temperature}
                                                        onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                                                    />
                                                </div>
                                                <div className="bg-background/40 border border-border-color rounded-xl p-3 px-4">
                                                    <div className="flex justify-between items-center text-[9px] font-black text-text-muted uppercase tracking-widest opacity-40 mb-2">
                                                        <span>Tokens</span>
                                                        <span className="text-primary font-mono">{config.max_tokens}</span>
                                                    </div>
                                                    <input
                                                        type="range" min="50" max="2500" step="50"
                                                        className="w-full accent-primary bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                                                        value={config.max_tokens}
                                                        onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'voice' && (
                                <div className="space-y-6 animate-in zoom-in-95 duration-300 h-full flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-4 border border-secondary/20 shadow-xl shadow-secondary/5">
                                        <Headphones size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-text-main uppercase tracking-tight">Módulo de Voz</h3>
                                        <p className="text-[10px] text-text-muted font-bold opacity-40 uppercase tracking-[0.2em] mt-2 max-w-sm">
                                            Vapi & ElevenLabs integration coming soon para automatizar llamadas.
                                        </p>
                                    </div>
                                    <div className="flex gap-2 pt-6">
                                        {['STT', 'LLM', 'TTS'].map(node => (
                                            <div key={node} className="w-12 h-12 rounded-xl border border-dashed border-border-color flex items-center justify-center text-[9px] font-black text-text-muted opacity-30 uppercase">{node}</div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'settings' && (
                                <div className="space-y-6 animate-in slide-in-from-left-2 duration-300 max-w-2xl mx-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Provider Selection (Compact) */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60 pl-1">Motor de procesamiento</label>
                                            <div className="grid grid-cols-1 gap-2">
                                                <button
                                                    onClick={() => setConfig({ ...config, api_provider: 'openai', selected_model: 'gpt-4o' })}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${config.api_provider === 'openai' ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-md shadow-amber-500/5' : 'bg-background/20 border-border-color text-text-muted hover:border-amber-500/30'}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.api_provider === 'openai' ? 'bg-amber-500 text-white' : 'bg-white/5 opacity-40'}`}>
                                                        <Brain size={16} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-[10px] font-black uppercase tracking-tight">OpenAI Explorer</div>
                                                        <div className="text-[8px] font-bold opacity-40 uppercase tracking-widest">GPT-4o & Turbo</div>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => setConfig({ ...config, api_provider: 'groq', selected_model: 'llama-3.1-70b-versatile' })}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${config.api_provider === 'groq' ? 'bg-primary/10 border-primary text-primary shadow-md shadow-primary/5' : 'bg-background/20 border-border-color text-text-muted hover:border-primary/30'}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.api_provider === 'groq' ? 'bg-primary text-white' : 'bg-white/5 opacity-40'}`}>
                                                        <Zap size={16} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-[10px] font-black uppercase tracking-tight">Groq Ultra-Fast</div>
                                                        <div className="text-[8px] font-bold opacity-40 uppercase tracking-widest">Llama 3.1 & Mixtral</div>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={() => setConfig({ ...config, api_provider: 'gemini', selected_model: 'gemini-1.5-pro' })}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${config.api_provider === 'gemini' ? 'bg-blue-500/10 border-blue-500 text-blue-500 shadow-md shadow-blue-500/5' : 'bg-background/20 border-border-color text-text-muted hover:border-blue-500/30'}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.api_provider === 'gemini' ? 'bg-blue-500 text-white' : 'bg-white/5 opacity-40'}`}>
                                                        <Sparkles size={16} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-[10px] font-black uppercase tracking-tight">Google Gemini Pro</div>
                                                        <div className="text-[8px] font-bold opacity-40 uppercase tracking-widest">Flash & Pro Modules</div>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* API Key & Model (Compact) */}
                                        <div className="space-y-5">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60 pl-1">Autenticación (API Key)</label>
                                                <div className="relative group">
                                                    <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary opacity-40" />
                                                    <input
                                                        type={showApiKey ? 'text' : 'password'}
                                                        className="w-full bg-background border border-border-color rounded-xl pl-10 pr-10 py-3 text-xs font-mono font-bold text-primary outline-none focus:border-primary/50 shadow-inner transition-all tracking-widest"
                                                        placeholder="••••••••••••••••"
                                                        value={config.api_key}
                                                        onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                                                    />
                                                    <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main opacity-40 hover:opacity-100 transition-all">
                                                        {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60 pl-1">Modelo Seleccionado</label>
                                                <div className="relative">
                                                    <Settings size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40" />
                                                    <select
                                                        className="w-full bg-background border border-border-color rounded-xl pl-10 pr-10 py-3 text-[10px] font-black text-text-main outline-none focus:border-primary/50 shadow-inner transition-all appearance-none cursor-pointer uppercase tracking-tight"
                                                        value={config.selected_model}
                                                        onChange={(e) => setConfig({ ...config, selected_model: e.target.value })}
                                                    >
                                                        {config.api_provider === 'openai' && (
                                                            <>
                                                                <option value="gpt-4o">GPT-4o</option>
                                                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                                            </>
                                                        )}
                                                        {config.api_provider === 'groq' && (
                                                            <>
                                                                <option value="llama-3.1-70b-versatile">Llama 3.1 70B</option>
                                                                <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
                                                                <option value="mixtral-8x7b-32768">Mixtral 8x7b</option>
                                                            </>
                                                        )}
                                                        {config.api_provider === 'gemini' && (
                                                            <>
                                                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                                                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                                            </>
                                                        )}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted opacity-40 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-primary/5 border border-dashed border-primary/20 rounded-2xl p-6 text-center space-y-3">
                                        <div className="flex justify-center gap-2">
                                            <Shield size={16} className="text-primary" />
                                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Cifrado de Seguridad Master</span>
                                        </div>
                                        <p className="text-[9px] text-text-muted font-bold opacity-40 leading-relaxed uppercase tracking-widest">
                                            Tus API Keys se encriptan con AES-256 en el servidor. Solo el motor de automatización tiene acceso durante la ejecución.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Compact New Prompt Modal */}
            {showPromptModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0b0e14] border border-border-color rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative">
                        <div className="p-6 border-b border-border-color flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                                <Plus size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-text-main uppercase tracking-widest">Nuevo Prompt Maestro</h3>
                                <p className="text-[9px] text-text-muted font-bold opacity-40 uppercase tracking-tighter mt-0.5">Define una nueva personalidad AI</p>
                            </div>
                            <button onClick={() => setShowPromptModal(false)} className="ml-auto p-2 bg-[#16191f] border border-border-color rounded-xl hover:bg-white/5 transition-all text-text-muted active:scale-95">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Nombre Único</label>
                                <input
                                    className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-2.5 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all shadow-inner"
                                    placeholder="Ej: Concierge de Lujo..."
                                    value={newPrompt.name}
                                    onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[8px] font-bold text-text-muted uppercase tracking-tighter opacity-40 ml-1">Instrucciones Detalladas</label>
                                <textarea
                                    className="w-full bg-[#16191f] border border-border-color rounded-xl px-4 py-3 text-[11px] font-bold text-text-main outline-none focus:border-primary/30 transition-all shadow-inner h-40 resize-none leading-relaxed custom-scrollbar"
                                    placeholder="Define los límites, tono y objetivos del chatbot..."
                                    value={newPrompt.content}
                                    onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowPromptModal(false)}
                                    className="flex-1 py-3 text-text-muted text-[10px] font-black uppercase tracking-widest hover:text-text-main transition-all"
                                >
                                    Descartar
                                </button>
                                <button
                                    onClick={createPrompt}
                                    className="flex-1 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95"
                                >
                                    Guardar Biblioteca
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
