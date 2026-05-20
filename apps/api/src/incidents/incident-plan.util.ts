import { EmergencyType } from '@prisma/client';

export type PlanChecklistItem = {
  id: string;
  text: string;
  required?: boolean;
  order?: number;
  checked?: boolean;
  checkedAt?: string | null;
  notes?: string | null;
};

export function mapIncidentTypeToEmergencyType(incidentType: string): EmergencyType {
  const t = incidentType.toLowerCase();
  if (t.includes('incendio')) return EmergencyType.INCENDIO;
  if (t.includes('inund')) return EmergencyType.INUNDACION;
  if (t.includes('derrumbe')) return EmergencyType.DERRUMBE;
  if (t.includes('rescate') || t.includes('médic') || t.includes('medic') || t.includes('apoyo')) {
    return EmergencyType.ACCIDENTE;
  }
  if (t.includes('terremoto') || t.includes('sismo')) return EmergencyType.TERREMOTO;
  return EmergencyType.OTRO;
}

export function snapshotPlanChecklist(raw: unknown): PlanChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any, idx) => ({
    id: String(item?.id ?? idx + 1),
    text: String(item?.text ?? item?.label ?? 'Ítem sin nombre'),
    required: item?.required !== false,
    order: typeof item?.order === 'number' ? item.order : idx + 1,
    checked: false,
    checkedAt: null,
    notes: null,
  }));
}

export function checklistProgress(items: PlanChecklistItem[]) {
  const total = items.length;
  const checked = items.filter((i) => i.checked).length;
  const required = items.filter((i) => i.required).length;
  const requiredDone = items.filter((i) => i.required && i.checked).length;
  return {
    total,
    checked,
    required,
    requiredDone,
    percent: total ? Math.round((checked / total) * 100) : 0,
    complete: total > 0 && checked === total,
    requiredComplete: required === 0 || requiredDone === required,
  };
}
