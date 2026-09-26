import { vehicleTypeAbbrev } from './vehicle-types';

export type CarroMaterialItem = { id: string; label: string };

const COMMON: CarroMaterialItem[] = [
  { id: 'radio', label: 'Radio / PTT' },
  { id: 'linternas', label: 'Linternas' },
  { id: 'botiquin', label: 'Botiquín' },
  { id: 'cono', label: 'Conos / balizas' },
];

const BY_TYPE: Record<string, CarroMaterialItem[]> = {
  B: [
    { id: 'era', label: 'ERA / aire' },
    { id: 'mangueras', label: 'Mangueras' },
    { id: 'pitones', label: 'Pitones' },
    { id: 'hacha', label: 'Hacha / herramientas' },
    { id: 'escalera', label: 'Escalera' },
    { id: 'extintor', label: 'Extintor' },
  ],
  BF: [
    { id: 'batefuegos', label: 'Batefuegos' },
    { id: 'mochilas', label: 'Mochilas de agua' },
    { id: 'manguera_forestal', label: 'Manguera forestal' },
    { id: 'herramienta_manual', label: 'Herramienta manual' },
    { id: 'gps', label: 'GPS / mapa' },
  ],
  F: [
    { id: 'batefuegos', label: 'Batefuegos' },
    { id: 'mochilas', label: 'Mochilas de agua' },
    { id: 'manguera_forestal', label: 'Manguera forestal' },
    { id: 'herramienta_manual', label: 'Herramienta manual' },
  ],
  Z: [
    { id: 'mangueras_carga', label: 'Mangueras de carga' },
    { id: 'adaptadores', label: 'Adaptadores / llaves' },
    { id: 'nivel_agua', label: 'Estanque con agua' },
  ],
  Q: [
    { id: 'estabilizadores', label: 'Estabilizadores' },
    { id: 'cesta', label: 'Cesta / canastillo' },
    { id: 'rescate_altura', label: 'Material rescate altura' },
  ],
  R: [
    { id: 'hidraulico', label: 'Equipo hidráulico' },
    { id: 'estabilizacion', label: 'Estabilización' },
    { id: 'corte', label: 'Corte / extricación' },
    { id: 'proteccion', label: 'Mantas / protección' },
  ],
  RX: [
    { id: 'hidraulico', label: 'Equipo hidráulico' },
    { id: 'estabilizacion', label: 'Estabilización' },
    { id: 'corte', label: 'Corte / extricación' },
  ],
  H: [
    { id: 'traje', label: 'Traje / EPI HazMat' },
    { id: 'detector', label: 'Detector / gases' },
    { id: 'contencion', label: 'Contención / absorbente' },
  ],
  S: [
    { id: 'camilla', label: 'Camilla / inmovilización' },
    { id: 'oxigeno', label: 'Oxígeno' },
    { id: 'dea', label: 'DEA / monitor' },
  ],
  K: [
    { id: 'mando', label: 'Kit mando / mapas' },
    { id: 'comunicacion', label: 'Comunicaciones extra' },
  ],
  J: [
    { id: 'mando', label: 'Kit mando / mapas' },
    { id: 'comunicacion', label: 'Comunicaciones extra' },
  ],
};

export function carroMaterialsForType(type?: string): CarroMaterialItem[] {
  const code = vehicleTypeAbbrev(type) || 'B';
  const specific = BY_TYPE[code] ?? BY_TYPE.B;
  const seen = new Set<string>();
  const out: CarroMaterialItem[] = [];
  for (const item of [...specific, ...COMMON]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

type StoredMaterials = {
  checked: Record<string, boolean>;
  extras: string[];
};

function storageKey(vehicleId: string) {
  return `nodo360_carro_materials:${vehicleId}`;
}

export function readCarroMaterials(vehicleId: string): StoredMaterials {
  try {
    const raw = localStorage.getItem(storageKey(vehicleId));
    if (!raw) return { checked: {}, extras: [] };
    const parsed = JSON.parse(raw) as StoredMaterials;
    return {
      checked: parsed?.checked && typeof parsed.checked === 'object' ? parsed.checked : {},
      extras: Array.isArray(parsed?.extras) ? parsed.extras.filter((x) => typeof x === 'string') : [],
    };
  } catch {
    return { checked: {}, extras: [] };
  }
}

export function writeCarroMaterials(vehicleId: string, data: StoredMaterials) {
  try {
    localStorage.setItem(storageKey(vehicleId), JSON.stringify(data));
  } catch {
    /* */
  }
}

export function materialChecklistSummary(
  items: CarroMaterialItem[],
  checked: Record<string, boolean>,
  extras: string[],
): { ok: number; total: number; missing: string[]; line: string } {
  const allLabels = [...items.map((i) => i.label), ...extras];
  const missing: string[] = [];
  let ok = 0;
  for (const item of items) {
    if (checked[item.id]) ok += 1;
    else missing.push(item.label);
  }
  for (const extra of extras) {
    const key = `extra:${extra}`;
    if (checked[key]) ok += 1;
    else missing.push(extra);
  }
  const total = allLabels.length;
  const line =
    missing.length === 0
      ? `Material completo (${ok}/${total})`
      : `Material ${ok}/${total} · Falta: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? '…' : ''}`;
  return { ok, total, missing, line };
}
