import { Injectable, Logger } from '@nestjs/common';

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

const TTL_MS = 12 * 60 * 1000;
const IG_APP_ID = '936619743392459';

@Injectable()
export class InstagramReelsService {
  private readonly log = new Logger(InstagramReelsService.name);
  private cache: { at: number; payload: InstagramFeed } | null = null;

  private username() {
    return (process.env.INSTAGRAM_USERNAME || 'nodo360.ia').replace(/^@/, '').trim();
  }

  async listReels(): Promise<InstagramFeed> {
    if (this.cache && Date.now() - this.cache.at < TTL_MS) {
      return this.cache.payload;
    }
    const username = this.username();
    const empty: InstagramFeed = {
      username,
      profileUrl: `https://www.instagram.com/${username}/`,
      reelsUrl: `https://www.instagram.com/${username}/reels/`,
      source: 'none',
      reels: [],
    };

    try {
      const fromGraph = await this.fromGraphApi(username, empty);
      if (fromGraph.reels.length) {
        this.cache = { at: Date.now(), payload: fromGraph };
        return fromGraph;
      }
    } catch (err) {
      this.log.warn(`Instagram Graph: ${err instanceof Error ? err.message : err}`);
    }

    try {
      const fromProfile = await this.fromPublicProfile(username, empty);
      if (fromProfile.reels.length) {
        this.cache = { at: Date.now(), payload: fromProfile };
        return fromProfile;
      }
    } catch (err) {
      this.log.warn(`Instagram perfil: ${err instanceof Error ? err.message : err}`);
    }

    this.cache = { at: Date.now(), payload: empty };
    return empty;
  }

  private async fromGraphApi(username: string, base: InstagramFeed): Promise<InstagramFeed> {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
    if (!token) return base;

    const userId = process.env.INSTAGRAM_USER_ID?.trim() || 'me';
    const hosts = ['https://graph.instagram.com', 'https://graph.facebook.com/v21.0'];
    const fields = 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp';

    for (const host of hosts) {
      const url = `${host}/${userId}/media?fields=${fields}&limit=24&access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) continue;
      const json = (await res.json()) as { data?: Record<string, string>[] };
      const reels = (json.data ?? [])
        .filter((item) => {
          const type = String(item.media_type || '').toUpperCase();
          const product = String(item.media_product_type || '').toUpperCase();
          return product === 'REELS' || type === 'VIDEO';
        })
        .map((item) => this.toReel(item))
        .filter((item): item is InstagramReel => Boolean(item))
        .slice(0, 12);
      if (reels.length) return { ...base, source: 'graph', reels };
    }
    return base;
  }

  private async fromPublicProfile(username: string, base: InstagramFeed): Promise<InstagramFeed> {
    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'X-IG-App-ID': IG_APP_ID,
      },
    });
    if (!res.ok) return base;
    const json = (await res.json()) as {
      data?: {
        user?: {
          edge_owner_to_timeline_media?: { edges?: { node?: Record<string, any> }[] };
          edge_felix_video_timeline?: { edges?: { node?: Record<string, any> }[] };
        };
      };
    };
    const user = json.data?.user;
    const nodes = [
      ...(user?.edge_felix_video_timeline?.edges ?? []),
      ...(user?.edge_owner_to_timeline_media?.edges ?? []),
    ]
      .map((edge) => edge.node)
      .filter(Boolean);

    const seen = new Set<string>();
    const reels: InstagramReel[] = [];
    for (const node of nodes) {
      const product = String(node.product_type || '');
      const isReel = node.is_video && (product === 'clips' || product === 'reels' || product === 'igtv' || product === '');
      if (!isReel || !node.shortcode || seen.has(node.shortcode)) continue;
      seen.add(node.shortcode);
      const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text ?? '';
      reels.push({
        id: String(node.id || node.shortcode),
        caption: String(caption).slice(0, 180),
        permalink: `https://www.instagram.com/reel/${node.shortcode}/`,
        embedUrl: `https://www.instagram.com/reel/${node.shortcode}/embed`,
        thumbnailUrl: node.display_url ?? node.thumbnail_src ?? null,
        timestamp: node.taken_at_timestamp ? new Date(node.taken_at_timestamp * 1000).toISOString() : null,
      });
      if (reels.length >= 12) break;
    }
    return reels.length ? { ...base, source: 'profile', reels } : base;
  }

  private toReel(item: Record<string, string>): InstagramReel | null {
    const permalink = item.permalink;
    if (!permalink) return null;
    const code = permalink.match(/\/(?:reel|p|tv)\/([^/?#]+)/)?.[1];
    return {
      id: item.id || permalink,
      caption: (item.caption || '').slice(0, 180),
      permalink,
      embedUrl: code
        ? `https://www.instagram.com/reel/${code}/embed`
        : `${permalink.replace(/\/$/, '')}/embed`,
      thumbnailUrl: item.thumbnail_url || item.media_url || null,
      timestamp: item.timestamp || null,
    };
  }
}
