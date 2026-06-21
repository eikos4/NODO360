import type { LucideIcon } from 'lucide-react';
import {
  Siren, Radio, Map, ShieldAlert, Shield, Droplets, Building2, Users, Network,
  Truck, BookOpen, Package, ClipboardCheck, Gauge, Fuel, Wrench, HeartPulse,
  GraduationCap, Signpost, DollarSign, ShoppingCart, HandCoins, FileText, Megaphone,
  Bell, Zap, BarChart3, Flame,
} from 'lucide-react';

export const HERO_IMAGE =
  'https://images.unsplash.com/photo-1584515933487-7798240-a8fc32896635?w=1920&q=80&auto=format&fit=crop';

export const DISPATCH_IMAGE =
  'https://images.unsplash.com/photo-154119567011-40212229558?w=1200&q=80&auto=format&fit=crop';

export const FIRE_IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800&q=80&auto=format&fit=crop',
    caption: 'Intervención estructural',
  },
  {
    src: 'https://images.unsplash.com/photo-1498993903804-417e2d50d813?w=800&q=80&auto=format&fit=crop',
    caption: 'Dotación en terreno',
  },
  {
    src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80&auto=format&fit=crop',
    caption: 'Respuesta nocturna',
  },
  {
    src: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80&auto=format&fit=crop',
    caption: 'Coordinación central',
  },
] as const;

export const DISPATCH_FLOW = [
  { step: '01', title: 'Clave 10-X', desc: 'Incendio, rescate, HazMat, forestal…' },
  { step: '02', title: 'Alarma y voz', desc: 'Tono real, sirena y TTS en central' },
  { step: '03', title: 'Despacho', desc: 'Voluntarios, maquinistas y carros' },
  { step: '04', title: 'Mapa en vivo', desc: 'Ubicación, hidrantes y cuarteles' },
  { step: '05', title: 'Sala pública', desc: 'Cuartel y comunidad sin login' },
  { step: '06', title: 'Bitácora', desc: 'Regreso, cierre y qué ocurrió' },
] as const;

export const PARRAL_COMPANIES = [
  { n: 1, name: 'Bomberos Parral', slug: 'bomberos-parral' },
  { n: 2, name: 'Segunda Compañía', slug: 'parral-segunda' },
  { n: 3, name: 'Tercera Compañía', slug: 'parral-tercera' },
  { n: 4, name: 'Cuarta Compañía', slug: 'parral-cuarta' },
  { n: 5, name: 'Quinta Catillo', slug: 'parral-quinta-catillo' },
  { n: 6, name: 'Sexta Remulcao', slug: 'parral-sexta-remulcao' },
] as const;

export type ModuleItem = { icon: LucideIcon; name: string; detail: string; highlight?: boolean };

export type ModuleGroup = { title: string; desc: string; image?: string; modules: ModuleItem[] };

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    title: 'Central de Despacho — corazón de NODO360',
    desc: 'Desde la alarma hasta el regreso al cuartel. Todo conectado en tiempo real.',
    image: DISPATCH_IMAGE,
    modules: [
      { icon: Siren, name: 'Despacho360', detail: 'Botonera 10-X, audio, TTS y despacho operativo', highlight: true },
      { icon: Radio, name: 'Sala de máquinas', detail: 'Vista pública por compañía — sin login', highlight: true },
      { icon: Zap, name: 'Central Express', detail: 'Panel unificado multi-compañía', highlight: true },
      { icon: Flame, name: 'Central Parral', detail: 'Mockup operativo del cuerpo de Parral', highlight: true },
      { icon: Map, name: 'Mapa 360', detail: 'Emergencias, hidrantes y flota georreferenciada' },
      { icon: ShieldAlert, name: 'Emergencias', detail: 'Registro, participantes, vehículos y cierre' },
      { icon: BookOpen, name: 'Bitácora de emergencia', detail: 'Qué ocurrió, acciones y regreso al cuartel' },
      { icon: Shield, name: 'Planes de emergencia', detail: 'Protocolos, checklist y versiones' },
      { icon: Droplets, name: 'Hidrantes', detail: 'Red hídrica por compañía en mapa' },
    ],
  },
  {
    title: 'Institución y dotación',
    desc: 'Multi-compañía con roles, guardias y trazabilidad operativa.',
    modules: [
      { icon: Building2, name: 'Compañías', detail: 'Cuarteles, logos, fotos y contacto' },
      { icon: Users, name: 'Personal', detail: 'Voluntarios, maquinistas y disponibilidad' },
      { icon: Network, name: 'Organigrama', detail: 'Mando, cargos y estructura' },
      { icon: Truck, name: 'Guardia', detail: 'Turnos, dotación y calendario' },
      { icon: BookOpen, name: 'Bitácora de guardia', detail: 'Novedades y entrega de turno' },
      { icon: Megaphone, name: 'Comunicados', detail: 'Avisos oficiales a la dotación' },
    ],
  },
  {
    title: 'Material, flota y salud',
    desc: 'Activos críticos y personas listas para intervenir.',
    modules: [
      { icon: Package, name: 'Inventario', detail: 'EPP, equipos y vencimientos' },
      { icon: ClipboardCheck, name: 'Auditoría física', detail: 'Conteo en terreno vs sistema' },
      { icon: Gauge, name: 'Motores', detail: 'Estado y kilometraje de vehículos' },
      { icon: Fuel, name: 'Libro de flota', detail: 'Combustible, servicios y operaciones' },
      { icon: Wrench, name: 'Mantención', detail: 'Preventiva, correctiva y talleres' },
      { icon: HeartPulse, name: 'Salud operacional', detail: 'Fichas médicas, alergias y exámenes' },
      { icon: GraduationCap, name: 'Capacitación', detail: 'Certificaciones y licencias' },
      { icon: Signpost, name: 'Simulacros', detail: 'Evacuación y puntos de reunión' },
    ],
  },
  {
    title: 'Administración e inteligencia',
    desc: 'Finanzas, documentación y visión ejecutiva para comandancia.',
    modules: [
      { icon: DollarSign, name: 'Finanzas', detail: 'Presupuesto anual por categoría' },
      { icon: ShoppingCart, name: 'Compras', detail: 'Órdenes y proveedores' },
      { icon: HandCoins, name: 'Tesorería social', detail: 'Cuotas, morosidad y aportes' },
      { icon: FileText, name: 'Documentos', detail: 'Protocolos, actas y certificados' },
      { icon: Bell, name: 'Alertas', detail: 'Vencimientos de EPP, docs y flota' },
      { icon: Zap, name: 'NODO360 Hub', detail: 'Panel BI multi-compañía' },
      { icon: BarChart3, name: 'Dashboard', detail: 'KPIs operativos al instante' },
      { icon: FileText, name: 'Reportes PDF', detail: 'Exportación institucional' },
    ],
  },
];

export const STATS = [
  { value: '25+', label: 'Módulos integrados' },
  { value: '6', label: 'Compañías demo Parral' },
  { value: '10-X', label: 'Claves de despacho' },
  { value: '24/7', label: 'Operación en vivo' },
] as const;
