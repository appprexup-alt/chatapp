
import React, { ReactNode, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Users,
  Calendar as CalendarIcon,
  LogOut,
  Menu,
  X,
  Settings,
  Sun,
  Moon,
  Building2,
  Workflow,
  Shield,
  MessageCircle,
  Search,
  Bot,
  DollarSign,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import AlarmSystem from './AlarmSystem';
import { User } from '../types';
import { db } from '../services/db';

interface LayoutProps {
  children: ReactNode;
  onLogout: () => void;
  currentUser: User;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout, currentUser }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });
  const location = useLocation();

  // Settings State
  const [appLogo, setAppLogo] = useState<string>('');
  const [appSlogan, setAppSlogan] = useState<string>('');

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'light' | 'dark' || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await db.getSettings();
      setAppLogo(settings.logoUrl || "");
      setAppSlogan(settings.slogan || "Gestión Inmobiliaria");
    };
    loadSettings();
  }, [currentUser]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };

  const allNavItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, subtitle: 'Resumen general y métricas clave' },
    { label: 'Leads', path: '/leads', icon: Users, subtitle: 'Gestiona tus clientes potenciales y oportunidades' },
    { label: 'Chats', path: '/conversations', icon: MessageCircle, subtitle: 'Bandeja de entrada unificada de WhatsApp' },
    { label: 'Propiedades', path: '/properties', icon: Map, subtitle: 'Inventario de inmuebles y proyectos' },
    { label: 'Calendario', path: '/calendar', icon: CalendarIcon, subtitle: 'Agenda de citas y recordatorios' },
    { label: 'Ventas', path: '/sales', icon: DollarSign, subtitle: 'Cierres de ventas, comisiones y finanzas' },
    { label: 'Chatbot IA', path: '/chatbot', icon: Bot, subtitle: 'Configura tu cerebro de inteligencia artificial' },
    { label: 'Campañas', path: '/automations', icon: Bot, subtitle: 'Gestiona tus mensajes automáticos y campañas' },
    { label: 'Integraciones', path: '/integrations', icon: Workflow, subtitle: 'Conecta tus herramientas y configura la IA' },
    { label: 'Administración', path: '/admin', icon: Settings, subtitle: 'Configuración de usuarios y permisos' },
    { label: 'Suscriptores', path: '/subscribers', icon: Shield, subtitle: 'Gestión de empresas y planes' },
  ] as { label: string; path: string; icon: any; subtitle?: string }[];

  // Role-based navigation filtering
  const agentPaths = ['/', '/leads', '/properties', '/calendar'];
  const adminExcludedPaths = ['/subscribers'];

  const navItems = allNavItems.filter(item => {
    if (currentUser.role === 'Agent') return agentPaths.includes(item.path);
    if (currentUser.role === 'Admin') return !adminExcludedPaths.includes(item.path);
    // Owner & SuperAdmin see everything
    return true;
  });

  const hasCustomLogo = appLogo && !appLogo.includes('flaticon');

  // Shared Sidebar Content
  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      <div className={`p-2 flex flex-col items-center justify-center shrink-0 ${collapsed ? 'mb-2' : 'mb-4'} relative overflow-hidden`}>
        {hasCustomLogo ? (
          <div className={`w-full ${collapsed ? 'h-14' : 'h-28'} flex items-center justify-center overflow-hidden transition-all duration-300`}>
            <img
              src={appLogo}
              alt="Logo"
              className={`${collapsed ? 'w-10 h-10 object-cover rounded-lg' : 'w-[90%] h-full object-contain'} drop-shadow-lg transition-all hover:scale-105`}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center py-1">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2 shadow-inner border border-border-color group-hover:rotate-12 transition-transform">
              <Building2 size={20} />
            </div>
            {!collapsed && (
              <>
                <h1 className="text-lg font-black tracking-tighter text-text-main">PrexUP CRM</h1>
                <p className="text-[9px] font-bold text-text-muted opacity-40 tracking-widest mt-0.5">Real estate solutions</p>
              </>
            )}
          </div>
        )}
      </div>

      <nav className={`flex-1 ${collapsed ? 'px-1.5' : 'px-3'} space-y-px overflow-y-auto custom-scrollbar pt-1`}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <React.Fragment key={item.path}>
              <NavLink
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => `flex items-center ${collapsed ? 'justify-center px-1.5' : 'gap-2.5 px-3'} py-1.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive
                  ? `bg-primary text-white font-bold shadow-glow ${collapsed ? '' : 'translate-x-1'}`
                  : `text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300 ${collapsed ? '' : 'translate-x-0 hover:translate-x-1'}`
                  }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-white/20 shadow-inner' : 'bg-surface border border-zinc-800 group-hover:border-primary/50 group-hover:shadow-glow'}`}>
                  <item.icon size={18} className={`transition-all duration-300 ${isActive ? 'text-white drop-shadow-md' : 'text-zinc-500 group-hover:text-primary group-hover:drop-shadow-electric'}`} />
                </div>
                {!collapsed && <span className="text-[13px] tracking-wide font-medium text-zinc-300 group-hover:text-white transition-colors">{item.label}</span>}
              </NavLink>
            </React.Fragment>
          );
        })}
      </nav>

      <div className={`${collapsed ? 'p-2' : 'p-3'} border-t border-border-color space-y-2 bg-surface/50 backdrop-blur-md shrink-0`}>
        <div className={`flex ${collapsed ? 'flex-col' : 'flex-row'} items-center gap-2`}>
          <NavLink
            to="/profile"
            className={`${collapsed ? 'w-full' : 'flex-1'} flex items-center justify-center gap-2 px-3 py-2 text-text-muted hover:bg-white/5 hover:text-primary rounded-lg transition-all duration-300 text-[10px] font-bold border border-border-color hover:border-primary/40 active:scale-95`}
            title="Configuración"
          >
            <Settings size={14} />
            {!collapsed && <span>Configuración</span>}
          </NavLink>

          <button
            onClick={onLogout}
            className={`${collapsed ? 'w-full' : 'flex-1'} flex items-center justify-center gap-2 px-3 py-2 text-text-muted hover:text-danger hover:bg-danger/5 rounded-lg transition-all duration-300 text-[10px] font-bold border border-border-color hover:border-danger/20 active:scale-95 group`}
            title="Salir"
          >
            <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
            {!collapsed && <span>Salir</span>}
          </button>
        </div>

        <button
          onClick={toggleSidebar}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-300 text-[10px] font-bold border border-border-color hover:border-primary/40 active:scale-95`}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && <span>Colapsar Menú</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-[100dvh] bg-background bg-mesh text-text-main font-sans overflow-hidden transition-colors duration-300">
      <AlarmSystem />

      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex ${sidebarCollapsed ? 'w-[68px]' : 'w-64'} flex-col bg-surface border-r border-border-color transition-all duration-300 shadow-2xl z-20 overflow-hidden relative group`}>
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">

        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-surface/80 backdrop-blur-md shrink-0 z-10 border-b border-border-color transition-colors duration-300">
          <div className="flex flex-col">
            <h2 className="text-main-title font-black text-zinc-300 tracking-tight leading-tight transition-colors duration-300">
              {navItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
            </h2>
            {navItems.find(i => i.path === location.pathname)?.subtitle && (
              <p className="text-body-secondary font-bold text-zinc-500 leading-tight mt-0.5 transition-colors duration-300">
                {navItems.find(i => i.path === location.pathname)?.subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-5">

            <button
              onClick={toggleTheme}
              className="p-3 bg-background text-text-muted hover:text-primary hover:shadow-md rounded-2xl transition-all duration-300 active:scale-95 border border-border-color"
              title={theme === 'dark' ? 'Cambiar a Modo Día' : 'Cambiar a Modo Noche'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="h-10 w-px bg-border-color"></div>

            <div className="flex items-center gap-3 bg-background px-4 py-2 rounded-2xl border border-border-color shadow-sm transition-all hover:shadow-md group cursor-pointer">
              <NavLink to="/profile" className="contents">
                <div className="text-right hidden lg:block">
                  <p className="text-card-header font-extrabold text-zinc-300 leading-none transition-colors duration-300 group-hover:text-primary">{currentUser.name}</p>
                  <p className="text-body-secondary font-bold text-zinc-500 mt-1 transition-colors duration-300 capitalize">{currentUser.role}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black border border-border-color overflow-hidden shadow-inner uppercase tracking-tighter group-hover:scale-105 transition-transform">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    currentUser.name.charAt(0)
                  )}
                </div>
              </NavLink>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden fixed top-0 w-full bg-surface/90 backdrop-blur-lg z-[40] px-4 py-2 border-b border-border-color flex justify-between items-center shadow-lg h-16 transition-colors duration-300">
          <div className="flex items-center gap-2">
            {hasCustomLogo ? (
              <img src={appLogo} alt="Logo" className="h-12 w-auto object-contain" />
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Building2 size={24} className="text-primary" />
                </div>
                <h1 className="text-xl font-black tracking-widest text-primary">PREX</h1>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileMenuOpen(true)} className="text-text-main p-1.5 bg-background border border-border-color rounded-xl hover:bg-input-bg transition-all active:scale-95 shadow-sm">
              <Menu size={24} />
            </button>
          </div>
        </header>

        {/* Mobile Drawer Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[100] flex pointer-events-auto">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setMobileMenuOpen(false)}
            ></div>

            {/* Drawer */}
            <aside className="relative w-[85%] max-w-[340px] h-full bg-surface shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 border-r border-border-color">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-6 right-6 p-2 text-text-muted hover:text-text-main bg-background border border-border-color rounded-xl z-10 transition-all active:scale-95 shadow-md"
              >
                <X size={24} />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto md:pt-0 pt-16 bg-background bg-mesh transition-colors duration-300 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-7xl mx-auto p-4 md:p-12 min-h-full">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
};

export default Layout;
