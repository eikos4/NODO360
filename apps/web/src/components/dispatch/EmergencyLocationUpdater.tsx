import { useState } from 'react';
import { MapPin, Phone, MessageSquare, Send } from 'lucide-react';
import { notifyLocationUpdate } from '../../lib/dispatch-live-sync';
import { buildWhatsAppShareUrl } from '../../lib/incident-location-pin';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

interface Props {
  emergencyId: string;
  currentAddress?: string;
  onClose: () => void;
}

export default function EmergencyLocationUpdater({ emergencyId, currentAddress, onClose }: Props) {
  const [address, setAddress] = useState(currentAddress || '');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleWhatsApp = () => {
    const url = buildWhatsAppShareUrl(
      phone,
      'Por favor envíe su ubicación actual respondiendo a este chat para Bomberos Parral',
    );
    if (!url) {
      toast.error('Ingresa un número de teléfono');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleUpdate = async () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (!address) {
      toast.error('Debe ingresar una dirección.');
      return;
    }
    if (isNaN(latNum) || isNaN(lngNum)) {
      toast.error('Debe ingresar coordenadas válidas.');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/incidents/${emergencyId}`, {
        address,
        latitude: latNum,
        longitude: lngNum,
      });
      notifyLocationUpdate({
        incidentId: emergencyId,
        newAddress: address,
        latitude: latNum,
        longitude: lngNum,
      });
      toast.success('Ubicación actualizada y enviada a los cuarteles.');
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'No se pudo actualizar la ubicación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-3">
      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-blue-500" /> Gestionar Ubicación
      </h4>
      
      <div className="space-y-3">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">1. Solicitar por WhatsApp (Opcional)</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
              <input 
                type="text" 
                placeholder="N° con código país (Ej: 56912345678)" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 pl-7 pr-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-200"
              />
            </div>
            <button 
              type="button"
              onClick={handleWhatsApp}
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white px-2.5 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors"
            >
              <MessageSquare className="w-3 h-3" /> Solicitar
            </button>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">2. Ingresar Nueva Ubicación</p>
          <div className="space-y-2">
            <input 
              type="text" 
              placeholder="Nueva Dirección (Ej: Los Carrera 123)" 
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-200"
            />
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Latitud (Ej: -36.14)" 
                value={lat}
                onChange={e => setLat(e.target.value)}
                className="w-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-200"
              />
              <input 
                type="text" 
                placeholder="Longitud (Ej: -71.82)" 
                value={lng}
                onChange={e => setLng(e.target.value)}
                className="w-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md py-1.5 px-2.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 dark:text-slate-200"
              />
            </div>
            <button 
              type="button"
              onClick={() => void handleUpdate()}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors mt-2 shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> {saving ? 'Guardando…' : 'Actualizar Ubicación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
