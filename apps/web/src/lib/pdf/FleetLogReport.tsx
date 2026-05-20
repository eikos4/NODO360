import { Document, Page, Text, View } from '@react-pdf/renderer';
import { BASE, COLORS, PdfHeader, PdfFooterAuto, fmtDate } from './PdfBase';

const TYPE_LABEL: Record<string, string> = {
  COMBUSTIBLE: 'Combustible',
  SERVICIO: 'Servicio',
  OPERACION: 'Operación',
  OTRO: 'Otro',
};

const money = (n?: number | null) =>
  n != null ? `$${Number(n).toLocaleString('es-CL')}` : '—';

interface Props {
  logs: any[];
  stats: any;
  companyFilter: string;
  companies: any[];
  vehicles: any[];
}

export function FleetLogReport({ logs, stats, companyFilter, companies }: Props) {
  const ciaName = companies.find((c) => c.id === companyFilter)?.name ?? 'Todas las compañías';

  return (
    <Document title="Libro de Flota — NODO360" author="NODO360">
      <Page size="A4" style={BASE.page}>
        <PdfHeader title="Libro de Combustible y Operación de Flota" subtitle={ciaName} />
        <View style={BASE.body}>
          <View style={BASE.kpiRow}>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{stats?.totalLogs ?? 0}</Text>
              <Text style={BASE.kpiLabel}>Registros</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, { color: COLORS.orange }]}>{stats?.monthLiters ?? 0} L</Text>
              <Text style={BASE.kpiLabel}>Litros (mes)</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, { color: COLORS.green }]}>{money(stats?.monthCost)}</Text>
              <Text style={BASE.kpiLabel}>Costo (mes)</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{stats?.avgConsumptionLper100km ?? '—'}</Text>
              <Text style={BASE.kpiLabel}>L / 100 km</Text>
            </View>
          </View>

          <Text style={BASE.sectionTitle}>Historial de registros</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 0.9 }]}>Fecha</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.7 }]}>Patente</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Tipo</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.6 }]}>Km</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.7 }]}>Litros</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Costo</Text>
            </View>
            {logs.slice(0, 40).map((log, i) => (
              <View key={log.id} style={[BASE.tableRow, i % 2 === 1 ? { backgroundColor: '#f8fafc' } : {}]}>
                <Text style={[BASE.tableCell, { flex: 0.9 }]}>{fmtDate(log.date)}</Text>
                <Text style={[BASE.tableCell, { flex: 0.7 }]}>{log.vehicle?.patent}</Text>
                <Text style={[BASE.tableCell, { flex: 0.8 }]}>{TYPE_LABEL[log.type] ?? log.type}</Text>
                <Text style={[BASE.tableCell, { flex: 0.6 }]}>{log.odometerKm?.toLocaleString()}</Text>
                <Text style={[BASE.tableCell, { flex: 0.7 }]}>{log.fuelLiters ?? '—'}</Text>
                <Text style={[BASE.tableCell, { flex: 0.8 }]}>{log.fuelCost ? money(log.fuelCost) : '—'}</Text>
              </View>
            ))}
          </View>
          {logs.length > 40 && (
            <Text style={{ fontSize: 8, color: COLORS.slateLight, marginTop: 8 }}>
              Mostrando 40 de {logs.length} registros
            </Text>
          )}
        </View>
        <PdfFooterAuto />
      </Page>
    </Document>
  );
}
