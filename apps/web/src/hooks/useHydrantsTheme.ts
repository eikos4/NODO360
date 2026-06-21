import { CheckCircle, Wrench, XCircle } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import {
  HYDRANTS_THEMES,
  type HydrantsThemeId,
  type StatusKey,
  type StatusStyle,
} from '../lib/hydrants-theme';

const STATUS_STYLES_DARK: Record<StatusKey, StatusStyle> = {
  OPERATIVO: {
    bg: 'bg-emerald-600/10',
    text: 'text-emerald-400',
    border: 'border-emerald-600/30',
    markerColor: '#10b981',
    icon: CheckCircle,
  },
  NO_OPERATIVO: {
    bg: 'bg-red-600/10',
    text: 'text-red-400',
    border: 'border-red-600/30',
    markerColor: '#ef4444',
    icon: XCircle,
  },
  EN_MANTENCION: {
    bg: 'bg-amber-600/10',
    text: 'text-amber-400',
    border: 'border-amber-600/30',
    markerColor: '#f59e0b',
    icon: Wrench,
  },
};

const STATUS_STYLES_LIGHT: Record<StatusKey, StatusStyle> = {
  OPERATIVO: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    markerColor: '#10b981',
    icon: CheckCircle,
  },
  NO_OPERATIVO: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    markerColor: '#ef4444',
    icon: XCircle,
  },
  EN_MANTENCION: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    markerColor: '#f59e0b',
    icon: Wrench,
  },
};

export function useHydrantsTheme() {
  const themeId = useThemeStore((s) => s.theme) as HydrantsThemeId;
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const tokens = HYDRANTS_THEMES[themeId] ?? HYDRANTS_THEMES.dark;
  const isDark = themeId === 'dark';
  const statusColors = isDark ? STATUS_STYLES_DARK : STATUS_STYLES_LIGHT;
  return { themeId, tokens, toggleTheme, isDark, statusColors };
}
