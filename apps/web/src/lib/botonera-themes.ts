export type BotoneraThemeId = 'classic' | 'rapid' | 'command' | 'night' | 'institutional';

export type BotoneraTheme = {
  id: BotoneraThemeId;
  label: string;
  description: string;
  preview: string;
  root: string;
  header: string;
  headerBorder: string;
  panel: string;
  panelBorder: string;
  accent: string;
  accentMuted: string;
  accentText: string;
  text: string;
  textMuted: string;
  input: string;
  keyIdle: string;
  keySelected: string;
  dispatchBtn: string;
  dispatchBtnDisabled: string;
  mapTheme: 'light' | 'dark';
  layout: 'classic' | 'rapid' | 'command' | 'night' | 'institutional';
};

export const BOTONERA_THEMES: Record<BotoneraThemeId, BotoneraTheme> = {
  classic: {
    id: 'classic',
    label: 'Clásica',
    description: 'Slate y rojo — la botonera tradicional NODO360',
    preview: 'bg-slate-900 border-red-600',
    root: 'bg-slate-950 text-white',
    header: 'bg-slate-900',
    headerBorder: 'border-slate-800',
    panel: 'bg-slate-900/60',
    panelBorder: 'border-slate-800',
    accent: 'bg-red-600',
    accentMuted: 'bg-red-600/15 border-red-500/40',
    accentText: 'text-red-400',
    text: 'text-white',
    textMuted: 'text-slate-500',
    input: 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500',
    keyIdle: 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500',
    keySelected: 'ring-2 shadow-lg',
    dispatchBtn: 'bg-red-600 hover:bg-red-500 shadow-red-900/40',
    dispatchBtnDisabled: 'opacity-40',
    mapTheme: 'light',
    layout: 'classic',
  },
  rapid: {
    id: 'rapid',
    label: 'Rápida',
    description: 'Mínima — clave + despacho en 2 toques',
    preview: 'bg-[#050810] border-red-500',
    root: 'bg-[#050810] text-white',
    header: 'bg-[#0a0f1a]/90 backdrop-blur-md',
    headerBorder: 'border-white/10',
    panel: 'bg-white/[0.03]',
    panelBorder: 'border-white/10',
    accent: 'bg-red-600',
    accentMuted: 'bg-red-600/20 border-red-500/40',
    accentText: 'text-red-400',
    text: 'text-white',
    textMuted: 'text-slate-500',
    input: 'bg-white/5 border-white/10 text-white placeholder:text-slate-600',
    keyIdle: 'bg-white/[0.03] border-white/10 hover:border-red-500/40',
    keySelected: 'border-red-500 bg-red-600/20 shadow-red-900/30',
    dispatchBtn: 'bg-red-600 hover:bg-red-500 shadow-red-900/40',
    dispatchBtnDisabled: 'opacity-40',
    mapTheme: 'dark',
    layout: 'rapid',
  },
  command: {
    id: 'command',
    label: 'Comando',
    description: 'Ámbar militar — cuarteles siempre visibles',
    preview: 'bg-zinc-950 border-amber-500',
    root: 'bg-zinc-950 text-amber-50',
    header: 'bg-zinc-900',
    headerBorder: 'border-amber-900/50',
    panel: 'bg-zinc-900/80',
    panelBorder: 'border-amber-900/40',
    accent: 'bg-amber-600',
    accentMuted: 'bg-amber-600/15 border-amber-500/40',
    accentText: 'text-amber-400',
    text: 'text-amber-50',
    textMuted: 'text-amber-700/80',
    input: 'bg-zinc-800 border-amber-900/50 text-amber-50 placeholder:text-amber-800',
    keyIdle: 'bg-zinc-800 border-zinc-700 text-amber-200/70 hover:border-amber-600/50',
    keySelected: 'border-amber-500 bg-amber-600/25 shadow-amber-900/40',
    dispatchBtn: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40 text-zinc-950 font-black',
    dispatchBtnDisabled: 'opacity-40',
    mapTheme: 'dark',
    layout: 'command',
  },
  night: {
    id: 'night',
    label: 'Nocturna',
    description: 'Cian oscuro — mapa central, claves horizontales',
    preview: 'bg-slate-950 border-cyan-500',
    root: 'bg-slate-950 text-cyan-50',
    header: 'bg-slate-900/95',
    headerBorder: 'border-cyan-900/40',
    panel: 'bg-slate-900/50',
    panelBorder: 'border-cyan-900/30',
    accent: 'bg-cyan-600',
    accentMuted: 'bg-cyan-600/15 border-cyan-500/35',
    accentText: 'text-cyan-400',
    text: 'text-cyan-50',
    textMuted: 'text-slate-500',
    input: 'bg-slate-800/80 border-cyan-900/40 text-white placeholder:text-slate-600',
    keyIdle: 'bg-slate-800/60 border-slate-700 hover:border-cyan-600/50',
    keySelected: 'border-cyan-500 bg-cyan-600/20 shadow-cyan-900/30',
    dispatchBtn: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/40',
    dispatchBtnDisabled: 'opacity-40',
    mapTheme: 'dark',
    layout: 'night',
  },
  institutional: {
    id: 'institutional',
    label: 'Institucional',
    description: 'Verde y azul marino — estilo cuartel bomberos Chile',
    preview: 'bg-[#0c1f33] border-emerald-500',
    root: 'bg-[#0c1f33] text-slate-100',
    header: 'bg-[#0a1628]',
    headerBorder: 'border-emerald-900/40',
    panel: 'bg-[#111d33]/80',
    panelBorder: 'border-emerald-900/30',
    accent: 'bg-emerald-600',
    accentMuted: 'bg-emerald-600/15 border-emerald-500/35',
    accentText: 'text-emerald-400',
    text: 'text-slate-100',
    textMuted: 'text-slate-500',
    input: 'bg-[#0a1628] border-emerald-900/40 text-white placeholder:text-slate-600',
    keyIdle: 'bg-[#111d33] border-slate-700 hover:border-emerald-600/40',
    keySelected: 'border-emerald-500 bg-emerald-600/20 shadow-emerald-900/30',
    dispatchBtn: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40',
    dispatchBtnDisabled: 'opacity-40',
    mapTheme: 'dark',
    layout: 'institutional',
  },
};

export const BOTONERA_THEME_LIST = Object.values(BOTONERA_THEMES);

export const DEFAULT_BOTONERA_THEME: BotoneraThemeId = 'classic';
