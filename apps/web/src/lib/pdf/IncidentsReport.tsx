import { Document, Page, Text, View } from '@react-pdf/renderer';
import { BASE, COLORS, PdfHeader, PdfFooterAuto, fmtDate } from './PdfBase';

const STATUS_LABEL: Record<string, string> = {
  DESPACHADO:  'Despachado',
  EN_PROCESO:  'En proceso',
  CERRADO:     'Cerrado',
};

interface Props {
  incidents: any[];
  companies: any[];
}

export function IncidentsReport({ incidents, companies }: Props) {
  const ciaName = (id?: string) => companies.find((c: any) => c.id === id)?.name ?? '—';

  const closed    = incidents.filter(i => i.status === 'CERRADO').length;
  const active    = incidents.filter(i => i.status !== 'CERRADO').length;

  const byType = incidents.reduce((acc: any, inc: any) => {
    acc[inc.type] = (acc[inc.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topTypes = Object.entries(byType)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 6);

  return (
    <Document title="Reporte de Emergencias — NODO360" author="NODO360">
      <Page size="A4" style={BASE.page}>
        <PdfHeader
          title="Reporte de Emergencias"
          subtitle={`${incidents.length} incidente${incidents.length !== 1 ? 's' : ''} registrado${incidents.length !== 1 ? 's' : ''}`}
        />

        <View style={BASE.body}>
          {/* KPIs */}
          <View style={BASE.kpiRow}>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{incidents.length}</Text>
              <Text style={BASE.kpiLabel}>Total incidentes</Text>
            </View>
            <View style={[BASE.kpiBox, { borderColor: COLORS.green }]}>
              <Text style={[BASE.kpiValue, { color: COLORS.green }]}>{closed}</Text>
              <Text style={BASE.kpiLabel}>Cerrados</Text>
            </View>
            <View style={[BASE.kpiBox, { borderColor: COLORS.orange }]}>
              <Text style={[BASE.kpiValue, { color: COLORS.orange }]}>{active}</Text>
              <Text style={BASE.kpiLabel}>En curso</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{topTypes[0]?.[0] ?? '—'}</Text>
              <Text style={BASE.kpiLabel}>Tipo más frecuente</Text>
            </View>
          </View>

          {/* Distribución por tipo */}
          <Text style={BASE.sectionTitle}>Distribución por Tipo</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {topTypes.map(([type, count]) => (
              <View key={type} style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
                borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4,
              }}>
                <Text style={{ fontSize: 8, color: COLORS.dark }}>{type}</Text>
                <Text style={{ fontSize: 8, color: COLORS.red, fontFamily: 'Helvetica-Bold' }}>
                  {String(count)}
                </Text>
              </View>
            ))}
          </View>

          {/* Tabla incidentes */}
          <Text style={BASE.sectionTitle}>Historial de Incidentes</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Código</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Tipo</Text>
              <Text style={[BASE.tableHeadCell, { flex: 2 }]}>Dirección</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Estado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Fecha</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Compañía</Text>
            </View>
            {incidents.map((inc, i) => (
              <View key={inc.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                <Text style={[BASE.tableCell, { flex: 0.8, fontFamily: 'Helvetica-Bold', color: COLORS.red }]}>
                  {inc.code ?? `#${String(i + 1).padStart(3, '0')}`}
                </Text>
                <Text style={[BASE.tableCell, { flex: 1.5 }]}>{inc.type}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 2 }]}>{inc.address ?? '—'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={
                    inc.status === 'CERRADO'    ? BASE.badgeGreen :
                    inc.status === 'EN_PROCESO' ? BASE.badgeYellow :
                                                  BASE.badgeOrange
                  }>
                    {STATUS_LABEL[inc.status] ?? inc.status}
                  </Text>
                </View>
                <Text style={[BASE.tableCellMuted, { flex: 1.2 }]}>{fmtDate(inc.createdAt)}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 1.5 }]}>{ciaName(inc.companyId)}</Text>
              </View>
            ))}
          </View>
        </View>

        <PdfFooterAuto />
      </Page>
    </Document>
  );
}
