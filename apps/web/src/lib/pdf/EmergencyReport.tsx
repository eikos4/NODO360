import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { BASE, COLORS, PdfFooterAuto, fmtDate } from './PdfBase';

const S = StyleSheet.create({
  coverMeta: {
    backgroundColor: COLORS.darkMid,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 16,
  },
  coverMetaItem: { flex: 1 },
  coverMetaLabel: { color: COLORS.muted, fontSize: 7, letterSpacing: 1, textTransform: 'uppercase' },
  coverMetaValue: { color: COLORS.white, fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  block: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  blockTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slateLight,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  blockText: { fontSize: 9, color: COLORS.dark, lineHeight: 1.4 },
  timeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  timeBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 8,
  },
  eventRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  eventTime: { width: 70, fontSize: 8, color: COLORS.slateLight, fontFamily: 'Helvetica-Bold' },
  eventBody: { flex: 1 },
  eventLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.dark },
  eventNote: { fontSize: 8, color: COLORS.slate, marginTop: 1 },
  personChip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
});

const STATUS: Record<string, string> = {
  ACTIVE: 'Despachada',
  ARRIVED: 'En el lugar',
  CLOSED: 'Cerrada',
  CANCELLED: 'Cancelada',
};

const RESPONSE: Record<string, string> = {
  GOING: 'En camino',
  NOT_GOING: 'No asiste',
  NOT_AVAILABLE: 'No disponible',
  ON_SCENE: 'En el lugar',
  LOCATION_MARKED: 'Ubicación marcada',
};

const SOURCE: Record<string, string> = {
  BOTONERA: 'Botonera / sala de radio',
  MANUAL: 'Registro manual',
};

