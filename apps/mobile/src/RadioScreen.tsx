import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Radio, Users, Volume2 } from 'lucide-react';
import { api, errorMessage } from './lib/api';
import {
  disconnectRadioSocket,
  getRadioSocket,
  incidentChannelId,
  mergeRadioTx,
  pickRecorderMime,
  prepareRadioAudio,
  resolveRadioAudioUrl,
  stopRadioRecorder,
  unlockRadioAudio,
  uploadRadioClip,
  type RadioChannelState,
  type RadioTx,
} from './lib/radio';
import { getSessionToken } from './platform/session';
import type { ActiveIncident, AuthUser } from './types';
import type { EmergencyResponseStatus } from '@nodo360/shared';

const MAX_MS = 15_000;

function canTalkOnIncident(status: EmergencyResponseStatus | null, user?: { role?: string; roles?: string[] }) {
  if (status === 'GOING' || status === 'ON_SCENE') return true;
  const roles = user?.roles?.length ? user.roles : [user?.role];
  return roles.some((role) =>
    role === 'OPERADOR_CENTRAL' || role === 'COMANDANTE' || role === 'CAPITAN' || role === 'SUPER_ADMIN' || role === 'KODESK',
  );
}

function applyTx(tx: RadioTx): RadioTx {
  return { ...tx, audioUrl: resolveRadioAudioUrl(tx.audioUrl) };
}

function applyState(state: RadioChannelState): RadioChannelState {
  return {
    ...state,
    recent: (state.recent ?? []).map(applyTx),
  };
}

