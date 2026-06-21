import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Users, Shield, Building2, Pencil, UserX,
  Mail, CreditCard, Lock, X, CheckCircle2,
  ChevronRight, Search, SlidersHorizontal, FileDown, Camera, Hash,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { createElement } from 'react';
import { UsersReport } from '../lib/pdf/UsersReport';
import { downloadPdf } from '../lib/pdf/usePdfDownload';
import FirefighterAvatar from '../components/FirefighterAvatar';

const ROLES = [
  { value: 'SUPER_ADMIN',        label: 'Super Administrador',        short: 'S.Admin',    color: 'from-red-600 to-red-800',         badge: 'bg-red-600/20 text-red-400 border-red-600/20' },
  { value: 'COMANDANTE',         label: 'Comandante',                  short: 'Cdte.',      color: 'from-orange-600 to-orange-800',   badge: 'bg-orange-600/20 text-orange-400 border-orange-600/20' },
  { value: 'CAPITAN',            label: 'Capitán / Oficial Operativo', short: 'Capitán',    color: 'from-yellow-600 to-yellow-800',   badge: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/20' },
  { value: 'OPERADOR_CENTRAL',   label: 'Operador Central de Despacho', short: 'Central', color: 'from-red-700 to-red-900',       badge: 'bg-red-600/25 text-red-300 border-red-500/30' },
  { value: 'ENCARGADO_MATERIAL', label: 'Encargado Material Mayor',    short: 'Enc.Mat.',   color: 'from-blue-600 to-blue-800',       badge: 'bg-blue-600/20 text-blue-400 border-blue-600/20' },
  { value: 'SECRETARIO',         label: 'Secretario/a',                short: 'Secret.',    color: 'from-purple-600 to-purple-800',   badge: 'bg-purple-600/20 text-purple-400 border-purple-600/20' },
  { value: 'TESORERO',           label: 'Tesorero/a',                  short: 'Tesorero',   color: 'from-emerald-600 to-emerald-800', badge: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/20' },
  { value: 'BOMBERO',            label: 'Bombero Operativo',           short: 'Bombero',    color: 'from-slate-600 to-slate-700',     badge: 'bg-slate-600/20 text-slate-300 border-slate-600/20' },
  { value: 'AUDITOR',            label: 'Auditor / Inspector',         short: 'Auditor',    color: 'from-cyan-600 to-cyan-800',       badge: 'bg-cyan-600/20 text-cyan-400 border-cyan-600/20' },
];

const roleInfo = (val: string) => ROLES.find(r => r.value === val) ?? ROLES[6];

const AVATAR_COLORS = [
  'from-red-500 to-red-700', 'from-orange-500 to-orange-700', 'from-amber-500 to-amber-700',
  'from-blue-500 to-blue-700', 'from-purple-500 to-purple-700', 'from-emerald-500 to-emerald-700',
  'from-cyan-500 to-cyan-700', 'from-rose-500 to-rose-700', 'from-indigo-500 to-indigo-700',
];
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

interface UserFormData {
  rut: string; firstName: string; lastName: string;
  email: string; password: string; role: string; companyId: string; photoUrl: string;
  operativeNumber: string;
}
const EMPTY_FORM: UserFormData = {
  rut: '', firstName: '', lastName: '', email: '', password: '', role: 'BOMBERO',
  companyId: '', photoUrl: '', operativeNumber: '',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterCia, setFilterCia] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });
  const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: () => api.get('/companies').then(r => r.data) });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario creado'); reset(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al crear'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Actualizado'); reset(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al actualizar'),
  });
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario desactivado'); setSelected(null); },
    onError: () => toast.error('Error al desactivar'),
  });

  const reset = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const opRaw = form.operativeNumber.trim();
    if (opRaw && (!/^\d{1,3}$/.test(opRaw) || Number(opRaw) < 1 || Number(opRaw) > 999)) {
      toast.error('N° operativo: use 1 a 3 dígitos (1–999)');
      return;
    }
    const payload: any = {
      rut: form.rut,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      role: form.role,
      companyId: form.companyId || undefined,
      photoUrl: form.photoUrl || undefined,
    };
    if (!editing) payload.password = form.password;
    else if (form.password) payload.password = form.password;

    if (opRaw) payload.operativeNumber = Number(opRaw);
    else if (editing) payload.operativeNumber = null;

    editing ? updateMutation.mutate({ id: editing.id, data: payload }) : createMutation.mutate(payload);
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/users/upload-photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((f) => ({ ...f, photoUrl: data.photoUrl }));
      toast.success('Foto cargada');
    } catch {
      toast.error('Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleEdit = (u: any) => {
    setEditing(u); setSelected(null);
    setForm({
      rut: u.rut, firstName: u.firstName, lastName: u.lastName, email: u.email,
      password: '', role: u.role, companyId: u.companyId ?? '', photoUrl: u.photoUrl ?? '',
      operativeNumber: u.operativeNumber != null ? String(u.operativeNumber) : '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const set = (k: keyof UserFormData) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const filtered = (users ?? []).filter((u: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${u.firstName} ${u.lastName} ${u.email} ${u.rut} ${u.operativeNumber ?? ''}`.toLowerCase().includes(q);
    const matchRole = !filterRole || u.role === filterRole;
    const matchCia = !filterCia || u.companyId === filterCia;
    return matchSearch && matchRole && matchCia;
  });

  const byCia = companies?.map((c: any) => ({
    ...c,
    members: filtered.filter((u: any) => u.companyId === c.id),
  })).filter((c: any) => c.members.length > 0);

  const unassigned = filtered.filter((u: any) => !u.companyId);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Personal</h1>
          <p className="text-sm text-slate-400 mt-0.5">Bomberos y usuarios del sistema</p>
        </div>
        <div className="flex items-center gap-2">
          {!!users?.length && (
            <button
              onClick={() => downloadPdf(
                createElement(UsersReport, { users: filtered, companies: companies ?? [], filterCia, filterRole }),
                `nodo360_personal_${new Date().toISOString().split('T')[0]}.pdf`
              )}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
              <FileDown className="w-4 h-4" />Exportar PDF
            </button>
          )}
          <button onClick={() => { reset(); setShowForm(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-red-600/20">
            <Plus className="w-4 h-4" />Nuevo Bombero
          </button>
        </div>
      </div>

      {/* Stats */}
      {!!users?.length && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total personal', value: users.length, color: 'text-white', bg: 'bg-slate-800' },
            { label: 'Activos', value: users.filter((u: any) => u.isActive).length, color: 'text-emerald-400', bg: 'bg-emerald-600/10' },
            { label: 'Roles distintos', value: [...new Set(users.map((u: any) => u.role))].length, color: 'text-blue-400', bg: 'bg-blue-600/10' },
            { label: 'Sin compañía', value: users.filter((u: any) => !u.companyId).length, color: 'text-amber-400', bg: 'bg-amber-600/10' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-slate-800 rounded-xl p-4`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-slate-900 border border-red-600/30 rounded-2xl p-6 shadow-xl shadow-red-600/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-600/15 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">{editing ? 'Editar bombero' : 'Registrar nuevo bombero'}</h2>
                <p className="text-xs text-slate-500">Completa la información del personal</p>
              </div>
            </div>
            <button onClick={reset} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Foto opcional */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
              <FirefighterAvatar
                photoUrl={form.photoUrl}
                fullName={`${form.firstName || 'Nuevo'} ${form.lastName || 'bombero'}`}
                available
                size="lg"
                variant="bombero"
                statusDot={false}
              />
              <div className="flex-1 text-center sm:text-left space-y-2">
                <p className="text-sm font-semibold text-white">Foto del bombero <span className="text-slate-500 font-normal">(opcional)</span></p>
                <p className="text-xs text-slate-500">Se muestra en la vista pública de disponibilidad del cuartel</p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:border-slate-600 disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {uploadingPhoto ? 'Subiendo…' : 'Seleccionar foto'}
                  </button>
                  {form.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, photoUrl: '' }))}
                      className="px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { k: 'rut' as const,       label: 'RUT',         icon: CreditCard, placeholder: '12.345.678-9', req: true },
              { k: 'firstName' as const, label: 'Nombres',     icon: Users,      placeholder: 'Ej: Mario',    req: true },
              { k: 'lastName' as const,  label: 'Apellidos',   icon: Users,      placeholder: 'Ej: González', req: true },
              { k: 'email' as const,     label: 'Correo',      icon: Mail,       placeholder: 'correo@cia.cl', req: true, type: 'email' },
              { k: 'password' as const,  label: editing ? 'Nueva contraseña (opcional)' : 'Contraseña', icon: Lock, placeholder: '••••••••', req: !editing, type: 'password' },
            ].map(({ k, label, icon: Icon, placeholder, req, type = 'text' }) => (
              <div key={k}>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input type={type} value={form[k]} onChange={set(k)} placeholder={placeholder} required={req}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all" />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Rol</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <select value={form.role} onChange={set('role')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all appearance-none">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Compañía</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <select value={form.companyId} onChange={set('companyId')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all appearance-none">
                  <option value="">Sin compañía asignada</option>
                  {companies?.map((c: any) => <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">N° operativo</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  value={form.operativeNumber}
                  onChange={(e) => setForm((f) => ({ ...f, operativeNumber: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                  placeholder="1–999"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-600 mt-1">Único por compañía · visible en sala pública</p>
            </div>

            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={createMutation.isPending || updateMutation.isPending || uploadingPhoto}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                <CheckCircle2 className="w-4 h-4" />{editing ? 'Guardar cambios' : 'Registrar bombero'}
              </button>
              <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-200 text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, RUT o correo..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-all" />
        </div>
        <div className="relative">
          <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500 transition-all appearance-none">
            <option value="">Todos los roles</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <select value={filterCia} onChange={e => setFilterCia(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-red-500 transition-all appearance-none">
            <option value="">Todas las compañías</option>
            {companies?.map((c: any) => <option key={c.id} value={c.id}>Cía. {c.number} — {c.name}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-36 animate-pulse" />)}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Sin resultados</p>
          <p className="text-slate-600 text-sm mt-1">Prueba cambiando los filtros</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Agrupado por compañía */}
          {byCia?.map((cia: any) => (
            <div key={cia.id}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 bg-red-600/15 rounded-lg flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-red-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-300">Cía. {cia.number} — {cia.name}</h3>
                <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">{cia.members.length} personas</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {cia.members.map((u: any) => <UserCard key={u.id} u={u} onSelect={setSelected} onEdit={handleEdit} />)}
              </div>
            </div>
          ))}

          {/* Sin compañía */}
          {unassigned.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 bg-amber-600/15 rounded-lg flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-400">Sin compañía asignada</h3>
                <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">{unassigned.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {unassigned.map((u: any) => <UserCard key={u.id} u={u} onSelect={setSelected} onEdit={handleEdit} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Panel lateral detalle */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header del panel */}
            <div className={`bg-gradient-to-r ${roleInfo(selected.role).color} p-6 rounded-t-2xl relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <FirefighterAvatar
                    photoUrl={selected.photoUrl}
                    fullName={`${selected.firstName} ${selected.lastName}`}
                    available={selected.isActive}
                    size="lg"
                    variant="bombero"
                    statusDot={false}
                    className="!w-16 !h-16"
                  />
                  <div>
                    <p className="text-white font-bold text-lg leading-tight">{selected.firstName} {selected.lastName}</p>
                    <p className="text-white/60 text-xs mt-0.5">{roleInfo(selected.role).label}</p>
                    <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${selected.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selected.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {selected.isActive ? 'Activo' : 'Inactivo'}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Datos */}
            <div className="p-5 space-y-3">
              {[
                { icon: CreditCard, label: 'RUT', value: selected.rut },
                { icon: Mail, label: 'Correo', value: selected.email },
                { icon: Building2, label: 'Compañía', value: selected.company ? `Cía. ${selected.company.number} — ${selected.company.name}` : 'Sin compañía asignada' },
                { icon: Shield, label: 'Rol', value: roleInfo(selected.role).label },
                ...(selected.operativeNumber != null
                  ? [{ icon: Hash, label: 'N° operativo', value: String(selected.operativeNumber) }]
                  : []),
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 bg-slate-800/60 rounded-xl px-4 py-3">
                  <div className="w-7 h-7 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{label}</p>
                    <p className="text-sm text-slate-200 truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Acciones */}
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => handleEdit(selected)}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-2.5 rounded-xl transition-colors">
                <Pencil className="w-3.5 h-3.5" />Editar
              </button>
              {selected.isActive && (
                <button onClick={() => { if (confirm(`¿Desactivar a ${selected.firstName} ${selected.lastName}?`)) deactivateMutation.mutate(selected.id); }}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-medium py-2.5 rounded-xl border border-red-600/20 transition-colors">
                  <UserX className="w-3.5 h-3.5" />Desactivar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserCard({ u, onSelect, onEdit }: { u: any; onSelect: (u: any) => void; onEdit: (u: any) => void }) {
  const role = roleInfo(u.role);
  return (
    <div
      onClick={() => onSelect(u)}
      className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-black/20 relative"
    >
      {/* Indicador activo */}
      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />

      <div className="flex items-center gap-3 mb-3">
        <FirefighterAvatar
          photoUrl={u.photoUrl}
          fullName={`${u.firstName} ${u.lastName}`}
          available={u.isActive}
          variant="bombero"
          statusDot={false}
          className="!w-11 !h-11"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-100 text-sm truncate">{u.firstName} {u.lastName}</p>
          <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
        </div>
        {u.operativeNumber != null && (
          <span className="shrink-0 w-8 h-8 rounded-lg bg-red-600/20 border border-red-600/30 text-red-300 text-xs font-black flex items-center justify-center">
            {u.operativeNumber}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border ${role.badge}`}>
          <Shield className="w-2.5 h-2.5" />{role.short}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>

      {u.company && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-800">
          <Building2 className="w-3 h-3 text-slate-600 shrink-0" />
          <span className="text-[10px] text-slate-600 truncate">Cía. {u.company.number}</span>
        </div>
      )}
    </div>
  );
}
