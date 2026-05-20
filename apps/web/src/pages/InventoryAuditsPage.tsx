import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Plus, Trash2, Play, CheckCircle2, XCircle,
  Building2, Truck, Package, Search, FileDown, ArrowLeft,
  AlertTriangle, Lock, Ban,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { createElement } from 'react';
import { InventoryAuditReport } from '../lib/pdf/InventoryAuditReport';
import { downloadPdf } from '../lib/pdf/usePdfDownload';

const STATUS_META: Record<string, { label: string; badge: string }> = {
  BORRADOR: { label: 'Borrador', badge: 'bg-slate-600/20 text-slate-400 border-slate-500/30' },
  EN_PROCESO: { label: 'En proceso', badge: 'bg-amber-600/20 text-amber-400 border-amber-500/30' },
  CERRADA: { label: 'Cerrada', badge: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' },
  CANCELADA: { label: 'Cancelada', badge: 'bg-red-600/20 text-red-400 border-red-500/30' },
};

const RESULT_META: Record<string, { label: string; badge: string }> = {
  PENDIENTE: { label: 'Pendiente', badge: 'bg-slate-700 text-slate-400 border-slate-600' },
  CONFORME: { label: 'Conforme', badge: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' },
  NO_ENCONTRADO: { label: 'No encontrado', badge: 'bg-red-600/20 text-red-400 border-red-500/30' },
  DIFERENCIA: { label: 'Diferencia', badge: 'bg-orange-600/20 text-orange-400 border-orange-500/30' },
  OBSERVACION: { label: 'Observación', badge: 'bg-sky-600/20 text-sky-400 border-sky-500/30' },
};

const EQUIP_STATUS: Record<string, string> = {
  OPERATIVO: 'Operativo',
  EN_REPARACION: 'En reparación',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
};

const inputCls =
  'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500';

type ItemFilter = 'all' | 'pending' | 'issues';

export default function InventoryAuditsPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canEdit = ['SUPER_ADMIN', 'COMANDANTE', 'ENCARGADO_MATERIAL', 'AUDITOR'].includes(user?.role ?? '');

  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState(user?.companyId ?? '');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    companyId: user?.companyId ?? '',
    includeVehicles: true,
    includeEquipment: true,
  });
  const [itemFilter, setItemFilter] = useState<ItemFilter>('all');
  const [itemSearch, setItemSearch] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
  });

  const { data: audits, isLoading: loadingList } = useQuery({
    queryKey: ['inventory-audits', companyFilter, statusFilter],
    queryFn: () =>
      api
        .get('/inventory-audits', {
          params: { companyId: companyFilter || undefined, status: statusFilter || undefined },
        })
        .then((r) => r.data),
    enabled: view === 'list',
  });

  const { data: audit, isLoading: loadingDetail } = useQuery({
    queryKey: ['inventory-audit', selectedId],
    queryFn: () => api.get(`/inventory-audits/${selectedId}`).then((r) => r.data),
    enabled: view === 'detail' && !!selectedId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['inventory-audits'] });
    if (selectedId) qc.invalidateQueries({ queryKey: ['inventory-audit', selectedId] });
  };

  const create = useMutation({
    mutationFn: (body: unknown) => api.post('/inventory-audits', body),
    onSuccess: (res) => {
      toast.success('Auditoría creada');
      setShowCreate(false);
      setSelectedId(res.data.id);
      setView('detail');
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al crear'),
  });

  const start = useMutation({
    mutationFn: (id: string) => api.patch(`/inventory-audits/${id}/start`),
    onSuccess: () => { toast.success('Auditoría iniciada'); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const verify = useMutation({
    mutationFn: ({ auditId, itemId, body }: { auditId: string; itemId: string; body: unknown }) =>
      api.patch(`/inventory-audits/${auditId}/items/${itemId}`, body),
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al verificar'),
  });

  const close = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.patch(`/inventory-audits/${id}/close`, { closingNotes: notes }),
    onSuccess: () => { toast.success('Auditoría cerrada'); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al cerrar'),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.patch(`/inventory-audits/${id}/cancel`),
    onSuccess: () => { toast.success('Auditoría cancelada'); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory-audits/${id}`),
    onSuccess: () => {
      toast.success('Auditoría eliminada');
      setView('list');
      setSelectedId(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al eliminar'),
  });

  const filteredItems = useMemo(() => {
    if (!audit?.items) return [];
    let list = audit.items as any[];
    if (itemFilter === 'pending') list = list.filter((i) => i.result === 'PENDIENTE');
    if (itemFilter === 'issues') {
      list = list.filter((i) => ['NO_ENCONTRADO', 'DIFERENCIA', 'OBSERVACION'].includes(i.result));
    }
    if (itemSearch.trim()) {
      const q = itemSearch.toLowerCase();
      list = list.filter((i) => i.expectedLabel.toLowerCase().includes(q));
    }
    return list;
  }, [audit?.items, itemFilter, itemSearch]);

  const vehicles = filteredItems.filter((i) => i.kind === 'VEHICULO');
  const equipment = filteredItems.filter((i) => i.kind === 'EQUIPO');

  const openDetail = (id: string) => {
    setSelectedId(id);
    setView('detail');
    setItemFilter('all');
    setItemSearch('');
    setClosingNotes('');
  };

  const handleVerify = (item: any, found: boolean) => {
    if (!selectedId || audit?.status === 'CERRADA' || audit?.status === 'CANCELADA') return;
    verify.mutate({
      auditId: selectedId,
      itemId: item.id,
      body: {
        found,
        physicalStatus: found ? (item.physicalStatus ?? item.expectedStatus) : undefined,
        physicalQty: found ? (item.physicalQty ?? item.expectedQty) : 0,
        observations: item.observations,
      },
    });
  };

  const exportPdf = async () => {
    if (!audit) return;
    await downloadPdf(
      createElement(InventoryAuditReport, { audit }),
      `auditoria-${audit.code}.pdf`,
    );
    toast.success('PDF generado');
  };

  if (view === 'detail' && selectedId) {
    const summary = audit?.summary;
    const isClosed = audit?.status === 'CERRADA';
    const isCancelled = audit?.status === 'CANCELADA';
    const canModify = !isClosed && !isCancelled && canEdit;

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => { setView('list'); setSelectedId(null); }}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-violet-400" />
                {audit?.code ?? 'Auditoría'}
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">{audit?.title}</p>
              {audit && (
                <span className={`inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded-lg border ${STATUS_META[audit.status]?.badge}`}>
                  {STATUS_META[audit.status]?.label}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {audit && (
              <button
                type="button"
                onClick={exportPdf}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600"
              >
                <FileDown className="w-4 h-4" /> PDF
              </button>
            )}
            {canModify && audit?.status === 'BORRADOR' && (
              <>
                <button
                  type="button"
                  onClick={() => start.mutate(selectedId)}
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white"
                >
                  <Play className="w-4 h-4" /> Iniciar
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(selectedId)}
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              </>
            )}
            {canModify && audit?.status !== 'BORRADOR' && (
              <button
                type="button"
                onClick={() => cancel.mutate(selectedId)}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-400"
              >
                <Ban className="w-4 h-4" /> Cancelar
              </button>
            )}
          </div>
        </div>

        {loadingDetail ? (
          <p className="text-slate-500 text-sm">Cargando auditoría...</p>
        ) : audit ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'Progreso', value: `${summary?.progressPct ?? 0}%`, sub: `${summary?.verified ?? 0}/${summary?.total ?? 0}`, color: 'text-violet-400' },
                { label: 'Conformes', value: summary?.conforme ?? 0, color: 'text-emerald-400' },
                { label: 'No encontrados', value: summary?.noEncontrado ?? 0, color: 'text-red-400' },
                { label: 'Diferencias', value: summary?.diferencia ?? 0, color: 'text-orange-400' },
                { label: 'Vehículos', value: summary?.vehiculos ?? 0, color: 'text-sky-400' },
                { label: 'Equipos', value: summary?.equipos ?? 0, color: 'text-amber-400' },
              ].map((s) => (
                <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>
                    {s.value}
                    {'sub' in s && s.sub ? <span className="text-xs font-normal text-slate-500 ml-1">{s.sub}</span> : null}
                  </p>
                </div>
              ))}
            </div>

            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all"
                style={{ width: `${summary?.progressPct ?? 0}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Buscar ítem..."
                  className={`${inputCls} pl-9`}
                />
              </div>
              {(['all', 'pending', 'issues'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setItemFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    itemFilter === f
                      ? 'bg-violet-600 text-white border-violet-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : 'Hallazgos'}
                </button>
              ))}
            </div>

            <AuditItemSection
              title="Vehículos"
              icon={Truck}
              items={vehicles}
              canModify={canModify}
              onVerify={handleVerify}
              verifyPending={verify.isPending}
            />
            <AuditItemSection
              title="Equipamiento"
              icon={Package}
              items={equipment}
              canModify={canModify}
              onVerify={handleVerify}
              verifyPending={verify.isPending}
            />

            {canModify && summary?.pending === 0 && audit.status !== 'CERRADA' && (
              <div className="bg-slate-900 border border-emerald-600/30 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Cerrar auditoría
                </h3>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Notas de cierre y conclusiones del auditor..."
                  rows={3}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => close.mutate({ id: selectedId, notes: closingNotes })}
                  disabled={close.isPending}
                  className="mt-3 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-xl"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Cerrar y generar acta
                </button>
              </div>
            )}

            {isClosed && audit.closingNotes && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Notas de cierre</p>
                <p className="text-sm text-slate-300">{audit.closingNotes}</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-violet-400" />
            Auditoría de inventario físico
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Conteo físico de vehículos y equipamiento vs registro en sistema
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/inventory"
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300"
          >
            <Package className="w-4 h-4" /> Inventario
          </Link>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setCreateForm({
                  title: '',
                  companyId: companyFilter || user?.companyId || '',
                  includeVehicles: true,
                  includeEquipment: true,
                });
                setShowCreate(true);
              }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-4 py-2 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Nueva auditoría
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="min-w-[200px] flex-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Compañía</label>
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className={inputCls}>
            <option value="">Todas</option>
            {companies?.map((c: { id: string; number: number; name: string }) => (
              <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Estado</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loadingList ? (
        <p className="text-slate-500 text-sm">Cargando auditorías...</p>
      ) : !audits?.length ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <ClipboardCheck className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500">No hay auditorías registradas</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-4 text-sm text-violet-400 hover:underline"
            >
              Crear la primera auditoría
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {audits.map((a: any) => (
            <button
              key={a.id}
              type="button"
              onClick={() => openDetail(a.id)}
              className="w-full text-left bg-slate-900 border border-slate-800 hover:border-violet-500/40 rounded-2xl p-4 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">{a.code}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {a.company?.number}ª {a.company?.name}
                    {a.auditor ? ` · ${a.auditor.firstName} ${a.auditor.lastName}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${STATUS_META[a.status]?.badge}`}>
                    {STATUS_META[a.status]?.label}
                  </span>
                  <div className="text-right text-xs">
                    <p className="text-violet-400 font-bold">{a.summary?.progressPct ?? 0}%</p>
                    <p className="text-slate-500">{a.summary?.verified ?? 0}/{a.summary?.total ?? 0} verificados</p>
                  </div>
                </div>
              </div>
              {(a.summary?.diferencia > 0 || a.summary?.noEncontrado > 0) && (
                <p className="mt-2 text-xs text-orange-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {a.summary.noEncontrado} no encontrados · {a.summary.diferencia} diferencias
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-sm font-bold text-white">Nueva auditoría física</h2>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Compañía</label>
              <select
                value={createForm.companyId}
                onChange={(e) => setCreateForm((f) => ({ ...f, companyId: e.target.value }))}
                className={inputCls}
              >
                <option value="">Seleccionar...</option>
                {companies?.map((c: { id: string; number: number; name: string }) => (
                  <option key={c.id} value={c.id}>{c.number}ª — {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Título (opcional)</label>
              <input
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                className={inputCls}
                placeholder="Ej. Auditoría trimestral Q2"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.includeVehicles}
                  onChange={(e) => setCreateForm((f) => ({ ...f, includeVehicles: e.target.checked }))}
                  className="accent-violet-500"
                />
                Vehículos
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.includeEquipment}
                  onChange={(e) => setCreateForm((f) => ({ ...f, includeEquipment: e.target.checked }))}
                  className="accent-violet-500"
                />
                Equipamiento
              </label>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!createForm.companyId || create.isPending}
                onClick={() => create.mutate(createForm)}
                className="px-4 py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-xl disabled:opacity-50"
              >
                Crear y contar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditItemSection({
  title,
  icon: Icon,
  items,
  canModify,
  onVerify,
  verifyPending,
}: {
  title: string;
  icon: typeof Truck;
  items: any[];
  canModify: boolean;
  onVerify: (item: any, found: boolean) => void;
  verifyPending: boolean;
}) {
  if (!items.length) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
        <Icon className="w-4 h-4 text-violet-400" />
        <h2 className="text-sm font-bold text-white">{title}</h2>
        <span className="text-xs text-slate-500">({items.length})</span>
      </div>
      <div className="divide-y divide-slate-800">
        {items.map((item) => (
          <AuditItemRow
            key={item.id}
            item={item}
            canModify={canModify}
            onVerify={onVerify}
            verifyPending={verifyPending}
          />
        ))}
      </div>
    </div>
  );
}

function AuditItemRow({
  item,
  canModify,
  onVerify,
  verifyPending,
}: {
  item: any;
  canModify: boolean;
  onVerify: (item: any, found: boolean) => void;
  verifyPending: boolean;
}) {
  const [obs, setObs] = useState(item.observations ?? '');
  const meta = RESULT_META[item.result] ?? RESULT_META.PENDIENTE;

  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{item.expectedLabel}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Sistema: {item.expectedStatus ? EQUIP_STATUS[item.expectedStatus] : '—'}
          {item.kind === 'EQUIPO' ? ` · Cant. ${item.expectedQty}` : ''}
        </p>
        {item.result !== 'PENDIENTE' && item.found != null && (
          <p className="text-xs text-slate-400 mt-0.5">
            Físico:{' '}
            {item.found
              ? `${item.physicalStatus ? EQUIP_STATUS[item.physicalStatus] : '—'}${item.kind === 'EQUIPO' ? ` ×${item.physicalQty}` : ''}`
              : 'No hallado'}
          </p>
        )}
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border shrink-0 ${meta.badge}`}>
        {meta.label}
      </span>
      {canModify && (
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            disabled={verifyPending}
            onClick={() => onVerify({ ...item, observations: obs }, true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Hallado
          </button>
          <button
            type="button"
            disabled={verifyPending}
            onClick={() => onVerify({ ...item, observations: obs }, false)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30"
          >
            <XCircle className="w-3.5 h-3.5" /> No hallado
          </button>
        </div>
      )}
      {canModify && (
        <input
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          onBlur={() => {
            if (obs !== (item.observations ?? '') && item.result !== 'PENDIENTE') {
              onVerify({ ...item, observations: obs }, item.found ?? true);
            }
          }}
          placeholder="Observaciones..."
          className="w-full sm:w-48 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300"
        />
      )}
    </div>
  );
}
