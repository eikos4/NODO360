import { pdf } from '@react-pdf/renderer';
import { createElement, ReactElement } from 'react';
import toast from 'react-hot-toast';

export async function downloadPdf(
  document: ReactElement,
  filename: string
): Promise<void> {
  const toastId = toast.loading('Generando PDF...');
  try {
    const blob = await pdf(document).toBlob();
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('PDF descargado', { id: toastId });
  } catch (err) {
    console.error(err);
    toast.error('Error al generar PDF', { id: toastId });
  }
}
