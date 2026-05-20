/**
 * Seed demo NODO360 — Solo 5ª Compañía de Bomberos (Valparaíso)
 * Pobla todos los módulos con datos coherentes para demostración.
 */
import {
  PrismaClient,
  InventoryAuditItemKind,
  InventoryAuditItemResult,
  InventoryAuditStatus,
  FleetLogType,
  DispatchSource,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'path';
import { snapshotPlanChecklist } from '../src/incidents/incident-plan.util';

config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const hash = (p: string) => bcrypt.hash(p, 10);
const now = new Date();
const monthsAgo = (m: number) => new Date(now.getFullYear(), now.getMonth() - m, 1);
const monthsAhead = (m: number) => new Date(now.getFullYear(), now.getMonth() + m, 1);
const daysAhead = (d: number) => new Date(Date.now() + d * 86400000);
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);
const daysAgoFleet = (d: number) => new Date(Date.now() - d * 86400000);

async function clearDatabase() {
  await prisma.vaccination.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.allergy.deleteMany();
  await prisma.medicalCondition.deleteMany();
  await prisma.medicalExam.deleteMany();
  await prisma.healthRecord.deleteMany();
  await prisma.memberCertification.deleteMany();
  await prisma.drill.deleteMany();
  await prisma.evacuationRoute.deleteMany();
  await prisma.meetingPoint.deleteMany();
  await prisma.emergencyPlanVersion.deleteMany();
  await prisma.emergencyPlanAttachment.deleteMany();
  await prisma.emergencyPlan.deleteMany();
  await prisma.socialContribution.deleteMany();
  await prisma.membershipFee.deleteMany();
  await prisma.memberProfile.deleteMany();
  await prisma.guardLogEntry.deleteMany();
  await prisma.guardHandover.deleteMany();
  await prisma.guardLog.deleteMany();
  await prisma.incidentParticipant.deleteMany();
  await prisma.incidentVehicle.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.fleetLog.deleteMany();
  await prisma.inventoryAuditItem.deleteMany();
  await prisma.inventoryAudit.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.document.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.hydrant.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
}

