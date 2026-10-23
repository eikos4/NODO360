import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Loader2, Play, X } from 'lucide-react';
import { api } from '../../lib/api';

export type InstagramReel = {
  id: string;
  caption: string;
  permalink: string;
  embedUrl: string;
  thumbnailUrl: string | null;
  timestamp: string | null;
};

export type InstagramFeed = {
  username: string;
  profileUrl: string;
  reelsUrl: string;
  source: 'graph' | 'profile' | 'none';
  reels: InstagramReel[];
};

type Tone = {
  hairline: string;
  card: string;
  cardHover: string;
  ink: string;
  muted: string;
  ghostBtn: string;
};

export function AyudaInstagramReels({ t }: { t: Tone }) {
  const [open, setOpen] = useState<InstagramReel | null>(null);
  const feedQ = useQuery({
    queryKey: ['ayuda-instagram-reels'],
    queryFn: async () => (await api.get<InstagramFeed>('/ayuda/instagram-reels')).data,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
    retry: 1,
  });

  const feed = feedQ.data;
  const username = feed?.username ?? 'nodo360.ia';
  const profileUrl = feed?.profileUrl ?? 'https://www.instagram.com/nodo360.ia/';
  const reelsUrl = feed?.reelsUrl ?? 'https://www.instagram.com/nodo360.ia/reels/';
  const reels = feed?.reels ?? [];

  return (
    <div className="mt-10">
      {feedQ.isLoading && (
        <p className={`flex items-center gap-2 text-sm ${t.muted}`}>
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando reels de @{username}…
        </p>
      )}

      {reels.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reels.map((reel) => (
            <button
              key={reel.id}
              type="button"
              onClick={() => setOpen(reel)}
              className={`group text-left overflow-hidden rounded-2xl border transition-colors ${t.hairline} ${t.card} ${t.cardHover}`}
            >
              <div className="relative aspect-[9/16] bg-[#070b12]">
                {reel.thumbnailUrl ? (
                  <img src={reel.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <span className="keep-on-color absolute inset-0 grid place-items-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-red-600 text-white shadow-lg shadow-black/40 group-hover:scale-105 transition-transform">
                    <Play className="w-5 h-5 ml-0.5" />
                  </span>
                </span>
                <p className="keep-on-color absolute left-3 right-3 bottom-3 line-clamp-3 text-sm font-semibold text-white">
                  {reel.caption || 'Reel Nodo360'}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : !feedQ.isLoading ? (
        <div className={`overflow-hidden rounded-3xl border ${t.hairline} ${t.card}`}>
          <iframe
            title={`Instagram @${username}`}
            src={`${profileUrl}embed`}
            className="w-full min-h-[620px] bg-white"
          />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={reelsUrl}
          target="_blank"
          rel="noreferrer"
          className="keep-on-color inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500"
        >
          <Play className="w-4 h-4" />
          Ver reels
        </a>
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${t.ghostBtn}`}
        >
          <ExternalLink className="w-4 h-4" />
          @{username}
        </a>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" onClick={() => setOpen(null)}>
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="keep-on-color absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <iframe
              title={open.caption || 'Reel Nodo360'}
              src={open.embedUrl}
              className="aspect-[9/16] w-full"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
            />
            <a
              href={open.permalink}
              target="_blank"
              rel="noreferrer"
              className="keep-on-color flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white/90 hover:text-white"
            >
              Abrir en Instagram <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
