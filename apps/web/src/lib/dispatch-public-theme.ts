export type DispatchPublicThemeId = 'dark' | 'light';

export type DispatchPublicThemeTokens = {
  page: string;
  pageEmergency: string;
  loading: string;
  errorTitle: string;
  headerBorder: string;
  heroOverlay: string;
  heroFade: string;
  companyLabel: string;
  title: string;
  subtitle: string;
  clock: string;
  clockDate: string;
  btnGhost: string;
  card: string;
  cardTitle: string;
  cardText: string;
  cardMuted: string;
  input: string;
  select: string;
  statPill: string;
  statLabel: string;
  operativePanel: string;
  operativeInput: string;
  operativeHint: string;
  memberAvailable: string;
  memberUnavailable: string;
  memberEmergency: string;
  memberName: string;
  memberRole: string;
  memberBtnOn: string;
  memberBtnOff: string;
  emptyState: string;
  footer: string;
  footerBorder: string;
  footerText: string;
  collapsible: string;
  collapsibleBtn: string;
  collapsibleBorder: string;
  collapsibleTitle: string;
  fleetItem: string;
  audioMuted: string;
  audioActive: string;
  sectionTitle: string;
  sectionCount: string;
  maquinistaPanel: string;
  maquinistaPanelEmpty: string;
  maquinistaCardOn: string;
  maquinistaCardOff: string;
  maquinistaCardPrincipal: string;
  qrBg: string;
  filterBtn: string;
  cardPhotoBg: string;
  cardPhotoBorderOn: string;
  cardPhotoBorderOff: string;
};