async function main() {
  console.log('🌱 NODO360 — Reseteando BD demo (solo 5ª Compañía)...\n');
  await clearDatabase();

  // ─── Compañía única ───────────────────────────────────────────────────────
  const cia = await prisma.company.create({
    data: {
      number: 5,
      name: 'Quinta Compañía de Bomberos de Valparaíso',
      region: 'Valparaíso',
      city: 'Valparaíso',
      address: 'Av. Argentina 789, Barrio Puerto',
      phone: '+56 32 234 5678',
      email: 'quinta@bomberos.vp',
    },
  });
  console.log('✅ Compañía 5 — Valparaíso');

  const pwd = await hash('Demo1234!');
  const pwdAdmin = await hash('Admin1234!');

  const superAdmin = await prisma.user.create({
    data: {
      rut: '12.345.678-9',
      firstName: 'Carlos',
      lastName: 'Rodríguez',
      email: 'admin@nodo360.cl',
      passwordHash: pwdAdmin,
      role: 'SUPER_ADMIN',
      companyId: cia.id,
    },
  });
  const comandante = await prisma.user.create({
    data: { rut: '13.456.789-0', firstName: 'Mario', lastName: 'González', email: 'gonzalez@cia5.cl', passwordHash: pwd, role: 'COMANDANTE', companyId: cia.id },
  });
  const capitan = await prisma.user.create({
    data: { rut: '14.567.890-1', firstName: 'Ana', lastName: 'Martínez', email: 'martinez@cia5.cl', passwordHash: pwd, role: 'CAPITAN', companyId: cia.id },
  });
  const encMaterial = await prisma.user.create({
    data: { rut: '15.678.901-2', firstName: 'Pedro', lastName: 'López', email: 'lopez@cia5.cl', passwordHash: pwd, role: 'ENCARGADO_MATERIAL', companyId: cia.id },
  });
  const tesorero = await prisma.user.create({
    data: { rut: '16.789.012-3', firstName: 'Sofía', lastName: 'Torres', email: 'torres@cia5.cl', passwordHash: pwd, role: 'TESORERO', companyId: cia.id },
  });
  const secretaria = await prisma.user.create({
    data: { rut: '17.890.123-4', firstName: 'Valentina', lastName: 'Pérez', email: 'perez@cia5.cl', passwordHash: pwd, role: 'SECRETARIO', companyId: cia.id },
  });
  const bombero1 = await prisma.user.create({
    data: { rut: '18.901.234-5', firstName: 'Diego', lastName: 'Fuentes', email: 'fuentes@cia5.cl', passwordHash: pwd, role: 'BOMBERO', companyId: cia.id },
  });
  const bombero2 = await prisma.user.create({
    data: { rut: '19.012.345-6', firstName: 'Camila', lastName: 'Vargas', email: 'vargas@cia5.cl', passwordHash: pwd, role: 'BOMBERO', companyId: cia.id },
  });
  const bombero3 = await prisma.user.create({
    data: { rut: '20.123.456-7', firstName: 'Andrés', lastName: 'Muñoz', email: 'munoz@cia5.cl', passwordHash: pwd, role: 'BOMBERO', companyId: cia.id },
  });
  const bombero4 = await prisma.user.create({
    data: { rut: '21.234.567-8', firstName: 'Gabriela', lastName: 'Castro', email: 'castro@cia5.cl', passwordHash: pwd, role: 'BOMBERO', companyId: cia.id },
  });
  const bombero5 = await prisma.user.create({
    data: { rut: '22.345.678-9', firstName: 'Javier', lastName: 'Rojas', email: 'rojas@cia5.cl', passwordHash: pwd, role: 'BOMBERO', companyId: cia.id },
  });
  const auditor = await prisma.user.create({
    data: { rut: '23.456.789-0', firstName: 'Isabel', lastName: 'Soto', email: 'soto@cia5.cl', passwordHash: pwd, role: 'AUDITOR', companyId: cia.id },
  });
  const allMembers = [comandante, capitan, encMaterial, tesorero, secretaria, bombero1, bombero2, bombero3, bombero4, bombero5, auditor];
  console.log('✅ 12 usuarios (incl. super admin)');

  // ─── Vehículos ────────────────────────────────────────────────────────────
  const v1 = await prisma.vehicle.create({
    data: { patent: 'BCVP-12', brand: 'Magirus', model: 'TLF 3000', year: 2018, type: 'Escala', status: 'OPERATIVO', kilometers: 68400, lastMaintenanceAt: monthsAgo(2), nextMaintenanceAt: monthsAhead(4), companyId: cia.id },
  });
  const v2 = await prisma.vehicle.create({
    data: { patent: 'BCVP-34', brand: 'Man', model: 'TGM Auto Bomba', year: 2016, type: 'Auto Bomba', status: 'OPERATIVO', kilometers: 92100, lastMaintenanceAt: monthsAgo(1), nextMaintenanceAt: monthsAhead(5), companyId: cia.id },
  });
  const v3 = await prisma.vehicle.create({
    data: { patent: 'BCVP-56', brand: 'Mercedes-Benz', model: 'Sprinter Rescate', year: 2020, type: 'Rescate', status: 'EN_REPARACION', kilometers: 31800, lastMaintenanceAt: monthsAgo(3), nextMaintenanceAt: monthsAhead(-1), companyId: cia.id },
  });
  const v4 = await prisma.vehicle.create({
    data: { patent: 'BCVP-78', brand: 'Scania', model: 'P360 Escala Aérea', year: 2014, type: 'Escala Aérea', status: 'OPERATIVO', kilometers: 112500, lastMaintenanceAt: monthsAgo(2), nextMaintenanceAt: monthsAhead(3), companyId: cia.id },
  });
  console.log('✅ 4 vehículos');

  // ─── Equipamiento ─────────────────────────────────────────────────────────
  await prisma.equipment.createMany({
    data: [
      { code: 'EQ-VP-001', name: 'Traje Aproximación NFPA', category: 'EPP', status: 'OPERATIVO', serial: 'VP-2022-001', purchaseDate: daysAgo(800), expiresAt: daysAhead(120), quantity: 2, companyId: cia.id },
      { code: 'EQ-VP-002', name: 'Casco MSA F1XF', category: 'EPP', status: 'OPERATIVO', serial: 'VP-2023-002', purchaseDate: daysAgo(400), expiresAt: daysAhead(400), quantity: 4, companyId: cia.id },
      { code: 'EQ-VP-003', name: 'Equipo Autónomo SCBA Scott', category: 'Respiración', status: 'OPERATIVO', serial: 'VP-2021-003', purchaseDate: daysAgo(1100), expiresAt: daysAhead(25), quantity: 1, companyId: cia.id },
      { code: 'EQ-VP-004', name: 'Equipo Autónomo SCBA Scott', category: 'Respiración', status: 'EN_REPARACION', serial: 'VP-2021-004', purchaseDate: daysAgo(1100), expiresAt: daysAhead(-5), quantity: 1, companyId: cia.id },
      { code: 'EQ-VP-005', name: 'Manguera 38mm 30m', category: 'Mangueras', status: 'OPERATIVO', purchaseDate: daysAgo(500), quantity: 6, companyId: cia.id },
      { code: 'EQ-VP-006', name: 'Desfibrilador Zoll AED', category: 'Médico', status: 'OPERATIVO', serial: 'VP-2024-006', purchaseDate: daysAgo(180), expiresAt: daysAhead(600), quantity: 1, companyId: cia.id },
      { code: 'EQ-VP-007', name: 'Kit Rescate Vehicular Holmatro', category: 'Rescate', status: 'OPERATIVO', serial: 'VP-2019-007', purchaseDate: daysAgo(1500), quantity: 1, companyId: cia.id },
      { code: 'EQ-VP-008', name: 'Traje HazMat Nivel A', category: 'EPP', status: 'OPERATIVO', serial: 'VP-2020-008', purchaseDate: daysAgo(700), expiresAt: daysAhead(-20), quantity: 1, companyId: cia.id },
      { code: 'EQ-VP-009', name: 'Detector gases Altair 5X', category: 'Detección', status: 'OPERATIVO', serial: 'VP-2023-009', purchaseDate: daysAgo(200), expiresAt: daysAhead(500), quantity: 2, companyId: cia.id },
      { code: 'EQ-VP-010', name: 'Linterna térmica FLIR', category: 'Detección', status: 'OPERATIVO', serial: 'VP-2024-010', purchaseDate: daysAgo(90), quantity: 1, companyId: cia.id },
    ],
  });
  console.log('✅ 10 equipos');

  // ─── Mantenciones ─────────────────────────────────────────────────────────
  await prisma.maintenance.createMany({
    data: [
      { type: 'PREVENTIVA', description: 'Mantención mayor escala — aceite, filtros, hidráulica', cost: 420000, date: monthsAgo(2), workshopName: 'Taller Naval Valparaíso', vehicleId: v1.id },
      { type: 'REVISION', description: 'Inspección pre-operacional mensual', cost: 55000, date: monthsAgo(1), workshopName: 'Taller Cía. 5', vehicleId: v1.id },
      { type: 'PREVENTIVA', description: 'Frenos y neumáticos auto bomba', cost: 380000, date: monthsAgo(1), workshopName: 'Repuestos VP SpA', vehicleId: v2.id },
      { type: 'CORRECTIVA', description: 'Reparación sistema refrigeración Sprinter', cost: 210000, date: monthsAgo(3), workshopName: 'Diesel Puerto', vehicleId: v3.id },
      { type: 'PREVENTIVA', description: 'Revisión estructura escalera aérea', cost: 520000, date: monthsAgo(2), workshopName: 'Magirus Chile', vehicleId: v4.id },
    ],
  });
  console.log('✅ 5 mantenciones');

  // ─── Planes de emergencia ─────────────────────────────────────────────────
  const planIncendio = await prisma.emergencyPlan.create({
    data: {
      title: 'Plan incendio estructural — Puerto y plan',
      description: 'Procedimiento para incendios en edificaciones del plan de Valparaíso',
      emergencyType: 'INCENDIO',
      severity: 'ALTA',
      status: 'ACTIVE',
      version: 1,
      procedures: { steps: ['Confirmar alarma', 'Despachar dotación', 'Establecer perímetro', 'Ataque y ventilación', 'Ventilación post-control'] },
      checklist: [
        { id: '1', text: 'Activar alarma y botonera', required: true, order: 1 },
        { id: '2', text: 'Despachar carros según protocolo', required: true, order: 2 },
        { id: '3', text: 'Coordinar con municipalidad / SAMU', required: true, order: 3 },
        { id: '4', text: 'Registrar novedad en bitácora', required: true, order: 4 },
        { id: '5', text: 'Informe preliminar al comandante', required: false, order: 5 },
      ],
      companyId: cia.id,
    },
  });
  await prisma.emergencyPlan.create({
    data: {
      title: 'Plan rescate vehicular',
      description: 'Procedimiento extricación y apoyo SAMU en vías',
      emergencyType: 'ACCIDENTE',
      severity: 'MEDIA',
      status: 'ACTIVE',
      version: 1,
      procedures: { steps: ['Asegurar escena', 'Estabilización vehículo', 'Extricación', 'Traslado SAMU'] },
      checklist: [
        { id: '1', text: 'Perímetro de seguridad 50m', required: true, order: 1 },
        { id: '2', text: 'Kit Holmatro operativo', required: true, order: 2 },
      ],
      companyId: cia.id,
    },
  });
  const planChecklist = snapshotPlanChecklist(planIncendio.checklist);

  // ─── Emergencias ──────────────────────────────────────────────────────────
  const inc1 = await prisma.incident.create({
    data: {
      code: 'C5-20260501-142200',
      type: 'Incendio Estructural',
      description: 'Incendio en conventillo Barrio Puerto. Evacuación de 12 familias.',
      address: 'Pasaje Wheelwright 234, Valparaíso',
      latitude: -33.0385,
      longitude: -71.6278,
      dispatchedAt: new Date('2026-05-01T14:22:00'),
      arrivedAt: new Date('2026-05-01T14:35:00'),
      closedAt: new Date('2026-05-01T18:10:00'),
      report: 'Controlado sin víctimas fatales. 2 heridos leves.',
      companyId: cia.id,
      dispatchSource: DispatchSource.BOTONERA,
      dispatchNotes: 'Despacho desde botonera — turno tarde',
      emergencyPlanId: planIncendio.id,
      planChecklist,
    },
  });
  const inc2 = await prisma.incident.create({
    data: {
      code: 'C5-20260503-081500',
      type: 'Rescate Vehicular',
      description: 'Volcamiento camión en Ruta 68. Conductor atrapado.',
      address: 'Ruta 68 km 12, Valparaíso',
      latitude: -33.0521,
      longitude: -71.5982,
      dispatchedAt: new Date('2026-05-03T08:15:00'),
      arrivedAt: new Date('2026-05-03T08:32:00'),
      closedAt: new Date('2026-05-03T11:00:00'),
      report: 'Rescate exitoso. Traslado a Hospital Van Buren.',
      companyId: cia.id,
      dispatchSource: DispatchSource.MANUAL,
    },
  });
  const inc3 = await prisma.incident.create({
    data: {
      code: 'C5-20260508-221000',
      type: 'Incendio Estructural',
      description: 'Incendio en bodega portuaria. Humo denso sector muelle.',
      address: 'Muelle Barón, Bodega 7',
      latitude: -33.0362,
      longitude: -71.6055,
      dispatchedAt: new Date('2026-05-08T22:10:00'),
      arrivedAt: new Date('2026-05-08T22:24:00'),
      closedAt: null,
      companyId: cia.id,
      dispatchSource: DispatchSource.BOTONERA,
      emergencyPlanId: planIncendio.id,
      planChecklist: snapshotPlanChecklist(planIncendio.checklist),
    },
  });
  const inc4 = await prisma.incident.create({
    data: {
      code: 'C5-20260510-093000',
      type: 'Emergencia Médica',
      description: 'Persona con crisis hipertensiva en ascensor. Apoyo SAMU.',
      address: 'Prat 856, Edificio Consistorial',
      latitude: -33.0472,
      longitude: -71.6127,
      dispatchedAt: new Date('2026-05-10T09:30:00'),
      arrivedAt: new Date('2026-05-10T09:42:00'),
      closedAt: new Date('2026-05-10T10:15:00'),
      companyId: cia.id,
    },
  });
  const inc5 = await prisma.incident.create({
    data: {
      code: 'C5-20260512-164000',
      type: 'HazMat',
      description: 'Derrame solvente en taller mecánico. Neutralización con espuma.',
      address: 'Av. Pedro Montt 2890',
      latitude: -33.0558,
      longitude: -71.6195,
      dispatchedAt: new Date('2026-05-12T16:40:00'),
      arrivedAt: new Date('2026-05-12T16:58:00'),
      closedAt: new Date('2026-05-12T20:30:00'),
      report: 'Derrame contenido. Sin evacuación masiva.',
      companyId: cia.id,
    },
  });

  await prisma.incidentParticipant.createMany({
    data: [
      { incidentId: inc1.id, userId: comandante.id }, { incidentId: inc1.id, userId: capitan.id },
      { incidentId: inc1.id, userId: bombero1.id }, { incidentId: inc1.id, userId: bombero2.id },
      { incidentId: inc2.id, userId: capitan.id }, { incidentId: inc2.id, userId: bombero3.id }, { incidentId: inc2.id, userId: bombero4.id },
      { incidentId: inc3.id, userId: comandante.id }, { incidentId: inc3.id, userId: bombero1.id }, { incidentId: inc3.id, userId: bombero2.id },
      { incidentId: inc4.id, userId: bombero5.id }, { incidentId: inc5.id, userId: capitan.id }, { incidentId: inc5.id, userId: bombero3.id },
    ],
  });
  await prisma.incidentVehicle.createMany({
    data: [
      { incidentId: inc1.id, vehicleId: v1.id }, { incidentId: inc1.id, vehicleId: v2.id },
      { incidentId: inc2.id, vehicleId: v2.id }, { incidentId: inc2.id, vehicleId: v3.id },
      { incidentId: inc3.id, vehicleId: v1.id }, { incidentId: inc3.id, vehicleId: v2.id },
    ],
  });
  console.log('✅ 5 emergencias con plan y participantes');

  // ─── Turnos ───────────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOffset = (d: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + d);
    return dt;
  };
  const shiftCrew = [capitan, bombero1, bombero2, bombero3, encMaterial];
  for (let i = -14; i <= 21; i++) {
    const day = dayOffset(i);
    const crew = shiftCrew.slice(0, i % 2 === 0 ? 4 : 3);
    for (const u of crew) {
      await prisma.shift.create({
        data: {
          date: day,
          startTime: i % 3 === 0 ? '20:00' : '08:00',
          endTime: i % 3 === 0 ? '08:00' : '20:00',
          present: i < 0,
          notes: i === 0 ? 'Guardia actual' : undefined,
          userId: u.id,
        },
      });
    }
  }
  console.log('✅ Turnos de guardia');

  // ─── Bitácora (hoy + ayer) ────────────────────────────────────────────────
  const guardLogToday = await prisma.guardLog.create({
    data: { companyId: cia.id, date: today, status: 'OPEN', openedById: capitan.id },
  });
  await prisma.guardLogEntry.createMany({
    data: [
      { logId: guardLogToday.id, type: 'REVISION', title: 'Revisión matinal cuartel', content: 'Sala máquinas, comedor y patio OK. Carros BCVP-12 y 34 operativos.', authorId: capitan.id },
      { logId: guardLogToday.id, type: 'NOVEDAD', title: 'Visita inspector municipal', content: 'Extintores y señalética conformes.', authorId: secretaria.id },
      { logId: guardLogToday.id, type: 'NOVEDAD', title: `Despacho ${inc3.code}`, content: 'Emergencia muelle Barón — registro automático botonera.', authorId: capitan.id, incidentId: inc3.id },
      { logId: guardLogToday.id, type: 'MANTENIMIENTO', title: 'SCBA en taller', content: 'EQ-VP-004 en revisión por válvula.', authorId: encMaterial.id },
    ],
  });
  await prisma.guardHandover.create({
    data: {
      logId: guardLogToday.id,
      fromUserId: capitan.id,
      toUserId: bombero1.id,
      summary: 'Turno día estable. Emergencia INC muelle en curso.',
      observations: 'Actualizar odómetro BCVP-34 tras última carga.',
    },
  });

  const yesterday = dayOffset(-1);
  const guardLogYesterday = await prisma.guardLog.create({
    data: {
      companyId: cia.id,
      date: yesterday,
      status: 'CLOSED',
      openedById: bombero2.id,
      closedById: capitan.id,
      closedAt: new Date(yesterday.getTime() + 20 * 3600000),
      closingNotes: 'Turno cerrado sin novedades críticas.',
    },
  });
  await prisma.guardLogEntry.create({
    data: {
      logId: guardLogYesterday.id,
      type: 'NOVEDAD',
      title: 'Simulacro interno',
      content: 'Evacuación cuartel 8 min. Participaron 18 voluntarios.',
      authorId: bombero2.id,
    },
  });
  console.log('✅ Bitácora (2 días)');

  // ─── Auditorías ───────────────────────────────────────────────────────────
  const auditClosed = await prisma.inventoryAudit.create({
    data: {
      code: `AUD-${now.getFullYear()}-001`,
      title: 'Auditoría física Q1 — Cía. 5',
      status: InventoryAuditStatus.CERRADA,
      companyId: cia.id,
      auditorId: auditor.id,
      startedAt: daysAgo(45),
      completedAt: daysAgo(40),
      closingNotes: '1 diferencia menor en mangueras — corregida.',
    },
  });
  const vehicles = await prisma.vehicle.findMany({ where: { companyId: cia.id } });
  const equip = await prisma.equipment.findMany({ where: { companyId: cia.id } });
  await prisma.inventoryAuditItem.createMany({
    data: [
      ...vehicles.map((v) => ({
        auditId: auditClosed.id,
        kind: InventoryAuditItemKind.VEHICULO,
        vehicleId: v.id,
        expectedLabel: `${v.patent} — ${v.brand}`,
        expectedStatus: v.status,
        expectedQty: 1,
        found: true,
        physicalStatus: v.status,
        physicalQty: 1,
        result: InventoryAuditItemResult.CONFORME,
        verifiedAt: daysAgo(42),
      })),
      ...equip.slice(0, 8).map((e, i) => ({
        auditId: auditClosed.id,
        kind: InventoryAuditItemKind.EQUIPO,
        equipmentId: e.id,
        expectedLabel: `${e.code} — ${e.name}`,
        expectedStatus: e.status,
        expectedQty: e.quantity ?? 1,
        found: i !== 3,
        physicalStatus: e.status,
        physicalQty: i === 3 ? 5 : (e.quantity ?? 1),
        result: i === 3 ? InventoryAuditItemResult.DIFERENCIA : InventoryAuditItemResult.CONFORME,
        observations: i === 3 ? 'Conteo físico: 5 mangueras vs 6 sistema' : undefined,
        verifiedAt: daysAgo(41),
      })),
    ],
  });

  const auditOpen = await prisma.inventoryAudit.create({
    data: {
      code: `AUD-${now.getFullYear()}-002`,
      title: 'Auditoría física Q2 — en proceso',
      status: InventoryAuditStatus.EN_PROCESO,
      companyId: cia.id,
      auditorId: auditor.id,
      startedAt: daysAgo(3),
    },
  });
  await prisma.inventoryAuditItem.createMany({
    data: vehicles.map((v, i) => ({
      auditId: auditOpen.id,
      kind: InventoryAuditItemKind.VEHICULO,
      vehicleId: v.id,
      expectedLabel: `${v.patent} — ${v.brand} ${v.model}`,
      expectedStatus: v.status,
      expectedQty: 1,
      found: i < 2,
      physicalStatus: v.status,
      physicalQty: 1,
      result: i < 2 ? InventoryAuditItemResult.CONFORME : InventoryAuditItemResult.PENDIENTE,
      verifiedAt: i < 2 ? new Date() : undefined,
    })),
  });
  console.log('✅ 2 auditorías físicas');

  // ─── Libro flota ──────────────────────────────────────────────────────────
  await prisma.fleetLog.createMany({
    data: [
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(45), vehicleId: v1.id, companyId: cia.id, driverId: bombero1.id, registeredById: encMaterial.id, odometerKm: 67800, fuelLiters: 195, fuelCost: 310000, fuelStation: 'Copec Barón', fullTank: true },
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(28), vehicleId: v1.id, companyId: cia.id, driverId: bombero2.id, registeredById: encMaterial.id, odometerKm: 68100, fuelLiters: 170, fuelCost: 272000, fuelStation: 'Petrobras Prat', fullTank: true },
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(12), vehicleId: v1.id, companyId: cia.id, driverId: bombero1.id, registeredById: encMaterial.id, odometerKm: 68400, fuelLiters: 185, fuelCost: 295000, fuelStation: 'Copec Argentina', fullTank: true },
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(8), vehicleId: v2.id, companyId: cia.id, driverId: capitan.id, registeredById: encMaterial.id, odometerKm: 91800, fuelLiters: 130, fuelCost: 208000, fuelStation: 'Shell Pedro Montt', fullTank: false },
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(3), vehicleId: v2.id, companyId: cia.id, driverId: bombero3.id, registeredById: encMaterial.id, odometerKm: 92100, fuelLiters: 145, fuelCost: 232000, fuelStation: 'Copec Barón', fullTank: true },
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(20), vehicleId: v4.id, companyId: cia.id, driverId: comandante.id, registeredById: encMaterial.id, odometerKm: 112000, fuelLiters: 220, fuelCost: 350000, fuelStation: 'Petrobras', fullTank: true },
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(5), vehicleId: v4.id, companyId: cia.id, driverId: bombero4.id, registeredById: encMaterial.id, odometerKm: 112500, fuelLiters: 200, fuelCost: 318000, fuelStation: 'Copec', fullTank: true },
      { type: FleetLogType.SERVICIO, date: daysAgoFleet(7), vehicleId: v2.id, companyId: cia.id, driverId: bombero5.id, registeredById: encMaterial.id, odometerKm: 91950, serviceLabel: 'Revisión pre-salida', description: 'Luces, frenos, niveles OK' },
      { type: FleetLogType.OPERACION, date: daysAgoFleet(1), vehicleId: v1.id, companyId: cia.id, driverId: comandante.id, registeredById: capitan.id, odometerKm: 68450, serviceLabel: `Salida ${inc3.code}`, description: 'Despacho incendio muelle' },
    ],
  });
  await prisma.vehicle.update({ where: { id: v1.id }, data: { kilometers: 68450 } });
  await prisma.vehicle.update({ where: { id: v2.id }, data: { kilometers: 92100 } });
  await prisma.vehicle.update({ where: { id: v4.id }, data: { kilometers: 112500 } });
  console.log('✅ Libro flota (9 registros)');

  // ─── Documentos ───────────────────────────────────────────────────────────
  await prisma.document.createMany({
    data: [
      { title: 'Manual Operaciones Cía. 5', category: 'Protocolo', fileUrl: '/uploads/demo-manual-cia5.pdf', uploadedBy: 'Mario González', companyId: cia.id },
      { title: 'Protocolo HazMat Puerto', category: 'Protocolo', fileUrl: '/uploads/demo-hazmat.pdf', uploadedBy: 'Ana Martínez', companyId: cia.id, expiresAt: daysAhead(200) },
      { title: 'Acta Directiva Mayo 2026', category: 'Acta', fileUrl: '/uploads/demo-acta.pdf', uploadedBy: 'Valentina Pérez', companyId: cia.id },
      { title: 'Convenio Mutual Seguridad', category: 'Convenio', fileUrl: '/uploads/demo-convenio.pdf', uploadedBy: 'Valentina Pérez', companyId: cia.id, expiresAt: daysAhead(20) },
      { title: 'Rev. técnica BCVP-12', category: 'Certificado', fileUrl: '/uploads/demo-rev-12.pdf', uploadedBy: 'Pedro López', companyId: cia.id, expiresAt: daysAhead(15) },
      { title: 'Rev. técnica BCVP-34', category: 'Certificado', fileUrl: '/uploads/demo-rev-34.pdf', uploadedBy: 'Pedro López', companyId: cia.id, expiresAt: daysAhead(-25) },
      { title: 'Informe Anual 2025', category: 'Informe', fileUrl: '/uploads/demo-informe.pdf', uploadedBy: 'Mario González', companyId: cia.id },
    ],
  });
  console.log('✅ Documentos');

  // ─── Compras y facturas ─────────────────────────────────────────────────────
  const oc1 = await prisma.purchase.create({
    data: { number: 'OC-VP-2026-001', description: 'Trajes aproximación NFPA x4', supplier: 'Equipos Seguridad VP', status: 'RECIBIDA', totalAmount: 4200000, approvedAt: daysAgo(60), receivedAt: daysAgo(45), companyId: cia.id },
  });
  const oc2 = await prisma.purchase.create({
    data: { number: 'OC-VP-2026-002', description: 'SCBA Scott x2 + repuestos', supplier: 'MSA Chile', status: 'APROBADA', totalAmount: 5800000, approvedAt: daysAgo(25), companyId: cia.id },
  });
  const oc3 = await prisma.purchase.create({
    data: { number: 'OC-VP-2026-003', description: 'Mantención preventiva flota', supplier: 'Taller Naval VP', status: 'RECIBIDA', totalAmount: 1350000, approvedAt: daysAgo(50), receivedAt: daysAgo(35), companyId: cia.id },
  });
  await prisma.purchase.create({
    data: { number: 'OC-VP-2026-004', description: 'Mangueras y acoples Storz', supplier: 'Contra Incendio Chile', status: 'PENDIENTE', totalAmount: 920000, companyId: cia.id },
  });
  await prisma.invoice.createMany({
    data: [
      { number: 'FAC-VP-45231', supplier: 'Equipos Seguridad VP', amount: 4200000, issuedAt: daysAgo(45), dueAt: daysAgo(15), paidAt: daysAgo(20), purchaseId: oc1.id, companyId: cia.id },
      { number: 'FAC-VP-78902', supplier: 'Taller Naval VP', amount: 1350000, issuedAt: daysAgo(35), dueAt: daysAgo(5), paidAt: daysAgo(8), purchaseId: oc3.id, companyId: cia.id },
      { number: 'FAC-VP-12034', supplier: 'MSA Chile', amount: 2900000, issuedAt: daysAgo(20), dueAt: daysAhead(10), purchaseId: oc2.id, companyId: cia.id },
      { number: 'FAC-VP-67890', supplier: 'Petrobras', amount: 195000, issuedAt: daysAgo(30), dueAt: daysAgo(0), paidAt: daysAgo(25), companyId: cia.id },
    ],
  });
  console.log('✅ Compras y facturas');

  // ─── Presupuesto 2026 ─────────────────────────────────────────────────────
  const year = now.getFullYear();
  const budgets = [
    { category: 'EQUIPAMIENTO', description: 'Renovación EPP e intervención', planned: 10000000, executed: 6500000 },
    { category: 'VEHICULOS', description: 'Mantención y combustible flota', planned: 7500000, executed: 4800000 },
    { category: 'PERSONAL', description: 'Capacitación y certificaciones', planned: 4500000, executed: 1100000 },
    { category: 'OPERACIONAL', description: 'Combustible y consumibles', planned: 3200000, executed: 2650000 },
    { category: 'INFRAESTRUCTURA', description: 'Mejoras cuartel Barrio Puerto', planned: 5500000, executed: 1200000 },
    { category: 'CAPACITACION', description: 'Cursos NFPA, RCP, HazMat', planned: 2200000, executed: 980000 },
  ] as const;
  for (const b of budgets) {
    await prisma.budget.create({ data: { year, ...b, companyId: cia.id } });
  }
  console.log('✅ Presupuesto 2026');

  // ─── Tesorería social ─────────────────────────────────────────────────────
  const feeMay = await prisma.membershipFee.create({
    data: {
      name: 'Cuota mensual — Mayo 2026',
      description: 'Aporte ordinario socios activos Cía. 5',
      amount: 15000,
      frequency: 'MENSUAL',
      year: 2026,
      month: 5,
      dueDate: new Date('2026-05-10'),
      companyId: cia.id,
    },
  });
  await prisma.membershipFee.create({
    data: {
      name: 'Cuota mensual — Junio 2026',
      amount: 15000,
      frequency: 'MENSUAL',
      year: 2026,
      month: 6,
      dueDate: new Date('2026-06-10'),
      companyId: cia.id,
    },
  });
  for (let i = 0; i < allMembers.length; i++) {
    const u = allMembers[i];
    await prisma.memberProfile.create({
      data: {
        userId: u.id,
        companyId: cia.id,
        memberNumber: `C5-${String(i + 1).padStart(3, '0')}`,
        status: i === allMembers.length - 1 ? 'MOROSO' : 'ACTIVO',
        joinedAt: new Date(2018 + (i % 5), (i % 12) + 1, 1),
      },
    });
  }
  await prisma.socialContribution.createMany({
    data: [
      { userId: comandante.id, companyId: cia.id, feeId: feeMay.id, amount: 15000, paidAt: daysAgo(12), method: 'TRANSFERENCIA', status: 'PAGADO', receiptNumber: 'TRX-C5-001', recordedBy: tesorero.id },
      { userId: capitan.id, companyId: cia.id, feeId: feeMay.id, amount: 15000, paidAt: daysAgo(11), method: 'EFECTIVO', status: 'PAGADO', recordedBy: tesorero.id },
      { userId: tesorero.id, companyId: cia.id, feeId: feeMay.id, amount: 15000, paidAt: daysAgo(13), method: 'TRANSFERENCIA', status: 'PAGADO', recordedBy: tesorero.id },
      { userId: bombero1.id, companyId: cia.id, feeId: feeMay.id, amount: 15000, paidAt: daysAgo(8), method: 'DEPOSITO', status: 'PAGADO', recordedBy: secretaria.id },
      { userId: bombero2.id, companyId: cia.id, feeId: feeMay.id, amount: 7500, paidAt: daysAgo(5), method: 'EFECTIVO', status: 'PARCIAL', notes: 'Abono parcial', recordedBy: tesorero.id },
      { userId: encMaterial.id, companyId: cia.id, feeId: feeMay.id, amount: 15000, paidAt: daysAgo(10), method: 'TRANSFERENCIA', status: 'PAGADO', recordedBy: tesorero.id },
      { userId: secretaria.id, companyId: cia.id, feeId: feeMay.id, amount: 0, paidAt: daysAgo(14), method: 'OTRO', status: 'EXONERADO', notes: 'Exoneración administrativa', recordedBy: tesorero.id },
    ],
  });
  console.log('✅ Tesorería social');

  // ─── Simulacros y evacuación ────────────────────────────────────────────────
  await prisma.meetingPoint.createMany({
    data: [
      { name: 'Plaza Sotomayor', description: 'Punto reunión principal', location: { lat: -33.0472, lng: -71.6127 }, address: 'Plaza Sotomayor, Valparaíso', capacity: 200, companyId: cia.id },
      { name: 'Estacionamiento cuartel', location: { lat: -33.0388, lng: -71.6265 }, capacity: 80, companyId: cia.id },
    ],
  });
  await prisma.evacuationRoute.create({
    data: {
      name: 'Cuartel → Plaza Sotomayor',
      description: 'Ruta evacuación estándar',
      startPoint: { lat: -33.0388, lng: -71.6265 },
      endPoint: { lat: -33.0472, lng: -71.6127 },
      companyId: cia.id,
    },
  });
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  await prisma.drill.createMany({
    data: [
      { title: 'Simulacro evacuación cuartel', description: 'Evacuación completa y punto encuentro', scheduledAt: nextMonth, status: 'PROGRAMADO', participants: ['Comandancia', 'Guardia'], emergencyPlanId: planIncendio.id, companyId: cia.id },
      { title: 'Simulacro terremoto DCH', description: 'Procedimiento zona segura', scheduledAt: daysAgo(35), executedAt: daysAgo(35), status: 'EJECUTADO', participants: ['Dotación disponible'], companyId: cia.id },
    ],
  });
  console.log('✅ Simulacros y evacuación');

  // ─── Capacitación ─────────────────────────────────────────────────────────
  const in90 = daysAhead(90);
  const in15 = daysAhead(15);
  const expired = daysAgo(20);
  await prisma.memberCertification.createMany({
    data: [
      { name: 'Licencia Clase B', category: 'LICENCIA', issuer: 'Municipalidad VP', issuedAt: daysAgo(400), expiresAt: in90, userId: bombero1.id, companyId: cia.id },
      { name: 'Examen médico operativo', category: 'MEDICO', issuer: 'Mutual', issuedAt: daysAgo(200), expiresAt: in15, userId: bombero2.id, companyId: cia.id, notes: 'Renovar pronto' },
      { name: 'Certificación SCBA', category: 'EPP', issuer: 'Academia CBVP', issuedAt: daysAgo(900), expiresAt: expired, userId: encMaterial.id, companyId: cia.id },
      { name: 'Comando de incidentes', category: 'CURSO', issuer: 'CBN', issuedAt: daysAgo(300), userId: capitan.id, companyId: cia.id },
      { name: 'Licencia Clase B', category: 'LICENCIA', issuedAt: daysAgo(500), expiresAt: in90, userId: bombero4.id, companyId: cia.id },
      { name: 'RCP / DEA', category: 'CURSO', issuer: 'Cruz Roja', issuedAt: daysAgo(180), expiresAt: daysAhead(545), userId: bombero5.id, companyId: cia.id },
    ],
  });
  console.log('✅ Certificaciones');

  // ─── Salud operacional (fichas médicas) ───────────────────────────────────
  const hrComandante = await prisma.healthRecord.create({
    data: {
      userId: comandante.id,
      companyId: cia.id,
      bloodType: 'O_POSITIVE',
      emergencyContact: 'María González',
      emergencyPhone: '+56 9 8765 4321',
      chronicDiseases: JSON.stringify(['Hipertensión controlada']),
      lastCheckupAt: daysAgo(120),
      nextCheckupAt: daysAhead(45),
      notes: 'Apto para comando de incidentes',
    },
  });
  const hrCapitan = await prisma.healthRecord.create({
    data: {
      userId: capitan.id,
      companyId: cia.id,
      bloodType: 'A_POSITIVE',
      emergencyContact: 'Luis Martínez',
      emergencyPhone: '+56 9 7654 3210',
      lastCheckupAt: daysAgo(90),
      nextCheckupAt: daysAhead(12),
    },
  });
  const hrB1 = await prisma.healthRecord.create({
    data: {
      userId: bombero1.id,
      companyId: cia.id,
      bloodType: 'B_POSITIVE',
      emergencyContact: 'Carmen Fuentes',
      emergencyPhone: '+56 9 6543 2109',
      lastCheckupAt: daysAgo(200),
      nextCheckupAt: daysAgo(5),
    },
  });
  const hrB2 = await prisma.healthRecord.create({
    data: {
      userId: bombero2.id,
      companyId: cia.id,
      bloodType: 'AB_NEGATIVE',
      emergencyContact: 'Pedro Vargas',
      emergencyPhone: '+56 9 5432 1098',
      lastCheckupAt: daysAgo(60),
      nextCheckupAt: daysAhead(90),
    },
  });
  const hrB3 = await prisma.healthRecord.create({
    data: {
      userId: bombero3.id,
      companyId: cia.id,
      bloodType: 'O_NEGATIVE',
      emergencyContact: 'Ana Muñoz',
      emergencyPhone: '+56 9 4321 0987',
      surgeries: JSON.stringify(['Menisco 2019']),
      lastCheckupAt: daysAgo(30),
      nextCheckupAt: daysAhead(335),
    },
  });

  await prisma.medicalExam.createMany({
    data: [
      { healthRecordId: hrComandante.id, type: 'FISICO', name: 'Examen médico operativo anual', examDate: daysAgo(120), status: 'NORMAL', result: 'Apto' },
      { healthRecordId: hrCapitan.id, type: 'CARDIOLOGICO', name: 'ECG + ergometría', examDate: daysAgo(90), status: 'NORMAL' },
      { healthRecordId: hrCapitan.id, type: 'PSICOMETRICO', name: 'Evaluación estrés operacional', examDate: daysAhead(20), status: 'PROGRAMADO' },
      { healthRecordId: hrB1.id, type: 'FISICO', name: 'Examen pre-ingreso renovación', examDate: daysAgo(200), status: 'NORMAL' },
      { healthRecordId: hrB1.id, type: 'LABORATORIO', name: 'Perfil lipídico', examDate: daysAgo(10), status: 'ANORMAL', result: 'Colesterol elevado — control nutricional', notes: 'Derivar a médico tratante' },
      { healthRecordId: hrB2.id, type: 'OFTALMOLOGICO', name: 'Agudeza visual nocturna', examDate: daysAgo(60), status: 'NORMAL' },
      { healthRecordId: hrB3.id, type: 'AUDITIVO', name: 'Audiometría ocupacional', examDate: daysAgo(30), status: 'NORMAL' },
    ],
  });
  await prisma.medicalCondition.createMany({
    data: [
      { healthRecordId: hrComandante.id, name: 'Hipertensión arterial', severity: 'MODERADO', isActive: true, diagnosedAt: daysAgo(800) },
      { healthRecordId: hrB3.id, name: 'Lesión rodilla (menisco)', severity: 'LEVE', isActive: true, diagnosedAt: daysAgo(2500) },
    ],
  });
  await prisma.allergy.createMany({
    data: [
      { healthRecordId: hrCapitan.id, name: 'Penicilina', type: 'MEDICAMENTO', severity: 'SEVERO', reaction: 'Urticaria', isActive: true },
      { healthRecordId: hrB1.id, name: 'Mariscos', type: 'ALIMENTO', severity: 'MODERADO', reaction: 'Edema leve', isActive: true },
      { healthRecordId: hrB2.id, name: 'Polen', type: 'AMBIENTAL', severity: 'LEVE', isActive: true },
    ],
  });
  await prisma.medication.createMany({
    data: [
      { healthRecordId: hrComandante.id, name: 'Losartán 50mg', dosage: '1 comp/día', frequency: 'AM', isActive: true, startDate: daysAgo(400) },
      { healthRecordId: hrB3.id, name: 'Ibuprofeno 400mg', dosage: 'SOS', frequency: 'Post guardia', isActive: true },
    ],
  });
  await prisma.vaccination.createMany({
    data: [
      { healthRecordId: hrComandante.id, name: 'Hepatitis B', dose: 'Refuerzo', administeredAt: daysAgo(400), nextDoseAt: daysAhead(700) },
      { healthRecordId: hrB2.id, name: 'Tétanos', dose: 'Dosis única', administeredAt: daysAgo(180), nextDoseAt: daysAhead(3650) },
      { healthRecordId: hrB1.id, name: 'Influenza estacional', administeredAt: daysAgo(120), nextDoseAt: daysAhead(245) },
    ],
  });
  console.log('✅ Salud operacional (5 fichas médicas)');

  // ─── Hidrantes Valparaíso ─────────────────────────────────────────────────
  await prisma.hydrant.createMany({
    data: [
      { code: 'H-VP-001', type: 'COLUMNAR', status: 'OPERATIVO', diameter: 100, pressure: 58, flowRate: 1150, address: 'Av. Argentina 750', location: 'Frente cuartel', latitude: -33.0388, longitude: -71.6265, companyId: cia.id },
      { code: 'H-VP-002', type: 'PIBA', status: 'OPERATIVO', diameter: 64, pressure: 52, flowRate: 780, address: 'Prat 450', location: 'Esquina Urriola', latitude: -33.0455, longitude: -71.6180, companyId: cia.id },
      { code: 'H-VP-003', type: 'COLUMNAR', status: 'OPERATIVO', diameter: 100, pressure: 55, flowRate: 1050, address: 'Plaza Sotomayor', location: 'Sector plaza', latitude: -33.0472, longitude: -71.6127, companyId: cia.id },
      { code: 'H-VP-004', type: 'SUBTERRANEO', status: 'NO_OPERATIVO', diameter: 150, pressure: 0, flowRate: 0, address: 'Muelle Barón', location: 'Bodega 3', latitude: -33.0365, longitude: -71.6058, companyId: cia.id, notes: 'Válvula en reparación ESSBio' },
      { code: 'H-VP-005', type: 'COLUMNAR', status: 'OPERATIVO', diameter: 100, pressure: 60, flowRate: 1200, address: 'Pedro Montt 2100', location: 'Playa Ancha', latitude: -33.0520, longitude: -71.6210, companyId: cia.id },
      { code: 'H-VP-006', type: 'PIBA', status: 'EN_MANTENCION', diameter: 64, pressure: 40, flowRate: 400, address: 'Calle Condell 120', latitude: -33.0440, longitude: -71.6250, companyId: cia.id },
    ],
  });
  console.log('✅ Hidrantes');

  // ─── Comunicados ──────────────────────────────────────────────────────────
  await prisma.announcement.createMany({
    data: [
      { title: 'Guardia especial 21 de mayo', content: 'Se requiere dotación completa para desfile y acto conmemorativo en Plaza Sotomayor.', type: 'EVENT', priority: 'HIGH', eventDate: new Date('2026-05-21T10:00:00'), eventLocation: 'Plaza Sotomayor', publishedBy: 'Mario González', companyId: cia.id, targetAudience: 'ALL_PERSONNEL' },
      { title: 'Renovación cuotas sociales', content: 'Recordatorio: cuota mayo vence el 10. Contactar tesorería para convenios de pago.', type: 'OFFICIAL', priority: 'MEDIUM', publishedBy: 'Sofía Torres', companyId: cia.id },
      { title: 'Simulacro programado', content: 'Próximo simulacro de evacuación — asistencia obligatoria guardia de turno.', type: 'ANNOUNCEMENT', priority: 'URGENT', publishedBy: 'Ana Martínez', companyId: cia.id, expiresAt: daysAhead(30) },
    ],
  });
  console.log('✅ Comunicados');

  console.log('\n🎉 Base de datos demo lista — solo 5ª Compañía Valparaíso');
  console.log('──────────────────────────────────────────────────');
  console.log('  SUPER ADMIN:   admin@nodo360.cl     /  Admin1234!');
  console.log('  COMANDANTE:    gonzalez@cia5.cl      /  Demo1234!');
  console.log('  CAPITÁN:       martinez@cia5.cl      /  Demo1234!');
  console.log('  ENC. MATERIAL: lopez@cia5.cl        /  Demo1234!');
  console.log('  TESORERO:      torres@cia5.cl       /  Demo1234!');
  console.log('  BOMBERO:       fuentes@cia5.cl      /  Demo1234!');
  console.log('  AUDITOR:       soto@cia5.cl        /  Demo1234!');
  console.log('──────────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
