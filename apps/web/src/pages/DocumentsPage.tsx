import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, FileText, ExternalLink, AlertTriangle,
  X, Search, Building2, Calendar, User, Tag, StickyNote,
  Upload, CheckCircle2, Clock, Download, FileCheck,
  ChevronRight, FolderOpen,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const CATEGORIES = ['Protocolo', 'Acta', 'Informe', 'Circular', 'Certificado', 'Convenio', 'Reglamento', 'Contrato', 'Otro'];

const CAT_COLORS: Record<string, string> = {
  'Protocolo':   'bg-blue-600/20 text-blue-400 border-blue-600/30',
  'Acta':        'bg-purple-600/20 text-purple-400 border-purple-600/30',
  'Informe':     'bg-cyan-600/20 text-cyan-400 border-cyan-600/30',
  'Circular':    'bg-orange-600/20 text-orange-400 border-orange-600/30',
  'Certificado': 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  'Convenio':    'bg-indigo-600/20 text-indigo-400 border-indigo-600/30',
  'Reglamento':  'bg-rose-600/20 text-rose-400 border-rose-600/30',
  'Contrato':    'bg-amber-600/20 text-amber-400 border-amber-600/30',
  'Otro':        'bg-slate-600/20 text-slate-400 border-slate-600/30',
};

