export const INCIDENT_TIMELINE_KINDS = [
  'AVISO',
  'CONFIRMACION',
  'DIRECCION_ACTUALIZADA',
  'CAMBIO_CLAVE',
  'SEGUNDA_ALARMA',
  'TERCERA_ALARMA',
  'DESPACHO',
  'EN_CAMINO',
  'ACCIDENTE_RUTA',
  'UNIDAD_AVERIADA',
  'EN_LUGAR',
  'RECONOCIMIENTO',
  'PUESTO_MANDO',
  'PERIMETRO',
  'APOYO',
  'REFUERZO',
  'SAMU',
  'CARABINEROS',
  'PDI',
  'CONAF',
  'SENAPRED',
  'MUNICIPALIDAD',
  'ELECTRICIDAD',
  'AGUAS',
  'GRUA',
  'HIDRANTE',
  'AGUA_INSUFICIENTE',
  'VENTILACION',
  'ATAQUE_INTERIOR',
  'ATAQUE_EXTERIOR',
  'BUSQUEDA',
  'RESCATE',
  'EVACUACION',
  'CORTE_LUZ',
  'CORTE_GAS',
  'CIERRE_VIA',
  'HAZMAT',
  'EXPLOSION',
  'COLAPSO',
  'PROPAGACION',
  'REBROTE',
  'AMAGO',
  'PERSONAS',
  'PERSONA_ATRAPADA',
  'MENOR_INVOLUCRADO',
  'VICTIMA',
  'VICTIMA_FATAL',
  'TRASLADO',
  'INTOXICACION',
  'QUEMADURA',
  'RCP',
  'PRIMEROS_AUXILIOS',
  'BOMBERO_HERIDO',
  'BOMBERO_ATRAPADO',
  'MAYDAY',
  'CONTROLADO',
  'EXTINTO',
  'FALSA_ALARMA',
  'VIGILANCIA',
  'ENTREGA_LUGAR',
  'REGRESO',
  'EN_CUARTEL',
  'DISPONIBLE',
  'COMENTARIO',
] as const;

export type IncidentTimelineKind = (typeof INCIDENT_TIMELINE_KINDS)[number];

export type IncidentTimelineAction = {
  kind: IncidentTimelineKind;
  label: string;
  hint: string;
  tone: 'amber' | 'red' | 'sky' | 'emerald' | 'violet' | 'rose' | 'slate';
};

export type IncidentTimelineGroup = {
  id: string;
  title: string;
  actions: IncidentTimelineAction[];
};

export const INCIDENT_TIMELINE_CRITICAL: IncidentTimelineAction[] = [
  { kind: 'MAYDAY', label: 'MAYDAY', hint: 'Emergencia de bombero', tone: 'red' },
  { kind: 'BOMBERO_HERIDO', label: 'Bombero herido', hint: 'Lesión en servicio', tone: 'red' },
  { kind: 'BOMBERO_ATRAPADO', label: 'Bombero atrapado', hint: 'Personal comprometido', tone: 'red' },
  { kind: 'VICTIMA_FATAL', label: 'Víctima fatal', hint: 'Fallecido en el lugar', tone: 'red' },
  { kind: 'EXPLOSION', label: 'Explosión', hint: 'Riesgo inminente', tone: 'red' },
  { kind: 'COLAPSO', label: 'Colapso', hint: 'Estructura comprometida', tone: 'red' },
];

