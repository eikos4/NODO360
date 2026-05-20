import { Document, Page, Text, View } from '@react-pdf/renderer';
import { BASE, COLORS, PdfHeader, PdfFooterAuto, fmtDate } from './PdfBase';

interface Props {
  companies: any[];
}

export function CompanyReport({ companies }: Props) {
  return (
    <Document title="Reporte de Compañías — NODO360" author="NODO360">
      <Page size="A4" style={BASE.page}>
        <PdfHeader
          title="Reporte de Compañías"
          subtitle={`${companies.length} compañía${companies.length !== 1 ? 's' : ''} registrada${companies.length !== 1 ? 's' : ''}`}
        />

        <View style={BASE.body}>
          {/* KPIs */}
          <View style={BASE.kpiRow}>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{companies.length}</Text>
              <Text style={BASE.kpiLabel}>Compañías</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{companies.reduce((s, c) => s + (c._count?.users ?? 0), 0)}</Text>
              <Text style={BASE.kpiLabel}>Total Personal</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{companies.reduce((s, c) => s + (c._count?.vehicles ?? 0), 0)}</Text>
              <Text style={BASE.kpiLabel}>Total Vehículos</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{companies.reduce((s, c) => s + (c._count?.equipment ?? 0), 0)}</Text>
              <Text style={BASE.kpiLabel}>Total Equipamiento</Text>
            </View>
          </View>

          {/* Tabla */}
          <Text style={BASE.sectionTitle}>Detalle por Compañía</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 0.4 }]}>N°</Text>
              <Text style={[BASE.tableHeadCell, { flex: 2 }]}>Nombre</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Ciudad</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Región</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.7 }]}>Personal</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.7 }]}>Flota</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.7 }]}>Equipo</Text>
            </View>
            {companies.map((c, i) => (
              <View key={c.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                <Text style={[BASE.tableCell, { flex: 0.4, fontFamily: 'Helvetica-Bold', color: COLORS.red }]}>{c.number}</Text>
                <Text style={[BASE.tableCell, { flex: 2 }]}>{c.name}</Text>
                <Text style={[BASE.tableCell, { flex: 1.2 }]}>{c.city}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 1.2 }]}>{c.region}</Text>
                <Text style={[BASE.tableCell, { flex: 0.7 }]}>{c._count?.users ?? 0}</Text>
                <Text style={[BASE.tableCell, { flex: 0.7 }]}>{c._count?.vehicles ?? 0}</Text>
                <Text style={[BASE.tableCell, { flex: 0.7 }]}>{c._count?.equipment ?? 0}</Text>
              </View>
            ))}
          </View>

          {/* Fichas de contacto */}
          <Text style={BASE.sectionTitle}>Datos de Contacto</Text>
          {companies.map((c, i) => (
            <View key={c.id} style={{
              borderWidth: 1, borderColor: COLORS.border, borderRadius: 6,
              padding: 10, marginBottom: 8,
              backgroundColor: i % 2 === 0 ? COLORS.white : COLORS.bg,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: COLORS.dark }}>
                  {c.number}ª Compañía — {c.name}
                </Text>
                <Text style={BASE.badgeGray}>{c.region}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 20 }}>
                <Text style={{ fontSize: 8, color: COLORS.slateLight }}>📍 {c.address}, {c.city}</Text>
                {c.phone && <Text style={{ fontSize: 8, color: COLORS.slateLight }}>📞 {c.phone}</Text>}
                {c.email && <Text style={{ fontSize: 8, color: COLORS.slateLight }}>✉ {c.email}</Text>}
              </View>
            </View>
          ))}
        </View>

        <PdfFooterAuto />
      </Page>
    </Document>
  );
}
