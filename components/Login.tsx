
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User } from '../types';
import { Lock, Mail, ArrowRight, AlertCircle, Building2, LayoutGrid, ArrowLeft, KeyRound, CheckCircle2, Copy, Eye, EyeOff } from 'lucide-react';
import RegisterTenant from './RegisterTenant';

interface LoginProps {
  onLogin: (user: User) => void;
}

// Background shell shared by login & forgot views
const BackgroundShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] animate-pulse" />
    </div>
    <div className="w-full max-w-sm z-10 animate-in fade-in zoom-in duration-500">
      <div className="max-w-sm w-full bg-card-bg border border-border-color rounded-2xl p-6 shadow-2xl transition-all">
        {children}
      </div>
    </div>
  </div>
);

// Logo Section (shared)
interface LogoSectionProps {
  appLogo: string;
  appSlogan: string;
  hasCustomLogo: boolean;
}

const LogoSection: React.FC<LogoSectionProps> = ({ appLogo, appSlogan, hasCustomLogo }) => (
  <div className="text-center mb-6 flex flex-col items-center">
    {hasCustomLogo ? (
      <div className="w-48 h-48 flex items-center justify-center mb-2 bg-card-bg rounded-2xl p-4 shadow-2xl border-2 border-border-color relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
        <img
          src={appLogo}
          alt="Logo"
          className="w-full h-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-500"
        />
      </div>
    ) : (
      <div className="flex flex-col items-center py-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-3 border border-primary/20 shadow-glow animate-bounce-in">
          <LayoutGrid size={28} />
        </div>
        <h1 className="text-3xl font-black tracking-widest text-primary mb-1">PREX</h1>
      </div>
    )}
    <p className="text-text-muted mt-2 text-xs font-medium">{appSlogan}</p>
  </div>
);

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [resetResult, setResetResult] = useState<{ tempPassword: string; userName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Settings State
  const [appLogo, setAppLogo] = useState<string>('');
  const [appSlogan, setAppSlogan] = useState<string>('');

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await db.getSettings();
      setAppLogo(settings.logoUrl || "");
      setAppSlogan(settings.slogan || "Gestión inmobiliaria inteligente");
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await db.login(email, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Usuario no encontrado o contraseña incorrecta.');
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      let errorMessage = 'Error de conexión. Intente nuevamente.';
      if (typeof err === 'string') errorMessage = err;
      else if (err instanceof Error) errorMessage = err.message;
      else if (err && typeof err === 'object' && err.message) errorMessage = String(err.message);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setResetResult(null);

    try {
      const res = await db.requestPasswordReset(forgotEmail);
      if (res.success && res.data) {
        setResetResult({ tempPassword: res.data.tempPassword, userName: res.data.userName });
      } else {
        setForgotError(res.message || 'Error al restablecer la contraseña.');
      }
    } catch (err: any) {
      setForgotError('Error de conexión. Intente nuevamente.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (resetResult) {
      navigator.clipboard.writeText(resetResult.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasCustomLogo = appLogo && !appLogo.includes('flaticon');

  if (view === 'register') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] animate-pulse" />
        </div>
        <RegisterTenant onBack={() => setView('login')} onSuccess={() => setView('login')} />
      </div>
    );
  }

  // FORGOT PASSWORD VIEW
  if (view === 'forgot') {
    return (
      <BackgroundShell>
        <LogoSection appLogo={appLogo} appSlogan={appSlogan} hasCustomLogo={hasCustomLogo} />

        {!resetResult ? (
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-3 border border-primary/20">
                <KeyRound size={24} />
              </div>
              <h3 className="text-lg font-bold text-text-main">Recuperar Contraseña</h3>
              <p className="text-text-muted text-[11px] mt-1">Ingresa el correo electrónico asociado a tu cuenta</p>
            </div>

            {forgotError && (
              <div className="bg-red-500/10 border border-red-500/20 text-danger p-3 rounded-xl text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                <AlertCircle size={18} />
                <span>{forgotError}</span>
              </div>
            )}

            <div>
              <label className="block text-sm text-text-muted mb-1.5 font-medium">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="email"
                  required
                  className="w-full bg-input-bg border border-border-color text-text-main rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  placeholder="correo@empresa.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            >
              {forgotLoading ? 'Procesando...' : (
                <>
                  <span>Restablecer Contraseña</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setView('login'); setForgotError(''); setForgotEmail(''); }}
              className="w-full flex items-center justify-center gap-2 text-text-muted hover:text-text-main text-sm py-2 transition-all"
            >
              <ArrowLeft size={16} />
              <span>Volver al inicio de sesión</span>
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 mb-3 border border-emerald-500/20">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-lg font-bold text-text-main">¡Contraseña Restablecida!</h3>
              <p className="text-text-muted text-[11px] mt-1">
                Se generó una nueva contraseña temporal para <span className="font-bold text-text-main">{resetResult.userName}</span>
              </p>
            </div>

            <div className="bg-input-bg border border-border-color rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Nueva contraseña temporal</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono font-bold text-primary bg-primary/5 px-4 py-2 rounded-lg border border-primary/20 text-center tracking-widest select-all">
                  {resetResult.tempPassword}
                </code>
                <button
                  onClick={handleCopyPassword}
                  className={`p-2.5 rounded-lg border transition-all active:scale-95 ${copied
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                    : 'bg-surface border-border-color text-text-muted hover:text-primary hover:border-primary/40'
                    }`}
                  title="Copiar"
                >
                  {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                ⚠️ Comunique esta contraseña al usuario de forma segura. Se recomienda que cambie la contraseña desde su perfil después de iniciar sesión.
              </p>
            </div>

            <button
              onClick={() => { setView('login'); setResetResult(null); setForgotEmail(''); }}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              <ArrowLeft size={18} />
              <span>Volver al Inicio de Sesión</span>
            </button>
          </div>
        )}
      </BackgroundShell>
    );
  }

  // LOGIN VIEW
  return (
    <BackgroundShell>
      <LogoSection appLogo={appLogo} appSlogan={appSlogan} hasCustomLogo={hasCustomLogo} />

      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-danger p-3 rounded-xl text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {import.meta.env.VITE_LOCAL_MODE === 'true' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3 rounded-xl text-sm flex flex-col gap-1 animate-in slide-in-from-top-2 mb-2">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 size={16} />
              <span>Modo Local Activo</span>
            </div>
            <p className="text-[10px] opacity-80">La base de datos está desconectada. Todo se guardará en tu navegador.</p>
          </div>
        )}

        <div>
          <label className="block text-sm text-text-muted mb-1.5 font-medium">Usuario o Correo</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type="text"
              required
              className="w-full bg-input-bg border border-border-color text-text-main rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              placeholder="usuario"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1.5 font-medium">Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              className="w-full bg-input-bg border border-border-color text-text-main rounded-xl pl-10 pr-10 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setView('forgot'); setError(''); }}
            className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 rounded-xl mt-2 flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? 'Verificando...' : (
            <>
              <span>Ingresar al Sistema</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-border-color text-center">
        <p className="text-text-muted text-[11px] mb-3 font-medium uppercase tracking-widest opacity-60">¿Nuevo en Prex?</p>
        <button
          onClick={() => setView('register')}
          className="w-full py-3 px-4 rounded-xl border border-primary/20 text-primary font-bold text-xs hover:bg-primary/5 transition-all flex items-center justify-center gap-2 group mb-3"
        >
          <Building2 size={16} className="group-hover:scale-110 transition-transform" />
          Registrar mi Organización
        </button>

        <button
          onClick={() => onLogin({
            id: 'demo-user-id',
            name: 'Usuario Demo',
            email: 'demo@example.com',
            role: 'Owner',
            organizationId: '00000000-0000-0000-0000-000000000000',
            avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
          })}
          className="w-full py-3 px-4 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 font-bold text-xs hover:bg-secondary/20 transition-all flex items-center justify-center gap-2 group"
        >
          <LayoutGrid size={16} className="group-hover:rotate-90 transition-transform duration-500" />
          Acceder en Modo Demo
        </button>
      </div>
    </BackgroundShell>
  );
};

export default Login;
