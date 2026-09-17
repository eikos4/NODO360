/** Categorías principales de unidades — nomenclatura de material mayor. */
export const VEHICLE_TYPES = [
  {
    value: 'B',
    label: 'B (Bomba): Carros de extinción de incendios estructurales.',
  },
  {
    value: 'BF / F',
    label: 'BF / F (Forestal): Vehículos con tracción 4x4 especializados en incendios de pastizales y bosques.',
  },
  {
    value: 'Q',
    label: 'Q (Portaescalas): Vehículos destinados a labores de escala, altura, ventilación y entrada forzada.',
  },
  {
    value: 'R',
    label: 'R (Rescate): Unidades especializadas en rescate vehicular, técnico o estructural (como RX para rescate pesado).',
  },
  {
    value: 'S',
    label: 'S (Ambulancia): Vehículos de atención prehospitalaria y soporte sanitario.',
  },
  {
    value: 'Z',
    label: 'Z (Aljibe / Cisterna): Camiones destinados al transporte masivo de agua para abastecer a los carros bomba en zonas sin grifos.',
  },
  {
    value: 'H',
    label: 'H (Haz-Mat): Unidades dedicadas al manejo de materiales peligrosos (sustancias químicas, tóxicas o biológicas).',
  },
  {
    value: 'K / J',
    label: 'K (Comandancia) / J (Transporte): Vehículos administrativos, de mando o de transporte de personal.',
  },
] as const;

export type VehicleTypeValue = (typeof VEHICLE_TYPES)[number]['value'];

export function isKnownVehicleType(type?: string | null): boolean {
  return VEHICLE_TYPES.some((t) => t.value === type);
}

/** Código radial del tipo (B, BF, Q, R, S, Z, H, K). */
export function vehicleTypeAbbrev(type?: string): string {
  if (!type) return 'B';
  const raw = type.trim();
  const known = VEHICLE_TYPES.find((t) => t.value === raw);
  if (known) {
    if (known.value.startsWith('BF')) return 'BF';
    if (known.value.startsWith('K')) return 'K';
    return known.value;
  }

  const coded = raw.match(/^(BF|RX|B|F|Q|R|S|Z|H|K|J)\b/i);
  if (coded) return coded[1].toUpperCase();

  const t = raw.toLowerCase();
  if (t.includes('forestal') || t.includes('pastizal')) return 'BF';
  if (t.includes('haz') || t.includes('peligro')) return 'H';
  if (t.includes('aljibe') || t.includes('cisterna') || t.includes('tanque')) return 'Z';
  if (t.includes('ambul')) return 'S';
  if (t.includes('rescate')) return 'R';
  if (t.includes('escala') || t.includes('aére') || t.includes('aere') || t.includes('altura')) return 'Q';
  if (t.includes('comando') || t.includes('transporte') || t.includes('liviano') || t.includes('utilitario')) return 'K';
  if (t.includes('bomba')) return 'B';
  return raw.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'B';
}

export function vehicleTypeShortLabel(type?: string): string {
  const code = vehicleTypeAbbrev(type);
  const hit = VEHICLE_TYPES.find((t) => t.value === type || t.value.startsWith(code));
  return hit ? hit.label.split(':')[0] : type || code;
}
