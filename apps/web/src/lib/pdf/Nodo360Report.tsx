import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { BASE, COLORS, PdfFooterAuto, fmtDate, fmtDateTime } from './PdfBase';

/* ── Estilos adicionales para este reporte ── */
const S = StyleSheet.create({
  /* Cover header oscuro con banda roja */
  coverHeader: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 0,
  },
  coverBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  coverLogoBox: {
    width: 36, height: 36,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLogoTxt: { color: COLORS.white, fontSize: 18, fontFamily: 'Helvetica-Bold' },
  coverBrandName: { color: COLORS.white, fontSize: 16, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  coverBrandSub: { color: COLORS.muted, fontSize: 7, letterSpacing: 2, marginTop: 2 },

  coverCompanyBadge: {
    backgroundColor: COLORS.red,
    width: 56, height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  coverCompanyNum: { color: COLORS.white, fontSize: 24, fontFamily: 'Helvetica-Bold' },
  coverCompanyNumSup: { color: COLORS.white, fontSize: 11 },
  coverTitle: { color: COLORS.white, fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  coverSubTitle: { color: COLORS.muted, fontSize: 10, marginBottom: 20 },

  coverMeta: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 28,
  },
  coverMetaItem: { flex: 1 },
  coverMetaLabel: { color: COLORS.muted, fontSize: 7, letterSpacing: 1, textTransform: 'uppercase' },
  coverMetaValue: { color: COLORS.white, fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 3 },

  redBand: { backgroundColor: COLORS.red, height: 4 },

  /* Página interna header */
  pageHeader: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: 32,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageHeaderBrand: { color: COLORS.white, fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  pageHeaderCia: { color: COLORS.muted, fontSize: 8, marginTop: 1 },
  pageHeaderRight: { alignItems: 'flex-end' },
  pageHeaderSection: { color: COLORS.white, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  pageHeaderDate: { color: COLORS.muted, fontSize: 7, marginTop: 1 },

  /* KPI cards 4-col */
  kpiGrid4: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  kpiCard: {
    flex: 1, backgroundColor: COLORS.bg,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 6, padding: 10,
  },
  kpiCardAccent: {
    flex: 1, backgroundColor: COLORS.dark,
    borderWidth: 1, borderColor: '#334155',
    borderRadius: 6, padding: 10,
  },
  kpiCardRed: {
    flex: 1, backgroundColor: '#fef2f2',
    borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 6, padding: 10,
  },
  kpiCardGreen: {
    flex: 1, backgroundColor: COLORS.greenBg,
    borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 6, padding: 10,
  },
  kpiCardOrange: {
    flex: 1, backgroundColor: COLORS.orangeBg,
    borderWidth: 1, borderColor: '#fed7aa',
    borderRadius: 6, padding: 10,
  },
  kpiVal: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: COLORS.dark },
  kpiValWhite: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: COLORS.white },
  kpiValRed: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: COLORS.red },
  kpiValGreen: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: COLORS.green },
  kpiValOrange: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: COLORS.orange },
  kpiLbl: { fontSize: 7, color: COLORS.slateLight, marginTop: 3 },
  kpiLblWhite: { fontSize: 7, color: COLORS.muted, marginTop: 3 },
  kpiSub: { fontSize: 7, color: COLORS.muted, marginTop: 2 },

  /* Section */
  sectionTitle: {
    fontSize: 8, fontFamily: 'Helvetica-Bold',
    color: COLORS.slateLight, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 8, marginTop: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 4,
  },
  sectionTitleRed: {
    fontSize: 8, fontFamily: 'Helvetica-Bold',
    color: COLORS.red, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 8, marginTop: 16,
    borderBottomWidth: 1, borderBottomColor: '#fecaca', paddingBottom: 4,
  },

  /* Progress bar */
  barTrack: { height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', flex: 1 },
  barFill: { height: 5, borderRadius: 3 },

  /* Alertas banner */
  alertBanner: {
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 6, padding: 10, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  alertBannerOk: {
    backgroundColor: COLORS.greenBg, borderWidth: 1, borderColor: '#bbf7d0',
    borderRadius: 6, padding: 10, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  alertBannerDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.red,
  },
  alertBannerDotOk: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  alertBannerTitle: { color: COLORS.red, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  alertBannerTitleOk: { color: COLORS.green, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  alertBannerSub: { color: '#ef4444', fontSize: 8, marginTop: 2 },

  /* Separador de página */
  divider: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginVertical: 10 },
});

/* ── helpers ── */
const money = (n: number) => `$${Number(n ?? 0).toLocaleString('es-CL')}`;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador', COMANDANTE: 'Comandante',
  CAPITAN: 'Capitán / Oficial', ENCARGADO_MATERIAL: 'Enc. Material Mayor',
  SECRETARIO: 'Secretario/a', TESORERO: 'Tesorero/a',
  BOMBERO: 'Bombero Operativo', AUDITOR: 'Auditor / Inspector',
};

const STATUS_LABEL: Record<string, string> = {
  OPERATIVO: 'Operativo', EN_REPARACION: 'En reparación', FUERA_DE_SERVICIO: 'Fuera servicio',
};

/* ── Sub-componentes ── */
function PageHeader({ section, cia }: { section: string; cia: string }) {
  return (
    <>
      <View style={S.pageHeader} fixed>
        <View style={S.pageHeaderLeft}>
          <View style={{ width: 20, height: 20, backgroundColor: COLORS.red, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: COLORS.white, fontSize: 10, fontFamily: 'Helvetica-Bold' }}>N</Text>
          </View>
          <View>
            <Text style={S.pageHeaderBrand}>NODO360</Text>
            <Text style={S.pageHeaderCia}>{cia}</Text>
          </View>
        </View>
        <View style={S.pageHeaderRight}>
          <Text style={S.pageHeaderSection}>{section}</Text>
          <Text style={S.pageHeaderDate}>{fmtDateTime()}</Text>
        </View>
      </View>
      <View style={S.redBand} />
    </>
  );
}

function KpiRow4({ items }: { items: { label: string; value: string | number; sub?: string; style?: 'default' | 'dark' | 'red' | 'green' | 'orange' }[] }) {
  const cardStyle = (s?: string) =>
    s === 'dark' ? S.kpiCardAccent : s === 'red' ? S.kpiCardRed : s === 'green' ? S.kpiCardGreen : s === 'orange' ? S.kpiCardOrange : S.kpiCard;
  const valStyle = (s?: string) =>
    s === 'dark' ? S.kpiValWhite : s === 'red' ? S.kpiValRed : s === 'green' ? S.kpiValGreen : s === 'orange' ? S.kpiValOrange : S.kpiVal;
  const lblStyle = (s?: string) => s === 'dark' ? S.kpiLblWhite : S.kpiLbl;

  return (
    <View style={S.kpiGrid4}>
      {items.map((item, i) => (
        <View key={i} style={cardStyle(item.style)}>
          <Text style={valStyle(item.style)}>{item.value}</Text>
          <Text style={lblStyle(item.style)}>{item.label}</Text>
          {item.sub && <Text style={S.kpiSub}>{item.sub}</Text>}
        </View>
      ))}
    </View>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(Math.round((value / total) * 100), 100) : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <Text style={{ fontSize: 8, color: COLORS.slateLight, width: 80 }}>{label}</Text>
      <View style={S.barTrack}>
        <View style={[S.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={{ fontSize: 8, color: COLORS.dark, fontFamily: 'Helvetica-Bold', width: 22, textAlign: 'right' }}>{value}</Text>
      <Text style={{ fontSize: 7, color: COLORS.muted, width: 26 }}>{pct}%</Text>
    </View>
  );
}

/* ══════════════════════════════════════════
   REPORTE PRINCIPAL
══════════════════════════════════════════ */
interface Props {
  company: any;
  users: any;
  vehicles: any;
  equip: any;
  incidents: any;
  maint: any;
  finance: any;
  docs: any;
  purchases: any;
  alerts: any;
}

export function Nodo360Report({ company, users, vehicles, equip, incidents, maint, finance, docs, purchases, alerts }: Props) {
  const ciaLabel = `${company?.number}ª Compañía — ${company?.name}`;
  const alertTotal = alerts?.total ?? 0;

  return (
    <Document title={`NODO360 — ${ciaLabel}`} author="NODO360" subject="Reporte Integral de Compañía">

      {/* ══════════ PÁGINA 1 — PORTADA + RESUMEN EJECUTIVO ══════════ */}
      <Page size="A4" style={BASE.page}>
        {/* Cover header */}
        <View style={S.coverHeader}>
          <View style={S.coverBrand}>
            <View style={S.coverLogoBox}>
              <Text style={S.coverLogoTxt}>N</Text>
            </View>
            <View>
              <Text style={S.coverBrandName}>NODO360</Text>
              <Text style={S.coverBrandSub}>SISTEMA DE GESTIÓN OPERATIVA — BOMBEROS CHILE</Text>
            </View>
          </View>

          <View style={S.coverCompanyBadge}>
            <Text style={S.coverCompanyNum}>{company?.number}</Text>
            <Text style={S.coverCompanyNumSup}>ª CIA</Text>
          </View>
          <Text style={S.coverTitle}>{company?.name}</Text>
          <Text style={S.coverSubTitle}>{company?.city} · {company?.region}</Text>

          <View style={S.coverMeta}>
            {company?.address && (
              <View style={S.coverMetaItem}>
                <Text style={S.coverMetaLabel}>Dirección</Text>
                <Text style={S.coverMetaValue}>{company.address}</Text>
              </View>
            )}
            {company?.phone && (
              <View style={S.coverMetaItem}>
                <Text style={S.coverMetaLabel}>Teléfono</Text>
                <Text style={S.coverMetaValue}>{company.phone}</Text>
              </View>
            )}
            {company?.email && (
              <View style={S.coverMetaItem}>
                <Text style={S.coverMetaLabel}>Email</Text>
                <Text style={S.coverMetaValue}>{company.email}</Text>
              </View>
            )}
            <View style={S.coverMetaItem}>
              <Text style={S.coverMetaLabel}>Generado</Text>
              <Text style={S.coverMetaValue}>{fmtDateTime()}</Text>
            </View>
          </View>
        </View>
        <View style={S.redBand} />

        {/* Resumen ejecutivo */}
        <View style={BASE.body}>
          {/* Alerta banner */}
          {alertTotal > 0 ? (
            <View style={S.alertBanner}>
              <View style={S.alertBannerDot} />
              <View>
                <Text style={S.alertBannerTitle}>{alertTotal} alerta{alertTotal !== 1 ? 's' : ''} activa{alertTotal !== 1 ? 's' : ''} — Requieren atención inmediata</Text>
                <Text style={S.alertBannerSub}>
                  {alerts?.expiredVehicles > 0 && `${alerts.expiredVehicles} mantención vencida  `}
                  {alerts?.soonVehicles > 0 && `${alerts.soonVehicles} mantención próxima  `}
                  {alerts?.expiredEquipment > 0 && `${alerts.expiredEquipment} EPP vencido  `}
                  {alerts?.soonEquipment > 0 && `${alerts.soonEquipment} EPP próximo a vencer  `}
                  {alerts?.expiredDocuments > 0 && `${alerts.expiredDocuments} documentos vencidos`}
                </Text>
              </View>
            </View>
          ) : (
            <View style={S.alertBannerOk}>
              <View style={S.alertBannerDotOk} />
              <Text style={S.alertBannerTitleOk}>Sin alertas activas — Todo el inventario al día</Text>
            </View>
          )}

          {/* KPIs resumen */}
          <Text style={S.sectionTitle}>Resumen Ejecutivo</Text>
          <KpiRow4 items={[
            { label: 'Personal total', value: users?.stats?.total ?? 0, sub: `${users?.stats?.active ?? 0} activos`, style: 'dark' },
            { label: 'Vehículos', value: vehicles?.stats?.total ?? 0, sub: `${vehicles?.stats?.operativo ?? 0} operativos`, style: 'default' },
            { label: 'Equipamiento', value: equip?.stats?.total ?? 0, sub: `${equip?.stats?.expired ?? 0} vencidos`, style: equip?.stats?.expired > 0 ? 'red' : 'default' },
            { label: 'Emergencias año', value: incidents?.stats?.thisYear ?? 0, sub: `${incidents?.stats?.open ?? 0} en curso`, style: 'default' },
          ]} />
          <KpiRow4 items={[
            { label: 'Mantenciones año', value: maint?.stats?.thisYear ?? 0, sub: money(maint?.stats?.yearCost ?? 0), style: 'default' },
            { label: 'Ejecución financiera', value: `${finance?.stats?.execRate ?? 0}%`, sub: money(finance?.stats?.totalExecuted ?? 0), style: finance?.stats?.execRate > 90 ? 'red' : finance?.stats?.execRate > 70 ? 'orange' : 'green' },
            { label: 'Compras pendientes', value: purchases?.stats?.pending ?? 0, sub: `de ${purchases?.stats?.total ?? 0} OC`, style: purchases?.stats?.pending > 0 ? 'orange' : 'default' },
            { label: 'Alertas activas', value: alertTotal, sub: 'Vencidos + próximos', style: alertTotal > 0 ? 'red' : 'green' },
          ]} />

          {/* Tabla índice de contenidos */}
          <Text style={S.sectionTitle}>Contenido del Reporte</Text>
          {[
            ['Pág. 2', 'Personal y Distribución por Roles'],
            ['Pág. 3', 'Flota Vehicular — Estado y Mantenciones'],
            ['Pág. 4', 'Equipamiento EPP — Inventario y Vencimientos'],
            ['Pág. 5', 'Emergencias — Historial e Indicadores'],
            ['Pág. 6', 'Finanzas — Presupuesto y Ejecución'],
            ['Pág. 7', 'Compras, Documentos y Alertas Críticas'],
          ].map(([page, title], i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' }}>
              <Text style={{ fontSize: 8, color: COLORS.red, fontFamily: 'Helvetica-Bold', width: 36 }}>{page}</Text>
              <Text style={{ fontSize: 9, color: COLORS.dark }}>{title}</Text>
            </View>
          ))}
        </View>

        <PdfFooterAuto />
      </Page>

      {/* ══════════ PÁGINA 2 — PERSONAL ══════════ */}
      <Page size="A4" style={BASE.page}>
        <PageHeader section="Personal y Recursos Humanos" cia={ciaLabel} />
        <View style={BASE.body}>
          <KpiRow4 items={[
            { label: 'Personal total', value: users?.stats?.total ?? 0, style: 'dark' },
            { label: 'Activos', value: users?.stats?.active ?? 0, style: 'green' },
            { label: 'Inactivos', value: (users?.stats?.total ?? 0) - (users?.stats?.active ?? 0), style: 'default' },
            { label: 'Roles distintos', value: Object.keys(users?.stats?.roleCounts ?? {}).length, style: 'default' },
          ]} />

          <Text style={S.sectionTitle}>Distribución por Rol</Text>
          {Object.entries(users?.stats?.roleCounts ?? {}).map(([role, count]) => (
            <BarRow key={role} label={ROLE_LABELS[role] ?? role} value={count as number} total={users?.stats?.total ?? 0} color="#3b82f6" />
          ))}

          <Text style={S.sectionTitle}>Nómina de Personal</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 2.2 }]}>Nombre completo</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.4 }]}>RUT</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.8 }]}>Cargo / Rol</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Email</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Estado</Text>
            </View>
            {(users?.list ?? []).map((u: any, i: number) => (
              <View key={u.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                <Text style={[BASE.tableCell, { flex: 2.2, fontFamily: 'Helvetica-Bold' }]}>{u.firstName} {u.lastName}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 1.4 }]}>{u.rut ?? '—'}</Text>
                <Text style={[BASE.tableCell, { flex: 1.8 }]}>{ROLE_LABELS[u.role] ?? u.role}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 1, fontSize: 7 }]}>{u.email ?? '—'}</Text>
                <View style={{ flex: 0.8 }}>
                  <Text style={u.isActive ? BASE.badgeGreen : BASE.badgeGray}>
                    {u.isActive ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <PdfFooterAuto />
      </Page>

      {/* ══════════ PÁGINA 3 — FLOTA VEHICULAR ══════════ */}
      <Page size="A4" style={BASE.page}>
        <PageHeader section="Flota Vehicular" cia={ciaLabel} />
        <View style={BASE.body}>
          <KpiRow4 items={[
            { label: 'Total vehículos', value: vehicles?.stats?.total ?? 0, style: 'dark' },
            { label: 'Operativos', value: vehicles?.stats?.operativo ?? 0, style: 'green' },
            { label: 'En reparación', value: vehicles?.stats?.enReparacion ?? 0, style: vehicles?.stats?.enReparacion > 0 ? 'orange' : 'default' },
            { label: 'Fuera de servicio', value: vehicles?.stats?.fueraDeServicio ?? 0, style: vehicles?.stats?.fueraDeServicio > 0 ? 'red' : 'default' },
          ]} />

          {((vehicles?.stats?.expiredMaint ?? 0) + (vehicles?.stats?.soonMaint ?? 0)) > 0 && (
            <KpiRow4 items={[
              { label: 'Mantenciones vencidas', value: vehicles?.stats?.expiredMaint ?? 0, style: 'red' },
              { label: 'Mantención próxima (30d)', value: vehicles?.stats?.soonMaint ?? 0, style: 'orange' },
              { label: 'Costo total mantenciones', value: money(maint?.stats?.totalCost ?? 0), style: 'default' },
              { label: 'Costo año actual', value: money(maint?.stats?.yearCost ?? 0), style: 'default' },
            ]} />
          )}

          <Text style={S.sectionTitle}>Estado por Tipo de Vehículo</Text>
          {Object.entries(vehicles?.stats?.byType ?? {}).map(([type, count]) => (
            <BarRow key={type} label={type} value={count as number} total={vehicles?.stats?.total ?? 0} color="#f97316" />
          ))}

          <Text style={S.sectionTitle}>Detalle de Vehículos</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 0.9 }]}>Patente</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.4 }]}>Marca / Modelo</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Tipo</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.45 }]}>Año</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.1 }]}>Estado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Km</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Últ. mantención</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Próx. mantención</Text>
            </View>
            {(vehicles?.list ?? []).map((v: any, i: number) => {
              const expired = v.nextMaintenanceAt && new Date(v.nextMaintenanceAt) < new Date();
              return (
                <View key={v.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                  <Text style={[BASE.tableCell, { flex: 0.9, fontFamily: 'Helvetica-Bold' }]}>{v.patent}</Text>
                  <Text style={[BASE.tableCell, { flex: 1.4 }]}>{v.brand} {v.model}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{v.type}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 0.45 }]}>{v.year}</Text>
                  <View style={{ flex: 1.1 }}>
                    <Text style={v.status === 'OPERATIVO' ? BASE.badgeGreen : v.status === 'EN_REPARACION' ? BASE.badgeYellow : BASE.badgeRed}>
                      {STATUS_LABEL[v.status] ?? v.status}
                    </Text>
                  </View>
                  <Text style={[BASE.tableCellMuted, { flex: 0.8 }]}>{v.kilometers?.toLocaleString() ?? '—'}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.2 }]}>{fmtDate(v.lastMaintenanceAt)}</Text>
                  <View style={{ flex: 1.2 }}>
                    <Text style={expired ? BASE.badgeRed : BASE.tableCell}>{fmtDate(v.nextMaintenanceAt)}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Mantenciones recientes */}
          {(maint?.recent ?? []).length > 0 && (
            <>
              <Text style={S.sectionTitle}>Últimas Mantenciones</Text>
              <View style={BASE.table}>
                <View style={BASE.tableHead}>
                  <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Vehículo</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Tipo</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 2 }]}>Descripción</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Taller</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 0.9 }]}>Costo</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Fecha</Text>
                </View>
                {(maint?.recent ?? []).map((m: any, i: number) => (
                  <View key={m.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                    <Text style={[BASE.tableCell, { flex: 1.2, fontFamily: 'Helvetica-Bold' }]}>
                      {m.vehicle?.patent ?? '—'}
                    </Text>
                    <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{m.type}</Text>
                    <Text style={[BASE.tableCellMuted, { flex: 2, fontSize: 7 }]}>{m.description}</Text>
                    <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{m.workshopName ?? '—'}</Text>
                    <Text style={[BASE.tableCell, { flex: 0.9, color: COLORS.green }]}>{m.cost ? money(m.cost) : '—'}</Text>
                    <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{fmtDate(m.date)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
        <PdfFooterAuto />
      </Page>

      {/* ══════════ PÁGINA 4 — EQUIPAMIENTO EPP ══════════ */}
      <Page size="A4" style={BASE.page}>
        <PageHeader section="Equipamiento y EPP" cia={ciaLabel} />
        <View style={BASE.body}>
          <KpiRow4 items={[
            { label: 'Total ítems', value: equip?.stats?.total ?? 0, style: 'dark' },
            { label: 'Operativos', value: equip?.stats?.operativo ?? 0, style: 'green' },
            { label: 'EPP vencido', value: equip?.stats?.expired ?? 0, style: equip?.stats?.expired > 0 ? 'red' : 'default' },
            { label: 'Vence en 30 días', value: equip?.stats?.expiringSoon ?? 0, style: equip?.stats?.expiringSoon > 0 ? 'orange' : 'default' },
          ]} />

          <Text style={S.sectionTitle}>Distribución por Categoría</Text>
          {Object.entries(equip?.stats?.byCategory ?? {}).map(([cat, qty]) => (
            <BarRow key={cat} label={cat} value={qty as number} total={equip?.stats?.total ?? 0} color="#8b5cf6" />
          ))}

          <Text style={S.sectionTitle}>Inventario de Equipamiento</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 1.8 }]}>Nombre</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Código</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Categoría</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.45 }]}>Cant.</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Estado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Serial</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.1 }]}>F. Compra</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.1 }]}>Vencimiento</Text>
            </View>
            {(equip?.list ?? []).map((e: any, i: number) => {
              const expired  = e.expiresAt && new Date(e.expiresAt) < new Date();
              const expiring = !expired && e.expiresAt && (new Date(e.expiresAt).getTime() - Date.now()) / 86400000 <= 30;
              return (
                <View key={e.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                  <Text style={[BASE.tableCell, { flex: 1.8, fontFamily: 'Helvetica-Bold' }]}>{e.name}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 0.8 }]}>{e.code ?? '—'}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{e.category}</Text>
                  <Text style={[BASE.tableCell, { flex: 0.45 }]}>{e.quantity ?? 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={e.status === 'OPERATIVO' ? BASE.badgeGreen : e.status === 'EN_REPARACION' ? BASE.badgeYellow : BASE.badgeRed}>
                      {STATUS_LABEL[e.status] ?? e.status}
                    </Text>
                  </View>
                  <Text style={[BASE.tableCellMuted, { flex: 1, fontSize: 7 }]}>{e.serial ?? '—'}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.1 }]}>{fmtDate(e.purchaseDate)}</Text>
                  <View style={{ flex: 1.1 }}>
                    <Text style={expired ? BASE.badgeRed : expiring ? BASE.badgeOrange : BASE.tableCell}>
                      {fmtDate(e.expiresAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        <PdfFooterAuto />
      </Page>

      {/* ══════════ PÁGINA 5 — EMERGENCIAS ══════════ */}
      <Page size="A4" style={BASE.page}>
        <PageHeader section="Emergencias e Intervenciones" cia={ciaLabel} />
        <View style={BASE.body}>
          <KpiRow4 items={[
            { label: 'Total históricas', value: incidents?.stats?.total ?? 0, style: 'dark' },
            { label: 'Año actual', value: incidents?.stats?.thisYear ?? 0, style: 'default' },
            { label: 'Este mes', value: incidents?.stats?.thisMonth ?? 0, style: 'default' },
            { label: 'En curso', value: incidents?.stats?.open ?? 0, style: incidents?.stats?.open > 0 ? 'orange' : 'green' },
          ]} />

          {/* Gráfico mensual */}
          {(incidents?.stats?.byMonth ?? []).some((m: any) => m.count > 0) && (
            <>
              <Text style={S.sectionTitle}>Emergencias por Mes — {new Date().getFullYear()}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 60, marginBottom: 16 }}>
                {(incidents?.stats?.byMonth ?? []).map((m: any, i: number) => {
                  const maxVal = Math.max(...(incidents?.stats?.byMonth ?? []).map((x: any) => x.count), 1);
                  const barH = Math.max((m.count / maxVal) * 50, m.count > 0 ? 3 : 0);
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 60 }}>
                      <Text style={{ fontSize: 7, color: COLORS.dark, fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                        {m.count > 0 ? m.count : ''}
                      </Text>
                      <View style={{ height: barH, width: '80%', backgroundColor: COLORS.red, borderRadius: 2 }} />
                      <Text style={{ fontSize: 6, color: COLORS.muted, marginTop: 3 }}>{m.month.slice(0, 3)}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <Text style={S.sectionTitle}>Distribución por Tipo</Text>
          {Object.entries(incidents?.stats?.byType ?? {})
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .map(([type, count]) => (
              <BarRow key={type} label={type} value={count as number} total={incidents?.stats?.total ?? 0} color={COLORS.red} />
            ))
          }

          <Text style={S.sectionTitle}>Registro de Emergencias</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Código</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Tipo</Text>
              <Text style={[BASE.tableHeadCell, { flex: 2 }]}>Dirección</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.1 }]}>Despacho</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.9 }]}>Llegada</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Estado</Text>
            </View>
            {(incidents?.recent ?? []).map((inc: any, i: number) => (
              <View key={inc.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                <Text style={[BASE.tableCell, { flex: 0.8, fontFamily: 'Helvetica-Bold', color: COLORS.red }]}>{inc.code ?? `#${String(i + 1).padStart(3, '0')}`}</Text>
                <Text style={[BASE.tableCell, { flex: 1.5 }]}>{inc.type}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 2, fontSize: 7 }]}>{inc.address ?? '—'}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 1.1 }]}>{fmtDate(inc.dispatchedAt)}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 0.9 }]}>{fmtDate(inc.arrivedAt)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={inc.closedAt ? BASE.badgeGreen : BASE.badgeYellow}>
                    {inc.closedAt ? 'Cerrado' : 'En proceso'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <PdfFooterAuto />
      </Page>

      {/* ══════════ PÁGINA 6 — FINANZAS ══════════ */}
      <Page size="A4" style={BASE.page}>
        <PageHeader section="Finanzas y Presupuesto" cia={ciaLabel} />
        <View style={BASE.body}>
          <KpiRow4 items={[
            { label: 'Presupuesto planificado', value: money(finance?.stats?.totalPlanned ?? 0), style: 'dark' },
            { label: 'Ejecutado', value: money(finance?.stats?.totalExecuted ?? 0), style: 'red' },
            { label: 'Disponible', value: money(finance?.stats?.remaining ?? 0), style: 'green' },
            { label: 'Tasa ejecución', value: `${finance?.stats?.execRate ?? 0}%`, style: (finance?.stats?.execRate ?? 0) > 90 ? 'red' : (finance?.stats?.execRate ?? 0) > 70 ? 'orange' : 'green' },
          ]} />

          {/* Barra ejecución global */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 8, color: COLORS.slateLight }}>Progreso de ejecución presupuestaria</Text>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: (finance?.stats?.execRate ?? 0) > 90 ? COLORS.red : COLORS.dark }}>
                {finance?.stats?.execRate ?? 0}%
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{
                height: 8, borderRadius: 4,
                width: `${Math.min(finance?.stats?.execRate ?? 0, 100)}%`,
                backgroundColor: (finance?.stats?.execRate ?? 0) > 90 ? COLORS.red : (finance?.stats?.execRate ?? 0) > 70 ? COLORS.orange : COLORS.green,
              }} />
            </View>
          </View>

          <Text style={S.sectionTitle}>Ejecución por Categoría</Text>
          {(finance?.stats?.byCategory ?? []).map((b: any) => {
            const rate = b.planned > 0 ? Math.min(Math.round((b.executed / b.planned) * 100), 100) : 0;
            return (
              <View key={b.category} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ fontSize: 8, color: COLORS.dark, fontFamily: 'Helvetica-Bold' }}>{b.category}</Text>
                  <Text style={{ fontSize: 8, color: COLORS.slateLight }}>
                    {money(b.executed)} / {money(b.planned)} — {rate}%
                  </Text>
                </View>
                <View style={{ height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{
                    height: 6, borderRadius: 3,
                    width: `${rate}%`,
                    backgroundColor: rate > 90 ? COLORS.red : rate > 70 ? COLORS.orange : COLORS.green,
                  }} />
                </View>
              </View>
            );
          })}

          <Text style={S.sectionTitle}>Detalle de Presupuestos — {new Date().getFullYear()}</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 2 }]}>Descripción</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Categoría</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Planificado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Ejecutado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Disponible</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.7 }]}>%</Text>
            </View>
            {(finance?.budgets ?? []).map((b: any, i: number) => {
              const rem  = Number(b.planned) - Number(b.executed);
              const rate = b.planned > 0 ? Math.round((b.executed / b.planned) * 100) : 0;
              return (
                <View key={b.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                  <Text style={[BASE.tableCell, { flex: 2 }]}>{b.description}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{b.category}</Text>
                  <Text style={[BASE.tableCell, { flex: 1.2 }]}>{money(Number(b.planned))}</Text>
                  <Text style={[BASE.tableCell, { flex: 1.2, color: COLORS.red }]}>{money(Number(b.executed))}</Text>
                  <Text style={[BASE.tableCell, { flex: 1, color: rem >= 0 ? COLORS.green : COLORS.red }]}>{money(rem)}</Text>
                  <Text style={[BASE.tableCell, { flex: 0.7, fontFamily: 'Helvetica-Bold', color: rate > 90 ? COLORS.red : rate > 70 ? COLORS.orange : COLORS.green }]}>{rate}%</Text>
                </View>
              );
            })}
          </View>
        </View>
        <PdfFooterAuto />
      </Page>

      {/* ══════════ PÁGINA 7 — COMPRAS + DOCUMENTOS + ALERTAS ══════════ */}
      <Page size="A4" style={BASE.page}>
        <PageHeader section="Compras, Documentos y Alertas" cia={ciaLabel} />
        <View style={BASE.body}>

          {/* Compras */}
          <KpiRow4 items={[
            { label: 'Total OC', value: purchases?.stats?.total ?? 0, style: 'dark' },
            { label: 'Pendientes', value: purchases?.stats?.pending ?? 0, style: purchases?.stats?.pending > 0 ? 'orange' : 'default' },
            { label: 'Aprobadas', value: purchases?.stats?.approved ?? 0, style: 'green' },
            { label: 'Monto total', value: money(purchases?.stats?.totalAmount ?? 0), style: 'default' },
          ]} />

          <Text style={S.sectionTitle}>Órdenes de Compra</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>N°</Text>
              <Text style={[BASE.tableHeadCell, { flex: 2 }]}>Descripción</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Proveedor</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Estado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Monto</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Fecha</Text>
            </View>
            {(purchases?.recent ?? []).map((p: any, i: number) => (
              <View key={p.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                <Text style={[BASE.tableCell, { flex: 0.8, fontFamily: 'Helvetica-Bold', color: COLORS.red }]}>{p.number}</Text>
                <Text style={[BASE.tableCell, { flex: 2 }]}>{p.description}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{p.supplier ?? '—'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={
                    p.status === 'APROBADA'  ? BASE.badgeGreen :
                    p.status === 'RECIBIDA'  ? BASE.badgeGreen :
                    p.status === 'PENDIENTE' ? BASE.badgeYellow :
                    BASE.badgeRed
                  }>{p.status}</Text>
                </View>
                <Text style={[BASE.tableCell, { flex: 1 }]}>{money(p.totalAmount)}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{fmtDate(p.requestedAt)}</Text>
              </View>
            ))}
          </View>

          {/* Documentos */}
          {(docs?.recent ?? []).length > 0 && (
            <>
              <Text style={S.sectionTitle}>Documentos Recientes</Text>
              <View style={BASE.table}>
                <View style={BASE.tableHead}>
                  <Text style={[BASE.tableHeadCell, { flex: 2.5 }]}>Título</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Categoría</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Fecha</Text>
                  <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Vencimiento</Text>
                </View>
                {(docs?.recent ?? []).map((d: any, i: number) => {
                  const expired = d.expiresAt && new Date(d.expiresAt) < new Date();
                  return (
                    <View key={d.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                      <Text style={[BASE.tableCell, { flex: 2.5 }]}>{d.title}</Text>
                      <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{d.category}</Text>
                      <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{fmtDate(d.createdAt)}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={expired ? BASE.badgeRed : BASE.badgeGray}>{fmtDate(d.expiresAt)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Alertas resumen final */}
          <Text style={alertTotal > 0 ? S.sectionTitleRed : S.sectionTitle}>
            {alertTotal > 0 ? `⚠ Resumen de Alertas Activas (${alertTotal})` : 'Estado de Alertas'}
          </Text>
          {alertTotal === 0 ? (
            <View style={S.alertBannerOk}>
              <View style={S.alertBannerDotOk} />
              <Text style={S.alertBannerTitleOk}>Sin alertas activas — Toda la compañía al día al momento de generar este reporte.</Text>
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              {[
                { label: 'Mantenciones de vehículos VENCIDAS', value: alerts?.expiredVehicles ?? 0, style: BASE.badgeRed, show: (alerts?.expiredVehicles ?? 0) > 0 },
                { label: 'Mantenciones próximas a vencer (≤ 30 días)', value: alerts?.soonVehicles ?? 0, style: BASE.badgeOrange, show: (alerts?.soonVehicles ?? 0) > 0 },
                { label: 'Equipamiento EPP VENCIDO', value: alerts?.expiredEquipment ?? 0, style: BASE.badgeRed, show: (alerts?.expiredEquipment ?? 0) > 0 },
                { label: 'Equipamiento EPP próximo a vencer (≤ 30 días)', value: alerts?.soonEquipment ?? 0, style: BASE.badgeOrange, show: (alerts?.soonEquipment ?? 0) > 0 },
                { label: 'Documentos vencidos', value: alerts?.expiredDocuments ?? 0, style: BASE.badgeYellow, show: (alerts?.expiredDocuments ?? 0) > 0 },
              ].filter(a => a.show).map((a, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: COLORS.bg, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ fontSize: 9, color: COLORS.dark }}>{a.label}</Text>
                  <Text style={a.style}>{a.value} ítem{a.value !== 1 ? 's' : ''}</Text>
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
