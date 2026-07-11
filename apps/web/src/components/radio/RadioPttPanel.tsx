import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Radio, Users, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import {
  getRadioSocket,
  incidentChannelId,
  type RadioChannelState,
  type RadioTx,
} from '../../lib/radio-socket';
import { cn } from '../../lib/utils';

type Props = {
  incidentId: string;
  incidentLabel?: string;
  /** Conectarse al canal (escuchar) */
  enabled?: boolean;
  /** Puede transmitir (PTT) */
  canTalk?: boolean;
  className?: string;
};

const MAX_MS = 15000;

export default function RadioPttPanel({
  incidentId,
  incidentLabel,
  enabled = true,
  canTalk = true,
  className,
}: Props) {
  const me = useAuthStore((s) => s.user);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<RadioChannelState | null>(null);
  const [holding, setHolding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastPlayedId, setLastPlayedId] = useState<string | null>(null);

  const channelId = incidentChannelId(incidentId);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playTx = useCallback(async (tx: RadioTx) => {
    if (me?.id && tx.userId === me.id) return;
    try {
      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      audio.src = tx.audioUrl;
      setLastPlayedId(tx.id);
      await audio.play();
    } catch {
      /* autoplay puede fallar hasta interacción */
    }
  }, [me?.id]);

  useEffect(() => {
    if (!enabled || !incidentId) return;
    const token = localStorage.getItem('nodo360_token');
    if (!token) return;

    const socket = getRadioSocket(token);

    const onConnect = () => {
      setConnected(true);
      socket.emit('channel:join', { channelId }, (res: { ok?: boolean; state?: RadioChannelState; reason?: string }) => {
        if (res?.ok && res.state) setState(res.state);
        else if (res?.reason) toast.error(res.reason);
      });
    };
    const onDisconnect = () => setConnected(false);
    const onState = (s: RadioChannelState) => {
      if (s.channelId === channelId) setState(s);
    };
    const onTx = (tx: RadioTx) => {
      if (tx.channelId !== channelId) return;
      setState((prev) =>
        prev
          ? { ...prev, recent: [tx, ...(prev.recent ?? []).filter((r) => r.id !== tx.id)].slice(0, 12) }
          : prev,
      );
      void playTx(tx);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('channel:state', onState);
    socket.on('tx:new', onTx);

    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      socket.emit('channel:leave', { channelId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('channel:state', onState);
      socket.off('tx:new', onTx);
    };
  }, [channelId, enabled, incidentId, playTx]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const finishPtt = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    const socket = getRadioSocket(localStorage.getItem('nodo360_token') || '');
    setHolding(false);

    const stopPttSignal = () => socket.emit('ptt:stop', { channelId });

    if (!recorder || recorder.state === 'inactive') {
      stopPttSignal();
      stopTracks();
      return;
    }

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      try {
        recorder.stop();
      } catch {
        resolve();
      }
    });

    mediaRecorderRef.current = null;
    stopTracks();

    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
    chunksRef.current = [];
    const durationMs = Math.min(MAX_MS, Date.now() - startedAtRef.current);

    if (blob.size < 800) {
      stopPttSignal();
      toast.error('Transmisión muy corta');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', blob, `radio-${Date.now()}.webm`);
      const { data } = await api.post<{ audioUrl: string }>('/radio/upload', form);
      socket.emit(
        'tx:broadcast',
        { channelId, audioUrl: data.audioUrl, durationMs, id: `tx_${Date.now()}` },
        () => undefined,
      );
    } catch {
      stopPttSignal();
      toast.error('No se pudo enviar la transmisión');
    } finally {
      setUploading(false);
    }
  }, [channelId]);

  const startPtt = useCallback(async () => {
    if (!enabled || !canTalk || holding || uploading) return;
    const token = localStorage.getItem('nodo360_token');
    if (!token) return;
    const socket = getRadioSocket(token);

    const ack = await new Promise<{ ok?: boolean; reason?: string; talker?: { speakerName: string } }>((resolve) => {
      socket.emit('ptt:start', { channelId }, (res: any) => resolve(res || { ok: false }));
    });
    if (!ack?.ok) {
      toast.error(ack?.talker ? `Habla: ${ack.talker.speakerName}` : ack?.reason || 'Canal ocupado');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(250);
      setHolding(true);

      window.setTimeout(() => {
        if (mediaRecorderRef.current === recorder && recorder.state === 'recording') {
          void finishPtt();
        }
      }, MAX_MS);
    } catch {
      socket.emit('ptt:stop', { channelId });
      toast.error('No se pudo acceder al micrófono');
    }
  }, [channelId, canTalk, enabled, finishPtt, holding, uploading]);

  const talker = state?.talker;
  const isBusyOther = !!talker && holding === false;

  return (
    <div
      className={cn(
        'rounded-2xl border border-violet-500/40 bg-[#100a18] p-4 shadow-[0_0_20px_rgba(139,92,246,0.15)] space-y-3',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-violet-400" />
            <p className="text-[10px] uppercase tracking-[0.16em] font-black text-violet-300">
              Radio de emergencia
            </p>
          </div>
          <p className="text-sm font-bold text-white mt-1 truncate">
            {incidentLabel || 'Canal del incidente'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
            <span className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-emerald-400' : 'bg-slate-500')} />
            {connected ? 'En canal' : 'Conectando…'}
            <span className="flex items-center gap-1 text-slate-500">
              <Users className="w-3 h-3" /> {state?.listeners ?? 0}
            </span>
          </p>
        </div>
        {talker && (
          <div className="shrink-0 text-right">
            <p className="text-[9px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1 justify-end">
              <Volume2 className="w-3 h-3 animate-pulse" /> Al aire
            </p>
            <p className="text-xs font-black text-white">{talker.speakerName}</p>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!enabled || !canTalk || !connected || uploading || (isBusyOther && !holding)}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!canTalk) {
            toast.error('Marca “Voy” para transmitir en el canal');
            return;
          }
          (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
          void startPtt();
        }}
        onPointerUp={() => void finishPtt()}
        onPointerCancel={() => void finishPtt()}
        onPointerLeave={() => {
          if (holding) void finishPtt();
        }}
        className={cn(
          'w-full select-none touch-none rounded-2xl py-5 flex flex-col items-center justify-center gap-2 font-black uppercase tracking-wider transition-all border-2',
          holding
            ? 'bg-red-600 border-red-400 text-white shadow-[0_0_28px_rgba(239,68,68,0.55)] scale-[1.02]'
            : canTalk
              ? 'bg-violet-600/90 border-violet-400/60 text-white hover:bg-violet-500 shadow-[0_0_18px_rgba(139,92,246,0.35)]'
              : 'bg-slate-800 border-slate-700 text-slate-400',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
        )}
      >
        {holding ? <Mic className="w-8 h-8 animate-pulse" /> : uploading ? <MicOff className="w-8 h-8 animate-pulse" /> : <Mic className="w-8 h-8" />}
        <span className="text-sm">
          {!canTalk
            ? 'Solo escucha — marca Voy para hablar'
            : holding
              ? 'Hablando… suelta para enviar'
              : uploading
                ? 'Enviando…'
                : 'Mantén para hablar'}
        </span>
        <span className="text-[10px] font-semibold opacity-80 normal-case tracking-normal">
          Máx. {MAX_MS / 1000}s · un hablante a la vez
        </span>
      </button>

      {state?.recent && state.recent.length > 0 && (
        <div className="space-y-1.5 max-h-28 overflow-y-auto">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Últimas transmisiones</p>
          {state.recent.slice(0, 5).map((tx) => (
            <button
              key={tx.id}
              type="button"
              onClick={() => void playTx(tx)}
              className={cn(
                'w-full flex items-center justify-between gap-2 text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                lastPlayedId === tx.id
                  ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
                  : 'border-slate-800 bg-black/30 text-slate-300 hover:border-slate-600',
              )}
            >
              <span className="font-semibold truncate">{tx.speakerName}</span>
              <span className="text-[10px] text-slate-500 shrink-0">
                {Math.max(1, Math.round(tx.durationMs / 1000))}s
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
