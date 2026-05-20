import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Building2, MapPin, Phone, Users, Truck,
  Pencil, Mail, Hash, Globe, X, Flame, CheckCircle2,
  Camera, ImageOff, Package, ChevronRight, Search, FileDown,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { createElement } from 'react';
import { CompanyReport } from '../lib/pdf/CompanyReport';
import { downloadPdf } from '../lib/pdf/usePdfDownload';

interface CompanyFormData {
  name: string; number: string; region: string; city: string;
  address: string; phone: string; email: string;
  logoUrl: string; headquartersImageUrl: string;
}

const EMPTY_FORM: CompanyFormData = {
  name: '', number: '', region: 'Metropolitana', city: '', address: '',
  phone: '', email: '', logoUrl: '', headquartersImageUrl: '',
};

const REGIONS = [
  'Arica y Parinacota','Tarapacá','Antofagasta','Atacama','Coquimbo','Valparaíso',
  'Metropolitana','O\'Higgins','Maule','Ñuble','Biobío','Araucanía','Los Ríos',
  'Los Lagos','Aysén','Magallanes',
];

const GRADIENT_COLORS = [
  ['from-red-700 to-red-900', 'border-red-500/40'],
  ['from-orange-700 to-orange-900', 'border-orange-500/40'],
  ['from-amber-700 to-amber-900', 'border-amber-500/40'],
  ['from-blue-700 to-blue-900', 'border-blue-500/40'],
  ['from-purple-700 to-purple-900', 'border-purple-500/40'],
  ['from-emerald-700 to-emerald-900', 'border-emerald-500/40'],
  ['from-cyan-700 to-cyan-900', 'border-cyan-500/40'],
  ['from-rose-700 to-rose-900', 'border-rose-500/40'],
];
const getGrad = (n: number) => GRADIENT_COLORS[(n - 1) % GRADIENT_COLORS.length];

const ordinal = (n: number) => {
  const map: Record<number, string> = {1:'Primera',2:'Segunda',3:'Tercera',4:'Cuarta',5:'Quinta',6:'Sexta',7:'Séptima',8:'Octava',9:'Novena',10:'Décima'};
  return map[n] ?? `${n}ª`;
};

const inpIcon = 'w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500 transition-colors';

