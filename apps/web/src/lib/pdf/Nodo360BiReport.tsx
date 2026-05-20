import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { BASE, COLORS, PdfFooterAuto, fmtDate, fmtDateTime } from './PdfBase';

const S = StyleSheet.create({
  coverHeader: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 20,
  },
  coverBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  coverLogoBox: {
    width: 36, height: 36, backgroundColor: COLORS.red, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  coverLogoTxt: { color: COLORS.white, fontSize: 18, fontFamily: 'Helvetica-Bold' },
  coverBrandName: { color: COLORS.white, fontSize: 16, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  coverBrandSub: { color: COLORS.muted, fontSize: 7, letterSpacing: 2, marginTop: 2 },
  coverCompanyBadge: {
    backgroundColor: COLORS.red, width: 56, height: 56, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  coverCompanyNum: { color: COLORS.white, fontSize: 24, fontFamily: 'Helvetica-Bold' },
  coverCompanyNumSup: { color: COLORS.white, fontSize: 11 },
  coverTitle: { color: COLORS.white, fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  coverSubTitle: { color: COLORS.muted, fontSize: 10, marginBottom: 16 },
  redBand: { backgroundColor: COLORS.red, height: 4 },
  pageHeader: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: 32, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pageHeaderBrand: { color: COLORS.white, fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  pageHeaderCia: { color: COLORS.muted, fontSize: 8, marginTop: 1 },
  pageHeaderSection: { color: COLORS.white, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  pageHeaderDate: { color: COLORS.muted, fontSize: 7, marginTop: 1 },
  kpiGrid4: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  kpiCard: {
    flex: 1, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 6, padding: 8,
  },
  kpiCardDark: {
    flex: 1, backgroundColor: COLORS.dark, borderWidth: 1, borderColor: '#334155',
    borderRadius: 6, padding: 8,
  },
  kpiVal: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.dark },
  kpiValWhite: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.white },
  kpiValRed: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.red },
  kpiValGreen: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.green },
  kpiValOrange: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.orange },
  kpiLbl: { fontSize: 6.5, color: COLORS.slateLight, marginTop: 2 },
  kpiLblWhite: { fontSize: 6.5, color: COLORS.muted, marginTop: 2 },
  sectionTitle: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.slateLight,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 4,
  },
  barTrack: { height: 5, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', flex: 1 },
  barFill: { height: 5, borderRadius: 3 },
  monthBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 50, marginBottom: 12 },
});

const money = (n: number) => `$${Number(n ?? 0).toLocaleString('es-CL')}`;

function PageHeader({ section, cia, year }: { section: string; cia: string; year: number }) {
  return (
    <>
      <View style={S.pageHeader} fixed>
        <View>
          <Text style={S.pageHeaderBrand}>NODO360 · INFORME BI</Text>
          <Text style={S.pageHeaderCia}>{cia} · {year}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={S.pageHeaderSection}>{section}</Text>
          <Text style={S.pageHeaderDate}>{fmtDateTime()}</Text>
        </View>
      </View>
      <View style={S.redBand} />
    </>
  );
}

