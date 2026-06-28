import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';
import {
  Siren, LogOut, Settings, Volume2, VolumeX, Building2,
  Truck, Fuel, AlertTriangle, Users, MapPin, Search, ChevronDown, Radio, CheckCircle2,
  Sun, Moon, Droplets
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { isCentralOperator } from '../lib/roleAccess';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { COMPANIAS360 } from '../lib/companias360';

const incidentIcon = L.divIcon({
  className: '',
  html: `<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function CentralGlobalPage() {
  const { user } = useAuthStore();
  const isOperator = isCentralOperator(user?.role);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';
  const tileUrl = isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [now, setNow] = useState(new Date());
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [memberSearch, setMemberSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState<'ALL'|'DISP'|'CAMINO'|'FUERA'>('ALL');

  const load = async () => {
    try {
      const res = await api.get('/dispatch/central/global');
      setData(res.data);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar la central global');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const int = setInterval(load, 5000); // Polling cada 5 segundos
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    const clockInt = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clockInt);
  }, []);

  const handleToggleAvailability = async (member: any) => {
    const slug = member.dispatchSlug || COMPANIAS360.find((c) => c.number === member.companyNumber)?.slug;
    if (!slug) {
      toast.error('No se pudo determinar el cuartel de este bombero');
      return;
    }
    const nextStatus = !member.stationAvailable;
    
    // Optimistic update
    setData((prev: any) => {
      if (!prev) return prev;
      const n = { ...prev, companies: [...prev.companies] };
      const cIdx = n.companies.findIndex((c:any) => c.id === member.companyId);
      if (cIdx > -1) {
         n.companies[cIdx] = { ...n.companies[cIdx], roster: { ...n.companies[cIdx].roster, members: [...n.companies[cIdx].roster.members] } };
         const mIdx = n.companies[cIdx].roster.members.findIndex((m:any) => m.id === member.id);
         if (mIdx > -1) n.companies[cIdx].roster.members[mIdx].stationAvailable = nextStatus;
      }
      return n;
    });

    try {
      await api.patch(`/dispatch/public/${slug}/availability`, {
        userId: member.id,
        available: nextStatus,
      });
      toast.success(`${member.firstName} ${member.lastName} ahora está ${nextStatus ? 'Disponible' : 'No disponible'}`);
      load();
    } catch (e) {
      toast.error('Error al cambiar disponibilidad');
      load();
    }
  };

  // Consolidar personal
  const allMembers = useMemo(() => {
    if (!data) return [];
    return data.companies.flatMap((c: any) => 
      c.roster.members.map((m: any) => ({ ...m, companyId: c.id, companyName: c.name, companyNumber: c.number, dispatchSlug: c.dispatchSlug }))
    );
  }, [data]);

  const filteredMembers = useMemo(() => {
    let m = allMembers;
    if (selectedCompanyId !== 'ALL') {
      const targetCompany = data.companies.find((c:any) => c.id === selectedCompanyId);
      if (targetCompany) {
        m = targetCompany.roster.members.map((x:any)=>({
          ...x, 
          companyId: targetCompany.id, 
          companyName: targetCompany.name, 
          companyNumber: targetCompany.number, 
          dispatchSlug: targetCompany.dispatchSlug
        }));
      } else m = [];
    }
    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      m = m.filter((x:any) => 
        x.fullName.toLowerCase().includes(q) || 
        String(x.operativeNumber).includes(q)
      );
    }
    // Ordenar disponibles primero, luego en emergencia, luego no disponibles
    return m.sort((a:any, b:any) => {
      if (a.stationAvailable && !b.stationAvailable) return -1;
      if (!a.stationAvailable && b.stationAvailable) return 1;
      return 0;
    });
  }, [allMembers, selectedCompanyId, memberSearch, data]);

  // Consolidar carros
  const allVehicles = useMemo(() => {
    if (!data) return [];
    return data.companies.flatMap((c: any) => 
      c.fleet.vehicles.map((v: any) => ({ ...v, companyName: c.name }))
    );
  }, [data]);

  const filteredVehicles = useMemo(() => {
    let v = allVehicles;
    if (selectedCompanyId !== 'ALL') {
      v = data.companies.find((c:any) => c.id === selectedCompanyId)?.fleet.vehicles.map((x:any)=>({...x, companyName: data.companies.find((c:any)=>c.id===selectedCompanyId).name})) || [];
    }
    if (vehicleFilter === 'DISP') v = v.filter((x:any) => x.status === 'OPERATIVO');
    // Si tuvieramos estado EN CAMINO se filtraría acá
    if (vehicleFilter === 'FUERA') v = v.filter((x:any) => x.status !== 'OPERATIVO');
    return v;
  }, [allVehicles, selectedCompanyId, vehicleFilter, data]);

  // Estadísticas globales
  const globalStats = useMemo(() => {
    if (!data) return { disp: 0, emerg: 0, noDisp: 0, total: 0 };
    return data.companies.reduce((acc: any, c: any) => {
      acc.disp += c.roster.stats.available;
      acc.noDisp += c.roster.stats.unavailable;
      acc.total += c.roster.stats.total;
      return acc;
    }, { disp: 0, emerg: 0, noDisp: 0, total: 0 });
  }, [data]);

  if (loading) return <div className="h-screen bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white flex items-center justify-center">Cargando central...</div>;

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-[#0b1120] text-slate-700 dark:text-slate-300 font-sans overflow-hidden">
      
      {/* HEADER TOP - Ocultar si el usuario es operador, ya que usa el CentralOperatorBar */}
      {!isOperator && (
        <header className="shrink-0 h-[72px] border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-600 border border-red-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.3)]">
            <Siren className="w-5 h-5 text-slate-900 dark:text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">CENTRAL GLOBAL</h1>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Vista general de todos los cuarteles</p>
          </div>
        </div>

        {/* STATS HEADER */}
        <div className="hidden xl:flex items-center gap-2">
          <div className="px-5 py-2 bg-slate-100 dark:bg-[#1e293b]/50 border border-slate-300 dark:border-slate-700/50 rounded-xl flex items-center gap-4">
            <div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">Bomberos disponibles</p>
              <p className="text-xl font-black text-emerald-400">{globalStats.disp}</p>
            </div>
          </div>
          <div className="px-5 py-2 bg-slate-100 dark:bg-[#1e293b]/50 border border-slate-300 dark:border-slate-700/50 rounded-xl flex items-center gap-4">
            <div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">En emergencia</p>
              <p className="text-xl font-black text-red-500">0</p>
            </div>
          </div>
          <div className="px-5 py-2 bg-slate-100 dark:bg-[#1e293b]/50 border border-slate-300 dark:border-slate-700/50 rounded-xl flex items-center gap-4">
            <div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">No disponibles</p>
              <p className="text-xl font-black text-slate-500">{globalStats.noDisp}</p>
            </div>
          </div>
          <div className="px-5 py-2 bg-blue-900/20 border border-blue-500/20 rounded-xl flex items-center gap-4">
            <div>
              <p className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">Total bomberos</p>
              <p className="text-xl font-black text-blue-400">{globalStats.total}</p>
            </div>
          </div>
        </div>

        {/* RIGHT CONTROLS */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-300 dark:border-slate-700">
            <Link to="/operational-map" title="Mapa Operacional" className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <MapPin className="w-4 h-4" />
            </Link>
            <Link to="/hydrants" title="Hidrantes y Red de Agua" className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <Droplets className="w-4 h-4" />
            </Link>
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-xl font-mono font-bold text-slate-900 dark:text-white tabular-nums leading-none">
              {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 capitalize mt-1">
              {now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="w-px h-8 bg-slate-300 dark:bg-slate-800 mx-2 hidden sm:block" />
          
          <button onClick={() => setAudioEnabled(!audioEnabled)} className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center gap-2 ${audioEnabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">Sonido</span>
          </button>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Alternar tema"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
            <Settings className="w-4 h-4" />
          </button>
            <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors border border-red-500">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Salir</span>
            </Link>
          </div>
        </header>
      )}

      {/* MAIN CONTENT 3 COLS */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        
        {/* LEFT COL: COMPAÑÍAS */}
        <div className="w-[280px] shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#0f172a]/50">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" /> COMPAÑÍAS
            </p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
            {data?.companies.map((c: any) => (
              <button 
                key={c.id}
                onClick={() => setSelectedCompanyId(c.id === selectedCompanyId ? 'ALL' : c.id)}
                className={`p-3 rounded-xl border text-left transition-colors flex items-center gap-3 ${selectedCompanyId === c.id ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-100 dark:bg-[#1e293b]/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:bg-[#1e293b]/80'}`}
              >
                <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-700 overflow-hidden p-1">
                  {c.logoUrl ? <img src={c.logoUrl} className="w-full h-full object-contain" /> : <Building2 className="w-5 h-5 text-slate-500"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${selectedCompanyId === c.id ? 'text-blue-400' : 'text-slate-900 dark:text-white'}`}>{c.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{c.city}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="flex items-center gap-1 text-[9px] font-medium text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> {c.roster.stats.available}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-medium text-red-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> 0
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-medium text-slate-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span> {c.roster.stats.unavailable}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50 dark:bg-[#0b1120]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> TOTAL GENERAL
            </p>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div>
                <p className="text-xl font-black text-emerald-400">{globalStats.disp}</p>
                <p className="text-[9px] text-slate-500 uppercase">Disponibles</p>
              </div>
              <div>
                <p className="text-xl font-black text-red-500">0</p>
                <p className="text-[9px] text-slate-500 uppercase">En emergencia</p>
              </div>
              <div>
                <p className="text-xl font-black text-slate-600 dark:text-slate-400">{globalStats.noDisp}</p>
                <p className="text-[9px] text-slate-500 uppercase">No disponibles</p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
              <p className="text-2xl font-black text-blue-500">{globalStats.total}</p>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase font-bold">Total</p>
            </div>
          </div>
        </div>

        {/* MIDDLE COL: BOMBEROS & CARROS */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0f172a]/20">
          
          {/* PERSONAL */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-slate-200 dark:border-slate-800">
            <div className="shrink-0 p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-6">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                  <Users className="w-4 h-4" /> PERSONAL DISPONIBLE
                </h2>
                <div className="flex items-center gap-4 text-[10px] font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Disponible</span>
                  <span className="flex items-center gap-1.5 text-red-500"><span className="w-2 h-2 rounded-full bg-red-500"></span> En emergencia</span>
                  <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-full bg-slate-500"></span> No disponible</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Buscar por N° o nombre..."
                    className="w-full bg-slate-100 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <select 
                  value={selectedCompanyId} 
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="bg-slate-100 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-3 py-2 focus:outline-none appearance-none"
                >
                  <option value="ALL">Todos los cuarteles</option>
                  {data?.companies.map((c:any)=>(<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                {filteredMembers.map((m: any) => (
                  <div key={m.id} className={`rounded-xl border p-2 flex flex-col items-center text-center transition-colors hover:bg-white/5 ${m.stationAvailable ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]'}`}>
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 mb-2 relative bg-slate-200 dark:bg-slate-800">
                      {m.photoUrl ? <img src={m.photoUrl} className={`w-full h-full object-cover ${!m.stationAvailable ? 'grayscale opacity-60' : ''}`} /> : <Users className="w-6 h-6 text-slate-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/>}
                    </div>
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight mb-0.5 w-full truncate">
                      {m.operativeNumber ? <span className="text-amber-400 mr-1">{m.operativeNumber}</span> : null}
                      {m.firstName} {m.lastName}
                    </p>
                    <p className="text-[9px] text-slate-500 w-full truncate">{m.companyName}</p>
                    <button 
                      onClick={() => handleToggleAvailability(m)}
                      className={`mt-1.5 px-2 py-1 rounded w-full flex items-center justify-center gap-1 text-[9px] font-bold transition-colors border ${m.stationAvailable ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-700'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${m.stationAvailable ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                      {m.stationAvailable ? 'Disponible' : 'Marcar Disp.'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CARROS */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="shrink-0 p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                <Truck className="w-4 h-4" /> CARROS OPERATIVOS
              </h2>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedCompanyId} 
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="bg-slate-100 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none appearance-none"
                >
                  <option value="ALL">Todos los cuarteles</option>
                  {data?.companies.map((c:any)=>(<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                <div className="flex bg-slate-100 dark:bg-[#1e293b] rounded-lg p-0.5 border border-slate-300 dark:border-slate-700">
                  <button onClick={() => setVehicleFilter('ALL')} className={`px-3 py-1 text-[10px] font-bold rounded-md ${vehicleFilter === 'ALL' ? 'bg-blue-600 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>Todos</button>
                  <button onClick={() => setVehicleFilter('DISP')} className={`px-3 py-1 text-[10px] font-bold rounded-md ${vehicleFilter === 'DISP' ? 'bg-emerald-600 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>Disponibles</button>
                  <button onClick={() => setVehicleFilter('CAMINO')} className={`px-3 py-1 text-[10px] font-bold rounded-md ${vehicleFilter === 'CAMINO' ? 'bg-amber-600 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>En camino</button>
                  <button onClick={() => setVehicleFilter('FUERA')} className={`px-3 py-1 text-[10px] font-bold rounded-md ${vehicleFilter === 'FUERA' ? 'bg-slate-600 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>Fuera de servicio</button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
                {filteredVehicles.map((v: any) => (
                  <div key={v.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col overflow-hidden relative">
                    <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-slate-900 dark:text-white">
                      Disponible
                    </div>
                    <div className="h-24 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 relative">
                      {v.imageUrl ? <img src={v.imageUrl} className="h-full object-contain drop-shadow-xl" /> : <Truck className="w-10 h-10 text-slate-700" />}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-black text-slate-900 dark:text-white">{v.patent} <span className="font-normal text-slate-600 dark:text-slate-400 ml-1">{v.type}</span></p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{v.companyName}</p>
                      <div className="flex items-center justify-between mt-3 text-[10px] font-bold">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><Users className="w-3 h-3" /> 4</span>
                        <span className="flex items-center gap-1 text-emerald-400"><Fuel className="w-3 h-3" /> {v.fuelLevelPercent}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Stats Carros Footer */}
            <div className="shrink-0 p-3 bg-slate-50 dark:bg-[#0b1120] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-6">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase">Total carros</p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{allVehicles.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase">Disponibles</p>
                  <p className="text-lg font-black text-emerald-400">{allVehicles.filter((v:any)=>v.status==='OPERATIVO').length}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase">En camino</p>
                  <p className="text-lg font-black text-amber-500">0</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase">En mantenimiento</p>
                  <p className="text-lg font-black text-orange-500">{allVehicles.filter((v:any)=>v.status==='EN_REPARACION').length}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase">Fuera de servicio</p>
                  <p className="text-lg font-black text-slate-500">{allVehicles.filter((v:any)=>v.status==='FUERA_DE_SERVICIO').length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-100 dark:bg-[#1e293b]/50 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700/50">
                <Fuel className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-[9px] text-slate-600 dark:text-slate-400 uppercase font-bold">Combustible prom.</p>
                  <p className="text-sm font-black text-blue-400 leading-none mt-0.5">87%</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COL: EMERGENCIAS */}
        <div className="w-[360px] shrink-0 border-l border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#0f172a]/80">
          <div className="flex-1 flex flex-col min-h-0 border-b border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                <Siren className="w-4 h-4" /> EMERGENCIAS ACTIVAS
              </p>
              <button className="text-[10px] font-bold text-blue-400 hover:text-blue-300">Ver todas</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-2">
              {data?.activeEmergencies.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                  <CheckCircle2 className="w-10 h-10 mb-2 opacity-20" />
                  Sin emergencias activas
                </div>
              ) : data?.activeEmergencies.map((e: any) => (
                <div key={e.id} className="p-3 rounded-xl border border-red-500/30 bg-red-950/20 flex gap-3">
                  <div className="px-2 h-7 rounded bg-red-600 flex items-center justify-center text-[10px] font-black text-slate-900 dark:text-white shrink-0 shadow-[0_0_10px_rgba(220,38,38,0.3)]">
                    {e.code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{e.type}</p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5"><MapPin className="w-2.5 h-2.5" />{e.address}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase mb-1">En camino</div>
                    <p className="text-[9px] text-slate-500 font-bold">hace 3 min</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="h-[280px] shrink-0 flex flex-col relative">
            <div className="absolute top-0 inset-x-0 p-3 z-10 flex items-center justify-between pointer-events-none">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white drop-shadow-md flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" /> MAPA DE EMERGENCIAS
              </p>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-900 w-full relative z-0">
              <MapContainer
                center={[-36.1431, -71.8261]}
                zoom={13}
                className="h-full w-full"
                scrollWheelZoom={false}
                attributionControl={false}
              >
                <TileLayer url={tileUrl} />
                {data?.activeEmergencies.map((e:any) => e.latitude && e.longitude ? (
                  <Marker key={e.id} position={[e.latitude, e.longitude]} icon={incidentIcon} />
                ) : null)}
              </MapContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
