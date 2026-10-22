import { createElement } from 'react';
import toast from 'react-hot-toast';
import type { CommandSnapshot } from '../nodo-command';
import { CommandPostReport } from './CommandPostReport';
import { downloadPdf } from './usePdfDownload';

export async function downloadCommandPostReport(snapshot: CommandSnapshot) {
  if (!snapshot.post) {
    toast.error('No hay puesto de comando para generar el informe.');
    return;
  }
  const code = String(snapshot.incident.code ?? snapshot.post.id).replace(/[^\w.-]+/g, '_');
  await downloadPdf(
    createElement(CommandPostReport, { snapshot }),
    `nodo360_puestocomando_${code}.pdf`,
  );
}
