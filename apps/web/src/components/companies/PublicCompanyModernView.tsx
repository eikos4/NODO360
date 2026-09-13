import { useState, useEffect, useRef } from 'react';
import { 
  Users, UserCog, Truck, Siren, Search, Filter, CheckCircle2, XCircle, 
  ChevronRight, Calendar, Clock, MapPin, Plus, Loader2, Shield, X, Moon,
} from 'lucide-react';
import { PublicCentral, RosterMember, MaquinistaMember, FleetVehicle } from '../../pages/DispatchPublicPage';
import { PublicEmergency } from '../dispatch/DispatchEmergenciesPanel';
import PublicEmergencySummaryModal, { type EmergencyOpen } from '../dispatch/PublicEmergencySummaryModal';
import RoleBadge from '../RoleBadge';
import PublicOsmMap, { PARRAL_CENTER } from '../map/PublicOsmMap';

type NoveltyTone = 'red' | 'amber' | 'blue';

type Novelty = {
  id: string;
  title: string;
  when: string;
  datetime: string;
  category: string;
  tone: NoveltyTone;
  summary: string;
  body: string;
  place?: string;
};

const NOVELTY_TONE: Record<NoveltyTone, { icon: string; badge: string; iconBg: string }> = {
  red: { icon: 'text-red-500', badge: 'bg-red-50 text-red-600 border-red-200', iconBg: 'bg-red-100' },
  amber: { icon: 'text-amber-500', badge: 'bg-amber-50 text-amber-600 border-amber-200', iconBg: 'bg-amber-100' },
  blue: { icon: 'text-blue-500', badge: 'bg-blue-50 text-blue-600 border-blue-200', iconBg: 'bg-blue-100' },
};

const NOVELTY_TONE_NODO: Record<NoveltyTone, { icon: string; badge: string; iconBg: string }> = {
  red: { icon: 'text-red-400', badge: 'bg-[#3a151b] text-[#ff8a90] border-[#ef343f]/40', iconBg: 'bg-[#3a151b]' },
  amber: { icon: 'text-amber-300', badge: 'bg-[#3a2a0a] text-amber-200 border-amber-500/35', iconBg: 'bg-[#3a2a0a]' },
  blue: { icon: 'text-[#67c8ff]', badge: 'bg-[#0b2736] text-[#67c8ff] border-[#38bdf8]/40', iconBg: 'bg-[#0b2736]' },
};

const NOVELTY_TONE_VERDE: Record<NoveltyTone, { icon: string; badge: string; iconBg: string }> = {
  red: { icon: 'text-red-400', badge: 'bg-[#3a151b] text-[#ff8a90] border-[#ef343f]/40', iconBg: 'bg-[#3a151b]' },
  amber: { icon: 'text-amber-200', badge: 'bg-[#2a2410] text-amber-100 border-amber-500/35', iconBg: 'bg-[#2a2410]' },
  blue: { icon: 'text-[#1ce783]', badge: 'bg-[#0a2a1c] text-[#1ce783] border-[#1ce783]/40', iconBg: 'bg-[#0a2a1c]' },
};

const NOVELTY_TONE_AZUL: Record<NoveltyTone, { icon: string; badge: string; iconBg: string }> = {
  red: { icon: 'text-red-200', badge: 'bg-white/15 text-white border-white/30', iconBg: 'bg-white/15' },
  amber: { icon: 'text-amber-100', badge: 'bg-white/15 text-white border-white/30', iconBg: 'bg-white/15' },
  blue: { icon: 'text-white', badge: 'bg-white/15 text-white border-white/30', iconBg: 'bg-white/15' },
};

