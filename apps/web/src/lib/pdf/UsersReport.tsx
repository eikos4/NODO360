import { Document, Page, Text, View } from '@react-pdf/renderer';
import { BASE, COLORS, PdfHeader, PdfFooterAuto } from './PdfBase';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:        'Super Administrador',
  COMANDANTE:         'Comandante',
  CAPITAN:            'Capitán / Oficial',
  ENCARGADO_MATERIAL: 'Enc. Material',
  SECRETARIO:         'Secretario/a',
  TESORERO:           'Tesorero/a',
  BOMBERO:            'Bombero',
  AUDITOR:            'Auditor',
};

interface Props {
  users: any[];
  companies: any[];
  filterCia?: string;
  filterRole?: string;
}

export function UsersReport({ users, companies, filterCia, filterRole }: Props) {
  const ciaName = filterCia
    ? companies.find((c: any) => c.id === filterCia)?.name ?? filterCia
    : 'Todas las Compañías';

  const active   = users.filter(u => u.isActive);
  const inactive = users.filter(u => !u.isActive);

  const roleCounts = users.reduce((acc: any, u: any) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Document title="Reporte de Personal — NODO360" author="NODO360">
      <Page size="A4" style={BASE.page}>
        <PdfHeader
          title="Reporte de Personal"
          subtitle={ciaName}
        />

        <View style={BASE.body}>
          {/* KPIs */}
          <View style={BASE.kpiRow}>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{users.length}</Text>
              <Text style={BASE.kpiLabel}>Total Personal</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, { color: COLORS.green }]}>{active.length}</Text>
              <Text style={BASE.kpiLabel}>Activos</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, { color: COLORS.slateLight }]}>{inactive.length}</Text>
              <Text style={BASE.kpiLabel}>Inactivos</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={BASE.kpiValue}>{Object.keys(roleCounts).length}</Text>
              <Text style={BASE.kpiLabel}>Roles distintos</Text>
            </View>
          </View>

          {/* Distribución por rol */}
          <Text style={BASE.sectionTitle}>Distribución por Rol</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {Object.entries(roleCounts).map(([role, count]) => (
              <View key={role} style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
                borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4,
              }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.dark }}>
                  {ROLE_LABELS[role] ?? role}
                </Text>
                <Text style={{ fontSize: 8, color: COLORS.red, fontFamily: 'Helvetica-Bold' }}>
                  {String(count)}
                </Text>
              </View>
            ))}
          </View>

          {/* Tabla personal */}
          <Text style={BASE.sectionTitle}>Listado de Personal</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 2 }]}>Nombre</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>RUT</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Rol</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.8 }]}>Compañía</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.8 }]}>Estado</Text>
            </View>
            {users.map((u, i) => {
              const cia = companies.find((c: any) => c.id === u.companyId);
              return (
                <View key={u.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                  <Text style={[BASE.tableCell, { flex: 2, fontFamily: 'Helvetica-Bold' }]}>
                    {u.firstName} {u.lastName}
                  </Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.2 }]}>{u.rut ?? '—'}</Text>
                  <Text style={[BASE.tableCell, { flex: 1.5 }]}>{ROLE_LABELS[u.role] ?? u.role}</Text>
                  <Text style={[BASE.tableCellMuted, { flex: 1.8 }]}>{cia?.name ?? '—'}</Text>
                  <View style={{ flex: 0.8 }}>
                    <Text style={u.isActive ? BASE.badgeGreen : BASE.badgeGray}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </Text>
                  </View>
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
