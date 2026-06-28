import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Building2, MapPin, Phone, Users, Truck,
  Pencil, Mail, Hash, Globe, X, Flame, CheckCircle2,
  Camera, ImageOff, Package, ChevronRight, Search, FileDown, BookOpen,
} from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { createElement } from 'react';
import { CompanyReport } from '../lib/pdf/CompanyReport';
import { downloadPdf } from '../lib/pdf/usePdfDownload';
import CompanyEmergencyBitacoraPanel from '../components/companies/CompanyEmergencyBitacoraPanel';

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
  ['from-red-600 to-red-800', 'border-red-500/30', 'text-red-600', 'bg-red-50 dark:bg-red-500/10'],
  ['from-orange-600 to-orange-800', 'border-orange-500/30', 'text-orange-600', 'bg-orange-50 dark:bg-orange-500/10'],
  ['from-amber-600 to-amber-800', 'border-amber-500/30', 'text-amber-600', 'bg-amber-50 dark:bg-amber-500/10'],
  ['from-blue-600 to-blue-800', 'border-blue-500/30', 'text-blue-600', 'bg-blue-50 dark:bg-blue-500/10'],
  ['from-purple-600 to-purple-800', 'border-purple-500/30', 'text-purple-600', 'bg-purple-50 dark:bg-purple-500/10'],
  ['from-emerald-600 to-emerald-800', 'border-emerald-500/30', 'text-emerald-600', 'bg-emerald-50 dark:bg-emerald-500/10'],
  ['from-cyan-600 to-cyan-800', 'border-cyan-500/30', 'text-cyan-600', 'bg-cyan-50 dark:bg-cyan-500/10'],
  ['from-rose-600 to-rose-800', 'border-rose-500/30', 'text-rose-600', 'bg-rose-50 dark:bg-rose-500/10'],
];

const getGrad = (n: number) => GRADIENT_COLORS[(n - 1) % GRADIENT_COLORS.length];

const ordinal = (n: number) => {
  const map: Record<number, string> = {1:'Primera',2:'Segunda',3:'Tercera',4:'Cuarta',5:'Quinta',6:'Sexta',7:'Séptima',8:'Octava',9:'Novena',10:'Décima'};
  return map[n] ?? `${n}ª`;
};

const inpIcon = 'w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 dark:focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all';

