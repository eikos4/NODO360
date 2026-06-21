import type { CentralParralThemeTokens } from './central-parral-theme';

/** Paleta clara para Despacho360 — menos plomo, más contraste y acentos rojo/azul. */
export const DESPACHO360_LIGHT_OVERRIDES: Partial<CentralParralThemeTokens> = {
  shell: 'bg-white text-slate-900',
  shellHeader: 'border-red-100 bg-white shadow-sm',
  panelAside: 'border-red-100 bg-gradient-to-b from-rose-50/60 via-white to-white',
  borderSubtle: 'border-red-100/80',
  sectionLabel: 'text-red-700/90',
  title: 'text-slate-900',
  subtitle: 'text-slate-700',
  hint: 'text-slate-600',
  cardTitle: 'text-slate-700',
  btnGhost: 'border-slate-200 bg-white text-slate-700 hover:text-red-700 hover:border-red-200 hover:bg-red-50 shadow-sm',
  btnGhostActive: 'border-red-400 bg-red-50 text-red-700 shadow-sm',
  inputShell:
    'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 shadow-sm',
  select: 'border-slate-200 bg-white text-slate-900 focus:border-red-400 focus:ring-2 focus:ring-red-400/20 shadow-sm',
  navLink: 'text-slate-700 hover:text-red-700 hover:bg-red-50',
  emergencyKeyIdle:
    'border-slate-200 bg-gradient-to-br from-white to-rose-50/40 text-slate-800 hover:border-red-400 hover:bg-red-50/80 hover:shadow-md shadow-sm',
  emergencyKeyActive: 'border-red-500 bg-red-50 shadow-lg shadow-red-200/60 ring-2 ring-red-400/20',
  subKeyIdle: 'border-slate-200 bg-white text-slate-800 hover:border-red-300 hover:bg-red-50 shadow-sm',
  stickyGradient: 'bg-gradient-to-t from-white via-white to-transparent',
  tabIdle: 'text-slate-600 hover:text-red-700 hover:bg-red-50/60',
  tabActive: 'text-red-700 border-b-2 border-red-500 bg-red-50/80 font-bold',
  listRow: 'bg-white border-slate-200 shadow-sm hover:border-sky-200 hover:bg-sky-50/40',
  linkMuted: 'text-slate-600',
  mapWrap: 'border-slate-200 bg-white shadow-sm',
};