export function RadioScreen({
  user,
  incident,
  status,
  onNotice,
}: {
  user: AuthUser;
  incident: ActiveIncident | null;
  status: EmergencyResponseStatus | null;
  onNotice: (message: string) => void;
}) {
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [state, setState] = useState<RadioChannelState | null>(null);
  const [holding, setHolding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [lastPlayedId, setLastPlayedId] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioReadyRef = useRef(false);
  const pendingTxRef = useRef<RadioTx | null>(null);
  const noticeRef = useRef(onNotice);
  const pttRef = useRef({ starting: false, recording: false, finishing: false, stopQueued: false });
  noticeRef.current = onNotice;

  const channelId = useMemo(
    () => (incident ? incidentChannelId(incident.id) : null),
    [incident],
  );

  const canTalk = canTalkOnIncident(status, user);

  const playTx = useCallback(async (tx: RadioTx, force = false) => {
    if (!force && tx.userId === user.id) return;
    const url = resolveRadioAudioUrl(tx.audioUrl);
    if (!url) return;
    try {
      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      prepareRadioAudio(audio);
      audio.src = url;
      setLastPlayedId(tx.id);
      setNowPlaying(tx.speakerName);
      await audio.play();
      audioReadyRef.current = true;
      setAudioReady(true);
      audio.onended = () => setNowPlaying(null);
    } catch {
      pendingTxRef.current = tx;
      audioReadyRef.current = false;
      setAudioReady(false);
    }
  }, [user.id]);

  const playTxRef = useRef(playTx);
  playTxRef.current = playTx;

  useEffect(() => {
    if (!channelId) {
      setConnected(false);
      setJoined(false);
      setState(null);
      setNowPlaying(null);
      disconnectRadioSocket();
      return;
    }

    let socket: ReturnType<typeof getRadioSocket> | null = null;
    let cancelled = false;
    let joinTimer: number | null = null;
    const handlers: {
      onConnect?: () => void;
      onDisconnect?: () => void;
      onReady?: () => void;
      onState?: (next: RadioChannelState) => void;
      onTx?: (tx: RadioTx) => void;
    } = {};

    const joinChannel = (tries = 6) => {
      if (cancelled || !socket) return;
      socket.emit(
        'channel:join',
        { channelId },
        (res: { ok?: boolean; state?: RadioChannelState; reason?: string }) => {
          if (cancelled) return;
          if (res?.ok && res.state) {
            setJoined(true);
            setState(applyState(res.state));
            return;
          }
          if (tries > 1) {
            joinTimer = window.setTimeout(() => joinChannel(tries - 1), 400);
            return;
          }
          setJoined(false);
          if (res?.reason) noticeRef.current(res.reason);
        },
      );
    };

    const detach = () => {
      if (joinTimer) window.clearTimeout(joinTimer);
      if (!socket) return;
      socket.emit('channel:leave', { channelId });
      if (handlers.onConnect) socket.off('connect', handlers.onConnect);
      if (handlers.onDisconnect) socket.off('disconnect', handlers.onDisconnect);
      if (handlers.onReady) socket.off('radio.ready', handlers.onReady);
      if (handlers.onState) socket.off('channel:state', handlers.onState);
      if (handlers.onTx) socket.off('tx:new', handlers.onTx);
    };

    void getSessionToken().then((token) => {
      if (!token || cancelled) return;
      socket = getRadioSocket(token);

      handlers.onConnect = () => {
        setConnected(true);
        joinChannel();
      };
      handlers.onReady = () => joinChannel();
      handlers.onDisconnect = () => {
        setConnected(false);
        setJoined(false);
      };
      handlers.onState = (next) => {
        if (next.channelId !== channelId) return;
        setJoined(true);
        setState(applyState(next));
      };
      handlers.onTx = (tx) => {
        if (tx.channelId !== channelId) return;
        const clip = applyTx(tx);
        setState((prev) => mergeRadioTx(prev, clip, channelId));
        void playTxRef.current(clip);
      };

      socket.on('connect', handlers.onConnect);
      socket.on('disconnect', handlers.onDisconnect);
      socket.on('radio.ready', handlers.onReady);
      socket.on('channel:state', handlers.onState);
      socket.on('tx:new', handlers.onTx);
      if (socket.connected) handlers.onConnect();
      else socket.connect();
      if (cancelled) detach();
    });

    const poll = window.setInterval(() => {
      void api
        .get<{ recent?: RadioTx[]; state?: RadioChannelState }>(
          `/radio/channels/${encodeURIComponent(channelId)}/recent`,
        )
        .then(({ data }) => {
          const clips = (data?.state?.recent ?? data?.recent ?? []).map(applyTx);
          if (!clips.length) return;
          setState((prev) => {
            if (!prev) {
              return applyState(
                data.state ?? {
                  channelId,
                  listeners: 0,
                  participants: [],
                  talker: null,
                  recent: clips,
                },
              );
            }
            const byId = new Map(prev.recent.map((item) => [item.id, item]));
            for (const clip of clips) byId.set(clip.id, clip);
            return {
              ...prev,
              recent: [...byId.values()].sort((a, b) => b.at - a.at).slice(0, 16),
            };
          });
        })
        .catch(() => undefined);
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      detach();
    };
  }, [channelId]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
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

    const token = await getSessionToken();
    if (!token || !channelId) {
      ptt.finishing = false;
      return;
    }
    const socket = getRadioSocket(token);
    const recorder = mediaRecorderRef.current;
    setHolding(false);

    const stopPtt = () => socket.emit('ptt:stop', { channelId });
    if (!recorder) {
      stopPtt();
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
      stopPtt();
      onNotice(durationMs < 500
        ? 'Mantené el botón al menos un segundo'
        : 'El teléfono no grabó audio. Revisá el permiso de micrófono.');
      ptt.finishing = false;
      return;
    }

    setUploading(true);
    try {
      const audioUrl = resolveRadioAudioUrl(
        await uploadRadioClip(blob, recorder.mimeType || blob.type),
      );
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
        const clip = applyTx(ack.tx);
        setState((prev) => mergeRadioTx(prev, clip, channelId));
      } else {
        stopPtt();
        onNotice(ack?.reason || 'No se pudo publicar en el canal');
      }
    } catch (err) {
      stopPtt();
      onNotice(errorMessage(err) || 'No se pudo enviar la transmisión');
    } finally {
      setUploading(false);
      ptt.finishing = false;
    }
  }, [channelId, onNotice]);

  const startPtt = useCallback(async () => {
    const ptt = pttRef.current;
    if (!channelId || !canTalk || ptt.starting || ptt.recording || ptt.finishing || uploading) return;
    ptt.starting = true;
    ptt.stopQueued = false;
    const token = await getSessionToken();
    if (!token) {
      ptt.starting = false;
      return;
    }
    const socket = getRadioSocket(token);
    if (!audioRef.current) audioRef.current = new Audio();
    await unlockRadioAudio(audioRef.current);
    audioReadyRef.current = true;
    setAudioReady(true);
    if (pendingTxRef.current) {
      const pending = pendingTxRef.current;
      pendingTxRef.current = null;
      void playTx(pending, true);
    }

    try {
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
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();

      const ack = await new Promise<{ ok?: boolean; reason?: string; talker?: { speakerName: string } }>((resolve) => {
        socket.emit('ptt:start', { channelId }, (res: { ok?: boolean; reason?: string; talker?: { speakerName: string } }) => {
          resolve(res || { ok: false });
        });
      });
      if (!ack?.ok) {
        try { recorder.stop(); } catch { /* */ }
        stopTracks();
        ptt.starting = false;
        onNotice(ack?.talker ? `Habla: ${ack.talker.speakerName}` : ack?.reason || 'Canal ocupado');
        return;
      }

      ptt.recording = true;
      ptt.starting = false;
      setHolding(true);
      window.setTimeout(() => {
        if (mediaRecorderRef.current === recorder && recorder.state === 'recording') void finishPtt();
      }, MAX_MS);
      if (ptt.stopQueued) void finishPtt();
    } catch {
      ptt.starting = false;
      ptt.recording = false;
      socket.emit('ptt:stop', { channelId });
      stopTracks();
      onNotice('No se pudo acceder al micrófono');
    }
  }, [canTalk, channelId, finishPtt, onNotice, playTx, uploading]);

  const talker = state?.talker;
  const busyOther = Boolean(talker && !holding);
  const inChannel = connected && joined;

  if (!incident) {
    return (
      <section className="standby radio-idle">
        <span><Radio /></span>
        <h2>Sin emergencias activas</h2>
        <p>La radio se activa solo cuando hay un despacho. Quedate atento: al sonar la alarma vas a poder escuchar y hablar en el canal.</p>
      </section>
    );
  }

  return (
    <section className="radio-screen">
      <header className="radio-head">
        <Radio />
        <div>
          <b>Radio de emergencia</b>
          <small>
            <i className={inChannel ? 'on' : ''} />
            {inChannel ? 'En canal' : connected ? 'Entrando al canal…' : 'Conectando…'}
            <span><Users /> {state?.listeners ?? 0}</span>
          </small>
        </div>
      </header>

      <p className="radio-channel">
        {incident.emergencyCodeId || incident.code} · {incident.type}
      </p>

      {talker && (
        <div className="radio-live">
          <Volume2 />
          <span>Al aire · {talker.speakerName}</span>
        </div>
      )}
      {nowPlaying && !talker && (
        <div className="radio-live play">
          <Volume2 />
          <span>Reproduciendo · {nowPlaying}</span>
        </div>
      )}

      {!audioReady && (
        <button
          type="button"
          className="radio-unlock"
          onClick={() => {
            const audio = audioRef.current ?? new Audio();
            audioRef.current = audio;
            void unlockRadioAudio(audio).then(async () => {
              audioReadyRef.current = true;
              setAudioReady(true);
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach((track) => track.stop());
              } catch {
                onNotice('Activá el micrófono para hablar por radio');
              }
              const pending = pendingTxRef.current;
              pendingTxRef.current = null;
              if (pending) void playTx(pending, true);
              onNotice('Audio de radio activado');
            });
          }}
        >
          <Volume2 /> Activar escucha
        </button>
      )}

      {state?.participants && state.participants.length > 0 && (
        <div className="radio-people">
          {state.participants.slice(0, 8).map((person) => (
            <span key={person.userId}>
              {person.firstName} {person.lastName?.charAt(0) ? `${person.lastName.charAt(0)}.` : ''}
            </span>
          ))}
          {state.participants.length > 8 && <span>+{state.participants.length - 8}</span>}
        </div>
      )}

      <button
        type="button"
        className={`ptt ${holding ? 'hot' : ''} ${!canTalk ? 'listen' : ''}`}
        disabled={!inChannel || uploading || (busyOther && !holding)}
        onPointerDown={(event) => {
          event.preventDefault();
          if (!canTalk) {
            onNotice('Marcá VOY para hablar en el canal de emergencia');
            return;
          }
          try {
            (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
          } catch { /* */ }
          void startPtt();
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          void finishPtt();
        }}
        onPointerCancel={() => void finishPtt()}
        onTouchEnd={(event) => {
          event.preventDefault();
          void finishPtt();
        }}
      >
        {holding ? <Mic /> : uploading ? <MicOff /> : <Mic />}
        <strong>
          {!canTalk
            ? 'Solo escucha'
            : holding
              ? 'Hablando… soltá para enviar'
              : uploading
                ? 'Enviando…'
                : 'Mantener para hablar'}
        </strong>
        <small>Máx. 15 s · un hablante a la vez</small>
      </button>

      {!canTalk && (
        <p className="radio-hint">Para hablar, primero confirmá VOY o En el lugar. Mientras tanto podés escuchar.</p>
      )}

      <div className="radio-log">
        <p>Últimas transmisiones</p>
        {state?.recent?.length ? state.recent.map((tx) => (
          <button
            key={tx.id}
            type="button"
            className={lastPlayedId === tx.id ? 'active' : ''}
            onClick={() => void playTx(tx, true)}
          >
            <span>{tx.speakerName}</span>
            <time>{Math.max(1, Math.round(tx.durationMs / 1000))}s</time>
          </button>
        )) : <p className="empty">Aún no hay audios en este canal.</p>}
      </div>
    </section>
  );
}
