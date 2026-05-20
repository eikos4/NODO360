import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

/* ── Paleta NODO360 ── */
export const COLORS = {
  red:       '#dc2626',
  redLight:  '#fef2f2',
  redMid:    '#fee2e2',
  dark:      '#0f172a',
  darkMid:   '#1e293b',
  slate:     '#334155',
  slateLight:'#64748b',
  muted:     '#94a3b8',
  border:    '#e2e8f0',
  bg:        '#f8fafc',
  white:     '#ffffff',
  green:     '#16a34a',
  greenBg:   '#f0fdf4',
  yellow:    '#ca8a04',
  yellowBg:  '#fefce8',
  orange:    '#ea580c',
  orangeBg:  '#fff7ed',
};

/* ── Estilos globales reutilizables ── */
export const BASE = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: COLORS.white,
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
    fontSize: 10,
    color: COLORS.dark,
  },
  /* Header de página */
  header: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: 32,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 32, height: 32,
    backgroundColor: COLORS.red,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: COLORS.white, fontSize: 14, fontFamily: 'Helvetica-Bold' },
  brandName: { color: COLORS.white, fontSize: 14, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  brandSub: { color: COLORS.muted, fontSize: 7, letterSpacing: 2, marginTop: 1 },
  headerRight: { alignItems: 'flex-end' },
  reportTitle: { color: COLORS.white, fontSize: 11, fontFamily: 'Helvetica-Bold' },
  reportDate: { color: COLORS.muted, fontSize: 8, marginTop: 2 },

  /* Banda roja decorativa */
  redBand: { backgroundColor: COLORS.red, height: 3 },

  /* Cuerpo */
  body: { paddingHorizontal: 32, paddingTop: 20 },

  /* Section title */
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slateLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 4,
  },

  /* KPI row */
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  kpiValue: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: COLORS.dark },
  kpiLabel: { fontSize: 8, color: COLORS.slateLight, marginTop: 2 },

  /* Tabla */
  table: { width: '100%' },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: COLORS.darkMid,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableHeadCell: { color: COLORS.white, fontSize: 8, fontFamily: 'Helvetica-Bold', flex: 1 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableCell: { fontSize: 9, color: COLORS.dark, flex: 1 },
  tableCellMuted: { fontSize: 9, color: COLORS.slateLight, flex: 1 },

  /* Badges */
  badgeGreen:  { backgroundColor: COLORS.greenBg,  color: COLORS.green,  fontSize: 8, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  badgeRed:    { backgroundColor: '#fef2f2',        color: COLORS.red,    fontSize: 8, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  badgeYellow: { backgroundColor: COLORS.yellowBg,  color: COLORS.yellow, fontSize: 8, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  badgeOrange: { backgroundColor: COLORS.orangeBg,  color: COLORS.orange, fontSize: 8, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  badgeGray:   { backgroundColor: COLORS.bg,        color: COLORS.slateLight, fontSize: 8, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },

  /* Footer */
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 34,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    backgroundColor: COLORS.white,
  },
  footerText: { fontSize: 8, color: COLORS.muted },
  footerBold: { fontSize: 8, color: COLORS.slateLight, fontFamily: 'Helvetica-Bold' },
});

/* ── Componentes reutilizables ── */
export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = () =>
  new Date().toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function PdfHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <View style={BASE.header}>
        <View style={BASE.headerLeft}>
          <View style={BASE.logoBox}>
            <Text style={BASE.logoText}>🔴</Text>
          </View>
          <View>
            <Text style={BASE.brandName}>NODO360</Text>
            <Text style={BASE.brandSub}>BOMBEROS CHILE</Text>
          </View>
        </View>
        <View style={BASE.headerRight}>
          <Text style={BASE.reportTitle}>{title}</Text>
          {subtitle && <Text style={BASE.reportDate}>{subtitle}</Text>}
          <Text style={BASE.reportDate}>Generado: {fmtDateTime()}</Text>
        </View>
      </View>
      <View style={BASE.redBand} />
    </>
  );
}

export function PdfFooter({ pageNumber }: { pageNumber?: number }) {
  return (
    <View style={BASE.footer} fixed>
      <Text style={BASE.footerText}>NODO360 © {new Date().getFullYear()} — Sistema de Gestión Operativa para Bomberos de Chile</Text>
      {pageNumber !== undefined && (
        <Text style={BASE.footerBold}>Pág. {pageNumber}</Text>
      )}
    </View>
  );
}

export function PdfFooterAuto() {
  return (
    <View style={BASE.footer} fixed>
      <Text style={BASE.footerText}>NODO360 © {new Date().getFullYear()} — Sistema de Gestión Operativa para Bomberos de Chile</Text>
      <Text style={BASE.footerBold} render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`} fixed />
    </View>
  );
}
