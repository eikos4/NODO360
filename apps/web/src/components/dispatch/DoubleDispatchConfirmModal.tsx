import { AlertTriangle, X } from 'lucide-react';

type Props = {
  companyName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDark?: boolean;
};

export default function DoubleDispatchConfirmModal({ companyName, onConfirm, onCancel, isDark = true }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-6 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 ${
        isDark 
          ? 'bg-slate-900 border-slate-700 shadow-black/50' 
          : 'bg-white border-slate-200 shadow-slate-300'
      }`}>
        {/* Header Icon */}
        <div className="flex justify-center mb-4 relative">
          <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-500" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2 mb-8">
          <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Emergencia Activa Detectada
          </h2>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            El cuartel <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{companyName}</strong> ya 
            se encuentra en una emergencia sin finalizar.
          </p>
          <p className={`text-sm leading-relaxed font-medium mt-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
            ¿Estás seguro de que deseas despacharlo de nuevo?
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
              isDark 
                ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
          >
            Despachar de nuevo
          </button>
        </div>
      </div>
    </div>
  );
}
