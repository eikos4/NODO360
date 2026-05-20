import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Loader2, Eye, EyeOff, Shield, Zap, BarChart3, Bell, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import toast from 'react-hot-toast';

const FEATURES = [
  { icon: Shield, title: 'Control Operativo', desc: 'Emergencias, turnos y mantención en tiempo real' },
  { icon: BarChart3, title: 'Dashboard Ejecutivo', desc: 'Estadísticas e indicadores de toda la institución' },
  { icon: Bell, title: 'Alertas Inteligentes', desc: 'Vencimientos de EPP, vehículos y documentos' },
  { icon: Zap, title: 'Multi-Compañía', desc: 'Gestión centralizada con control de acceso por rol' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      toast.error('Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex relative">
      {/* Toggle tema — esquina superior derecha */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl border transition-all duration-200 shadow-lg
          bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-100 hover:border-slate-500
          dark:bg-slate-900 dark:border-slate-700
          light:bg-white light:border-slate-200 light:text-slate-600"
      >
        {isDark
          ? <Sun className="w-4 h-4" />
          : <Moon className="w-4 h-4" />}
      </button>

      {/* ── Panel izquierdo — Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        {/* Fondo con gradiente y grid */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        {/* Glow rojo */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-red-800/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/40">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg tracking-tight leading-none">NODO360</p>
            <p className="text-slate-500 text-[11px] tracking-widest uppercase">Bomberos Chile</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-red-600/10 border border-red-600/20 rounded-full px-3 py-1 mb-6">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 text-xs font-medium tracking-wide">Sistema Operativo Activo</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
            Gestión integral<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              para Bomberos
            </span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Plataforma centralizada para administrar compañías, personal, emergencias, inventario y finanzas.
          </p>

          {/* Features */}
          <div className="mt-10 grid grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
                <div className="w-8 h-8 bg-red-600/15 rounded-lg flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-white text-xs font-semibold mb-1">{title}</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer izquierdo */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-2">
            {['MG', 'AM', 'DF', 'CV'].map(initials => (
              <div key={initials} className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold text-slate-300">
                {initials}
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-xs">14 usuarios activos en demo</p>
        </div>
      </div>

      {/* ── Panel derecho — Formulario ── */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute inset-0 bg-slate-950 lg:bg-transparent" />

        <div className="w-full max-w-sm relative z-10">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/40">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold tracking-tight leading-none">NODO360</p>
              <p className="text-slate-500 text-[10px] tracking-widest uppercase">Bomberos Chile</p>
            </div>
          </div>

          {/* Header form */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Bienvenido</h2>
            <p className="text-slate-400 text-sm">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all text-sm"
                placeholder="correo@compania.cl"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 pr-11 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all text-sm"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-red-600/25 hover:shadow-red-500/40 active:scale-[0.98]"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Verificando...</>
                : <><Flame className="w-4 h-4" />Ingresar al sistema</>
              }
            </button>
          </form>

          {/* Separador */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-slate-600 text-xs">Acceso por invitación</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Info roles */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cuentas demo</p>
            {[
              { role: 'Super Admin', email: 'admin@nodo360.cl', pass: 'Admin1234!' },
              { role: 'Comandante', email: 'gonzalez@cia1.cl', pass: 'Demo1234!' },
              { role: 'Tesorero', email: 'torres@cia1.cl', pass: 'Demo1234!' },
              { role: 'Bombero', email: 'fuentes@cia1.cl', pass: 'Demo1234!' },
            ].map(acc => (
              <button
                key={acc.email}
                type="button"
                onClick={() => { setEmail(acc.email); setPassword(acc.pass); }}
                className="w-full flex items-center justify-between bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-700 rounded-lg px-3 py-2 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-red-600/20 rounded-md flex items-center justify-center">
                    <Flame className="w-3 h-3 text-red-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-slate-200">{acc.role}</p>
                    <p className="text-[10px] text-slate-500">{acc.email}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">Usar →</span>
              </button>
            ))}
          </div>

          <p className="text-center text-[11px] text-slate-600 mt-8">
            NODO360 © {new Date().getFullYear()} — Sistema de Gestión Operativa para Bomberos de Chile
          </p>
        </div>
      </div>
    </div>
  );
}