function KpiRow({ items }: { items: { label: string; value: string | number; dark?: boolean; accent?: 'red' | 'green' | 'orange' }[] }) {
  return (
    <View style={S.kpiGrid4}>
      {items.map((item, i) => (
        <View key={i} style={item.dark ? S.kpiCardDark : S.kpiCard}>
          <Text style={
            item.dark ? S.kpiValWhite
              : item.accent === 'red' ? S.kpiValRed
              : item.accent === 'green' ? S.kpiValGreen
              : item.accent === 'orange' ? S.kpiValOrange
              : S.kpiVal
          }>{item.value}</Text>
          <Text style={item.dark ? S.kpiLblWhite : S.kpiLbl}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(Math.round((value / total) * 100), 100) : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
      <Text style={{ fontSize: 7, color: COLORS.slateLight, width: 72 }}>{String(label).slice(0, 18)}</Text>
      <View style={S.barTrack}>
        <View style={[S.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', width: 18, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function MonthBarChart({ data, dataKey = 'count' }: { data: { month: string; count?: number; amount?: number }[]; dataKey?: 'count' | 'amount' }) {
  const max = Math.max(...data.map((d) => (dataKey === 'amount' ? d.amount ?? 0 : d.count ?? 0)), 1);
  return (
    <View style={S.monthBars}>
      {data.map((m, i) => {
        const val = dataKey === 'amount' ? (m.amount ?? 0) : (m.count ?? 0);
        const h = Math.max((val / max) * 42, val > 0 ? 3 : 0);
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 50 }}>
            {val > 0 && (
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', marginBottom: 1 }}>
                {dataKey === 'amount' && val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              </Text>
            )}
            <View style={{ height: h, width: '75%', backgroundColor: COLORS.red, borderRadius: 2 }} />
            <Text style={{ fontSize: 5.5, color: COLORS.muted, marginTop: 2 }}>{m.month.slice(0, 3)}</Text>
          </View>
        );
      })}
    </View>
  );
}

export interface Nodo360BiReportProps {
  company: any;
  year: number;
  generatedAt?: string;
}

export function Nodo360BiReport({ company, year, generatedAt }: Nodo360BiReportProps) {
  const snap = company?.snapshot ?? {};
  const charts = company?.charts ?? {};
  const tables = company?.tables ?? {};
  const ciaLabel = `${company?.number}ª Compañía — ${company?.name}`;
  const genLabel = generatedAt ? fmtDate(generatedAt) : fmtDateTime();

  return (
    <Document
      title={`NODO360 BI — Cía. ${company?.number} ${year}`}
      author="NODO360"
      subject="Informe Analytics BI"
    >
      {/* PORTADA */}
      <Page size="A4" style={BASE.page}>
        <View style={S.coverHeader}>
          <View style={S.coverBrand}>
            <View style={S.coverLogoBox}><Text style={S.coverLogoTxt}>N</Text></View>
            <View>
              <Text style={S.coverBrandName}>NODO360</Text>
              <Text style={S.coverBrandSub}>ANALYTICS BI · INFORME INTEGRAL POR COMPAÑÍA</Text>
            </View>
          </View>
          <View style={S.coverCompanyBadge}>
            <Text style={S.coverCompanyNum}>{company?.number}</Text>
            <Text style={S.coverCompanyNumSup}>ª CIA</Text>
          </View>
          <Text style={S.coverTitle}>{company?.name}</Text>
          <Text style={S.coverSubTitle}>{company?.city} · {company?.region} · Año {year}</Text>
          <Text style={{ color: COLORS.muted, fontSize: 9 }}>Generado: {genLabel}</Text>
        </View>
        <View style={S.redBand} />
        <View style={BASE.body}>
          <Text style={S.sectionTitle}>Resumen ejecutivo — todos los módulos</Text>
          <KpiRow items={[
            { label: 'Personal activo', value: snap.personnel?.active ?? 0, dark: true },
            { label: 'Flota operativa', value: `${snap.fleet?.operativo ?? 0}/${snap.fleet?.total ?? 0}`, accent: 'green' },
            { label: 'Emergencias año', value: snap.incidents?.year ?? 0, accent: 'red' },
            { label: 'Alertas activas', value: snap.alerts ?? 0, accent: snap.alerts > 0 ? 'red' : 'green' },
          ]} />
          <KpiRow items={[
            { label: 'Novedades bitácora', value: snap.guardLog?.entries ?? 0 },
            { label: 'Litros combustible', value: `${snap.fleetLog?.totalLiters ?? 0} L` },
            { label: 'Auditorías cerradas', value: snap.inventoryAudit?.closed ?? 0 },
            { label: 'Certif. vencidas', value: snap.training?.expired ?? 0, accent: snap.training?.expired > 0 ? 'red' : undefined },
          ]} />
          <KpiRow items={[
            { label: 'Presup. ejecutado', value: `${snap.finance?.execRate ?? 0}%` },
            { label: 'Cuotas recaudadas', value: money(snap.social?.collected ?? 0) },
            { label: 'Simulacros ejecutados', value: snap.drills?.executed ?? 0 },
            { label: 'Con plan emergencia', value: snap.incidents?.withPlan ?? 0 },
          ]} />

          <Text style={S.sectionTitle}>Índice del informe</Text>
          {[
            'Operaciones: emergencias, bitácora de guardia',
            'Recursos: libro flota, mantención, auditoría física',
            'Institucional: capacitación, simulacros, hidrantes',
            'Administración: finanzas, compras, tesorería social',
          ].map((line, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 8, color: COLORS.red, fontFamily: 'Helvetica-Bold', width: 16 }}>{i + 1}.</Text>
              <Text style={{ fontSize: 9, color: COLORS.dark }}>{line}</Text>
            </View>
          ))}
        </View>
        <PdfFooterAuto />
      </Page>

      {/* OPERACIONES */}
      <Page size="A4" style={BASE.page}>
        <PageHeader section="Operaciones" cia={ciaLabel} year={year} />
        <View style={BASE.body}>
          <KpiRow items={[
            { label: 'Emergencias año', value: snap.incidents?.year ?? 0, dark: true },
            { label: 'Mes actual', value: snap.incidents?.thisMonth ?? 0 },
            { label: 'Abiertas', value: snap.incidents?.open ?? 0, accent: 'orange' },
            { label: 'Desde botonera', value: snap.incidents?.fromBotonera ?? 0 },
          ]} />
          <Text style={S.sectionTitle}>Emergencias por mes</Text>
          <MonthBarChart data={charts.incidentsByMonth ?? []} />
          <Text style={S.sectionTitle}>Por tipo de emergencia</Text>
          {(charts.incidentsByType ?? []).slice(0, 8).map((t: any) => (
            <BarRow key={t.name} label={t.name} value={t.value} total={snap.incidents?.year ?? 1} color={COLORS.red} />
          ))}

          <Text style={S.sectionTitle}>Últimas emergencias</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 0.9 }]}>Código</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.3 }]}>Tipo</Text>
              <Text style={[BASE.tableHeadCell, { flex: 2 }]}>Dirección</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.9 }]}>Despacho</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.7 }]}>Plan</Text>
            </View>
            {(tables.recentIncidents ?? []).slice(0, 10).map((inc: any, i: number) => (
              <View key={i} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                <Text style={[BASE.tableCell, { flex: 0.9, fontFamily: 'Helvetica-Bold', color: COLORS.red }]}>{inc.code}</Text>
                <Text style={[BASE.tableCell, { flex: 1.3, fontSize: 7 }]}>{inc.type}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 2, fontSize: 6.5 }]}>{inc.address}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 0.9 }]}>{fmtDate(inc.dispatchedAt)}</Text>
                <Text style={[BASE.tableCell, { flex: 0.7 }]}>{inc.hasPlan ? 'Sí' : '—'}</Text>
              </View>
            ))}
          </View>

          <Text style={S.sectionTitle}>Bitácora de guardia</Text>
          <KpiRow items={[
            { label: 'Días registrados', value: snap.guardLog?.days ?? 0 },
            { label: 'Novedades', value: snap.guardLog?.entries ?? 0 },
            { label: 'Entregas turno', value: snap.guardLog?.handovers ?? 0 },
            { label: 'Días abiertos', value: snap.guardLog?.openDays ?? 0 },
          ]} />
          <Text style={{ fontSize: 8, color: COLORS.slateLight, marginBottom: 6 }}>Novedades por mes</Text>
          <MonthBarChart data={charts.guardEntriesByMonth ?? []} />
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Fecha</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Estado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Novedades</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Entregas</Text>
            </View>
            {(tables.guardLogDays ?? []).map((g: any, i: number) => (
              <View key={i} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                <Text style={[BASE.tableCell, { flex: 1 }]}>{fmtDate(g.date)}</Text>
                <Text style={[BASE.tableCell, { flex: 1 }]}>{g.status}</Text>
                <Text style={[BASE.tableCell, { flex: 1 }]}>{g.entries}</Text>
                <Text style={[BASE.tableCell, { flex: 1 }]}>{g.handovers}</Text>
              </View>
            ))}
          </View>
        </View>
        <PdfFooterAuto />
      </Page>

      {/* FLOTA Y RECURSOS */}
      <Page size="A4" style={BASE.page}>
        <PageHeader section="Flota y recursos" cia={ciaLabel} year={year} />
        <View style={BASE.body}>
          <KpiRow items={[
            { label: 'Registros flota', value: snap.fleetLog?.totalLogs ?? 0, dark: true },
            { label: 'Cargas combustible', value: snap.fleetLog?.fuelLogs ?? 0 },
            { label: 'Litros año', value: `${snap.fleetLog?.totalLiters ?? 0} L` },
            { label: 'L/100 km prom.', value: snap.fleetLog?.avgConsumptionLper100km ?? '—', accent: 'orange' },
          ]} />
          <Text style={S.sectionTitle}>Combustible por mes (litros)</Text>
          <MonthBarChart data={charts.fleetFuelByMonth ?? []} dataKey="amount" />
          <Text style={S.sectionTitle}>Consumo por vehículo (promedio L/100 km)</Text>
          {(charts.fleetConsumptionByVehicle ?? []).map((v: any) => (
            <BarRow
              key={v.patent}
              label={v.patent}
              value={v.avgConsumptionLper100km ?? 0}
              total={Math.max(...(charts.fleetConsumptionByVehicle ?? []).map((x: any) => x.avgConsumptionLper100km ?? 0), 1)}
              color="#8b5cf6"
            />
          ))}

          <Text style={S.sectionTitle}>Libro flota — últimos registros</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 0.9 }]}>Fecha</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.7 }]}>Patente</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Tipo</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.6 }]}>Km</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.7 }]}>Litros</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Costo</Text>
            </View>
            {(tables.recentFleetLogs ?? []).slice(0, 12).map((f: any, i: number) => (
              <View key={i} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                <Text style={[BASE.tableCellMuted, { flex: 0.9 }]}>{fmtDate(f.date)}</Text>
                <Text style={[BASE.tableCell, { flex: 0.7, fontFamily: 'Helvetica-Bold' }]}>{f.patent}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 0.8, fontSize: 7 }]}>{f.type}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 0.6 }]}>{f.odometerKm?.toLocaleString()}</Text>
                <Text style={[BASE.tableCell, { flex: 0.7 }]}>{f.fuelLiters ?? '—'}</Text>
                <Text style={[BASE.tableCell, { flex: 0.8 }]}>{f.fuelCost ? money(f.fuelCost) : '—'}</Text>
              </View>
            ))}
          </View>

          <KpiRow items={[
            { label: 'Mantenciones año', value: snap.maintenance?.count ?? 0 },
            { label: 'Costo mantención', value: money(snap.maintenance?.cost ?? 0) },
            { label: 'Costo combustible', value: money(snap.fleetLog?.totalCost ?? 0) },
            { label: '% flota operativa', value: `${snap.fleet?.operativeRate ?? 0}%`, accent: 'green' },
          ]} />

          <Text style={S.sectionTitle}>Auditoría física de inventario</Text>
          <KpiRow items={[
            { label: 'Auditorías', value: snap.inventoryAudit?.total ?? 0 },
            { label: 'Cerradas', value: snap.inventoryAudit?.closed ?? 0, accent: 'green' },
            { label: 'En proceso', value: snap.inventoryAudit?.inProgress ?? 0, accent: 'orange' },
            { label: 'Diferencias', value: snap.inventoryAudit?.discrepancies ?? 0, accent: 'red' },
          ]} />
          {(charts.auditByResult ?? []).map((a: any) => (
            <BarRow key={a.name} label={a.name} value={a.value} total={
              (charts.auditByResult ?? []).reduce((s: number, x: any) => s + x.value, 0) || 1
            } color="#8b5cf6" />
          ))}
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Código</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Título</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Estado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.6 }]}>Ítems</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.7 }]}>Dif.</Text>
            </View>
            {(tables.recentAudits ?? []).map((a: any, i: number) => (
              <View key={i} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                <Text style={[BASE.tableCell, { flex: 0.8, fontFamily: 'Helvetica-Bold' }]}>{a.code}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 1.2, fontSize: 7 }]}>{a.title ?? '—'}</Text>
                <Text style={[BASE.tableCell, { flex: 0.8 }]}>{a.status}</Text>
                <Text style={[BASE.tableCell, { flex: 0.6 }]}>{a.items}</Text>
                <Text style={[BASE.tableCell, { flex: 0.7, color: a.discrepancies > 0 ? COLORS.red : COLORS.dark }]}>{a.discrepancies}</Text>
              </View>
            ))}
          </View>
        </View>
        <PdfFooterAuto />
      </Page>

      {/* INSTITUCIONAL + FINANZAS */}
      <Page size="A4" style={BASE.page}>
        <PageHeader section="Institucional y administración" cia={ciaLabel} year={year} />
        <View style={BASE.body}>
          <KpiRow items={[
            { label: 'Certificaciones', value: snap.training?.total ?? 0, dark: true },
            { label: 'Vencidas', value: snap.training?.expired ?? 0, accent: 'red' },
            { label: 'Por vencer (30d)', value: snap.training?.expiringSoon ?? 0, accent: 'orange' },
            { label: 'Simulacros año', value: snap.drills?.total ?? 0 },
          ]} />
          <Text style={S.sectionTitle}>Certificaciones por categoría</Text>
          {(charts.certByCategory ?? []).map((c: any) => (
            <BarRow key={c.name} label={c.name} value={c.value} total={snap.training?.total ?? 1} color="#a855f7" />
          ))}
          <Text style={S.sectionTitle}>Próximos vencimientos</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 2 }]}>Certificación</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Categoría</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Vence</Text>
            </View>
            {(tables.expiringCerts ?? []).map((c: any, i: number) => (
              <View key={i} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                <Text style={[BASE.tableCell, { flex: 2, fontSize: 8 }]}>{c.name}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{c.category}</Text>
                <Text style={[BASE.tableCell, { flex: 1, color: c.expired ? COLORS.red : COLORS.dark }]}>{fmtDate(c.expiresAt)}</Text>
              </View>
            ))}
          </View>

          <KpiRow items={[
            { label: 'Hidrantes', value: snap.hydrants?.total ?? 0 },
            { label: 'Operativos', value: snap.hydrants?.operativo ?? 0, accent: 'green' },
            { label: 'Planes emergencia', value: snap.emergencyPlans ?? 0 },
            { label: 'Simulacros OK', value: snap.drills?.executed ?? 0, accent: 'green' },
          ]} />

          <Text style={S.sectionTitle}>Finanzas y tesorería — {year}</Text>
          <KpiRow items={[
            { label: 'Planificado', value: money(snap.finance?.planned ?? 0) },
            { label: 'Ejecutado', value: money(snap.finance?.executed ?? 0), accent: 'red' },
            { label: '% ejecución', value: `${snap.finance?.execRate ?? 0}%` },
            { label: 'Cuotas sociales', value: money(snap.social?.collected ?? 0), accent: 'green' },
          ]} />
          <Text style={{ fontSize: 8, color: COLORS.slateLight, marginBottom: 4 }}>Ejecución por categoría presupuestaria</Text>
          {(charts.budgetByCategory ?? []).map((b: any) => {
            const rate = b.planned > 0 ? Math.round((b.executed / b.planned) * 100) : 0;
            return (
              <View key={b.category} style={{ marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>{b.category}</Text>
                  <Text style={{ fontSize: 7, color: COLORS.slateLight }}>{money(b.executed)} / {money(b.planned)} ({rate}%)</Text>
                </View>
                <View style={{ height: 5, backgroundColor: COLORS.border, borderRadius: 3, marginTop: 2 }}>
                  <View style={{ height: 5, width: `${Math.min(rate, 100)}%`, backgroundColor: rate > 90 ? COLORS.red : COLORS.green, borderRadius: 3 }} />
                </View>
              </View>
            );
          })}

          <Text style={S.sectionTitle}>Cuotas sociales por mes</Text>
          <MonthBarChart data={charts.contributionsByMonth ?? []} dataKey="amount" />

          <KpiRow items={[
            { label: 'Compras año', value: snap.purchases?.total ?? 0 },
            { label: 'Monto compras', value: money(snap.purchases?.amount ?? 0) },
            { label: 'OC pendientes', value: snap.purchases?.pending ?? 0, accent: 'orange' },
            { label: 'Alertas totales', value: snap.alerts ?? 0, accent: snap.alerts > 0 ? 'red' : 'green' },
          ]} />
        </View>
        <PdfFooterAuto />
      </Page>
    </Document>
  );
}
