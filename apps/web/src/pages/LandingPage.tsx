import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Flame, Play, ChevronRight, Siren, Radio, Map,
  CheckCircle2, Users, BellRing, MapPin, Activity, 
  ShieldAlert, Building2, Smartphone, DollarSign, Calendar,
  BarChart3, FileText, Clock
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAuthHydrated } from '../hooks/useAuthHydrated';
import { getDefaultRouteForRole } from '../lib/roleAccess';

export default function LandingPage() {
  const hydrated = useAuthHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-red-500/30">
      <NavBar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <ModulesShowcaseSection />
      <MobileAndGridSection />
      <TimelineSection />
      <PricingAndAnalyticsSection />
      <FooterSection />
    </div>
  );
}

function NavBar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#06090e]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-white text-lg tracking-tight">NODO</span>
            <span className="font-light text-red-500 text-lg">360</span>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <a href="#inicio" className="text-white">Inicio</a>
          <a href="#plataforma" className="hover:text-white transition-colors">Plataforma <ChevronRight className="inline w-3 h-3 rotate-90 opacity-50"/></a>
          <a href="#modulos" className="hover:text-white transition-colors">Módulos <ChevronRight className="inline w-3 h-3 rotate-90 opacity-50"/></a>
          <a href="#demo" className="hover:text-white transition-colors">Demo</a>
          <a href="#planes" className="hover:text-white transition-colors">Planes</a>
          <a href="#contacto" className="hover:text-white transition-colors">Contacto</a>
        </nav>
        <Link
          to="/login"
          className="bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-5 py-2 rounded-lg transition-all"
        >
          Solicitar Demo
        </Link>
      </div>
    </header>
  );
}

