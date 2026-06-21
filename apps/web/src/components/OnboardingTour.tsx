import { useState, useEffect } from 'react';
import {
  X, ChevronLeft, ChevronRight, Flame, Building2, Users, Calendar,
  LayoutDashboard, FileText, ShoppingCart, DollarSign, CheckCircle, Zap, Siren,
  Bell, Megaphone, Droplets, Shield, ShieldAlert, Wrench, Gauge, Network,
  HandCoins, Package, Signpost, GraduationCap, Map,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MODULES = [
  {
    id: 'nodo360',
    title: 'NODO360 Hub',
    description: 'Centro de mando unificado: panel operativo por compañía y reportes analytics estilo BI.',
    features: ['Panel consolidado por cuartel', 'Reportes BI global y por compañía', 'Exportación PDF ejecutiva'],
    icon: Zap,
    route: '/nodo360',
    color: 'from-red-600 to-red-800',
  },
  {
    id: 'dashboard',
    title: 'Dashboard Ejecutivo',
    description: 'Vista general de estadísticas y métricas operativas de la institución.',
    features: ['KPIs en tiempo real', 'Alertas y vencimientos', 'Resumen operativo'],
    icon: LayoutDashboard,
    route: '/dashboard',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    id: 'central-despachos',
    title: 'Central de Despachos',
    description: 'Despacho operativo con alertas sonoras y URL pública de estado por cuartel.',
    features: ['Tipos de intervención preconfigurados', 'Alertas de audio', 'URL pública disponible/no disponible'],
    icon: Siren,
    route: '/despacho360',
    color: 'from-red-500 to-orange-600',
  },
  {
    id: 'alerts',
    title: 'Alertas',
    description: 'Monitoreo de vencimientos de mantención vehicular y equipamiento.',
    features: ['Vencidos y por vencer', 'Filtro por compañía', 'Exportar reporte PDF'],
    icon: Bell,
    route: '/alerts',
    color: 'from-yellow-500 to-amber-600',
  },
  {
    id: 'announcements',
    title: 'Comunicados',
    description: 'Avisos oficiales, eventos y comunicaciones internas del cuerpo de bomberos.',
    features: ['Comunicados y eventos', 'Prioridad y audiencia', 'Adjuntos y vigencia'],
    icon: Megaphone,
    route: '/announcements',
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'companies',
    title: 'Compañías y Cuarteles',
    description: 'Gestión de compañías de bomberos, ubicación e información de cuarteles.',
    features: ['Crear compañías', 'Asignar personal', 'Subir imágenes de cuarteles'],
    icon: Building2,
    route: '/companies',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'training',
    title: 'Capacitación y Certificaciones',
    description: 'Licencias, cursos, EPP y exámenes médicos con alertas de vencimiento por bombero.',
    features: ['Registro por categoría', 'Control de vigencia', 'Roster por compañía'],
    icon: GraduationCap,
    route: '/training',
    color: 'from-violet-600 to-purple-700',
  },
  {
    id: 'users',
    title: 'Personal y Usuarios',
    description: 'Gestión de bomberos, roles y permisos del sistema.',
    features: ['Registrar personal', 'Asignar roles (Comandante, Capitán, etc.)', 'Control de accesos'],
    icon: Users,
    route: '/users',
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'organigrama',
    title: 'Organigrama',
    description: 'Estructura jerárquica y cargos de cada compañía.',
    features: ['Visualización por compañía', 'Cargos y jerarquía', 'Vista institucional'],
    icon: Network,
    route: '/organigrama',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    id: 'inventory',
    title: 'Inventario Operativo',
    description: 'Control de vehículos y equipos de emergencia.',
    features: ['Registrar vehículos', 'Gestionar equipos', 'Fotos y estados operativos'],
    icon: Package,
    route: '/inventory',
    color: 'from-amber-500 to-amber-600',
  },
  {
    id: 'incidents',
    title: 'Emergencias',
    description: 'Bitácora de intervenciones: despacho, llegada, cierre e informe post-incidente.',
    features: ['Registro con código y tipo', 'Línea de tiempo', 'Participantes y fotos'],
    icon: ShieldAlert,
    route: '/incidents',
    color: 'from-red-600 to-red-700',
  },
  {
    id: 'maintenance',
    title: 'Mantención',
    description: 'Historial de mantenciones preventivas y correctivas de la flota.',
    features: ['Registro por vehículo', 'Costos y talleres', 'Próximas mantenciones'],
    icon: Wrench,
    route: '/maintenance',
    color: 'from-slate-500 to-slate-600',
  },
  {
    id: 'motores',
    title: 'Motores',
    description: 'Control de motobombas y equipos de extracción de agua.',
    features: ['Estado operativo', 'Horas de uso', 'Mantención programada'],
    icon: Gauge,
    route: '/motores',
    color: 'from-orange-500 to-orange-600',
  },
  {
    id: 'hydrants',
    title: 'Hidrantes y Red de Agua',
    description: 'Inventario de grifos y puntos de extracción con mapa georreferenciado.',
    features: ['Listado y mapa', 'Estado operativo', 'Inspecciones programadas'],
    icon: Droplets,
    route: '/hydrants',
    color: 'from-sky-500 to-sky-600',
  },
  {
    id: 'operational-map',
    title: 'Mapa Operativo 360',
    description: 'Vista geográfica unificada: cuarteles, hidrantes, evacuación y emergencias en un solo mapa.',
    features: ['Capas activables', 'Filtro por compañía', 'Detalle al hacer clic'],
    icon: Map,
    route: '/operational-map',
    color: 'from-cyan-600 to-teal-700',
  },
  {
    id: 'emergency-plans',
    title: 'Planes de Emergencia',
    description: 'Protocolos de contingencia, procedimientos y simulacros por compañía.',
    features: ['Planes por tipo y severidad', 'Pasos de procedimiento', 'Vinculación con simulacros'],
    icon: Shield,
    route: '/emergency-plans',
    color: 'from-rose-600 to-rose-700',
  },
  {
    id: 'evacuation',
    title: 'Simulacros y Evacuación',
    description: 'Programación de simulacros, puntos de encuentro y rutas de evacuación con mapa.',
    features: ['Simulacros vinculados a planes', 'Puntos de encuentro georreferenciados', 'Rutas y mapa operativo'],
    icon: Signpost,
    route: '/evacuation',
    color: 'from-pink-600 to-rose-700',
  },
  {
    id: 'shifts',
    title: 'Guardia y Turnos',
    description: 'Programación de guardias operativas y control de asistencia.',
    features: ['Crear turnos', 'Marcar asistencia', 'Ver calendario'],
    icon: Calendar,
    route: '/shifts',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    id: 'documents',
    title: 'Documentos',
    description: 'Gestión de documentos oficiales y control de vencimientos.',
    features: ['Subir documentos', 'Control de vencimientos', 'Acceso por rol'],
    icon: FileText,
    route: '/documents',
    color: 'from-rose-500 to-rose-600',
  },
  {
    id: 'purchases',
    title: 'Compras y Facturación',
    description: 'Control de adquisiciones, órdenes de compra y facturas.',
    features: ['Órdenes de compra', 'Facturas recibidas', 'Historial de proveedores'],
    icon: ShoppingCart,
    route: '/purchases',
    color: 'from-orange-500 to-orange-600',
  },
  {
    id: 'finance',
    title: 'Finanzas',
    description: 'Presupuesto institucional y control de ejecución financiera.',
    features: ['Presupuestos anuales por categoría', 'Ejecución vs planificado', 'Reportes financieros'],
    icon: DollarSign,
    route: '/finance',
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'membership',
    title: 'Tesorería Social',
    description: 'Cuotas y aportes de socios voluntarios, separado de la contabilidad operativa.',
    features: ['Cuotas mensuales por compañía', 'Registro de aportes', 'Control de morosos'],
    icon: HandCoins,
    route: '/membership',
    color: 'from-teal-500 to-teal-600',
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function OnboardingTour({ isOpen, onClose, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < MODULES.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('nodo360_onboarding_completed', 'true');
    onComplete();
  };

  const handleNavigate = () => {
    navigate(MODULES[currentStep].route);
    onClose();
  };

  if (!isOpen) return null;

  const module = MODULES[currentStep];
  const Icon = module.icon;
  const progress = ((currentStep + 1) / MODULES.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-slate-800">
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tour de NODO360</h2>
              <p className="text-xs text-slate-400">
                {MODULES.length} módulos · Paso {currentStep + 1} de {MODULES.length}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className={`w-full md:w-48 h-48 rounded-2xl bg-gradient-to-br ${module.color} p-6 flex flex-col items-center justify-center text-white shrink-0`}>
              <Icon className="w-16 h-16 mb-4" />
              <p className="text-sm font-medium text-center opacity-90">
                {currentStep + 1} / {MODULES.length}
              </p>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{module.title}</h3>
                <p className="text-slate-400">{module.description}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Funcionalidades</p>
                <ul className="space-y-2">
                  {module.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleNavigate}
                className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                Ir a {module.title} →
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/30">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto max-w-[200px] md:max-w-xs px-2 scrollbar-thin">
              {MODULES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  title={MODULES[idx].title}
                  className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                    idx === currentStep ? 'bg-red-500 scale-125' : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              {currentStep === MODULES.length - 1 ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Finalizar
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
