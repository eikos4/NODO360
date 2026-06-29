import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Flame, Loader2, Eye, EyeOff, Shield, Zap, BarChart3, Bell, Sun, Moon } from 'lucide-react';
import PwaInstallPrompt from '../components/nodo360/PwaInstallPrompt';
import { useAuthStore } from '../store/authStore';
import { getDefaultRouteForRole } from '../lib/roleAccess';
import { useAuthHydrated } from '../hooks/useAuthHydrated';
import { useThemeStore } from '../store/themeStore';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

const FEATURES = [
  { icon: Shield, title: 'Control Operativo', desc: 'Emergencias, turnos y mantención en tiempo real' },
  { icon: BarChart3, title: 'Dashboard Ejecutivo', desc: 'Estadísticas e indicadores de toda la institución' },
  { icon: Bell, title: 'Alertas Inteligentes', desc: 'Vencimientos de EPP, vehículos y documentos' },
  { icon: Zap, title: 'Multi-Compañía', desc: 'Gestión centralizada con control de acceso por rol' },
];

export default function LoginPage() {
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      const role = useAuthStore.getState().user?.role;
      navigate(getDefaultRouteForRole(role));
    } catch {
      toast.error('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-800 dark:text-slate-100 flex relative transition-colors duration-300 overflow-x-hidden">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl border transition-all duration-300 shadow-lg
          bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400
          hover:border-red-500/50 dark:hover:border-red-500/50 hover:text-red-500 dark:hover:text-red-400 active:scale-95"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* ── LEFT PANEL: Futuristic Branding HUD ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 border-r border-slate-200 dark:border-slate-800/60">
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-950 dark:via-[#090505] dark:to-black transition-all duration-300" />
        
        {/* Background MP4 Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-[0.12] dark:opacity-[0.25] pointer-events-none transition-opacity duration-300"
        >
          <source src="/video.mp4" type="video/mp4" />
        </video>
        
        {/* HUD grid line pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}
        />
        
        {/* Hot glowing fire spots */}
        <div className="absolute top-1/4 left-1/3 w-[450px] h-[450px] bg-red-500/5 dark:bg-red-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-orange-500/5 dark:bg-orange-500/5 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[6000ms]" />

        {/* Brand Logo Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-tr from-red-650 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/35 animate-pulse">
            <Flame className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <p className="font-black text-xl tracking-tight leading-none text-slate-950 dark:text-white">NODO360</p>
            <p className="text-slate-400 dark:text-slate-500 text-[10px] tracking-widest uppercase mt-0.5">SISTEMA TÁCTICO MÓVIL</p>
          </div>
        </div>

        {/* HUD Console Center Info */}
        <div className="relative z-10 max-w-md my-auto space-y-6">
          {/* Active indicator beacon */}
          <div className="inline-flex items-center gap-2 bg-slate-200/50 dark:bg-red-950/20 border border-slate-300 dark:border-red-500/20 rounded-full px-3.5 py-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest">
              SISTEMA OPERATIVO ACTIVO
            </span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-black leading-tight text-slate-950 dark:text-white">
            Comando Táctico<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
              para Bomberos
            </span>
          </h1>
          
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            Plataforma unificada para optimización de respuesta a incendios, gestión de material mayor, hidrantes y dotación en tiempo real.
          </p>

          {/* Cyber HUD Features Grid */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white/80 dark:bg-slate-900/35 border border-slate-200 dark:border-slate-800/40 rounded-2xl p-4 hover:border-red-500/30 dark:hover:border-red-500/30 transition-all shadow-sm hover:shadow-md"
              >
                <div className="w-8 h-8 bg-red-500/10 dark:bg-red-500/20 rounded-lg flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-red-500 dark:text-red-400" />
                </div>
                <p className="font-bold text-xs text-slate-900 dark:text-white mb-1">{title}</p>
                <p className="text-slate-500 dark:text-slate-500 text-[10px] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Left Panel */}
        <div className="relative z-10 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/40 pt-4 text-[10px] text-slate-450 dark:text-slate-600 font-mono">
          <span>[CONEXIÓN SECURA N360]</span>
          <span>[BUILD: TACTICAL_2026]</span>
        </div>
      </div>

      {/* ── RIGHT PANEL: Cyber Login Card ── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative min-h-screen">
        {/* Glow backdrops on mobile */}
        <div className="lg:hidden absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-red-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-full max-w-sm relative z-10 space-y-6">
          {/* Mobile Branding Logo */}
          <div className="flex items-center gap-3 lg:hidden justify-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-tr from-red-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/35">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-black text-lg tracking-tight leading-none text-slate-950 dark:text-white">NODO360</p>
              <p className="text-slate-400 dark:text-slate-500 text-[9px] tracking-widest uppercase">Bomberos de Chile</p>
            </div>
          </div>

          {/* Cyber Glassmorphic Login Card */}
          <div className="bg-white/85 dark:bg-slate-950/45 backdrop-blur-xl border border-slate-200 dark:border-slate-800/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Glow top border */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 via-orange-500 to-red-500" />
            
            {/* Header form */}
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-950 dark:text-white leading-tight flex items-center gap-1.5">
                Acceso Consola
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Ingresa tus credenciales operativas</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-widest">
                  Identificador (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-100/60 dark:bg-[#070b14] border border-slate-200 dark:border-slate-850 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25 dark:focus:ring-red-500/10 transition-all text-xs font-semibold"
                  placeholder="bombero@compania.cl"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Clave de Seguridad
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-100/60 dark:bg-[#070b14] border border-slate-200 dark:border-slate-855 rounded-xl px-4 py-3.5 pr-11 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/25 dark:focus:ring-red-500/10 transition-all text-xs font-semibold"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-450 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 mt-4 shadow-lg shadow-red-650/20 hover:shadow-red-650/30 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin animate-duration-1000" />
                    <span>Cargando Terminal…</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4" />
                    <span>Iniciar Ignición / Acceso</span>
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-slate-400 dark:text-slate-600 text-[9px] font-black uppercase tracking-widest">Cargar Perfil Táctico</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Demo profiles selection */}
            <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-0.5 scrollbar-thin">
              {[
                { role: 'Super Admin', email: 'admin@nodo360.cl', pass: 'Admin1234!', label: 'C1 · Admin' },
                { role: 'Comandante', email: 'gonzalez@bomberosparral.cl', pass: 'Demo1234!', label: 'Institucional' },
                { role: 'Sala de Radio', email: 'central@bomberosparral.cl', pass: 'Demo1234!', label: 'Central 360' },
                { role: 'Tesorero', email: 'torres@bomberosparral.cl', pass: 'Demo1234!', label: 'C1 · Finanzas' },
                { role: 'Bombero', email: 'fuentes@bomberosparral.cl', pass: 'Demo1234!', label: 'C1 · Operativo' },
              ].map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => { setEmail(acc.email); setPassword(acc.pass); }}
                  className="w-full flex items-center justify-between bg-slate-100/50 dark:bg-[#070b14]/50 hover:bg-slate-150 dark:hover:bg-[#070b14] border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 transition-all group active:scale-[0.99] text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 rounded bg-red-500/10 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                      <Flame className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{acc.role}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{acc.email}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-200/50 dark:bg-slate-800/80 px-2 py-0.5 rounded shrink-0 group-hover:text-red-500 transition-colors">
                    {acc.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Copyright footer */}
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-650 font-mono tracking-wider">
            NODO360 SECURE GATEWAY // PORTAL_2026
          </p>
        </div>
      </div>
      
      {/* PWA Install Prompt */}
      <PwaInstallPrompt />
    </div>
  );
}
