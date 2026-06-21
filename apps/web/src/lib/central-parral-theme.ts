export type CentralParralThemeId = 'dark' | 'light';

export type CentralParralThemeTokens = {
  page: string;
  header: string;
  title: string;
  subtitle: string;
  clock: string;
  clockDate: string;
  btnGhost: string;
  btnGhostActive: string;
  card: string;
  cardHeader: string;
  cardTitle: string;
  label: string;
  input: string;
  textarea: string;
  select: string;
  keyIdle: string;
  keySubIdle: string;
  activeKeyEmpty: string;
  activeKeyEmptyText: string;
  mapWrap: string;
  mapFooter: string;
  mapBtn: string;
  dispatchPanel: string;
  voicePreview: string;
  voicePreviewLabel: string;
  voiceText: string;
  footer: string;
  vehicleThumb: string;
  vehiclePatent: string;
  vehicleMeta: string;
  personnelEmpty: string;
  hint: string;
  mapTheme: 'light' | 'dark';
  /** Despacho360 / operativa */
  shell: string;
  shellHeader: string;
  panelAside: string;
  borderSubtle: string;
  sectionLabel: string;
  inputShell: string;
  navLink: string;
  emergencyKeyIdle: string;
  emergencyKeyActive: string;
  subKeyIdle: string;
  subKeyActive: string;
  stickyGradient: string;
  tabIdle: string;
  tabActive: string;
  listRow: string;
  linkMuted: string;
  operativaPanel: string;
  operativaPanelHeader: string;
  incidentRowActive: string;
  incidentRowIdle: string;
  kpiValue: string;
  kpiLabel: string;
  btnSecondary: string;
  refreshBtn: string;
};

