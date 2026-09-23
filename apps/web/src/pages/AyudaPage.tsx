import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Bell, BookOpen, CheckCircle2, ChevronRight, Clock, Flame, Headphones,
  HelpCircle, KeyRound, LayoutDashboard, MapPin, MessageCircle, Monitor, Navigation,
  Radio, Shield, Smartphone, Siren, Tablet, Truck, Users, Zap, ArrowRight, Play,
  UserCog, Building2, FileText, Mic, LifeBuoy,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { getDefaultRouteForUser } from '../lib/roleAccess';

const NAV = [
  { href: '#por-que', label: 'Por qué' },
  { href: '#roles', label: 'Roles' },
  { href: '#empezar', label: 'Empezar' },
  { href: '#flujo', label: 'Flujo' },
  { href: '#claves', label: 'Claves' },
  { href: '#operacion', label: 'Operación' },
  { href: '#usar', label: 'Guías' },
  { href: '#pantallas', label: 'Pantallas' },
  { href: '#faq', label: 'FAQ' },
  { href: '#soporte', label: 'Soporte' },
] as const;

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

const ROLES = [
  {
    icon: Headphones,
    title: 'Centralista / Operador central',
    sees: 'Consola activa, Nodo360 Alarms, despacho, mapa, Quién va, radio, bitácora, muro de compañías.',
    tip: 'Si no ves un módulo, es porque tu rol no lo incluye. Pedí acceso a administración del cuerpo.',
  },
  {
    icon: Smartphone,
    title: 'Bombero (móvil)',
    sees: 'Alarmas, Voy / No voy / En el lugar, GPS, radio PTT de la emergencia, comunicados y recap al cierre.',
    tip: 'Tu puesto principal es el celular. Activá notificaciones y alertas críticas antes del turno.',
  },
  {
    icon: Tablet,
    title: 'Carro / NodoTrack',
    sees: 'Tablet en el vehículo: estado del llamado, hitos En camino / En el lugar y apoyo a la dotación.',
    tip: 'Es pantalla de terreno, no reemplaza la consola de la centralista.',
  },
  {
    icon: UserCog,
    title: 'Capitán / mando / admin',
    sees: 'Según el cuerpo: bitácora, flota, implementaciones, reportes y configuración.',
    tip: 'Más pantallas no significa más despacho: la emergencia viva se maneja en Consola activa.',
  },
  {
    icon: Monitor,
    title: 'Muro TV / Vision360',
    sees: 'Vista de cuarteles, salidas y estado de compañías en pantalla grande del cuartel.',
    tip: 'Pantalla de sala: no se usa para despachar ni marcar Voy.',
  },
] as const;

const CHECKLIST_CENTRAL = [
  'Iniciá sesión con tu usuario de centralista.',
  'Abrí Consola activa (o Nodo360 Alarms) y verificá que ves compañías y flota.',
  'Probalá el mapa: dirección o pin se ven claros.',
  'Conocé dónde está Pedir GPS por WhatsApp y confirmar carro.',
  'Revisá Quién va y radio en una emergencia de prueba o reciente.',
] as const;

const CHECKLIST_MOBILE = [
  'Instalá la app / APK del cuerpo e iniciá sesión.',
  'Activá notificaciones, sonido y alertas críticas del sistema.',
  'Permití micrófono (radio PTT) y ubicación (GPS).',
  'Desactivá optimización de batería agresiva para NODO360.',
  'Hacé un test: que suene una alarma de prueba y puedas marcar Voy.',
] as const;

const CLAVES = [
  { code: '10-0', label: 'Incendio estructural', detail: 'Puede pedir detalle (menor / edificio de altura).' },
  { code: '10-1', label: 'Fuego en vehículo', detail: 'Vehículo en llamas o con fuego.' },
  { code: '10-2', label: 'Pastizal / forestal', detail: 'Detalle: urbano, rural, plantación, forestal, interfaz.' },
  { code: '10-3', label: 'Rescate de personas', detail: 'Personas atrapadas o en riesgo.' },
  { code: '10-4', label: 'Rescate vehicular', detail: 'Accidente / extricación.' },
  { code: '10-5', label: 'HazMat', detail: 'Materiales peligrosos.' },
  { code: '10-6', label: 'Emergencia aérea', detail: 'Aeronaves.' },
  { code: '10-7', label: 'Emergencia ferroviaria', detail: 'Tren / vía.' },
  { code: '10-8', label: 'Otros llamados', detail: 'Emergencias que no encajan arriba.' },
  { code: '10-9', label: 'Falsa alarma', detail: 'Cierre / registro de falsa alarma.' },
] as const;

