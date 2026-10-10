import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, Tv } from 'lucide-react';
import SalaPinGate, { type SalaLockPreview } from '../components/dispatch/SalaPinGate';
import { COMPANIAS360 } from '../lib/companias360';
import { clearSalaToken, readSalaToken, salaAuthHeaders, writeSalaToken } from '../lib/sala-auth';
import CompaniasTvPage from './CompaniasTvPage';

const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';
const TV_SLUG_KEY = 'nodo360_tv_slug';

function persistSalaToken(slug: string, token: string) {
  writeSalaToken(slug, token);
  try {
    localStorage.setItem(`nodo360_sala_token:${slug}`, token);
    localStorage.setItem(TV_SLUG_KEY, slug);
  } catch {
    /* ignore */
  }
}

function restoreSalaToken(slug: string) {
  const session = readSalaToken(slug);
  if (session) return session;
  try {
    const stored = localStorage.getItem(`nodo360_sala_token:${slug}`) ?? '';
    if (stored) writeSalaToken(slug, stored);
    return stored;
  } catch {
    return '';
  }
}

export default function CompaniasTvKioskPage() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [lockedPreview, setLockedPreview] = useState<SalaLockPreview | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(Boolean(slug));

  const probe = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      setReady(false);
      return;
    }
    restoreSalaToken(slug);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/dispatch/public/${slug}/cuerpo-wall`, {
        headers: salaAuthHeaders(slug),
      });
      const json = await res.json();
      if (json?.locked) {
        clearSalaToken(slug);
        setLockedPreview(json as SalaLockPreview);
        setReady(false);
        return;
      }
      if (!res.ok) throw new Error(json?.message ?? 'Muro no disponible');
      setLockedPreview(null);
      setReady(true);
    } catch (error) {
      setPinError(error instanceof Error ? error.message : 'Muro no disponible');
      setReady(false);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    document.title = 'Nodo360 · Muro TV';
    let wake: WakeLockSentinel | null = null;
    void navigator.wakeLock?.request('screen').then((lock) => {
      wake = lock;
    }).catch(() => undefined);
    if (!slug) {
      try {
        const last = localStorage.getItem(TV_SLUG_KEY);
        if (last) navigate(`/muro/${last}`, { replace: true });
      } catch {
        /* ignore */
      }
    }
    void probe();
    return () => {
      void wake?.release();
    };
  }, [probe, slug, navigate]);

  const unlock = async (pin: string) => {
    if (!slug) return;
    setUnlocking(true);
    setPinError(null);
    try {
      const res = await fetch(`${apiBase}/dispatch/public/${slug}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? 'PIN incorrecto');
      persistSalaToken(slug, json.token);
      setLockedPreview(null);
      setReady(true);
    } catch (error) {
      setPinError(error instanceof Error ? error.message : 'PIN incorrecto');
    } finally {
      setUnlocking(false);
    }
  };

  if (!slug) {
    return (
      <div className="flex h-[100dvh] flex-col bg-[#07090d] text-white">
        <header className="border-b border-white/10 px-6 py-5">
          <p className="text-2xl font-black tracking-tight">
            NODO<span className="text-red-500">360</span>
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-white/60">Muro TV · Cuartel</p>
        </header>
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center p-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600">
              <Tv className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-3xl font-black">Elegí la compañía del televisor</h1>
              <p className="text-sm text-white/70">Después entra el PIN de sala de máquinas. Cualquier compañía del cuerpo abre el muro completo: dotación, carros y emergencias.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMPANIAS360.map((cia) => (
              <Link
                key={cia.slug}
                to={`/muro/${cia.slug}`}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-5 text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400">{cia.short}</p>
                <p className="mt-1 text-2xl font-black">{cia.number}ª</p>
                <p className="text-sm text-white/70">{cia.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading && !lockedPreview) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#07090d] text-white/70">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Abriendo muro del cuartel…
      </div>
    );
  }

  if (lockedPreview || !ready) {
    return (
      <SalaPinGate
        preview={lockedPreview ?? {
          locked: true,
          hasPin: true,
          slug,
          name: 'Compañía',
          number: 0,
          city: '',
        }}
        unlocking={unlocking}
        error={pinError}
        onSubmit={(pin) => { void unlock(pin); }}
        onBack={() => navigate('/muro')}
      />
    );
  }

  return (
    <div className="h-[100dvh]">
      <CompaniasTvPage kioskSlug={slug} hideAdminLinks />
    </div>
  );
}
