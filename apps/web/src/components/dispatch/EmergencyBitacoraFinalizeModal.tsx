import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, FileDown, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { PublicEmergency } from './DispatchEmergenciesPanel';
import { downloadEmergencyReport } from '../../lib/pdf/downloadEmergencyReport';

type Props = {
  open: boolean;
  slug: string;
  emergency: PublicEmergency | null;
  apiBase: string;
  requestHeaders?: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
  onOmit?: (emergency: PublicEmergency) => void;
};

export default function EmergencyBitacoraFinalizeModal({
  open, slug, emergency, apiBase, requestHeaders, onClose, onSaved, onOmit,
}: Props) {
  const [summary, setSummary] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [outcome, setOutcome] = useState('');
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [reportPack, setReportPack] = useState<any>(null);

  useEffect(() => {
    if (!open || !emergency) return;
    setSummary('');
    setActionsTaken('');
    setOutcome('');
    setObservations('');
    setDone(false);
    setReportPack(null);
  }, [open, emergency?.id]);

  if (!open || !emergency) return null;

  const finish = () => {
    onSaved();
    onClose();
  };

  const handleSave = async () => {
    if (summary.trim().length < 10) {
      toast.error('Describe qué ocurrió (mínimo 10 caracteres)');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/emergency-bitacora/public/${slug}/finalize`, {
        method: 'POST',
        headers: requestHeaders ?? { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: emergency.id,
          summary: summary.trim(),
          actionsTaken: actionsTaken.trim() || undefined,
          outcome: outcome.trim() || undefined,
          observations: observations.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'No se pudo guardar la bitácora');
      }
      const body = await res.json().catch(() => ({}));
      const pack = body.reportPack ?? null;
      setReportPack(pack);
      setDone(true);
      toast.success('Emergencia cerrada · bitácora guardada');
      await downloadEmergencyReport(emergency.id, { pack, slug });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleOmit = () => {
    onOmit?.(emergency);
    onClose();
  };

  const inputCls =
    'w-full bg-[#0f172a] border border-slate-600 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500';

  return (
    <div className="sala-dark-modal fixed inset-0 z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={done ? finish : handleOmit} />
      <div className="relative w-full max-w-lg bg-[#1a2f4a] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            {done ? <FileDown className="w-5 h-5 text-red-400" /> : <BookOpen className="w-5 h-5 text-emerald-400" />}
            <div>
              <h3 className="text-sm font-bold text-white">{done ? 'Informe NODO360' : 'Bitácora de regreso'}</h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[280px]">{emergency.type}</p>
            </div>
          </div>
          <button type="button" onClick={done ? finish : handleOmit} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <>
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">Emergencia finalizada</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Quedó registrada la bitácora, la línea de tiempo, unidades, personal y respuestas de la app.
                    Descarga el informe PDF estilo NODO360.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={() => downloadEmergencyReport(emergency.id, { pack: reportPack, slug })}
                className="keep-on-color flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm py-3 rounded-xl"
              >
                <FileDown className="w-4 h-4" />
                Descargar informe PDF
              </button>
              <button
                type="button"
                onClick={finish}
                className="px-4 py-3 text-sm text-slate-200 hover:text-white rounded-xl border border-slate-600"
              >
                Listo
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-slate-400">
                Registra qué ocurrió en la emergencia. Al guardar se genera el informe PDF de todo lo ocurrido.
              </p>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">¿Qué ocurrió? *</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={4}
                  placeholder="Condiciones encontradas, dotación desplegada, tiempos de llegada..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Acciones realizadas</label>
                <textarea
                  value={actionsTaken}
                  onChange={(e) => setActionsTaken(e.target.value)}
                  rows={2}
                  placeholder="Extinción, ventilación, rescate..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Resultado</label>
                <input
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Controlado, extinto, falsa alarma..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observaciones</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            <div className="px-5 pb-2">
              <p className="text-[10px] text-amber-400/90 text-center">
                Si omites, podrás completar la bitácora en &quot;Últimas emergencias&quot;
              </p>
            </div>

            <div className="flex gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="keep-on-color flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Cerrar e informar PDF
              </button>
              <button
                type="button"
                onClick={handleOmit}
                className="px-4 py-3 text-sm text-slate-400 hover:text-white rounded-xl border border-slate-600"
              >
                Omitir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
