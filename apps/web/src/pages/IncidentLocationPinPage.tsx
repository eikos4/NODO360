import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  MapPin, Navigation, CheckCircle2, Loader2, AlertTriangle, Siren, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PublicOsmMap, { PARRAL_CENTER, type OsmMarker } from '../components/map/PublicOsmMap';
import { openGoogleMapsDirections } from '../lib/incident-location-pin';

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
      toast.error('Tu dispositivo no soporta GPS. Toca el mapa para marcar el punto.');
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
        toast.error(err.message || 'No se pudo obtener el GPS. Toca el mapa para marcar el punto.');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const confirmLocation = async () => {
    if (!token || !pos) {
      toast.error('Primero obtén tu ubicación o marca el punto en el mapa');
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
        toast.success('Ubicación enviada a la central');
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
      toast.success('Ubicación enviada a la central');
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al confirmar');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmed = isPreDispatch ? confirmedPre : Boolean(data?.alreadyConfirmed && data?.fieldGps);

  const markers = useMemo((): OsmMarker[] => {
    const list: OsmMarker[] = [];
    if (data?.dispatchGps) {
      list.push({
        id: 'dispatch',
        lat: data.dispatchGps.latitude,
        lng: data.dispatchGps.longitude,
        label: 'Despacho central',
        tone: 'dispatch',
      });
    }
    if (data?.fieldGps) {
      list.push({
        id: 'field',
        lat: data.fieldGps.latitude,
        lng: data.fieldGps.longitude,
        label: 'Ubicación confirmada',
        tone: 'field',
      });
    }
    if (pos) {
      list.push({
        id: 'you',
        lat: pos.lat,
        lng: pos.lng,
        label: 'Tu punto',
        tone: 'you',
      });
    }
    return list;
  }, [data, pos]);

  const mapCenter = useMemo((): [number, number] => {
    if (pos) return [pos.lat, pos.lng];
    if (data?.fieldGps) return [data.fieldGps.latitude, data.fieldGps.longitude];
    if (data?.dispatchGps) return [data.dispatchGps.latitude, data.dispatchGps.longitude];
    return PARRAL_CENTER;
  }, [data, pos]);

  if (loading) {
    return (
      <div className="localizar-publico min-h-screen flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-red-600" />
        <span className="text-slate-600">Cargando emergencia…</span>
      </div>
    );
  }

  if (!isPreDispatch && (error || !data)) {
    return (
      <div className="localizar-publico min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold mb-2">Enlace no disponible</h1>
        <p className="text-slate-500 max-w-sm">{error}</p>
      </div>
    );
  }

  const companyLine = data
    ? `${data.company.number}ª ${data.company.name} · ${data.company.city}`
    : null;

  return (
    <div className="localizar-publico min-h-screen flex flex-col">
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-start gap-3">
          {data?.company.logoUrl ? (
            <img src={data.company.logoUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-red-200" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
              <Siren className="w-6 h-6 text-red-600" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase text-red-600 font-semibold">Localizar emergencia</p>
            <h1 className="text-lg font-semibold tracking-tight">{data ? data.code : 'Emergencia en curso'}</h1>
            <p className="text-sm text-slate-700">{data ? data.type : 'Envía tu ubicación a la central'}</p>
            {companyLine && <p className="text-xs text-slate-500 mt-1">{companyLine}</p>}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {data && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] uppercase text-slate-500 mb-1 flex items-center gap-1 font-semibold">
              <MapPin className="w-3.5 h-3.5" /> Dirección indicada
            </p>
            <p className="text-sm font-semibold">{data.address}</p>
            {data.vehicles.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Carros: {data.vehicles.map((v) => v.patent).join(' · ')}
              </p>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
          <div className="h-[280px] w-full">
            <PublicOsmMap
              theme="light"
              baseStyle="osm"
              center={mapCenter}
              focus={pos ? [pos.lat, pos.lng] : null}
              zoom={15}
              markers={markers}
              pickActive={!confirmed}
              onPick={confirmed ? undefined : (lat, lng) => setPos({ lat, lng })}
              className="h-full w-full"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Despacho central</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Ubicación confirmada</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Tu GPS</span>
        </div>

        {confirmed ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="text-lg font-semibold text-emerald-800">Ubicación enviada</h2>
            <p className="text-sm text-slate-600">
              La central ya recibió las coordenadas GPS del punto.
            </p>
            {data?.fieldGps && (
              <button
                type="button"
                onClick={() => openGoogleMapsDirections(data.fieldGps!.latitude, data.fieldGps!.longitude)}
                className="localizar-btn inline-flex items-center gap-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-xl mt-1"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir en Google Maps
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 leading-relaxed">
              Si estás en el lugar, obtén tu GPS o toca el mapa para marcar el punto exacto. Así los carros llegan bien.
            </p>
            <button
              type="button"
              onClick={captureGps}
              disabled={locating}
              className="localizar-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 font-semibold"
            >
              {locating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
              {locating ? 'Obteniendo GPS…' : 'Obtener mi ubicación'}
            </button>
            {pos && (
              <p className="text-center text-xs text-sky-700 font-mono">
                {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
                {pos.accuracy != null && ` · ±${Math.round(pos.accuracy)} m`}
              </p>
            )}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tu nombre o una referencia (opcional)"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-400"
            />
            <button
              type="button"
              onClick={() => void confirmLocation()}
              disabled={!pos || submitting}
              className="localizar-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 font-semibold text-base"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Confirmar ubicación
            </button>
          </div>
        )}
      </main>

      <footer className="shrink-0 py-4 text-center text-[11px] text-slate-400">
        NODO360 · Emergencias 132
      </footer>
    </div>
  );
}
