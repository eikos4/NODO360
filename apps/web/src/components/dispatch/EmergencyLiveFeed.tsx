import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Headphones, Loader2, Mic, Play, Radio, Volume2 } from 'lucide-react';
import { api } from '../../lib/api';
import { timelineTone, TIMELINE_TONE_CLASS } from '../../lib/incident-timeline';
import {
  getRadioSocket,
  incidentChannelId,
  radioSpeakerParts,
  resolveRadioAudioUrl,
  type RadioTx,
} from '../../lib/radio-socket';

type TimelineEvent = {
  id: string;
  kind: string;
  label: string;
  note?: string | null;
  occurredAt: string;
  author?: { id: string; firstName: string; lastName: string } | null;
};

type FeedItem =
  | { sortAt: number; kind: 'timeline'; event: TimelineEvent }
  | { sortAt: number; kind: 'radio'; tx: RadioTx };

type Props = {
  incidentId: string;
  isDark?: boolean;
  compact?: boolean;
};

function fmtTime(isoOrMs: string | number) {
  const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs);
  return d.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function EmergencyLiveFeed({ incidentId, isDark = true, compact }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [radioClips, setRadioClips] = useState<RadioTx[]>([]);
  const [talkerName, setTalkerName] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery<TimelineEvent[]>({
    queryKey: ['incident-timeline', incidentId],
    queryFn: () => api.get(`/incident-timeline/incident/${incidentId}`).then((r) => r.data),
    enabled: !!incidentId,
    refetchInterval: 8000,
  });

  const channelId = incidentChannelId(incidentId);

  useEffect(() => {
    if (!incidentId) return;
    const token = localStorage.getItem('nodo360_token');
    if (!token) return;

    const applyTx = (tx: RadioTx): RadioTx => ({
      ...tx,
      audioUrl: resolveRadioAudioUrl(tx.audioUrl),
    });

    const mergeClips = (incoming: RadioTx[]) => {
      setRadioClips((prev) => {
        const byId = new Map(prev.map((c) => [c.id, c]));
        for (const clip of incoming) byId.set(clip.id, applyTx(clip));
        return [...byId.values()].sort((a, b) => a.at - b.at).slice(-40);
      });
    };

    const loadRecent = () => {
      void api
        .get<{ recent?: RadioTx[]; state?: { recent?: RadioTx[]; talker?: { speakerName: string } | null } }>(
          `/radio/channels/${encodeURIComponent(channelId)}/recent`,
        )
        .then(({ data }) => {
          const clips = data?.state?.recent ?? data?.recent ?? [];
          if (clips.length) mergeClips(clips);
          setTalkerName(data?.state?.talker?.speakerName ?? null);
        })
        .catch(() => undefined);
    };

    loadRecent();
    const poll = window.setInterval(loadRecent, 4000);

    const socket = getRadioSocket(token);
    const onTx = (tx: RadioTx) => {
      if (tx.channelId !== channelId) return;
      mergeClips([applyTx(tx)]);
    };
    const onState = (s: { channelId: string; talker?: { speakerName: string } | null; recent?: RadioTx[] }) => {
      if (s.channelId !== channelId) return;
      setTalkerName(s.talker?.speakerName ?? null);
      if (s.recent?.length) mergeClips(s.recent);
    };

    socket.on('tx:new', onTx);
    socket.on('channel:state', onState);

    return () => {
      window.clearInterval(poll);
      socket.off('tx:new', onTx);
      socket.off('channel:state', onState);
    };
  }, [channelId, incidentId]);

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...events.map((event) => ({
        sortAt: new Date(event.occurredAt).getTime(),
        kind: 'timeline' as const,
        event,
      })),
      ...radioClips.map((tx) => ({
        sortAt: tx.at,
        kind: 'radio' as const,
        tx,
      })),
    ];
    return items.sort((a, b) => a.sortAt - b.sortAt);
  }, [events, radioClips]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [feed.length, talkerName]);

  const playClip = async (tx: RadioTx) => {
    const url = resolveRadioAudioUrl(tx.audioUrl);
    if (!url) return;
    try {
      if (!audioRef.current) audioRef.current = new Audio();
      const audio = audioRef.current;
      audio.setAttribute('playsinline', 'true');
      audio.onended = () => setPlayingId(null);
      audio.src = url;
      setPlayingId(tx.id);
      await audio.play();
    } catch {
      setPlayingId(null);
    }
  };

  if (isLoading && !events.length && !radioClips.length) {
    return (
      <div className={`flex items-center justify-center gap-2 py-8 text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando bitácora y radio…
      </div>
    );
  }

  if (!feed.length && !talkerName) {
    return (
      <div className={`text-center py-8 space-y-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
        <Headphones className={`w-8 h-8 mx-auto opacity-40 ${isDark ? 'text-violet-300' : 'text-violet-600'}`} />
        <p className="text-sm font-semibold">Escuchando la emergencia…</p>
        <p className="text-xs px-4">
          Acá aparecen los registros de bitácora y lo que van hablando los bomberos por radio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {talkerName && (
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
          isDark
            ? 'border-amber-500/40 bg-amber-500/15 text-amber-100'
            : 'border-amber-400 bg-amber-50 text-amber-950'
        }`}>
          <Volume2 className="w-4 h-4 animate-pulse shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider opacity-80">Al aire ahora</p>
            <p className="text-sm font-bold truncate">{talkerName}</p>
          </div>
          <Mic className="w-4 h-4 shrink-0 opacity-70" />
        </div>
      )}

      <ol className={`relative ${compact ? 'space-y-2.5' : 'space-y-3'} pl-1`}>
        <div
          className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-red-500/80 via-violet-500/50 to-emerald-500/30"
          aria-hidden
        />
        {feed.map((item, idx) => {
          const isLast = idx === feed.length - 1;
          if (item.kind === 'timeline') {
            const ev = item.event;
            const tone = TIMELINE_TONE_CLASS[timelineTone(ev.kind)];
            return (
              <li key={`t-${ev.id}`} className="relative flex gap-3">
                <div className="relative z-10 shrink-0">
                  <span
                    className={`flex w-[31px] h-[31px] items-center justify-center rounded-full ring-4 ${tone.dot} ${tone.ring} ${
                      isLast ? 'ops-timeline-live' : ''
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white/90" />
                  </span>
                </div>
                <div className={`flex-1 min-w-0 rounded-xl border px-3 py-2.5 ${tone.badge}`}>
                  <p className="text-[10px] font-mono tabular-nums opacity-80">{fmtTime(ev.occurredAt)}</p>
                  <p className="text-sm font-bold leading-tight">{ev.label}</p>
                  {ev.note && (
                    <p className="text-xs mt-1 leading-relaxed opacity-90 whitespace-pre-wrap">{ev.note}</p>
                  )}
                  {ev.author && (
                    <p className="text-[10px] mt-1.5 opacity-60">
                      {ev.author.firstName} {ev.author.lastName}
                    </p>
                  )}
                </div>
              </li>
            );
          }

          const tx = item.tx;
          const { number, name } = radioSpeakerParts(tx);
          const active = playingId === tx.id;
          return (
            <li key={`r-${tx.id}`} className="relative flex gap-3">
              <div className="relative z-10 shrink-0">
                <span
                  className={`flex w-[31px] h-[31px] items-center justify-center rounded-full ring-4 ring-violet-500/40 bg-violet-600 ${
                    isLast || talkerName ? 'ops-timeline-live' : ''
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-white" />
                </span>
              </div>
              <button
                type="button"
                onClick={() => void playClip(tx)}
                className={`flex-1 min-w-0 rounded-xl border px-3 py-2.5 text-left transition ${
                  active
                    ? isDark
                      ? 'border-violet-400/60 bg-violet-500/20 text-violet-50'
                      : 'border-violet-400 bg-violet-50 text-violet-950'
                    : isDark
                      ? 'border-violet-500/30 bg-violet-500/10 text-violet-100 hover:border-violet-400/50'
                      : 'border-violet-200 bg-violet-50/80 text-violet-950 hover:border-violet-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-mono tabular-nums opacity-80">{fmtTime(tx.at)}</p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-violet-400 mb-0.5">
                      Radio · transmisión
                    </p>
                    <p className="text-sm font-bold leading-tight truncate">
                      {number != null ? `N° ${number} · ${name}` : name}
                    </p>
                    <p className="text-[10px] mt-0.5 opacity-70">{tx.role || 'Bombero'}</p>
                  </div>
                  <span className={`shrink-0 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black ${
                    active
                      ? 'bg-violet-600 text-white'
                      : isDark
                        ? 'bg-violet-500/20 text-violet-200'
                        : 'bg-violet-200 text-violet-900'
                  }`}>
                    {active ? <Volume2 className="w-3 h-3 animate-pulse" /> : <Play className="w-3 h-3" />}
                    {Math.max(1, Math.round(tx.durationMs / 1000))}s
                  </span>
                </div>
              </button>
            </li>
          );
        })}
        <div ref={bottomRef} />
      </ol>
    </div>
  );
}
