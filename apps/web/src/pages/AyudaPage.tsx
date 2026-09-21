import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, BookOpen, CheckCircle2, ChevronRight, Clock, Flame, Headphones,
  LayoutDashboard, MapPin, MessageCircle, Navigation, Radio, Shield,
  Smartphone, Siren, Truck, Users, Zap, ArrowRight, Play,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { getDefaultRouteForUser } from '../lib/roleAccess';

const FLOW = [
  {
    n: '01',
    title: 'Llega el aviso',
    desc: 'La centralista recibe la llamada o el reporte. Marca la clave 10-X y la dirección en segundos.',
    icon: Bell,
  },
  {
    n: '02',
    title: 'Despacho con carro',
    desc: 'Elige compañía, confirma el vehículo de emergencia y despacha. Suena tono, voz y alarma en los teléfonos.',
    icon: Siren,
  },
  {
    n: '03',
    title: 'GPS y WhatsApp',
    desc: 'Si falta el pin exacto, se pide ubicación por WhatsApp. El reportante marca el punto y la central lo ve al tiro.',
    icon: MessageCircle,
  },
  {
    n: '04',
    title: 'Quién va',
    desc: 'Cada bombero marca Voy / No voy / En el lugar desde el celular. La central ve la dotación en vivo.',
    icon: Users,
  },
  {
    n: '05',
    title: 'Radio y bitácora',
    desc: 'PTT por la emergencia, transmisiones en la línea de tiempo y registro operativo sin papeles.',
    icon: Radio,
  },
  {
    n: '06',
    title: 'Cierre e informe',
    desc: 'Se cierra la emergencia, se genera el PDF y queda la historia para el cuerpo.',
    icon: BookOpen,
  },
] as const;

const PILLARS = [
  {
    icon: Clock,
    title: 'Tiempos de respuesta más cortos',
    text: 'Menos vueltas entre radio, papel y WhatsApp. Clave, carro y dirección en una sola consola. La alarma llega al celular con tono y voz.',
  },
  {
    icon: MapPin,
    title: 'Ubicación por GPS',
    text: 'Pin en el mapa al despachar, geocoder, confirmación en terreno y enlace de localización para el reportante.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp operativo',
    text: 'Pedí coordenadas al reportante con un toque. El enlace abre una vista simple para marcar el punto sin instalar nada.',
  },
  {
    icon: Smartphone,
    title: 'App de bomberos',
    text: 'Alarmas, Voy/No voy, radio PTT, disponibilidad en cuartel y recap de la emergencia cerrada.',
  },
  {
    icon: LayoutDashboard,
    title: 'Consola de emergencia activa',
    text: 'Despacho, mapa, quién va, radio y bitácora en una sola pantalla para la centralista.',
  },
  {
    icon: Truck,
    title: 'Carros y salas',
    text: 'Flota operativa, tablet de carro, muro TV de compañías y salas públicas por cuartel.',
  },
] as const;

const HOW_CENTRAL = [
  'Entrá a Consola activa o Nodo360 Alarms.',
  'Elegí la clave 10-X (y el detalle si aparece).',
  'Escribí la dirección o marcá el mapa. Pedí GPS por WhatsApp si hace falta.',
  'Confirmá el carro / vehículo de emergencia.',
  'Despachá. Revisá Quién va, radio y bitácora en la misma vista.',
  'Registrá hitos (en camino, en el lugar, MAYDAY…) y cerrá con informe.',
] as const;

const HOW_BOMBERO = [
  'Activá notificaciones, batería y alertas críticas en el celular.',
  'Cuando suene la alarma, abrí la emergencia.',
  'Marcá Voy, No voy o En el lugar. Compartí GPS si vas en camino.',
  'Usá la radio PTT del canal de esa emergencia.',
  'Consultá comunicados y el recap cuando se cierre el llamado.',
] as const;

