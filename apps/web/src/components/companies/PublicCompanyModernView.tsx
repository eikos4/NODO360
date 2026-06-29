import { useState, useEffect } from 'react';
import { 
  Users, UserCog, Truck, Siren, Search, Filter, CheckCircle2, XCircle, 
  ChevronRight, Calendar, Clock, MapPin, Plus, Loader2, Shield
} from 'lucide-react';
import { PublicCentral, RosterMember, MaquinistaMember, FleetVehicle } from '../../pages/DispatchPublicPage';
import { PublicEmergency } from '../dispatch/DispatchEmergenciesPanel';

interface Props {
  data: PublicCentral;
  onToggleMember: (m: RosterMember) => void;
  onToggleMaquinista: (m: MaquinistaMember) => void;
  togglingId?: string | null;
  onEmergency?: boolean;
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  
  return (
    <div className="text-right">
      <p className="text-2xl font-bold font-mono tracking-wider text-slate-800">
        {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} <span className="text-sm font-semibold uppercase">{now.getHours() >= 12 ? 'p. m.' : 'a. m.'}</span>
      </p>
      <p className="text-xs text-slate-500 font-medium capitalize flex items-center justify-end gap-1.5 mt-0.5">
        <Calendar className="w-3.5 h-3.5" />
        {now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
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
        <p className="text-2xl font-black text-slate-800 leading-none">{value}</p>
        <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`w-1.5 h-1.5 rounded-full ${isAlert ? 'bg-red-500' : 'bg-emerald-500'}`} />
          <p className="text-[10px] text-slate-400 font-medium">{subtext}</p>
        </div>
      </div>
    </div>
  );
}

