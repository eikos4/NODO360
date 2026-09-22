export type NodotrackTone = {
  shell: string;
  shellGlowA: string;
  shellGlowB: string;
  ink: string;
  muted: string;
  soft: string;
  accent: string;
  accentSoft: string;
  border: string;
  card: string;
  header: string;
  cardHover: string;
  pinKey: string;
  pinKeyHover: string;
  actionUsed: string;
  actionIdle: string;
  brandNodo: string;
  brandTrack: string;
  brandSub: string;
  loader: string;
  mapTheme: 'light' | 'dark';
  metaThemeColor: string;
};

export function nodotrackTone(isDark: boolean): NodotrackTone {
  if (isDark) {
    return {
      shell: 'bg-[#06090e] text-slate-100',
      shellGlowA: 'bg-emerald-500/15',
      shellGlowB: 'bg-emerald-700/10',
      ink: 'text-white',
      muted: 'text-slate-400',
      soft: 'text-slate-300',
      accent: 'text-emerald-400',
      accentSoft: 'text-emerald-300/80',
      border: 'border-emerald-500/20',
      card: 'bg-[#0b1220]',
      header: 'bg-[#07140f] border-emerald-500/20',
      cardHover: 'hover:border-emerald-400 hover:bg-emerald-500/10',
      pinKey: 'bg-emerald-950/80 text-white border border-emerald-500/20 hover:bg-emerald-900/80',
      pinKeyHover: '',
      actionUsed: 'border-emerald-400/40 bg-emerald-500/15',
      actionIdle: 'border-white/10 bg-white/5 hover:bg-emerald-500/10',
      brandNodo: 'text-white',
      brandTrack: 'text-emerald-400',
      brandSub: 'text-emerald-400',
      loader: 'text-emerald-300',
      mapTheme: 'dark',
      metaThemeColor: '#082a20',
    };
  }
  return {
    shell: 'bg-[#eef3f7] text-slate-800',
    shellGlowA: 'bg-emerald-400/20',
    shellGlowB: 'bg-emerald-600/10',
    ink: 'text-slate-900',
    muted: 'text-slate-600',
    soft: 'text-slate-700',
    accent: 'text-emerald-700',
    accentSoft: 'text-emerald-600',
    border: 'border-emerald-200',
    card: 'bg-white',
    header: 'bg-white border-emerald-200 shadow-sm',
    cardHover: 'hover:border-emerald-400 hover:bg-emerald-50',
    pinKey:
      'bg-white text-slate-900 border border-emerald-200 hover:bg-emerald-50 shadow-sm',
    pinKeyHover: '',
    actionUsed: 'border-emerald-400 bg-emerald-50',
    actionIdle: 'border-slate-200 bg-slate-50 hover:bg-emerald-50',
    brandNodo: 'text-slate-900',
    brandTrack: 'text-emerald-600',
    brandSub: 'text-emerald-700',
    loader: 'text-emerald-700',
    mapTheme: 'light',
    metaThemeColor: '#ecfdf5',
  };
}
