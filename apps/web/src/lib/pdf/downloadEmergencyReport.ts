import { createElement } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { salaAuthHeaders } from '../sala-auth';
import { EmergencyReport } from './EmergencyReport';
import { downloadPdf } from './usePdfDownload';

const apiBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

export type EmergencyReportSource = {
  pack?: any;
  slug?: string;
};

export async function downloadEmergencyReport(incidentId: string, source?: EmergencyReportSource) {
  try {
    let data = source?.pack;
    if (!data && source?.slug) {
      const res = await fetch(
        `${apiBase}/emergency-bitacora/public/${source.slug}/report/${incidentId}`,
        { headers: salaAuthHeaders(source.slug) },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'No se pudo obtener el informe');
      }
      data = await res.json();
    }
    if (!data) {
      const res = await api.get(`/incidents/${incidentId}/report`);
      data = res.data;
    }
    const code = String(data?.code ?? incidentId).replace(/[^\w.-]+/g, '_');
    await downloadPdf(createElement(EmergencyReport, { incident: data }), `nodo360_emergencia_${code}.pdf`);
  } catch (err) {
    console.error(err);
    toast.error(err instanceof Error ? err.message : 'No se pudo generar el informe PDF');
  }
}