const VIAS = [
  { code: '10-10', label: 'Apoyo a otros cuerpos' },
  { code: '10-11', label: 'Derrumbe o colapso (vía de 10-0)' },
  { code: '10-12', label: 'Apoyo bomberil externo' },
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

const OPS = [
  {
    id: 'carro',
    icon: Truck,
    title: 'Confirmación de carro',
    body: [
      'Antes de despachar, la central confirma qué vehículo sale (bomba, escala, rescate, etc.).',
      'Así la alarma y la flota quedan alineadas: el cuerpo sabe qué unidad responde.',
      'Si no confirmás carro cuando el sistema lo pide, el despacho no avanza.',
    ],
  },
  {
    id: 'quien-va',
    icon: Users,
    title: 'Quién va',
    body: [
      'En el móvil: Voy (vas), No voy (no respondés), En el lugar (ya estás en el siniestro).',
      'La central ve la lista en vivo en Consola activa: dotación, estados y GPS si compartieron.',
      'Sirve para saber si hay gente suficiente y quién está en camino sin preguntar por radio una por una.',
    ],
  },
  {
    id: 'whatsapp',
    icon: MessageCircle,
    title: 'WhatsApp GPS',
    body: [
      'Usalo cuando la dirección es vaga o el reportante está en el lugar y puede marcar el pin.',
      'La central envía un enlace; el reportante abre una vista simple, marca el punto y listo.',
      'No necesita instalar NODO360. El pin vuelve a la consola y al mapa de la emergencia.',
    ],
  },
  {
    id: 'radio',
    icon: Mic,
    title: 'Radio PTT',
    body: [
      'Hay un canal por emergencia: solo quienes están en ese llamado escuchan.',
      'Mantení pulsado para hablar; mensajes cortos y claros (ubicación, estado, pedido).',
      'Al pulsar y al soltar suena el tono de radio (mitad de nodo.mp3 al inicio, la otra al corte).',
      'Las transmisiones pueden quedar en la línea de tiempo junto a la bitácora.',
      'Permití micrófono en el navegador o en la app. Sin permiso, el PTT no transmite.',
    ],
  },
  {
    id: 'bitacora',
    icon: FileText,
    title: 'Bitácora, hitos y MAYDAY',
    body: [
      'Registrá el avance sin papeles: En camino, En el lugar, apoyos, operación y cierre.',
      'MAYDAY es crítico: emergencia de bombero. Se prioriza en la línea de tiempo.',
      'La bitácora alimenta el informe: lo que no se registra, no queda para el cuerpo.',
      'Central y terreno pueden aportar hitos según el módulo (Consola / Bitácora360 / carro).',
    ],
  },
  {
    id: 'cierre',
    icon: BookOpen,
    title: 'Cierre e informe PDF',
    body: [
      'Cuando el llamado termina, se cierra la emergencia desde bitácora / consola.',
      'Se genera un PDF con el historial operativo para archivo del cuerpo.',
      'Los bomberos pueden ver un recap en el móvil al cerrar.',
      'Cerrar no borra la historia: queda disponible para revisión y reportes.',
    ],
  },
  {
    id: 'cuartel',
    icon: Building2,
    title: 'Disponibilidad en cuartel',
    body: [
      'Fuera de emergencia, el bombero puede marcar presencia / disponibilidad en el cuartel.',
      'Si está calificado como maquinista y se marca disponible, queda habilitado; si no hay a cargo, toma el cargo.',
      'Ayuda a saber quién está en la casa de bombas antes de que suene el próximo llamado.',
      'No reemplaza Voy / No voy durante una emergencia activa.',
    ],
  },
] as const;

const SCREENS = [
  {
    icon: LayoutDashboard,
    title: 'Consola activa',
    text: 'Puesto unificado de la centralista: despacho, mapa, Quién va, radio y bitácora de la emergencia viva.',
  },
  {
    icon: Siren,
    title: 'Nodo360 Alarms / Despacho360',
    text: 'Botonera de claves 10-X, dirección, carro y despacho rápido.',
  },
  {
    icon: BookOpen,
    title: 'Bitácora360',
    text: 'Fases del incidente, hitos y cierre con PDF.',
  },
  {
    icon: MapPin,
    title: 'Mapa 360 / Hidrantes',
    text: 'Terreno, pin del llamado y recursos cercanos.',
  },
  {
    icon: Monitor,
    title: 'Muro TV / Vision360',
    text: 'Pantalla de cuartel: compañías, salidas y estado en vivo. No despacha.',
  },
  {
    icon: Tablet,
    title: 'Tablet carro (NodoTrack)',
    text: 'Pantalla en el vehículo: llamado activo e hitos de desplazamiento.',
  },
  {
    icon: Smartphone,
    title: 'App móvil bombero',
    text: 'Alarma, respuesta Voy/No voy, GPS, radio y recap.',
  },
  {
    icon: Building2,
    title: 'Salas públicas / salida',
    text: 'Vistas de cuartel para ver dotación y salida sin entrar a la consola completa.',
  },
] as const;

const FAQ = [
  {
    q: 'No me suena la alarma en el celular',
    a: 'Revisá notificaciones, volumen, modo No molestar y alertas críticas. En Android, sacá NODO360 de la optimización de batería. Probá una alarma de test con la central.',
  },
  {
    q: 'No veo el mapa o el pin',
    a: 'Comprobá conexión a internet y permisos de ubicación. Si la dirección es dudosa, pedí GPS por WhatsApp al reportante.',
  },
  {
    q: 'No puedo despachar',
    a: 'Verificá que tu rol sea de centralista, que hayas elegido clave (y detalle si aplica), dirección/pin y carro confirmado cuando el sistema lo pide.',
  },
  {
    q: 'No aparece un módulo en el menú',
    a: 'El menú depende del rol. Centralista, bombero, carro y admin ven pantallas distintas. Pedí el rol correcto a quien administra el cuerpo.',
  },
  {
    q: 'La radio PTT no transmite',
    a: 'Permití el micrófono. Entrá a la emergencia correcta (cada llamado tiene su canal). Usá auriculares si el dispositivo bloquea el micrófono en manos libres.',
  },
  {
    q: 'Se me cerró la sesión',
    a: 'Volvé a iniciar sesión. Si pasa seguido en un puesto fijo de central, revisá que el navegador no limpie datos automáticamente.',
  },
  {
    q: 'Tema claro se ve distinto',
    a: 'NODO360 respeta el tema del sistema. En Ayuda, el hero del video siempre queda oscuro para contraste; el resto de la guía se adapta al tema claro u oscuro.',
  },
  {
    q: '¿Qué datos mando si pido soporte?',
    a: 'Compañía / cuerpo, tu rol, qué estabas haciendo, hora aproximada y una captura. Eso acelera el diagnóstico en kodesk.cl.',
  },
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

function SectionHead({
  eyebrow,
  title,
  lead,
  t,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  t: ThemeTone;
}) {
  return (
    <>
      <p className="text-red-600 text-xs font-bold uppercase tracking-[0.22em] mb-3">{eyebrow}</p>
      <h2
        className={`text-4xl sm:text-5xl max-w-3xl leading-tight ${t.ink}`}
        style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800 }}
      >
        {title}
      </h2>
      {lead ? <p className={`mt-4 max-w-2xl text-lg ${t.muted}`}>{lead}</p> : null}
    </>
  );
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
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-5">
            {NAV.map((item, i) => (
              <span key={item.href} className="inline-flex items-center gap-3">
                {i > 0 ? <span className="text-slate-500">·</span> : null}
                <a
                  href={item.href}
                  className="text-[11px] font-bold uppercase tracking-wider text-slate-200 hover:text-white"
                >
                  {item.label}
                </a>
              </span>
            ))}
          </div>
          <p
            className="text-red-400 text-sm sm:text-base font-semibold uppercase tracking-[0.28em] mb-4 animate-[ayuda-rise_0.8s_ease-out_both]"
            style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
          >
            Documentación operativa NODO360
          </p>
          <h1
            className="text-white text-[clamp(2.75rem,8vw,5.5rem)] leading-[0.92] max-w-4xl animate-[ayuda-rise_0.9s_ease-out_0.08s_both]"
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800 }}
          >
            NODO<span className="text-red-500">360</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg sm:text-xl text-slate-100 leading-relaxed animate-[ayuda-rise_1s_ease-out_0.16s_both]">
            Guía para centralistas, bomberos y terreno: despacho, GPS, WhatsApp, radio, bitácora y cierre en un solo lugar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 animate-[ayuda-rise_1.05s_ease-out_0.24s_both]">
            <a
              href="#empezar"
              className="keep-on-color inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-3 rounded-xl transition-colors"
            >
              Para empezar
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#operacion"
              className="inline-flex items-center gap-2 border border-white/35 hover:border-white/60 text-white font-semibold px-5 py-3 rounded-xl backdrop-blur-sm bg-black/25 transition-colors"
            >
              <Play className="w-4 h-4" />
              Operación
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

      <DocIndex t={t} />
      <PillarsSection t={t} />
      <RolesSection t={t} />
      <StartSection t={t} isDark={isDark} />
      <FlowSection t={t} />
      <ClavesSection t={t} />
      <OpsSection t={t} />
      <HowSection home={home} t={t} isDark={isDark} />
      <ScreensSection t={t} />
      <ModulesSection t={t} />
      <FaqSection t={t} isDark={isDark} />
      <SupportSection t={t} />

      <section className="relative py-24 px-4 sm:px-6 overflow-hidden">
        <div
          className={`absolute inset-0 ${
            isDark
              ? 'bg-gradient-to-br from-red-950/50 via-transparent to-cyan-950/20'
              : 'bg-gradient-to-br from-red-100/70 via-transparent to-sky-100/50'
          }`}
        />
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
        <div
          className={`max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm ${t.muted}`}
        >
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-600" />
            <span>
              NODO360 · Documentación operativa ·{' '}
              <a
                href="https://kodesk.cl/"
                className={`${t.footerLink} transition-colors`}
                target="_blank"
                rel="noreferrer"
              >
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

