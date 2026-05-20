import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { BASE, COLORS, PdfHeader, PdfFooterAuto, fmtDate, fmtDateTime } from './PdfBase';

/* ── Estilos específicos ── */
const S = StyleSheet.create({
  /* Ficha principal */
  heroBox: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
    marginTop: 4,
  },
  vehicleImage: {
    width: 130,
    height: 90,
    borderRadius: 6,
    objectFit: 'cover',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vehicleImagePlaceholder: {
    width: 130,
    height: 90,
    borderRadius: 6,
    backgroundColor: COLORS.darkMid,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  placeholderText: {
    color: COLORS.muted,
    fontSize: 8,
    marginTop: 4,
  },
  heroData: { flex: 1, gap: 4 },
  patentBig: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
    letterSpacing: 2,
  },
  heroName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
    marginTop: 2,
  },
  heroSub: {
    fontSize: 9,
    color: COLORS.slateLight,
    marginTop: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  /* Grid de ficha */
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  gridCell: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 5,
    padding: 8,
  },
  gridLabel: {
    fontSize: 7,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  gridValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.dark,
  },
  gridValueAlert: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.red,
  },
  gridValueOk: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.green,
  },
  /* Company box */
  companyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkMid,
    borderRadius: 6,
    padding: 10,
    gap: 10,
    marginBottom: 14,
  },
  companyCia: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.red,
  },
  companyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
  },
  companyDetail: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 1,
  },
  /* Alerta de mantención */
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 5,
    padding: 8,
    marginBottom: 12,
    gap: 6,
  },
  alertText: { fontSize: 9, color: COLORS.red, fontFamily: 'Helvetica-Bold' },
  alertSub:  { fontSize: 8, color: '#ef4444', marginTop: 1 },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orangeBg,
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 5,
    padding: 8,
    marginBottom: 12,
    gap: 6,
  },
  warnText: { fontSize: 9, color: COLORS.orange, fontFamily: 'Helvetica-Bold' },
  /* Timeline */
  tlYearBadge: {
    backgroundColor: COLORS.red,
    color: COLORS.white,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
    marginTop: 12,
  },
  tlRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tlRowAlt: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tlDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 2,
    flexShrink: 0,
  },
  tlType: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    width: 52,
  },
  tlDate: { fontSize: 8, color: COLORS.slateLight, width: 64 },
  tlDesc: { fontSize: 8, color: COLORS.dark, flex: 1 },
  tlWorkshop: { fontSize: 8, color: COLORS.slateLight, width: 70 },
  tlCost: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.green, width: 50, textAlign: 'right' },
  /* Summary bar */
  summaryBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  summaryCell: {
    flex: 1,
    borderRadius: 5,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryVal: { fontSize: 16, fontFamily: 'Helvetica-Bold' },
  summaryLbl: { fontSize: 7, marginTop: 2, textAlign: 'center' },
});

/* ── Helpers ── */
const statusMeta = (s: string) => {
  if (s === 'OPERATIVO')         return { label: 'OPERATIVO',          bg: '#f0fdf4', color: COLORS.green };
  if (s === 'EN_REPARACION')     return { label: 'EN REPARACIÓN',      bg: COLORS.yellowBg, color: COLORS.yellow };
  if (s === 'FUERA_DE_SERVICIO') return { label: 'FUERA DE SERVICIO',  bg: '#fef2f2', color: COLORS.red };
  return { label: s, bg: COLORS.bg, color: COLORS.slateLight };
};

const typeMeta = (t: string) => {
  if (t === 'PREVENTIVA') return { label: 'PREVENTIVA', color: '#2563eb', dot: '#3b82f6' };
  if (t === 'CORRECTIVA') return { label: 'CORRECTIVA', color: COLORS.red,    dot: COLORS.red };
  if (t === 'REVISION')   return { label: 'REVISIÓN',   color: COLORS.yellow, dot: COLORS.yellow };
  return { label: t, color: COLORS.slateLight, dot: COLORS.slateLight };
};

