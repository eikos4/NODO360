import { useEffect, useState } from 'react';
import { Delete, Lock, RefreshCw, ShieldAlert } from 'lucide-react';

export type SalaLockPreview = {
  locked: true;
  hasPin: boolean;
  slug: string | null;
  name: string;
  number: number;
  city: string;
  logoUrl?: string | null;
};

type Props = {
  preview: SalaLockPreview;
  unlocking: boolean;
  error: string | null;
  onSubmit: (pin: string) => void;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export default function SalaPinGate({ preview, unlocking, error, onSubmit }: Props) {
  const [pin, setPin] = useState('');

  useEffect(() => {
    setPin('');
  }, [preview.slug]);

  useEffect(() => {
    if (error) setPin('');
  }, [error]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setPin((prev) => (prev + e.key).slice(0, 8));
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setPin((prev) => prev.slice(0, -1));
        return;
      }
      if (e.key === 'Enter' && pin.length >= 4) {
        e.preventDefault();
        onSubmit(pin);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pin, onSubmit]);

  const press = (key: string) => {
    if (key === 'del') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (!key || unlocking) return;
    setPin((prev) => (prev + key).slice(0, 8));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-slate-950 text-center">
      {preview.logoUrl ? (
        <img src={preview.logoUrl} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-amber-500/40 shadow-lg" />
      ) : (
        <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <Lock className="w-8 h-8 text-amber-400" />
        </div>
      )}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80">Sala de máquinas</p>
        <h1 className="text-2xl font-bold text-white mt-1">
          {preview.number}ª {preview.name}
        </h1>
        <p className="text-sm text-slate-400 mt-1">{preview.city}</p>
      </div>

      {!preview.hasPin ? (
        <div className="max-w-sm text-slate-400 text-sm space-y-2">
          <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
          <p>Esta sala todavía no tiene PIN. Un capitán o centralista debe configurarlo en Despacho360.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-400">Ingresa el PIN de 4 a 8 dígitos</p>
          <div className="flex items-center justify-center gap-2 min-h-[28px]">
            {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
              <span
                key={i}
                className={`w-3 h-3 rounded-full border ${
                  i < pin.length ? 'bg-amber-400 border-amber-400' : 'border-slate-600'
                }`}
              />
            ))}
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="grid grid-cols-3 gap-2 w-64">
            {KEYS.map((key, i) => (
              <button
                key={`${key}-${i}`}
                type="button"
                disabled={unlocking || key === ''}
                onClick={() => press(key)}
                className={`h-14 rounded-xl text-xl font-bold transition-colors ${
                  key === ''
                    ? 'invisible'
                    : key === 'del'
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                } disabled:opacity-50`}
              >
                {key === 'del' ? <Delete className="w-5 h-5 mx-auto" /> : key}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={unlocking || pin.length < 4}
            onClick={() => onSubmit(pin)}
            className="w-64 h-12 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-amber-950 font-black"
          >
            {unlocking ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Desbloqueando…
              </span>
            ) : (
              'Entrar'
            )}
          </button>
        </>
      )}
    </div>
  );
}