export const INCIDENT_TIMELINE_GROUPS: IncidentTimelineGroup[] = [
  {
    id: 'movimiento',
    title: 'Despacho y movimiento',
    actions: [
      { kind: 'AVISO', label: 'Aviso', hint: 'Llamada o denuncia', tone: 'amber' },
      { kind: 'CONFIRMACION', label: 'Confirmado', hint: 'Aviso verificado', tone: 'amber' },
      { kind: 'DIRECCION_ACTUALIZADA', label: 'Nueva dirección', hint: 'Cambio de ubicación', tone: 'amber' },
      { kind: 'CAMBIO_CLAVE', label: 'Cambio clave', hint: 'Actualiza 10-X', tone: 'violet' },
      { kind: 'DESPACHO', label: 'Despacho', hint: 'Unidades salen', tone: 'red' },
      { kind: 'SEGUNDA_ALARMA', label: '2ª alarma', hint: 'Más compañías', tone: 'red' },
      { kind: 'TERCERA_ALARMA', label: '3ª alarma', hint: 'Alarma mayor', tone: 'red' },
      { kind: 'EN_CAMINO', label: 'En camino', hint: 'Desplazamiento', tone: 'sky' },
      { kind: 'ACCIDENTE_RUTA', label: 'Accidente ruta', hint: 'Unidad siniestrada', tone: 'red' },
      { kind: 'UNIDAD_AVERIADA', label: 'Unidad averiada', hint: 'Falla mecánica', tone: 'amber' },
      { kind: 'EN_LUGAR', label: 'En el lugar', hint: 'Llegada al siniestro', tone: 'emerald' },
      { kind: 'RECONOCIMIENTO', label: 'Reconocimiento', hint: 'Evaluación inicial', tone: 'sky' },
      { kind: 'PUESTO_MANDO', label: 'Puesto mando', hint: 'Mando en terreno', tone: 'violet' },
      { kind: 'PERIMETRO', label: 'Perímetro', hint: 'Zona de seguridad', tone: 'slate' },
    ],
  },
  {
    id: 'apoyos',
    title: 'Apoyos y organismos',
    actions: [
      { kind: 'APOYO', label: 'Apoyo Cías', hint: 'Otras compañías', tone: 'violet' },
      { kind: 'REFUERZO', label: 'Refuerzo', hint: 'Más recursos', tone: 'violet' },
      { kind: 'SAMU', label: 'SAMU', hint: 'Ambulancia / salud', tone: 'rose' },
      { kind: 'CARABINEROS', label: 'Carabineros', hint: 'Apoyo policial', tone: 'sky' },
      { kind: 'PDI', label: 'PDI', hint: 'Investigación', tone: 'sky' },
      { kind: 'CONAF', label: 'CONAF', hint: 'Forestal', tone: 'emerald' },
      { kind: 'SENAPRED', label: 'SENAPRED', hint: 'Emergencia mayor', tone: 'amber' },
      { kind: 'MUNICIPALIDAD', label: 'Municipalidad', hint: 'Apoyo comunal', tone: 'slate' },
      { kind: 'ELECTRICIDAD', label: 'Eléctrica', hint: 'Corte / tendido', tone: 'amber' },
      { kind: 'AGUAS', label: 'Agua potable', hint: 'Red / camión aljibe', tone: 'sky' },
      { kind: 'GRUA', label: 'Grúa', hint: 'Retiro vehicular', tone: 'slate' },
    ],
  },
  {
    id: 'operacion',
    title: 'Operación en el lugar',
    actions: [
      { kind: 'HIDRANTE', label: 'Hidrante', hint: 'Abastecimiento', tone: 'sky' },
      { kind: 'AGUA_INSUFICIENTE', label: 'Sin agua', hint: 'Presión / caudal', tone: 'amber' },
      { kind: 'ATAQUE_INTERIOR', label: 'Ataque interior', hint: 'Ingreso a recinto', tone: 'red' },
      { kind: 'ATAQUE_EXTERIOR', label: 'Ataque exterior', hint: 'Desde afuera', tone: 'red' },
      { kind: 'VENTILACION', label: 'Ventilación', hint: 'Humo / gases', tone: 'sky' },
      { kind: 'BUSQUEDA', label: 'Búsqueda', hint: 'Revisión de recintos', tone: 'violet' },
      { kind: 'RESCATE', label: 'Rescate', hint: 'Extracción en curso', tone: 'rose' },
      { kind: 'EVACUACION', label: 'Evacuación', hint: 'Personas / sector', tone: 'amber' },
      { kind: 'CORTE_LUZ', label: 'Corte luz', hint: 'Suministro eléctrico', tone: 'amber' },
      { kind: 'CORTE_GAS', label: 'Corte gas', hint: 'Red de gas', tone: 'amber' },
      { kind: 'CIERRE_VIA', label: 'Cierre vía', hint: 'Tránsito cortado', tone: 'slate' },
      { kind: 'HAZMAT', label: 'HazMat', hint: 'Sustancias peligrosas', tone: 'violet' },
      { kind: 'PROPAGACION', label: 'Propagación', hint: 'Se extiende', tone: 'red' },
      { kind: 'REBROTE', label: 'Rebrote', hint: 'Vuelve a arder', tone: 'red' },
      { kind: 'AMAGO', label: 'Amago', hint: 'Principio de incendio', tone: 'amber' },
    ],
  },
  {
    id: 'personas',
    title: 'Personas y salud',
    actions: [
      { kind: 'PERSONAS', label: 'Personas', hint: 'Afectados / rescatados', tone: 'amber' },
      { kind: 'PERSONA_ATRAPADA', label: 'Atrapada', hint: 'Civil retenido', tone: 'red' },
      { kind: 'MENOR_INVOLUCRADO', label: 'Menor', hint: 'Niño/a involucrado', tone: 'rose' },
      { kind: 'VICTIMA', label: 'Víctima', hint: 'Herido civil', tone: 'rose' },
      { kind: 'TRASLADO', label: 'Traslado', hint: 'A hospital / SAPU', tone: 'rose' },
      { kind: 'INTOXICACION', label: 'Intoxicación', hint: 'Humo / gases', tone: 'rose' },
      { kind: 'QUEMADURA', label: 'Quemadura', hint: 'Lesión térmica', tone: 'rose' },
      { kind: 'RCP', label: 'RCP', hint: 'Reanimación', tone: 'red' },
      { kind: 'PRIMEROS_AUXILIOS', label: '1.os auxilios', hint: 'Atención en sitio', tone: 'rose' },
    ],
  },
  {
    id: 'cierre',
    title: 'Control y cierre',
    actions: [
      { kind: 'CONTROLADO', label: 'Controlado', hint: 'Situación controlada', tone: 'emerald' },
      { kind: 'EXTINTO', label: 'Extinto', hint: 'Fuego extinguido', tone: 'red' },
      { kind: 'VIGILANCIA', label: 'Vigilancia', hint: 'Sobreestadía', tone: 'sky' },
      { kind: 'FALSA_ALARMA', label: 'Falsa alarma', hint: 'Sin emergencia', tone: 'slate' },
      { kind: 'ENTREGA_LUGAR', label: 'Entrega lugar', hint: 'A dueño / Carabineros', tone: 'slate' },
      { kind: 'REGRESO', label: 'Regreso', hint: 'Retorno a cuartel', tone: 'amber' },
      { kind: 'EN_CUARTEL', label: 'En cuartel', hint: 'Unidades en base', tone: 'emerald' },
      { kind: 'DISPONIBLE', label: 'Disponible', hint: 'Listas para otro llamado', tone: 'emerald' },
    ],
  },
];