export const DISPATCH_PUBLIC_THEMES: Record<DispatchPublicThemeId, DispatchPublicThemeTokens> = {
  dark: {
    page: 'bg-[#0a1628] text-white',
    pageEmergency: 'bg-[#1a0a0a]',
    loading: 'bg-[#0a1628] text-slate-400',
    errorTitle: 'text-white',
    headerBorder: 'border-slate-800/80',
    heroOverlay: 'linear-gradient(105deg, #0a1628 42%, rgba(10,22,40,0.75) 58%, rgba(10,22,40,0.2) 100%)',
    heroFade: 'from-transparent to-[#0a1628]/90',
    companyLabel: 'text-amber-400/90',
    title: 'text-white',
    subtitle: 'text-slate-400',
    clock: 'text-white',
    clockDate: 'text-slate-400',
    btnGhost: 'border-slate-600/60 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800',
    card: 'bg-[#111d33] border-slate-700/50',
    cardTitle: 'text-white',
    cardText: 'text-slate-400',
    cardMuted: 'text-slate-500',
    input: 'bg-[#111d33] border-slate-700/60 text-white placeholder-slate-500 focus:border-sky-500/50',
    select: 'bg-[#111d33] border-slate-700/60 text-slate-300 focus:border-sky-500/50',
    statPill: 'bg-[#0a1628] border-slate-800/80',
    statLabel: 'text-slate-500',
    operativePanel: 'border-amber-500/25 bg-amber-950/20',
    operativeInput: 'bg-[#0a1628] border-amber-500/40 text-amber-100 placeholder-amber-900/50 focus:border-amber-400',
    operativeHint: 'text-amber-200/60',
    memberAvailable: 'bg-[#152238] border-emerald-500/40 hover:border-emerald-400/60 shadow-lg shadow-emerald-950/20',
    memberUnavailable: 'bg-[#111d33] border-slate-700/60 hover:border-slate-600',
    memberEmergency: 'bg-red-950/30 border-red-500/50 hover:border-red-400/60',
    memberName: 'text-white',
    memberRole: 'text-slate-400',
    memberBtnOn: 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/30',
    memberBtnOff: 'bg-slate-800 text-slate-400 border border-slate-700',
    emptyState: 'text-slate-500 bg-[#111d33] border-slate-800',
    footer: 'text-slate-500',
    footerBorder: 'border-slate-800/80',
    footerText: 'text-slate-400',
    collapsible: 'bg-[#111d33] border-slate-700/50',
    collapsibleBtn: 'hover:bg-slate-800/30',
    collapsibleBorder: 'border-slate-800/80',
    collapsibleTitle: 'text-white',
    fleetItem: 'bg-[#0a1628] border-slate-800',
    audioMuted: 'border-slate-600 text-slate-500 bg-slate-900/50',
    audioActive: 'border-emerald-600/40 text-emerald-300 bg-emerald-950/30',
    sectionTitle: 'text-white',
    sectionCount: 'text-slate-500',
    maquinistaPanel: 'border-amber-500/50 bg-amber-950/20',
    maquinistaPanelEmpty: 'border-slate-700/60 bg-[#111d33]',
    maquinistaCardOn: 'bg-[#152238] border-sky-500/40',
    maquinistaCardOff: 'bg-[#111d33] border-slate-700/60',
    maquinistaCardPrincipal: 'bg-amber-950/15 border-amber-500/40',
    qrBg: '0a1628',
    filterBtn: 'border-slate-700 text-slate-400 hover:bg-slate-800',
    cardPhotoBg: 'bg-slate-800/80',
    cardPhotoBorderOn: 'border-emerald-500/30',
    cardPhotoBorderOff: 'border-slate-600/50',
  },
  light: {
    page: 'bg-slate-100 text-slate-900',
    pageEmergency: 'bg-red-50',
    loading: 'bg-slate-100 text-slate-500',
    errorTitle: 'text-slate-900',
    headerBorder: 'border-slate-200',
    heroOverlay: 'linear-gradient(105deg, #f1f5f9 42%, rgba(241,245,249,0.85) 58%, rgba(241,245,249,0.4) 100%)',
    heroFade: 'from-transparent to-slate-100/95',
    companyLabel: 'text-amber-700',
    title: 'text-slate-900',
    subtitle: 'text-slate-600',
    clock: 'text-slate-900',
    clockDate: 'text-slate-500',
    btnGhost: 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-sm',
    card: 'bg-white border-slate-200 shadow-sm',
    cardTitle: 'text-slate-900',
    cardText: 'text-slate-600',
    cardMuted: 'text-slate-500',
    input: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20',
    select: 'bg-white border-slate-300 text-slate-700 focus:border-sky-500',
    statPill: 'bg-slate-50 border-slate-200',
    statLabel: 'text-slate-500',
    operativePanel: 'border-amber-300 bg-amber-50',
    operativeInput: 'bg-white border-amber-400 text-amber-950 placeholder-amber-300 focus:border-amber-500',
    operativeHint: 'text-amber-800/70',
    memberAvailable: 'bg-emerald-50 border-emerald-300 hover:border-emerald-400 shadow-sm',
    memberUnavailable: 'bg-white border-slate-200 hover:border-slate-300 shadow-sm',
    memberEmergency: 'bg-red-50 border-red-300 hover:border-red-400',
    memberName: 'text-slate-900',
    memberRole: 'text-slate-500',
    memberBtnOn: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    memberBtnOff: 'bg-slate-100 text-slate-600 border border-slate-200',
    emptyState: 'text-slate-500 bg-white border-slate-200',
    footer: 'text-slate-500',
    footerBorder: 'border-slate-200',
    footerText: 'text-slate-600',
    collapsible: 'bg-white border-slate-200 shadow-sm',
    collapsibleBtn: 'hover:bg-slate-50',
    collapsibleBorder: 'border-slate-100',
    collapsibleTitle: 'text-slate-900',
    fleetItem: 'bg-slate-50 border-slate-200',
    audioMuted: 'border-slate-300 text-slate-500 bg-slate-100',
    audioActive: 'border-emerald-400 text-emerald-700 bg-emerald-50',
    sectionTitle: 'text-slate-900',
    sectionCount: 'text-slate-500',
    maquinistaPanel: 'border-amber-300 bg-amber-50',
    maquinistaPanelEmpty: 'border-slate-200 bg-white',
    maquinistaCardOn: 'bg-sky-50 border-sky-300',
    maquinistaCardOff: 'bg-white border-slate-200',
    maquinistaCardPrincipal: 'bg-amber-50 border-amber-300',
    qrBg: 'ffffff',
    filterBtn: 'border-slate-300 text-slate-600 hover:bg-slate-50',
    cardPhotoBg: 'bg-slate-100',
    cardPhotoBorderOn: 'border-emerald-300',
    cardPhotoBorderOff: 'border-slate-300',
  },
};