function DocIndex({ t }: { t: ThemeTone }) {
  const { ref, on } = useReveal();
  const items = [
    { href: '#roles', label: 'Roles y pantallas', icon: UserCog },
    { href: '#empezar', label: 'Checklist de arranque', icon: CheckCircle2 },
    { href: '#claves', label: 'Claves 10-X', icon: KeyRound },
    { href: '#operacion', label: 'Operación día a día', icon: Siren },
    { href: '#pantallas', label: 'Pantallas del sistema', icon: Monitor },
    { href: '#faq', label: 'Preguntas frecuentes', icon: HelpCircle },
    { href: '#soporte', label: 'Soporte', icon: LifeBuoy },
  ];
  return (
    <section id="docs" ref={ref} className="py-16 sm:py-20 px-4 sm:px-6">
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <SectionHead
          t={t}
          eyebrow="Índice"
          title="Documentación para operar NODO360"
          lead="Esta página es la guía del cuerpo: centralista, bombero, carro y pantallas de cuartel."
        />
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${t.hairline} ${t.card} ${t.cardHover}`}
              >
                <span className={`w-9 h-9 rounded-lg border flex items-center justify-center ${t.iconBox}`}>
                  <Icon className="w-4 h-4 text-red-600" />
                </span>
                <span className={`font-semibold ${t.ink}`}>{item.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PillarsSection({ t }: { t: ThemeTone }) {
  const { ref, on } = useReveal();
  return (
    <section ref={ref} className={`py-20 sm:py-28 px-4 sm:px-6 ${t.band} border-y ${t.hairline}`}>
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <SectionHead
          t={t}
          eyebrow="Qué resuelve"
          title="Todo lo que es NODO360, en claro"
          lead="No es solo un software de inventario: es el hilo operativo desde el aviso hasta el regreso al cuartel."
        />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title}>
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

function RolesSection({ t }: { t: ThemeTone }) {
  const { ref, on } = useReveal();
  return (
    <section id="roles" ref={ref} className="py-20 sm:py-28 px-4 sm:px-6">
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <SectionHead
          t={t}
          eyebrow="Roles"
          title="Quién ve qué"
          lead="Si no te aparece una pantalla, casi siempre es el rol — no un error del sistema."
        />
        <div className="mt-12 space-y-6">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className={`rounded-2xl border p-5 sm:p-6 ${t.hairline} ${t.card}`}
              >
                <div className="flex items-start gap-4">
                  <span className={`shrink-0 w-11 h-11 rounded-xl border flex items-center justify-center ${t.iconBox}`}>
                    <Icon className="w-5 h-5 text-red-600" />
                  </span>
                  <div className="min-w-0">
                    <h3
                      className={`text-2xl ${t.ink}`}
                      style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
                    >
                      {r.title}
                    </h3>
                    <p className={`mt-2 leading-relaxed ${t.soft}`}>
                      <span className="font-semibold">Ve: </span>
                      {r.sees}
                    </p>
                    <p className={`mt-2 text-sm leading-relaxed ${t.muted}`}>{r.tip}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StartSection({ t, isDark }: { t: ThemeTone; isDark: boolean }) {
  const { ref, on } = useReveal();
  return (
    <section id="empezar" ref={ref} className={`py-20 sm:py-28 px-4 sm:px-6 ${t.band} border-y ${t.hairline}`}>
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <SectionHead
          t={t}
          eyebrow="Para empezar"
          title="Checklist de arranque"
          lead="Cinco pasos para central y cinco para el celular. Imprimible mentalmente antes del turno."
        />
        <div className="mt-12 grid lg:grid-cols-2 gap-10 lg:gap-14">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <Headphones className="w-6 h-6 text-red-600" />
              <h3
                className={`text-2xl ${t.ink}`}
                style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
              >
                Centralista
              </h3>
            </div>
            <ul className="space-y-3">
              {CHECKLIST_CENTRAL.map((line) => (
                <li key={line} className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <span className={`leading-relaxed ${t.soft}`}>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-5">
              <Smartphone className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`} />
              <h3
                className={`text-2xl ${t.ink}`}
                style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
              >
                Bombero (celular)
              </h3>
            </div>
            <ul className="space-y-3">
              {CHECKLIST_MOBILE.map((line) => (
                <li key={line} className="flex gap-3">
                  <CheckCircle2
                    className={`w-5 h-5 shrink-0 mt-0.5 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}
                  />
                  <span className={`leading-relaxed ${t.soft}`}>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div
          className={`mt-12 rounded-2xl border p-5 sm:p-6 flex gap-4 ${t.hairline} ${
            isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <AlertTriangle className={`w-6 h-6 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-700'}`} />
          <p className={`leading-relaxed ${t.soft}`}>
            <span className={`font-bold ${t.ink}`}>Sin notificaciones no hay alarma. </span>
            El paso más fallido en terreno es el celular en silencio, batería agresiva o permisos denegados.
          </p>
        </div>
      </div>
    </section>
  );
}

function FlowSection({ t }: { t: ThemeTone }) {
  const { ref, on } = useReveal();
  return (
    <section id="flujo" ref={ref} className="py-20 sm:py-28 px-4 sm:px-6">
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
          <div>
            <SectionHead
              t={t}
              eyebrow="Flujo operativo"
              title="De la llamada al cierre"
            />
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
                  <span
                    className={`relative z-10 w-14 h-14 rounded-2xl border flex items-center justify-center ${t.stepBox}`}
                  >
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

function ClavesSection({ t }: { t: ThemeTone }) {
  const { ref, on } = useReveal();
  return (
    <section id="claves" ref={ref} className={`py-20 sm:py-28 px-4 sm:px-6 ${t.band} border-y ${t.hairline}`}>
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <SectionHead
          t={t}
          eyebrow="Claves"
          title="Familias 10-X"
          lead="Elegí la clave correcta (y el detalle si aparece). Eso define tono, voz y el tipo de respuesta."
        />
        <div className="mt-10 grid sm:grid-cols-2 gap-3">
          {CLAVES.map((c) => (
            <div
              key={c.code}
              className={`rounded-xl border px-4 py-3 flex gap-3 items-start ${t.hairline} ${t.card}`}
            >
              <span
                className="shrink-0 text-red-600 text-lg font-bold min-w-[3.5rem]"
                style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
              >
                {c.code}
              </span>
              <div>
                <p className={`font-semibold ${t.ink}`}>{c.label}</p>
                <p className={`text-sm mt-0.5 ${t.muted}`}>{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <h3
            className={`text-xl mb-4 ${t.ink}`}
            style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
          >
            Vías / tonos de apoyo
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {VIAS.map((v) => (
              <div key={v.code} className={`rounded-xl border px-4 py-3 ${t.hairline} ${t.card}`}>
                <p
                  className="text-red-600 font-bold"
                  style={{ fontFamily: '"Barlow Condensed", sans-serif' }}
                >
                  {v.code}
                </p>
                <p className={`text-sm mt-1 ${t.muted}`}>{v.label}</p>
              </div>
            ))}
          </div>
          <p className={`mt-4 text-sm ${t.muted}`}>
            Atajos numéricos en despacho: teclas 0–9 corresponden a 10-0 … 10-9 cuando el foco está en la botonera.
          </p>
        </div>
      </div>
    </section>
  );
}

function OpsSection({ t }: { t: ThemeTone }) {
  const { ref, on } = useReveal();
  return (
    <section id="operacion" ref={ref} className="py-20 sm:py-28 px-4 sm:px-6">
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <SectionHead
          t={t}
          eyebrow="Operación"
          title="Lo que importa en el momento"
          lead="Carro, Quién va, WhatsApp GPS, radio, bitácora, cierre y disponibilidad en cuartel."
        />
        <div className="mt-12 space-y-8">
          {OPS.map((op) => {
            const Icon = op.icon;
            return (
              <article
                key={op.id}
                id={op.id}
                className={`rounded-2xl border p-5 sm:p-7 scroll-mt-8 ${t.hairline} ${t.card}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className={`w-11 h-11 rounded-xl border flex items-center justify-center ${t.iconBox}`}>
                    <Icon className="w-5 h-5 text-red-600" />
                  </span>
                  <h3
                    className={`text-2xl sm:text-3xl ${t.ink}`}
                    style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
                  >
                    {op.title}
                  </h3>
                </div>
                <ul className="space-y-2.5">
                  {op.body.map((line) => (
                    <li key={line} className={`leading-relaxed pl-4 border-l-2 border-red-500/40 ${t.soft}`}>
                      {line}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowSection({ home, t, isDark }: { home: string; t: ThemeTone; isDark: boolean }) {
  const { ref, on } = useReveal();
  return (
    <section id="usar" ref={ref} className={`py-20 sm:py-28 px-4 sm:px-6 ${t.band} border-y ${t.hairline}`}>
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <SectionHead
          t={t}
          eyebrow="Cómo se usa"
          title="Guía rápida para central y terreno"
        />

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
            {
              icon: Navigation,
              title: 'GPS en ruta',
              d: 'El bombero puede compartir posición al marcar Voy o En el lugar.',
            },
            {
              icon: Zap,
              title: 'Alarma crítica',
              d: 'Tono 10-X + voz en el teléfono para no perder el llamado.',
            },
            {
              icon: CheckCircle2,
              title: 'Trazabilidad',
              d: 'Todo queda en bitácora: despacho, radio y cierre con PDF.',
            },
          ].map((x) => {
            const Icon = x.icon;
            return (
              <div key={x.title}>
                <Icon className="w-5 h-5 text-red-600 mb-3" />
                <p className={`font-bold ${t.ink}`}>{x.title}</p>
                <p className={`text-sm mt-1 leading-relaxed ${t.muted}`}>{x.d}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ScreensSection({ t }: { t: ThemeTone }) {
  const { ref, on } = useReveal();
  return (
    <section id="pantallas" ref={ref} className="py-20 sm:py-28 px-4 sm:px-6">
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <SectionHead
          t={t}
          eyebrow="Pantallas"
          title="Para qué sirve cada vista"
          lead="Consola para despachar, móvil para responder, TV y carro para ver — no al revés."
        />
        <div className="mt-12 grid sm:grid-cols-2 gap-5">
          {SCREENS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className={`rounded-2xl border p-5 ${t.hairline} ${t.card}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-5 h-5 text-red-600" />
                  <h3
                    className={`text-xl ${t.ink}`}
                    style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
                  >
                    {s.title}
                  </h3>
                </div>
                <p className={`text-[15px] leading-relaxed ${t.muted}`}>{s.text}</p>
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
    <section id="modulos" ref={ref} className={`py-20 sm:py-28 px-4 sm:px-6 ${t.band} border-y ${t.hairline}`}>
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <SectionHead
          t={t}
          eyebrow="Plataforma"
          title="Módulos que verás en el menú"
          lead="Según tu rol el menú muestra lo que necesitás. Estos son los ejes operativos."
        />
        <ul
          className={`mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border ${t.hairline} ${
            t.hairline.includes('white') ? 'bg-white/10' : 'bg-slate-200'
          }`}
        >
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

function FaqSection({ t, isDark }: { t: ThemeTone; isDark: boolean }) {
  const { ref, on } = useReveal();
  return (
    <section id="faq" ref={ref} className="py-20 sm:py-28 px-4 sm:px-6">
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <SectionHead
          t={t}
          eyebrow="FAQ"
          title="Preguntas frecuentes"
          lead="Los problemas que más aparecen en central y en el celular."
        />
        <div className="mt-10 space-y-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className={`group rounded-xl border ${t.hairline} ${t.card} open:shadow-sm`}
            >
              <summary
                className={`cursor-pointer list-none flex items-center justify-between gap-4 px-5 py-4 font-semibold ${t.ink}`}
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className={`w-4 h-4 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  {item.q}
                </span>
                <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-open:rotate-90 ${t.muted}`} />
              </summary>
              <p className={`px-5 pb-5 pt-0 leading-relaxed ${t.muted}`}>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function SupportSection({ t }: { t: ThemeTone }) {
  const { ref, on } = useReveal();
  return (
    <section id="soporte" ref={ref} className={`py-20 sm:py-28 px-4 sm:px-6 ${t.band} border-t ${t.hairline}`}>
      <div className={`max-w-6xl mx-auto ayuda-reveal ${on ? 'on' : ''}`}>
        <SectionHead
          t={t}
          eyebrow="Soporte"
          title="Cómo pedir ayuda"
          lead="Con estos datos resolvemos más rápido."
        />
        <div className="mt-10 grid lg:grid-cols-2 gap-8">
          <div className={`rounded-2xl border p-6 ${t.hairline} ${t.card}`}>
            <LifeBuoy className="w-7 h-7 text-red-600 mb-4" />
            <h3
              className={`text-2xl ${t.ink}`}
              style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
            >
              Contacto
            </h3>
            <p className={`mt-3 leading-relaxed ${t.muted}`}>
              Soporte de plataforma:{' '}
              <a
                href="https://kodesk.cl/"
                target="_blank"
                rel="noreferrer"
                className="text-red-600 font-semibold hover:text-red-500"
              >
                kodesk.cl
              </a>
            </p>
            <p className={`mt-2 text-sm ${t.muted}`}>
              Para temas del cuerpo (usuarios, roles, flota), hablá primero con quien administra NODO360 en tu compañía.
            </p>
          </div>
          <div className={`rounded-2xl border p-6 ${t.hairline} ${t.card}`}>
            <FileText className="w-7 h-7 text-red-600 mb-4" />
            <h3
              className={`text-2xl ${t.ink}`}
              style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 700 }}
            >
              Qué enviar
            </h3>
            <ul className={`mt-3 space-y-2 ${t.soft}`}>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-1" />
                Compañía / cuerpo y tu rol
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-1" />
                Qué estabas haciendo (despacho, alarma, radio…)
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-1" />
                Hora aproximada y captura de pantalla
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-1" />
                Si es móvil: marca del teléfono y si es APK o navegador
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
