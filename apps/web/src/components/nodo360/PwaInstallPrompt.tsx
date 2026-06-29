import React, { useEffect, useState } from 'react';
import { Download, Share, X, MonitorSmartphone } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    // 1. Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                             (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // Show iOS prompt slightly delayed
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    } else {
      // Show prompt on PC/Android anyway after delay (fallback if event doesn't fire)
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      // We don't return clearTimeout here because we still want to add event listener below
    }

    // 3. Detect Android / PC (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback si el evento nativo no se disparó o ya se consumió
      setShowManualInstructions(true);
      return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // Optionally, send analytics event with outcome of user choice
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[#06090e]/95 backdrop-blur-xl border border-red-500/30 p-5 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <button 
        onClick={() => setShowPrompt(false)}
        className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex gap-4 items-start">
        <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-red-900/30">
          <MonitorSmartphone className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1 pr-4">
          <h3 className="text-sm font-bold text-white mb-1">Instalar Nodo360 App</h3>
          {isIOS ? (
            <p className="text-xs text-slate-400 leading-relaxed">
              Para instalar la app en tu dispositivo Apple y usarla sin distracciones, presiona <Share className="inline w-3 h-3 mx-0.5 text-white" /> y luego <strong>"Agregar a inicio"</strong>.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Instala la plataforma en tu dispositivo para una experiencia a pantalla completa y notificaciones directas.
              </p>
              
              {showManualInstructions ? (
                <div className="bg-red-500/10 border border-red-500/30 p-2 rounded text-xs text-red-200">
                  ⚠️ <strong>Instalación manual requerida:</strong> Busca el ícono de instalación <MonitorSmartphone className="inline w-3 h-3"/> en la <strong>barra de direcciones superior</strong> de tu navegador o en el menú de opciones ("Agregar a la pantalla principal").
                </div>
              ) : (
                <button 
                  onClick={handleInstallClick}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-5 rounded-lg self-start transition-all shadow-md shadow-red-900/20 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Instalar Ahora
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
