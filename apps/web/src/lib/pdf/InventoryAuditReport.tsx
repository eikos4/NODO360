import { Document, Page, Text, View } from '@react-pdf/renderer';
import { BASE, COLORS, PdfHeader, PdfFooterAuto, fmtDate } from './PdfBase';

const STATUS_LABEL: Record<string, string> = {
  BORRADOR: 'Borrador',
  EN_PROCESO: 'En proceso',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
};

const RESULT_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  CONFORME: 'Conforme',
  NO_ENCONTRADO: 'No encontrado',
  DIFERENCIA: 'Diferencia',
  OBSERVACION: 'Observación',
};

const EQUIP_STATUS: Record<string, string> = {
  OPERATIVO: 'Operativo',
  EN_REPARACION: 'En reparación',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
};

interface Props {
  audit: any;
}

export function InventoryAuditReport({ audit }: Props) {
  const summary = audit.summary ?? {};
  const items = audit.items ?? [];
  const diffs = items.filter((i: any) =>
    ['NO_ENCONTRADO', 'DIFERENCIA', 'OBSERVACION'].includes(i.result),
  );

  return (
    <Document title={`Auditoría ${audit.code} — NODO360`} author="NODO360">
      <Page size="A4" style={BASE.page}>
        <PdfHeader
          title="Acta de Auditoría de Inventario Físico"
          subtitle={`${audit.company?.number}ª ${audit.company?.name}`}
        />
        <View style={BASE.body}>
          <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>{audit.code}</Text>
          <Text style={{ fontSize: 10, color: COLORS.slateLight }}>{audit.title}</Text>
          <Text style={{ fontSize: 9, color: COLORS.muted, marginTop: 4 }}>
            Estado: {STATUS_LABEL[audit.status] ?? audit.status}
            {audit.auditor ? ` · Auditor: ${audit.auditor.firstName} ${audit.auditor.lastName}` : ''}
          </Text>
          {audit.startedAt && (
            <Text style={{ fontSize: 9, color: COLORS.muted }}>Inicio: {fmtDate(audit.startedAt)}</Text>
          )}
          {audit.completedAt && (
            <Text style={{ fontSize: 9, color: COLORS.muted }}>Cierre: {fmtDate(audit.completedAt)}</Text>
          )}

        <View style={[BASE.kpiRow, { marginTop: 12 }]}>
          {[
            { label: 'Total ítems', value: summary.total ?? 0 },
            { label: 'Conformes', value: summary.conforme ?? 0 },
            { label: 'No encontrados', value: summary.noEncontrado ?? 0 },
            { label: 'Diferencias', value: summary.diferencia ?? 0 },
            { label: 'Observaciones', value: summary.observacion ?? 0 },
          ].map((k) => (
            <View key={k.label} style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{k.value}</Text>
              <Text style={BASE.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {audit.closingNotes ? (
          <View style={{ marginBottom: 12, padding: 8, backgroundColor: COLORS.bg, borderRadius: 6 }}>
            <Text style={[BASE.sectionTitle, { marginTop: 0 }]}>Notas de cierre</Text>
            <Text style={{ fontSize: 9, color: COLORS.dark }}>{audit.closingNotes}</Text>
          </View>
        ) : null}

        <Text style={[BASE.sectionTitle, { marginBottom: 8 }]}>
          Detalle de verificación ({items.length} ítems)
        </Text>

        <View style={BASE.table}>
          <View style={BASE.tableHead}>
            <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Tipo</Text>
            <Text style={[BASE.tableHeadCell, { flex: 2 }]}>Ítem</Text>
            <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Esperado</Text>
            <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Físico</Text>
            <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Resultado</Text>
          </View>
          {items.map((item: any, i: number) => (
            <View key={item.id} style={[BASE.tableRow, i % 2 === 1 ? { backgroundColor: '#0f172a' } : {}]}>
              <Text style={[BASE.tableCell, { flex: 0.8 }]}>
                {item.kind === 'VEHICULO' ? 'Vehículo' : 'Equipo'}
              </Text>
              <Text style={[BASE.tableCell, { flex: 2 }]}>{item.expectedLabel}</Text>
              <Text style={[BASE.tableCell, { flex: 1 }]}>
                {item.expectedStatus ? EQUIP_STATUS[item.expectedStatus] : '—'}
                {item.kind === 'EQUIPO' ? ` ×${item.expectedQty}` : ''}
              </Text>
              <Text style={[BASE.tableCell, { flex: 1 }]}>
                {item.found == null
                  ? '—'
                  : item.found
                    ? `${item.physicalStatus ? EQUIP_STATUS[item.physicalStatus] : '—'}${item.kind === 'EQUIPO' ? ` ×${item.physicalQty ?? 0}` : ''}`
                    : 'No hallado'}
              </Text>
              <Text
                style={[
                  BASE.tableCell,
                  { flex: 1 },
                  item.result === 'CONFORME' ? { color: COLORS.green } : {},
                  ['NO_ENCONTRADO', 'DIFERENCIA'].includes(item.result) ? { color: COLORS.red } : {},
                ]}
              >
                {RESULT_LABEL[item.result] ?? item.result}
              </Text>
            </View>
          ))}
        </View>

        {diffs.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={[BASE.sectionTitle, { color: COLORS.red, marginBottom: 6 }]}>
              Hallazgos ({diffs.length})
            </Text>
            {diffs.map((item: any) => (
              <View key={item.id} style={{ marginBottom: 6 }}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>
                  {item.expectedLabel} — {RESULT_LABEL[item.result]}
                </Text>
                {item.observations ? (
                  <Text style={{ fontSize: 8, color: COLORS.slateLight }}>{item.observations}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        </View>

        <PdfFooterAuto />
      </Page>
    </Document>
  );
}