export const INCIDENT_TIMELINE_ACTIONS: IncidentTimelineAction[] = [
  ...INCIDENT_TIMELINE_CRITICAL,
  ...INCIDENT_TIMELINE_GROUPS.flatMap((group) => group.actions),
];

export const TIMELINE_TONE_CLASS: Record<IncidentTimelineAction['tone'], {
  dot: string;
  ring: string;
  badge: string;
  btn: string;
}> = {
  amber: {
    dot: 'bg-amber-400',
    ring: 'ring-amber-400/40',
    badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
    btn: 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200',
  },
  red: {
    dot: 'bg-red-500',
    ring: 'ring-red-500/40',
    badge: 'bg-red-500/15 text-red-800 dark:text-red-300 border-red-500/30',
    btn: 'border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-800 dark:text-red-200',
  },
  sky: {
    dot: 'bg-sky-400',
    ring: 'ring-sky-400/40',
    badge: 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30',
    btn: 'border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-800 dark:text-sky-200',
  },
  emerald: {
    dot: 'bg-emerald-400',
    ring: 'ring-emerald-400/40',
    badge: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
    btn: 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200',
  },
  violet: {
    dot: 'bg-violet-400',
    ring: 'ring-violet-400/40',
    badge: 'bg-violet-500/15 text-violet-800 dark:text-violet-300 border-violet-500/30',
    btn: 'border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-violet-800 dark:text-violet-200',
  },
  rose: {
    dot: 'bg-rose-400',
    ring: 'ring-rose-400/40',
    badge: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30',
    btn: 'border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-200',
  },
  slate: {
    dot: 'bg-slate-400',
    ring: 'ring-slate-400/40',
    badge: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
    btn: 'border-slate-500/40 bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 dark:text-slate-200',
  },
};

export function timelineTone(kind: string) {
  return INCIDENT_TIMELINE_ACTIONS.find((a) => a.kind === kind)?.tone ?? 'slate';
}