export const CENTRAL_PARRAL_THEMES: Record<CentralParralThemeId, CentralParralThemeTokens> = {
  dark: {
    page: 'bg-[#141820] text-white',
    header: 'border-slate-800 bg-[#1a1d23]',
    title: 'text-white',
    subtitle: 'text-slate-400',
    clock: 'text-white',
    clockDate: 'text-slate-500',
    btnGhost: 'border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80',
    btnGhostActive: 'border-red-500/40 bg-red-500/10 text-red-300',
    card: 'border-slate-700/80 bg-[#1e2430] shadow-lg',
    cardHeader: 'border-slate-700/60',
    cardTitle: 'text-slate-400',
    label: 'text-slate-500',
    input: 'border-slate-600 bg-slate-800/80 text-white placeholder:text-slate-500 focus:border-sky-500',
    textarea: 'border-slate-600 bg-slate-800/80 text-white placeholder:text-slate-500 focus:border-sky-500',
    select: 'border-slate-600 bg-slate-800/80 text-white',
    keyIdle: 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500',
    keySubIdle: 'border-slate-600 text-slate-400 bg-slate-800/40',
    activeKeyEmpty: 'border-slate-700 bg-[#1e2430]',
    activeKeyEmptyText: 'text-slate-500',
    mapWrap: 'border-slate-700/80 bg-[#1e2430]',
    mapFooter: 'border-slate-700/60 bg-[#1a1d23]',
    mapBtn: 'border-slate-600 text-slate-400 hover:text-white hover:bg-slate-800',
    dispatchPanel: 'border-slate-700/80 bg-[#1e2430]',
    voicePreview: 'bg-slate-800/60 border-slate-700',
    voicePreviewLabel: 'text-slate-500',
    voiceText: 'text-slate-300',
    footer: 'text-slate-500',
    vehicleThumb: 'bg-slate-800 border-slate-600',
    vehiclePatent: 'text-white',
    vehicleMeta: 'text-slate-400',
    personnelEmpty: 'text-slate-500',
    hint: 'text-slate-500',
    mapTheme: 'dark',
    shell: 'bg-[#050810] text-white',
    shellHeader: 'border-white/10 bg-[#0a0f1a]/95 backdrop-blur-md',
    panelAside: 'border-white/10 bg-[#0a0f1a]',
    borderSubtle: 'border-white/10',
    sectionLabel: 'text-slate-500',
    inputShell: 'bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-red-500/50 focus:ring-red-500/30',
    navLink: 'text-slate-500 hover:text-white hover:bg-white/5',
    emergencyKeyIdle: 'border-white/10 bg-white/[0.03] hover:border-red-500/40 hover:bg-red-500/5',
    emergencyKeyActive: 'border-red-500 bg-red-600/20 shadow-lg shadow-red-900/30',
    subKeyIdle: 'border-white/15 bg-white/5 text-slate-300 hover:border-red-500/50',
    subKeyActive: 'bg-red-600 border-red-500 text-white',
    stickyGradient: 'bg-gradient-to-t from-[#050810] via-[#050810] to-transparent',
    tabIdle: 'text-slate-500 hover:text-slate-300',
    tabActive: 'text-red-400 border-b-2 border-red-500 bg-red-500/5',
    listRow: 'bg-white/[0.03] border-white/5',
    linkMuted: 'text-slate-600',
    operativaPanel: 'border-slate-800 bg-slate-900/50',
    operativaPanelHeader: 'border-slate-800 text-white',
    incidentRowActive: 'bg-red-950/40 border-red-600/40',
    incidentRowIdle: 'bg-slate-800/30 border-slate-700/50',
    kpiValue: 'text-white',
    kpiLabel: 'text-slate-400',
    btnSecondary: 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white',
    refreshBtn: 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800',
  },
  light: {
    page: 'bg-slate-100 text-slate-900',
    header: 'border-slate-200 bg-white shadow-sm',
    title: 'text-slate-900',
    subtitle: 'text-slate-600',
    clock: 'text-slate-900',
    clockDate: 'text-slate-500',
    btnGhost: 'border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm',
    btnGhostActive: 'border-red-300 bg-red-50 text-red-700',
    card: 'border-slate-200 bg-white shadow-sm',
    cardHeader: 'border-slate-100 bg-slate-50/80',
    cardTitle: 'text-slate-600',
    label: 'text-slate-600',
    input: 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30',
    textarea: 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30',
    select: 'border-slate-300 bg-white text-slate-900',
    keyIdle: 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50 shadow-sm',
    keySubIdle: 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50',
    activeKeyEmpty: 'border-orange-200 bg-orange-50/80',
    activeKeyEmptyText: 'text-slate-600',
    mapWrap: 'border-slate-200 bg-white shadow-sm',
    mapFooter: 'border-slate-200 bg-slate-50',
    mapBtn: 'border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50',
    dispatchPanel: 'border-slate-200 bg-white shadow-sm',
    voicePreview: 'bg-slate-50 border-slate-200',
    voicePreviewLabel: 'text-slate-500',
    voiceText: 'text-slate-700',
    footer: 'text-slate-500',
    vehicleThumb: 'bg-slate-100 border-slate-200',
    vehiclePatent: 'text-slate-900',
    vehicleMeta: 'text-slate-600',
    personnelEmpty: 'text-slate-500',
    hint: 'text-slate-500',
    mapTheme: 'light',
    shell: 'bg-slate-100 text-slate-900',
    shellHeader: 'border-slate-200 bg-white shadow-sm',
    panelAside: 'border-slate-200 bg-white',
    borderSubtle: 'border-slate-200',
    sectionLabel: 'text-slate-600',
    inputShell: 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:ring-1 focus:ring-red-400/30 shadow-sm',
    navLink: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    emergencyKeyIdle: 'border-slate-200 bg-white text-slate-800 hover:border-red-300 hover:bg-red-50 shadow-sm',
    emergencyKeyActive: 'border-red-500 bg-red-50 shadow-md shadow-red-100',
    subKeyIdle: 'border-slate-300 bg-slate-50 text-slate-700 hover:border-red-300',
    subKeyActive: 'bg-red-600 border-red-500 text-white',
    stickyGradient: 'bg-gradient-to-t from-slate-100 via-slate-100 to-transparent',
    tabIdle: 'text-slate-500 hover:text-slate-800',
    tabActive: 'text-red-600 border-b-2 border-red-500 bg-red-50',
    listRow: 'bg-slate-50 border-slate-200',
    linkMuted: 'text-slate-500',
    operativaPanel: 'border-slate-200 bg-white shadow-sm',
    operativaPanelHeader: 'border-slate-200 text-slate-900 bg-slate-50/80',
    incidentRowActive: 'bg-red-50 border-red-200',
    incidentRowIdle: 'bg-slate-50 border-slate-200',
    kpiValue: 'text-slate-900',
    kpiLabel: 'text-slate-600',
    btnSecondary: 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-sm',
    refreshBtn: 'border-slate-300 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm',
  },
};

export const DEFAULT_CENTRAL_PARRAL_THEME: CentralParralThemeId = 'dark';
