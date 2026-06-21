import { Link, Navigate } from 'react-router-dom';
import {
  Flame, ArrowRight, Siren, Radio, Map, CheckCircle2, Sun, Moon, ExternalLink,
  ChevronRight, Play, Shield, BookOpen, Building2,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAuthHydrated } from '../hooks/useAuthHydrated';
import { getDefaultRouteForRole } from '../lib/roleAccess';
import { useThemeStore } from '../store/themeStore';
import {
  HERO_IMAGE, DISPATCH_IMAGE, FIRE_IMAGES, DISPATCH_FLOW, PARRAL_COMPANIES,
  MODULE_GROUPS, STATS,
} from '../components/landing/landingContent';

export default function LandingPage() {
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0f18] text-slate-100 overflow-x-hidden">
      {/* ── Nav ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06] bg-[#0a0f18]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/40">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-sm leading-none tracking-tight">NODO360</p>
              <p className="text-[10px] text-red-400/80 uppercase tracking-[0.2em] mt-0.5">Bomberos Chile</p>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm text-slate-400">
            <a href="#central" className="hover:text-white transition-colors">Central de Despacho</a>
            <a href="#accion" className="hover:text-white transition-colors">En acción</a>
            <a href="#modulos" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#demo" className="hover:text-white transition-colors">Demo Parral</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors"
              title={isDark ? 'Tema claro' : 'Tema oscuro'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-lg shadow-red-600/30"
            >
              Ingresar
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex items-end pb-16 sm:pb-24 pt-24">
        <div className="absolute inset-0">
          <img
            src={HERO_IMAGE}
            alt="Bomberos en intervención"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] via-[#0a0f18]/75 to-[#0a0f18]/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f18]/90 via-transparent to-transparent" />
          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0a0f18] to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-end">
            <div>
              <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/40 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
                <Siren className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span className="text-red-200 text-xs font-bold uppercase tracking-wider">
                  Plataforma para cuerpos de bomberos
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black leading-[1.05] tracking-tight">
                La{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-amber-300">
                  Central de Despacho
                </span>
                {' '}y todo tu cuartel en un solo nodo
              </h1>

              <p className="mt-6 text-lg text-slate-300/90 max-w-xl leading-relaxed">
                NODO360 conecta botonera 10-X, sala de máquinas, mapa operativo, emergencias,
                personal, flota e institución. Diseñado para bomberos que operan bajo presión real.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-7 py-4 rounded-xl transition-all shadow-xl shadow-red-600/35 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Acceder al sistema
                </Link>
                <Link
                  to="/central/bomberos-parral"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-7 py-4 rounded-xl backdrop-blur-sm transition-all"
                >
                  <Radio className="w-5 h-5 text-red-400" />
                  Ver sala pública en vivo
                </Link>
              </div>

              <ul className="mt-10 grid sm:grid-cols-2 gap-2.5 max-w-lg">
                {[
                  'Botonera 10-X con audio y voz',
                  '6 compañías conectadas en demo',
                  'Bitácora de regreso al cuartel',
                  'PWA — cuartel y terreno',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Dispatch console preview */}
            <div className="hidden lg:block">
              <div className="rounded-2xl border border-red-500/30 bg-[#0f172a]/90 backdrop-blur-xl shadow-2xl shadow-red-900/20 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 bg-red-950/40">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-bold text-red-300 uppercase tracking-wider">Central activa</span>
                  <span className="ml-auto text-[10px] text-slate-500 font-mono">10-0 · INCENDIO</span>
                </div>
                <div className="p-5 space-y-3">
                  {DISPATCH_FLOW.slice(0, 4).map(({ step, title, desc }) => (
                    <div key={step} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <span className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 text-xs font-black flex items-center justify-center shrink-0">
                        {step}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">{title}</p>
                        <p className="text-[11px] text-slate-500">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 pb-5">
                  <Link
                    to="/central/bomberos-parral"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-600/20 border border-red-500/30 text-red-300 text-sm font-bold hover:bg-red-600/30 transition-colors"
                  >
                    <Siren className="w-4 h-4" />
                    Abrir central demo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-white/[0.06] bg-[#0d1420]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center lg:text-left">
              <p className="text-3xl sm:text-4xl font-black text-white">{value}</p>
              <p className="text-sm text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Central de Despacho (focus) ── */}
      <section id="central" className="relative py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute -inset-4 bg-red-600/10 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img
                  src={DISPATCH_IMAGE}
                  alt="Carro bomba en despacho nocturno"
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] via-transparent to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-5">
                  <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Despacho360</p>
                  <p className="text-lg font-bold text-white">Cuando suena la alarma, todo el nodo responde</p>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="text-red-400 text-xs font-black uppercase tracking-[0.25em] mb-4">Corazón operativo</p>
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Central de Despachos integrada a cada compañía
              </h2>
              <p className="mt-5 text-slate-400 leading-relaxed text-lg">
                Activa claves 10-X con tonos reales, sirena y mensaje de voz. Despacha dotación y carros,
                muestra el estado en la sala pública y registra la bitácora al regreso al cuartel.
              </p>

              <div className="mt-8 grid sm:grid-cols-2 gap-3">
                {DISPATCH_FLOW.map(({ step, title, desc }) => (
                  <div
                    key={step}
                    className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-red-500/25 hover:bg-red-950/10 transition-all"
                  >
                    <span className="text-[10px] font-black text-red-500">{step}</span>
                    <p className="text-sm font-bold text-white mt-1">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 font-bold text-sm transition-colors"
                >
                  Ingresar a Despacho360
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/central/bomberos-parral"
                  className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Sala pública 1ª Compañía
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── En acción — imágenes ── */}
      <section id="accion" className="py-16 sm:py-20 bg-[#0d1420] border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10">
          <p className="text-red-400 text-xs font-black uppercase tracking-[0.25em] mb-3">En terreno</p>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Hecho para la realidad del bombero</h2>
          <p className="mt-3 text-slate-400 max-w-2xl">
            Incendios, rescates, dotación en cuartel y coordinación central — NODO360 acompaña cada fase de la intervención.
          </p>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {FIRE_IMAGES.map(({ src, caption }) => (
            <div key={caption} className="group relative rounded-xl overflow-hidden aspect-[3/4] sm:aspect-[4/5]">
              <img
                src={src}
                alt={caption}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <p className="absolute bottom-3 left-3 right-3 text-xs sm:text-sm font-bold text-white">{caption}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Salas públicas 6 compañías ── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-1.5 mb-4">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-200 text-xs font-bold">Demo — Cuerpo de Bomberos de Parral</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">6 compañías, 6 salas de máquinas</h2>
            <p className="mt-4 text-slate-400">
              Cada cuartel con su vista pública: dotación, carros, emergencias en mapa y bitácora de regreso.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PARRAL_COMPANIES.map(({ n, name, slug }) => (
              <Link
                key={slug}
                to={`/central/${slug}`}
                className="group flex items-center gap-4 p-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:border-red-500/30 hover:bg-red-950/15 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex flex-col items-center justify-center shadow-lg shadow-red-900/30 shrink-0">
                  <Flame className="w-3 h-3 text-white/80" />
                  <span className="text-lg font-black text-white leading-none">{n}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{n}ª Compañía</p>
                  <p className="font-bold text-white truncate group-hover:text-red-200 transition-colors">{name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Radio className="w-3 h-3" /> Sala pública
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mapa + bitácora strip ── */}
      <section className="py-16 bg-gradient-to-r from-red-950/30 via-[#0d1420] to-[#0d1420] border-y border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-3 gap-6">
          {[
            { icon: Map, title: 'Mapa 360', desc: 'Emergencias, hidrantes, cuarteles y flota en un solo mapa operativo.', color: 'text-cyan-400' },
            { icon: Shield, title: 'Emergencias', desc: 'Registro completo: participantes, vehículos, planes y cierre formal.', color: 'text-red-400' },
            { icon: BookOpen, title: 'Bitácora', desc: 'Al regreso al cuartel: qué ocurrió, acciones y observaciones por compañía.', color: 'text-emerald-400' },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <Icon className={`w-8 h-8 ${color} mb-4`} />
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Todos los módulos ── */}
      <section id="modulos" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-red-400 text-xs font-black uppercase tracking-[0.25em] mb-3">Ecosistema completo</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Todas las funcionalidades de NODO360</h2>
            <p className="mt-4 text-slate-400">
              Desde la guardia hasta la tesorería social — un solo sistema para todo el cuerpo de bomberos.
            </p>
          </div>

          <div className="space-y-16">
            {MODULE_GROUPS.map((group, gi) => (
              <div key={group.title}>
                <div className={`grid gap-8 items-start mb-8 ${group.image && gi === 0 ? 'lg:grid-cols-2' : ''}`}>
                  <div className={group.image ? '' : 'max-w-3xl'}>
                    <h3 className="text-xl sm:text-2xl font-black text-white">{group.title}</h3>
                    <p className="text-slate-500 mt-2">{group.desc}</p>
                  </div>
                  {group.image && gi === 0 && (
                    <div className="hidden lg:block rounded-xl overflow-hidden border border-white/10 h-48">
                      <img src={group.image} alt="" className="w-full h-full object-cover opacity-80" />
                    </div>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.modules.map(({ icon: Icon, name, detail, highlight }) => (
                    <div
                      key={name}
                      className={`group p-4 rounded-xl border transition-all ${
                        highlight
                          ? 'border-red-500/30 bg-red-950/20 hover:bg-red-950/35'
                          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
                        highlight ? 'bg-red-600/25 border border-red-500/30' : 'bg-white/[0.05] border border-white/[0.08]'
                      }`}>
                        <Icon className={`w-4 h-4 ${highlight ? 'text-red-400' : 'text-slate-400 group-hover:text-red-400'} transition-colors`} />
                      </div>
                      <p className="font-bold text-sm text-white">{name}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Demo ── */}
      <section id="demo" className="py-20 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto relative rounded-3xl overflow-hidden">
          <img
            src={HERO_IMAGE}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden
          />
          <div className="absolute inset-0 bg-[#0a0f18]/85 backdrop-blur-[2px]" />
          <div className="relative p-8 sm:p-14 text-center border border-red-500/20 rounded-3xl">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-600/40">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white">Prueba NODO360 ahora</h2>
            <p className="mt-4 text-slate-300 max-w-lg mx-auto">
              Demo configurada para el Cuerpo de Bomberos de Parral: 6 compañías, central de despachos,
              mapa operativo, hidrantes y salas públicas listas.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-10 py-4 rounded-xl transition-all shadow-xl shadow-red-600/30"
              >
                Ingresar con cuenta demo
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/central/bomberos-parral"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors"
              >
                <Radio className="w-5 h-5" />
                Central pública
              </Link>
            </div>
            <div className="mt-8 inline-block text-left bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-sm">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Credenciales demo</p>
              <p className="text-slate-300">
                Central: <span className="font-mono text-white">central@bomberosparral.cl</span>
              </p>
              <p className="text-slate-300 mt-1">
                Clave: <span className="font-mono text-white">Demo1234!</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] py-10 bg-[#070b12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">NODO360</p>
              <p className="text-[11px] text-slate-500">Gestión operativa para bomberos de Chile</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            <a href="#central" className="hover:text-white transition-colors">Central de Despacho</a>
            <a href="#modulos" className="hover:text-white transition-colors">Módulos</a>
            <Link to="/central/bomberos-parral" className="hover:text-white transition-colors">Sala pública</Link>
            <Link to="/login" className="hover:text-white transition-colors">Ingresar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