function formatNoveltyDay(daysAgo: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function noveltyWhen(daysAgo: number) {
  if (daysAgo === 0) return 'Hoy';
  if (daysAgo === 1) return 'Ayer';
  return `Hace ${daysAgo} días`;
}

const NOVEDADES: Novelty[] = [
  {
    id: 'rit',
    title: 'Entrenamiento RIT',
    when: noveltyWhen(1),
    datetime: formatNoveltyDay(1, 9),
    category: 'Entrenamiento',
    tone: 'red',
    summary: formatNoveltyDay(1, 9),
    place: 'Cuartel · patio de maniobras',
    body: 'Instrucción de Rapid Intervention Team para toda la compañía. Asistencia obligatoria de la guardia. Equipo de intervención y ERA listos 15 minutos antes. Al término se revisa material y se deja constancia en bitácora.',
  },
  {
    id: 'b1',
    title: 'Mantención preventiva Carro B-1',
    when: noveltyWhen(2),
    datetime: formatNoveltyDay(2, 8, 30),
    category: 'Mantención',
    tone: 'amber',
    summary: formatNoveltyDay(2, 8, 30),
    place: 'Sala de máquinas',
    body: 'Revisión de bomba, niveles y alumbrado del B-1. El carro queda fuera de primera respuesta mientras dure el servicio. Cualquier despacho se cubre con el carro de reserva. Encargado de material informa el alta al capitán.',
  },
  {
    id: 'guardia',
    title: 'Guardia nocturna',
    when: noveltyWhen(1),
    datetime: `${formatNoveltyDay(1, 20)} al ${formatNoveltyDay(0, 8)}`,
    category: 'Guardia',
    tone: 'blue',
    summary: 'Turno de guardia confirmado en cuartel.',
    place: 'Cuartel',
    body: 'Dotación de guardia nocturna confirmada. Central operativa y radio en escucha. Quienes no estén de turno quedan en alerta domiciliaria. Novedades del turno se registran en el libro de guardia al relevo de las 08:00.',
  },
];

interface Props {
  data: PublicCentral;
  onToggleMember: (m: RosterMember) => void;
  onToggleMaquinista: (m: MaquinistaMember) => void;
  onToggleByNumber?: (markAvailableOrNum?: boolean | number, explicitNum?: number) => void;
  togglingId?: string | null;
  onEmergency?: boolean;
  padActive?: boolean;
  night?: boolean;
  look?: 'light' | 'nodo' | 'verde' | 'azul' | 'night';
}

function LiveClock({ night, nodo, verde, azul }: { night?: boolean; nodo?: boolean; verde?: boolean; azul?: boolean }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  
  return (
    <div className="text-right">
      <p className={`text-2xl font-semibold font-mono ${
        night ? 'text-amber-100'
          : nodo ? 'text-[#67c8ff]'
            : verde ? 'text-[#1ce783]'
              : azul ? 'text-white'
                : 'text-slate-800'
      }`}>
        {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} <span className="text-sm font-semibold uppercase">{now.getHours() >= 12 ? 'p. m.' : 'a. m.'}</span>
      </p>
      <p className="text-xs text-slate-500 font-medium capitalize flex items-center justify-end gap-1.5 mt-0.5">
        <Calendar className="w-3.5 h-3.5" />
        {now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}

function publicMediaUrl(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
      const api = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
      if (api) {
        const base = new URL(api, window.location.origin);
        return `${base.origin}${parsed.pathname}${parsed.search}`;
      }
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return `${window.location.protocol}//${window.location.hostname}:3001${parsed.pathname}${parsed.search}`;
      }
    }
    return parsed.href;
  } catch {
    return url;
  }
}