function HeroSection() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide(s => (s + 1) % 3);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="inicio" className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 bg-[#06090e]">
        <div className={`absolute inset-0 transition-opacity duration-1000 ${activeSlide === 0 ? 'opacity-100' : 'opacity-0'}`}>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-90"
          >
            <source src="/video.mp4" type="video/mp4" />
          </video>
        </div>
        <div className={`absolute inset-0 transition-opacity duration-1000 ${activeSlide === 1 ? 'opacity-100' : 'opacity-0'}`}>
          <img src="/bg-central2.png" alt="Central de Alarmas" className="w-full h-full object-cover opacity-90" />
        </div>

        <div className={`absolute inset-0 transition-opacity duration-1000 ${activeSlide === 2 ? 'opacity-100' : 'opacity-0'}`}>
          <img src="/bg-central.png" alt="Central de Alarmas" className="w-full h-full object-cover opacity-90" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#06090e]/30 via-[#06090e]/10 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06090e]/30 via-[#06090e]/10 to-transparent pointer-events-none" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 w-full py-20 z-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 mb-6">
            <Siren className="w-4 h-4 text-red-500" />
            <span className="text-red-400 text-xs font-bold tracking-[0.2em] uppercase">
              Tecnología al servicio de quienes salvan vidas
            </span>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight">
            La plataforma integral para <span className="text-red-500">Cuerpos de Bomberos</span>
          </h1>
          
          <p className="mt-6 text-xl text-slate-300 max-w-2xl font-light leading-relaxed">
            Conecta, coordina y responde en tiempo real.
            Nodo360 centraliza personas, recursos y emergencias en una sola plataforma para decisiones más rápidas, eficientes y seguras.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-3.5 rounded-lg transition-all"
            >
              Solicitar Demo
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              to="/central/bomberos-parral"
              className="inline-flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-400 text-white font-bold px-8 py-3.5 rounded-lg transition-all"
            >
              <Play className="w-4 h-4" />
              Ver Plataforma
            </Link>
          </div>

          <div className="mt-20 flex items-center gap-4">
            <p className="text-sm text-slate-400">Confiado por compañías en todo Chile</p>
            <div className="flex gap-2 opacity-70 grayscale hover:grayscale-0 transition-all">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">1</div>
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">2</div>
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">3</div>
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs">4</div>
            </div>
            <p className="text-white font-bold text-lg border-l border-slate-700 pl-4 ml-2">
              Tecnologia <br/><span className="text-xs font-normal text-slate-400">Cuerpos de Bomberos</span>
            </p>
          </div>
        </div>
      </div>

      {/* Carousel Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
        <button onClick={() => setActiveSlide(0)} className={`w-8 h-1 rounded-full transition-all duration-300 ${activeSlide === 0 ? 'bg-red-500 w-12' : 'bg-white/20 hover:bg-white/40'}`} aria-label="Ver video" />
        <button onClick={() => setActiveSlide(1)} className={`w-8 h-1 rounded-full transition-all duration-300 ${activeSlide === 1 ? 'bg-red-500 w-12' : 'bg-white/20 hover:bg-white/40'}`} aria-label="Ver central 1" />
        <button onClick={() => setActiveSlide(2)} className={`w-8 h-1 rounded-full transition-all duration-300 ${activeSlide === 2 ? 'bg-red-500 w-12' : 'bg-white/20 hover:bg-white/40'}`} aria-label="Ver central 2" />
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 divide-x divide-slate-100">
          <div className="flex items-center gap-4 px-4">
            <Users className="w-8 h-8 text-red-500 stroke-[1.5]" />
            <div>
              <p className="text-2xl font-black text-slate-900">Más</p>
              <p className="text-xs text-slate-500 font-medium">Compañías conectadas</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-4">
            <ShieldAlert className="w-8 h-8 text-red-500 stroke-[1.5]" />
            <div>
              <p className="text-2xl font-black text-slate-900">8</p>
              <p className="text-xs text-slate-500 font-medium">Módulos operativos</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-4">
            <Clock className="w-8 h-8 text-red-500 stroke-[1.5]" />
            <div>
              <p className="text-2xl font-black text-slate-900">24/7</p>
              <p className="text-xs text-slate-500 font-medium">Trazabilidad completa</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-4">
            <BellRing className="w-8 h-8 text-red-500 stroke-[1.5]" />
            <div>
              <p className="text-2xl font-black text-slate-900">100%</p>
              <p className="text-xs text-slate-500 font-medium">Alertas en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-4 px-4">
            <MapPin className="w-8 h-8 text-red-500 stroke-[1.5]" />
            <div>
              <p className="text-2xl font-black text-slate-900">500+</p>
              <p className="text-xs text-slate-500 font-medium">Cuarteles en red</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="plataforma" className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1fr,1.5fr] gap-16 items-center">
          <div>
            <h2 className="text-xs font-bold text-red-500 tracking-widest uppercase mb-3">Qué es NODO360</h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-8 max-w-sm">
              Una plataforma digital diseñada por y para Bomberos de Chile. 
              Integra despacho, disponibilidad, flota, inventario y analítica en una solución segura, escalable y fácil de usar.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <Radio className="w-6 h-6 text-red-500 mb-3" />
                <h3 className="font-bold text-slate-900 text-sm">Conecta</h3>
                <p className="text-xs text-slate-500 mt-1">Personas, compañías y recursos en línea.</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <Activity className="w-6 h-6 text-red-500 mb-3" />
                <h3 className="font-bold text-slate-900 text-sm">Coordina</h3>
                <p className="text-xs text-slate-500 mt-1">Despachos más rápidos y eficientes.</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <ShieldAlert className="w-6 h-6 text-red-500 mb-3" />
                <h3 className="font-bold text-slate-900 text-sm">Controla</h3>
                <p className="text-xs text-slate-500 mt-1">Información confiable al instante.</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <BarChart3 className="w-6 h-6 text-red-500 mb-3" />
                <h3 className="font-bold text-slate-900 text-sm">Mejora</h3>
                <p className="text-xs text-slate-500 mt-1">Decisiones basadas en datos reales.</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <h3 className="text-red-500 text-xs font-bold tracking-widest uppercase mb-2">Central de Despacho</h3>
            <p className="text-slate-500 text-sm mb-6">Despacho táctico y operacional en tiempo real.</p>
            <ul className="space-y-2 mb-8 text-sm text-slate-700 font-medium">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-500"/> Botonera 10-X personalizable</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-500"/> Despacho rápido de recursos</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-500"/> Mapa en vivo y geolocalización</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-red-500"/> Bitácora completa de eventos</li>
            </ul>

            <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-[#0f172a] w-full hidden sm:block pointer-events-none transform -rotate-1 hover:rotate-0 transition-all duration-300 mt-2">
              <div className="h-8 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-slate-500 ml-4 font-mono">central-despacho.nodo360.cl</span>
              </div>
              <div className="p-4 grid grid-cols-[1fr,2fr,1fr] gap-4 h-[300px]">
                <div className="space-y-2">
                  <div className="text-[10px] text-slate-400 font-bold mb-2">DESPACHO</div>
                  <div className="grid grid-cols-3 gap-1">
                    {['10-0', '10-1', '10-2', '10-3', '10-4', '10-5', '10-6', '10-7', '10-8'].map(c => (
                      <div key={c} className="bg-slate-800 rounded text-[9px] font-bold text-center py-2 text-white border border-slate-700">{c}</div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-lg border border-slate-700 relative overflow-hidden flex items-center justify-center">
                  <Map className="w-12 h-12 text-slate-700 absolute opacity-50" />
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute top-1/3 left-1/2" />
                  <div className="absolute top-2 left-2 text-[10px] font-bold text-white bg-slate-900 px-2 py-1 rounded">MAPA EN VIVO</div>
                </div>
                <div className="space-y-3">
                  <div className="text-[10px] text-slate-400 font-bold mb-2">RECURSOS ASIGNADOS</div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-2 flex items-center justify-between">
                    <span className="text-[10px] text-red-400 font-bold">B-1</span>
                    <span className="text-[8px] text-slate-500">En ruta</span>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400 font-bold">RX-1</span>
                    <span className="text-[8px] text-slate-500">En el lugar</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="sm:hidden h-40 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">
              Vista Central de Despacho
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModulesShowcaseSection() {
  return (
    <section className="bg-slate-50 py-16 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xs font-bold text-red-500 tracking-widest uppercase mb-2">Sala de Máquinas Pública</h3>
            <p className="text-slate-500 text-sm mb-6">Visión de disponibilidad para la comunidad.</p>
            <ul className="grid grid-cols-2 gap-y-2 mb-6 text-xs text-slate-600 font-medium">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-red-500"/> Personal y maquinistas</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-red-500"/> Material operativo</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-red-500"/> Estado técnico</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-red-500"/> Tiempo real</li>
            </ul>
            
            <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-4 shadow-xl pointer-events-none">
              <div className="flex items-center gap-3 mb-4 border-b border-slate-800 pb-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white">4ta</div>
                <div>
                  <h4 className="text-white text-xs font-bold">CUARTA COMPAÑÍA DE PARRAL</h4>
                  <p className="text-slate-400 text-[10px]">Cia. de Máquinas</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded text-center">
                  <div className="text-emerald-400 text-sm font-bold">3</div>
                  <div className="text-[8px] text-slate-400 uppercase">Disponibles</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 p-2 rounded text-center">
                  <div className="text-blue-400 text-sm font-bold">1</div>
                  <div className="text-[8px] text-slate-400 uppercase">Otra unidad</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 p-2 rounded text-center">
                  <div className="text-red-400 text-sm font-bold">0</div>
                  <div className="text-[8px] text-slate-400 uppercase">En emergencia</div>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-2 rounded text-center">
                  <div className="text-slate-400 text-sm font-bold">0</div>
                  <div className="text-[8px] text-slate-400 uppercase">No disp.</div>
                </div>
              </div>
              <div className="text-[9px] text-slate-400 font-bold mb-2 uppercase">Carros Operativos (4)</div>
              <div className="grid grid-cols-2 gap-2">
                 <div className="bg-slate-800/50 border border-slate-700 p-2 rounded text-left flex justify-between items-center">
                    <div>
                      <span className="text-white text-xs font-bold">B-1</span>
                      <div className="text-[8px] text-emerald-400 mt-1">100% Operativo</div>
                    </div>
                 </div>
                 <div className="bg-slate-800/50 border border-slate-700 p-2 rounded text-left flex justify-between items-center">
                    <div>
                      <span className="text-white text-xs font-bold">RX-1</span>
                      <div className="text-[8px] text-emerald-400 mt-1">90% Operativo</div>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-red-500 tracking-widest uppercase mb-2">Central Express</h3>
            <p className="text-slate-500 text-sm mb-6">Control global de múltiples compañías.</p>
            <ul className="grid grid-cols-1 gap-y-2 mb-6 text-xs text-slate-600 font-medium">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-red-500"/> Vista consolidada por territorio</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-red-500"/> Emergencias y recursos en vivo</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-red-500"/> Indicadores de desempeño</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-red-500"/> Toma de decisiones estratégicas</li>
            </ul>
            
            <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-4 shadow-xl pointer-events-none mt-2 lg:mt-8">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 mb-3">
                Central Global
              </div>
              <div className="grid grid-cols-4 gap-4 mb-4 text-center divide-x divide-slate-800 border-b border-slate-800 pb-4">
                <div>
                   <div className="text-emerald-400 text-lg font-black">35</div>
                   <div className="text-[9px] text-slate-500 mt-1">Cias. conectadas</div>
                </div>
                <div>
                   <div className="text-red-400 text-lg font-black">8</div>
                   <div className="text-[9px] text-slate-500 mt-1">Emergencias activas</div>
                </div>
                <div>
                   <div className="text-amber-400 text-lg font-black">12</div>
                   <div className="text-[9px] text-slate-500 mt-1">Carros en camino</div>
                </div>
                <div>
                   <div className="text-blue-400 text-lg font-black">55</div>
                   <div className="text-[9px] text-slate-500 mt-1">Total cuarteles</div>
                </div>
              </div>
              <div className="h-24 bg-slate-800/50 rounded-lg border border-slate-700 flex items-center justify-center relative overflow-hidden">
                 <Map className="w-8 h-8 text-slate-700 absolute opacity-30" />
                 <div className="flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                 </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}

function MobileAndGridSection() {
  return (
    <section id="modulos" className="bg-white py-20 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <div>
            <h2 className="text-xs font-bold text-red-500 tracking-widest uppercase mb-2">En terreno, siempre conectado</h2>
            <p className="text-slate-500 text-sm mb-6">App móvil para bomberos.</p>
            <ul className="space-y-2 mb-10 text-xs text-slate-600 font-medium">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-red-500"/> Alertas y despachos al instante</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-red-500"/> Confirmación de en camino</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-red-500"/> Detalle táctico de la emergencia</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-red-500"/> Comunicación segura y simple</li>
            </ul>

            <div className="flex justify-center gap-6">
              <div className="w-36 h-72 rounded-[2rem] border-4 border-slate-900 bg-[#0f172a] shadow-xl overflow-hidden relative">
                <div className="absolute top-0 inset-x-0 h-4 bg-slate-900 rounded-b-xl w-1/2 mx-auto" />
                <div className="p-3 pt-6 flex flex-col h-full items-center justify-center">
                  <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center mb-3">
                    <Siren className="w-5 h-5 text-red-500 animate-pulse" />
                  </div>
                  <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-1 text-center">Alarma recibida</div>
                  <div className="text-2xl text-white font-black mb-1">10-0</div>
                  <div className="text-[9px] text-slate-400 mb-6 text-center leading-tight">Incendio estructural<br/>Av. Independencia 1334</div>
                  <div className="w-full bg-red-600 py-2 rounded-lg text-white text-[9px] font-bold text-center">Confirmar recibo</div>
                </div>
              </div>
              
              <div className="w-36 h-72 rounded-[2rem] border-4 border-slate-900 bg-[#0f172a] shadow-xl overflow-hidden relative hidden sm:block">
                <div className="absolute top-0 inset-x-0 h-4 bg-slate-900 rounded-b-xl w-1/2 mx-auto" />
                <div className="p-3 pt-6 flex flex-col h-full items-center justify-center">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-2">En camino</div>
                  <div className="text-xs text-slate-400 mb-1">Tiempo estimado</div>
                  <div className="text-xl text-white font-black mb-6">02:15 min</div>
                  <div className="text-xs text-slate-400 mb-1">Recursos asignados</div>
                  <div className="text-sm text-white font-bold mb-6">B-1 • Q-1</div>
                  <div className="w-full bg-emerald-600 py-2 rounded-lg text-white text-[9px] font-bold text-center">Llegué al cuartel</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-red-500 tracking-widest uppercase mb-2">Módulos Integrados</h2>
            <p className="text-slate-500 text-sm mb-8">Todo lo que tu compañía necesita en un solo lugar.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-100 flex gap-3 items-start bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                <Users className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Personal</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Gestión de voluntarios, roles y disponibilidad.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 flex gap-3 items-start bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                <Flame className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Emergencias</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Gestión completa de incidentes y despachos.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 flex gap-3 items-start bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                <Building2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Flota</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Carros, mantenciones y estado técnico.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 flex gap-3 items-start bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Inventario</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Equipos, EPP y material menor.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 flex gap-3 items-start bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                <FileText className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Documentos</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Protocolos, regulaciones y archivos.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 flex gap-3 items-start bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                <DollarSign className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Finanzas</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Ingresos, egresos y presupuestos.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 flex gap-3 items-start bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                <Calendar className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Guardias</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Programación y control de guardias.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 flex gap-3 items-start bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all">
                <BarChart3 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Reportes</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Informes y estadísticas personalizadas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TimelineSection() {
  return (
    <section className="bg-slate-50 py-16 border-t border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="text-xs font-bold text-red-500 tracking-widest uppercase mb-12">De la alarma al cierre</h2>
        
        <div className="relative flex flex-col md:flex-row justify-between items-center md:items-start gap-8 md:gap-4">
           <div className="hidden md:block absolute top-6 left-10 right-10 h-0.5 border-t-2 border-dashed border-red-200 -z-10" />
           
           {[
             { step: '1', icon: BellRing, title: 'Alarma recibida', desc: 'La emergencia ingresa a la central.' },
             { step: '2', icon: Siren, title: 'Despacho', desc: 'Se asignan recursos adecuados.' },
             { step: '3', icon: MapPin, title: 'En camino', desc: 'Unidades confirman ruta y ETA.' },
             { step: '4', icon: CheckCircle2, title: 'En el lugar', desc: 'Operaciones y reporte en tiempo real.' },
           ].map((item, i) => (
             <div key={i} className="flex flex-col items-center text-center max-w-[200px] bg-slate-50">
                <div className="w-12 h-12 rounded-full bg-white border-2 border-red-500 flex items-center justify-center shadow-md relative">
                   <item.icon className="w-5 h-5 text-red-500" />
                   <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                     {item.step}
                   </div>
                </div>
                <h4 className="mt-4 font-bold text-slate-900 text-sm">{item.title}</h4>
                <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
             </div>
           ))}
        </div>
      </div>
    </section>
  );
}

function PricingAndAnalyticsSection() {
  return (
    <section id="planes" className="bg-white py-20 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1fr,1.5fr] gap-16 items-start">
          
          <div>
            <h2 className="text-xs font-bold text-red-500 tracking-widest uppercase mb-2">Indicadores y Analítica</h2>
            <p className="text-slate-500 text-sm mb-8">Métricas que impulsan mejores decisiones.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="border border-slate-100 p-4 rounded-xl shadow-sm">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Emergencias (mes)</p>
                <div className="text-2xl font-black text-slate-900">128</div>
                <p className="text-[9px] text-emerald-500 mt-1">↑ 12% vs mes anterior</p>
              </div>
              <div className="border border-slate-100 p-4 rounded-xl shadow-sm">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Tiempo prom. despacho</p>
                <div className="text-2xl font-black text-slate-900">05:42</div>
                <p className="text-[9px] text-emerald-500 mt-1">↓ 8% vs mes anterior</p>
              </div>
            </div>
            
            <div className="border border-slate-100 p-4 rounded-xl shadow-sm h-48 flex items-end justify-between gap-1 pb-0 px-2 pt-8 relative overflow-hidden">
              <div className="absolute top-3 left-4 text-[10px] font-bold text-slate-500 uppercase">Emergencias por día (últimos 30 días)</div>
              {Array.from({ length: 30 }).map((_, i) => {
                const h = Math.floor(Math.random() * 80) + 20;
                return (
                  <div key={i} className="w-full bg-slate-800 rounded-t-sm" style={{ height: `${h}%` }} />
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold text-red-500 tracking-widest uppercase mb-2">Planes para cada necesidad</h2>
            <p className="text-slate-500 text-sm mb-8">Elige el plan que impulsa a tu cuerpo de bomberos.</p>
            
            <div className="grid sm:grid-cols-3 gap-4">
              
              <div className="border border-slate-200 rounded-2xl p-5 bg-white flex flex-col hover:border-red-200 transition-colors">
                <h3 className="font-bold text-slate-900 text-sm mb-2">Compañía</h3>
                <div className="mb-4">
                  <span className="text-xl font-black text-slate-900">$29.990</span>
                  <span className="text-[10px] text-slate-500"> /mes</span>
                </div>
                <ul className="space-y-3 mb-6 flex-grow">
                  <li className="flex items-start gap-2 text-[10px] text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0"/> Todos los módulos básicos</li>
                  <li className="flex items-start gap-2 text-[10px] text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0"/> Hasta 50 usuarios</li>
                  <li className="flex items-start gap-2 text-[10px] text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0"/> 1 GB de almacenamiento</li>
                  <li className="flex items-start gap-2 text-[10px] text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0"/> Soporte por email</li>
                </ul>
                <button className="w-full py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">Seleccionar</button>
              </div>

              <div className="border-2 border-red-500 rounded-2xl p-5 bg-white flex flex-col relative shadow-xl transform sm:-translate-y-2">
                <div className="absolute top-0 inset-x-0 -translate-y-1/2 flex justify-center">
                  <span className="bg-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-full tracking-wider uppercase">Más Popular</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-2 mt-2">Cuerpo</h3>
                <div className="mb-4">
                  <span className="text-xl font-black text-slate-900">$79.990</span>
                  <span className="text-[10px] text-slate-500"> /mes</span>
                </div>
                <ul className="space-y-3 mb-6 flex-grow">
                  <li className="flex items-start gap-2 text-[10px] text-slate-600"><CheckCircle2 className="w-3 h-3 text-red-500 shrink-0"/> Todos los módulos avanzados</li>
                  <li className="flex items-start gap-2 text-[10px] text-slate-600"><CheckCircle2 className="w-3 h-3 text-red-500 shrink-0"/> Usuarios ilimitados</li>
                  <li className="flex items-start gap-2 text-[10px] text-slate-600"><CheckCircle2 className="w-3 h-3 text-red-500 shrink-0"/> Almacenamiento ilimitado</li>
                  <li className="flex items-start gap-2 text-[10px] text-slate-600"><CheckCircle2 className="w-3 h-3 text-red-500 shrink-0"/> Soporte prioritario 24/7</li>
                </ul>
                <button className="w-full py-2 bg-red-600 rounded-lg text-xs font-bold text-white hover:bg-red-500 transition-colors">Seleccionar</button>
              </div>

              <div className="border border-slate-200 rounded-2xl p-5 bg-white flex flex-col hover:border-red-200 transition-colors">
                <h3 className="font-bold text-slate-900 text-sm mb-2">Enterprise</h3>
                <div className="mb-4">
                  <span className="text-xl font-black text-slate-900">A medida</span>
                </div>
                <ul className="space-y-3 mb-6 flex-grow">
                  <li className="flex items-start gap-2 text-[10px] text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0"/> Solución personalizada</li>
                  <li className="flex items-start gap-2 text-[10px] text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0"/> Integraciones API</li>
                  <li className="flex items-start gap-2 text-[10px] text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0"/> SLA garantizado</li>
                  <li className="flex items-start gap-2 text-[10px] text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0"/> Soporte dedicado</li>
                </ul>
                <button className="w-full py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">Contactar ventas</button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer id="contacto" className="bg-[#06090e] pt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mb-16">
        <div className="bg-gradient-to-r from-red-950 to-slate-900 rounded-2xl border border-red-900/50 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-red-900/50">
              <Flame className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-2">Juntos, más preparados.<br/>Juntos, salvamos más vidas.</h2>
              <p className="text-slate-400 text-sm">Únete a cuerpos de bomberos que ya confían en Nodo360.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <Link to="/login" className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm transition-colors text-center shadow-lg shadow-red-900/30">
              Solicitar Demo <ChevronRight className="inline w-4 h-4" />
            </Link>
            <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-lg text-sm transition-colors text-center">
              Hablar con un experto
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
                <Flame className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-white text-sm">NODO360</span>
            </Link>
            <p className="text-xs text-slate-500 max-w-xs mb-4">
              Tecnología al servicio de quienes salvan vidas.
            </p>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-4 h-4 bg-slate-800 rounded flex items-center justify-center">@</span> contacto@nodo360.cl
            </p>
          </div>
          
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Plataforma</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-red-400 transition-colors">Características</a></li>
              <li><a href="#" className="hover:text-red-400 transition-colors">Seguridad</a></li>
              <li><a href="#" className="hover:text-red-400 transition-colors">Integraciones</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Recursos</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-red-400 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-red-400 transition-colors">Casos de éxito</a></li>
              <li><a href="#" className="hover:text-red-400 transition-colors">Documentación</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Empresa</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-red-400 transition-colors">Nosotros</a></li>
              <li><a href="#" className="hover:text-red-400 transition-colors">Trabaja con nosotros</a></li>
              <li><a href="#" className="hover:text-red-400 transition-colors">Políticas</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/5 pt-8">
          <p className="text-[10px] text-slate-500">
            © {new Date().getFullYear()} Nodo360. Todos los derechos reservados kodesk.cl.
          </p>
          <div className="flex items-center gap-4 text-slate-500">
            <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-xs">IG</div>
            <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-xs">FB</div>
            <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-xs">YT</div>
            <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer text-xs">IN</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
