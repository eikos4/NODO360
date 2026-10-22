import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import {
  CommandSnapshot,
  formatDuration,
  NOVELTY_CATEGORIES,
  pointKindMeta,
  statusLabel,
} from '../nodo-command';
import { BASE, COLORS, PdfFooterAuto, fmtDate } from './PdfBase';

const S = StyleSheet.create({
  coverMeta: {
    backgroundColor: COLORS.darkMid,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 12,
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
  eventTime: { width: 72, fontSize: 8, color: COLORS.slateLight, fontFamily: 'Helvetica-Bold' },
  eventKind: { width: 58, fontSize: 7, color: COLORS.red, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  eventBody: { flex: 1 },
  eventLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.dark },
  eventNote: { fontSize: 8, color: COLORS.slate, marginTop: 1 },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  note: {
    backgroundColor: COLORS.redLight,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
});

const LOG_KIND: Record<string, string> = {
  SYSTEM: 'Sistema',
  COMMAND: 'Mando',
  RESOURCE: 'Recurso',
  SECTOR: 'Sector',
  NOVELTY: 'Novedad',
  REQUEST: 'Solicitud',
  ALERT: 'Alerta',
  CLOSE: 'Cierre',
};

const RESPONDER: Record<string, string> = {
  GOING: 'En camino',
  ON_SCENE: 'En el lugar',
  LOCATION_MARKED: 'Ubicación marcada',
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

function whenShort(d?: string | Date | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function companyTitle(company?: { name: string; number: number } | null) {
  if (!company) return 'Compañía';
  return `${company.number}ª ${company.name}`.trim();
}

function noveltyLabel(id?: string | null) {
  return NOVELTY_CATEGORIES.find((item) => item.id === id)?.label ?? id ?? 'Novedad';
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((v) => v?.trim()).filter((v): v is string => Boolean(v))));
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <View style={BASE.header} fixed>
        <View style={BASE.headerLeft}>
          <View style={BASE.logoBox}>
            <Text style={BASE.logoText}>N</Text>
          </View>
          <View>
            <Text style={BASE.brandName}>NODO360</Text>
            <Text style={BASE.brandSub}>PUESTO DE COMANDO</Text>
          </View>
        </View>
        <View style={BASE.headerRight}>
          <Text style={BASE.reportTitle}>{title}</Text>
          {subtitle ? <Text style={BASE.reportDate}>{subtitle}</Text> : null}
          <Text style={BASE.reportDate}>Generado: {when(new Date())}</Text>
        </View>
      </View>
      <View style={BASE.redBand} fixed />
    </>
  );
}

const PAGE = [BASE.page, { paddingTop: 78 }];

function Empty({ text }: { text: string }) {
  return <Text style={BASE.tableCellMuted}>{text}</Text>;
}

export function CommandPostReport({ snapshot }: { snapshot: CommandSnapshot }) {
  const post = snapshot.post;
  const incident = snapshot.incident;
  const cia = companyTitle(incident.company);
  const start = post?.openedAt ?? incident.dispatchedAt;
  const end = post?.closedAt ?? null;
  const duration = formatDuration(Math.max(0, new Date(end ?? Date.now()).getTime() - new Date(start).getTime()));
  const resources = snapshot.resources;
  const nodo = resources.filter((r) => r.origin === 'NODO360');
  const external = resources.filter((r) => r.origin === 'EXTERNAL');
  const sectors = snapshot.sectors;
  const requests = snapshot.requests;
  const points = snapshot.points;
  const responders = snapshot.responders;
  const logs = [...snapshot.logs].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  const novelties = logs.filter((l) => l.kind === 'NOVELTY');
  const companies = unique([
    cia,
    ...resources.map((r) => r.companyName),
    ...responders.map((r) => r.companyName),
  ]);
  const institutions = unique(external.map((r) => r.institution));
  const staffing = resources.reduce((sum, r) => sum + (r.staffing || 0), 0);
  const commandChanges = Math.max(0, (post?.commandHistory.length ?? 0) - 1);
  const coords =
    incident.latitude != null && incident.longitude != null
      ? `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}`
      : '—';
  const pcCoords =
    post?.latitude != null && post?.longitude != null
      ? `${post.latitude.toFixed(5)}, ${post.longitude.toFixed(5)}`
      : '—';
  const code = incident.code;

  return (
    <Document title={`Informe Puesto de Comando ${code} — NODO360`} author="NODO360">
      <Page size="A4" style={PAGE}>
        <Header title="Informe de Puesto de Comando" subtitle={`${cia} · ${code}`} />
        <View style={BASE.body}>
          <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: COLORS.red, marginBottom: 2 }}>
            {code}
          </Text>
          <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 10 }}>{incident.type}</Text>

          <View style={S.coverMeta}>
            <View style={S.coverMetaItem}>
              <Text style={S.coverMetaLabel}>Estado PC</Text>
              <Text style={S.coverMetaValue}>{post?.status === 'CLOSED' ? 'Finalizado' : 'Activo'}</Text>
            </View>
            <View style={S.coverMetaItem}>
              <Text style={S.coverMetaLabel}>Duración</Text>
              <Text style={S.coverMetaValue}>{duration}</Text>
            </View>
            <View style={S.coverMetaItem}>
              <Text style={S.coverMetaLabel}>Mando</Text>
              <Text style={S.coverMetaValue}>
                {post?.command ? `${post.command.rank ? `${post.command.rank} ` : ''}${post.command.name}` : 'Sin mando'}
              </Text>
            </View>
            <View style={S.coverMetaItem}>
              <Text style={S.coverMetaLabel}>Fecha</Text>
              <Text style={S.coverMetaValue}>{fmtDate(start)}</Text>
            </View>
          </View>

          <View style={BASE.kpiRow}>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{snapshot.counters.companies}</Text>
              <Text style={BASE.kpiLabel}>Compañías</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{snapshot.counters.units}</Text>
              <Text style={BASE.kpiLabel}>Unidades</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{snapshot.counters.firefighters}</Text>
              <Text style={BASE.kpiLabel}>Bomberos</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{sectors.length}</Text>
              <Text style={BASE.kpiLabel}>Sectores</Text>
            </View>
          </View>
          <View style={BASE.kpiRow}>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{snapshot.counters.external}</Text>
              <Text style={BASE.kpiLabel}>Externos</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{commandChanges}</Text>
              <Text style={BASE.kpiLabel}>Cambios de mando</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{requests.length}</Text>
              <Text style={BASE.kpiLabel}>Solicitudes</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{logs.length}</Text>
              <Text style={BASE.kpiLabel}>Eventos bitácora</Text>
            </View>
          </View>

          <Text style={BASE.sectionTitle}>Datos de la emergencia</Text>
          <View style={S.block}>
            <Text style={S.blockTitle}>Dirección</Text>
            <Text style={S.blockText}>{incident.address || '—'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[S.block, { flex: 1 }]}>
              <Text style={S.blockTitle}>Coordenadas emergencia</Text>
              <Text style={S.blockText}>{coords}</Text>
            </View>
            <View style={[S.block, { flex: 1 }]}>
              <Text style={S.blockTitle}>Coordenadas PC</Text>
              <Text style={S.blockText}>{pcCoords}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[S.block, { flex: 1 }]}>
              <Text style={S.blockTitle}>Compañía de origen</Text>
              <Text style={S.blockText}>{cia}</Text>
            </View>
            <View style={[S.block, { flex: 1 }]}>
              <Text style={S.blockTitle}>Dotación registrada</Text>
              <Text style={S.blockText}>{staffing} personas en recursos · {responders.length} en app</Text>
            </View>
          </View>
          {post?.initialNote ? (
            <View style={S.block}>
              <Text style={S.blockTitle}>Observación inicial</Text>
              <Text style={S.blockText}>{post.initialNote}</Text>
            </View>
          ) : null}
          {post?.closeNote ? (
            <View style={S.note}>
              <Text style={[S.blockTitle, { color: COLORS.red }]}>Observación final</Text>
              <Text style={S.blockText}>{post.closeNote}</Text>
            </View>
          ) : null}

          <Text style={BASE.sectionTitle}>Inicio y término</Text>
          <View style={S.timeRow}>
            <View style={S.timeBox}>
              <Text style={S.blockTitle}>Despacho</Text>
              <Text style={S.blockText}>{when(incident.dispatchedAt)}</Text>
            </View>
            <View style={S.timeBox}>
              <Text style={S.blockTitle}>PC constituido</Text>
              <Text style={S.blockText}>{when(post?.openedAt)}</Text>
              <Text style={[S.blockText, { fontSize: 7, color: COLORS.slateLight, marginTop: 2 }]}>
                {post ? `${post.openedByRank ? `${post.openedByRank} ` : ''}${post.openedByName}` : '—'}
              </Text>
            </View>
            <View style={S.timeBox}>
              <Text style={S.blockTitle}>Cierre</Text>
              <Text style={S.blockText}>{when(post?.closedAt)}</Text>
            </View>
          </View>

          <View wrap={false}>
            <Text style={BASE.sectionTitle}>Mandos participantes</Text>
            {!post?.commandHistory.length ? (
              <Empty text="Sin historial de mando." />
            ) : (
              <View style={BASE.table}>
                <View style={BASE.tableHead}>
                  <Text style={[BASE.tableHeadCell, { flex: 1.6 }]}>Oficial</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Cargo</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1.3 }]}>Asume</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1.3 }]}>Libera</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Transfiere</Text>
                </View>
                {[...post.commandHistory]
                  .sort((a, b) => new Date(a.assumedAt).getTime() - new Date(b.assumedAt).getTime())
                  .map((row, i) => (
                    <View key={row.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                      <Text style={[BASE.tableCell, { flex: 1.6, fontFamily: 'Helvetica-Bold' }]}>{row.name}</Text>
                      <Text style={[BASE.tableCell, { flex: 1 }]}>{row.rank || '—'}</Text>
                      <Text style={[BASE.tableCellMuted, { flex: 1.3 }]}>{whenShort(row.assumedAt)}</Text>
                      <Text style={[BASE.tableCellMuted, { flex: 1.3 }]}>{whenShort(row.releasedAt)}</Text>
                      <Text style={[BASE.tableCellMuted, { flex: 1.2 }]}>{row.transferredByName || '—'}</Text>
                    </View>
                  ))}
              </View>
            )}
          </View>

          <View wrap={false}>
            <Text style={BASE.sectionTitle}>Compañías</Text>
            {companies.length === 0 ? (
              <Empty text="Sin compañías registradas." />
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {companies.map((name) => (
                  <View key={name} style={S.chip}>
                    <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        <PdfFooterAuto />
      </Page>

      <Page size="A4" style={PAGE}>
        <Header title="Recursos y dotaciones" subtitle={code} />
        <View style={BASE.body}>
          <Text style={BASE.sectionTitle}>Recursos NODO360</Text>
          {nodo.length === 0 ? (
            <Empty text="Sin unidades NODO360 en el puesto." />
          ) : (
            <View style={BASE.table}>
              <View style={BASE.tableHead}>
                <Text style={[BASE.tableHeadCell, { flex: 1.3 }]}>Unidad</Text>
                <Text style={[BASE.tableHeadCell, { flex: 0.9 }]}>Tipo</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Compañía</Text>
                <Text style={[BASE.tableHeadCell, { flex: 0.6 }]}>Dot.</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Estado</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Misión</Text>
              </View>
              {nodo.map((row, i) => (
                <View key={row.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt} wrap={false}>
                  <Text style={[BASE.tableCell, { flex: 1.3, fontFamily: 'Helvetica-Bold' }]}>{row.label}</Text>
                  <Text style={[BASE.tableCell, { flex: 0.9 }]}>{row.type}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.2 }]}>{row.companyName || '—'}</Text>
                  <Text style={[BASE.tableCell, { flex: 0.6 }]}>{row.staffing || 0}</Text>
                  <Text style={[BASE.tableCell, { flex: 1 }]}>{statusLabel(row.status)}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.2 }]}>{row.mission || '—'}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={BASE.sectionTitle}>Organismos y recursos externos</Text>
          {external.length === 0 ? (
            <Empty text="Sin recursos externos." />
          ) : (
            <View style={BASE.table}>
              <View style={BASE.tableHead}>
                <Text style={[BASE.tableHeadCell, { flex: 1.3 }]}>Recurso</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.3 }]}>Institución</Text>
                <Text style={[BASE.tableHeadCell, { flex: 0.9 }]}>Tipo</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Responsable</Text>
                <Text style={[BASE.tableHeadCell, { flex: 0.5 }]}>Dot.</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Estado</Text>
              </View>
              {external.map((row, i) => (
                <View key={row.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt} wrap={false}>
                  <Text style={[BASE.tableCell, { flex: 1.3, fontFamily: 'Helvetica-Bold' }]}>{row.label}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.3 }]}>{row.institution || row.companyName || '—'}</Text>
                  <Text style={[BASE.tableCell, { flex: 0.9 }]}>{row.type}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{row.responsibleName || '—'}</Text>
                  <Text style={[BASE.tableCell, { flex: 0.5 }]}>{row.staffing || 0}</Text>
                  <Text style={[BASE.tableCell, { flex: 1 }]}>{statusLabel(row.status)}</Text>
                </View>
              ))}
            </View>
          )}
          {institutions.length > 0 ? (
            <View style={[S.block, { marginTop: 8 }]}>
              <Text style={S.blockTitle}>Instituciones de apoyo</Text>
              <Text style={S.blockText}>{institutions.join(' · ')}</Text>
            </View>
          ) : null}

          <Text style={BASE.sectionTitle}>Horas de llegada y retiro</Text>
          {resources.length === 0 ? (
            <Empty text="Sin recursos para registrar arribo o retiro." />
          ) : (
            <View style={BASE.table}>
              <View style={BASE.tableHead}>
                <Text style={[BASE.tableHeadCell, { flex: 1.4 }]}>Recurso</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.1 }]}>Incorporado</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.1 }]}>Arribo</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.1 }]}>Retiro</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Estado final</Text>
              </View>
              {resources.map((row, i) => (
                <View key={row.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt} wrap={false}>
                  <Text style={[BASE.tableCell, { flex: 1.4, fontFamily: 'Helvetica-Bold' }]}>{row.label}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.1 }]}>{whenShort(row.createdAt)}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.1 }]}>{whenShort(row.arrivedAt)}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.1 }]}>{whenShort(row.withdrawnAt)}</Text>
                  <Text style={[BASE.tableCell, { flex: 1 }]}>{statusLabel(row.status)}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={BASE.sectionTitle}>Dotación / personal en terreno</Text>
          {responders.length === 0 ? (
            <Empty text="Sin respuestas de app registradas en el momento del informe." />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {responders.map((person) => (
                <View key={person.userId} style={S.chip}>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{person.name}</Text>
                  <Text style={{ fontSize: 7, color: COLORS.slateLight }}>
                    {[person.companyName, RESPONDER[person.status ?? ''] ?? person.status].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <PdfFooterAuto />
      </Page>

      <Page size="A4" style={PAGE}>
        <Header title="Sectores, misiones y solicitudes" subtitle={code} />
        <View style={BASE.body}>
          <Text style={BASE.sectionTitle}>Sectores operacionales</Text>
          {sectors.length === 0 ? (
            <Empty text="Sin sectores creados." />
          ) : (
            <View style={BASE.table}>
              <View style={BASE.tableHead}>
                <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Sector</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.4 }]}>Misión</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Responsable</Text>
                <Text style={[BASE.tableHeadCell, { flex: 0.9 }]}>Estado</Text>
                <Text style={[BASE.tableHeadCell, { flex: 0.9 }]}>Zona mapa</Text>
              </View>
              {sectors.map((row, i) => (
                <View key={row.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt} wrap={false}>
                  <Text style={[BASE.tableCell, { flex: 1, fontFamily: 'Helvetica-Bold' }]}>{row.name}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.4 }]}>{row.mission || '—'}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.2 }]}>{row.responsibleName || '—'}</Text>
                  <Text style={[BASE.tableCell, { flex: 0.9 }]}>{statusLabel(row.status)}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 0.9 }]}>
                    {row.polygon?.length ? `${row.polygon.length} puntos` : 'Sin polígono'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text style={BASE.sectionTitle}>Misiones por recurso</Text>
          {resources.filter((r) => r.mission).length === 0 ? (
            <Empty text="Sin misiones asignadas a recursos." />
          ) : (
            <View style={BASE.table}>
              <View style={BASE.tableHead}>
                <Text style={[BASE.tableHeadCell, { flex: 1.4 }]}>Recurso</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Sector</Text>
                <Text style={[BASE.tableHeadCell, { flex: 2 }]}>Misión / tarea</Text>
              </View>
              {resources
                .filter((r) => r.mission)
                .map((row, i) => {
                  const sector = sectors.find((s) => s.id === row.sectorId);
                  return (
                    <View key={row.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt} wrap={false}>
                      <Text style={[BASE.tableCell, { flex: 1.4, fontFamily: 'Helvetica-Bold' }]}>{row.label}</Text>
                      <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{sector?.name || 'Sin sector'}</Text>
                      <Text style={[BASE.tableCell, { flex: 2 }]}>{row.mission}</Text>
                    </View>
                  );
                })}
            </View>
          )}

          <Text style={BASE.sectionTitle}>Puntos operacionales</Text>
          {points.length === 0 ? (
            <Empty text="Sin puntos marcados en el mapa." />
          ) : (
            <View style={BASE.table}>
              <View style={BASE.tableHead}>
                <Text style={[BASE.tableHeadCell, { flex: 1.6 }]}>Punto</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Tipo</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.6 }]}>Coordenadas</Text>
              </View>
              {points.map((row, i) => (
                <View key={row.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt} wrap={false}>
                  <Text style={[BASE.tableCell, { flex: 1.6, fontFamily: 'Helvetica-Bold' }]}>{row.name}</Text>
                  <Text style={[BASE.tableCell, { flex: 1.2 }]}>{pointKindMeta(row.kind).label}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.6 }]}>
                    {row.latitude.toFixed(5)}, {row.longitude.toFixed(5)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text style={BASE.sectionTitle}>Solicitudes realizadas</Text>
          {requests.length === 0 ? (
            <Empty text="Sin solicitudes." />
          ) : (
            <View style={BASE.table}>
              <View style={BASE.tableHead}>
                <Text style={[BASE.tableHeadCell, { flex: 1.4 }]}>Tipo</Text>
                <Text style={[BASE.tableHeadCell, { flex: 0.5 }]}>Cant.</Text>
                <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Prioridad</Text>
                <Text style={[BASE.tableHeadCell, { flex: 0.9 }]}>Estado</Text>
                <Text style={[BASE.tableHeadCell, { flex: 1.6 }]}>Motivo</Text>
              </View>
              {requests.map((row, i) => (
                <View key={row.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt} wrap={false}>
                  <Text style={[BASE.tableCell, { flex: 1.4, fontFamily: 'Helvetica-Bold' }]}>{row.type}</Text>
                  <Text style={[BASE.tableCell, { flex: 0.5 }]}>{row.quantity}</Text>
                  <Text style={[BASE.tableCell, { flex: 0.8 }]}>{statusLabel(row.priority)}</Text>
                  <Text style={[BASE.tableCell, { flex: 0.9 }]}>{statusLabel(row.status)}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.6 }]}>{row.reason || '—'}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={BASE.sectionTitle}>Novedades</Text>
          {novelties.length === 0 ? (
            <Empty text="Sin novedades registradas." />
          ) : (
            novelties.map((row) => (
              <View key={row.id} style={S.eventRow} wrap={false}>
                <Text style={S.eventTime}>{whenShort(row.occurredAt)}</Text>
                <View style={S.eventBody}>
                  <Text style={S.eventLabel}>{row.action}</Text>
                  <Text style={S.eventNote}>
                    {noveltyLabel(row.category)} · {row.actorName}
                    {row.detail ? ` · ${row.detail}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
        <PdfFooterAuto />
      </Page>

      <Page size="A4" style={PAGE}>
        <Header title="Bitácora y línea de tiempo" subtitle={code} />
        <View style={BASE.body}>
          <Text style={BASE.sectionTitle}>Línea de tiempo operacional</Text>
          {logs.length === 0 ? (
            <Empty text="Sin eventos en bitácora." />
          ) : (
            logs.map((row) => (
              <View key={row.id} style={S.eventRow} wrap={false}>
                <Text style={S.eventTime}>{whenShort(row.occurredAt)}</Text>
                <Text style={S.eventKind}>{LOG_KIND[row.kind] ?? row.kind}</Text>
                <View style={S.eventBody}>
                  <Text style={S.eventLabel}>{row.action}</Text>
                  <Text style={S.eventNote}>
                    {row.actorName}
                    {row.detail ? ` · ${row.detail}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
        <PdfFooterAuto />
      </Page>
    </Document>
  );
}
