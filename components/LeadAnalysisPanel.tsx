
import React, { useState, useEffect } from 'react';
import { Lead, Message } from '../types';
import {
    Brain, Sparkles, AlertTriangle, Clock, DollarSign,
    Users, Target, RefreshCw, Zap, Crown, Gift, MessageCircle, FileText, MessageSquare
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface LeadAnalysisPanelProps {
    lead: Lead;
    messages: Message[];
    onAnalysisComplete?: (updatedLead: Lead) => void;
}

type AIProvider = 'openai' | 'groq_pro' | 'groq_free';

const AI_PROVIDERS: Record<AIProvider, { name: string; icon: React.ReactNode; badge: string; badgeClass: string }> = {
    openai: { name: 'OpenAI', icon: <Crown size={14} />, badge: 'Pro', badgeClass: 'bg-amber-500 text-white' },
    groq_pro: { name: 'Groq Pro', icon: <Zap size={14} />, badge: 'Pro', badgeClass: 'bg-secondary text-white' },
    groq_free: { name: 'Groq Free', icon: <Gift size={14} />, badge: 'Free', badgeClass: 'bg-emerald-500 text-white' }
};

const LeadAnalysisPanel: React.FC<LeadAnalysisPanelProps> = ({ lead, messages, onAnalysisComplete }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>('groq_free');
    const [error, setError] = useState<string | null>(null);
    const [aiConfig, setAiConfig] = useState<{
        openaiApiKey: string;
        groqApiKey: string;
        defaultProvider: AIProvider;
    } | null>(null);

    // Load AI config from DB
    useEffect(() => {
        const loadAiConfig = async () => {
            const user = JSON.parse(localStorage.getItem('inmocrm_user') || 'null');
            if (!user?.organizationId) return;

            const { data } = await supabase
                .from('whatsapp_config')
                .select('openai_api_key, groq_api_key, default_ai_provider')
                .eq('organization_id', user.organizationId)
                .maybeSingle();

            if (data) {
                const config = {
                    openaiApiKey: data.openai_api_key || '',
                    groqApiKey: data.groq_api_key || '',
                    defaultProvider: (data.default_ai_provider || 'groq_free') as AIProvider
                };
                setAiConfig(config);
                setSelectedProvider(config.defaultProvider);
            }
        };
        loadAiConfig();
    }, []);

    const analysis = lead.aiAnalysis;
    const qualScore = lead.qualificationScore || 0;

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-emerald-500';
        if (score >= 5) return 'text-amber-500';
        return 'text-red-400';
    };

    const getScoreBg = (score: number) => {
        if (score >= 8) return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
        if (score >= 5) return 'bg-amber-500/20 text-amber-500 border-amber-500/20';
        return 'bg-danger/20 text-danger border-danger/20';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 8) return 'Alto Potencial';
        if (score >= 5) return 'Potencial Medio';
        return 'Requiere Atención';
    };

    const getUrgencyColor = (urgency?: string) => {
        if (urgency === 'high') return 'text-red-500 bg-red-500/10';
        if (urgency === 'medium') return 'text-amber-500 bg-amber-500/10';
        return 'text-text-muted bg-text-muted/10';
    };

    const getUrgencyLabel = (urgency?: string) => {
        if (urgency === 'high') return 'Alta';
        if (urgency === 'medium') return 'Media';
        return 'Baja';
    };

    const getAuthorityLabel = (auth?: string) => {
        if (auth === 'decision_maker') return 'Tomador de decisión';
        if (auth === 'influencer') return 'Influenciador';
        return 'Desconocido';
    };

    const buildAnalysisPrompt = () => {
        const chatHistory = messages
            .map(m => `[${m.sender === 'client' ? 'CLIENTE' : 'ASESOR'}]: ${m.content} `)
            .join('\n');

        return `Eres un experto analista de ventas inmobiliarias.Analiza la siguiente conversación entre un asesor y un cliente potencial.

DATOS DEL LEAD:
- Nombre: ${lead.name}
- Teléfono: ${lead.phone}
- Presupuesto registrado: ${lead.budget ? `$${lead.budget}` : 'No registrado'}
- Interés registrado: ${lead.interest || 'No registrado'}

HISTORIAL DE CONVERSACIÓN:
${chatHistory || '(Sin mensajes)'}

Responde en JSON con este formato exacto:
{
    "summary": "Resumen ejecutivo de 2-3 oraciones sobre el cliente y su interés",
        "objections": ["lista", "de", "objeciones", "detectadas"],
            "urgency": "low|medium|high",
                "budget": { "min": numero_o_null, "max": numero_o_null },
    "authority": "decision_maker|influencer|unknown",
        "fitScore": 1 - 10,
            "closingPotential": 0 - 100,
                "nextAction": "La acción inmediata más importante que debe tomar el asesor",
                    "buyingSignals": ["lista", "de", "señales", "de", "compra", "detectadas"],
                        "closingActions": ["lista", "de", "pasos", "recomendados", "para", "cerrar"],
                            "insights": "Recomendaciones adicionales"
} `;
    };

    const analyzeWithOpenAI = async (prompt: string, apiKey: string) => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey} `
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                response_format: { type: 'json_object' }
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return JSON.parse(data.choices[0].message.content);
    };

    const analyzeWithGroq = async (prompt: string, apiKey: string, isPro: boolean) => {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey} `
            },
            body: JSON.stringify({
                model: isPro ? 'llama-3.1-70b-versatile' : 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                response_format: { type: 'json_object' }
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return JSON.parse(data.choices[0].message.content);
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);

        try {
            if (!aiConfig) {
                throw new Error('Configura tus API Keys en Automatizaciones');
            }

            const prompt = buildAnalysisPrompt();
            let result;

            if (selectedProvider === 'openai') {
                if (!aiConfig.openaiApiKey) throw new Error('Configura tu API Key de OpenAI en Automatizaciones');
                result = await analyzeWithOpenAI(prompt, aiConfig.openaiApiKey);
            } else {
                if (!aiConfig.groqApiKey) throw new Error('Configura tu API Key de Groq en Automatizaciones');
                result = await analyzeWithGroq(prompt, aiConfig.groqApiKey, selectedProvider === 'groq_pro');
            }

            const analysisData = {
                summary: result.summary,
                objections: result.objections || [],
                urgency: result.urgency,
                budget: result.budget,
                authority: result.authority,
                fitScore: result.fitScore,
                closingPotential: result.closingPotential,
                nextAction: result.nextAction,
                buyingSignals: result.buyingSignals || [],
                closingActions: result.closingActions || [],
                analyzedAt: new Date().toISOString()
            };

            // Save to Supabase
            const { error: updateError } = await supabase
                .from('leads')
                .update({
                    ai_analysis: analysisData,
                    qualification_score: result.fitScore
                })
                .eq('id', lead.id);

            if (updateError) throw updateError;

            // Notify parent component
            if (onAnalysisComplete) {
                onAnalysisComplete({
                    ...lead,
                    aiAnalysis: analysisData,
                    qualificationScore: result.fitScore
                });
            }

        } catch (err: any) {
            console.error('Analysis error:', err);
            setError(err.message || 'Error al analizar');
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-surface">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-surface shrink-0">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-black shadow-inner border border-white/5">
                        {lead.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-bold text-text-main truncate tracking-tight">{lead.name}</h2>
                        <p className="text-[10px] font-medium text-text-muted">{lead.phone}</p>
                    </div>
                    {qualScore > 0 && (
                        <div className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border border-white/5 shadow-inner ${getScoreBg(qualScore)}`}>
                            <div className="flex items-baseline gap-0.5">
                                <span className={`text-xl font-black ${getScoreColor(qualScore)}`}>{qualScore}</span>
                                <span className="text-[9px] text-text-muted font-bold opacity-40">/10</span>
                            </div>
                            <span className="text-[8px] font-bold tracking-tighter opacity-40">Fit Score</span>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Provider Selector - Ultra Compact Premium */}
            <div className="px-4 py-2 bg-surface border-b border-border-color shrink-0">
                <div className="flex items-center justify-between p-1 bg-input-bg rounded-xl border border-border-color shadow-inner">
                    <div className="flex gap-1">
                        {(Object.keys(AI_PROVIDERS) as AIProvider[]).map(key => {
                            const provider = AI_PROVIDERS[key];
                            const isActive = selectedProvider === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedProvider(key)}
                                    className={`relative px-3 h-9 flex items-center justify-center gap-2 rounded-lg transition-all group ${isActive
                                        ? 'bg-white border border-primary/20 text-primary shadow-lg shadow-black/5 scale-105 z-10 font-bold'
                                        : 'text-text-muted hover:text-text-main hover:bg-black/5 opacity-60 hover:opacity-100'
                                        }`}
                                    title={provider.name}
                                >
                                    <div className="relative flex items-center gap-2">
                                        {provider.icon}
                                        <span className="text-[10px] font-bold whitespace-nowrap">{provider.name}</span>
                                        {/* Subtle badge indicator */}
                                        <div className={`absolute -top-1.5 -right-1.5 w-2 h-2 rounded-full border border-black ${provider.badgeClass.split(' ')[0]}`} />
                                    </div>
                                    {isActive && (
                                        <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="bg-primary hover:bg-primary/95 disabled:opacity-50 text-white h-9 px-4 rounded-lg flex items-center justify-center gap-2 font-black text-[10px] tracking-wider shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        {isAnalyzing ? (
                            <RefreshCw size={14} className="animate-spin" />
                        ) : (
                            <>
                                <Brain size={14} />
                                <span>Analizar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>


            {error && (
                <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-2xl text-[11px] font-bold animate-in fade-in slide-in-from-top-2">
                    {error}
                </div>
            )}

            {/* Analysis Results */}
            {analysis ? (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Compact Dual Score Card */}
                    <div className="grid grid-cols-2 gap-2">
                        {/* Fit Score */}
                        <div className={`relative overflow-hidden rounded-xl p-3 border border-white/10 transition-all duration-500 group ${getScoreColor(analysis.fitScore)} bg-surface/30 shadow-sm`}>
                            <div className="absolute top-0 right-0 p-1 opacity-5">
                                <Target size={30} />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[8px] font-bold tracking-widest opacity-60 mb-0.5">Fit Score</p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-xl font-black tracking-tighter">{analysis.fitScore}</span>
                                        <span className="text-[9px] font-bold opacity-30">/10</span>
                                    </div>
                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md border border-white/10 bg-surface/20 ${getScoreColor(analysis.fitScore)}`}>
                                        {getScoreLabel(analysis.fitScore).split(' ')[0]}
                                    </span>
                                </div>
                                <div className="mt-2 h-1 w-full bg-black/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-current transition-all duration-1000 ease-out" style={{ width: `${(analysis.fitScore / 10) * 100}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Potencial Cierre */}
                        <div className="relative overflow-hidden rounded-xl p-3 border border-white/10 bg-surface/30 shadow-sm">
                            <div className="absolute top-0 right-0 p-1 opacity-5">
                                <Zap size={30} className="text-emerald-500" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-0.5">
                                    <p className="text-[8px] font-bold text-text-muted tracking-widest opacity-60">Cierre</p>
                                    {analysis.urgency && (
                                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md border border-white/10 ${getUrgencyColor(analysis.urgency).replace('bg-', 'bg-opacity-20 ')}`}>
                                            {getUrgencyLabel(analysis.urgency)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-xl font-black text-emerald-500">{analysis.closingPotential || 0}%</span>
                                </div>
                                <div className="mt-2 h-1 w-full bg-black/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${analysis.closingPotential || 0}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Next Action - Ultra Compact */}
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-2.5 relative overflow-hidden group">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap size={10} className="text-primary" />
                            <span className="text-[8px] font-black text-primary tracking-[0.15em]">Próxima acción crítica</span>
                        </div>
                        <p className="text-[11px] font-bold text-text-main leading-tight tracking-tight">
                            {analysis.nextAction || 'No definida'}
                        </p>
                    </div>

                    {/* Summary */}
                    {analysis.summary && (
                        <div className="bg-surface/50 border border-white/5 rounded-xl p-2.5 shadow-sm">
                            <p className="text-[10px] font-medium text-text-main leading-snug opacity-80 italic">"{analysis.summary}"</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        {/* Buying Signals */}
                        <div className="bg-emerald-500/[0.03] border border-emerald-500/5 rounded-xl p-2.5">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Target size={10} className="text-emerald-500" />
                                <span className="text-[8px] font-black text-emerald-500 tracking-wider">Señales</span>
                            </div>
                            <div className="space-y-1">
                                {analysis.buyingSignals?.slice(0, 3).map((signal, idx) => (
                                    <div key={idx} className="flex gap-1.5">
                                        <div className="mt-1 w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                                        <p className="text-[9px] font-bold text-text-main leading-tight opacity-70 truncate">{signal}</p>
                                    </div>
                                )) || <p className="text-[8px] text-text-muted italic opacity-40 text-center">Sin señales</p>}
                            </div>
                        </div>

                        {/* Objections */}
                        <div className="bg-danger/[0.03] border border-danger/5 rounded-xl p-2.5">
                            <div className="flex items-center gap-1.5 mb-2">
                                <AlertTriangle size={10} className="text-danger" />
                                <span className="text-[8px] font-black text-danger tracking-wider">Barreras</span>
                            </div>
                            <div className="space-y-1">
                                {analysis.objections?.slice(0, 3).map((obj, idx) => (
                                    <div key={idx} className="flex gap-1.5">
                                        <div className="mt-1 w-1 h-1 rounded-full bg-danger shrink-0" />
                                        <p className="text-[9px] font-bold text-text-main leading-tight opacity-70 truncate">{obj}</p>
                                    </div>
                                )) || <p className="text-[8px] text-text-muted italic opacity-40 text-center">Sin barreras</p>}
                            </div>
                        </div>
                    </div>

                    {/* Analysis actions - Unified list */}
                    {analysis.closingActions && analysis.closingActions.length > 0 && (
                        <div className="bg-input-bg border border-white/5 rounded-xl p-2.5 space-y-2 shadow-inner">
                            <div className="flex items-center gap-1.5">
                                <Sparkles size={10} className="text-amber-500" />
                                <span className="text-[8px] font-black text-text-muted tracking-widest">Pasos sugeridos</span>
                            </div>
                            <div className="grid grid-cols-1 gap-1">
                                {analysis.closingActions.map((action, idx) => (
                                    <div key={idx} className="flex gap-2 bg-surface/40 p-1.5 rounded-lg border border-white/[0.03]">
                                        <span className="text-[8px] font-black text-amber-500 shrink-0">{idx + 1}.</span>
                                        <p className="text-[10px] font-bold text-text-main leading-tight tracking-tight opacity-80">{action}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Analyzed At */}
                    {analysis.analyzedAt && (
                        <div className="flex flex-col items-center gap-2 py-4">
                            <p className="text-[10px] font-bold text-text-muted tracking-widest opacity-30">
                                Análisis procesado el {new Date(analysis.analyzedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-[9px] font-bold text-text-muted tracking-widest opacity-20">IA Engine: {selectedProvider.toUpperCase()}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full opacity-40">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-black/20 flex items-center justify-center mb-4 shadow-inner border border-border-color">
                        <Brain size={32} className="text-text-muted" strokeWidth={1} />
                    </div>
                    <h3 className="text-xs font-bold text-text-main tracking-widest mb-1">Sin inteligencia</h3>
                    <p className="text-[9px] font-bold text-text-muted tracking-widest max-w-[150px] leading-relaxed">
                        Analiza la conversación para obtener insights
                    </p>
                </div>
            )}
        </div>
    );
};

const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Alto Potencial';
    if (score >= 5) return 'Potencial Medio';
    return 'Requiere Atención';
};

export default LeadAnalysisPanel;