const money = (n?: number | null) =>
  n != null ? `$${Number(n).toLocaleString('es-CL')}` : '—';

const daysUntil = (d: string) =>
  Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

/* ══════════════════════════════════════════
   COMPONENTE PDF
══════════════════════════════════════════ */
interface Props {
  vehicle: any;
  maintenances: any[];
  company?: any;
}

export function MotorReport({ vehicle, maintenances, company }: Props) {
  const sm       = statusMeta(vehicle.status);
  const sortedM  = [...maintenances].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const years    = Array.from(new Set(sortedM.map(m => new Date(m.date).getFullYear()))).sort((a, b) => b - a) as number[];
  const totalCost     = sortedM.reduce((s, m) => s + (m.cost ?? 0), 0);
  const preventivas   = sortedM.filter(m => m.type === 'PREVENTIVA').length;
  const correctivas   = sortedM.filter(m => m.type === 'CORRECTIVA').length;
  const revisiones    = sortedM.filter(m => m.type === 'REVISION').length;
  const yearNow       = new Date().getFullYear();
  const thisYear      = sortedM.filter(m => new Date(m.date).getFullYear() === yearNow).length;

  const nextMaint      = vehicle.nextMaintenanceAt;
  const nextDays       = nextMaint ? daysUntil(nextMaint) : null;
  const maintExpired   = nextMaint && new Date(nextMaint) < new Date();
  const maintSoon      = nextDays !== null && !maintExpired && nextDays <= 30;

  return (
    <Document title={`Motor ${vehicle.patent} — NODO360`} author="NODO360">
      <Page size="A4" style={BASE.page}>
        <PdfHeader
          title={`Hoja de Vida — ${vehicle.patent}`}
          subtitle={`${vehicle.brand} ${vehicle.model} · ${vehicle.year}`}
        />

        <View style={BASE.body}>

          {/* ── Compañía ── */}
          {company && (
            <View style={S.companyBox}>
              <Text style={S.companyCia}>{company.number}ª</Text>
              <View>
                <Text style={S.companyName}>{company.name}</Text>
                <Text style={S.companyDetail}>
                  {[company.city, company.region, company.address].filter(Boolean).join(' · ')}
                </Text>
                {company.phone && <Text style={S.companyDetail}>Tel: {company.phone}</Text>}
              </View>
            </View>
          )}

          {/* ── Ficha del vehículo ── */}
          <Text style={BASE.sectionTitle}>Identificación del Vehículo</Text>

          <View style={S.heroBox}>
            {/* Imagen */}
            {vehicle.imageUrl ? (
              <Image src={vehicle.imageUrl} style={S.vehicleImage} />
            ) : (
              <View style={S.vehicleImagePlaceholder}>
                <Text style={{ color: COLORS.muted, fontSize: 22 }}>🚒</Text>
                <Text style={S.placeholderText}>Sin imagen</Text>
              </View>
            )}

            {/* Datos principales */}
            <View style={S.heroData}>
              <Text style={S.patentBig}>{vehicle.patent}</Text>
              <Text style={S.heroName}>{vehicle.brand} {vehicle.model}</Text>
              <Text style={S.heroSub}>Año {vehicle.year}  ·  {vehicle.type}</Text>
              <View style={[S.statusBadge, { backgroundColor: sm.bg }]}>
                <Text style={{ color: sm.color, fontSize: 8, fontFamily: 'Helvetica-Bold' }}>
                  ● {sm.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Grid de ficha técnica */}
          <View style={S.gridRow}>
            <View style={S.gridCell}>
              <Text style={S.gridLabel}>Patente</Text>
              <Text style={S.gridValue}>{vehicle.patent}</Text>
            </View>
            <View style={S.gridCell}>
              <Text style={S.gridLabel}>Marca / Modelo</Text>
              <Text style={S.gridValue}>{vehicle.brand} {vehicle.model}</Text>
            </View>
            <View style={S.gridCell}>
              <Text style={S.gridLabel}>Año</Text>
              <Text style={S.gridValue}>{vehicle.year}</Text>
            </View>
            <View style={S.gridCell}>
              <Text style={S.gridLabel}>Tipo</Text>
              <Text style={S.gridValue}>{vehicle.type}</Text>
            </View>
          </View>
          <View style={S.gridRow}>
            <View style={S.gridCell}>
              <Text style={S.gridLabel}>Kilómetros</Text>
              <Text style={S.gridValue}>{vehicle.kilometers?.toLocaleString('es-CL') ?? 0} km</Text>
            </View>
            <View style={S.gridCell}>
              <Text style={S.gridLabel}>Estado</Text>
              <Text style={[S.gridValue, { color: sm.color }]}>{sm.label}</Text>
            </View>
            <View style={S.gridCell}>
              <Text style={S.gridLabel}>Última mantención</Text>
              <Text style={S.gridValue}>{fmtDate(vehicle.lastMaintenanceAt)}</Text>
            </View>
            <View style={S.gridCell}>
              <Text style={S.gridLabel}>Próxima mantención</Text>
              <Text style={maintExpired ? S.gridValueAlert : S.gridValue}>
                {fmtDate(nextMaint)}
              </Text>
            </View>
          </View>
          <View style={S.gridRow}>
            <View style={S.gridCell}>
              <Text style={S.gridLabel}>Compañía</Text>
              <Text style={S.gridValue}>{company ? `${company.number}ª Cía. — ${company.name}` : '—'}</Text>
            </View>
            <View style={S.gridCell}>
              <Text style={S.gridLabel}>Antigüedad</Text>
              <Text style={S.gridValue}>{new Date().getFullYear() - vehicle.year} años</Text>
            </View>
            <View style={S.gridCell}>
              <Text style={S.gridLabel}>Total mantenciones</Text>
              <Text style={S.gridValue}>{sortedM.length}</Text>
            </View>
            <View style={S.gridCell}>
              <Text style={S.gridLabel}>Costo total histórico</Text>
              <Text style={[S.gridValue, { color: COLORS.green }]}>{money(totalCost)}</Text>
            </View>
          </View>

          {/* ── Alerta de mantención ── */}
          {maintExpired && (
            <View style={S.alertBox}>
              <View>
                <Text style={S.alertText}>⚠ MANTENCIÓN VENCIDA</Text>
                <Text style={S.alertSub}>
                  La fecha de próxima mantención ({fmtDate(nextMaint)}) ya pasó. Se requiere intervención urgente.
                </Text>
              </View>
            </View>
          )}
          {!maintExpired && maintSoon && (
            <View style={S.warnBox}>
              <View>
                <Text style={S.warnText}>⏰ MANTENCIÓN PRÓXIMA</Text>
                <Text style={{ fontSize: 8, color: COLORS.orange, marginTop: 1 }}>
                  Vence el {fmtDate(nextMaint)} — en {nextDays} días. Coordinar con taller.
                </Text>
              </View>
            </View>
          )}

          {/* ── Resumen estadístico ── */}
          <Text style={BASE.sectionTitle}>Resumen de Mantenciones</Text>
          <View style={S.summaryBar}>
            <View style={[S.summaryCell, { backgroundColor: COLORS.bg, borderColor: COLORS.border }]}>
              <Text style={[S.summaryVal, { color: COLORS.dark }]}>{sortedM.length}</Text>
              <Text style={[S.summaryLbl, { color: COLORS.slateLight }]}>Total historial</Text>
            </View>
            <View style={[S.summaryCell, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
              <Text style={[S.summaryVal, { color: '#2563eb' }]}>{preventivas}</Text>
              <Text style={[S.summaryLbl, { color: '#3b82f6' }]}>Preventivas</Text>
            </View>
            <View style={[S.summaryCell, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
              <Text style={[S.summaryVal, { color: COLORS.red }]}>{correctivas}</Text>
              <Text style={[S.summaryLbl, { color: COLORS.red }]}>Correctivas</Text>
            </View>
            <View style={[S.summaryCell, { backgroundColor: COLORS.yellowBg, borderColor: '#fde68a' }]}>
              <Text style={[S.summaryVal, { color: COLORS.yellow }]}>{revisiones}</Text>
              <Text style={[S.summaryLbl, { color: COLORS.yellow }]}>Revisiones</Text>
            </View>
            <View style={[S.summaryCell, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
              <Text style={[S.summaryVal, { color: COLORS.green }]}>{money(totalCost)}</Text>
              <Text style={[S.summaryLbl, { color: COLORS.green }]}>Costo total</Text>
            </View>
            <View style={[S.summaryCell, { backgroundColor: COLORS.orangeBg, borderColor: '#fed7aa' }]}>
              <Text style={[S.summaryVal, { color: COLORS.orange }]}>{thisYear}</Text>
              <Text style={[S.summaryLbl, { color: COLORS.orange }]}>Este año ({yearNow})</Text>
            </View>
          </View>
        </View>

        <PdfFooterAuto />
      </Page>

      {/* ══ PÁGINA 2: LÍNEA DE TIEMPO ══ */}
      {sortedM.length > 0 && (
        <Page size="A4" style={BASE.page}>
          <PdfHeader
            title={`Historial de Mantenciones — ${vehicle.patent}`}
            subtitle={`${vehicle.brand} ${vehicle.model} · ${sortedM.length} registros`}
          />

          <View style={BASE.body}>
            <Text style={BASE.sectionTitle}>Línea de Tiempo Completa</Text>

            {/* Cabecera de tabla */}
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { width: 52 }]}>Tipo</Text>
              <Text style={[BASE.tableHeadCell, { width: 60 }]}>Fecha</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Descripción</Text>
              <Text style={[BASE.tableHeadCell, { width: 72 }]}>Taller</Text>
              <Text style={[BASE.tableHeadCell, { width: 50, textAlign: 'right' }]}>Costo</Text>
            </View>

            {years.map(year => {
              const yearItems = sortedM.filter(m => new Date(m.date).getFullYear() === year);
              const yearCost  = yearItems.reduce((s, m) => s + (m.cost ?? 0), 0);
              return (
                <View key={year}>
                  {/* Badge año */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 4 }}>
                    <Text style={S.tlYearBadge}>{year}</Text>
                    <Text style={{ fontSize: 8, color: COLORS.slateLight }}>
                      {yearItems.length} intervención{yearItems.length !== 1 ? 'es' : ''} · {money(yearCost)}
                    </Text>
                  </View>

                  {yearItems.map((m, idx) => {
                    const tm = typeMeta(m.type);
                    const RowStyle = idx % 2 === 0 ? S.tlRow : S.tlRowAlt;
                    return (
                      <View key={m.id} style={RowStyle}>
                        <View style={[S.tlDot, { backgroundColor: tm.dot }]} />
                        <Text style={[S.tlType, { color: tm.color }]}>{tm.label}</Text>
                        <Text style={S.tlDate}>{fmtDate(m.date)}</Text>
                        <Text style={S.tlDesc}>{m.description?.length > 80 ? m.description.slice(0, 80) + '…' : m.description}</Text>
                        <Text style={S.tlWorkshop}>{m.workshopName ? (m.workshopName.length > 18 ? m.workshopName.slice(0, 18) + '…' : m.workshopName) : '—'}</Text>
                        <Text style={S.tlCost}>{money(m.cost)}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {/* Totales al final */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <Text style={{ fontSize: 9, color: COLORS.slateLight, marginRight: 8 }}>
                Total {sortedM.length} registros
              </Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.green }}>
                {money(totalCost)}
              </Text>
            </View>
          </View>

          <PdfFooterAuto />
        </Page>
      )}
    </Document>
  );
}
