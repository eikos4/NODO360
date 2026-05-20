import { Document, Page, Text, View } from '@react-pdf/renderer';
import { BASE, COLORS, PdfHeader, PdfFooterAuto } from './PdfBase';

const CAT_LABELS: Record<string, string> = {
  EQUIPAMIENTO:    'Equipamiento',
  VEHICULOS:       'Vehículos',
  PERSONAL:        'Personal',
  OPERACIONAL:     'Operacional',
  INFRAESTRUCTURA: 'Infraestructura',
  CAPACITACION:    'Capacitación',
  OTRO:            'Otro',
};

const money = (n: number) =>
  `$${Number(n ?? 0).toLocaleString('es-CL')}`;

interface Props {
  budgets: any[];
  dash: any;
  year: number;
  companies: any[];
}

export function FinanceReport({ budgets, dash, year, companies }: Props) {
  const ciaName = (id?: string) => companies.find((c: any) => c.id === id)?.name ?? 'General';

  const totalPlanned  = budgets.reduce((s, b) => s + Number(b.planned ?? 0), 0);
  const totalExecuted = budgets.reduce((s, b) => s + Number(b.executed ?? 0), 0);
  const totalRemaining = totalPlanned - totalExecuted;
  const execRate = totalPlanned > 0 ? Math.round((totalExecuted / totalPlanned) * 100) : 0;

  const byCategory = budgets.reduce((acc: any, b: any) => {
    if (!acc[b.category]) acc[b.category] = { planned: 0, executed: 0 };
    acc[b.category].planned  += Number(b.planned ?? 0);
    acc[b.category].executed += Number(b.executed ?? 0);
    return acc;
  }, {} as Record<string, { planned: number; executed: number }>);

  return (
    <Document title={`Reporte Financiero ${year} — NODO360`} author="NODO360">
      <Page size="A4" style={BASE.page}>
        <PdfHeader
          title={`Reporte Financiero — Año ${year}`}
          subtitle={`${budgets.length} presupuesto${budgets.length !== 1 ? 's' : ''}`}
        />

        <View style={BASE.body}>
          {/* KPIs */}
          <View style={BASE.kpiRow}>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, { fontSize: 14 }]}>{money(totalPlanned)}</Text>
              <Text style={BASE.kpiLabel}>Presupuesto total</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, { fontSize: 14, color: COLORS.red }]}>{money(totalExecuted)}</Text>
              <Text style={BASE.kpiLabel}>Ejecutado</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, { fontSize: 14, color: COLORS.green }]}>{money(totalRemaining)}</Text>
              <Text style={BASE.kpiLabel}>Disponible</Text>
            </View>
            <View style={BASE.kpiBox}>
              <Text style={[BASE.kpiValue, {
                color: execRate > 90 ? COLORS.red : execRate > 70 ? COLORS.yellow : COLORS.green
              }]}>
                {execRate}%
              </Text>
              <Text style={BASE.kpiLabel}>Tasa ejecución</Text>
            </View>
          </View>

          {/* Resumen por categoría */}
          <Text style={BASE.sectionTitle}>Resumen por Categoría</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Categoría</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Planificado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Ejecutado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Disponible</Text>
              <Text style={[BASE.tableHeadCell, { flex: 0.7 }]}>% Ejec.</Text>
            </View>
            {Object.entries(byCategory).map(([cat, vals]: any, i) => {
              const rate = vals.planned > 0 ? Math.round((vals.executed / vals.planned) * 100) : 0;
              const remaining = vals.planned - vals.executed;
              return (
                <View key={cat} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                  <Text style={[BASE.tableCell, { flex: 1.5, fontFamily: 'Helvetica-Bold' }]}>
                    {CAT_LABELS[cat] ?? cat}
                  </Text>
                  <Text style={[BASE.tableCell, { flex: 1.2 }]}>{money(vals.planned)}</Text>
                  <Text style={[BASE.tableCell, { flex: 1.2, color: COLORS.red }]}>{money(vals.executed)}</Text>
                  <Text style={[BASE.tableCell, { flex: 1, color: remaining >= 0 ? COLORS.green : COLORS.red }]}>
                    {money(remaining)}
                  </Text>
                  <Text style={[BASE.tableCell, { flex: 0.7, fontFamily: 'Helvetica-Bold',
                    color: rate > 90 ? COLORS.red : rate > 70 ? COLORS.yellow : COLORS.green,
                  }]}>
                    {rate}%
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Detalle presupuestos */}
          <Text style={BASE.sectionTitle}>Detalle de Presupuestos</Text>
          <View style={BASE.table}>
            <View style={BASE.tableHead}>
              <Text style={[BASE.tableHeadCell, { flex: 2 }]}>Descripción</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1 }]}>Categoría</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Planificado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.2 }]}>Ejecutado</Text>
              <Text style={[BASE.tableHeadCell, { flex: 1.5 }]}>Compañía</Text>
            </View>
            {budgets.map((b, i) => (
              <View key={b.id} style={i % 2 === 0 ? BASE.tableRow : BASE.tableRowAlt}>
                <Text style={[BASE.tableCell, { flex: 2 }]}>{b.description}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 1 }]}>{CAT_LABELS[b.category] ?? b.category}</Text>
                <Text style={[BASE.tableCell, { flex: 1.2 }]}>{money(b.planned)}</Text>
                <Text style={[BASE.tableCell, { flex: 1.2, color: COLORS.red }]}>{money(b.executed)}</Text>
                <Text style={[BASE.tableCellMuted, { flex: 1.5 }]}>{ciaName(b.companyId)}</Text>
              </View>
            ))}
          </View>
        </View>

        <PdfFooterAuto />
      </Page>
    </Document>
  );
}
