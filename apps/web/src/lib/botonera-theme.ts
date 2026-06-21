export type BotoneraThemeId = 'dark' | 'light';

export type BotoneraThemeTokens = {
  shell: string;
  header: string;
  headerTitle: string;
  headerSub: string;
  menuBtn: string;
  clockBox: string;
  btnTool: string;
  btnToolMuted: string;
  btnToolActive: string;
  configPanel: string;
  configTitle: string;
  configLabel: string;
  configBorder: string;
  configChip: string;
  configChipActive: string;
  formBand: string;
  formLabel: string;
  input: string;
  textarea: string;
  mapBorder: string;
  rightPanel: string;
  readinessOk: string;
  readinessIdle: string;
  panelSectionTitle: string;
  dashedEmpty: string;
  vehicleCard: string;
  vehicleCardSel: string;
  vehicleKbd: string;
  vehicleThumb: string;
  collapsible: string;
  collapsibleBtn: string;
  collapsibleBorder: string;
  voicePreview: string;
  voicePreviewLabel: string;
  dispatchPreviewBtn: string;
  dispatchBtnDisabled: string;
  dispatchStop: string;
  dispatchFooter: string;
  emergencyBand: string;
  emergencyTitle: string;
  emergencyLabel: string;
  emergencyKeyIdle: string;
  emergencyKeyCode: string;
  emergencyKeyIcon: string;
  subPanel: string;
  subKeyIdle: string;
  mobileBar: string;
  mobileReadyIdle: string;
  mobileReadyOk: string;
  lastDispatch: string;
  lastDispatchCard: string;
  lastDispatchBorder: string;
  hint: string;
  mapTheme: 'light' | 'dark';
  audioPreviewBtn: string;
  audioPreviewBtnSub: string;
  listRow: string;
  listRowActive: string;
  publicPanel: string;
  publicInput: string;
  checkboxRow: string;
  statBox: string;
};