export default function CompaniesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<CompanyFormData>(EMPTY_FORM);
  const [detail, setDetail] = useState<any>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'bitacora'>('info');
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
    <div className="space-y-8 max-w-7xl mx-auto pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Compañías</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestión operativa de cuarteles y unidades del cuerpo</p>
        </div>
        <div className="flex items-center gap-3">
          {!!companies?.length && (
            <button
              onClick={() => downloadPdf(createElement(CompanyReport, { companies: companies ?? [] }), `nodo360_companias_${new Date().toISOString().split('T')[0]}.pdf`)}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm">
              <FileDown className="w-4 h-4" />Exportar PDF
            </button>
          )}
          <button onClick={() => { reset(); setShowForm(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/30">
            <Plus className="w-4 h-4" />Nueva Compañía
          </button>
        </div>
      </div>

      {/* KPIs */}
      {!!companies?.length && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Compañías Activas', value: companies.length, icon: Building2, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
            { label: 'Personal Total', value: totalPersonal, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
            { label: 'Flota Vehicular', value: totalVehiculos, icon: Truck, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10' },
            { label: 'Inventario Equipos', value: totalEquip, icon: Package, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.bg}`}>
                <s.icon className={`w-6 h-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Búsqueda */}
      {!!companies?.length && (
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, ciudad, número..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-10 py-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all shadow-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X className="w-4 h-4 text-slate-400" /></button>}
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">{editing ? 'Editar Compañía' : 'Nueva Compañía'}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Administra los detalles operativos del cuartel</p>
                </div>
              </div>
              <button onClick={reset} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Upload imágenes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                {/* Logo */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Insignia / Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                      {form.logoUrl
                        ? <img src={form.logoUrl} alt="logo" className="w-full h-full object-contain p-2" />
                        : <Flame className="w-8 h-8 text-slate-300 dark:text-slate-600" />}
                    </div>
                    <div className="space-y-2">
                      <input ref={logoRef} type="file" accept="image/*" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0], 'logo'); }} />
                      <button type="button" onClick={() => logoRef.current?.click()} disabled={uploadingLogo}
                        className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm disabled:opacity-50">
                        <Camera className="w-4 h-4" />{uploadingLogo ? 'Subiendo...' : 'Examinar'}
                      </button>
                      {form.logoUrl && <button type="button" onClick={() => setForm(f => ({ ...f, logoUrl: '' }))} className="text-[11px] font-semibold text-red-500 hover:text-red-600"><X className="w-3 h-3 inline" /> Eliminar imagen</button>}
                    </div>
                  </div>
                </div>

                {/* Foto cuartel */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Fotografía Frontal</label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                      {form.headquartersImageUrl
                        ? <img src={form.headquartersImageUrl} alt="cuartel" className="w-full h-full object-cover" />
                        : <ImageOff className="w-8 h-8 text-slate-300 dark:text-slate-600" />}
                    </div>
                    <div className="space-y-2">
                      <input ref={hqRef} type="file" accept="image/*" className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0], 'hq'); }} />
                      <button type="button" onClick={() => hqRef.current?.click()} disabled={uploadingHq}
                        className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm disabled:opacity-50">
                        <Camera className="w-4 h-4" />{uploadingHq ? 'Subiendo...' : 'Examinar'}
                      </button>
                      {form.headquartersImageUrl && <button type="button" onClick={() => setForm(f => ({ ...f, headquartersImageUrl: '' }))} className="text-[11px] font-semibold text-red-500 hover:text-red-600"><X className="w-3 h-3 inline" /> Eliminar foto</button>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Campos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Nombre Oficial *</label>
                  <div className="relative"><Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={form.name} onChange={set('name')} required placeholder="Ej: Primera Compañía 'Bomba Germania'" className={inpIcon} /></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Número de Compañía *</label>
                  <div className="relative"><Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="number" value={form.number} onChange={set('number')} required placeholder="1" className={inpIcon} /></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Ciudad *</label>
                  <div className="relative"><MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={form.city} onChange={set('city')} required placeholder="Ej: Santiago" className={inpIcon} /></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Región *</label>
                  <div className="relative"><Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select value={form.region} onChange={set('region')} className={`${inpIcon} appearance-none`}>
                      {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Dirección *</label>
                  <div className="relative"><MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={form.address} onChange={set('address')} required placeholder="Av. Libertador Bernardo O'Higgins 123" className={inpIcon} /></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Teléfono de Guardia</label>
                  <div className="relative"><Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={form.phone} onChange={set('phone')} placeholder="+56 2 2345 6789" className={inpIcon} /></div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Correo Electrónico</label>
                  <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" value={form.email} onChange={set('email')} placeholder="cia@bomberos.cl" className={inpIcon} /></div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={reset} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-sm font-semibold px-5 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending || uploadingLogo || uploadingHq}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-red-600/20">
                  <CheckCircle2 className="w-5 h-5" />{editing ? 'Guardar Cambios' : 'Confirmar y Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detalle (Rediseño visual premium) */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md" onClick={() => { setDetail(null); setDetailTab('info'); }}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Cabecera visual rica */}
            <div className="relative h-64 bg-slate-900 overflow-hidden shrink-0">
              {detail.headquartersImageUrl
                ? <img src={detail.headquartersImageUrl} alt="cuartel" className="w-full h-full object-cover" />
                : <div className={`w-full h-full bg-gradient-to-br ${getGrad(detail.number)[0]} flex items-center justify-center`}>
                    <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
                    <Building2 className="w-24 h-24 text-white/10" />
                  </div>
              }
              {/* Overlay suave para legibilidad */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              
              <button onClick={() => { setDetail(null); setDetailTab('info'); }} className="absolute top-4 right-4 p-2.5 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-xl transition-all border border-white/10">
                <X className="w-5 h-5 text-white" />
              </button>
              
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4">
                <div className="flex items-center gap-5">
                  {detail.logoUrl
                    ? <div className="w-20 h-20 bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-white/10 flex items-center justify-center shrink-0">
                        <img src={detail.logoUrl} alt="logo" className="w-full h-full object-contain p-2" />
                      </div>
                    : <div className={`w-20 h-20 bg-gradient-to-br ${getGrad(detail.number)[0]} rounded-2xl shadow-2xl border-2 border-white/20 flex flex-col items-center justify-center shrink-0`}>
                        <Flame className="w-6 h-6 text-white/80 mb-1" />
                        <span className="text-2xl font-black text-white leading-none">{detail.number}</span>
                      </div>
                  }
                  <div className="min-w-0">
                    <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-[10px] font-bold text-white uppercase tracking-widest mb-2 shadow-sm">{ordinal(detail.number)} Compañía</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-md truncate">{detail.name}</h2>
                  </div>
                </div>
                <button onClick={() => handleEdit(detail)}
                  className="hidden sm:flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shrink-0">
                  <Pencil className="w-4 h-4" />Editar
                </button>
              </div>
            </div>

            {/* Pestañas modernas */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 shrink-0 bg-slate-50 dark:bg-slate-900/50">
              {([
                { id: 'info' as const, label: 'Perfil y Operaciones', icon: Building2 },
                { id: 'bitacora' as const, label: 'Historial de Emergencias', icon: BookOpen },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDetailTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-4 text-sm font-bold border-b-2 transition-all ${
                    detailTab === tab.id
                      ? 'border-red-500 text-red-600 dark:text-red-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${detailTab === tab.id ? 'text-red-500' : 'opacity-70'}`} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenido desplazable */}
            <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-900">
              {detailTab === 'info' ? (
              <div className="space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                  {/* Info Panel Lateral */}
                  <div className="flex-1 space-y-4">
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Información General</h3>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-slate-900 dark:text-slate-100">{detail.city}, Región {detail.region}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{detail.address}</p>
                      </div>
                    </div>

                    {(detail.phone || detail.email) && (
                      <div className="pt-2 flex flex-wrap gap-3">
                        {detail.phone && (
                          <a href={`tel:${detail.phone}`} className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm">
                            <Phone className="w-4 h-4 text-blue-500" />{detail.phone}
                          </a>
                        )}
                        {detail.email && (
                          <a href={`mailto:${detail.email}`} className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm">
                            <Mail className="w-4 h-4 text-orange-500" />{detail.email}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats Grid Derecho */}
                  <div className="w-full sm:w-64 shrink-0 grid grid-cols-2 sm:grid-cols-1 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-blue-900 dark:text-blue-100 leading-none">{detail._count?.users ?? 0}</p>
                        <p className="text-xs font-semibold text-blue-600/80 dark:text-blue-400/80 mt-1 uppercase tracking-wide">Personal</p>
                      </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/10 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/20 rounded-xl flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-orange-900 dark:text-orange-100 leading-none">{detail._count?.vehicles ?? 0}</p>
                        <p className="text-xs font-semibold text-orange-600/80 dark:text-orange-400/80 mt-1 uppercase tracking-wide">Vehículos</p>
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-emerald-900 dark:text-emerald-100 leading-none">{detail._count?.equipment ?? 0}</p>
                        <p className="text-xs font-semibold text-emerald-600/80 dark:text-emerald-400/80 mt-1 uppercase tracking-wide">Equipos</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones Móvil */}
                <button onClick={() => handleEdit(detail)}
                  className="w-full sm:hidden flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-bold py-3.5 rounded-xl transition-all shadow-sm">
                  <Pencil className="w-4 h-4" />Editar Detalles
                </button>
              </div>
              ) : (
                <div className="-m-2">
                  <CompanyEmergencyBitacoraPanel
                    companyId={detail.id}
                    companyName={`${ordinal(detail.number)} Compañía ${detail.name}`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid cards premium */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl h-80 animate-pulse shadow-sm" />)}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-lg text-slate-900 dark:text-white font-bold">{search ? 'Sin resultados' : 'El cuerpo de bomberos está vacío'}</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-6 max-w-sm mx-auto">{search ? 'Intenta con otro término de búsqueda o revisa la ortografía' : 'Comienza agregando el primer cuartel o compañía para organizar el personal y flota.'}</p>
          {!search && (
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-red-600/20">
              <Plus className="w-5 h-5" />Crear primera compañía
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c: any) => {
            const [gradBg, borderAccent, textAccent, lightBg] = getGrad(c.number);
            return (
              <div key={c.id} onClick={() => { setDetail(c); setDetailTab('info'); }}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/50 cursor-pointer flex flex-col">

                {/* Imagen cuartel full-bleed */}
                <div className="relative h-44 overflow-hidden shrink-0">
                  {c.headquartersImageUrl
                    ? <img src={c.headquartersImageUrl} alt="cuartel" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    : <div className={`w-full h-full bg-gradient-to-br ${gradBg} flex items-center justify-center`}>
                        <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 2px, transparent 2px)', backgroundSize: '24px 24px' }} />
                        <Building2 className="w-16 h-16 text-white/20" />
                      </div>
                  }
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />

                  {/* Número flotante arriba a la derecha */}
                  <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-md border border-white/20 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                    {ordinal(c.number)} Cía
                  </div>
                </div>

                {/* Contenido Inferior */}
                <div className="relative pt-12 pb-6 px-6 flex-1 flex flex-col bg-white dark:bg-slate-900">
                  {/* Logo Flotante Circular superpuesto */}
                  <div className="absolute -top-10 left-6">
                    {c.logoUrl
                      ? <div className="w-20 h-20 bg-white rounded-full shadow-xl overflow-hidden border-4 border-white dark:border-slate-900 flex items-center justify-center">
                          <img src={c.logoUrl} alt="logo" className="w-full h-full object-contain p-2" />
                        </div>
                      : <div className={`w-20 h-20 bg-gradient-to-br ${gradBg} rounded-full shadow-xl border-4 border-white dark:border-slate-900 flex flex-col items-center justify-center`}>
                          <Flame className="w-6 h-6 text-white/80" />
                        </div>
                    }
                  </div>

                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-snug mb-1 line-clamp-1 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{c.name}</h3>
                  
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-5">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{c.city}, {c.region}</span>
                  </div>

                  <div className="mt-auto grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 text-center border border-slate-100 dark:border-slate-800 group-hover:border-blue-200 dark:group-hover:border-blue-500/30 transition-colors">
                      <Users className="w-4 h-4 text-blue-500 mx-auto mb-1.5" />
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{c._count?.users ?? 0}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 text-center border border-slate-100 dark:border-slate-800 group-hover:border-orange-200 dark:group-hover:border-orange-500/30 transition-colors">
                      <Truck className="w-4 h-4 text-orange-500 mx-auto mb-1.5" />
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{c._count?.vehicles ?? 0}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 text-center border border-slate-100 dark:border-slate-800 group-hover:border-emerald-200 dark:group-hover:border-emerald-500/30 transition-colors">
                      <Package className="w-4 h-4 text-emerald-500 mx-auto mb-1.5" />
                      <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{c._count?.equipment ?? 0}</p>
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
