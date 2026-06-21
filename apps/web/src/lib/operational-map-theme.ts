export type OperationalMapThemeId = 'dark' | 'light';

export type OperationalMapThemeTokens = {
  page: string;
  header: string;
  headerTitle: string;
  headerSub: string;
  badgeLive: string;
  select: string;
  btnGhost: string;
  aside: string;
  panelAlarm: string;
  panelVolunteer: string;
  panelDetail: string;
  panelLayers: string;
  layerBtnOn: string;
  layerBtnOff: string;
  statCardAlarm: string;
  statCardVolunteer: string;
  alarmItem: string;
  volunteerItem: string;
  textPrimary: string;
  textMuted: string;
  overlayLive: string;
  overlayStats: string;
  loading: string;
  mapTile: string;
  soonBanner: string;
};

export const OPERATIONAL_MAP_THEMES: Record<OperationalMapThemeId, OperationalMapThemeTokens> = {
  dark: {
    page: 'bg-slate-950 text-white',
    header: 'bg-slate-950 border-slate-800',
    headerTitle: 'text-white',
    headerSub: 'text-slate-500',
    badgeLive: 'bg-red-600/20 text-red-400 border-red-600/40',
    select: 'bg-slate-800 border-slate-700 text-slate-200',
    btnGhost: 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300',
    aside: 'bg-slate-900 border-slate-800',
    panelAlarm: 'bg-slate-950 border-red-600/25',
    panelVolunteer: 'bg-slate-950 border-emerald-600/25',
    panelDetail: 'bg-slate-950 border-red-600/30',
    panelLayers: 'text-slate-500',
    layerBtnOn: 'bg-slate-800 border-slate-600 text-white',
    layerBtnOff: 'bg-slate-950/50 border-slate-800 text-slate-500',
    statCardAlarm: 'bg-slate-950 border-red-900/30 text-red-400',
    statCardVolunteer: 'bg-slate-950 border-emerald-900/30 text-emerald-400',
    alarmItem: 'bg-red-950/40 hover:bg-red-950/70 border-red-900/40',
    volunteerItem: 'hover:bg-slate-800/80',
    textPrimary: 'text-white',
    textMuted: 'text-slate-400',
    overlayLive: 'bg-slate-950/90 border-red-600/30 text-red-300',
    overlayStats: 'bg-slate-950/90 border-slate-700 text-slate-400',
    loading: 'bg-slate-950 text-slate-500',
    mapTile: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    soonBanner: 'bg-violet-950/40 border-violet-600/30 text-violet-300',
  },
  light: {
    page: 'bg-slate-100 text-slate-900',
    header: 'bg-white border-slate-200 shadow-sm',
    headerTitle: 'text-slate-900',
    headerSub: 'text-slate-600',
    badgeLive: 'bg-red-50 text-red-700 border-red-200',
    select: 'bg-white border-slate-300 text-slate-800 shadow-sm',
    btnGhost: 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm',
    aside: 'bg-white border-slate-200',
    panelAlarm: 'bg-red-50/80 border-red-200',
    panelVolunteer: 'bg-emerald-50/80 border-emerald-200',
    panelDetail: 'bg-white border-red-200 shadow-sm',
    panelLayers: 'text-slate-600',
    layerBtnOn: 'bg-white border-slate-300 text-slate-900 shadow-sm',
    layerBtnOff: 'bg-slate-50 border-slate-200 text-slate-500',
    statCardAlarm: 'bg-white border-red-200 text-red-600 shadow-sm',
    statCardVolunteer: 'bg-white border-emerald-200 text-emerald-700 shadow-sm',
    alarmItem: 'bg-white hover:bg-red-50 border-red-200 shadow-sm',
    volunteerItem: 'hover:bg-slate-50',
    textPrimary: 'text-slate-900',
    textMuted: 'text-slate-600',
    overlayLive: 'bg-white/95 border-red-200 text-red-700 shadow-md',
    overlayStats: 'bg-white/95 border-slate-200 text-slate-600 shadow-md',
    loading: 'bg-slate-100 text-slate-600',
    mapTile: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    soonBanner: 'bg-violet-50 border-violet-200 text-violet-800',
  },
};
