import type { ElementType } from 'react';
import {
  Flame, Truck, Users, AlertTriangle, Plane, TrainFront,
  HelpCircle, Radio, Handshake, Building2, Shield, Trees, Leaf,
} from 'lucide-react';

export type EmergencySubdivision = {
  id: string;
  code: string;
  label: string;
  shortLabel: string;
};

export type EmergencyMainType = {
  id: string;
  code: string;
  label: string;
  shortLabel: string;
  icon: ElementType;
  color: string;
  ring: string;
  text: string;
  tone: number;
  subdivisions?: EmergencySubdivision[];
};

export type EmergencyEntry = {
  id: string;
  code: string;
  label: string;
  shortLabel: string;
  icon: ElementType;
  color: string;
  ring: string;
  text: string;
  tone: number;
  parentId?: string;
  parentCode?: string;
  subdivisions?: EmergencySubdivision[];
};

/** Claves operativas — estándar 10-X (Cuerpo de Bomberos de Parral) */
export const EMERGENCY_MAIN_TYPES: EmergencyMainType[] = [
  {
    id: '10-0',
    code: '10-0',
    label: 'Incendio estructural',
    shortLabel: 'Inc. estructural',
    icon: Flame,
    color: 'bg-red-600',
    ring: 'ring-red-500',
    text: 'text-white',
    tone: 880,
    subdivisions: [
      { id: '10-0-1', code: '10-0-1', label: 'Incendio estructural menor', shortLabel: 'Menor' },
      { id: '10-0-2', code: '10-0-2', label: 'Edificio de altura', shortLabel: 'Edificio altura', },
    ],
  },
  {
    id: '10-1',
    code: '10-1',
    label: 'Fuego en vehículo',
    shortLabel: 'Fuego vehículo',
    icon: Truck,
    color: 'bg-orange-600',
    ring: 'ring-orange-500',
    text: 'text-white',
    tone: 760,
  },
  {
    id: '10-2',
    code: '10-2',
    label: 'Pastizales, basura o forestal',
    shortLabel: 'Pastizal / forestal',
    icon: Trees,
    color: 'bg-amber-600',
    ring: 'ring-amber-500',
    text: 'text-white',
    tone: 820,
    subdivisions: [
      { id: '10-2-1', code: '10-2-1', label: 'Pastizal urbano', shortLabel: 'Pastizal urbano' },
      { id: '10-2-2', code: '10-2-2', label: 'Pastizal rural', shortLabel: 'Pastizal rural' },
      { id: '10-2-3', code: '10-2-3', label: 'Plantación agrícola', shortLabel: 'Plantación' },
      { id: '10-2-4', code: '10-2-4', label: 'Forestal', shortLabel: 'Forestal' },
      { id: '10-2-5', code: '10-2-5', label: 'Interfaz urbano-forestal', shortLabel: 'Interfaz U-F' },
    ],
  },
  {
    id: '10-3',
    code: '10-3',
    label: 'Rescate de personas',
    shortLabel: 'Rescate personas',
    icon: Users,
    color: 'bg-cyan-600',
    ring: 'ring-cyan-500',
    text: 'text-white',
    tone: 640,
  },
  {
    id: '10-4',
    code: '10-4',
    label: 'Rescate vehicular',
    shortLabel: 'Rescate vehíc.',
    icon: Truck,
    color: 'bg-blue-600',
    ring: 'ring-blue-500',
    text: 'text-white',
    tone: 660,
  },
  {
    id: '10-5',
    code: '10-5',
    label: 'Materiales peligrosos (HazMat)',
    shortLabel: 'HazMat',
    icon: AlertTriangle,
    color: 'bg-yellow-500',
    ring: 'ring-yellow-400',
    text: 'text-black',
    tone: 720,
  },
  {
    id: '10-6',
    code: '10-6',
    label: 'Emergencia aérea',
    shortLabel: 'Aérea',
    icon: Plane,
    color: 'bg-indigo-600',
    ring: 'ring-indigo-500',
    text: 'text-white',
    tone: 700,
  },
  {
    id: '10-7',
    code: '10-7',
    label: 'Emergencia ferroviaria',
    shortLabel: 'Ferroviaria',
    icon: TrainFront,
    color: 'bg-violet-600',
    ring: 'ring-violet-500',
    text: 'text-white',
    tone: 680,
  },
  {
    id: '10-8',
    code: '10-8',
    label: 'Otros llamados de emergencia',
    shortLabel: 'Otros',
    icon: HelpCircle,
    color: 'bg-slate-600',
    ring: 'ring-slate-400',
    text: 'text-white',
    tone: 540,
  },
  {
    id: '10-9',
    code: '10-9',
    label: 'Falsa alarma',
    shortLabel: 'Falsa alarma',
    icon: Radio,
    color: 'bg-slate-700',
    ring: 'ring-slate-500',
    text: 'text-white',
    tone: 400,
  },
  {
    id: '10-10',
    code: '10-10',
    label: 'Apoyo a otros cuerpos',
    shortLabel: 'Apoyo cuerpos',
    icon: Handshake,
    color: 'bg-purple-600',
    ring: 'ring-purple-500',
    text: 'text-white',
    tone: 560,
  },
  {
    id: '10-11',
    code: '10-11',
    label: 'Derrumbe o colapso estructural',
    shortLabel: 'Derrumbe',
    icon: Building2,
    color: 'bg-stone-600',
    ring: 'ring-stone-500',
    text: 'text-white',
    tone: 480,
  },
  {
    id: '10-12',
    code: '10-12',
    label: 'Apoyo bomberil externo',
    shortLabel: 'Apoyo externo',
    icon: Shield,
    color: 'bg-teal-700',
    ring: 'ring-teal-500',
    text: 'text-white',
    tone: 600,
  },
];

