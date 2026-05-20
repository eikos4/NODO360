import { Document, Page, Text, View } from '@react-pdf/renderer';
import { BASE, COLORS, PdfHeader, PdfFooterAuto, fmtDate } from './PdfBase';

const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

interface Props {
  alertsData: any;
}

export function AlertsReport({ alertsData }: Props) {
  const expired: any[] = [
    ...(alertsData?.expired?.vehicles ?? []).map((r: any) => ({ ...r, kind: 'Vehículo', dateStr: r.nextMaintenanceAt })),
    ...(alertsData?.expired?.equipment ?? []).map((r: any) => ({ ...r, kind: 'Equipamiento', dateStr: r.expiresAt })),
  ];

  const soon: any[] = [
    ...(alertsData?.expiringSoon?.vehicles ?? []).map((r: any) => ({ ...r, kind: 'Vehículo', dateStr: r.nextMaintenanceAt })),
    ...(alertsData?.expiringSoon?.equipment ?? []).map((r: any) => ({ ...r, kind: 'Equipamiento', dateStr: r.expiresAt })),
  ].sort((a, b) => daysUntil(a.dateStr) - daysUntil(b.dateStr));

  const total = expired.length + soon.length;

  return (
    <Document title="Reporte de Alertas — NODO360" author="NODO360">
      <Page size="A4" style={BASE.page}>
        <PdfHeader
          title="Reporte de Alertas y Vencimientos"
          subtitle={`${total} alerta${total !== 1 ? 's' : ''} activa${total !== 1 ? 's' : ''}`}
        />

        <View style={BASE.body}>
          {/* KPIs */}
          <View style={BASE.kpiRow}>
            <View style={[BASE.kpiBox, { borderColor: COLORS.red }]}>
              <Text style={[BASE.kpiValue, { color: COLORS.red }]}>{expired.length}</Text>
              <Text style={BASE.kpiLabel}>VENCIDOS</Text>
            </View>
            <View style={[BASE.kpiBox, { borderColor: COLORS.orange }]}>
              <Text style={[BASE.kpiValue, { color: COLORS.orange }]}>{soon.length}</Text>
              <Text style={BASE.kpiLabel}>Próximos a vencer</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{expired.filter(e => e.kind === 'Vehículo').length}</Text>
              <Text style={BASE.kpiLabel}>Vehículos vencidos</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{expired.filter(e => e.kind === 'Equipamiento').length}</Text>
              <Text style={BASE.kpiLabel}>EPP vencido</Text>
            </View>
          </View>

          {/* Sección VENCIDOS */}
          {expired.length > 0 && (
            <>
              <Text style={[BASE.sectionTitle, { color: COLORS.red }]}>⚠ Vencidos — Acción Inmediata</Text>
              <View style={BASE.table}>
                <View style={[BASE.tableHead, { backgroundColor: '#7f1d1d' }]}>
                  <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Ítem</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Tipo</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Fecha vencida</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Días</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Compañía</Text>
                </View>
                {expired.map((item, i) => {
                  const name = item.kind === 'Vehículo'
                    ? `${item.brand ?? ''} ${item.model ?? ''} (${item.patent ?? ''})`.trim()
                    : `${item.name ?? ''} ${item.code ? `[${item.code}]` : ''}`.trim();
                  const days = daysUntil(item.dateStr);
                  return (
                    <View key={item.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                      <Text style={[BASE.tableCell, { flex: 1.5, fontFamily: 'Helvetica-Bold' }]}>{name}</Text>
                      <Text style={[BASE.tableCellMuted, { flex: 0.8 }]}>{item.kind}</Text>
                      <Text style={[BASE.tableCell, { flex: 1.2, color: COLORS.red }]}>{fmtDate(item.dateStr)}</Text>
                      <Text style={[BASE.tableCell, { flex: 0.8, color: COLORS.red, fontFamily: 'Helvetica-Bold' }]}>
                        {Math.abs(days)} d.
                      </Text>
                      <Text style={[BASE.tableCellMuted, { flex: 1.5 }]}>{item.company?.name ?? '—'}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Sección PRÓXIMOS */}
          {soon.length > 0 && (
            <>
              <Text style={[BASE.sectionTitle, { color: COLORS.orange }]}>Próximos a Vencer (≤ 30 días)</Text>
              <View style={BASE.table}>
                <View style={[BASE.tableHead, { backgroundColor: '#7c2d12' }]}>
                  <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Ítem</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Tipo</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Fecha vencimiento</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Días restantes</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Compañía</Text>
                </View>
                {soon.map((item, i) => {
                  const name = item.kind === 'Vehículo'
                    ? `${item.brand ?? ''} ${item.model ?? ''} (${item.patent ?? ''})`.trim()
                    : `${item.name ?? ''} ${item.code ? `[${item.code}]` : ''}`.trim();
                  const days = daysUntil(item.dateStr);
                  return (
                    <View key={item.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                      <Text style={[BASE.tableCell, { flex: 1.5, fontFamily: 'Helvetica-Bold' }]}>{name}</Text>
                      <Text style={[BASE.tableCellMuted, { flex: 0.8 }]}>{item.kind}</Text>
                      <Text style={[BASE.tableCell, { flex: 1.2 }]}>{fmtDate(item.dateStr)}</Text>
                      <Text style={[BASE.tableCell, { flex: 0.8, color: days <= 7 ? COLORS.orange : COLORS.yellow, fontFamily: 'Helvetica-Bold' }]}>
                        {days} día{days !== 1 ? 's' : ''}
                      </Text>
                      <Text style={[BASE.tableCellMuted, { flex: 1.5 }]}>{item.company?.name ?? '—'}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {total === 0 && (
            <View style={{
              marginTop: 24, padding: 20, borderWidth: 1,
              borderColor: COLORS.green, borderRadius: 8,
              backgroundColor: COLORS.greenBg, alignItems: 'center',
            }}>
              <Text style={{ color: COLORS.green, fontFamily: 'Helvetica-Bold', fontSize: 12 }}>
                ✓ Sin alertas activas
              </Text>
              <Text style={{ color: COLORS.green, fontSize: 9, marginTop: 4 }}>
                Todo el inventario está al día al momento de generar este reporte.
              </Text>
            </View>
          )}
        </View>

        <PdfFooterAuto />
      </Page>
    </Document>
  );
}