export const BOTONERA_THEMES: Record<BotoneraThemeId, BotoneraThemeTokens> = {
  dark: {
    shell: 'bg-slate-950 text-white',
    header: 'border-slate-800 bg-slate-900',
    headerTitle: 'text-white',
    headerSub: 'text-slate-500',
    menuBtn: 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white',
    clockBox: 'bg-slate-800 border-slate-700 text-slate-300',
    btnTool: 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600',
    btnToolMuted: 'bg-slate-700 border-slate-600 text-slate-400',
    btnToolActive: 'bg-red-600/20 border-red-500/40 text-red-300',
    configPanel: 'border-slate-800 bg-slate-900',
    configTitle: 'text-white',
    configLabel: 'text-slate-500',
    configBorder: 'border-slate-800',
    configChip: 'bg-slate-800 border border-slate-700 text-slate-300',
    configChipActive: 'bg-red-600 text-white',
    formBand: 'bg-slate-900/50 border-slate-800/80',
    formLabel: 'text-slate-500',
    input: 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-600 focus:border-red-500',
    textarea: 'bg-slate-800/60 border-slate-800 text-slate-300 placeholder-slate-600 focus:border-slate-600',
    mapBorder: 'border-slate-800/80',
    rightPanel: 'bg-slate-900/60 border-slate-800',
    readinessOk: 'bg-emerald-950/40 border-emerald-600/40 text-emerald-400',
    readinessIdle: 'bg-slate-800/60 border-slate-700 text-slate-500',
    panelSectionTitle: 'text-white',
    dashedEmpty: 'text-slate-500 border-slate-700',
    vehicleCard: 'bg-slate-800/60 border-slate-700 hover:border-slate-500',
    vehicleCardSel: 'bg-red-600/20 border-red-500 shadow-lg shadow-red-600/10',
    vehicleKbd: 'bg-slate-950 text-slate-500 border-slate-700',
    vehicleThumb: 'bg-slate-700',
    collapsible: 'border-slate-800',
    collapsibleBtn: 'bg-slate-800/50 text-slate-300 hover:bg-slate-800',
    collapsibleBorder: 'border-slate-800',
    voicePreview: 'text-slate-500 border-slate-700',
    voicePreviewLabel: 'text-slate-600',
    dispatchPreviewBtn: 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300',
    dispatchBtnDisabled: 'bg-slate-800 text-slate-600 cursor-not-allowed border-slate-700',
    dispatchStop: 'bg-slate-800 hover:bg-slate-700 border-red-600 text-red-400',
    dispatchFooter: 'text-slate-600',
    emergencyBand: 'border-slate-800 bg-slate-900',
    emergencyTitle: 'text-white',
    emergencyLabel: 'text-slate-500',
    emergencyKeyIdle: 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800',
    emergencyKeyCode: 'bg-slate-950 text-red-400',
    emergencyKeyIcon: 'text-slate-400',
    subPanel: 'border-amber-600/30 bg-amber-950/20',
    subKeyIdle: 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-amber-600/50',
    mobileBar: 'border-slate-700 bg-slate-950/98',
    mobileReadyIdle: 'bg-slate-900 border-slate-700 text-slate-500',
    mobileReadyOk: 'bg-emerald-950/50 border-emerald-600/40 text-emerald-400',
    lastDispatch: 'border-emerald-600/40 bg-slate-900/98',
    lastDispatchCard: 'bg-slate-800/60',
    lastDispatchBorder: 'border-slate-800',
    hint: 'text-slate-500',
    mapTheme: 'dark',
    audioPreviewBtn: 'border-slate-700 bg-slate-800/60 hover:border-amber-600/50 hover:bg-slate-800',
    audioPreviewBtnSub: 'border-slate-700/80 bg-slate-900/60 hover:border-amber-600/40',
    listRow: 'border-transparent text-slate-400 hover:bg-slate-800',
    listRowActive: 'bg-sky-600/20 border-sky-500 text-sky-200',
    publicPanel: 'border-slate-800',
    publicInput: 'bg-slate-950 border-slate-700 text-slate-300',
    checkboxRow: 'bg-slate-950 border-slate-800 text-slate-300',
    statBox: 'bg-slate-950 border-slate-800',
  },
  light: {
    shell: 'bg-white text-slate-900',
    header: 'border-red-100 bg-white shadow-sm',
    headerTitle: 'text-slate-900',
    headerSub: 'text-slate-600',
    menuBtn: 'border-slate-200 bg-white text-slate-600 hover:text-red-700 hover:border-red-200 shadow-sm',
    clockBox: 'bg-red-50 border-red-100 text-slate-800',
    btnTool: 'bg-white border-slate-200 text-slate-700 hover:border-red-200 hover:bg-red-50 shadow-sm',
    btnToolMuted: 'bg-slate-100 border-slate-300 text-slate-500',
    btnToolActive: 'bg-red-50 border-red-300 text-red-700',
    configPanel: 'border-red-100 bg-rose-50/50',
    configTitle: 'text-slate-900',
    configLabel: 'text-slate-600',
    configBorder: 'border-red-100',
    configChip: 'bg-white border border-slate-200 text-slate-700 shadow-sm',
    configChipActive: 'bg-red-600 text-white border-red-600',
    formBand: 'bg-gradient-to-r from-rose-50/80 via-white to-sky-50/60 border-red-100/80',
    formLabel: 'text-red-800/80 font-bold',
    input: 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-400/15 shadow-sm',
    textarea: 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-red-300 shadow-sm',
    mapBorder: 'border-red-100/80',
    rightPanel: 'bg-gradient-to-b from-rose-50/40 to-white border-red-100',
    readinessOk: 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm',
    readinessIdle: 'bg-white border-slate-200 text-slate-500 shadow-sm',
    panelSectionTitle: 'text-slate-900',
    dashedEmpty: 'text-slate-600 border-slate-300 bg-white',
    vehicleCard: 'bg-white border-slate-200 hover:border-sky-300 shadow-sm',
    vehicleCardSel: 'bg-red-50 border-red-400 shadow-md ring-2 ring-red-200',
    vehicleKbd: 'bg-slate-100 text-slate-600 border-slate-200',
    vehicleThumb: 'bg-slate-100',
    collapsible: 'border-slate-200 bg-white shadow-sm',
    collapsibleBtn: 'bg-slate-50 text-slate-800 hover:bg-red-50',
    collapsibleBorder: 'border-slate-100',
    voicePreview: 'text-slate-700 border-slate-200',
    voicePreviewLabel: 'text-slate-500',
    dispatchPreviewBtn: 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm',
    dispatchBtnDisabled: 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed',
    dispatchStop: 'bg-white hover:bg-red-50 border-red-500 text-red-600 shadow-sm',
    dispatchFooter: 'text-slate-500',
    emergencyBand: 'border-red-100 bg-gradient-to-b from-white to-rose-50/30',
    emergencyTitle: 'text-slate-900',
    emergencyLabel: 'text-red-700/80',
    emergencyKeyIdle: 'bg-white border-slate-200 text-slate-800 hover:border-red-400 hover:bg-red-50 shadow-sm',
    emergencyKeyCode: 'bg-red-50 text-red-700 border border-red-100',
    emergencyKeyIcon: 'text-slate-600',
    subPanel: 'border-amber-300 bg-amber-50',
    subKeyIdle: 'bg-white border-slate-200 text-slate-800 hover:border-amber-400 hover:bg-amber-50 shadow-sm',
    mobileBar: 'border-red-200 bg-white/98 shadow-[0_-4px_20px_rgba(0,0,0,.08)]',
    mobileReadyIdle: 'bg-slate-50 border-slate-200 text-slate-600',
    mobileReadyOk: 'bg-emerald-50 border-emerald-300 text-emerald-700',
    lastDispatch: 'border-emerald-300 bg-white/98 shadow-lg',
    lastDispatchCard: 'bg-slate-50 border border-slate-100',
    lastDispatchBorder: 'border-slate-200',
    hint: 'text-slate-600',
    mapTheme: 'light',
    audioPreviewBtn: 'border-slate-200 bg-white hover:border-amber-400 shadow-sm',
    audioPreviewBtnSub: 'border-slate-200 bg-amber-50/50 hover:border-amber-400',
    listRow: 'border-transparent text-slate-600 hover:bg-sky-50',
    listRowActive: 'bg-sky-50 border-sky-400 text-sky-800',
    publicPanel: 'border-slate-200 bg-white',
    publicInput: 'bg-white border-slate-200 text-slate-800',
    checkboxRow: 'bg-slate-50 border-slate-200 text-slate-800',
    statBox: 'bg-white border-slate-200 shadow-sm',
  },
};
