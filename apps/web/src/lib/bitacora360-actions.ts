import type { LucideIcon } from 'lucide-react';
import {
  Activity, AlertTriangle, BadgeCheck, Ban, Bell, BellRing, Building2,
  Car, CheckCircle2, Compass, Cross, Crosshair, Droplet, Droplets, Eye, Flag, Flame,
  Fuel, Gauge, HardHat, Hash, Heart, HeartPulse, Home, Layers, Leaf, LocateFixed,
  Megaphone, MessageSquare, Navigation, Phone, Plus, Power, Radio, RefreshCw,
  Repeat, Route, Search, Shield, ShieldAlert, ShieldCheck, Siren, Sparkles,
  Stethoscope, Syringe, Target, Thermometer, Truck, Undo2, User, UserPlus, UserX,
  Users, Wind, Wrench, Zap,
} from 'lucide-react';
import {
  INCIDENT_TIMELINE_CRITICAL,
  INCIDENT_TIMELINE_GROUPS,
  type IncidentTimelineAction,
  type IncidentTimelineKind,
} from './incident-timeline';

export const ACTION_ICON: Record<IncidentTimelineKind, LucideIcon> = {
  MAYDAY: Megaphone,
  BOMBERO_HERIDO: HeartPulse,
  BOMBERO_ATRAPADO: UserX,
  VICTIMA_FATAL: Cross,
  EXPLOSION: Zap,
  COLAPSO: Building2,
  AVISO: Phone,
  CONFIRMACION: BadgeCheck,
  DIRECCION_ACTUALIZADA: Navigation,
  CAMBIO_CLAVE: Hash,
  DESPACHO: Siren,
  SEGUNDA_ALARMA: Bell,
  TERCERA_ALARMA: BellRing,
  EN_CAMINO: Truck,
  ACCIDENTE_RUTA: Car,
  UNIDAD_AVERIADA: Wrench,
  EN_LUGAR: LocateFixed,
  RECONOCIMIENTO: Compass,
  PUESTO_MANDO: Flag,
  PERIMETRO: Shield,
  APOYO: Users,
  REFUERZO: UserPlus,
  SAMU: Cross,
  CARABINEROS: ShieldAlert,
  PDI: Search,
  CONAF: Leaf,
  SENAPRED: AlertTriangle,
  MUNICIPALIDAD: Layers,
  ELECTRICIDAD: Power,
  AGUAS: Droplets,
  GRUA: Truck,
  HIDRANTE: Droplet,
  AGUA_INSUFICIENTE: Gauge,
  ATAQUE_INTERIOR: Flame,
  ATAQUE_EXTERIOR: Target,
  VENTILACION: Wind,
  BUSQUEDA: Crosshair,
  RESCATE: Heart,
  EVACUACION: Route,
  CORTE_LUZ: Zap,
  CORTE_GAS: Fuel,
  CIERRE_VIA: Ban,
  HAZMAT: AlertTriangle,
  PROPAGACION: Repeat,
  REBROTE: RefreshCw,
  AMAGO: Sparkles,
  PERSONAS: Users,
  PERSONA_ATRAPADA: UserX,
  MENOR_INVOLUCRADO: User,
  VICTIMA: Stethoscope,
  TRASLADO: Syringe,
  INTOXICACION: Wind,
  QUEMADURA: Thermometer,
  RCP: Activity,
  PRIMEROS_AUXILIOS: HardHat,
  CONTROLADO: CheckCircle2,
  EXTINTO: Flag,
  VIGILANCIA: Eye,
  FALSA_ALARMA: Ban,
  ENTREGA_LUGAR: ShieldCheck,
  REGRESO: Undo2,
  EN_CUARTEL: Home,
  DISPONIBLE: BadgeCheck,
  COMENTARIO: MessageSquare,
};

export const TONE_ICON: Record<IncidentTimelineAction['tone'], string> = {
  red: 'text-red-600',
  amber: 'text-amber-600',
  sky: 'text-sky-600',
  emerald: 'text-emerald-600',
  violet: 'text-violet-600',
  rose: 'text-rose-600',
  slate: 'text-slate-500',
};

export const BITACORA360_GROUPS: Array<{
  id: string;
  title: string;
  accent: string;
  band: string;
  actions: IncidentTimelineAction[];
}> = [
  {
    id: 'critico',
    title: 'Crítico / personal',
    accent: 'text-red-600',
    band: 'border-red-200 bg-red-50',
    actions: INCIDENT_TIMELINE_CRITICAL,
  },
  ...INCIDENT_TIMELINE_GROUPS.map((group) => {
    if (group.id === 'personas') {
      return { ...group, accent: 'text-emerald-700', band: 'border-emerald-200 bg-emerald-50' };
    }
    if (group.id === 'cierre') {
      return { ...group, accent: 'text-cyan-700', band: 'border-cyan-200 bg-cyan-50' };
    }
    if (group.id === 'apoyos') {
      return { ...group, accent: 'text-sky-700', band: 'border-sky-200 bg-sky-50' };
    }
    if (group.id === 'operacion') {
      return { ...group, accent: 'text-amber-700', band: 'border-amber-200 bg-amber-50' };
    }
    return { ...group, accent: 'text-violet-700', band: 'border-violet-200 bg-violet-50' };
  }),
];