/** Guardia nocturna — lámpara de cuartel, no el dark frío del resto de Nodo360. */
export const SALA_NIGHT_THEME: DispatchPublicThemeTokens = {
  page: 'bg-[#08060c] text-[#f4e8d0]',
  pageEmergency: 'bg-[#140808]',
  loading: 'bg-[#08060c] text-amber-200/50',
  errorTitle: 'text-[#f4e8d0]',
  headerBorder: 'border-amber-500/15',
  heroOverlay: 'linear-gradient(105deg, #08060c 38%, rgba(8,6,12,0.82) 58%, rgba(8,6,12,0.25) 100%)',
  heroFade: 'from-transparent to-[#08060c]/95',
  companyLabel: 'text-amber-300/90',
  title: 'text-[#f4e8d0]',
  subtitle: 'text-amber-100/45',
  clock: 'text-amber-100 drop-shadow-[0_0_18px_rgba(245,176,66,0.35)]',
  clockDate: 'text-amber-200/50',
  btnGhost: 'border-amber-500/25 bg-[#16101c]/70 text-amber-100 hover:text-white hover:bg-amber-950/40',
  card: 'bg-[#16101c]/90 border-amber-500/15 shadow-[0_12px_40px_rgba(0,0,0,0.45)]',
  cardTitle: 'text-[#f4e8d0]',
  cardText: 'text-amber-100/55',
  cardMuted: 'text-amber-200/35',
  input: 'bg-[#100c14] border-amber-500/25 text-[#f4e8d0] placeholder-amber-200/30 focus:border-amber-400/60',
  select: 'bg-[#100c14] border-amber-500/25 text-amber-100/80 focus:border-amber-400/60',
  statPill: 'bg-[#100c14] border-amber-500/15',
  statLabel: 'text-amber-200/40',
  operativePanel: 'border-amber-400/35 bg-amber-950/25 shadow-[0_0_28px_rgba(245,176,66,0.08)]',
  operativeInput: 'bg-[#100c14] border-amber-400/50 text-amber-100 placeholder-amber-900/60 focus:border-amber-300',
  operativeHint: 'text-amber-200/55',
  memberAvailable: 'bg-[#1a2418] border-amber-400/35 hover:border-amber-300/60 shadow-[0_0_22px_rgba(245,176,66,0.16)]',
  memberUnavailable: 'bg-[#16101c]/80 border-white/5 hover:border-amber-500/20',
  memberEmergency: 'bg-red-950/40 border-red-500/45 hover:border-red-400/60',
  memberName: 'text-[#f4e8d0]',
  memberRole: 'text-amber-100/40',
  memberBtnOn: 'bg-amber-500/15 text-amber-200 border border-amber-400/30',
  memberBtnOff: 'bg-[#100c14] text-amber-100/40 border border-white/10',
  emptyState: 'text-amber-200/40 bg-[#16101c] border-amber-500/10',
  footer: 'text-amber-200/35',
  footerBorder: 'border-amber-500/10',
  footerText: 'text-amber-100/45',
  collapsible: 'bg-[#16101c]/90 border-amber-500/15',
  collapsibleBtn: 'hover:bg-amber-950/30',
  collapsibleBorder: 'border-amber-500/10',
  collapsibleTitle: 'text-[#f4e8d0]',
  fleetItem: 'bg-[#100c14] border-amber-500/10',
  audioMuted: 'border-amber-500/20 text-amber-200/40 bg-[#100c14]',
  audioActive: 'border-amber-400/40 text-amber-200 bg-amber-950/30',
  sectionTitle: 'text-[#f4e8d0]',
  sectionCount: 'text-amber-200/40',
  maquinistaPanel: 'border-amber-400/40 bg-amber-950/20',
  maquinistaPanelEmpty: 'border-amber-500/15 bg-[#16101c]',
  maquinistaCardOn: 'bg-[#152238] border-amber-400/35',
  maquinistaCardOff: 'bg-[#16101c] border-white/10',
  maquinistaCardPrincipal: 'bg-amber-950/25 border-amber-400/45',
  qrBg: '08060c',
  filterBtn: 'border-amber-500/20 text-amber-100/60 hover:bg-amber-950/40',
  cardPhotoBg: 'bg-[#100c14]',
  cardPhotoBorderOn: 'border-amber-400/40',
  cardPhotoBorderOff: 'border-white/10',
};
