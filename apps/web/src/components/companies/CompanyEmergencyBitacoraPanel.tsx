import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Plus, Pencil, Trash2, X, CheckCircle2, MapPin, Calendar,
  ShieldAlert, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

type BitacoraEntry = {
  id: string;
  title: string;
  emergencyType?: string | null;
  address?: string | null;
  occurredAt: string;
  summary: string;
  actionsTaken?: string | null;
  personnelNotes?: string | null;
  vehicleNotes?: string | null;
  outcome?: string | null;
  observations?: string | null;
  source: string;
  incident?: { id: string; code: string; type: string } | null;
  author?: { firstName: string; lastName: string } | null;
};

const EMPTY_FORM = {
  title: '',
  emergencyType: '',
  address: '',
  occurredAt: new Date().toISOString().slice(0, 16),
  summary: '',
  actionsTaken: '',
  personnelNotes: '',
  vehicleNotes: '',
  outcome: '',
  observations: '',
};

const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500';

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: 'Manual',
  SALA_MAQUINAS: 'Sala de máquinas',
  INCIDENTE: 'Incidente',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

type Props = {
  companyId: string;
  companyName: string;
};

export default function CompanyEmergencyBitacoraPanel({ companyId, companyName }: Props) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canEdit = ['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO', 'OPERADOR_CENTRAL'].includes(user?.role ?? '');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BitacoraEntry | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['emergency-bitacora', companyId],
    queryFn: () => api.get('/emergency-bitacora', { params: { companyId, limit: 50 } }).then((r) => r.data),
    enabled: !!companyId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['emergency-bitacora', companyId] });

  const createMut = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/emergency-bitacora', {
        ...data,
        companyId,
        occurredAt: new Date(data.occurredAt).toISOString(),
      }),
    onSuccess: () => { invalidate(); toast.success('Bitácora registrada'); resetForm(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al guardar'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) =>
      api.put(`/emergency-bitacora/${id}`, {
        ...data,
        occurredAt: new Date(data.occurredAt).toISOString(),
      }),
    onSuccess: () => { invalidate(); toast.success('Bitácora actualizada'); resetForm(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/emergency-bitacora/${id}`),
    onSuccess: () => { invalidate(); toast.success('Entrada eliminada'); },
    onError: () => toast.error('Error al eliminar'),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (entry: BitacoraEntry) => {
    setEditing(entry);
    setForm({
      title: entry.title,
      emergencyType: entry.emergencyType ?? '',
      address: entry.address ?? '',
      occurredAt: entry.occurredAt.slice(0, 16),
      summary: entry.summary,
      actionsTaken: entry.actionsTaken ?? '',
      personnelNotes: entry.personnelNotes ?? '',
      vehicleNotes: entry.vehicleNotes ?? '',
      outcome: entry.outcome ?? '',
      observations: entry.observations ?? '',
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else createMut.mutate(form);
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-red-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Bitácora de emergencias</p>
            <p className="text-[11px] text-slate-500 truncate">{companyName}</p>
          </div>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-2 rounded-xl shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />Registrar
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              {editing ? 'Editar registro' : 'Nuevo registro'}
            </p>
            <button type="button" onClick={resetForm} className="text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Título *</label>
              <input value={form.title} onChange={set('title')} required placeholder="Ej: Incendio estructural Av. Principal" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Tipo emergencia</label>
              <input value={form.emergencyType} onChange={set('emergencyType')} placeholder="10-0 Incendio..." className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Fecha y hora *</label>
              <input type="datetime-local" value={form.occurredAt} onChange={set('occurredAt')} required className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Dirección</label>
              <input value={form.address} onChange={set('address')} placeholder="Lugar del hecho" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">¿Qué ocurrió? *</label>
              <textarea value={form.summary} onChange={set('summary')} required rows={3} minLength={10}
                placeholder="Descripción de la emergencia, dotación desplegada, condiciones encontradas..."
                className={`${inputCls} resize-none`} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Acciones realizadas</label>
              <textarea value={form.actionsTaken} onChange={set('actionsTaken')} rows={2} placeholder="Tareas de extinción, rescate, ventilación..." className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Dotación / personal</label>
              <input value={form.personnelNotes} onChange={set('personnelNotes')} placeholder="Bomberos, maquinistas..." className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Carros / patentes</label>
              <input value={form.vehicleNotes} onChange={set('vehicleNotes')} placeholder="B-1, B-2..." className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Resultado</label>
              <input value={form.outcome} onChange={set('outcome')} placeholder="Controlado, extinto, falsa alarma..." className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Observaciones</label>
              <textarea value={form.observations} onChange={set('observations')} rows={2} className={`${inputCls} resize-none`} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={createMut.isPending || updateMut.isPending}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {editing ? 'Guardar cambios' : 'Guardar bitácora'}
            </button>
            <button type="button" onClick={resetForm} className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2">Cancelar</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-slate-500 animate-spin" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 bg-slate-800/40 border border-dashed border-slate-700 rounded-xl">
          <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Sin registros de emergencia</p>
          <p className="text-xs text-slate-600 mt-1">Documenta intervenciones y regreso al cuartel</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {entries.map((entry: BitacoraEntry) => {
            const open = expandedId === entry.id;
            return (
              <div key={entry.id} className="bg-slate-800/50 border border-slate-700/80 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : entry.id)}
                  className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-800/80 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-600/15 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{entry.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(entry.occurredAt)}</span>
                      {entry.address && <span className="flex items-center gap-1 truncate max-w-[180px]"><MapPin className="w-3 h-3 shrink-0" />{entry.address}</span>}
                      <span className="text-amber-500/80">{SOURCE_LABEL[entry.source] ?? entry.source}</span>
                    </div>
                  </div>
                  {open ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
                </button>

                {open && (
                  <div className="px-3 pb-3 pt-0 border-t border-slate-700/60 ml-11 space-y-2">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Qué ocurrió</p>
                      <p className="text-xs text-slate-300 leading-relaxed">{entry.summary}</p>
                    </div>
                    {entry.actionsTaken && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Acciones</p>
                        <p className="text-xs text-slate-400">{entry.actionsTaken}</p>
                      </div>
                    )}
                    {entry.outcome && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-0.5">Resultado</p>
                        <p className="text-xs text-emerald-400/90">{entry.outcome}</p>
                      </div>
                    )}
                    {(entry.personnelNotes || entry.vehicleNotes) && (
                      <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
                        {entry.personnelNotes && <span>Dotación: {entry.personnelNotes}</span>}
                        {entry.vehicleNotes && <span>Carros: {entry.vehicleNotes}</span>}
                      </div>
                    )}
                    {entry.incident && (
                      <p className="text-[10px] text-slate-600">Vinculado: {entry.incident.code}</p>
                    )}
                    {entry.author && (
                      <p className="text-[10px] text-slate-600">Registrado por {entry.author.firstName} {entry.author.lastName}</p>
                    )}
                    {canEdit && (
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => openEdit(entry)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-700">
                          <Pencil className="w-3 h-3" />Editar
                        </button>
                        {['SUPER_ADMIN', 'COMANDANTE', 'CAPITAN'].includes(user?.role ?? '') && (
                          <button type="button" onClick={() => { if (confirm('¿Eliminar este registro?')) deleteMut.mutate(entry.id); }}
                            className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-950/40">
                            <Trash2 className="w-3 h-3" />Eliminar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