function FleetPhoto({ imageUrl, label, nodo }: { imageUrl?: string | null; label: string; nodo?: boolean }) {
  const [broken, setBroken] = useState(false);
  const src = publicMediaUrl(imageUrl);
  const show = Boolean(src) && !broken;
  return (
    <div
      className={`fleet-photo h-36 relative overflow-hidden ${nodo ? '' : 'bg-slate-100'}`}
      style={nodo ? { background: '#e8eef4' } : undefined}
    >
      {show ? (
        <img
          src={src!}
          className="w-full h-full object-cover object-center"
          alt={label}
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Truck className={`w-10 h-10 ${nodo ? 'text-slate-500' : 'text-slate-300'}`} />
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, value, label, subtext, colorClass, isAlert = false }: any) {
  return (
    <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-800 leading-none">{value}</p>
        <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`w-1.5 h-1.5 rounded-full ${isAlert ? 'bg-red-500' : 'bg-emerald-500'}`} />
          <p className="text-[10px] text-slate-400 font-medium">{subtext}</p>
        </div>
      </div>
    </div>
  );
}

export default function PublicCompanyModernView({ data, onToggleMember, onToggleMaquinista, onToggleByNumber, togglingId, onEmergency, padActive, night, look }: Props) {
  const isNodo = look === 'nodo';
  const isVerde = look === 'verde';
  const isAzul = look === 'azul';
  const inkDark = isNodo || isVerde || isAzul;
  const noveltyTones = isAzul ? NOVELTY_TONE_AZUL : isVerde ? NOVELTY_TONE_VERDE : isNodo ? NOVELTY_TONE_NODO : NOVELTY_TONE;
  const chrome = isAzul
    ? { text: 'text-white', muted: 'text-white/70', body: 'text-white/90', hover: 'hover:bg-white/10', border: 'border-white/20', card: 'bg-[#0712b8]/80', close: 'bg-white text-[#0918e3] hover:bg-white/90' }
    : isVerde
      ? { text: 'text-[#e8f8ee]', muted: 'text-[#8fb9a4]', body: 'text-[#c8e6d6]', hover: 'hover:bg-[#0a2a1c]', border: 'border-[#13402c]', card: 'bg-[#062016]', close: 'bg-[#1ce783] text-[#00140e] hover:bg-[#17c972]' }
      : isNodo
        ? { text: 'text-[#e7edf4]', muted: 'text-[#9fb3c4]', body: 'text-[#c5d3de]', hover: 'hover:bg-[#102433]', border: 'border-[#1d3041]', card: 'bg-[#0d1924]', close: 'bg-[#ef343f] text-white hover:bg-[#d42d37]' }
        : { text: 'text-slate-800', muted: 'text-slate-500', body: 'text-slate-700', hover: 'hover:bg-slate-50', border: 'border-slate-100', card: 'bg-white', close: 'bg-slate-900 text-white hover:bg-slate-800' };
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'available' | 'unavailable'>('available');
  const [globalSearchResult, setGlobalSearchResult] = useState<any>(null);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [noveltyOpen, setNoveltyOpen] = useState<Novelty | 'all' | null>(null);
  const [emergencyOpen, setEmergencyOpen] = useState<EmergencyOpen>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!padActive) return;
    searchRef.current?.focus();
    const t = window.setTimeout(() => searchRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [padActive]);

  const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

  useEffect(() => {
    if (!search || isNaN(Number(search))) {
      setGlobalSearchResult(null);
      return;
    }
    const num = Number(search);
    const delay = setTimeout(async () => {
      try {
        setIsSearchingGlobal(true);
        const res = await fetch(`${apiBase}/dispatch/public/${data.slug}/search-operative/${num}`);
        if (res.ok) {
          const user = await res.json();
          // Solo lo guardamos si existe y si no está ya en la compañía actual como oficial, aunque no importa mucho
          setGlobalSearchResult(user && user.id ? user : null);
        } else {
          setGlobalSearchResult(null);
        }
      } catch {
        setGlobalSearchResult(null);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [search, data.slug, apiBase]);
  
  const bomberosDisp = data.roster.stats.available;
  const maqDisp = data.maquinistas.stats.available;
  const carrosOp = data.fleet.stats.operativo;
  const emergencias = data.emergencyStats.active;

  // Filtrado de bomberos
  const filteredBomberos = data.roster.members.filter(m => {
    const q = search.toLowerCase();
    const matchesSearch = m.fullName.toLowerCase().includes(q) || m.operativeNumber?.toString() === q;
    if (!matchesSearch) return false;
    if (q) return true;
    if (filterState === 'available') return m.stationAvailable;
    if (filterState === 'unavailable') return !m.stationAvailable;
    return true;
  });

  const filteredMaquinistas = data.maquinistas.members.filter(m => {
    if (filterState === 'available') return m.maquinistaAvailable;
    if (filterState === 'unavailable') return !m.maquinistaAvailable;
    return true;
  });

  return (
    <div className={`flex-1 min-h-0 overflow-hidden font-sans p-4 flex flex-col gap-4 relative z-10 ${
      night ? 'bg-transparent text-[#f4e8d0]'
        : isVerde ? 'sala-modern-verde bg-[#00140e] text-[#e8f8ee]'
          : isNodo ? 'sala-modern-nodo bg-[#071019] text-[#e7edf4]'
            : isAzul ? 'sala-modern-azul text-white'
              : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 lg:px-6 border-b border-slate-200/60 rounded-2xl shadow-sm relative z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center ring-2 ring-white z-10"><span className="nodo-on-color text-white text-xs font-semibold">N</span></div>
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center ring-2 ring-white"><span className="nodo-on-color text-white text-xs font-semibold">3</span></div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-800 leading-none">NODO360</p>
              <p className="text-[9px] font-medium text-slate-400 uppercase">Sala de máquinas pública</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-14 bg-slate-800 rounded-lg shrink-0 overflow-hidden flex items-center justify-center p-1 shadow-inner shadow-black/20">
              {data.logoUrl ? <img src={data.logoUrl} className="w-full h-full object-contain drop-shadow-md" alt="Logo" /> : <Shield className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-semibold text-slate-800">{data.name}</h1>
              <p className="text-xs font-medium text-slate-500">Sala de Máquinas Pública</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {night && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/90">
              <Moon className="w-3 h-3" /> Guardia nocturna
            </span>
          )}
          {isNodo && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase text-[#67c8ff]">
              Tema Nodo
            </span>
          )}
          {isVerde && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase text-[#1ce783]">
              Tema verde
            </span>
          )}
          {isAzul && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase text-white">
              Tema azul
            </span>
          )}
          <LiveClock night={night} nodo={isNodo} verde={isVerde} azul={isAzul} />
        </div>
      </header>

      {/* TOP ROW: STATS & QR */}
      <div className="flex flex-col xl:flex-row gap-4 relative z-0 shrink-0">
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} value={bomberosDisp} label="Bomberos disponibles" subtext={`de ${data.roster.stats.total} en total`} colorClass="bg-emerald-100 text-emerald-600" />
          <StatCard icon={UserCog} value={maqDisp} label="Maquinistas disponibles" subtext={`de ${data.maquinistas.stats.total} en total`} colorClass="bg-red-100 text-red-600" />
          <StatCard icon={Truck} value={carrosOp} label="Carros operativos" subtext={`de ${data.fleet.stats.total} en total`} colorClass="bg-red-100 text-red-600" />
          <StatCard icon={Siren} value={emergencias} label="Emergencias activas" subtext={emergencias ? `${emergencias} en curso` : 'Sin emergencias'} colorClass="bg-red-100 text-red-600" isAlert={emergencias > 0} />
        </div>
        <div className="w-full xl:w-72 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800 leading-tight mb-1">Marcar disponibilidad por QR</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">Escanea el código para marcarte como disponible o no disponible.</p>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="qr-plate w-20 h-20 bg-white rounded-xl p-1 border border-slate-200 overflow-hidden flex items-center justify-center">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=nodo360:cuartel:${data.id}`} alt="QR" className="w-full h-full" />
            </div>
            <a
              href={`/cuartel/${data.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="nodo-on-color flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold transition-colors whitespace-nowrap shadow-sm"
            >
              <Siren className="w-3 h-3" />
              Perfil Público
            </a>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 flex flex-col xl:flex-row gap-4 min-h-0 relative z-0 overflow-hidden">
        
        {/* LEFT COLUMN */}
        <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-2 pb-10">
          
          {/* SEARCH & FILTERS */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="flex-1 bg-white border border-slate-200 rounded-xl p-1.5 flex items-center shadow-sm">
              <Search className="w-5 h-5 text-slate-400 mx-3 shrink-0" />
              <input 
                ref={searchRef}
                data-station-pad
                value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && search.trim() && !isNaN(Number(search))) {
                    onToggleByNumber?.(undefined, Number(search));
                    setSearch(''); // clear search after toggle
                  }
                }}
                placeholder="Buscar por N° de bombero o nombre" 
                className="flex-1 bg-transparent border-none text-sm font-medium placeholder-slate-400 focus:outline-none py-2"
              />
              <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />
              <div className="hidden sm:flex gap-2 pr-1">
                <button 
                  onClick={() => setFilterState(f => f === 'available' ? 'all' : 'available')}
                  className={`px-4 py-2 text-xs font-bold border rounded-lg flex items-center gap-1.5 transition-colors ${filterState === 'available' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Disponible
                </button>
                <button 
                  onClick={() => setFilterState(f => f === 'unavailable' ? 'all' : 'unavailable')}
                  className={`px-4 py-2 text-xs font-bold border rounded-lg flex items-center gap-1.5 transition-colors ${filterState === 'unavailable' ? 'bg-red-500 text-white border-red-600' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}>
                  <XCircle className="w-3.5 h-3.5" /> No disponible
                </button>
              </div>
            </div>
            <button 
              onClick={() => { setSearch(''); setFilterState('all'); }}
              className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4" /> Todos
            </button>
          </div>

          {/* BOMBEROS */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-semibold uppercase text-slate-800">Bomberos en cuartel</h2>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{bomberosDisp} disponibles</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
              {filteredBomberos.map(m => {
                const isAvail = m.stationAvailable;
                const isBusy = togglingId === m.id;
                const enServicio = onEmergency && isAvail;
                
                return (
                  <button 
                    key={m.id} 
                    onClick={() => onToggleMember(m)}
                    disabled={isBusy}
                    className={`w-36 shrink-0 relative bg-white border rounded-xl p-3 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center ${isBusy ? 'opacity-50' : ''} ${isAvail ? 'border-emerald-200 hover:border-emerald-400' : 'border-slate-100 hover:border-slate-300'}`}>
                    
                    {enServicio ? (
                      <span className="absolute top-2 left-2 bg-red-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-red-700 animate-pulse">En emergencia</span>
                    ) : isAvail ? (
                      <span className="absolute top-2 left-2 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-emerald-200">Disponible</span>
                    ) : m.supportCompanyName ? (
                      <span className="absolute top-2 left-2 bg-purple-100 text-purple-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-purple-200">Apoyo a {m.supportCompanyName.replace('Compañía de Bomberos de Parral', 'Cía')}</span>
                    ) : (
                      <span className="absolute top-2 left-2 bg-slate-100 text-slate-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-slate-200">No Disp.</span>
                    )}

                    {m.supportCompanyId === data.id && (
                      <span className="absolute top-2 right-2 bg-purple-100 text-purple-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-purple-200 shadow-sm z-10">Apoyo</span>
                    )}
                    
                    <div className="relative mt-6 mb-3">
                      <div className={`w-16 h-16 rounded-full overflow-hidden border-2 shadow-inner ${isAvail ? 'border-emerald-100' : 'border-slate-100 grayscale'}`}>
                        {m.photoUrl ? <img src={m.photoUrl} className="w-full h-full object-cover" alt={m.firstName} /> : <div className="w-full h-full bg-slate-200" />}
                      </div>
                      {m.operativeNumber && (
                        <div className="operative-num absolute -bottom-1 -right-1 bg-slate-800 text-[9px] font-semibold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10" style={{ color: '#ffffff' }}>
                          {m.operativeNumber}
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-1">{m.firstName} {m.lastName}</p>
                    <div className="mt-1">
                      <RoleBadge role={m.role} size="sm" contrast />
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isAvail ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span className="text-[9px] font-semibold text-slate-500">{isAvail ? 'En cuartel' : 'Fuera'}</span>
                    </div>
                  </button>
                );
              })}
              {filteredBomberos.length === 0 && (
                <div className="w-full py-8 flex flex-col items-center justify-center text-slate-400">
                  <Users className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm font-medium">No hay bomberos en la compañía que coincidan con la búsqueda</p>
                  {search && !isNaN(Number(search)) && onToggleByNumber && (
                    <div className="mt-4 w-full flex justify-center">
                      {isSearchingGlobal ? (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Loader2 className="w-4 h-4 animate-spin" /> Buscando bombero N° {search}...
                        </div>
                      ) : globalSearchResult ? (
                        <div className="flex flex-col items-center max-w-xs w-full">
                          <p className="text-xs text-slate-500 mb-3 text-center">¿Hacer guardia de apoyo en esta compañía?</p>
                          <button 
                            key={globalSearchResult.id} 
                            onClick={() => {
                              onToggleByNumber(true, Number(search));
                              setSearch('');
                            }}
                            disabled={togglingId === `op-${search}`}
                            className={`w-40 relative bg-white border border-purple-200 p-4 rounded-xl shadow-md hover:shadow-lg hover:border-purple-400 transition-all flex flex-col items-center text-center ${togglingId === `op-${search}` ? 'opacity-50' : ''}`}
                          >
                            <span className="absolute top-2 right-2 bg-purple-100 text-purple-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border border-purple-200 shadow-sm z-10">
                              Apoyo
                            </span>
                            
                            <div className="relative mt-4 mb-3">
                              <div className="w-20 h-20 rounded-full overflow-hidden border-2 shadow-inner border-purple-100 bg-slate-200">
                                {globalSearchResult.photoUrl ? (
                                  <img src={globalSearchResult.photoUrl} className="w-full h-full object-cover" alt={globalSearchResult.firstName} />
                                ) : null}
                              </div>
                              <div className="operative-num absolute -bottom-1 -right-1 bg-slate-800 text-[10px] font-semibold w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10" style={{ color: '#ffffff' }}>
                                {globalSearchResult.operativeNumber}
                              </div>
                            </div>
                            <p className="text-sm font-bold text-slate-800 leading-tight line-clamp-1">{globalSearchResult.firstName} {globalSearchResult.lastName}</p>
                            <p className="text-[10px] font-bold text-purple-600 mt-0.5 capitalize bg-purple-50 px-2 py-0.5 rounded text-center">{globalSearchResult.roleLabel}</p>
                            
                            <div className="mt-4 bg-slate-800 text-white w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Disponible
                            </div>
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 text-center max-w-sm text-xs text-slate-500">
                          No se encontró ningún bombero activo con el N° {search}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* MAQUINISTAS */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Siren className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-semibold uppercase text-slate-800">Maquinistas</h2>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{maqDisp} disponibles</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
              {filteredMaquinistas.map(m => {
                const isAvail = m.maquinistaAvailable;
                const isBusy = togglingId === m.id;
                
                return (
                  <button 
                    key={m.id} 
                    onClick={() => onToggleMaquinista(m)}
                    disabled={isBusy}
                    className={`w-64 shrink-0 text-left border rounded-xl p-3 flex gap-3 items-center hover:shadow-md transition-all ${isBusy ? 'opacity-50' : ''} ${isAvail ? 'bg-red-50/30 border-red-100 hover:border-red-300' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                    <div className="relative shrink-0">
                      <div className={`w-14 h-14 rounded-xl overflow-hidden border-2 shadow-sm bg-slate-200 ${isAvail ? 'border-white' : 'border-slate-100 grayscale'}`}>
                        {m.photoUrl && <img src={m.photoUrl} className="w-full h-full object-cover" alt={m.firstName} />}
                      </div>
                      {(m as any).operativeNumber && (
                        <div className="operative-num absolute -bottom-1 -right-1 bg-slate-800 text-[8px] font-semibold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10" style={{ color: '#ffffff' }}>
                          {(m as any).operativeNumber}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{m.firstName} {m.lastName}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{m.roleLabel || 'Maquinista'}</p>
                      {isAvail ? (
                        <span className="inline-block mt-1 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-emerald-200">Disponible</span>
                      ) : (
                        <span className="inline-block mt-1 bg-slate-100 text-slate-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-slate-200">No Disp.</span>
                      )}
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${isAvail ? 'bg-red-100 border-red-200 text-red-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      <Siren className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
              {filteredMaquinistas.length === 0 && (
                <p className="text-sm text-slate-400 py-4 font-medium italic">Ningún maquinista coincide con el filtro.</p>
              )}
            </div>
          </div>

          {/* MATERIAL MAYOR */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col flex-1 min-h-[220px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-semibold uppercase text-slate-800">Material Mayor</h2>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{carrosOp} operativos de {data.fleet.stats.total}</span>
              </div>
              <button className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">Ver todos <ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
              {data.fleet.vehicles.map(v => (
                <div key={v.id} className="w-64 shrink-0 bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm flex flex-col group hover:shadow-md transition-shadow">
                  <FleetPhoto imageUrl={v.imageUrl} label={`${v.patent} ${v.type}`} nodo={inkDark} />
                  <div className="p-4 border-t border-slate-50 flex-1 flex flex-col">
                    <h3 className="text-sm font-semibold text-slate-800 leading-tight">{v.patent} {v.type}</h3>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 mb-3">{v.brand} {v.model}</p>
                    
                    <div className="mt-auto flex items-center justify-between">
                      {v.status === 'OPERATIVO' ? (
                        <span className="bg-emerald-100 text-emerald-700 text-[9px] font-semibold uppercase px-2 py-1 rounded-md border border-emerald-200">Operativo</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-semibold uppercase px-2 py-1 rounded-md border border-slate-200">{v.statusLabel}</span>
                      )}
                      {v.status === 'OPERATIVO' && (
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[9px] font-bold text-emerald-600">100% disponible</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>

        {/* RIGHT COLUMN */}
        <div className="w-full xl:w-[380px] flex flex-col gap-4 shrink-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-2 pb-10">
          
          {/* ÚLTIMAS EMERGENCIAS */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <button type="button" className="flex items-center gap-2 text-left" onClick={() => setEmergencyOpen('all')}>
                <Siren className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-semibold uppercase text-slate-800">Últimas emergencias</h2>
              </button>
              <button type="button" onClick={() => setEmergencyOpen('all')} className="text-xs font-bold text-blue-600 hover:underline">Ver todas</button>
            </div>
            
            <div className="w-full h-40 rounded-xl mb-4 overflow-hidden relative border border-slate-200">
              <PublicOsmMap
                theme={night || inkDark ? 'dark' : 'light'}
                center={PARRAL_CENTER}
                zoom={14}
                markers={data.recentEmergencies
                  .filter((e) => e.latitude && e.longitude)
                  .map((e) => ({
                    id: e.id,
                    lat: e.latitude,
                    lng: e.longitude,
                    active: !e.closedAt,
                    label: `<strong>${e.type}</strong><br/>${e.address || ''}`,
                  }))}
                className="h-full w-full"
              />
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-2 space-y-4">
              {data.recentEmergencies.slice(0, 5).map(inc => {
                 const t = new Date(inc.dispatchedAt);
                 const h = t.getHours().toString().padStart(2, '0');
                 const m = t.getMinutes().toString().padStart(2, '0');
                 const isOpen = !inc.closedAt;
                 
                 return (
                   <button
                     key={inc.id}
                     type="button"
                     onClick={() => setEmergencyOpen(inc)}
                     className={`w-full text-left relative pl-3 border-l-2 border-slate-200 pb-2 last:pb-0 rounded-r-lg ${chrome.hover}`}
                   >
                     <div className="absolute w-2.5 h-2.5 rounded-full bg-slate-200 -left-[5px] top-1" />
                     <div className="flex justify-between items-start mb-1">
                       <div className="flex gap-2 items-baseline">
                         <span className={`text-xs font-bold ${isOpen ? 'text-red-600' : 'text-slate-600'}`}>{h}:{m}</span>
                         <span className="text-sm font-bold text-slate-800">{inc.type}</span>
                       </div>
                       {isOpen && <span className="text-[8px] font-semibold uppercase text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">EN CAMINO</span>}
                     </div>
                     <p className="text-[11px] text-slate-500 mb-2 truncate">{inc.address || 'Sin dirección'}</p>
                     
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                         {inc.vehicles && inc.vehicles.length > 0 && (
                           <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><Truck className="w-3 h-3" /> {inc.vehicles.map(v => v.patent).join(', ')}</span>
                         )}
                         <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><Users className="w-3 h-3" /> {inc.participants?.length || 0} vols</span>
                       </div>
                       <span className="text-[9px] font-semibold text-red-600 border border-red-200 px-2 py-1 rounded bg-red-50">Ver resumen</span>
                     </div>
                   </button>
                 );
              })}
              {data.recentEmergencies.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">Sin emergencias recientes</p>
              )}
            </div>
            
            <button type="button" onClick={() => setEmergencyOpen('all')} className="w-full mt-4 py-2 border-t border-slate-100 text-xs font-bold text-blue-600 hover:bg-slate-50 flex items-center justify-center gap-1 rounded-b-2xl">
              Ver todas las emergencias <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
              <button type="button" className="flex items-center gap-2 text-left" onClick={() => setNoveltyOpen('all')}>
                <Calendar className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-semibold uppercase text-slate-800">Novedades y anuncios</h2>
              </button>
              <button type="button" onClick={() => setNoveltyOpen('all')} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                Ver todas <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            <div className="space-y-4">
              {NOVEDADES.map((item) => {
                const tone = noveltyTones[item.tone];
                const Icon = item.tone === 'red' ? Siren : item.tone === 'amber' ? Truck : Clock;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNoveltyOpen(item)}
                    className={`w-full flex gap-3 items-start text-left rounded-xl p-1 -mx-1 transition-colors ${chrome.hover}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tone.iconBg} ${tone.icon}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className={`text-xs font-semibold leading-tight ${chrome.text}`}>{item.title}</p>
                        <span className={`text-[9px] shrink-0 ${chrome.muted}`}>{item.when}</span>
                      </div>
                      <p className={`text-[10px] mt-0.5 mb-1.5 ${chrome.muted}`}>{item.summary}</p>
                      <span className={`text-[8px] font-semibold uppercase border px-2 py-0.5 rounded-full ${tone.badge}`}>{item.category}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
        </div>
      </div>
      
      {noveltyOpen && (
        <div
          className={`sala-dark-modal fixed inset-0 z-[80] flex items-center justify-center p-4 ${inkDark ? 'bg-black/65' : 'bg-slate-900/50'} backdrop-blur-[2px]`}
          onClick={() => setNoveltyOpen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${inkDark ? `${chrome.card} border ${chrome.border}` : 'bg-white border border-slate-200'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-5 py-4 border-b ${inkDark ? chrome.border : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-500" />
                <h3 className={`text-sm font-semibold uppercase ${inkDark ? chrome.text : 'text-slate-800'}`}>
                  {noveltyOpen === 'all' ? 'Novedades y anuncios' : 'Novedad'}
                </h3>
              </div>
              <button type="button" onClick={() => setNoveltyOpen(null)} className={`p-1.5 rounded-lg ${inkDark ? `${chrome.hover} ${chrome.muted}` : 'hover:bg-slate-100 text-slate-500'}`} aria-label="Cerrar">
                <X className="w-4 h-4" />
              </button>
            </div>

            {noveltyOpen === 'all' ? (
              <div className="p-3 max-h-[70vh] overflow-y-auto space-y-2">
                {NOVEDADES.map((item) => {
                  const tone = noveltyTones[item.tone];
                  const Icon = item.tone === 'red' ? Siren : item.tone === 'amber' ? Truck : Clock;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNoveltyOpen(item)}
                      className={`w-full flex gap-3 items-start text-left rounded-xl p-3 border ${inkDark ? `${chrome.hover} ${chrome.border}` : 'hover:bg-slate-50 border-slate-100'}`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tone.iconBg} ${tone.icon}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <p className={`text-sm font-semibold ${inkDark ? chrome.text : 'text-slate-800'}`}>{item.title}</p>
                          <span className={`text-[10px] shrink-0 ${inkDark ? chrome.muted : 'text-slate-400'}`}>{item.when}</span>
                        </div>
                        <p className={`text-xs mt-0.5 ${inkDark ? chrome.muted : 'text-slate-500'}`}>{item.summary}</p>
                        <span className={`inline-block mt-2 text-[9px] font-semibold uppercase border px-2 py-0.5 rounded-full ${tone.badge}`}>{item.category}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <span className={`inline-flex text-[10px] font-semibold uppercase border px-2.5 py-1 rounded-full ${noveltyTones[noveltyOpen.tone].badge}`}>
                  {noveltyOpen.category}
                </span>
                <h4 className={`text-lg font-semibold leading-snug ${inkDark ? chrome.text : 'text-slate-900'}`}>{noveltyOpen.title}</h4>
                <div className={`flex flex-wrap gap-3 text-xs ${inkDark ? chrome.muted : 'text-slate-600'}`}>
                  <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{noveltyOpen.datetime}</span>
                  {noveltyOpen.place && (
                    <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{noveltyOpen.place}</span>
                  )}
                </div>
                <p className={`text-sm leading-relaxed ${inkDark ? chrome.body : 'text-slate-700'}`}>{noveltyOpen.body}</p>
                <button
                  type="button"
                  onClick={() => setNoveltyOpen(null)}
                  className={`w-full mt-2 py-2.5 rounded-xl text-sm font-semibold ${chrome.close}`}
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <PublicEmergencySummaryModal
        open={emergencyOpen}
        emergencies={data.recentEmergencies}
        onClose={() => setEmergencyOpen(null)}
        onSelect={setEmergencyOpen}
        dark={Boolean(night || inkDark)}
      />

      {/* FOOTER */}
      <footer className="shrink-0 text-center text-[10px] font-medium text-slate-400 pt-3 border-t border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5" /> Comprometidos con tu seguridad, siempre preparados para servir.
        </div>
        <div>
          <span className="font-bold text-slate-600">NODO360</span> Plataforma de gestión bomberil
        </div>
        <div>
          Un proyecto de <span className="font-bold text-slate-800 text-xs">kodesk.cl</span>
        </div>
      </footer>
    </div>
  );
}
