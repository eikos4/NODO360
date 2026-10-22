export const RESOURCE_STATUSES = [
  'SOLICITADO',
  'DESPACHADO',
  'EN_TRASLADO',
  'ARRIBANDO',
  'DISPONIBLE',
  'ASIGNADO',
  'EN_OPERACION',
  'REHABILITACION',
  'RETORNANDO',
  'FUERA_DE_SERVICIO',
  'RETIRADO',
] as const;

export const SECTOR_STATUSES = ['EN_OPERACION', 'EN_ESPERA', 'COMPLETADO', 'SUSPENDIDO'] as const;

export const RESOURCE_TYPES = [
  'Carro bomba',
  'Aljibe',
  'Rescate',
  'Escala',
  'Ambulancia',
  'Forestal',
  'Policía',
  'Helicóptero',
  'Maquinaria',
  'SAMU',
  'CONAF',
  'Otro',
] as const;

export const TASK_PRESETS = [
  'Aguas',
  'Cortafuego',
  'Pala / herramienta',
  'Ataque directo',
  'Contención',
  'Línea de defensa',
  'Abastecimiento',
  'Enfriamiento',
  'Apoyo / Reserva',
  'Seguridad',
  'Evacuación',
  'Rescate',
  'Búsqueda',
  'Ventilación',
  'Protección de exposiciones',
  'Puesto médico',
  'Rehabilitación',
] as const;

export function taskIconFromMission(mission?: string | null) {
  if (!mission?.trim()) return null;
  const text = mission
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/pala|herramienta|manual|raspado/.test(text)) return '⛏️';
  if (/cortafuego|linea de defensa|linea|contencion/.test(text)) return '🪓';
  if (/agua|abastec|ataque directo|enfriamiento|manguera|hidrante/.test(text)) return '💧';
  if (/rescate/.test(text)) return '⛑️';
  if (/evacua/.test(text)) return '🏃';
  if (/medico|lesionado|samu/.test(text)) return '🚑';
  if (/busca/.test(text)) return '🔍';
  if (/ventil/.test(text)) return '💨';
  if (/segur|exposic/.test(text)) return '🛡️';
  if (/apoyo|reserva/.test(text)) return '🛟';
  if (/rehabil/.test(text)) return '🥤';
  return '📌';
}

export const SECTOR_PRESETS = [
  { name: 'Alfa', mission: 'Ataque directo' },
  { name: 'Bravo', mission: 'Contención' },
  { name: 'Charlie', mission: 'Apoyo / Reserva' },
  { name: 'Delta', mission: 'Seguridad' },
  { name: 'Abastecimiento', mission: 'Abastecimiento' },
  { name: 'Evacuación', mission: 'Evacuación' },
  { name: 'Rescate', mission: 'Rescate' },
  { name: 'Puesto médico', mission: 'Atención de lesionados' },
] as const;

export const NOVELTY_CATEGORIES = [
  { id: 'OPERACIONAL', label: 'Operacional' },
  { id: 'SEGURIDAD', label: 'Seguridad' },
  { id: 'MANDO', label: 'Mando' },
  { id: 'RECURSO', label: 'Recurso' },
  { id: 'CLIMA', label: 'Clima' },
  { id: 'EVACUACION', label: 'Evacuación' },
  { id: 'LESIONADO', label: 'Lesionado' },
  { id: 'SOLICITUD', label: 'Solicitud' },
  { id: 'INFORMACION', label: 'Información general' },
] as const;

export const POINT_KINDS = [
  { id: 'ABASTECIMIENTO', label: 'Abastecimiento', icon: '🚰' },
  { id: 'FUENTE_AGUA', label: 'Fuente de agua', icon: '💧' },
  { id: 'HIDRANTE', label: 'Hidrante', icon: '🧯' },
  { id: 'SEGURIDAD', label: 'Seguridad', icon: '🛡️' },
  { id: 'PUESTO_MEDICO', label: 'Puesto médico', icon: '🚑' },
  { id: 'REHABILITACION', label: 'Rehabilitación', icon: '🥤' },
  { id: 'HELIPUERTO', label: 'Helipuerto', icon: '🚁' },
  { id: 'EVACUACION', label: 'Evacuación', icon: '🏃' },
  { id: 'PUNTO_ENCUENTRO', label: 'Punto de encuentro', icon: '📍' },
  { id: 'ACCESO', label: 'Acceso', icon: '➡️' },
  { id: 'AREA_ESPERA', label: 'Área de espera', icon: '⏸️' },
  { id: 'PELIGRO', label: 'Peligro / HazMat', icon: '☢️' },
  { id: 'CORTAFUEGO', label: 'Cortafuego', icon: '🪓' },
  { id: 'LOGISTICA', label: 'Logística', icon: '📦' },
  { id: 'COMUNICACIONES', label: 'Comunicaciones', icon: '📡' },
  { id: 'ALBERGUE', label: 'Albergue', icon: '🏠' },
  { id: 'OTRO', label: 'Otro', icon: '📌' },
] as const;

