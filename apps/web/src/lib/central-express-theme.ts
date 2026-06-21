export type CentralExpressThemeId = 'dark' | 'light';

export type CentralExpressThemeTokens = {
  page: string;
  header: string;
  headerBorder: string;
  brand: string;
  title: string;
  subtitle: string;
  navActive: string;
  navIdle: string;
  card: string;
  cardBorder: string;
  cardTitle: string;
  label: string;
  input: string;
  select: string;
  textarea: string;
  btnGhost: string;
  btnPrimary: string;
  btnSuccess: string;
  statLabel: string;
  statValue: string;
  footer: string;
  footerBorder: string;
  companyCard: string;
  companyCardSelected: string;
  companyStatusOk: string;
  companyStatusWarn: string;
  incidentRow: string;
  mapTheme: 'light' | 'dark';
  text: string;
  textMuted: string;
  accent: string;
};

export const CENTRAL_EXPRESS_THEMES: Record<CentralExpressThemeId, CentralExpressThemeTokens> = {
  dark: {
    page: 'bg-[#0f172a] text-slate-100',
    header: 'bg-[#111827]',
    headerBorder: 'border-slate-800',
    brand: 'text-red-500',
    title: 'text-white',
    subtitle: 'text-slate-500',
    navActive: 'bg-slate-800 text-white',
    navIdle: 'text-slate-500 hover:text-slate-300',
    card: 'bg-[#1e293b]',
    cardBorder: 'border-slate-700/80',
    cardTitle: 'text-slate-400',
    label: 'text-slate-500',
    input: 'bg-[#0f172a] border-slate-600 text-white placeholder:text-slate-600',
    select: 'bg-[#0f172a] border-slate-600 text-white',
    textarea: 'bg-[#0f172a] border-slate-600 text-white placeholder:text-slate-600',
    btnGhost: 'border-slate-600 text-slate-300 hover:bg-slate-800',
    btnPrimary: 'bg-red-600 hover:bg-red-500 text-white',
    btnSuccess: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    statLabel: 'text-slate-500',
    statValue: 'text-white',
    footer: 'bg-[#111827] text-slate-400',
    footerBorder: 'border-slate-800',
    companyCard: 'bg-[#1e293b] border-slate-700 hover:border-slate-500',
    companyCardSelected: 'bg-[#1e293b] border-red-500/60 ring-1 ring-red-500/30',
    companyStatusOk: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    companyStatusWarn: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    incidentRow: 'bg-[#0f172a]/60 border-slate-700/60',
    mapTheme: 'dark',
    text: 'text-white',
    textMuted: 'text-slate-500',
    accent: 'text-red-400',
  },
  light: {
    page: 'bg-slate-100 text-slate-900',
    header: 'bg-white',
    headerBorder: 'border-slate-200',
    brand: 'text-red-600',
    title: 'text-slate-900',
    subtitle: 'text-slate-500',
    navActive: 'bg-slate-100 text-slate-900',
    navIdle: 'text-slate-500 hover:text-slate-800',
    card: 'bg-white',
    cardBorder: 'border-slate-200',
    cardTitle: 'text-slate-500',
    label: 'text-slate-500',
    input: 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400',
    select: 'bg-white border-slate-300 text-slate-900',
    textarea: 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400',
    btnGhost: 'border-slate-300 text-slate-600 hover:bg-slate-50',
    btnPrimary: 'bg-red-600 hover:bg-red-500 text-white',
    btnSuccess: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    statLabel: 'text-slate-500',
    statValue: 'text-slate-900',
    footer: 'bg-white text-slate-600',
    footerBorder: 'border-slate-200',
    companyCard: 'bg-white border-slate-200 hover:border-slate-400 shadow-sm',
    companyCardSelected: 'bg-white border-red-400 ring-1 ring-red-200 shadow-md',
    companyStatusOk: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    companyStatusWarn: 'bg-amber-50 text-amber-700 border-amber-200',
    incidentRow: 'bg-slate-50 border-slate-200',
    mapTheme: 'light',
    text: 'text-slate-900',
    textMuted: 'text-slate-500',
    accent: 'text-red-600',
  },
};

export const DEFAULT_CENTRAL_EXPRESS_THEME: CentralExpressThemeId = 'dark';