const MODULES = [
  { name: 'Despacho360 / Alarms', tip: 'Botonera y consola de claves' },
  { name: 'Consola activa', tip: 'Puesto unificado de la emergencia' },
  { name: 'Bitácora360', tip: 'Fases y cierre con PDF' },
  { name: 'Mapa 360 / Hidrantes', tip: 'Terreno y recursos' },
  { name: 'Radio PTT', tip: 'Canal por emergencia' },
  { name: 'App móvil', tip: 'Alarma y respuesta' },
  { name: 'NodoTrack / Carro', tip: 'Tablet en el vehículo' },
  { name: 'Muro TV / Vision360', tip: 'Cuarteles en pantalla' },
] as const;

type ThemeTone = {
  page: string;
  pageBg: string;
  ink: string;
  muted: string;
  soft: string;
  hairline: string;
  band: string;
  card: string;
  cardHover: string;
  iconBox: string;
  stepBox: string;
  nav: string;
  navSep: string;
  ghostBtn: string;
  footerLink: string;
};

function tone(isDark: boolean): ThemeTone {
  if (isDark) {
    return {
      page: 'text-slate-100',
      pageBg:
        'radial-gradient(1200px 600px at 10% -10%, rgba(220,38,38,0.22), transparent 55%), radial-gradient(900px 500px at 90% 10%, rgba(14,116,144,0.12), transparent 50%), #070b12',
      ink: 'text-white',
      muted: 'text-slate-400',
      soft: 'text-slate-300',
      hairline: 'border-white/10',
      band: 'bg-black/25',
      card: 'bg-[#0a1018]',
      cardHover: 'hover:bg-[#0e1622]',
      iconBox: 'bg-red-600/15 border-red-500/30',
      stepBox: 'bg-[#0d1420] border-white/10 shadow-lg shadow-black/40',
      nav: 'text-slate-300 hover:text-white',
      navSep: 'text-slate-600',
      ghostBtn: 'border-white/25 hover:border-white/50 text-white bg-white/5',
      footerLink: 'hover:text-white',
    };
  }
  return {
    page: 'text-slate-800',
    pageBg:
      'radial-gradient(1200px 600px at 10% -10%, rgba(220,38,38,0.10), transparent 55%), radial-gradient(900px 500px at 90% 10%, rgba(14,116,144,0.08), transparent 50%), #f4f6f9',
    ink: 'text-slate-900',
    muted: 'text-slate-600',
    soft: 'text-slate-700',
    hairline: 'border-slate-200',
    band: 'bg-white/80',
    card: 'bg-white',
    cardHover: 'hover:bg-slate-50',
    iconBox: 'bg-red-50 border-red-200',
    stepBox: 'bg-white border-slate-200 shadow-sm',
    nav: 'text-slate-600 hover:text-slate-900',
    navSep: 'text-slate-300',
    ghostBtn: 'border-slate-300 hover:border-slate-400 text-slate-800 bg-white/80',
    footerLink: 'hover:text-slate-900',
  };
}

function useReveal() {
  const ref = useRef<HTMLElement | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setOn(true);
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, on };
}

