import { Document, Page, Text, View } from '@react-pdf/renderer';
import { BASE, COLORS, PdfHeader, PdfFooterAuto, fmtDate } from './PdfBase';

const STATUS_LABEL: Record<string, string> = {
  OPERATIVO:         'Operativo',
  EN_REPARACION:     'En reparación',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
};

const isExpired  = (d?: string) => !!d && new Date(d) < new Date();
const isExpiring = (d?: string) => {
  if (!d) return false;
  const diff = (new Date(d).getTime() - Date.now()) / 86400000;
  return diff >= 0 && diff <= 30;
};

interface Props {
  vehicles: any[];
  equipment: any[];
  companies: any[];
}

export function InventoryReport({ vehicles, equipment, companies }: Props) {
  const ciaName = (id?: string) => companies.find((c: any) => c.id === id)?.name ?? '—';

  const vOp  = vehicles.filter(v => v.status === 'OPERATIVO').length;
  const vRep = vehicles.filter(v => v.status === 'EN_REPARACION').length;
  const vFs  = vehicles.filter(v => v.status === 'FUERA_DE_SERVICIO').length;

  const eOp  = equipment.filter(e => e.status === 'OPERATIVO').length;
  const eExp = equipment.filter(e => isExpired(e.expiresAt)).length;
  const eExp30 = equipment.filter(e => isExpiring(e.expiresAt)).length;

  return (
    <Document title="Reporte de Inventario — NODO360" author="NODO360">

      {/* ── PÁGINA 1: VEHÍCULOS ── */}
      <Page size="A4" style={BASE.page}>
        <PdfHeader
          title="Inventario — Flota Vehicular"
          subtitle={`${vehicles.length} vehículo${vehicles.length !== 1 ? 's' : ''} registrado${vehicles.length !== 1 ? 's' : ''}`}
        />
        <View style={BASE.body}>
          <View style={BASE.kpiRow}>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, { color: COLORS.green }]}>{vOp}</Text>
              <Text style={BASE.kpiLabel}>Operativos</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, { color: COLORS.yellow }]}>{vRep}</Text>
              <Text style={BASE.kpiLabel}>En reparación</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, { color: COLORS.red }]}>{vFs}</Text>
              <Text style={BASE.kpiLabel}>Fuera servicio</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{vehicles.length}</Text>
              <Text style={BASE.kpiLabel}>Total flota</Text>
            </View>
          </View>

          <Text style={BASE.sectionTitle}>Detalle de Vehículos</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Patente</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Marca / Modelo</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Tipo</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.5 }]}>Año</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Estado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Próx. Mantención</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Compañía</Text>
            </View>
            {vehicles.map((v, i) => {
              const expiredMant = isExpired(v.nextMaintenanceAt);
              return (
                <View key={v.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                  <Text style={[BASE.tableCell, { flex: 1, fontFamily: 'Helvetica-Bold' }]}>{v.patent}</Text>
                  <Text style={[BASE.tableCell, { flex: 1.5 }]}>{v.brand} {v.model}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{v.type}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 0.5 }]}>{v.year}</Text>
                  <View style={{ flex: 1.2 }}>
                    <Text style={
                      v.status === 'OPERATIVO'         ? BASE.badgeGreen :
                      v.status === 'EN_REPARACION'     ? BASE.badgeYellow :
                                                         BASE.badgeRed
                    }>
                      {STATUS_LABEL[v.status] ?? v.status}
                    </Text>
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={expiredMant ? BASE.badgeRed : BASE.tableCell}>
                      {fmtDate(v.nextMaintenanceAt)}
                    </Text>
                  </View>
                  <Text style={[BASE.tableCellMuted, { flex: 1.5 }]}>{ciaName(v.companyId)}</Text>
                </View>
              );
            })}
          </View>
        </View>
        <PdfFooterAuto />
      </Page>

      {/* ── PÁGINA 2: EQUIPAMIENTO ── */}
      <Page size="A4" style={BASE.page}>
        <PdfHeader
          title="Inventario — Equipamiento EPP"
          subtitle={`${equipment.length} ítem${equipment.length !== 1 ? 's' : ''} registrado${equipment.length !== 1 ? 's' : ''}`}
        />
        <View style={BASE.body}>
          <View style={BASE.kpiRow}>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, { color: COLORS.green }]}>{eOp}</Text>
              <Text style={BASE.kpiLabel}>Operativos</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, { color: COLORS.red }]}>{eExp}</Text>
              <Text style={BASE.kpiLabel}>Vencidos</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, { color: COLORS.orange }]}>{eExp30}</Text>
              <Text style={BASE.kpiLabel}>Vencen en 30 días</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{equipment.length}</Text>
              <Text style={BASE.kpiLabel}>Total ítems</Text>
            </View>
          </View>

          <Text style={BASE.sectionTitle}>Detalle de Equipamiento</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 1.8 }]}>Nombre</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Código</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Categoría</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.5 }]}>Cant.</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Estado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Vencimiento</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Compañía</Text>
            </View>
            {equipment.map((e, i) => {
              const expired  = isExpired(e.expiresAt);
              const expiring = isExpiring(e.expiresAt);
              return (
                <View key={e.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                  <Text style={[BASE.tableCell, { flex: 1.8, fontFamily: 'Helvetica-Bold' }]}>{e.name}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 0.8 }]}>{e.code ?? '—'}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{e.category}</Text>
                  <Text style={[BASE.tableCell, { flex: 0.5 }]}>{e.quantity ?? 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={
                      e.status === 'OPERATIVO'         ? BASE.badgeGreen :
                      e.status === 'EN_REPARACION'     ? BASE.badgeYellow :
                                                         BASE.badgeRed
                    }>
                      {STATUS_LABEL[e.status] ?? e.status}
                    </Text>
                  </View>
                  <View style={{ flex: 1.2 }}>
                    <Text style={expired ? BASE.badgeRed : expiring ? BASE.badgeOrange : BASE.tableCell}>
                      {fmtDate(e.expiresAt)}
                    </Text>
                  </View>
                  <Text style={[BASE.tableCellMuted, { flex: 1.5 }]}>{ciaName(e.companyId)}</Text>
                </View>
              );
            })}
          </View>
        </View>
        <PdfFooterAuto />
      </Page>

    </Document>
  );
}
