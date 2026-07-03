import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, Shield, Users, Award, ChevronLeft } from 'lucide-react';

export default function NosotrosPage() {
  const team = [
    {
      name: "Javier Rogazy ",
      role: "Capitan 5°Compañia Catillo",
      isFirefighter: true,
      description: "Especialista en emergencias con años de experiencia en terreno."
    },
    {
      name: "Martin Hermosilla",
      role: "Bombero",
      isFirefighter: true,
      description: "Uniendo la vocación de salvar vidas con el código."
    },
    {
      name: "Alexis Vasquez",
      role: "",
      isFirefighter: true,
      description: "Coordinación y estrategia en el corazón del proyecto."
    },
    {
      name: "Miembro 4",
      role: "Bombero / Logística",
      isFirefighter: true,
      description: "Asegurando que la plataforma responda cuando más se necesita."
    },
    {
      name: "Javier Chandía",
      role: "CTO KODESK.CL",
      isFirefighter: false,
      description: "Dando forma y estructura a la visión de Nodo360."
    }
  ];

  return (
    <div className="min-h-screen bg-[#06090e] font-sans selection:bg-red-500/30">
      {/* Header */}
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
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-900/10" />
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            ¿Quiénes <span className="text-red-500">Somos?</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
            Somos un equipo de 5 personas apasionadas por la tecnología y la seguridad.
            Nuestra mayor fortaleza es que <strong>4 de nosotros somos bomberos</strong>,
            lo que nos permite entender desde adentro las necesidades reales en el manejo de emergencias.
          </p>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4 sm:px-6 bg-[#0a0f18]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div 
                key={index}
                className="bg-[#111827] border border-white/5 rounded-2xl p-6 hover:border-red-500/30 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  {member.isFirefighter ? <Shield className="w-24 h-24 text-red-500" /> : <Users className="w-24 h-24 text-blue-500" />}
                </div>
                
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-slate-800 rounded-full mb-6 flex items-center justify-center border-2 border-white/10 group-hover:border-red-500/50 transition-colors">
                    <Award className={`w-8 h-8 ${member.isFirefighter ? 'text-red-400' : 'text-slate-400'}`} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                  <div className="text-sm font-medium text-red-400 mb-4">{member.role}</div>
                  
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {member.description}
                  </p>
                  
                  {member.isFirefighter && (
                    <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400">
                      <Flame className="w-3 h-3" />
                      Bombero Activo
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#06090e] py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-4">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
              <Flame className="w-3 h-3 text-white" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-white tracking-tight">NODO</span>
              <span className="font-light text-red-500">360</span>
            </div>
          </Link>
          <p className="text-sm text-slate-500">
            Tecnología al servicio de quienes salvan vidas.
          </p>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} Nodo360. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