export default function AyudaPage() {
  const user = useAuthStore((s) => s.user);
  const home = getDefaultRouteForUser(user);
  const isDark = useThemeStore((s) => s.theme) === 'dark';
  const t = tone(isDark);

  useEffect(() => {
    window.scrollTo(0, 0);
    const id = 'nodo360-ayuda-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);

  return (
    <div
      className={`nodo360-ayuda h-full min-h-0 overflow-y-auto selection:bg-red-500/35 ${t.page}`}
      style={{
        fontFamily: '"Source Sans 3", system-ui, sans-serif',
        background: t.pageBg,
      }}
    >
      {/* Hero — always dark over video for contrast */}
      <section className="relative min-h-[min(100%,72svh)] sm:min-h-[80svh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-[#070b12]">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-90 scale-105 animate-[ayuda-ken_28s_ease-in-out_infinite_alternate]"
          >
            <source src="/video.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b12] via-[#070b12]/75 to-[#070b12]/35" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(7,11,18,0.5)_100%)]" />

        <div className="ayuda-hero-copy keep-on-color relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16 pt-10 text-white">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <a href="#por-que" className="text-[11px] font-bold uppercase tracking-wider text-slate-200 hover:text-white">Por qué</a>
            <span className="text-slate-500">·</span>
            <a href="#flujo" className="text-[11px] font-bold uppercase tracking-wider text-slate-200 hover:text-white">Flujo</a>
            <span className="text-slate-500">·</span>
            <a href="#usar" className="text-[11px] font-bold uppercase tracking-wider text-slate-200 hover:text-white">Cómo usar</a>
            <span className="text-slate-500">·</span>
            <a href="#modulos" className="text-[11px] font-bold uppercase tracking-wider text-slate-200 hover:text-white">Módulos</a>
          </div>
          <p
            className="text-red-400 text-sm sm:text-base font-semibold uppercase tracking-[0.28em] mb-4 animate-[ayuda-rise_0.8s_ease-out_both]"
            style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
          >
            Plataforma operativa para cuerpos de bomberos
          </p>
          <h1
            className="text-white text-[clamp(2.75rem,8vw,5.5rem)] leading-[0.92] max-w-4xl animate-[ayuda-rise_0.9s_ease-out_0.08s_both]"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800 }}
          >
            NODO<span className="text-red-500">360</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg sm:text-xl text-slate-100 leading-relaxed animate-[ayuda-rise_1s_ease-out_0.16s_both]">
            Central, móvil y terreno en un solo nodo: despacho más rápido, GPS, WhatsApp y radio cuando cada segundo cuenta.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-[ayuda-rise_1.05s_ease-out_0.24s_both]">
            <a
              href="#flujo"
              className="keep-on-color inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-3 rounded-xl transition-colors"
            >
              Ver flujo operativo
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#usar"
              className="inline-flex items-center gap-2 border border-white/35 hover:border-white/60 text-white font-semibold px-5 py-3 rounded-xl backdrop-blur-sm bg-black/25 transition-colors"
            >
              <Play className="w-4 h-4" />
              Cómo se usa
            </a>
            <Link
              to={home}
              className="inline-flex items-center gap-2 border border-white/35 hover:border-white/60 text-white font-semibold px-5 py-3 rounded-xl backdrop-blur-sm bg-black/25 transition-colors"
            >
              Ir a la consola
            </Link>
          </div>
        </div>
      </section>

      <section id="por-que" className={`border-y ${t.hairline} ${t.band}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-3 gap-8">
          {[
            { k: 'Segundos', v: 'menos en despachar', d: 'Clave + carro + dirección sin cambiar de pantalla' },
            { k: 'GPS', v: 'cuando hace falta', d: 'Mapa, pin y localización por WhatsApp' },
            { k: '1 canal', v: 'por emergencia', d: 'Radio, quién va y bitácora alineados' },
          ].map((s) => (
            <div key={s.k} className="text-center sm:text-left">
              <p
                className="text-4xl sm:text-5xl text-red-600 leading-none"
                style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800 }}
              >
                {s.k}
              </p>
              <p className={`mt-1 font-semibold ${t.ink}`}>{s.v}</p>
              <p className={`mt-1 text-sm ${t.muted}`}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <PillarsSection t={t} />
      <FlowSection t={t} />
      <HowSection home={home} t={t} isDark={isDark} />
      <ModulesSection t={t} />

      <section className="relative py-24 px-4 sm:px-6 overflow-hidden">
        <div className={`absolute inset-0 ${
          isDark
            ? 'bg-gradient-to-br from-red-950/50 via-transparent to-cyan-950/20'
            : 'bg-gradient-to-br from-red-100/70 via-transparent to-sky-100/50'
        }`} />
        <div className="relative max-w-3xl mx-auto text-center">
          <Shield className="w-10 h-10 text-red-600 mx-auto mb-5" />
          <h2
            className={`text-4xl sm:text-5xl leading-tight ${t.ink}`}
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800 }}
          >
            Listos para acortar la cadena de alarma
          </h2>
          <p className={`mt-4 text-lg leading-relaxed ${t.muted}`}>
            NODO360 une centralista, voluntarios y carros. Menos fricción, más claridad en el momento crítico.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to={home}
              className="keep-on-color inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3.5 rounded-xl"
            >
              Abrir consola
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              to="/central-emergencia"
              className={`inline-flex items-center gap-2 border font-semibold px-6 py-3.5 rounded-xl ${t.ghostBtn}`}
            >
              Consola activa
            </Link>
          </div>
        </div>
      </section>

      <footer className={`border-t ${t.hairline} py-10 px-4 sm:px-6`}>
        <div className={`max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm ${t.muted}`}>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-600" />
            <span>
              NODO360 · Guía operativa ·{' '}
              <a href="https://kodesk.cl/" className={`${t.footerLink} transition-colors`} target="_blank" rel="noreferrer">
                kodesk.cl
              </a>
            </span>
          </div>
          <Link to={home} className={`${t.footerLink} transition-colors font-semibold`}>
            Volver a la consola
          </Link>
        </div>
      </footer>

      <style>{`
        @keyframes ayuda-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ayuda-ken {
          from { transform: scale(1.05) translate3d(0,0,0); }
          to { transform: scale(1.12) translate3d(-1.5%, -1%, 0); }
        }
        .ayuda-reveal {
          opacity: 0;
          transform: translateY(22px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .ayuda-reveal.on {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}

function PillarsSection({ t }: { t: ThemeTone }) {
  const { ref, on } = useReveal();
  return (
    <section ref={ref} className="py-20 sm:py-28 px-4 sm:px-6">
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <p className="text-red-600 text-xs font-bold uppercase tracking-[0.22em] mb-3">Qué resuelve</p>
        <h2
          className={`text-4xl sm:text-5xl max-w-2xl leading-tight ${t.ink}`}
          style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800 }}
        >
          Todo lo que es NODO360, en claro
        </h2>
        <p className={`mt-4 max-w-2xl text-lg ${t.muted}`}>
          No es solo un software de inventario: es el hilo operativo desde el aviso hasta el regreso al cuartel.
        </p>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="relative pl-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`w-10 h-10 rounded-xl border flex items-center justify-center ${t.iconBox}`}>
                    <Icon className="w-5 h-5 text-red-600" />
                  </span>
                  <h3
                    className={`text-xl leading-tight ${t.ink}`}
                    style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
                  >
                    {p.title}
                  </h3>
                </div>
                <p className={`leading-relaxed text-[15px] ${t.muted}`}>{p.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FlowSection({ t }: { t: ThemeTone }) {
  const { ref, on } = useReveal();
  return (
    <section id="flujo" ref={ref} className={`py-20 sm:py-28 px-4 sm:px-6 ${t.band} border-y ${t.hairline}`}>
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
          <div>
            <p className="text-red-600 text-xs font-bold uppercase tracking-[0.22em] mb-3">Flujo operativo</p>
            <h2
              className={`text-4xl sm:text-5xl leading-tight ${t.ink}`}
              style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800 }}
            >
              De la llamada al cierre
            </h2>
          </div>
          <p className={`max-w-md lg:text-right ${t.muted}`}>
            Así se mueve una emergencia real en NODO360: central, voluntarios y terreno sincronizados.
          </p>
        </div>

        <ol className="relative space-y-0">
          <div
            className="hidden md:block absolute left-[1.65rem] top-4 bottom-4 w-px bg-gradient-to-b from-red-500 via-amber-500/60 to-emerald-500/50"
            aria-hidden
          />
          {FLOW.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.n}
                className="relative grid md:grid-cols-[3.5rem_1fr] gap-4 md:gap-8 py-5 md:py-6"
                style={{ transitionDelay: on ? `${i * 70}ms` : '0ms' }}
              >
                <div className="flex md:justify-center">
                  <span className={`relative z-10 w-14 h-14 rounded-2xl border flex items-center justify-center ${t.stepBox}`}>
                    <Icon className="w-6 h-6 text-red-600" />
                  </span>
                </div>
                <div className={`min-w-0 border-b pb-6 md:border-0 md:pb-0 ${t.hairline}`}>
                  <p
                    className="text-red-600 text-sm tracking-widest mb-1"
                    style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
                  >
                    {step.n}
                  </p>
                  <h3
                    className={`text-2xl sm:text-3xl ${t.ink}`}
                    style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
                  >
                    {step.title}
                  </h3>
                  <p className={`mt-2 max-w-2xl leading-relaxed ${t.muted}`}>{step.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function HowSection({ home, t, isDark }: { home: string; t: ThemeTone; isDark: boolean }) {
  const { ref, on } = useReveal();
  return (
    <section id="usar" ref={ref} className="py-20 sm:py-28 px-4 sm:px-6">
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <p className="text-red-600 text-xs font-bold uppercase tracking-[0.22em] mb-3">Cómo se usa</p>
        <h2
          className={`text-4xl sm:text-5xl max-w-2xl leading-tight ${t.ink}`}
          style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800 }}
        >
          Guía rápida para central y terreno
        </h2>

        <div className="mt-12 grid lg:grid-cols-2 gap-10 lg:gap-16">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Headphones className="w-6 h-6 text-red-600" />
              <h3
                className={`text-2xl ${t.ink}`}
                style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
              >
                Centralista
              </h3>
            </div>
            <ol className="space-y-4">
              {HOW_CENTRAL.map((line, i) => (
                <li key={line} className="flex gap-3">
                  <span
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isDark ? 'bg-red-600/20 text-red-400' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                    style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                  >
                    {i + 1}
                  </span>
                  <p className={`leading-relaxed pt-1 ${t.soft}`}>{line}</p>
                </li>
              ))}
            </ol>
            <Link
              to="/central-emergencia"
              className="mt-8 inline-flex items-center gap-2 text-red-600 font-bold hover:text-red-500"
            >
              Abrir Consola activa <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-6">
              <Smartphone className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`} />
              <h3
                className={`text-2xl ${t.ink}`}
                style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
              >
                Bombero (app móvil)
              </h3>
            </div>
            <ol className="space-y-4">
              {HOW_BOMBERO.map((line, i) => (
                <li key={line} className="flex gap-3">
                  <span
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isDark ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                    }`}
                    style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                  >
                    {i + 1}
                  </span>
                  <p className={`leading-relaxed pt-1 ${t.soft}`}>{line}</p>
                </li>
              ))}
            </ol>
            <Link
              to={home}
              className={`mt-8 inline-flex items-center gap-2 font-bold ${
                isDark ? 'text-cyan-300 hover:text-cyan-200' : 'text-cyan-700 hover:text-cyan-800'
              }`}
            >
              Ir al sistema <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className={`mt-16 grid sm:grid-cols-3 gap-6 border-t ${t.hairline} pt-12`}>
          {[
            { icon: Navigation, t: 'GPS en ruta', d: 'El bombero puede compartir posición al marcar Voy o En el lugar.' },
            { icon: Zap, t: 'Alarma crítica', d: 'Tono 10-X + voz en el teléfono para no perder el llamado.' },
            { icon: CheckCircle2, t: 'Trazabilidad', d: 'Todo queda en bitácora: despacho, radio y cierre con PDF.' },
          ].map((x) => {
            const Icon = x.icon;
            return (
              <div key={x.t}>
                <Icon className="w-5 h-5 text-red-600 mb-3" />
                <p className={`font-bold ${t.ink}`}>{x.t}</p>
                <p className={`text-sm mt-1 leading-relaxed ${t.muted}`}>{x.d}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ModulesSection({ t }: { t: ThemeTone }) {
  const { ref, on } = useReveal();
  return (
    <section id="modulos" ref={ref} className={`py-20 sm:py-28 px-4 sm:px-6 ${t.band} border-t ${t.hairline}`}>
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <p className="text-red-600 text-xs font-bold uppercase tracking-[0.22em] mb-3">Plataforma</p>
        <h2
          className={`text-4xl sm:text-5xl leading-tight ${t.ink}`}
          style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800 }}
        >
          Módulos que verás en el menú
        </h2>
        <p className={`mt-4 max-w-xl ${t.muted}`}>
          Según tu rol (centralista, capitán, bombero…) el menú muestra lo que necesitás. Estos son los ejes operativos.
        </p>
        <ul className={`mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border ${t.hairline} ${
          t.hairline.includes('white') ? 'bg-white/10' : 'bg-slate-200'
        }`}>
          {MODULES.map((m) => (
            <li key={m.name} className={`p-5 transition-colors ${t.card} ${t.cardHover}`}>
              <p
                className={`text-lg ${t.ink}`}
                style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
              >
                {m.name}
              </p>
              <p className={`text-sm mt-1 ${t.muted}`}>{m.tip}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
