import { useEffect, useState } from 'react';
import { CheckCircle2, FileDown, Loader2, Power, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { downloadEmergencyReport } from '../../lib/pdf/downloadEmergencyReport';
import type { IncidentTimelineKind } from '../../lib/incident-timeline';

type Props = {
  open: boolean;
  incident: { id: string; code: string; type: string; address: string } | null;
  initialComment?: string;
  closingKind?: IncidentTimelineKind | null;
  closingLabel?: string;
  onClose: () => void;
  onClosed: () => void;
};

export default function Bitacora360CloseModal({
  open, incident, initialComment = '', closingKind, closingLabel, onClose, onClosed,
}: Props) {
  const [comment, setComment] = useState('');
  const [outcome, setOutcome] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [pack, setPack] = useState<unknown>(null);

  useEffect(() => {
    if (!open || !incident) return;
    setComment(initialComment.trim());
    setOutcome(closingLabel ?? '');
    setActionsTaken('');
    setSaving(false);
    setDone(false);
    setPack(null);
  }, [open, incident?.id, initialComment, closingLabel]);

  if (!open || !incident) return null;

  const finish = () => {
    onClosed();
    onClose();
  };

  const handleConfirm = async () => {
    const summary = comment.trim();
    if (summary.length < 10) {
      toast.error('Escribe los últimos comentarios (mínimo 10 caracteres)');
      return;
    }
    setSaving(true);
    try {
      if (closingKind) {
        await api.post('/incident-timeline', {
          incidentId: incident.id,
          kind: closingKind,
          note: summary,
        });
      } else {
        await api.post('/incident-timeline', {
          incidentId: incident.id,
          kind: 'COMENTARIO',
          note: summary,
        });
      }
      const res = await api.post('/emergency-bitacora/finalize', {
        incidentId: incident.id,
        summary,
        outcome: outcome.trim() || undefined,
        actionsTaken: actionsTaken.trim() || undefined,
        observations: summary,
      });
      const reportPack = res.data?.reportPack ?? res.data;
      setPack(reportPack);
      setDone(true);
      toast.success('Emergencia cerrada');
      await downloadEmergencyReport(incident.id, { pack: reportPack });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message ?? (e instanceof Error ? e.message : 'No se pudo cerrar'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={done ? finish : onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            {done ? <FileDown className="h-5 w-5 text-red-500" /> : <Power className="h-5 w-5 text-emerald-600" />}
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {done ? 'Emergencia cerrada' : 'Terminar emergencia'}
              </h3>
              <p className="max-w-[280px] truncate text-[11px] text-slate-500">
                {incident.code} · {incident.type}
              </p>
            </div>
          </div>
          <button type="button" onClick={done ? finish : onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-slate-900">Quedó cerrada y con bitácora</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Se guardaron los últimos comentarios, se cerró la emergencia y se generó el informe PDF.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => downloadEmergencyReport(incident.id, { pack })}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-500"
              >
                <FileDown className="h-4 w-4" /> Descargar informe
              </button>
              <button
                type="button"
                onClick={finish}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
              <p className="text-xs text-slate-600">
                Confirma el cierre de <span className="font-bold text-slate-900">{incident.code}</span>.
                Se registran los últimos comentarios y se cierra la emergencia.
              </p>
              <p className="text-[11px] text-slate-500">{incident.address}</p>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Últimos comentarios *
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="Qué ocurrió al término, estado del lugar, unidades que regresan…"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Resultado
                </label>
                <input
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  placeholder="Controlado, extinto, falsa alarma, en cuartel…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Acciones finales
                </label>
                <textarea
                  value={actionsTaken}
                  onChange={(e) => setActionsTaken(e.target.value)}
                  rows={2}
                  placeholder="Entrega del lugar, vigilancia, retorno de unidades…"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleConfirm()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirmar y cerrar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