export default function PublicCompanyModernView({ data, onToggleMember, onToggleMaquinista, togglingId, onEmergency }: Props) {
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'available' | 'unavailable'>('all');
  
  const bomberosDisp = data.roster.stats.available;
  const maqDisp = data.maquinistas.stats.available;
  const carrosOp = data.fleet.stats.operativo;
  const emergencias = data.emergencyStats.active;

  // Filtrado de bomberos
  const filteredBomberos = data.roster.members.filter(m => {
    const q = search.toLowerCase();
    const matchesSearch = m.fullName.toLowerCase().includes(q) || m.operativeNumber?.toString() === q;
    if (!matchesSearch) return false;
    
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
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-800 font-sans p-4 flex flex-col gap-4">
      
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 lg:px-6 border-b border-slate-200/60 rounded-2xl shadow-sm -mt-2 relative z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center ring-2 ring-white z-10"><span className="text-white text-xs font-black">N</span></div>
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center ring-2 ring-white"><span className="text-white text-xs font-black">3</span></div>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-800 leading-none">NODO360</p>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">SALA DE MÁQUINAS PÚBLICA</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-14 bg-slate-800 rounded-lg shrink-0 overflow-hidden flex items-center justify-center p-1 shadow-inner shadow-black/20">
              {data.logoUrl ? <img src={data.logoUrl} className="w-full h-full object-contain drop-shadow-md" alt="Logo" /> : <Shield className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black text-slate-800">{data.name}</h1>
              <p className="text-xs font-semibold text-slate-500 uppercase">Sala de Máquinas Pública</p>
            </div>
          </div>
        </div>
        <LiveClock />
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
          <div className="w-20 h-20 shrink-0 bg-slate-100 rounded-xl p-1 border border-slate-200 overflow-hidden flex items-center justify-center">
             <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=nodo360:cuartel:${data.id}`} alt="QR" className="w-full h-full mix-blend-multiply opacity-80" />
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
                value={search} onChange={e => setSearch(e.target.value)}
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
              <h2 className="text-sm font-black uppercase text-slate-800">Bomberos en cuartel</h2>
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
                    ) : (
                      <span className="absolute top-2 left-2 bg-slate-100 text-slate-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-slate-200">No Disp.</span>
                    )}
                    
                    <div className={`w-16 h-16 rounded-full overflow-hidden border-2 mt-6 mb-3 shadow-inner ${isAvail ? 'border-emerald-100' : 'border-slate-100 grayscale'}`}>
                      {m.photoUrl ? <img src={m.photoUrl} className="w-full h-full object-cover" alt={m.firstName} /> : <div className="w-full h-full bg-slate-200" />}
                    </div>
                    <p className="text-xs font-bold text-slate-800 leading-tight line-clamp-1">{m.firstName} {m.lastName}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{m.roleLabel || 'Bombero'}</p>
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
                  <p className="text-sm font-medium">No hay bomberos que coincidan con la búsqueda</p>
                </div>
              )}
            </div>
          </div>

          {/* MAQUINISTAS */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Siren className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-black uppercase text-slate-800">Maquinistas</h2>
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
                    <div className={`w-14 h-14 rounded-xl overflow-hidden border-2 shadow-sm shrink-0 bg-slate-200 ${isAvail ? 'border-white' : 'border-slate-100 grayscale'}`}>
                      {m.photoUrl && <img src={m.photoUrl} className="w-full h-full object-cover" alt={m.firstName} />}
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
                <h2 className="text-sm font-black uppercase text-slate-800">Material Mayor</h2>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{carrosOp} operativos de {data.fleet.stats.total}</span>
              </div>
              <button className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">Ver todos <ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
              {data.fleet.vehicles.map(v => (
                <div key={v.id} className="w-64 shrink-0 bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm flex flex-col group hover:shadow-md transition-shadow">
                  <div className="h-28 bg-slate-100 relative p-2 flex items-center justify-center">
                    {v.imageUrl ? <img src={v.imageUrl} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform" alt={v.patent} /> : <Truck className="w-10 h-10 text-slate-300" />}
                  </div>
                  <div className="p-4 border-t border-slate-50 flex-1 flex flex-col">
                    <h3 className="text-sm font-black text-slate-800 leading-tight">{v.patent} {v.type}</h3>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5 mb-3">{v.brand} {v.model}</p>
                    
                    <div className="mt-auto flex items-center justify-between">
                      {v.status === 'OPERATIVO' ? (
                        <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase px-2 py-1 rounded-md border border-emerald-200">Operativo</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase px-2 py-1 rounded-md border border-slate-200">{v.statusLabel}</span>
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
              <div className="flex items-center gap-2">
                <Siren className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-black uppercase text-slate-800">Últimas emergencias</h2>
              </div>
              <button className="text-xs font-bold text-blue-600 hover:underline">Ver todas</button>
            </div>
            
            <div className="w-full h-32 bg-slate-100 rounded-xl mb-4 overflow-hidden relative border border-slate-200">
               {/* Map placeholder */}
               <div className="absolute inset-0 bg-[url('https://api.maptiler.com/maps/streets-v2/static/auto/600x400.png?key=YQ47V0z8gGMB6b1T3i9k')] bg-cover bg-center opacity-60" />
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white animate-bounce">
                   <Siren className="w-5 h-5" />
                 </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-2 space-y-4">
              {data.recentEmergencies.slice(0, 5).map(inc => {
                 const t = new Date(inc.dispatchedAt);
                 const h = t.getHours().toString().padStart(2, '0');
                 const m = t.getMinutes().toString().padStart(2, '0');
                 const isOpen = !inc.closedAt;
                 
                 return (
                   <div key={inc.id} className="relative pl-3 border-l-2 border-slate-200 pb-2 last:pb-0">
                     <div className="absolute w-2.5 h-2.5 rounded-full bg-slate-200 -left-[5px] top-1" />
                     <div className="flex justify-between items-start mb-1">
                       <div className="flex gap-2 items-baseline">
                         <span className={`text-xs font-bold ${isOpen ? 'text-red-600' : 'text-slate-600'}`}>{h}:{m}</span>
                         <span className="text-sm font-bold text-slate-800">{inc.type}</span>
                       </div>
                       {isOpen && <span className="text-[8px] font-black uppercase text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">EN CAMINO</span>}
                     </div>
                     <p className="text-[11px] text-slate-500 mb-2 truncate">{inc.address || 'Sin dirección'}</p>
                     
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                         {inc.vehicles && inc.vehicles.length > 0 && (
                           <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><Truck className="w-3 h-3" /> {inc.vehicles.map(v => v.patent).join(', ')}</span>
                         )}
                         <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded"><Users className="w-3 h-3" /> {inc.participants?.length || 0} vols</span>
                       </div>
                       <button className="text-[9px] font-bold text-red-600 border border-red-200 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors">Ver detalles</button>
                     </div>
                   </div>
                 );
              })}
              {data.recentEmergencies.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">Sin emergencias recientes</p>
              )}
            </div>
            
            <button className="w-full mt-4 py-2 border-t border-slate-100 text-xs font-bold text-blue-600 hover:bg-slate-50 flex items-center justify-center gap-1 rounded-b-2xl">
              Ver todas las emergencias <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* NOVEDADES Y ANUNCIOS (MOCK) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-black uppercase text-slate-800">Novedades y anuncios</h2>
              </div>
              <button className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">Ver todas <ChevronRight className="w-3 h-3" /></button>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-500">
                  <Siren className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-slate-800 leading-tight">Entrenamiento RIT</p>
                    <span className="text-[9px] text-slate-400">Ayer</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 mb-1.5">Sábado 25 de mayo a las 09:00 hrs.</p>
                  <span className="text-[8px] font-black uppercase bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">Entrenamiento</span>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-500">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-slate-800 leading-tight">Mantención preventiva Carro B-1</p>
                    <span className="text-[9px] text-slate-400">Ayer</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 mb-1.5">Viernes 24 de mayo desde las 08:30 hrs.</p>
                  <span className="text-[8px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">Mantención</span>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-500">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-slate-800 leading-tight">Guardia nocturna</p>
                    <span className="text-[9px] text-slate-400">Ayer</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 mb-1.5">Turno desde el 24/05 20:00 al 25/05 08:00.</p>
                  <span className="text-[8px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">Guardia</span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
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