export function pointKindMeta(kind?: string | null) {
  return POINT_KINDS.find((item) => item.id === kind) ?? POINT_KINDS[POINT_KINDS.length - 1];
}

export const REQUEST_PRIORITIES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'] as const;
export const REQUEST_STATUSES = ['SOLICITADO', 'DESPACHADO', 'EN_TRASLADO', 'ARRIBADO', 'CANCELADO'] as const;

export function statusLabel(value: string) {
  return value.replace(/_/g, ' ');
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function formatClock(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

/** Separa pines que caen en el mismo GPS para que no se tapen entre sí. */
export function spreadOverlappingMarkers<T extends { id: string; lat: number; lng: number }>(markers: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const marker of markers) {
    const key = `${marker.lat.toFixed(5)},${marker.lng.toFixed(5)}`;
    const group = groups.get(key);
    if (group) group.push(marker);
    else groups.set(key, [marker]);
  }
  const out: T[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    const radius = 0.00032;
    group.forEach((marker, index) => {
      const angle = (2 * Math.PI * index) / group.length - Math.PI / 2;
      const latScale = Math.cos((marker.lat * Math.PI) / 180) || 1;
      out.push({
        ...marker,
        lat: marker.lat + Math.cos(angle) * radius,
        lng: marker.lng + (Math.sin(angle) * radius) / latScale,
      });
    });
  }
  return out;
}

export function rankFromRole(role?: string | null) {
  if (role === 'COMANDANTE') return 'Comandante';
  if (role === 'CAPITAN') return 'Capitán';
  if (role === 'OPERADOR_CENTRAL') return 'Operador PC';
  if (role === 'SUPER_ADMIN') return 'Administrador';
  return 'Oficial';
}

export type CommandSnapshot = {
  incident: {
    id: string;
    code: string;
    type: string;
    address: string;
    status: string;
    latitude: number | null;
    longitude: number | null;
    dispatchedAt: string;
    company: { id: string; name: string; number: number };
  };
  post: {
    id: string;
    status: 'ACTIVE' | 'CLOSED';
    openedAt: string;
    closedAt: string | null;
    closeNote: string | null;
    latitude: number | null;
    longitude: number | null;
    openedByName: string;
    openedByRank: string | null;
    initialNote: string | null;
    command: { id: string; name: string; rank: string | null; assumedAt: string } | null;
    commandHistory: {
      id: string;
      name: string;
      rank: string | null;
      assumedAt: string;
      releasedAt: string | null;
      transferredByName: string | null;
    }[];
  } | null;
  resources: CommandResource[];
  sectors: CommandSector[];
  logs: CommandLog[];
  requests: CommandRequest[];
  points: CommandPoint[];
  responders: {
    userId: string;
    name: string;
    companyName: string | null;
    status: string | null;
    latitude: number | null;
    longitude: number | null;
  }[];
  counters: {
    firefighters: number;
    units: number;
    companies: number;
    external: number;
    sectorsActive: number;
    available: number;
    inTransit: number;
  };
  alerts: { level: 'warn' | 'critical'; message: string }[];
  canWrite: boolean;
};

export type CommandResource = {
  id: string;
  origin: 'NODO360' | 'EXTERNAL';
  vehicleId: string | null;
  label: string;
  type: string;
  companyName: string | null;
  institution: string | null;
  responsibleName: string | null;
  contact: string | null;
  staffing: number;
  status: string;
  sectorId: string | null;
  mission: string | null;
  latitude: number | null;
  longitude: number | null;
  arrivedAt?: string | null;
  withdrawnAt?: string | null;
  createdAt?: string | null;
};

export type CommandSector = {
  id: string;
  name: string;
  mission: string | null;
  responsibleName: string | null;
  status: string;
  polygon?: { lat: number; lng: number }[] | null;
  color?: string | null;
};

export const ZONE_COLORS = [
  { id: '#dc2626', label: 'Rojo · emergencia' },
  { id: '#ea580c', label: 'Naranja · amenaza' },
  { id: '#ca8a04', label: 'Amarillo · precaución' },
  { id: '#2563eb', label: 'Azul · agua / apoyo' },
  { id: '#16a34a', label: 'Verde · seguro' },
] as const;

export type CommandLog = {
  id: string;
  occurredAt: string;
  kind: string;
  action: string;
  detail: string | null;
  actorName: string;
  category: string | null;
};

export type CommandRequest = {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  priority: string;
  status: string;
  sectorId: string | null;
};

export type CommandPoint = {
  id: string;
  kind: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type CommandHub = {
  posts: {
    id: string;
    status: 'ACTIVE' | 'CLOSED';
    openedAt: string;
    closedAt: string | null;
    incident: {
      id: string;
      code: string;
      type: string;
      address: string;
      status: string;
      dispatchedAt: string;
      company: { id: string; name: string; number: number };
    };
    command: { name: string; rank: string | null; assumedAt: string } | null;
    resourceCount: number;
    sectorCount: number;
  }[];
  eligibleIncidents: {
    id: string;
    code: string;
    type: string;
    address: string;
    dispatchedAt: string;
    company: { id: string; name: string; number: number };
  }[];
};
