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

export type EmergencyVia = {
  id: string;
  code: string;
  viaCode: string;
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
  vias?: EmergencyVia[];
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
  kind?: 'main' | 'subtype' | 'via';
  viaCode?: string;
  subdivisions?: EmergencySubdivision[];
  vias?: EmergencyVia[];
};

const VIA_10_10 = {
  code: '10-10',
  label: 'Apoyo a otros cuerpos',
  shortLabel: 'Apoyo cuerpos',
};

const VIA_10_12 = {
  code: '10-12',
  label: 'Apoyo bomberil externo',
  shortLabel: 'Apoyo externo',
};

const VIA_10_11 = {
  code: '10-11',
  label: 'Derrumbe o colapso estructural',
  shortLabel: 'Derrumbe',
};

function viasFor(parent: string): EmergencyVia[] {
  const rows: EmergencyVia[] = [
    { id: `10-10x${parent}`, viaCode: parent, ...VIA_10_10 },
    { id: `10-12x${parent}`, viaCode: parent, ...VIA_10_12 },
  ];
  if (parent === '10-0') {
    rows.splice(1, 0, { id: '10-11x10-0', viaCode: '10-0', ...VIA_10_11 });
  }
  return rows;
}

function withVias(main: Omit<EmergencyMainType, 'vias'> & { vias?: EmergencyVia[] }): EmergencyMainType {
  return { ...main, vias: main.vias ?? viasFor(main.id) };
}

/** Familias 10-0 … 10-9. 10-10 y 10-12 van por tono; 10-11 solo por 10-0. */
export const EMERGENCY_MAIN_TYPES: EmergencyMainType[] = [
  withVias({
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
      { id: '10-0-2', code: '10-0-2', label: 'Edificio de altura', shortLabel: 'Edificio altura' },
    ],
  }),
  withVias({
    id: '10-1',
    code: '10-1',
    label: 'Fuego en vehículo',
    shortLabel: 'Fuego vehículo',
    icon: Truck,
    color: 'bg-orange-600',
    ring: 'ring-orange-500',
    text: 'text-white',
    tone: 760,
  }),
  withVias({
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
  }),
  withVias({
    id: '10-3',
    code: '10-3',
    label: 'Rescate de personas',
    shortLabel: 'Rescate personas',
    icon: Users,
    color: 'bg-cyan-600',
    ring: 'ring-cyan-500',
    text: 'text-white',
    tone: 640,
  }),
  withVias({
    id: '10-4',
    code: '10-4',
    label: 'Rescate vehicular',
    shortLabel: 'Rescate vehíc.',
    icon: Truck,
    color: 'bg-blue-600',
    ring: 'ring-blue-500',
    text: 'text-white',
    tone: 660,
  }),
  withVias({
    id: '10-5',
    code: '10-5',
    label: 'Materiales peligrosos (HazMat)',
    shortLabel: 'HazMat',
    icon: AlertTriangle,
    color: 'bg-yellow-500',
    ring: 'ring-yellow-400',
    text: 'text-black',
    tone: 720,
  }),
  withVias({
    id: '10-6',
    code: '10-6',
    label: 'Emergencia aérea',
    shortLabel: 'Aérea',
    icon: Plane,
    color: 'bg-indigo-600',
    ring: 'ring-indigo-500',
    text: 'text-white',
    tone: 700,
  }),
  withVias({
    id: '10-7',
    code: '10-7',
    label: 'Emergencia ferroviaria',
    shortLabel: 'Ferroviaria',
    icon: TrainFront,
    color: 'bg-violet-600',
    ring: 'ring-violet-500',
    text: 'text-white',
    tone: 680,
  }),
  withVias({
    id: '10-8',
    code: '10-8',
    label: 'Otros llamados de emergencia',
    shortLabel: 'Otros',
    icon: HelpCircle,
    color: 'bg-slate-600',
    ring: 'ring-slate-400',
    text: 'text-white',
    tone: 540,
  }),
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
];

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

export function familyHasPanel(main: EmergencyMainType): boolean {
  return Boolean(main.subdivisions?.length || main.vias?.length);
}

export function viaDisplayCode(via: Pick<EmergencyVia, 'code' | 'viaCode'>): string {
  return `${via.code} por ${via.viaCode}`;
}

export function normalizeEmergencyLookupId(id: string): string {
  const raw = String(id || '').trim();
  const por = raw.match(/^10-(\d+)\s+por\s+10-(\d+)/i);
  if (por) return `10-${por[1]}x10-${por[2]}`;
  const compact = raw.match(/^10-(\d+)x10-(\d+)$/i);
  if (compact) return `10-${compact[1]}x10-${compact[2]}`;
  return raw.split(' — ')[0]?.trim() || raw;
}

export function findEmergencyMainType(id: string): EmergencyMainType | undefined {
  const lookup = normalizeEmergencyLookupId(id);
  return EMERGENCY_MAIN_TYPES.find((m) => m.id === lookup);
}

function viaIcon(code: string): ElementType {
  if (code === '10-11') return Building2;
  if (code === '10-12') return Shield;
  return Handshake;
}

export function findEmergencyEntry(id: string): EmergencyEntry | undefined {
  const lookup = normalizeEmergencyLookupId(id);
  for (const main of EMERGENCY_MAIN_TYPES) {
    if (main.id === lookup) {
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
        kind: 'main',
        subdivisions: main.subdivisions,
        vias: main.vias,
      };
    }
    const sub = main.subdivisions?.find((s) => s.id === lookup);
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
        kind: 'subtype',
      };
    }
    const via = main.vias?.find((v) => v.id === lookup);
    if (via) {
      return {
        id: via.id,
        code: viaDisplayCode(via),
        label: via.label,
        shortLabel: `${via.shortLabel} por ${via.viaCode}`,
        icon: viaIcon(via.code),
        color: main.color,
        ring: main.ring,
        text: main.text,
        tone: main.tone,
        parentId: main.id,
        parentCode: main.code,
        kind: 'via',
        viaCode: via.code,
      };
    }
  }
  return undefined;
}

export function emergencyCodeToLabel(id: string): string {
  const entry = findEmergencyEntry(id);
  if (entry) return `${entry.code} — ${entry.label}`;
  return id;
}

export function isEmergencyTypeReadyForDispatch(typeId: string): boolean {
  return !!findEmergencyEntry(typeId);
}

export function getActiveMainWithSubdivisions(typeId: string): EmergencyMainType | undefined {
  if (!typeId) return undefined;
  const lookup = normalizeEmergencyLookupId(typeId);
  const main = findEmergencyMainType(lookup);
  if (main && familyHasPanel(main)) return main;
  for (const m of EMERGENCY_MAIN_TYPES) {
    if (m.subdivisions?.some((s) => s.id === lookup)) return m;
    if (m.vias?.some((v) => v.id === lookup)) return m;
  }
  return undefined;
}

export function listEmergencyDispatchOptions(): { id: string; label: string }[] {
  const rows: { id: string; label: string }[] = [];
  for (const main of EMERGENCY_MAIN_TYPES) {
    rows.push({ id: main.id, label: `${main.code} — ${main.label}` });
    for (const sub of main.subdivisions ?? []) {
      rows.push({ id: sub.id, label: `${sub.code} — ${sub.label}` });
    }
    for (const via of main.vias ?? []) {
      rows.push({ id: via.id, label: `${viaDisplayCode(via)} — ${via.label}` });
    }
  }
  return rows;
}