function when(d?: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function duration(a?: string | Date | null, b?: string | Date | null) {
  if (!a || !b) return '—';
  const mins = Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

function nameOf(u?: { firstName?: string; lastName?: string } | null) {
  if (!u) return '—';
  return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—';
}

export function EmergencyReport({ incident }: { incident: any }) {
  const cia = incident.company
    ? `${incident.company.number}ª ${incident.company.name}`
    : 'Compañía';
  const cuerpo = incident.company?.cuerpo?.name ?? 'Cuerpo de Bomberos';
  const end = incident.closedAt ?? incident.arrivedAt;
  const timeline = incident.timelineEvents ?? [];
  const vehicles = incident.vehicles ?? [];
  const people = incident.participants ?? [];
  const responses = incident.emergencyResponses ?? [];
  const checklist = incident.planChecklist ?? [];
  const bitacora = incident.bitacoraEntry;
  const coords = incident.confirmedLatitude != null && incident.confirmedLongitude != null
    ? `${incident.confirmedLatitude}, ${incident.confirmedLongitude}`
    : incident.latitude != null && incident.longitude != null
      ? `${incident.latitude}, ${incident.longitude}`
      : '—';

  return (
    <Document title={`Informe ${incident.code} — NODO360`} author="NODO360">
      <Page size="A4" style={BASE.page}>
        <View style={BASE.header}>
          <View style={BASE.headerLeft}>
            <View style={BASE.logoBox}>
              <Text style={BASE.logoText}>N</Text>
            </View>
            <View>
              <Text style={BASE.brandName}>NODO360</Text>
              <Text style={BASE.brandSub}>{cuerpo.toUpperCase()}</Text>
            </View>
          </View>
          <View style={BASE.headerRight}>
            <Text style={BASE.reportTitle}>Informe de emergencia</Text>
            <Text style={BASE.reportDate}>{cia}</Text>
            <Text style={BASE.reportDate}>Generado: {when(new Date())}</Text>
          </View>
        </View>
        <View style={BASE.redBand} />

        <View style={BASE.body}>
          <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: COLORS.red, marginBottom: 2 }}>
            {incident.code}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 10 }}>
            {incident.type}
          </Text>

          <View style={S.coverMeta}>
            <View style={S.coverMetaItem}>
              <Text style={S.coverMetaLabel}>Estado</Text>
              <Text style={S.coverMetaValue}>{STATUS[incident.status] ?? incident.status}</Text>
            </View>
            <View style={S.coverMetaItem}>
              <Text style={S.coverMetaLabel}>Duración</Text>
              <Text style={S.coverMetaValue}>{duration(incident.dispatchedAt, end)}</Text>
            </View>
            <View style={S.coverMetaItem}>
              <Text style={S.coverMetaLabel}>Origen</Text>
              <Text style={S.coverMetaValue}>{SOURCE[incident.dispatchSource] ?? incident.dispatchSource ?? '—'}</Text>
            </View>
            <View style={S.coverMetaItem}>
              <Text style={S.coverMetaLabel}>Fecha</Text>
              <Text style={S.coverMetaValue}>{fmtDate(incident.dispatchedAt)}</Text>
            </View>
          </View>

          <View style={BASE.kpiRow}>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{vehicles.length}</Text>
              <Text style={BASE.kpiLabel}>Unidades</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{people.length}</Text>
              <Text style={BASE.kpiLabel}>Personal asignado</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{responses.length}</Text>
              <Text style={BASE.kpiLabel}>Respuestas app</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{timeline.length}</Text>
              <Text style={BASE.kpiLabel}>Registros bitácora</Text>
            </View>
          </View>

          <Text style={BASE.sectionTitle}>Identificación y lugar</Text>
          <View style={S.block}>
            <Text style={S.blockTitle}>Dirección</Text>
            <Text style={S.blockText}>{incident.address || '—'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[S.block, { flex: 1 }]}>
              <Text style={S.blockTitle}>Coordenadas</Text>
              <Text style={S.blockText}>{coords}</Text>
            </View>
            <View style={[S.block, { flex: 1 }]}>
              <Text style={S.blockTitle}>Compañía</Text>
              <Text style={S.blockText}>{cia}{incident.company?.city ? ` · ${incident.company.city}` : ''}</Text>
            </View>
          </View>
          {incident.description ? (
            <View style={S.block}>
              <Text style={S.blockTitle}>Descripción / mensaje radial</Text>
              <Text style={S.blockText}>{incident.description}</Text>
            </View>
          ) : null}
          {incident.dispatchNotes ? (
            <View style={S.block}>
              <Text style={S.blockTitle}>Notas de despacho</Text>
              <Text style={S.blockText}>{incident.dispatchNotes}</Text>
            </View>
          ) : null}
          {(incident.locationPinNote || incident.locationPinAt) ? (
            <View style={S.block}>
              <Text style={S.blockTitle}>Pin de ubicación en terreno</Text>
              <Text style={S.blockText}>
                {incident.locationPinNote || 'Ubicación confirmada desde el lugar'}
                {incident.locationPinAt ? ` · ${when(incident.locationPinAt)}` : ''}
              </Text>
            </View>
          ) : null}

          <Text style={BASE.sectionTitle}>Tiempos operativos</Text>
          <View style={S.timeRow}>
            <View style={S.timeBox}>
              <Text style={S.blockTitle}>Despacho</Text>
              <Text style={S.blockText}>{when(incident.dispatchedAt)}</Text>
            </View>
            <View style={S.timeBox}>
              <Text style={S.blockTitle}>En el lugar</Text>
              <Text style={S.blockText}>{when(incident.arrivedAt)}</Text>
            </View>
            <View style={S.timeBox}>
              <Text style={S.blockTitle}>Cierre</Text>
              <Text style={S.blockText}>{when(incident.closedAt)}</Text>
            </View>
          </View>

          <Text style={BASE.sectionTitle}>Unidades despachadas</Text>
          {vehicles.length === 0 ? (
            <Text style={BASE.tableCellMuted}>Sin unidades registradas.</Text>
          ) : (
            <View style={BASE.table}>
              <View style={BASE.tableHead}>
                <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Patente</Text>
                <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Tipo</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.6 }]}>Marca / modelo</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Compañía</Text>
              </View>
              {vehicles.map((row: any, i: number) => (
                <View key={row.id ?? i} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                  <Text style={[BASE.tableCell, { flex: 1, fontFamily: 'Helvetica-Bold' }]}>{row.vehicle?.patent ?? '—'}</Text>
                  <Text style={[BASE.tableCell, { flex: 0.8 }]}>{row.vehicle?.type ?? '—'}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.6 }]}>
                    {[row.vehicle?.brand, row.vehicle?.model].filter(Boolean).join(' ') || '—'}
                  </Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.2 }]}>
                    {row.vehicle?.company
                      ? `${row.vehicle.company.number}ª ${row.vehicle.company.name}`
                      : '—'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text style={BASE.sectionTitle}>Personal asignado</Text>
          {people.length === 0 ? (
            <Text style={BASE.tableCellMuted}>Sin personal asignado en el despacho.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {people.map((p: any) => (
                <View key={p.id} style={S.personChip}>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{nameOf(p.user)}</Text>
                  <Text style={{ fontSize: 7, color: COLORS.slateLight }}>
                    {p.user?.operativeNumber != null ? `N° ${p.user.operativeNumber}` : p.user?.role ?? ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text style={BASE.sectionTitle}>Respuesta desde app</Text>
          {responses.length === 0 ? (
            <Text style={BASE.tableCellMuted}>Sin respuestas registradas en la app.</Text>
          ) : (
            <View style={BASE.table}>
              <View style={BASE.tableHead}>
                <Text style={[BASE.tableHeadCell, { flex: 1.8 }]}>Bombero</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.1 }]}>Estado</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.3 }]}>Marcó</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.3 }]}>En el lugar</Text>
              </View>
              {responses.map((r: any, i: number) => (
                <View key={r.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt} wrap={false}>
                  <Text style={[BASE.tableCell, { flex: 1.8 }]}>
                    {nameOf(r.user)}{r.user?.operativeNumber != null ? ` · ${r.user.operativeNumber}` : ''}
                    {r.note ? `\n${r.note}` : ''}
                  </Text>
                  <Text style={[BASE.tableCell, { flex: 1.1 }]}>{RESPONSE[r.status] ?? r.status ?? '—'}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.3 }]}>{when(r.respondedAt)}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.3 }]}>{when(r.onSceneAt)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <PdfFooterAuto />
      </Page>

      <Page size="A4" style={BASE.page}>
        <View style={BASE.header}>
          <View style={BASE.headerLeft}>
            <View style={BASE.logoBox}><Text style={BASE.logoText}>N</Text></View>
            <View>
              <Text style={BASE.brandName}>NODO360</Text>
              <Text style={BASE.brandSub}>{incident.code}</Text>
            </View>
          </View>
          <View style={BASE.headerRight}>
            <Text style={BASE.reportTitle}>Bitácora y cierre</Text>
            <Text style={BASE.reportDate}>{cia}</Text>
          </View>
        </View>
        <View style={BASE.redBand} />

        <View style={BASE.body}>
          <Text style={BASE.sectionTitle}>Bitácora operacional</Text>
          {timeline.length === 0 ? (
            <Text style={BASE.tableCellMuted}>Sin registros en la línea de tiempo.</Text>
          ) : (
            timeline.map((ev: any) => (
              <View key={ev.id} style={S.eventRow} wrap={false}>
                <Text style={S.eventTime}>{when(ev.occurredAt)}</Text>
                <View style={S.eventBody}>
                  <Text style={S.eventLabel}>{ev.label || ev.kind}</Text>
                  {ev.note ? <Text style={S.eventNote}>{ev.note}</Text> : null}
                  {ev.author ? (
                    <Text style={S.eventNote}>Registró: {nameOf(ev.author)}</Text>
                  ) : null}
                </View>
              </View>
            ))
          )}

          {incident.emergencyPlan ? (
            <>
              <Text style={BASE.sectionTitle}>Plan de acción</Text>
              <View style={S.block}>
                <Text style={S.blockText}>
                  {incident.emergencyPlan.title}
                  {incident.checklistProgress
                    ? ` · ${incident.checklistProgress.checked}/${incident.checklistProgress.total} tareas`
                    : ''}
                </Text>
              </View>
              {checklist.map((item: any) => (
                <Text key={item.id} style={{ fontSize: 8, marginBottom: 3, color: COLORS.dark }}>
                  {item.checked ? '[x] ' : '[ ] '}{item.text}{item.required ? ' *' : ''}
                </Text>
              ))}
            </>
          ) : null}

          <Text style={BASE.sectionTitle}>Informe de cierre</Text>
          {incident.report ? (
            <View style={S.block}>
              <Text style={S.blockTitle}>Reporte</Text>
              <Text style={S.blockText}>{incident.report}</Text>
            </View>
          ) : null}
          {bitacora ? (
            <>
              <View style={S.block}>
                <Text style={S.blockTitle}>{bitacora.title || 'Bitácora de cierre'}</Text>
                <Text style={S.blockText}>{bitacora.summary || '—'}</Text>
              </View>
              {bitacora.actionsTaken ? (
                <View style={S.block}>
                  <Text style={S.blockTitle}>Acciones</Text>
                  <Text style={S.blockText}>{bitacora.actionsTaken}</Text>
                </View>
              ) : null}
              {bitacora.outcome ? (
                <View style={S.block}>
                  <Text style={S.blockTitle}>Resultado</Text>
                  <Text style={S.blockText}>{bitacora.outcome}</Text>
                </View>
              ) : null}
              {bitacora.observations ? (
                <View style={S.block}>
                  <Text style={S.blockTitle}>Observaciones</Text>
                  <Text style={S.blockText}>{bitacora.observations}</Text>
                </View>
              ) : null}
              {bitacora.personnelNotes ? (
                <View style={S.block}>
                  <Text style={S.blockTitle}>Personal</Text>
                  <Text style={S.blockText}>{bitacora.personnelNotes}</Text>
                </View>
              ) : null}
              {bitacora.vehicleNotes ? (
                <View style={S.block}>
                  <Text style={S.blockTitle}>Unidades</Text>
                  <Text style={S.blockText}>{bitacora.vehicleNotes}</Text>
                </View>
              ) : null}
              {bitacora.author ? (
                <Text style={{ fontSize: 8, color: COLORS.slateLight }}>
                  Cierre registrado por {nameOf(bitacora.author)} · {when(bitacora.occurredAt)}
                </Text>
              ) : null}
            </>
          ) : !incident.report ? (
            <Text style={BASE.tableCellMuted}>Aún no hay informe de cierre escrito.</Text>
          ) : null}
        </View>
        <PdfFooterAuto />
      </Page>
    </Document>
  );
}