/** Tecla numérica → clave principal (0–9 → 10-0 … 10-9) */
export const EMERGENCY_DIGIT_SHORTCUTS: Record<string, string> = {
  '0': '10-0',
  '1': '10-1',
  '2': '10-2',
  '3': '10-3',
  '4': '10-4',
  '5': '10-5',
  '6': '10-6',
  '7': '10-7',
  '8': '10-8',
  '9': '10-9',
};

export const EMERGENCY_MAIN_DIGIT_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(EMERGENCY_DIGIT_SHORTCUTS).map(([digit, id]) => [id, digit]),
);

export function findEmergencyMainType(id: string): EmergencyMainType | undefined {
  return EMERGENCY_MAIN_TYPES.find((m) => m.id === id);
}

export function findEmergencyEntry(id: string): EmergencyEntry | undefined {
  for (const main of EMERGENCY_MAIN_TYPES) {
    if (main.id === id) {
      return {
        id: main.id,
        code: main.code,
        label: main.label,
        shortLabel: main.shortLabel,
        icon: main.icon,
        color: main.color,
        ring: main.ring,
        text: main.text,
        tone: main.tone,
        subdivisions: main.subdivisions,
      };
    }
    const sub = main.subdivisions?.find((s) => s.id === id);
    if (sub) {
      const subIcon =
        sub.id === '10-0-2' ? Building2
          : sub.id.startsWith('10-2') ? Leaf
            : main.icon;
      return {
        id: sub.id,
        code: sub.code,
        label: sub.label,
        shortLabel: sub.shortLabel,
        icon: subIcon,
        color: main.color,
        ring: main.ring,
        text: main.text,
        tone: main.tone,
        parentId: main.id,
        parentCode: main.code,
      };
    }
  }
  return undefined;
}

/** Lista plana de etiquetas para bitácora / API */
export function emergencyCodeToLabel(id: string): string {
  const entry = findEmergencyEntry(id);
  if (entry) return `${entry.code} — ${entry.label}`;
  return id;
}

export function isEmergencyTypeReadyForDispatch(typeId: string): boolean {
  const main = findEmergencyMainType(typeId);
  if (main?.subdivisions?.length) return false;
  return !!findEmergencyEntry(typeId);
}

export function getActiveMainWithSubdivisions(typeId: string): EmergencyMainType | undefined {
  if (!typeId) return undefined;
  const main = findEmergencyMainType(typeId);
  if (main?.subdivisions?.length) return main;
  for (const m of EMERGENCY_MAIN_TYPES) {
    if (m.subdivisions?.some((s) => s.id === typeId)) return m;
  }
  return undefined;
}
