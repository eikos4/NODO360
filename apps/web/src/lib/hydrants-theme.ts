import type { CheckCircle, Wrench, XCircle } from 'lucide-react';

export type HydrantsThemeId = 'dark' | 'light';

export type StatusKey = 'OPERATIVO' | 'NO_OPERATIVO' | 'EN_MANTENCION';

export type StatusStyle = {
  bg: string;
  text: string;
  border: string;
  markerColor: string;
  icon: typeof CheckCircle | typeof XCircle | typeof Wrench;
};

export type HydrantsThemeTokens = {
  title: string;
  subtitle: string;
  viewToggleWrap: string;
  viewToggleActive: string;
  viewToggleIdle: string;
  filterIcon: string;
  filterWrap: string;
  filterTypeActive: string;
  filterTypeIdle: string;
  filterStatusActive: string;
  filterStatusIdle: string;
  themeBtn: string;
  formCard: string;
  formHeader: string;
  formDivider: string;
  formTitle: string;
  formSubtitle: string;
  pickBtnOn: string;
  pickBtnOff: string;
  closeBtn: string;
  label: string;
  input: string;
  inputReadonly: string;
  cancelBtn: string;
  mapPickerWrap: string;
  mapPickerSide: string;
  mapPickerHint: string;
  loading: string;
  empty: string;
  emptyIcon: string;
  emptyText: string;
  mapShell: string;
  aside: string;
  asideLabel: string;
  baseLayerOn: string;
  baseLayerOff: string;
  statusLayerOn: string;
  statusLayerOff: string;
  legendText: string;
  select: string;
  statsText: string;
  listAside: string;
  listAsideHeader: string;
  listDivider: string;
  listItem: string;
  listItemActive: string;
  listItemCode: string;
  listItemAddr: string;
  noCoordsHeader: string;
  noCoordsItem: string;
  card: string;
  cardFooter: string;
  cardFooterText: string;
  cardTitle: string;
  cardAddr: string;
  cardTypeLabel: string;
  cardAction: string;
  cardLink: string;
  defaultMapTile: string;
  pickerMapTile: string;
};

