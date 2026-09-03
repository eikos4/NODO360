import type { LucideIcon } from 'lucide-react';
import {
  Award, Briefcase, Flame, GraduationCap, Shield, ShieldAlert,
  Radio, Package, BookOpen, Wallet, Search,
} from 'lucide-react';

export const BOMBERO_ROLES = [
  'BOMBERO',
  'BOMBERO_HONORARIO',
  'BOMBERO_INICIAL',
  'BOMBERO_PROFESIONAL',
] as const;

export type BomberoRole = (typeof BOMBERO_ROLES)[number];

export function isBomberoRole(role?: string | null): boolean {
  return !!role && (BOMBERO_ROLES as readonly string[]).includes(role);
}

export type RoleMeta = {
  value: string;
  label: string;
  short: string;
  color: string;
  badge: string;
  icon: LucideIcon;
  iconClass: string;
};

export const ROLES: RoleMeta[] = [
  { value: 'SUPER_ADMIN', label: 'Super Administrador', short: 'S.Admin', color: 'from-red-600 to-red-800', badge: 'bg-red-600/15 text-red-700 dark:bg-red-600/20 dark:text-red-400 border-red-600/25', icon: ShieldAlert, iconClass: 'text-red-500 dark:text-red-400' },
  { value: 'COMANDANTE', label: 'Comandante', short: 'Cdte.', color: 'from-orange-600 to-orange-800', badge: 'bg-orange-600/15 text-orange-800 dark:bg-orange-600/20 dark:text-orange-400 border-orange-600/25', icon: Shield, iconClass: 'text-orange-600 dark:text-orange-400' },
  { value: 'CAPITAN', label: 'Capitán / Oficial Operativo', short: 'Capitán', color: 'from-yellow-600 to-yellow-800', badge: 'bg-yellow-500/15 text-yellow-800 dark:bg-yellow-600/20 dark:text-yellow-400 border-yellow-600/25', icon: Shield, iconClass: 'text-yellow-600 dark:text-yellow-400' },
  { value: 'OPERADOR_CENTRAL', label: 'Operador Central de Despacho', short: 'Central', color: 'from-red-700 to-red-900', badge: 'bg-red-600/15 text-red-700 dark:bg-red-600/25 dark:text-red-300 border-red-500/30', icon: Radio, iconClass: 'text-red-600 dark:text-red-300' },
  { value: 'ENCARGADO_MATERIAL', label: 'Encargado Material Mayor', short: 'Enc.Mat.', color: 'from-blue-600 to-blue-800', badge: 'bg-blue-600/15 text-blue-800 dark:bg-blue-600/20 dark:text-blue-400 border-blue-600/25', icon: Package, iconClass: 'text-blue-600 dark:text-blue-400' },
  { value: 'SECRETARIO', label: 'Secretario/a', short: 'Secret.', color: 'from-purple-600 to-purple-800', badge: 'bg-purple-600/15 text-purple-800 dark:bg-purple-600/20 dark:text-purple-400 border-purple-600/25', icon: BookOpen, iconClass: 'text-purple-600 dark:text-purple-400' },
  { value: 'TESORERO', label: 'Tesorero/a', short: 'Tesorero', color: 'from-emerald-600 to-emerald-800', badge: 'bg-emerald-600/15 text-emerald-800 dark:bg-emerald-600/20 dark:text-emerald-400 border-emerald-600/25', icon: Wallet, iconClass: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'BOMBERO', label: 'Bombero Operativo', short: 'Operativo', color: 'from-slate-600 to-slate-700', badge: 'bg-slate-600/15 text-slate-700 dark:bg-slate-600/20 dark:text-slate-300 border-slate-500/30', icon: Flame, iconClass: 'text-red-600 dark:text-red-400' },
  { value: 'BOMBERO_HONORARIO', label: 'Bombero Honorario', short: 'Honorario', color: 'from-amber-600 to-amber-800', badge: 'bg-amber-500/15 text-amber-800 dark:bg-amber-600/20 dark:text-amber-300 border-amber-500/30', icon: Award, iconClass: 'text-amber-600 dark:text-amber-400' },
  { value: 'BOMBERO_INICIAL', label: 'Bombero Inicial', short: 'Inicial', color: 'from-sky-600 to-sky-800', badge: 'bg-sky-500/15 text-sky-800 dark:bg-sky-600/20 dark:text-sky-300 border-sky-500/30', icon: GraduationCap, iconClass: 'text-sky-600 dark:text-sky-400' },
  { value: 'BOMBERO_PROFESIONAL', label: 'Bombero Profesional', short: 'Profesional', color: 'from-indigo-600 to-indigo-800', badge: 'bg-indigo-500/15 text-indigo-800 dark:bg-indigo-600/20 dark:text-indigo-300 border-indigo-500/30', icon: Briefcase, iconClass: 'text-indigo-600 dark:text-indigo-400' },
  { value: 'AUDITOR', label: 'Auditor / Inspector', short: 'Auditor', color: 'from-cyan-600 to-cyan-800', badge: 'bg-cyan-600/15 text-cyan-800 dark:bg-cyan-600/20 dark:text-cyan-400 border-cyan-600/25', icon: Search, iconClass: 'text-cyan-600 dark:text-cyan-400' },
];

export function roleInfo(val?: string | null): RoleMeta {
  return ROLES.find((r) => r.value === val) ?? ROLES.find((r) => r.value === 'BOMBERO')!;
}

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLES.map((r) => [r.value, r.label]),
);

/** Etiquetas cortas para sala de máquinas / cards */
export const ROLE_SHORT_LABELS: Record<string, string> = Object.fromEntries(
  ROLES.map((r) => [r.value, r.short]),
);