const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtFull = (d?: string) => d ? new Date(d).toLocaleString('es-CL', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const isExpired = (d?: string) => !!d && new Date(d) < new Date();
const isSoon = (d?: string) => { if (!d) return false; const diff = new Date(d).getTime() - Date.now(); return diff > 0 && diff < 30 * 86400000; };

const fileExt = (url: string) => url?.split('.').pop()?.toUpperCase().slice(0, 4) ?? 'DOC';
const fileIcon = (url: string) => {
  const ext = url?.split('.').pop()?.toLowerCase();
  if (['jpg','jpeg','png','gif','webp'].includes(ext ?? '')) return '🖼️';
  if (ext === 'pdf') return '📄';
  if (['doc','docx'].includes(ext ?? '')) return '📝';
  if (['xls','xlsx'].includes(ext ?? '')) return '📊';
  if (['ppt','pptx'].includes(ext ?? '')) return '📋';
  if (['zip','rar'].includes(ext ?? '')) return '📦';
  return '📁';
};

const EMPTY_FORM = { title: '', category: 'Protocolo', expiresAt: '', notes: '', companyId: '' };

export default function DocumentsPage() {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterCia, setFilterCia] = useState('');
  const [viewMode, setViewMode] = useState<'company' | 'timeline'>('company');
  const [uploading, setUploading] = useState(false);

  const { data: docs, isLoading } = useQuery({ queryKey: ['documents'], queryFn: () => api.get('/documents').then(r => r.data) });
  const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) });

  const update = useMutation({ mutationFn: ({ id, d }: any) => api.put(`/documents/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast.success('Actualizado'); reset(); }, onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error') });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/documents/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast.success('Eliminado'); setSelected(null); }, onError: () => toast.error('Error al eliminar') });

  const reset = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); setSelectedFile(null); if (fileRef.current) fileRef.current.value = ''; };

  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm((f: any) => ({ ...f, [k]: e.target.value }));

  const handleEdit = (doc: any) => {
    setEditing(doc); setSelected(null);
    setForm({ title: doc.title, category: doc.category, expiresAt: doc.expiresAt?.slice(0, 10) ?? '', notes: doc.notes ?? '', companyId: doc.companyId ?? '' });
    setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const uploadedBy = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Sistema';

    if (editing) {
      update.mutate({ id: editing.id, d: { ...form, uploadedBy, expiresAt: form.expiresAt || undefined, notes: form.notes || undefined, companyId: form.companyId || undefined } });
      return;
    }

    if (!selectedFile) { toast.error('Selecciona un archivo'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      fd.append('title', form.title);
      fd.append('category', form.category);
      fd.append('uploadedBy', uploadedBy);
      if (form.expiresAt) fd.append('expiresAt', form.expiresAt);
      if (form.companyId) fd.append('companyId', form.companyId);
      if (form.notes) fd.append('notes', form.notes);
      await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Documento subido correctamente');
      reset();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Error al subir');
    } finally {
      setUploading(false);
    }
  };

  const filtered = (docs ?? []).filter((d: any) => {
    const q = search.toLowerCase();
    const mQ = !q || `${d.title} ${d.category} ${d.uploadedBy}`.toLowerCase().includes(q);
    const mC = !filterCat || d.category === filterCat;
    const mCia = !filterCia || d.companyId === filterCia;
    return mQ && mC && mCia;
  });

  const expiredCount = (docs ?? []).filter((d: any) => isExpired(d.expiresAt)).length;
  const soonCount = (docs ?? []).filter((d: any) => isSoon(d.expiresAt)).length;

  const byCia = companies?.map((c: any) => ({
    ...c, docs: filtered.filter((d: any) => d.companyId === c.id),
  })).filter((c: any) => c.docs.length > 0);
  const general = filtered.filter((d: any) => !d.companyId);

  const sortedTimeline = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const inputCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Documentos</h1>
          <p className="text-sm text-slate-400 mt-0.5">Repositorio institucional de documentos</p>
        </div>
        <button onClick={() => { reset(); setShowForm(true); }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-red-600/20">
          <Plus className="w-4 h-4" />Subir documento
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total documentos', value: docs?.length ?? 0, icon: FileText, color: 'text-white', bg: 'bg-slate-800', ic: 'text-slate-400' },
          { label: 'Vencidos', value: expiredCount, icon: AlertTriangle, color: expiredCount > 0 ? 'text-red-400' : 'text-white', bg: expiredCount > 0 ? 'bg-red-600/10' : 'bg-slate-800', ic: expiredCount > 0 ? 'text-red-400' : 'text-slate-500' },
          { label: 'Vencen pronto', value: soonCount, icon: Clock, color: soonCount > 0 ? 'text-yellow-400' : 'text-white', bg: soonCount > 0 ? 'bg-yellow-600/10' : 'bg-slate-800', ic: soonCount > 0 ? 'text-yellow-400' : 'text-slate-500' },
          { label: 'Categorías', value: [...new Set((docs ?? []).map((d: any) => d.category))].length, icon: Tag, color: 'text-purple-400', bg: 'bg-purple-600/10', ic: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-slate-800 rounded-xl p-4 flex items-center gap-3`}>
            <div className="w-9 h-9 bg-slate-900/60 rounded-xl flex items-center justify-center shrink-0">
              <s.icon className={`w-4 h-4 ${s.ic}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas vencimientos */}
      {(expiredCount > 0 || soonCount > 0) && (
        <div className="space-y-2">
          {expiredCount > 0 && (
            <div className="flex items-center gap-3 bg-red-600/10 border border-red-600/20 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300"><span className="font-bold">{expiredCount} documento{expiredCount > 1 ? 's' : ''}</span> vencido{expiredCount > 1 ? 's' : ''} — requieren renovación</p>
            </div>
          )}
          {soonCount > 0 && (
            <div className="flex items-center gap-3 bg-yellow-600/10 border border-yellow-600/20 rounded-xl px-4 py-3">
              <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
              <p className="text-sm text-yellow-300"><span className="font-bold">{soonCount} documento{soonCount > 1 ? 's' : ''}</span> vence{soonCount > 1 ? 'n' : ''} en los próximos 30 días</p>
            </div>
          )}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-slate-900 border border-red-600/30 rounded-2xl p-6 shadow-xl shadow-red-600/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-600/15 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">{editing ? 'Editar documento' : 'Subir nuevo documento'}</h2>
                <p className="text-xs text-slate-500">{editing ? 'Modifica los datos del documento' : 'PDF, Word, Excel, imágenes (máx. 20MB)'}</p>
              </div>
            </div>
            <button onClick={reset} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Archivo */}
            {!editing && (
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Archivo</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${selectedFile ? 'border-emerald-500/50 bg-emerald-600/5' : 'border-slate-700 hover:border-red-500/50 hover:bg-red-600/5'}`}
                >
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.zip,.txt" className="hidden"
                    onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-2xl">{fileIcon(selectedFile.name)}</span>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-emerald-400">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-2" />
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Haz clic o arrastra un archivo aquí</p>
                      <p className="text-xs text-slate-600 mt-1">PDF, Word, Excel, imágenes, ZIP (máx. 20MB)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Título del documento</label>
              <input value={form.title} onChange={set('title')} required placeholder="Ej: Protocolo de Actuación en Incendios 2026" className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Categoría</label>
              <select value={form.category} onChange={set('category')} className={inputCls}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Fecha de vencimiento</label>
              <input type="date" value={form.expiresAt} onChange={set('expiresAt')} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Compañía</label>
              <select value={form.companyId} onChange={set('companyId')} className={inputCls}>
                <option value="">General (todas las compañías)</option>
                {companies?.map((c: any) => <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Notas</label>
              <input value={form.notes} onChange={set('notes')} placeholder="Observaciones opcionales..." className={inputCls} />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex gap-3 pt-2">
              <button type="submit" disabled={uploading || update.isPending}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                {uploading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Subiendo...</> : <><CheckCircle2 className="w-4 h-4" />{editing ? 'Guardar cambios' : 'Subir documento'}</>}
              </button>
              <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-200 text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros + modos de vista */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título, categoría..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <select value={filterCia} onChange={e => setFilterCia(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500 appearance-none">
            <option value="">Todas las compañías</option>
            {companies?.map((c: any) => <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>)}
          </select>
        </div>
        {/* Toggle vista */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1">
          {[{ v: 'company' as const, label: '🏢 Por compañía' }, { v: 'timeline' as const, label: '⏱ Línea de tiempo' }].map(m => (
            <button key={m.v} onClick={() => setViewMode(m.v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${viewMode === m.v ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vista */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-24 animate-pulse" />)}</div>
      ) : !filtered.length ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <FolderOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Sin documentos registrados</p>
          <p className="text-slate-600 text-sm mt-1">Sube el primer documento</p>
        </div>
      ) : viewMode === 'company' ? (
        /* Vista por compañía */
        <div className="space-y-6">
          {byCia?.map((cia: any) => (
            <div key={cia.id}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 bg-red-600/15 rounded-lg flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-red-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-300">Cía. {cia.number} — {cia.name}</h3>
                <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">{cia.docs.length} docs</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {cia.docs.map((doc: any) => <DocCard key={doc.id} doc={doc} onSelect={setSelected} />)}
              </div>
            </div>
          ))}
          {general.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center">
                  <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-400">Documentos generales</h3>
                <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">{general.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {general.map((doc: any) => <DocCard key={doc.id} doc={doc} onSelect={setSelected} />)}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Línea de tiempo */
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-800" />
          <div className="space-y-4">
            {sortedTimeline.map((doc: any, i: number) => {
              const prevDate = i > 0 ? sortedTimeline[i - 1].createdAt?.slice(0, 10) : null;
              const thisDate = doc.createdAt?.slice(0, 10);
              const showDateLabel = thisDate !== prevDate;
              return (
                <div key={doc.id}>
                  {showDateLabel && (
                    <div className="flex items-center gap-3 mb-2 ml-14">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{fmt(doc.createdAt)}</p>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="relative z-10 w-12 flex justify-center pt-3">
                      <span className="text-xl">{fileIcon(doc.fileUrl)}</span>
                    </div>
                    <div
                      onClick={() => setSelected(doc)}
                      className={`flex-1 bg-slate-900 border rounded-2xl p-4 cursor-pointer hover:border-slate-600 transition-all group ${isExpired(doc.expiresAt) ? 'border-red-600/30' : isSoon(doc.expiresAt) ? 'border-yellow-600/30' : 'border-slate-800'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate">{doc.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${CAT_COLORS[doc.category] ?? CAT_COLORS['Otro']}`}>
                              <Tag className="w-2.5 h-2.5" />{doc.category}
                            </span>
                            {doc.expiresAt && (
                              <span className={`flex items-center gap-1 text-[10px] ${isExpired(doc.expiresAt) ? 'text-red-400' : isSoon(doc.expiresAt) ? 'text-yellow-400' : 'text-slate-500'}`}>
                                {(isExpired(doc.expiresAt) || isSoon(doc.expiresAt)) && <AlertTriangle className="w-2.5 h-2.5" />}
                                Vence {fmt(doc.expiresAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-[10px] text-slate-600">{fmtFull(doc.createdAt)}</p>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Subido por {doc.uploadedBy}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 rounded-t-2xl border-b border-slate-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{fileIcon(selected.fileUrl)}</span>
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">{selected.title}</p>
                    <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${CAT_COLORS[selected.category] ?? CAT_COLORS['Otro']}`}>
                      <Tag className="w-2.5 h-2.5" />{selected.category}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-lg transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {/* Datos */}
              {[
                { icon: Building2, label: 'Compañía', value: selected.companyId ? companies?.find((c: any) => c.id === selected.companyId)?.name ?? '—' : 'General (todas)' },
                { icon: User, label: 'Subido por', value: selected.uploadedBy },
                { icon: Calendar, label: 'Fecha de subida', value: fmtFull(selected.createdAt) },
                { icon: Calendar, label: 'Vencimiento', value: selected.expiresAt ? fmt(selected.expiresAt) : 'Sin vencimiento' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-4 py-3">
                  <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{label}</p>
                    <p className={`text-sm truncate ${label === 'Vencimiento' && isExpired(selected.expiresAt) ? 'text-red-400 font-semibold' : label === 'Vencimiento' && isSoon(selected.expiresAt) ? 'text-yellow-400 font-semibold' : 'text-slate-200'}`}>{value}</p>
                  </div>
                </div>
              ))}

              {/* Alerta vencimiento */}
              {isExpired(selected.expiresAt) && (
                <div className="flex items-center gap-2 bg-red-600/10 border border-red-600/20 rounded-xl px-4 py-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-300 font-medium">Documento vencido — requiere renovación</p>
                </div>
              )}
              {isSoon(selected.expiresAt) && (
                <div className="flex items-center gap-2 bg-yellow-600/10 border border-yellow-600/20 rounded-xl px-4 py-2.5">
                  <Clock className="w-4 h-4 text-yellow-400 shrink-0" />
                  <p className="text-xs text-yellow-300 font-medium">Vence en menos de 30 días</p>
                </div>
              )}

              {/* Notas */}
              {selected.notes && (
                <div className="flex items-start gap-3 bg-slate-800/60 rounded-xl px-4 py-3">
                  <StickyNote className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-300 leading-relaxed">{selected.notes}</p>
                </div>
              )}

              {/* Tipo de archivo */}
              <div className="flex items-center gap-2 bg-slate-800/60 rounded-xl px-4 py-3">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-400 truncate">{selected.fileUrl}</p>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-1">
                <a href={selected.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-sm font-medium py-2.5 rounded-xl border border-blue-600/20 transition-colors">
                  <Download className="w-3.5 h-3.5" />Abrir
                </a>
                <button onClick={() => handleEdit(selected)}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-2.5 rounded-xl transition-colors">
                  <Pencil className="w-3.5 h-3.5" />Editar
                </button>
                <button onClick={() => { if (confirm('¿Eliminar este documento?')) remove.mutate(selected.id); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-medium py-2.5 rounded-xl border border-red-600/20 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocCard({ doc, onSelect }: { doc: any; onSelect: (d: any) => void }) {
  const expired = isExpired(doc.expiresAt);
  const soon = isSoon(doc.expiresAt);
  return (
    <div onClick={() => onSelect(doc)}
      className={`group bg-slate-900 border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-black/20 ${expired ? 'border-red-600/30 hover:border-red-600/50' : soon ? 'border-yellow-600/30 hover:border-yellow-600/50' : 'border-slate-800 hover:border-slate-600'}`}>
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl shrink-0">{fileIcon(doc.fileUrl)}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200 line-clamp-2 leading-tight">{doc.title}</p>
          <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${CAT_COLORS[doc.category] ?? CAT_COLORS['Otro']}`}>
            <Tag className="w-2.5 h-2.5" />{doc.category}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
        <div className="space-y-0.5">
          <p className="text-[10px] text-slate-600">{doc.uploadedBy}</p>
          {doc.expiresAt && (
            <p className={`text-[10px] flex items-center gap-1 ${expired ? 'text-red-400' : soon ? 'text-yellow-400' : 'text-slate-600'}`}>
              {(expired || soon) && <AlertTriangle className="w-2.5 h-2.5" />}
              {expired ? 'Vencido' : `Vence ${fmt(doc.expiresAt)}`}
            </p>
          )}
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>
    </div>
  );
}
