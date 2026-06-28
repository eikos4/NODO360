import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, Navigation, CheckCircle2, Loader2, AlertTriangle, Siren, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  openGoogleMapsDirections,
} from '../lib/incident-location-pin';

const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

type PinData = {
  id: string;
  code: string;
  type: string;
  description: string;
  address: string;
  dispatchedAt: string;
  company: { id: string; name: string; number: number; logoUrl?: string | null; city: string };
  vehicles: { patent: string; type: string }[];
  dispatchGps: { latitude: number; longitude: number } | null;
  fieldGps: {
    latitude: number;
    longitude: number;
    confirmedAt: string | null;
    note: string | null;
  } | null;
  alreadyConfirmed: boolean;
};

function FitPoints({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 16);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 17 });
  }, [map, points]);
  return null;
}

const dispatchIcon = L.divIcon({
  className: '',
  html: '<div style="background:#f97316;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const fieldIcon = L.divIcon({
  className: '',
  html: '<div style="background:#22c55e;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px #22c55e"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const youIcon = L.divIcon({
  className: '',
  html: '<div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px #3b82f6"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function IncidentLocationPinPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [confirmedPre, setConfirmedPre] = useState(false);

  const isPreDispatch = token?.startsWith('pre_');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/location-pin/${token}`);
      if (!res.ok) {
        if (isPreDispatch) {
          // Si es pre-dispatch y aún no existe en la DB, mostramos la vista rápida
          setLoading(false);
          return;
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Enlace no válido');
      }
      setData(await res.json());
      setError(null);
    } catch (e: unknown) {
      if (isPreDispatch) {
        setLoading(false);
        return;
      }
      setError(e instanceof Error ? e.message : 'No se pudo cargar la emergencia');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, isPreDispatch]);

  useEffect(() => { void load(); }, [load]);

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.error('Tu dispositivo no soporta GPS');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(err.message || 'No se pudo obtener ubicación. Activa el GPS.');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const confirmLocation = async () => {
    if (!token || !pos) {
      toast.error('Primero obtén tu ubicación GPS');
      return;
    }
    setSubmitting(true);
    try {
      if (isPreDispatch) {
        const res = await fetch(`${apiBase}/location-pin/pre-dispatch/${token}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: pos.lat, longitude: pos.lng, note: note.trim() || undefined }),
        });
        if (!res.ok) throw new Error('No se pudo enviar');
        setConfirmedPre(true);
        toast.success('¡Ubicación enviada a la central!');
        return;
      }

      const res = await fetch(`${apiBase}/location-pin/${token}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: pos.lat, longitude: pos.lng, note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'No se pudo confirmar');
      }
      toast.success('¡Ubicación enviada a la central!');
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al confirmar');
    } finally {
      setSubmitting(false);
    }
  };

  const mapPoints = useMemo((): [number, number][] => {
    const pts: [number, number][] = [];
    if (data?.dispatchGps) pts.push([data.dispatchGps.latitude, data.dispatchGps.longitude]);
    if (data?.fieldGps) pts.push([data.fieldGps.latitude, data.fieldGps.longitude]);
    if (pos) pts.push([pos.lat, pos.lng]);
    return pts;
  }, [data, pos]);

  const mapCenter: [number, number] = mapPoints[0] ?? [-36.1431, -71.8261];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-red-400" />
        <span className="text-slate-300">Cargando emergencia…</span>
      </div>
    );
  }

  if (!isPreDispatch && (error || !data)) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-14 h-14 text-amber-400 mb-4" />
        <h1 className="text-xl font-bold mb-2">Enlace no disponible</h1>
        <p className="text-slate-400 max-w-sm">{error}</p>
      </div>
    );
  }

  const confirmed = isPreDispatch ? confirmedPre : (data?.alreadyConfirmed && data?.fieldGps);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="shrink-0 border-b border-slate-800 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-start gap-3">
          {data?.company.logoUrl ? (
            <img src={data.company.logoUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-red-500/40" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center">
              <Siren className="w-6 h-6 text-red-400" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold">Localizar emergencia</p>
            <h1 className="text-lg font-black">{data ? data.code : 'Emergencia en curso'}</h1>
            <p className="text-sm text-slate-300">{data ? data.type : 'Enviando ubicación a central...'}</p>
            {data && <p className="text-xs text-slate-500 mt-1">{data.company.number}ª {data.company.name} · {data.company.city}</p>}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {data && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
            <p className="text-[10px] uppercase text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Dirección indicada</p>
            <p className="text-sm font-semibold">{data.address}</p>
            {data.vehicles.length > 0 && (
              <p className="text-xs text-slate-400 mt-2">Carros: {data.vehicles.map((v) => v.patent).join(' · ')}</p>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-slate-700 overflow-hidden h-[280px]">
          <MapContainer center={mapCenter} zoom={15} className="h-full w-full" scrollWheelZoom>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitPoints points={mapPoints.length ? mapPoints : [mapCenter]} />
            {data?.dispatchGps && (
              <Marker position={[data!.dispatchGps.latitude, data!.dispatchGps.longitude]} icon={dispatchIcon} />
            )}
            {data?.fieldGps && (
              <Marker position={[data!.fieldGps.latitude, data!.fieldGps.longitude]} icon={fieldIcon} />
            )}
            {pos && (
              <>
                <Marker position={[pos.lat, pos.lng]} icon={youIcon} />
                {pos.accuracy != null && pos.accuracy < 200 && (
                  <Circle center={[pos.lat, pos.lng]} radius={pos.accuracy} pathOptions={{ color: '#3b82f6', fillOpacity: 0.08 }} />
                )}
              </>
            )}
          </MapContainer>
        </div>

        <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Despacho central</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Ubicación confirmada</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Tu GPS</span>
        </div>

        {confirmed ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-5 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold text-emerald-200">Ubicación localizada</h2>
            <p className="text-sm text-slate-300">
              La central ya recibió las coordenadas GPS del incendio.
            </p>
            {data?.fieldGps && (
              <button
                type="button"
                onClick={() => openGoogleMapsDirections(data.fieldGps!.latitude, data.fieldGps!.longitude)}
                className="inline-flex items-center gap-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl mt-3"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir en Google Maps
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-300 leading-relaxed">
              Estás en el lugar del incendio. Obtén tu ubicación GPS y confírmala para que los carros lleguen al punto exacto.
            </p>
            <button
              type="button"
              onClick={captureGps}
              disabled={locating}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 font-bold text-white"
            >
              {locating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
              {locating ? 'Obteniendo GPS…' : 'Obtener mi ubicación'}
            </button>
            {pos && (
              <p className="text-center text-xs text-sky-300 font-mono">
                {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
                {pos.accuracy != null && ` · ±${Math.round(pos.accuracy)} m`}
              </p>
            )}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tu nombre o referencia (opcional)"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm focus:outline-none focus:border-red-500/50"
            />
            <button
              type="button"
              onClick={() => void confirmLocation()}
              disabled={!pos || submitting}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 font-black text-white text-lg"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Confirmar ubicación del incendio
            </button>
          </div>
        )}
      </main>

      <footer className="shrink-0 py-4 text-center text-[10px] text-slate-600">
        NODO360 · Emergencias 132
      </footer>
    </div>
  );
}
