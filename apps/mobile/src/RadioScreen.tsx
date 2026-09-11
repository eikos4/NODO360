import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Radio, Users, Volume2 } from 'lucide-react';
import { api } from './lib/api';
import {
  disconnectRadioSocket,
  getRadioSocket,
  incidentChannelId,
  pickRecorderMime,
  type RadioChannelState,
  type RadioTx,
} from './lib/radio';
import { getSessionToken } from './platform/session';
import type { ActiveIncident, AuthUser } from './types';
import type { EmergencyResponseStatus } from '@nodo360/shared';

const MAX_MS = 15_000;

function canTalkOnIncident(status: EmergencyResponseStatus | null, role?: string) {
  if (status === 'GOING' || status === 'ON_SCENE') return true;
  return role === 'OPERADOR_CENTRAL' || role === 'COMANDANTE' || role === 'CAPITAN' || role === 'SUPER_ADMIN';
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
  const noticeRef = useRef(onNotice);
  noticeRef.current = onNotice;

  const channelId = useMemo(
    () => (incident ? incidentChannelId(incident.id) : null),
    [incident],
  );

  const canTalk = canTalkOnIncident(status, user.role);

  const playTx = useCallback(async (tx: RadioTx, force = false) => {
    if (!force && tx.userId === user.id) return;
    try {
      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      audio.src = tx.audioUrl;
      setLastPlayedId(tx.id);
      setNowPlaying(tx.speakerName);
      await audio.play();
      setAudioReady(true);
      audio.onended = () => setNowPlaying(null);
    } catch {
      setAudioReady(false);
    }
  }, [user.id]);

  useEffect(() => {
    if (!channelId) {
      setConnected(false);
      setState(null);
      setNowPlaying(null);
      disconnectRadioSocket();
      return;
    }
    let socket: ReturnType<typeof getRadioSocket> | null = null;
    let cancelled = false;
    const handlers: {
      onConnect?: () => void;
      onDisconnect?: () => void;
      onState?: (next: RadioChannelState) => void;
      onTx?: (tx: RadioTx) => void;
    } = {};

    const detach = () => {
      if (!socket) return;
      socket.emit('channel:leave', { channelId });
      if (handlers.onConnect) socket.off('connect', handlers.onConnect);
      if (handlers.onDisconnect) socket.off('disconnect', handlers.onDisconnect);
      if (handlers.onState) socket.off('channel:state', handlers.onState);
      if (handlers.onTx) socket.off('tx:new', handlers.onTx);
    };

    void getSessionToken().then((token) => {
      if (!token || cancelled) return;
      socket = getRadioSocket(token);

      handlers.onConnect = () => {
        setConnected(true);
        socket?.emit('channel:join', { channelId }, (res: { ok?: boolean; state?: RadioChannelState; reason?: string }) => {
          if (res?.ok && res.state) setState(res.state);
          else if (res?.reason) noticeRef.current(res.reason);
        });
      };
      handlers.onDisconnect = () => setConnected(false);
      handlers.onState = (next) => {
        if (next.channelId === channelId) setState(next);
      };
      handlers.onTx = (tx) => {
        if (tx.channelId !== channelId) return;
        setState((prev) =>
          prev
            ? { ...prev, recent: [tx, ...(prev.recent ?? []).filter((item) => item.id !== tx.id)].slice(0, 16) }
            : prev,
        );
        void playTx(tx);
      };

      socket.on('connect', handlers.onConnect);
      socket.on('disconnect', handlers.onDisconnect);
      socket.on('channel:state', handlers.onState);
      socket.on('tx:new', handlers.onTx);
      if (socket.connected) handlers.onConnect();
      else socket.connect();
      if (cancelled) detach();
    });

    return () => {
      cancelled = true;
      detach();
    };
  }, [channelId, playTx]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const finishPtt = useCallback(async () => {
    const token = await getSessionToken();
    if (!token || !channelId) return;
    const socket = getRadioSocket(token);
    const recorder = mediaRecorderRef.current;
    setHolding(false);

    const stopPtt = () => socket.emit('ptt:stop', { channelId });
    if (!recorder || recorder.state === 'inactive') {
      stopPtt();
      stopTracks();
      return;
    }

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      try { recorder.stop(); } catch { resolve(); }
    });
    mediaRecorderRef.current = null;
    stopTracks();

    const mime = recorder.mimeType || 'audio/webm';
    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];
    const durationMs = Math.min(MAX_MS, Date.now() - startedAtRef.current);
    if (blob.size < 800) {
      stopPtt();
      onNotice('Transmisión muy corta');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      const ext = mime.includes('mp4') ? 'm4a' : mime.includes('aac') ? 'aac' : 'webm';
      form.append('file', blob, `radio-${Date.now()}.${ext}`);
      const { data } = await api.post<{ audioUrl: string }>('/radio/upload', form);
      socket.emit('tx:broadcast', {
        channelId,
        audioUrl: data.audioUrl,
        durationMs,
        id: `tx_${Date.now()}`,
      });
    } catch {
      stopPtt();
      onNotice('No se pudo enviar la transmisión');
    } finally {
      setUploading(false);
    }
  }, [channelId, onNotice]);

  const startPtt = useCallback(async () => {
    if (!channelId || !canTalk || holding || uploading) return;
    const token = await getSessionToken();
    if (!token) return;
    const socket = getRadioSocket(token);
    const ack = await new Promise<{ ok?: boolean; reason?: string; talker?: { speakerName: string } }>((resolve) => {
      socket.emit('ptt:start', { channelId }, (res: { ok?: boolean; reason?: string; talker?: { speakerName: string } }) => {
        resolve(res || { ok: false });
      });
    });
    if (!ack?.ok) {
      onNotice(ack?.talker ? `Habla: ${ack.talker.speakerName}` : ack?.reason || 'Canal ocupado');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const mime = pickRecorderMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(250);
      setHolding(true);
      setAudioReady(true);
      window.setTimeout(() => {
        if (mediaRecorderRef.current === recorder && recorder.state === 'recording') void finishPtt();
      }, MAX_MS);
    } catch {
      socket.emit('ptt:stop', { channelId });
      onNotice('No se pudo acceder al micrófono');
    }
  }, [canTalk, channelId, finishPtt, holding, onNotice, uploading]);

  const talker = state?.talker;
  const busyOther = Boolean(talker && !holding);

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
            <i className={connected ? 'on' : ''} />
            {connected ? 'En canal' : 'Conectando…'}
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
            void audio.play().catch(() => undefined);
            setAudioReady(true);
            onNotice('Audio de radio activado');
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
        disabled={!connected || uploading || (busyOther && !holding)}
        onPointerDown={(event) => {
          event.preventDefault();
          if (!canTalk) {
            onNotice('Marcá VOY para hablar en el canal de emergencia');
            return;
          }
          (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
          void startPtt();
        }}
        onPointerUp={() => void finishPtt()}
        onPointerCancel={() => void finishPtt()}
        onPointerLeave={() => {
          if (holding) void finishPtt();
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