export default function CompaniesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<CompanyFormData>(EMPTY_FORM);
  const [detail, setDetail] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHq, setUploadingHq] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const hqRef = useRef<HTMLInputElement>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => api.get('/companies').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/companies', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); toast.success('Compañía creada'); reset(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al crear'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/companies/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); toast.success('Compañía actualizada'); reset(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Error al actualizar'),
  });

  const reset = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); };

  const handleUpload = async (file: File, type: 'logo' | 'hq') => {
    if (type === 'logo') setUploadingLogo(true); else setUploadingHq(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const endpoint = type === 'logo' ? '/companies/upload-logo' : '/companies/upload-image';
      const { data } = await api.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const key = type === 'logo' ? 'logoUrl' : 'headquartersImageUrl';
      setForm(f => ({ ...f, [key]: data[key] }));
      toast.success(type === 'logo' ? 'Logo cargado' : 'Foto de cuartel cargada');
    } catch { toast.error('Error al subir imagen'); }
    finally { if (type === 'logo') setUploadingLogo(false); else setUploadingHq(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      number: parseInt(form.number),
      logoUrl: form.logoUrl || undefined,
      headquartersImageUrl: form.headquartersImageUrl || undefined,
    };
    editing ? updateMutation.mutate({ id: editing.id, data: payload }) : createMutation.mutate(payload);
  };

  const handleEdit = (company: any) => {
    setEditing(company);
    setForm({
      name: company.name, number: String(company.number), region: company.region,
      city: company.city, address: company.address, phone: company.phone ?? '',
      email: company.email ?? '', logoUrl: company.logoUrl ?? '',
      headquartersImageUrl: company.headquartersImageUrl ?? '',
    });
    setShowForm(true);
    setDetail(null);
  };

  const set = (key: keyof CompanyFormData) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const totalPersonal = companies?.reduce((s: number, c: any) => s + (c._count?.users ?? 0), 0) ?? 0;
  const totalVehiculos = companies?.reduce((s: number, c: any) => s + (c._count?.vehicles ?? 0), 0) ?? 0;
  const totalEquip = companies?.reduce((s: number, c: any) => s + (c._count?.equipment ?? 0), 0) ?? 0;

  const filtered = (companies ?? []).filter((c: any) =>
    `${c.name} ${c.city} ${c.region} ${c.number}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Compañías</h1>
          <p className="text-sm text-slate-400 mt-0.5">Cuarteles y unidades del cuerpo de bomberos</p>
        </div>
        <div className="flex items-center gap-2">
          {!!companies?.length && (
            <button
              onClick={() => downloadPdf(createElement(CompanyReport, { companies: companies ?? [] }), `nodo360_companias_${new Date().toISOString().split('T')[0]}.pdf`)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
              <FileDown className="w-4 h-4" />Exportar PDF
            </button>
          )}
          <button onClick={() => { reset(); setShowForm(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-red-600/20">
            <Plus className="w-4 h-4" />Nueva Compañía
          </button>
        </div>
      </div>

      {/* KPIs */}
      {!!companies?.length && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Compañías', value: companies.length, icon: Building2, color: 'text-red-400', bg: 'bg-red-600/10', border: 'border-red-600/20' },
            { label: 'Personal total', value: totalPersonal, icon: Users, color: 'text-blue-400', bg: 'bg-blue-600/10', border: 'border-blue-600/20' },
            { label: 'Flota total', value: totalVehiculos, icon: Truck, color: 'text-orange-400', bg: 'bg-orange-600/10', border: 'border-orange-600/20' },
            { label: 'Equipamiento', value: totalEquip, icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-600/10', border: 'border-emerald-600/20' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-4`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
                <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Búsqueda */}
      {!!companies?.length && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, ciudad..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-red-500" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" /></button>}
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-red-600/15 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">{editing ? 'Editar Compañía' : 'Nueva Compañía'}</h2>
                  <p className="text-xs text-slate-500">Completa los datos del cuartel</p>
                </div>
              </div>
              <button onClick={reset} className="p-2 hover:bg-slate-800 rounded-xl transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Upload imágenes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Logo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Logo de la compañía</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex items-center justify-center shrink-0">
                      {form.logoUrl
                        ? <img src={form.logoUrl} alt="logo" className="w-full h-full object-contain p-1" />
                        : <Flame className="w-7 h-7 text-slate-600" />}
                    </div>
                    <div className="space-y-1.5">
                      <input ref={logoRef} type="file" accept="image/*" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0], 'logo'); }} />
                      <button type="button" onClick={() => logoRef.current?.click()} disabled={uploadingLogo}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                        <Camera className="w-3 h-3" />{uploadingLogo ? 'Subiendo...' : 'Subir logo'}
                      </button>
                      {form.logoUrl && <button type="button" onClick={() => setForm(f => ({ ...f, logoUrl: '' }))} className="text-[11px] text-red-400 hover:text-red-300"><X className="w-2.5 h-2.5 inline" /> Quitar</button>}
                      <p className="text-[10px] text-slate-600">PNG, SVG — máx. 5MB</p>
                    </div>
                  </div>
                </div>

                {/* Foto cuartel */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Foto del cuartel</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex items-center justify-center shrink-0">
                      {form.headquartersImageUrl
                        ? <img src={form.headquartersImageUrl} alt="cuartel" className="w-full h-full object-cover" />
                        : <ImageOff className="w-7 h-7 text-slate-600" />}
                    </div>
                    <div className="space-y-1.5">
                      <input ref={hqRef} type="file" accept="image/*" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0], 'hq'); }} />
                      <button type="button" onClick={() => hqRef.current?.click()} disabled={uploadingHq}
                        className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                        <Camera className="w-3 h-3" />{uploadingHq ? 'Subiendo...' : 'Subir foto'}
                      </button>
                      {form.headquartersImageUrl && <button type="button" onClick={() => setForm(f => ({ ...f, headquartersImageUrl: '' }))} className="text-[11px] text-red-400 hover:text-red-300"><X className="w-2.5 h-2.5 inline" /> Quitar</button>}
                      <p className="text-[10px] text-slate-600">JPG, PNG — máx. 10MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Campos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Nombre *</label>
                  <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input value={form.name} onChange={set('name')} required placeholder="Ej: Primera Compañía de Bomberos" className={inpIcon} /></div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Número *</label>
                  <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input type="number" value={form.number} onChange={set('number')} required placeholder="1" className={inpIcon} /></div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Ciudad *</label>
                  <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input value={form.city} onChange={set('city')} required placeholder="Ej: Santiago" className={inpIcon} /></div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Región *</label>
                  <div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <select value={form.region} onChange={set('region')} className={`${inpIcon} appearance-none`}>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Dirección *</label>
                  <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input value={form.address} onChange={set('address')} required placeholder="Av. Libertador 123" className={inpIcon} /></div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Teléfono</label>
                  <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input value={form.phone} onChange={set('phone')} placeholder="+56 2 2345 6789" className={inpIcon} /></div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Correo electrónico</label>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input type="email" value={form.email} onChange={set('email')} placeholder="cia@bomberos.cl" className={inpIcon} /></div>
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-800">
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending || uploadingLogo || uploadingHq}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                  <CheckCircle2 className="w-4 h-4" />{editing ? 'Guardar cambios' : 'Crear compañía'}
                </button>
                <button type="button" onClick={reset} className="text-slate-400 hover:text-slate-200 text-sm px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Foto cuartel header */}
            <div className="relative h-52 bg-slate-800 overflow-hidden">
              {detail.headquartersImageUrl
                ? <img src={detail.headquartersImageUrl} alt="cuartel" className="w-full h-full object-cover" />
                : <div className={`w-full h-full bg-gradient-to-br ${getGrad(detail.number)[0]} flex items-center justify-center`}>
                    <Building2 className="w-16 h-16 text-white/20" />
                  </div>
              }
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
              <button onClick={() => setDetail(null)} className="absolute top-3 right-3 p-2 bg-slate-900/60 hover:bg-slate-900 rounded-xl transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
              {/* Logo sobre la foto */}
              <div className="absolute bottom-4 left-4 flex items-end gap-3">
                {detail.logoUrl
                  ? <div className="w-14 h-14 bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-white/20 flex items-center justify-center">
                      <img src={detail.logoUrl} alt="logo" className="w-full h-full object-contain p-1" />
                    </div>
                  : <div className={`w-14 h-14 bg-gradient-to-br ${getGrad(detail.number)[0]} rounded-2xl shadow-xl border border-white/20 flex flex-col items-center justify-center`}>
                      <Flame className="w-4 h-4 text-white/80 mb-0.5" />
                      <span className="text-xl font-black text-white leading-none">{detail.number}</span>
                    </div>
                }
                <div>
                  <p className="text-xs text-white/60 font-semibold uppercase tracking-widest">{ordinal(detail.number)} Compañía</p>
                  <p className="text-lg font-bold text-white leading-tight">{detail.name}</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Ubicación */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{detail.city}, Región {detail.region}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{detail.address}</p>
                </div>
              </div>

              {/* Contacto */}
              <div className="flex flex-wrap gap-2">
                {detail.phone && (
                  <a href={`tel:${detail.phone}`} className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-colors">
                    <Phone className="w-3 h-3 text-slate-400" />{detail.phone}
                  </a>
                )}
                {detail.email && (
                  <a href={`mailto:${detail.email}`} className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-1.5 rounded-lg transition-colors">
                    <Mail className="w-3 h-3 text-slate-400" />{detail.email}
                  </a>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                  <Users className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">{detail._count?.users ?? 0}</p>
                  <p className="text-[10px] text-slate-500">Personal</p>
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                  <Truck className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">{detail._count?.vehicles ?? 0}</p>
                  <p className="text-[10px] text-slate-500">Vehículos</p>
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3 text-center">
                  <Package className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">{detail._count?.equipment ?? 0}</p>
                  <p className="text-[10px] text-slate-500">Equipos</p>
                </div>
              </div>

              <button onClick={() => handleEdit(detail)}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-medium py-2.5 rounded-xl transition-colors">
                <Pencil className="w-3.5 h-3.5" />Editar compañía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-64 animate-pulse" />)}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-300 font-semibold">{search ? 'Sin resultados' : 'Sin compañías registradas'}</p>
          <p className="text-slate-600 text-sm mt-1 mb-5">{search ? 'Intenta con otro término' : 'Agrega el primer cuartel de bomberos'}</p>
          {!search && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              <Plus className="w-4 h-4" />Agregar compañía
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c: any) => {
            const [grad, borderAccent] = getGrad(c.number);
            return (
              <div key={c.id} onClick={() => setDetail(c)}
                className="group bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:shadow-black/30 cursor-pointer">

                {/* Imagen cuartel con overlay */}
                <div className="relative h-40 overflow-hidden">
                  {c.headquartersImageUrl
                    ? <img src={c.headquartersImageUrl} alt="cuartel" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
                        <div className="absolute inset-0 opacity-10"
                          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                        <Building2 className="w-14 h-14 text-white/20" />
                      </div>
                  }
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />

                  {/* Logo + nombre sobre imagen */}
                  <div className="absolute bottom-3 left-4 flex items-end gap-3">
                    {c.logoUrl
                      ? <div className="w-11 h-11 bg-white rounded-xl shadow-lg overflow-hidden border-2 border-white/30 flex items-center justify-center shrink-0">
                          <img src={c.logoUrl} alt="logo" className="w-full h-full object-contain p-0.5" />
                        </div>
                      : <div className={`w-11 h-11 bg-gradient-to-br ${grad} rounded-xl shadow-lg border border-white/20 flex flex-col items-center justify-center shrink-0`}>
                          <Flame className="w-3 h-3 text-white/80" />
                          <span className="text-base font-black text-white leading-none">{c.number}</span>
                        </div>
                    }
                    <div className="min-w-0">
                      <p className="text-[10px] text-white/50 font-semibold uppercase tracking-widest">{ordinal(c.number)} Compañía</p>
                      <p className="text-sm font-bold text-white leading-snug truncate max-w-[200px]">{c.name}</p>
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 text-white/70" />
                  </div>
                </div>

                {/* Cuerpo card */}
                <div className="px-4 pb-4 pt-3">
                  {/* Ubicación */}
                  <div className="flex items-center gap-1.5 mb-3 text-xs text-slate-400">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{c.address} · {c.city}</span>
                  </div>

                  {/* Contacto inline */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.phone && (
                      <span onClick={e => e.stopPropagation()}>
                        <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] px-2 py-1 rounded-lg transition-colors">
                          <Phone className="w-2.5 h-2.5" />{c.phone}
                        </a>
                      </span>
                    )}
                    {c.email && (
                      <span onClick={e => e.stopPropagation()}>
                        <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] px-2 py-1 rounded-lg transition-colors">
                          <Mail className="w-2.5 h-2.5" />{c.email}
                        </a>
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className={`grid grid-cols-3 gap-2 pt-3 border-t ${borderAccent}`}>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{c._count?.users ?? 0}</p>
                      <p className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5"><Users className="w-2.5 h-2.5" />Personal</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{c._count?.vehicles ?? 0}</p>
                      <p className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5"><Truck className="w-2.5 h-2.5" />Vehículos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{c._count?.equipment ?? 0}</p>
                      <p className="text-[10px] text-slate-500 flex items-center justify-center gap-0.5"><Package className="w-2.5 h-2.5" />Equipos</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