export const HYDRANTS_THEMES: Record<HydrantsThemeId, HydrantsThemeTokens> = {
  dark: {
    title: 'text-white',
    subtitle: 'text-slate-400',
    viewToggleWrap: 'bg-slate-900 border-slate-800',
    viewToggleActive: 'bg-red-600 !text-white',
    viewToggleIdle: 'text-slate-400 hover:text-slate-200',
    filterIcon: 'text-slate-500',
    filterWrap: 'bg-slate-900 border-slate-800',
    filterTypeActive: 'bg-sky-600 !text-white',
    filterTypeIdle: 'text-slate-400 hover:text-slate-200',
    filterStatusActive: 'bg-red-600 !text-white',
    filterStatusIdle: 'text-slate-400 hover:text-slate-200',
    themeBtn: 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300',
    formCard: 'bg-slate-900 border-slate-700',
    formHeader: 'border-slate-800',
    formDivider: 'divide-slate-800',
    formTitle: 'text-white',
    formSubtitle: 'text-slate-500',
    pickBtnOn: 'bg-sky-600 !text-white border-sky-500',
    pickBtnOff: 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600',
    closeBtn: 'text-slate-500 hover:text-white hover:bg-slate-800',
    label: 'text-slate-400',
    input: 'bg-slate-800 border-slate-700 text-slate-100 focus:border-red-500',
    inputReadonly: 'bg-slate-800/80 border-slate-700 text-slate-300',
    cancelBtn: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
    mapPickerWrap: 'border-slate-700',
    mapPickerSide: 'bg-slate-950/50',
    mapPickerHint: 'text-slate-600',
    loading: 'text-slate-500',
    empty: 'bg-slate-900 border-slate-800',
    emptyIcon: 'text-slate-700',
    emptyText: 'text-slate-500',
    mapShell: 'bg-slate-900 border-slate-800',
    aside: 'bg-slate-950/80 border-slate-800',
    asideLabel: 'text-slate-500',
    baseLayerOn: 'bg-sky-600/20 border-sky-500 text-sky-300',
    baseLayerOff: 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600',
    statusLayerOn: 'bg-slate-800 border-slate-600 text-white',
    statusLayerOff: 'border-transparent text-slate-600',
    legendText: 'text-slate-500',
    select: 'bg-slate-800 border-slate-700 text-slate-200',
    statsText: 'text-slate-600',
    listAside: 'bg-slate-950/50 border-slate-800',
    listAsideHeader: 'text-slate-500 border-slate-800 bg-slate-950',
    listDivider: 'divide-slate-800',
    listItem: 'hover:bg-slate-800/80',
    listItemActive: 'bg-red-600/10 border-l-2 border-red-500',
    listItemCode: 'text-white',
    listItemAddr: 'text-slate-500',
    noCoordsHeader: 'text-amber-500/90 border-slate-800',
    noCoordsItem: 'text-slate-500',
    card: 'bg-slate-900 border-slate-800 hover:shadow-xl',
    cardFooter: 'border-slate-800',
    cardFooterText: 'text-slate-600',
    cardTitle: 'text-white',
    cardAddr: 'text-slate-400',
    cardTypeLabel: 'text-slate-400',
    cardAction: 'text-slate-600 hover:text-white',
    cardLink: 'text-sky-400 hover:text-sky-300',
    defaultMapTile: 'dark',
    pickerMapTile: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  },
  light: {
    title: 'text-slate-900',
    subtitle: 'text-slate-600',
    viewToggleWrap: 'bg-white border-slate-200 shadow-sm',
    viewToggleActive: 'bg-red-600 !text-white',
    viewToggleIdle: 'text-slate-600 hover:text-slate-900',
    filterIcon: 'text-slate-500',
    filterWrap: 'bg-white border-slate-200 shadow-sm',
    filterTypeActive: 'bg-sky-600 !text-white',
    filterTypeIdle: 'text-slate-600 hover:text-slate-900',
    filterStatusActive: 'bg-red-600 !text-white',
    filterStatusIdle: 'text-slate-600 hover:text-slate-900',
    themeBtn: 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm',
    formCard: 'bg-white border-slate-200 shadow-sm',
    formHeader: 'border-slate-200',
    formDivider: 'divide-slate-200',
    formTitle: 'text-slate-900',
    formSubtitle: 'text-slate-600',
    pickBtnOn: 'bg-sky-600 !text-white border-sky-500',
    pickBtnOff: 'bg-white border-slate-300 text-slate-700 hover:border-slate-400 shadow-sm',
    closeBtn: 'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
    label: 'text-slate-600',
    input: 'bg-white border-slate-300 text-slate-900 focus:border-red-500 shadow-sm',
    inputReadonly: 'bg-slate-50 border-slate-200 text-slate-600',
    cancelBtn: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    mapPickerWrap: 'border-slate-300',
    mapPickerSide: 'bg-slate-50',
    mapPickerHint: 'text-slate-500',
    loading: 'text-slate-600',
    empty: 'bg-white border-slate-200 shadow-sm',
    emptyIcon: 'text-slate-300',
    emptyText: 'text-slate-600',
    mapShell: 'bg-white border-slate-200 shadow-sm',
    aside: 'bg-slate-50 border-slate-200',
    asideLabel: 'text-slate-600',
    baseLayerOn: 'bg-sky-50 border-sky-400 text-sky-700',
    baseLayerOff: 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 shadow-sm',
    statusLayerOn: 'bg-white border-slate-300 text-slate-900 shadow-sm',
    statusLayerOff: 'border-transparent text-slate-500',
    legendText: 'text-slate-600',
    select: 'bg-white border-slate-300 text-slate-800 shadow-sm',
    statsText: 'text-slate-500',
    listAside: 'bg-slate-50 border-slate-200',
    listAsideHeader: 'text-slate-600 border-slate-200 bg-white',
    listDivider: 'divide-slate-200',
    listItem: 'hover:bg-slate-100',
    listItemActive: 'bg-red-50 border-l-2 border-red-500',
    listItemCode: 'text-slate-900',
    listItemAddr: 'text-slate-600',
    noCoordsHeader: 'text-amber-700 border-slate-200',
    noCoordsItem: 'text-slate-600',
    card: 'bg-white border-slate-200 hover:shadow-lg shadow-sm',
    cardFooter: 'border-slate-200',
    cardFooterText: 'text-slate-500',
    cardTitle: 'text-slate-900',
    cardAddr: 'text-slate-600',
    cardTypeLabel: 'text-slate-500',
    cardAction: 'text-slate-500 hover:text-slate-800',
    cardLink: 'text-sky-600 hover:text-sky-700',
    defaultMapTile: 'streets',
    pickerMapTile: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
};
