import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Loader2,
  LogOut,
  Map,
  MapPin,
  Mic,
  MicOff,
  Moon,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  Square,
  Sun,
  Truck,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useQuickDispatch } from '../hooks/useQuickDispatch';
import { EMERGENCY_MAIN_TYPES } from '../lib/emergency-codes';
import DispatchMapPicker from '../components/map/DispatchMapPicker';
import DispatchVoiceConfigToggle from '../components/dispatch/DispatchVoiceConfigToggle';
import CompanyMaquinistaAlert from '../components/dispatch/CompanyMaquinistaAlert';
import { useAuthStore } from '../store/authStore';
import { useDespacho360Theme } from '../hooks/useDespacho360Theme';

function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={`font-mono text-sm tabular-nums ${className ?? ''}`}>
      {now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

export default function DespachoNodo360Page() {
  const d = useQuickDispatch();
  const { tokens: th, toggleTheme, isDark } = useDespacho360Theme();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [sideTab, setSideTab] = useState<'activas' | 'dotacion' | 'carros'>('activas');
  const [showConfig, setShowConfig] = useState(false);

  const crew = (d.live?.crew ?? []) as {
    id: string;
    firstName: string;
    lastName: string;
    rank?: string;
    status?: string;
  }[];
  const disponibles = crew.filter((c) => c.status === 'DISPONIBLE').length;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${th.shell}`}>
      <header className={`shrink-0 border-b px-4 py-3 flex items-center justify-between gap-4 ${th.shellHeader}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-900/40">
            <Radio className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h1 className={`text-lg font-bold tracking-tight truncate ${th.title}`}>
              Despacho <span className="text-red-500">NODO360</span>
            </h1>
            <p className={`text-xs truncate ${th.subtitle}`}>
              {d.company ? `${d.company.number}ª ${d.company.name}` : 'Central operativa'}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-6 text-sm">
          <div className={`flex items-center gap-2 ${th.subtitle}`}>
            <Clock className="h-4 w-4" />
            <LiveClock />
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-500" />
            <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{disponibles}</span>
            <span className={th.subtitle}>disp.</span>
          </div>
          <div className={`flex items-center gap-2 ${th.subtitle}`}>
            <Truck className={`h-4 w-4 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
            <span className={`font-semibold ${th.title}`}>{d.ciaVehicles.length}</span>
            <span>carros</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-lg border transition ${th.btnGhost}`}
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <nav className="hidden md:flex items-center gap-1 mr-2">
            {[
              { to: '/central-operativa', label: 'En vivo', icon: Radio },
              { to: '/operational-map', label: 'Mapa', icon: Map },
              { to: '/incidents', label: 'Emergencias', icon: ShieldAlert },
            ].map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition ${th.navLink}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => d.setVoiceEnabled(!d.voiceEnabled)}
            className={`p-2 rounded-lg border transition ${d.voiceEnabled ? th.btnGhostActive : th.btnGhost}`}
            title={d.voiceEnabled ? 'Voz asistente activada' : 'Voz asistente desactivada — habla la centralista'}
          >
            {d.voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setShowConfig((c) => !c)}
            className={`p-2 rounded-lg border transition ${showConfig ? (isDark ? 'border-sky-500/40 bg-sky-500/10 text-sky-400' : 'border-sky-300 bg-sky-50 text-sky-700') : th.btnGhost}`}
            title="Configuración"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => d.setMuted(!d.muted)}
            className={`p-2 rounded-lg border transition ${th.btnGhost}`}
            title="Silenciar sonidos"
          >
            {d.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          {d.publicUrl && (
            <a
              href={d.publicUrl}
              target="_blank"
              rel="noreferrer"
              className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition ${th.btnGhost}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Pública
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className={`p-2 rounded-lg border transition ${th.btnGhost} hover:text-red-500`}
            title="Salir"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {showConfig && (
        <div className={`shrink-0 border-b px-4 py-4 ${th.shellHeader}`}>
          <h2 className={`text-[11px] font-bold uppercase tracking-widest mb-3 ${th.cardTitle}`}>
            Configuración de despacho
          </h2>
          <DispatchVoiceConfigToggle enabled={d.voiceEnabled} onChange={d.setVoiceEnabled} isDark={isDark} />
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Panel izquierdo — despacho rápido */}
        <main className={`flex-1 flex flex-col min-h-0 overflow-y-auto p-4 lg:p-5 gap-4 ${!isDark ? 'bg-gradient-to-br from-white via-rose-50/20 to-sky-50/30' : ''}`}>
          {d.selectedCia && (
            <CompanyMaquinistaAlert
              company={d.company}
              availableCount={d.maquinistasAvailable}
              isDark={isDark}
            />
          )}

          {/* Claves de emergencia */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-xs font-semibold uppercase tracking-widest ${th.sectionLabel}`}>
                Claves de emergencia
              </h2>
              <span className={`text-[10px] font-mono ${th.hint}`}>0-9 atajos · Enter despachar</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
              {EMERGENCY_MAIN_TYPES.map((main) => {
                const childSel = main.subdivisions?.some((s) => s.id === d.selectedType);
                const active = d.selectedType === main.id || childSel;
                return (
                  <button
                    key={main.id}
                    type="button"
                    disabled={d.dispatching}
                    onClick={() => d.handleEmergencyTypeClick(main)}
                    className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 px-2 py-4 sm:py-5 min-h-[72px] sm:min-h-[88px] transition-all duration-150 ${
                      active ? th.emergencyKeyActive : th.emergencyKeyIdle
                    }`}
                  >
                    <span className={`text-2xl sm:text-3xl font-black font-mono ${active ? 'text-red-600' : (isDark ? th.title : 'text-slate-800')}`}>
                      {main.code}
                    </span>
                    <span className={`text-[10px] sm:text-xs mt-1 text-center leading-tight ${active ? (isDark ? 'text-red-200' : 'text-red-700') : th.subtitle}`}>
                      {main.label}
                    </span>
                    {main.subdivisions?.length ? (
                      <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-amber-400" title="Tiene subdivisiones" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {d.activeMainWithSubs?.subdivisions?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {d.activeMainWithSubs.subdivisions.map((sub) => {
                  const on = d.selectedType === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      disabled={d.dispatching}
                      onClick={() => d.handleSubdivisionClick(sub, d.activeMainWithSubs!)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                        on ? th.subKeyActive : th.subKeyIdle
                      }`}
                    >
                      {sub.code} — {sub.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>

          {/* Dirección + mapa */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className={`text-xs font-semibold uppercase tracking-widest ${th.sectionLabel}`}>
                Ubicación
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-slate-500' : 'text-red-400'}`} />
                  <input
                    value={d.address}
                    onChange={(e) => d.setAddress(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && d.searchAddress()}
                    placeholder="Dirección de la emergencia..."
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-1 ${th.inputShell}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={d.searchAddress}
                  disabled={d.geocoding}
                  className={`shrink-0 px-4 rounded-xl border transition ${th.btnGhost}`}
                >
                  {d.geocoding ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                </button>
              </div>
              {d.company?.address && (
                <button
                  type="button"
                  onClick={() => d.setAddress(d.company!.address!)}
                  className={`text-xs transition ${th.subtitle} hover:text-red-500`}
                >
                  Usar cuartel: {d.company.address}
                </button>
              )}
              <textarea
                value={d.notes}
                onChange={(e) => d.setNotes(e.target.value)}
                rows={2}
                placeholder="Notas adicionales (opcional)"
                className={`w-full px-4 py-2 rounded-xl border text-sm focus:outline-none resize-none ${th.inputShell}`}
              />
            </div>
            <div className={`rounded-xl overflow-hidden border min-h-[160px] ${th.borderSubtle}`}>
              <DispatchMapPicker
                center={d.mapCenter}
                latitude={d.latitude}
                longitude={d.longitude}
                pickActive
                onPick={d.onMapPick}
                height="180px"
                theme={th.mapTheme}
                showGpsPanel={false}
              />
            </div>
          </section>

          {/* Compañías + vehículos */}
          <section className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className={`text-[10px] font-semibold uppercase tracking-widest block mb-1 ${th.sectionLabel}`}>
                  Compañía principal
                </label>
                <select
                  value={d.selectedCia}
                  onChange={(e) => d.setSelectedCia(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-sm ${th.select}`}
                >
                  {(d.companies as { id: string; number: number; name: string }[]).map((c) => (
                    <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`text-[10px] font-semibold uppercase tracking-widest block mb-1 ${th.sectionLabel}`}>
                  Apoyo (opcional)
                </label>
                <select
                  value={d.secondaryCia}
                  onChange={(e) => d.setSecondaryCia(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 text-sm ${th.select}`}
                >
                  <option value="">— Sin apoyo —</option>
                  {(d.companies as { id: string; number: number; name: string }[])
                    .filter((c) => c.id !== d.selectedCia)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <h2 className={`text-xs font-semibold uppercase tracking-widest ${th.sectionLabel}`}>
                Material mayor (máx. 2 carros)
              </h2>
              <button
                type="button"
                onClick={d.selectAllVehicles}
                className={`text-xs px-2 py-1 rounded-md border transition ${
                  d.autoAllVehicles
                    ? isDark ? 'border-sky-500/50 bg-sky-500/10 text-sky-400' : 'border-sky-300 bg-sky-50 text-sky-700'
                    : th.btnGhost
                }`}
              >
                Máx. 2 carros
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {d.dispatchableVehicles.length === 0 ? (
                <p className="text-sm text-amber-500/80">Sin carros operativos</p>
              ) : (
                d.dispatchableVehicles.map((v) => {
                  const on = d.selectedVehicles.includes(v.id);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => d.toggleVehicle(v.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition ${
                        on
                          ? isDark
                            ? 'border-sky-500 bg-sky-500/15 text-sky-300'
                            : 'border-sky-500 bg-sky-50 text-sky-800 shadow-sm ring-1 ring-sky-200'
                          : th.emergencyKeyIdle
                      }`}
                    >
                      <Truck className="h-3.5 w-3.5" />
                      {v.patent}
                      {v.type && <span className="text-[10px] opacity-60">{v.type}</span>}
                    </button>
                  );
                })
              )}
            </div>
            <p className={`text-[10px] ${th.hint}`}>
              {d.selectedVehicles.length}/2 carros · {d.selectedCompanyIds.length} compañía(s)
            </p>
          </section>

          {/* Acción principal */}
          <section className={`sticky bottom-0 pt-2 pb-1 ${th.stickyGradient}`}>
            {d.emergType && (
              <div className={`mb-2 flex items-center gap-2 text-sm ${th.subtitle}`}>
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Clave:</span>
                <span className="font-bold text-red-500 font-mono">{d.emergType.code}</span>
                <span>— {d.emergType.label}</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!d.canDispatch || d.dispatching}
                onClick={d.handleDispatch}
                className="flex-1 flex items-center justify-center gap-3 py-4 sm:py-5 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-lg sm:text-xl shadow-xl shadow-red-900/40 transition active:scale-[0.98]"
              >
                {d.dispatching ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Despachando...
                  </>
                ) : (
                  <>
                    <Radio className="h-6 w-6" />
                    DESPACHAR
                  </>
                )}
              </button>
              {d.dispatching && (
                <button
                  type="button"
                  onClick={d.handleStop}
                  className={`px-5 rounded-2xl border-2 transition ${
                    isDark
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      : 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <Square className="h-6 w-6" />
                </button>
              )}
            </div>
            <p className={`text-center text-[10px] mt-2 ${th.hint}`}>
              Ctrl+Enter desde dirección · Esc cancelar
            </p>
          </section>
        </main>

        {/* Panel derecho — en vivo */}
        <aside className={`w-full lg:w-[340px] xl:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l flex flex-col min-h-[280px] lg:min-h-0 ${th.panelAside}`}>
          <div className={`flex border-b ${th.borderSubtle}`}>
            {(['activas', 'dotacion', 'carros'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSideTab(tab)}
                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wide transition ${
                  sideTab === tab ? th.tabActive : th.tabIdle
                }`}
              >
                {tab === 'activas' ? `Activas (${d.activeIncidents.length})` : tab === 'dotacion' ? 'Dotación' : 'Carros'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sideTab === 'activas' && (
              <>
                {d.activeIncidents.length === 0 ? (
                  <div className={`flex flex-col items-center justify-center py-12 ${th.linkMuted}`}>
                    <AlertTriangle className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">Sin emergencias activas</p>
                  </div>
                ) : (
                  (d.activeIncidents as {
                    id: string;
                    code: string;
                    type: string;
                    address: string;
                    dispatchedAt?: string;
                  }[]).map((inc) => (
                    <Link
                      key={inc.id}
                      to="/incidents"
                      className={`block p-3 rounded-xl border transition ${
                        isDark ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10' : 'border-red-200 bg-red-50 hover:bg-red-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-mono font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>{inc.code}</span>
                        <span className={`text-[10px] uppercase ${th.subtitle}`}>{inc.type}</span>
                      </div>
                      <p className={`text-xs mt-1 line-clamp-2 ${th.subtitle}`}>{inc.address}</p>
                      {inc.dispatchedAt && (
                        <p className={`text-[10px] mt-1 ${th.hint}`}>
                          {new Date(inc.dispatchedAt).toLocaleTimeString('es-CL')}
                        </p>
                      )}
                    </Link>
                  ))
                )}
              </>
            )}

            {sideTab === 'dotacion' && (
              <>
                {crew.length === 0 ? (
                  <p className={`text-sm text-center py-8 ${th.linkMuted}`}>Sin datos de dotación</p>
                ) : (
                  crew.map((m) => (
                    <div
                      key={m.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border ${th.listRow}`}
                    >
                      <div
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          m.status === 'DISPONIBLE'
                            ? 'bg-emerald-500'
                            : m.status === 'EN_SERVICIO'
                              ? 'bg-amber-400'
                              : 'bg-slate-400'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${th.title}`}>
                          {m.firstName} {m.lastName}
                        </p>
                        {m.rank && <p className={`text-[10px] ${th.subtitle}`}>{m.rank}</p>}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {sideTab === 'carros' && (
              <>
                {(d.live?.vehicles ?? d.ciaVehicles).length === 0 ? (
                  <p className={`text-sm text-center py-8 ${th.linkMuted}`}>Sin vehículos</p>
                ) : (
                  ((d.live?.vehicles ?? d.ciaVehicles) as { id: string; patent: string; status?: string; type?: string }[]).map(
                    (v) => (
                      <div
                        key={v.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border ${th.listRow}`}
                      >
                        <Truck className={`h-4 w-4 shrink-0 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-mono font-medium ${th.title}`}>{v.patent}</p>
                          {v.type && <p className={`text-[10px] ${th.subtitle}`}>{v.type}</p>}
                        </div>
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                            (v.status ?? 'OPERATIVO') === 'OPERATIVO'
                              ? isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                              : isDark ? 'bg-slate-500/15 text-slate-400' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {v.status ?? 'OPERATIVO'}
                        </span>
                      </div>
                    ),
                  )
                )}
              </>
            )}
          </div>

          <div className={`p-3 border-t text-[10px] text-center ${th.borderSubtle} ${th.hint}`}>
            Actualización cada 8s ·{' '}
            <Link to="/central-operativa" className="text-red-500 hover:text-red-600">
              Panel operativo
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
