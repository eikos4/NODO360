import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode, type TouchEvent } from 'react';
import { Mic, MicOff, Play, Radio, Users, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import {
  getRadioSocket,
  incidentChannelId,
  mergeRadioTx,
  pickRecorderMime,
  radioSpeakerParts,
  radioUploadFile,
  resolveRadioAudioUrl,
  stopRadioRecorder,
  type RadioChannelState,
  type RadioTx,
} from '../../lib/radio-socket';
import { cn } from '../../lib/utils';
import { useThemeStore } from '../../store/themeStore';

type Props = {
  incidentId: string;
  incidentLabel?: string;
  /** Conectarse al canal (escuchar) */
  enabled?: boolean;
  /** Puede transmitir (PTT) */
  canTalk?: boolean;
  className?: string;
  isDark?: boolean;
  talkHint?: string;
  variant?: 'panel' | 'hero' | 'bar';
  showListenLog?: boolean;
  children?: ReactNode;
};

const MAX_MS = 15000;

export default function RadioPttPanel({
  incidentId,
  incidentLabel,
  enabled = true,
  canTalk = false,
  className,
  isDark: isDarkProp,
  talkHint,
  variant = 'panel',
  showListenLog = false,
  children,
}: Props) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = isDarkProp ?? theme === 'dark';
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
  const pttRef = useRef({ starting: false, recording: false, finishing: false, stopQueued: false });

  const playTx = useCallback(async (tx: RadioTx, force = false) => {
    if (!force && me?.id && tx.userId === me.id) return;
    const url = resolveRadioAudioUrl(tx.audioUrl);
    if (!url) return;
    try {
      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      audio.setAttribute('playsinline', 'true');
      audio.src = url;
      setLastPlayedId(tx.id);
      await audio.play();
    } catch {
      /* autoplay puede fallar hasta interacción */
    }
  }, [me?.id]);

  const playTxRef = useRef(playTx);
  playTxRef.current = playTx;

  useEffect(() => {
    if (!enabled || !incidentId) return;
    const token = localStorage.getItem('nodo360_token');
    if (!token) return;

    const socket = getRadioSocket(token);
    let joinTimer: number | null = null;

    const applyTx = (tx: RadioTx): RadioTx => ({ ...tx, audioUrl: resolveRadioAudioUrl(tx.audioUrl) });
    const applyState = (next: RadioChannelState): RadioChannelState => ({
      ...next,
      recent: (next.recent ?? []).map(applyTx),
    });

    const joinChannel = (tries = 6) => {
      socket.emit(
        'channel:join',
        { channelId },
        (res: { ok?: boolean; state?: RadioChannelState; reason?: string }) => {
          if (res?.ok && res.state) setState(applyState(res.state));
          else if (tries > 1) joinTimer = window.setTimeout(() => joinChannel(tries - 1), 400);
          else if (res?.reason) toast.error(res.reason);
        },
      );
    };

    const onConnect = () => {
      setConnected(true);
      joinChannel();
    };
    const onReady = () => joinChannel();
    const onDisconnect = () => setConnected(false);
    const onState = (s: RadioChannelState) => {
      if (s.channelId === channelId) setState(applyState(s));
    };
    const onTx = (tx: RadioTx) => {
      if (tx.channelId !== channelId) return;
      const clip = applyTx(tx);
      setState((prev) => mergeRadioTx(prev, clip, channelId));
      void playTxRef.current(clip);
    };

    socket.on('connect', onConnect);
    socket.on('radio.ready', onReady);
    socket.on('disconnect', onDisconnect);
    socket.on('channel:state', onState);
    socket.on('tx:new', onTx);

    if (socket.connected) onConnect();
    else socket.connect();

    const poll = window.setInterval(() => {
      void api
        .get<{ recent?: RadioTx[]; state?: RadioChannelState }>(
          `/radio/channels/${encodeURIComponent(channelId)}/recent`,
        )
        .then(({ data }) => {
          const clips = (data?.state?.recent ?? data?.recent ?? []).map(applyTx);
          if (!clips.length) return;
          setState((prev) => {
            if (!prev) return applyState(data.state ?? { ...data, channelId, recent: clips } as RadioChannelState);
            const byId = new Map((prev.recent ?? []).map((item) => [item.id, item]));
            for (const clip of clips) byId.set(clip.id, clip);
            return { ...prev, recent: [...byId.values()].sort((a, b) => b.at - a.at).slice(0, 16) };
          });
        })
        .catch(() => undefined);
    }, 4000);

    return () => {
      if (joinTimer) window.clearTimeout(joinTimer);
      window.clearInterval(poll);
      socket.emit('channel:leave', { channelId });
      socket.off('connect', onConnect);
      socket.off('radio.ready', onReady);
      socket.off('disconnect', onDisconnect);
      socket.off('channel:state', onState);
      socket.off('tx:new', onTx);
    };
  }, [channelId, enabled, incidentId]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const finishPtt = useCallback(async () => {
    const ptt = pttRef.current;
    if (ptt.starting) {
      ptt.stopQueued = true;
      return;
    }
    if (ptt.finishing || !ptt.recording) return;
    ptt.finishing = true;
    ptt.recording = false;
    ptt.stopQueued = false;

    const recorder = mediaRecorderRef.current;
    const socket = getRadioSocket(localStorage.getItem('nodo360_token') || '');
    setHolding(false);
    const stopPttSignal = () => socket.emit('ptt:stop', { channelId });

    if (!recorder) {
      stopPttSignal();
      stopTracks();
      ptt.finishing = false;
      return;
    }

    const blob = await stopRadioRecorder(recorder, chunksRef.current);
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    stopTracks();

    const durationMs = Math.min(MAX_MS, Date.now() - startedAtRef.current);
    if (blob.size < 250) {
      stopPttSignal();
      toast.error(durationMs < 500
        ? 'Mantené el botón al menos un segundo'
        : 'El navegador no grabó audio. Revisá el permiso de micrófono.');
      ptt.finishing = false;
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      const file = radioUploadFile(blob, recorder.mimeType || blob.type);
      form.append('file', file, file instanceof File ? file.name : `radio-${Date.now()}.webm`);
      const { data } = await api.post<{ audioUrl: string }>('/radio/upload', form);
      const audioUrl = resolveRadioAudioUrl(data.audioUrl);
      if (!audioUrl) throw new Error('El servidor no devolvió audio');
      const ack = await new Promise<{ ok?: boolean; tx?: RadioTx; reason?: string }>((resolve) => {
        const timer = window.setTimeout(() => resolve({ ok: false, reason: 'Sin respuesta del canal' }), 8000);
        socket.emit(
          'tx:broadcast',
          { channelId, audioUrl, durationMs: Math.max(durationMs, 800), id: `tx_${Date.now()}` },
          (res: { ok?: boolean; tx?: RadioTx; reason?: string }) => {
            window.clearTimeout(timer);
            resolve(res || { ok: false });
          },
        );
      });
      if (ack?.tx) {
        setState((prev) => mergeRadioTx(prev, { ...ack.tx!, audioUrl: resolveRadioAudioUrl(ack.tx!.audioUrl) }, channelId));
      } else {
        stopPttSignal();
        toast.error(ack?.reason || 'No se pudo publicar en el canal');
      }
    } catch {
      stopPttSignal();
      toast.error('No se pudo enviar la transmisión');
    } finally {
      setUploading(false);
      ptt.finishing = false;
    }
  }, [channelId]);

  const startPtt = useCallback(async () => {
    const ptt = pttRef.current;
    if (!enabled || !canTalk || ptt.starting || ptt.recording || ptt.finishing || uploading) return;
    ptt.starting = true;
    ptt.stopQueued = false;
    const token = localStorage.getItem('nodo360_token');
    if (!token) {
      ptt.starting = false;
      return;
    }
    const socket = getRadioSocket(token);

    try {
      const ack = await new Promise<{ ok?: boolean; reason?: string; talker?: { speakerName: string } }>((resolve) => {
        socket.emit('ptt:start', { channelId }, (res: any) => resolve(res || { ok: false }));
      });
      if (!ack?.ok) {
        ptt.starting = false;
        toast.error(ack?.talker ? `Habla: ${ack.talker.speakerName}` : ack?.reason || 'Canal ocupado');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const mime = pickRecorderMime();
      let recorder: MediaRecorder;
      try {
        recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();

      ptt.recording = true;
      ptt.starting = false;
      setHolding(true);
      window.setTimeout(() => {
        if (mediaRecorderRef.current === recorder && recorder.state === 'recording') {
          void finishPtt();
        }
      }, MAX_MS);
      if (ptt.stopQueued) void finishPtt();
    } catch {
      ptt.starting = false;
      socket.emit('ptt:stop', { channelId });
      stopTracks();
      toast.error('No se pudo acceder al micrófono');
    }
  }, [channelId, canTalk, enabled, finishPtt, uploading]);

  const talker = state?.talker;
  const isBusyOther = !!talker && holding === false;

  const pttHandlers = {
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (!canTalk) {
        toast.error(talkHint || 'Marca “Voy” para transmitir en el canal');
        return;
      }
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch { /* */ }
      void startPtt();
    },
    onPointerUp: (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      void finishPtt();
    },
    onPointerCancel: () => void finishPtt(),
    onTouchEnd: (e: TouchEvent<HTMLButtonElement>) => {
      e.preventDefault();
      void finishPtt();
    },
  };

  const listenItems = state?.recent ?? [];

  const listenLog = (showListenLog || variant !== 'bar') && (
    <div className={cn(
      'rounded-2xl border p-3',
      isDark ? 'border-white/10 bg-[#111827]' : 'border-slate-200 bg-white shadow-sm',
    )}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className={cn('text-xs font-semibold', isDark ? 'text-slate-300' : 'text-slate-700')}>
          Escuchar canal
        </p>
        <span className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-slate-500')}>
          {state?.listeners ?? 0} en línea
        </span>
      </div>
      {talker && (
        <p className={cn('mb-2 flex items-center gap-1.5 text-[11px] font-bold', isDark ? 'text-amber-300' : 'text-amber-700')}>
          <Volume2 className="h-3.5 w-3.5 animate-pulse" />
          Al aire · {talker.speakerName}
        </p>
      )}
      {listenItems.length === 0 ? (
        <p className={cn('text-[11px]', isDark ? 'text-slate-500' : 'text-slate-500')}>
          Aún no hay transmisiones de bomberos en este canal.
        </p>
      ) : (
        <ul className="max-h-56 space-y-1.5 overflow-y-auto">
          {listenItems.map((tx) => {
            const { number, name } = radioSpeakerParts(tx);
            const active = lastPlayedId === tx.id;
            return (
              <li key={tx.id}>
                <button
                  type="button"
                  onClick={() => void playTx(tx, true)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition',
                    active
                      ? isDark
                        ? 'border-violet-500/50 bg-violet-500/15'
                        : 'border-violet-300 bg-violet-50'
                      : isDark
                        ? 'border-white/10 bg-black/20 hover:border-white/20'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white',
                  )}
                >
                  <span className={cn(
                    'flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-xs font-black',
                    number != null
                      ? 'bg-red-600 text-white'
                      : isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-600',
                  )}>
                    {number != null ? number : <Play className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                      {number != null ? `N° ${number}` : name}
                    </span>
                    <span className={cn('block truncate text-[10px]', isDark ? 'text-slate-400' : 'text-slate-500')}>
                      {number != null ? name : tx.role || 'Bombero'}
                    </span>
                  </span>
                  <span className={cn('flex items-center gap-1 text-[10px] font-semibold', isDark ? 'text-slate-400' : 'text-slate-500')}>
                    <Play className="h-3 w-3" />
                    {Math.max(1, Math.round(tx.durationMs / 1000))}s
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (variant === 'bar') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="radio-ptt-panel flex items-center gap-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-3 text-white shadow-md">
          <button
            type="button"
            disabled={!enabled || !connected || uploading || (isBusyOther && !holding)}
            {...pttHandlers}
            className={cn(
              'radio-ptt-btn flex h-12 w-12 shrink-0 select-none touch-none items-center justify-center rounded-full bg-white/15 transition',
              holding && 'bg-red-500',
            )}
          >
            {holding ? <Mic className="h-6 w-6 animate-pulse" /> : <Mic className="h-6 w-6" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/80">Radio de emergencia</p>
            <p className="truncate text-sm font-semibold">{incidentLabel || 'Canal de la emergencia'}</p>
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-emerald-100 sm:flex">
            <span className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-emerald-300' : 'bg-white/40')} />
            {connected ? 'En comunicación' : 'Conectando…'}
          </span>
          {talker && <span className="hidden text-xs font-bold text-amber-100 lg:inline">Al aire: {talker.speakerName}</span>}
        </div>
        {children}
        {showListenLog ? listenLog : null}
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={cn('radio-ptt-panel flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-[#111827] p-4', className)}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-white">Comunicación por Radio</p>
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className={cn('h-1.5 w-1.5 rounded-full', connected ? 'bg-emerald-400' : 'bg-slate-500')} />
            {connected ? 'En comunicación' : 'Conectando…'}
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-4">
          <button
            type="button"
            disabled={!enabled || !connected || uploading || (isBusyOther && !holding)}
            onPointerDown={(e) => {
              e.preventDefault();
              if (!canTalk) {
                toast.error(talkHint || 'Marca “Voy” para transmitir en el canal');
                return;
              }
              try {
                (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
              } catch { /* */ }
              void startPtt();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              void finishPtt();
            }}
            onPointerCancel={() => void finishPtt()}
            onTouchEnd={(e) => {
              e.preventDefault();
              void finishPtt();
            }}
            className={cn(
              'radio-ptt-btn flex h-36 w-36 select-none touch-none flex-col items-center justify-center rounded-full text-white shadow-[0_0_40px_rgba(37,99,235,0.45)] transition-transform',
              holding ? 'scale-105 bg-red-600' : 'bg-blue-600 hover:bg-blue-500',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {holding ? <Mic className="h-12 w-12 animate-pulse" /> : uploading ? <MicOff className="h-12 w-12 animate-pulse" /> : <Mic className="h-12 w-12" />}
          </button>
          <p className="mt-4 text-center text-sm font-medium text-slate-300">
            {!canTalk
              ? (talkHint || 'Solo escucha')
              : holding
                ? 'Hablando… suelta para enviar'
                : uploading
                  ? 'Enviando…'
                  : 'Mantén presionado para hablar'}
          </p>
        </div>
        <div className="space-y-2">
          <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300">
            {incidentLabel || 'Canal de la emergencia'}
            <span className="ml-2 text-slate-500">· {state?.listeners ?? 0} en canal</span>
          </div>
          {talker && (
            <p className="text-center text-[11px] font-bold text-amber-400">
              Al aire: {talker.speakerName}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'radio-ptt-panel rounded-2xl border p-4 space-y-3',
        isDark
          ? 'border-violet-500/40 bg-[#100a18] shadow-[0_0_20px_rgba(139,92,246,0.15)]'
          : 'border-violet-300 bg-violet-50 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Radio className={cn('w-4 h-4', isDark ? 'text-violet-400' : 'text-violet-700')} />
            <p className={cn('text-[10px] uppercase tracking-[0.16em] font-black', isDark ? 'text-violet-300' : 'text-violet-800')}>
              Radio de emergencia
            </p>
          </div>
          <p className={cn('text-sm font-bold mt-1 truncate', isDark ? 'text-white' : 'text-slate-900')}>
            {incidentLabel || 'Canal del incidente'}
          </p>
          <p className={cn('text-[11px] mt-0.5 flex items-center gap-2', isDark ? 'text-slate-400' : 'text-slate-700')}>
            <span className={cn('w-1.5 h-1.5 rounded-full', connected ? 'bg-emerald-500' : 'bg-slate-400')} />
            {connected ? 'En canal' : 'Conectando…'}
            <span className={cn('flex items-center gap-1', isDark ? 'text-slate-500' : 'text-slate-600')}>
              <Users className="w-3 h-3" /> {state?.listeners ?? 0}
            </span>
          </p>
        </div>
        {talker && (
          <div className="shrink-0 text-right">
            <p className={cn('text-[9px] uppercase tracking-wider font-bold flex items-center gap-1 justify-end', isDark ? 'text-amber-400' : 'text-amber-800')}>
              <Volume2 className="w-3 h-3 animate-pulse" /> Al aire
            </p>
            <p className={cn('text-xs font-black', isDark ? 'text-white' : 'text-slate-900')}>{talker.speakerName}</p>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={!enabled || !connected || uploading || (isBusyOther && !holding)}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!canTalk) {
            toast.error(talkHint || 'Marca “Voy” para transmitir en el canal');
            return;
          }
          try {
            (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
          } catch { /* */ }
          void startPtt();
        }}
        onPointerUp={(e) => {
          e.preventDefault();
          void finishPtt();
        }}
        onPointerCancel={() => void finishPtt()}
        onTouchEnd={(e) => {
          e.preventDefault();
          void finishPtt();
        }}
        className={cn(
          'radio-ptt-btn w-full select-none touch-none rounded-2xl py-5 flex flex-col items-center justify-center gap-2 font-black uppercase tracking-wider transition-all border-2',
          holding
            ? 'bg-red-600 border-red-400 text-white shadow-[0_0_28px_rgba(239,68,68,0.55)] scale-[1.02]'
            : canTalk
              ? isDark
                ? 'bg-violet-600 border-violet-400 text-white hover:bg-violet-500 shadow-[0_0_18px_rgba(139,92,246,0.35)]'
                : 'bg-violet-600 border-violet-700 text-white hover:bg-violet-700 shadow-md'
              : isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-slate-200 border-slate-300 text-slate-700',
          'disabled:cursor-not-allowed disabled:shadow-none',
        )}
      >
        {holding ? <Mic className="w-8 h-8 animate-pulse" /> : uploading ? <MicOff className="w-8 h-8 animate-pulse" /> : <Mic className="w-8 h-8" />}
        <span className="text-sm">
          {!canTalk
            ? (talkHint || 'Solo escucha — marca Voy para hablar')
            : holding
              ? 'Hablando… suelta para enviar'
              : uploading
                ? 'Enviando…'
                : 'Mantén para hablar'}
        </span>
        <span className="text-[10px] font-semibold normal-case tracking-normal">
          Máx. {MAX_MS / 1000}s · un hablante a la vez
        </span>
      </button>

      {state?.recent && state.recent.length > 0 && (
        <div className="space-y-1.5 max-h-28 overflow-y-auto">
          <p className={cn('text-[9px] uppercase tracking-wider font-bold', isDark ? 'text-slate-400' : 'text-slate-600')}>Últimas transmisiones</p>
          {state.recent.slice(0, 5).map((tx) => {
            const { number, name } = radioSpeakerParts(tx);
            return (
            <button
              key={tx.id}
              type="button"
              onClick={() => void playTx(tx, true)}
              className={cn(
                'w-full flex items-center justify-between gap-2 text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                lastPlayedId === tx.id
                  ? isDark
                    ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
                    : 'border-violet-400 bg-violet-100 text-violet-900'
                  : isDark
                    ? 'border-slate-800 bg-black/30 text-slate-300 hover:border-slate-600'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300',
              )}
            >
              <span className="font-semibold truncate">
                {number != null ? `N° ${number} · ${name}` : name}
              </span>
              <span className={cn('text-[10px] shrink-0', isDark ? 'text-slate-500' : 'text-slate-600')}>
                {Math.max(1, Math.round(tx.durationMs / 1000))}s
              </span>
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
