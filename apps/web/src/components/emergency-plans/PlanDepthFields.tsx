import { Plus, Trash2, Paperclip, History, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

export type ChecklistItem = { id: string; text: string; required: boolean; order: number };

export const PLAN_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  ARCHIVED: 'Archivado',
};

export function parseChecklist(raw: unknown): ChecklistItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as ChecklistItem[];
  return [];
}

type Props = {
  form: any;
  setForm: (fn: (f: any) => any) => void;
  inputCls: string;
  planId?: string;
  attachments?: { id: string; name: string; fileUrl: string; uploadedAt: string }[];
  versions?: { id: string; version: number; title: string; snapshotAt: string; changedBy?: string }[];
  onRefresh?: () => void;
};

export function PlanDepthFields({ form, setForm, inputCls, planId, attachments = [], versions = [], onRefresh }: Props) {
  const checklist: ChecklistItem[] = form.checklist ?? [];

  const addCheckItem = () => {
    const next: ChecklistItem = {
      id: String(Date.now()),
      text: '',
      required: true,
      order: checklist.length + 1,
    };
    setForm((f: any) => ({ ...f, checklist: [...(f.checklist ?? []), next] }));
  };

  const updateCheck = (id: string, patch: Partial<ChecklistItem>) => {
    setForm((f: any) => ({
      ...f,
      checklist: (f.checklist ?? []).map((c: ChecklistItem) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const removeCheck = (id: string) => {
    setForm((f: any) => ({
      ...f,
      checklist: (f.checklist ?? []).filter((c: ChecklistItem) => c.id !== id),
    }));
  };

  const uploadAttachment = async (file: File) => {
    if (!planId) {
      toast.error('Guarda el plan primero para adjuntar archivos');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', file.name);
    try {
      await api.post(`/emergency-plans/${planId}/attachments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Adjunto subido');
      onRefresh?.();
    } catch {
      toast.error('Error al subir adjunto');
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!planId) return;
    try {
      await api.delete(`/emergency-plans/${planId}/attachments/${attachmentId}`);
      toast.success('Adjunto eliminado');
      onRefresh?.();
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="space-y-5 border-t border-slate-200 dark:border-slate-800 pt-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Estado del plan</label>
          <select value={form.status ?? 'DRAFT'} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))} className={inputCls}>
            {Object.entries(PLAN_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        {form.version != null && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Versión actual</label>
            <p className="text-sm font-bold text-sky-400 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5">v{form.version}</p>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
            <ListChecks className="w-3.5 h-3.5" /> Checklist operativo
          </label>
          <button type="button" onClick={addCheckItem} className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Ítem
          </button>
        </div>
        <div className="space-y-2">
          {checklist.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-600 py-3 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">Sin ítems — agrega pasos verificables</p>
          ) : (
            checklist.map((item, idx) => (
              <div key={item.id} className="flex gap-2 items-start bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl p-2">
                <span className="text-[10px] text-slate-500 font-mono pt-2.5 w-4">{idx + 1}</span>
                <input
                  value={item.text}
                  onChange={e => updateCheck(item.id, { text: e.target.value })}
                  placeholder="Descripción del paso..."
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                />
                <label className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-600 dark:text-slate-400 shrink-0 pt-2">
                  <input
                    type="checkbox"
                    checked={item.required}
                    onChange={e => updateCheck(item.id, { required: e.target.checked })}
                    className="accent-red-500"
                  />
                  Req.
                </label>
                <button type="button" onClick={() => removeCheck(item.id)} className="p-1.5 text-slate-500 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {planId && (
        <>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-2">
              <Paperclip className="w-3.5 h-3.5" /> Adjuntos
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) uploadAttachment(f);
                e.target.value = '';
              }}
              className="block w-full text-xs text-slate-500 dark:text-slate-600 dark:text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-50 dark:bg-slate-800 file:text-slate-800 dark:text-slate-200"
            />
            <ul className="mt-2 space-y-1">
              {attachments.map(a => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                  <a href={a.fileUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline truncate">{a.name}</a>
                  <button type="button" onClick={() => deleteAttachment(a.id)} className="text-red-400 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {versions.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-600 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-2">
                <History className="w-3.5 h-3.5" /> Historial de versiones
              </label>
              <ul className="max-h-36 overflow-y-auto space-y-1">
                {versions.map(v => (
                  <li key={v.id} className="text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 flex justify-between gap-2">
                    <span className="text-slate-800 dark:text-slate-200 font-medium">v{v.version} — {v.title}</span>
                    <span className="text-slate-500 shrink-0">{new Date(v.snapshotAt).toLocaleDateString('es-CL')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
