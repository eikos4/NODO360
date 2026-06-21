/**
 * Seed demo NODO360 — Cuerpo de Bomberos de Parral (Región del Maule)
 * Pobla todos los módulos con datos coherentes para demostración.
 * Referencia: https://www.bomberos.cl/cuerpo-de-bomberos-parral
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
const memberPhoto = (first: string, last: string) =>
  `https://api.dicebear.com/7.x/notionists/png?seed=${encodeURIComponent(first + last)}&size=256&backgroundColor=0f172a,1e293b,334155`;

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

const HQ_IMAGE = 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1200&h=800&fit=crop';
const CUERPO_PHONE = '+56 73 246 2600';
const CUERPO_EMAIL = 'contacto@bomberosparral.cl';

/** Las 6 compañías del Cuerpo de Bomberos de Parral */
const COMPANIES_SPEC = [
  {
    number: 1,
    name: 'Primera Compañía de Bomberos de Parral',
    specialty: 'Combate de incendios con agua (compañía fundacional)',
    address: 'Calle Dieciocho 685, Parral',
    city: 'Parral',
    lat: -36.1428,
    lng: -71.8258,
    dispatchSlug: 'bomberos-parral',
    dispatchPublic: true,
  },
  {
    number: 2,
    name: 'Segunda Compañía de Bomberos de Parral',
    specialty: 'Hachas, escalas y salvamento',
    address: 'Calle Dieciocho 685, Parral',
    city: 'Parral',
    lat: -36.1429,
    lng: -71.8256,
    dispatchSlug: 'parral-segunda',
    dispatchPublic: true,
  },
  {
    number: 3,
    name: 'Tercera Compañía de Bomberos de Parral',
    specialty: 'Apoyo estructural y rescate',
    address: 'Calle Dieciocho 685, Parral',
    city: 'Parral',
    lat: -36.1427,
    lng: -71.8260,
    dispatchSlug: 'parral-tercera',
    dispatchPublic: true,
  },
  {
    number: 4,
    name: 'Cuarta Compañía de Bomberos de Parral',
    specialty: 'Resguardo vecinal sector periférico urbano',
    address: 'Pasaje Plaza 345, sector norte, Parral',
    city: 'Parral',
    lat: -36.1385,
    lng: -71.8310,
    dispatchSlug: 'parral-cuarta',
    dispatchPublic: true,
  },
  {
    number: 5,
    name: 'Quinta Compañía de Bomberos de Parral',
    specialty: 'Emergencias forestales y rescate cordillerano (Catillo)',
    address: 'Localidad de Catillo, Parral',
    city: 'Catillo',
    lat: -36.2876,
    lng: -71.6518,
    dispatchSlug: 'parral-quinta-catillo',
    dispatchPublic: true,
  },
  {
    number: 6,
    name: 'Sexta Compañía de Bomberos de Parral',
    specialty: 'Cobertura zona sur rural y rutas secundarias (Remulcao)',
    address: 'Camino Parral–Catillo km 17, Remulcao, Parral',
    city: 'Remulcao',
    lat: -36.1985,
    lng: -71.7820,
    dispatchSlug: 'parral-sexta-remulcao',
    dispatchPublic: true,
  },
] as const;

async function main() {
  console.log('🌱 NODO360 — Reseteando BD demo (Cuerpo de Bomberos de Parral — 6 compañías)...\n');
  await clearDatabase();

  // ─── 6 Compañías del Cuerpo ───────────────────────────────────────────────
  const companies = await Promise.all(
    COMPANIES_SPEC.map((spec) =>
      prisma.company.create({
        data: {
          number: spec.number,
          name: spec.name,
          region: 'Maule',
          city: spec.city,
          address: spec.address,
          phone: CUERPO_PHONE,
          email: CUERPO_EMAIL,
          dispatchSlug: 'dispatchSlug' in spec ? spec.dispatchSlug : null,
          dispatchPublicEnabled: 'dispatchPublic' in spec ? !!spec.dispatchPublic : false,
          dispatchAvailable: true,
          logoUrl: `https://api.dicebear.com/7.x/identicon/png?seed=parral-cia${spec.number}&size=128`,
          headquartersImageUrl: HQ_IMAGE,
        },
      }),
    ),
  );
  const [c1, c2, c3, c4, c5, c6] = companies;
  const cia = c1; // administración central y botonera
  console.log('✅ 6 compañías — Primera a Sexta (Parral)');

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
      companyId: c1.id,
      photoUrl: memberPhoto('Carlos', 'Rodríguez'),
    },
  });
  const comandante = await prisma.user.create({
    data: { rut: '13.456.789-0', firstName: 'Mario', lastName: 'González', email: 'gonzalez@bomberosparral.cl', passwordHash: pwd, role: 'COMANDANTE', companyId: c1.id, photoUrl: memberPhoto('Mario', 'González') },
  });
  const capitan = await prisma.user.create({
    data: { rut: '14.567.890-1', firstName: 'Ana', lastName: 'Martínez', email: 'martinez@bomberosparral.cl', passwordHash: pwd, role: 'CAPITAN', companyId: c1.id, stationAvailable: true, stationAvailableAt: now, photoUrl: memberPhoto('Ana', 'Martínez'), isMaquinista: true, maquinistaAvailable: true },
  });
  const encMaterial = await prisma.user.create({
    data: { rut: '15.678.901-2', firstName: 'Pedro', lastName: 'López', email: 'lopez@bomberosparral.cl', passwordHash: pwd, role: 'ENCARGADO_MATERIAL', companyId: c1.id, stationAvailable: true, stationAvailableAt: now, photoUrl: memberPhoto('Pedro', 'López'), isMaquinista: true, maquinistaAvailable: true, maquinistaPrincipal: true },
  });
  const tesorero = await prisma.user.create({
    data: { rut: '16.789.012-3', firstName: 'Sofía', lastName: 'Torres', email: 'torres@bomberosparral.cl', passwordHash: pwd, role: 'TESORERO', companyId: c1.id, photoUrl: memberPhoto('Sofía', 'Torres') },
  });
  const secretaria = await prisma.user.create({
    data: { rut: '17.890.123-4', firstName: 'Valentina', lastName: 'Pérez', email: 'perez@bomberosparral.cl', passwordHash: pwd, role: 'SECRETARIO', companyId: c1.id, photoUrl: memberPhoto('Valentina', 'Pérez') },
  });
  const auditor = await prisma.user.create({
    data: { rut: '23.456.789-0', firstName: 'Isabel', lastName: 'Soto', email: 'soto@bomberosparral.cl', passwordHash: pwd, role: 'AUDITOR', companyId: c1.id, photoUrl: memberPhoto('Isabel', 'Soto') },
  });
  const operadorCentral = await prisma.user.create({
    data: {
      rut: '39.012.345-6',
      firstName: 'Karen',
      lastName: 'Bravo',
      email: 'central@bomberosparral.cl',
      passwordHash: pwd,
      role: 'OPERADOR_CENTRAL',
      companyId: c1.id,
      photoUrl: memberPhoto('Karen', 'Bravo'),
    },
  });
  const bombero1 = await prisma.user.create({
    data: { rut: '18.901.234-5', firstName: 'Diego', lastName: 'Fuentes', email: 'fuentes@bomberosparral.cl', passwordHash: pwd, role: 'BOMBERO', companyId: c1.id, stationAvailable: true, stationAvailableAt: now, photoUrl: memberPhoto('Diego', 'Fuentes'), isMaquinista: true, maquinistaAvailable: true },
  });
  const bombero2 = await prisma.user.create({
    data: { rut: '19.012.345-6', firstName: 'Camila', lastName: 'Vargas', email: 'vargas@bomberosparral.cl', passwordHash: pwd, role: 'BOMBERO', companyId: c1.id, stationAvailable: true, stationAvailableAt: now, photoUrl: memberPhoto('Camila', 'Vargas') },
  });
  const bombero3 = await prisma.user.create({
    data: { rut: '20.123.456-7', firstName: 'Andrés', lastName: 'Muñoz', email: 'munoz@bomberosparral.cl', passwordHash: pwd, role: 'BOMBERO', companyId: c1.id, stationAvailable: true, stationAvailableAt: now, photoUrl: memberPhoto('Andrés', 'Muñoz'), isMaquinista: true },
  });

  const cap2 = await prisma.user.create({
    data: { rut: '24.567.890-1', firstName: 'Roberto', lastName: 'Silva', email: 'silva@bomberosparral.cl', passwordHash: pwd, role: 'CAPITAN', companyId: c2.id, stationAvailable: true, stationAvailableAt: now, photoUrl: memberPhoto('Roberto', 'Silva'), isMaquinista: true, maquinistaAvailable: true },
  });
  const b2a = await prisma.user.create({
    data: { rut: '25.678.901-2', firstName: 'Patricia', lastName: 'Herrera', email: 'herrera@bomberosparral.cl', passwordHash: pwd, role: 'BOMBERO', companyId: c2.id, stationAvailable: true, stationAvailableAt: now, photoUrl: memberPhoto('Patricia', 'Herrera') },
  });
  const b2b = await prisma.user.create({
    data: { rut: '26.789.012-3', firstName: 'Felipe', lastName: 'Contreras', email: 'contreras@bomberosparral.cl', passwordHash: pwd, role: 'BOMBERO', companyId: c2.id, photoUrl: memberPhoto('Felipe', 'Contreras') },
  });

  const cap3 = await prisma.user.create({
    data: { rut: '27.890.123-4', firstName: 'Claudia', lastName: 'Ramírez', email: 'ramirez@bomberosparral.cl', passwordHash: pwd, role: 'CAPITAN', companyId: c3.id, stationAvailable: true, stationAvailableAt: now, photoUrl: memberPhoto('Claudia', 'Ramírez'), isMaquinista: true },
  });
  const b3a = await prisma.user.create({
    data: { rut: '28.901.234-5', firstName: 'Tomás', lastName: 'Aguilera', email: 'aguilera@bomberosparral.cl', passwordHash: pwd, role: 'BOMBERO', companyId: c3.id, stationAvailable: true, stationAvailableAt: now, photoUrl: memberPhoto('Tomás', 'Aguilera') },
  });
  const b3b = await prisma.user.create({
    data: { rut: '29.012.345-6', firstName: 'Daniela', lastName: 'Molina', email: 'molina@bomberosparral.cl', passwordHash: pwd, role: 'BOMBERO', companyId: c3.id, photoUrl: memberPhoto('Daniela', 'Molina') },
  });

  const cap4 = await prisma.user.create({
    data: { rut: '30.123.456-7', firstName: 'Héctor', lastName: 'Navarro', email: 'navarro@bomberosparral.cl', passwordHash: pwd, role: 'CAPITAN', companyId: c4.id, photoUrl: memberPhoto('Héctor', 'Navarro'), isMaquinista: true },
  });
  const b4a = await prisma.user.create({
    data: { rut: '31.234.567-8', firstName: 'Lorena', lastName: 'Pizarro', email: 'pizarro@bomberosparral.cl', passwordHash: pwd, role: 'BOMBERO', companyId: c4.id, stationAvailable: true, stationAvailableAt: now, photoUrl: memberPhoto('Lorena', 'Pizarro') },
  });
  const b4b = await prisma.user.create({
    data: { rut: '32.345.678-9', firstName: 'Mauricio', lastName: 'Salinas', email: 'salinas@bomberosparral.cl', passwordHash: pwd, role: 'BOMBERO', companyId: c4.id, photoUrl: memberPhoto('Mauricio', 'Salinas') },
  });

  const cap5 = await prisma.user.create({
    data: { rut: '33.456.789-0', firstName: 'Ricardo', lastName: 'Espinoza', email: 'espinoza@bomberosparral.cl', passwordHash: pwd, role: 'CAPITAN', companyId: c5.id, photoUrl: memberPhoto('Ricardo', 'Espinoza'), isMaquinista: true, maquinistaAvailable: true },
  });
  const b5a = await prisma.user.create({
    data: { rut: '34.567.890-1', firstName: 'Natalia', lastName: 'Jara', email: 'jara@bomberosparral.cl', passwordHash: pwd, role: 'BOMBERO', companyId: c5.id, stationAvailable: true, stationAvailableAt: now, photoUrl: memberPhoto('Natalia', 'Jara') },
  });
  const b5b = await prisma.user.create({
    data: { rut: '35.678.901-2', firstName: 'Óscar', lastName: 'Vega', email: 'vega@bomberosparral.cl', passwordHash: pwd, role: 'BOMBERO', companyId: c5.id, photoUrl: memberPhoto('Óscar', 'Vega') },
  });

  const cap6 = await prisma.user.create({
    data: { rut: '36.789.012-3', firstName: 'Paula', lastName: 'Cáceres', email: 'caceres@bomberosparral.cl', passwordHash: pwd, role: 'CAPITAN', companyId: c6.id, photoUrl: memberPhoto('Paula', 'Cáceres'), isMaquinista: true },
  });
  const b6a = await prisma.user.create({
    data: { rut: '37.890.123-4', firstName: 'Sebastián', lastName: 'Ortiz', email: 'ortiz@bomberosparral.cl', passwordHash: pwd, role: 'BOMBERO', companyId: c6.id, stationAvailable: true, stationAvailableAt: now, photoUrl: memberPhoto('Sebastián', 'Ortiz') },
  });
  const b6b = await prisma.user.create({
    data: { rut: '38.901.234-5', firstName: 'Francisca', lastName: 'Lagos', email: 'lagos@bomberosparral.cl', passwordHash: pwd, role: 'BOMBERO', companyId: c6.id, photoUrl: memberPhoto('Francisca', 'Lagos') },
  });

  const allMembers = [
    comandante, capitan, encMaterial, tesorero, secretaria, auditor,
    bombero1, bombero2, bombero3,
    cap2, b2a, b2b, cap3, b3a, b3b, cap4, b4a, b4b, cap5, b5a, b5b, cap6, b6a, b6b,
  ];
  console.log(`✅ ${allMembers.length + 2} usuarios demo (incl. operador central)`);

  // ─── Vehículos (uno principal por compañía + refuerzo central) ────────────
  const v1 = await prisma.vehicle.create({
    data: { patent: 'BPR-01', brand: 'Mercedes-Benz', model: 'Atego Auto Bomba', year: 2017, type: 'Auto Bomba', status: 'OPERATIVO', kilometers: 68400, lastMaintenanceAt: monthsAgo(2), nextMaintenanceAt: monthsAhead(4), companyId: c1.id, imageUrl: 'https://images.unsplash.com/photo-1544627669-70db9b2c9d1b?w=640&h=400&fit=crop', principalMaquinistaId: bombero1.id },
  });
  const v2 = await prisma.vehicle.create({
    data: { patent: 'BPR-02', brand: 'Magirus', model: 'DLK Escala', year: 2015, type: 'Escala', status: 'OPERATIVO', kilometers: 92100, lastMaintenanceAt: monthsAgo(1), nextMaintenanceAt: monthsAhead(5), companyId: c2.id, imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=640&h=400&fit=crop', principalMaquinistaId: cap2.id },
  });
  const v3 = await prisma.vehicle.create({
    data: { patent: 'BPR-03', brand: 'Mercedes-Benz', model: 'Sprinter Rescate', year: 2020, type: 'Rescate', status: 'OPERATIVO', kilometers: 31800, lastMaintenanceAt: monthsAgo(3), nextMaintenanceAt: monthsAhead(2), companyId: c3.id, imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=640&h=400&fit=crop', principalMaquinistaId: cap3.id },
  });
  const v4 = await prisma.vehicle.create({
    data: { patent: 'BPR-04', brand: 'Iveco', model: 'Daily Auto Bomba', year: 2014, type: 'Auto Bomba', status: 'OPERATIVO', kilometers: 112500, lastMaintenanceAt: monthsAgo(2), nextMaintenanceAt: monthsAhead(3), companyId: c4.id, imageUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=640&h=400&fit=crop', principalMaquinistaId: cap4.id },
  });
  const v5 = await prisma.vehicle.create({
    data: { patent: 'BPR-05', brand: 'Mercedes-Benz', model: 'Unimog Forestal', year: 2012, type: 'Forestal', status: 'OPERATIVO', kilometers: 145200, lastMaintenanceAt: monthsAgo(1), nextMaintenanceAt: monthsAhead(6), companyId: c5.id, imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=640&h=400&fit=crop', principalMaquinistaId: cap5.id },
  });
  const v6 = await prisma.vehicle.create({
    data: { patent: 'BPR-06', brand: 'Toyota', model: 'Hilux 4x4 Rescate', year: 2019, type: 'Utilitario', status: 'OPERATIVO', kilometers: 87200, lastMaintenanceAt: monthsAgo(2), nextMaintenanceAt: monthsAhead(4), companyId: c6.id, imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=640&h=400&fit=crop', principalMaquinistaId: cap6.id },
  });
  const v7 = await prisma.vehicle.create({
    data: { patent: 'BPR-07', brand: 'Scania', model: 'P360 Escala Aérea', year: 2016, type: 'Escala Aérea', status: 'EN_REPARACION', kilometers: 98500, lastMaintenanceAt: monthsAgo(4), nextMaintenanceAt: monthsAhead(-1), companyId: c1.id, imageUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=640&h=400&fit=crop', principalMaquinistaId: capitan.id },
  });
  console.log('✅ 7 vehículos (flota distribuida en 6 compañías)');

  // ─── Equipamiento (por especialidad de compañía) ──────────────────────────
  await prisma.equipment.createMany({
    data: [
      { code: 'EQ-C1-001', name: 'Manguera 38mm 30m', category: 'Mangueras', status: 'OPERATIVO', purchaseDate: daysAgo(500), quantity: 8, companyId: c1.id },
      { code: 'EQ-C1-002', name: 'Monitor de chorro', category: 'Ataque', status: 'OPERATIVO', serial: 'PR-2023-002', purchaseDate: daysAgo(400), quantity: 2, companyId: c1.id },
      { code: 'EQ-C1-003', name: 'Equipo Autónomo SCBA Scott', category: 'Respiración', status: 'OPERATIVO', serial: 'PR-2021-003', purchaseDate: daysAgo(1100), expiresAt: daysAhead(25), quantity: 2, companyId: c1.id },
      { code: 'EQ-C1-004', name: 'Equipo Autónomo SCBA Scott', category: 'Respiración', status: 'EN_REPARACION', serial: 'PR-2021-004', purchaseDate: daysAgo(1100), expiresAt: daysAhead(-5), quantity: 1, companyId: c1.id },
      { code: 'EQ-C2-001', name: 'Hacha de rescate', category: 'Herramientas', status: 'OPERATIVO', quantity: 6, companyId: c2.id },
      { code: 'EQ-C2-002', name: 'Escalera telescópica 10m', category: 'Escalas', status: 'OPERATIVO', quantity: 3, companyId: c2.id },
      { code: 'EQ-C3-001', name: 'Kit Rescate Vehicular Holmatro', category: 'Rescate', status: 'OPERATIVO', serial: 'PR-2019-007', purchaseDate: daysAgo(1500), quantity: 1, companyId: c3.id },
      { code: 'EQ-C3-002', name: 'Desfibrilador Zoll AED', category: 'Médico', status: 'OPERATIVO', serial: 'PR-2024-006', purchaseDate: daysAgo(180), expiresAt: daysAhead(600), quantity: 1, companyId: c3.id },
      { code: 'EQ-C4-001', name: 'Traje Aproximación NFPA', category: 'EPP', status: 'OPERATIVO', serial: 'PR-2022-001', purchaseDate: daysAgo(800), expiresAt: daysAhead(120), quantity: 2, companyId: c4.id },
      { code: 'EQ-C5-001', name: 'Motosierra Stihl MS 461', category: 'Forestal', status: 'OPERATIVO', serial: 'PR-2020-008', purchaseDate: daysAgo(700), quantity: 2, companyId: c5.id },
      { code: 'EQ-C5-002', name: 'Mochila forestal 20L', category: 'Forestal', status: 'OPERATIVO', quantity: 6, companyId: c5.id },
      { code: 'EQ-C6-001', name: 'Kit primeros auxilios rural', category: 'Médico', status: 'OPERATIVO', quantity: 2, companyId: c6.id },
      { code: 'EQ-C6-002', name: 'Detector gases Altair 5X', category: 'Detección', status: 'OPERATIVO', serial: 'PR-2023-009', purchaseDate: daysAgo(200), expiresAt: daysAhead(500), quantity: 1, companyId: c6.id },
    ],
  });
  console.log('✅ 13 equipos (distribuidos en 6 compañías)');

  // ─── Mantenciones ─────────────────────────────────────────────────────────
  await prisma.maintenance.createMany({
    data: [
      { type: 'PREVENTIVA', description: 'Mantención mayor escala — aceite, filtros, hidráulica', cost: 420000, date: monthsAgo(2), workshopName: 'Taller Diesel Maule', vehicleId: v1.id },
      { type: 'REVISION', description: 'Inspección pre-operacional mensual', cost: 55000, date: monthsAgo(1), workshopName: 'Taller Cuerpo Parral', vehicleId: v1.id },
      { type: 'PREVENTIVA', description: 'Frenos y neumáticos auto bomba', cost: 380000, date: monthsAgo(1), workshopName: 'Repuestos Parral SpA', vehicleId: v2.id },
      { type: 'CORRECTIVA', description: 'Reparación sistema refrigeración Sprinter', cost: 210000, date: monthsAgo(3), workshopName: 'Servicio Técnico Linares', vehicleId: v3.id },
      { type: 'PREVENTIVA', description: 'Revisión estructura escalera aérea BPR-07', cost: 520000, date: monthsAgo(2), workshopName: 'Magirus Chile', vehicleId: v7.id },
    ],
  });
  console.log('✅ 5 mantenciones');

  // ─── Planes de emergencia ─────────────────────────────────────────────────
  const planIncendio = await prisma.emergencyPlan.create({
    data: {
      title: 'Plan incendio estructural — Centro urbano Parral',
      description: 'Procedimiento para incendios en edificaciones del casco histórico y comercio de Parral',
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
      description: 'Procedimiento extricación en Ruta L-55 y caminos rurales del valle de Parral',
      emergencyType: 'ACCIDENTE',
      severity: 'MEDIA',
      status: 'ACTIVE',
      version: 1,
      procedures: { steps: ['Asegurar escena', 'Estabilización vehículo', 'Extricación', 'Traslado SAMU'] },
      checklist: [
        { id: '1', text: 'Perímetro de seguridad 50m', required: true, order: 1 },
        { id: '2', text: 'Kit Holmatro operativo', required: true, order: 2 },
      ],
      companyId: c3.id,
    },
  });
  const planForestal = await prisma.emergencyPlan.create({
    data: {
      title: 'Plan incendio forestal — Catillo y cordillera',
      description: 'Procedimiento para incendios rurales y forestales en zona cordillerana de Parral',
      emergencyType: 'INCENDIO',
      severity: 'ALTA',
      status: 'ACTIVE',
      version: 1,
      procedures: { steps: ['Evaluar viento y combustible', 'Despachar 5ª Compañía', 'Línea de control', 'Apoyo CONAF si aplica'] },
      checklist: [
        { id: '1', text: 'Confirmar acceso camino Catillo', required: true, order: 1 },
        { id: '2', text: 'Dotación forestal y motosierras', required: true, order: 2 },
      ],
      companyId: c5.id,
    },
  });
  const planChecklist = snapshotPlanChecklist(planIncendio.checklist);

  // ─── Emergencias ──────────────────────────────────────────────────────────
  const inc1 = await prisma.incident.create({
    data: {
      code: 'C1-20260501-142200',
      type: 'Incendio Estructural',
      description: 'Incendio en vivienda adosada sector centro. Evacuación de 3 familias.',
      address: 'Calle Arturo Prat 312, Parral',
      latitude: -36.1441,
      longitude: -71.8238,
      dispatchedAt: new Date('2026-05-01T14:22:00'),
      arrivedAt: new Date('2026-05-01T14:35:00'),
      closedAt: new Date('2026-05-01T18:10:00'),
      report: 'Controlado sin víctimas fatales. 1 herido leve por inhalación de humo.',
      companyId: c1.id,
      dispatchSource: DispatchSource.BOTONERA,
      dispatchNotes: 'Despacho 1ª Compañía — botonera central Dieciocho 685',
      emergencyPlanId: planIncendio.id,
      planChecklist,
    },
  });
  const inc2 = await prisma.incident.create({
    data: {
      code: 'C3-20260503-081500',
      type: 'Rescate Vehicular',
      description: 'Volcamiento camión en curva Ruta L-55. Conductor atrapado.',
      address: 'Ruta L-55 km 8, Parral',
      latitude: -36.1582,
      longitude: -71.8095,
      dispatchedAt: new Date('2026-05-03T08:15:00'),
      arrivedAt: new Date('2026-05-03T08:32:00'),
      closedAt: new Date('2026-05-03T11:00:00'),
      report: 'Rescate exitoso. Traslado a Hospital de Parral.',
      companyId: c3.id,
      dispatchSource: DispatchSource.MANUAL,
    },
  });
  const inc3 = await prisma.incident.create({
    data: {
      code: 'C5-20260508-221000',
      type: 'Incendio Forestal',
      description: 'Incendio en matorral y bodega agrícola. Humo denso sector Catillo.',
      address: 'Camino a Catillo km 12, Parral',
      latitude: -36.2650,
      longitude: -71.6980,
      dispatchedAt: new Date('2026-05-08T22:10:00'),
      arrivedAt: new Date('2026-05-08T22:24:00'),
      closedAt: null,
      companyId: c5.id,
      dispatchSource: DispatchSource.BOTONERA,
      emergencyPlanId: planForestal.id,
      planChecklist: snapshotPlanChecklist(planForestal.checklist),
    },
  });
  const inc4 = await prisma.incident.create({
    data: {
      code: 'C4-20260510-093000',
      type: 'Emergencia Médica',
      description: 'Persona con crisis hipertensiva en comercio. Apoyo SAMU Linares.',
      address: 'Calle Dieciocho 420, Parral',
      latitude: -36.1430,
      longitude: -71.8252,
      dispatchedAt: new Date('2026-05-10T09:30:00'),
      arrivedAt: new Date('2026-05-10T09:42:00'),
      closedAt: new Date('2026-05-10T10:15:00'),
      companyId: c4.id,
    },
  });
  const inc5 = await prisma.incident.create({
    data: {
      code: 'C6-20260512-164000',
      type: 'Rescate Vehicular',
      description: 'Vehículo fuera de camino en ruta secundaria Remulcao. Apoyo extricación.',
      address: 'Camino Parral–Catillo km 17, Remulcao',
      latitude: -36.1985,
      longitude: -71.7820,
      dispatchedAt: new Date('2026-05-12T16:40:00'),
      arrivedAt: new Date('2026-05-12T16:58:00'),
      closedAt: new Date('2026-05-12T20:30:00'),
      report: 'Conductor extraído sin lesiones graves. Vehículo retirado por grúa.',
      companyId: c6.id,
    },
  });
  const inc6 = await prisma.incident.create({
    data: {
      code: 'C2-20260514-110000',
      type: 'Incendio Estructural',
      description: 'HazMat leve — derrame combustible en taller mecánico sector norte.',
      address: 'Pasaje Plaza 280, Parral',
      latitude: -36.1388,
      longitude: -71.8305,
      dispatchedAt: new Date('2026-05-14T11:00:00'),
      arrivedAt: new Date('2026-05-14T11:18:00'),
      closedAt: new Date('2026-05-14T13:45:00'),
      report: 'Derrame contenido. Sin evacuación masiva.',
      companyId: c2.id,
    },
  });

  await prisma.incidentParticipant.createMany({
    data: [
      { incidentId: inc1.id, userId: comandante.id }, { incidentId: inc1.id, userId: capitan.id },
      { incidentId: inc1.id, userId: bombero1.id }, { incidentId: inc1.id, userId: bombero2.id },
      { incidentId: inc2.id, userId: cap3.id }, { incidentId: inc2.id, userId: b3a.id }, { incidentId: inc2.id, userId: b3b.id },
      { incidentId: inc3.id, userId: cap5.id }, { incidentId: inc3.id, userId: b5a.id }, { incidentId: inc3.id, userId: b5b.id },
      { incidentId: inc4.id, userId: b4a.id }, { incidentId: inc5.id, userId: cap6.id }, { incidentId: inc5.id, userId: b6a.id },
      { incidentId: inc6.id, userId: cap2.id }, { incidentId: inc6.id, userId: b2a.id },
    ],
  });
  await prisma.incidentVehicle.createMany({
    data: [
      { incidentId: inc1.id, vehicleId: v1.id }, { incidentId: inc1.id, vehicleId: v2.id },
      { incidentId: inc2.id, vehicleId: v3.id }, { incidentId: inc2.id, vehicleId: v1.id },
      { incidentId: inc3.id, vehicleId: v5.id }, { incidentId: inc3.id, vehicleId: v6.id },
      { incidentId: inc5.id, vehicleId: v6.id }, { incidentId: inc6.id, vehicleId: v4.id },
    ],
  });
  console.log('✅ 6 emergencias en 6 compañías');

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
      { logId: guardLogToday.id, type: 'REVISION', title: 'Revisión matinal cuartel central', content: 'Sala máquinas 1ª–3ª Compañía OK. Carros BPR-01 y BPR-02 operativos en Dieciocho 685.', authorId: capitan.id },
      { logId: guardLogToday.id, type: 'NOVEDAD', title: 'Visita inspector municipal', content: 'Extintores y señalética conformes en cuartel central.', authorId: secretaria.id },
      { logId: guardLogToday.id, type: 'NOVEDAD', title: `Despacho ${inc3.code}`, content: 'Emergencia forestal Catillo — 5ª Compañía en terreno. Central en coordinación.', authorId: capitan.id, incidentId: inc3.id },
      { logId: guardLogToday.id, type: 'MANTENIMIENTO', title: 'SCBA en taller', content: 'EQ-C1-004 en revisión por válvula.', authorId: encMaterial.id },
    ],
  });
  await prisma.guardHandover.create({
    data: {
      logId: guardLogToday.id,
      fromUserId: capitan.id,
      toUserId: bombero1.id,
      summary: 'Turno día estable. Emergencia incendio rural en curso.',
      observations: 'Coordinar con 5ª Compañía (Catillo). Actualizar odómetro BPR-05.',
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
      content: 'Evacuación cuartel central 8 min. Participaron voluntarios 1ª a 3ª Compañía.',
      authorId: bombero2.id,
    },
  });
  console.log('✅ Bitácora (2 días)');

  // ─── Auditorías ───────────────────────────────────────────────────────────
  const auditClosed = await prisma.inventoryAudit.create({
    data: {
      code: `AUD-${now.getFullYear()}-001`,
      title: 'Auditoría física Q1 — Cuerpo Parral (6 compañías)',
      status: InventoryAuditStatus.CERRADA,
      companyId: cia.id,
      auditorId: auditor.id,
      startedAt: daysAgo(45),
      completedAt: daysAgo(40),
      closingNotes: '1 diferencia menor en mangueras — corregida.',
    },
  });
  const vehicles = await prisma.vehicle.findMany({ where: { companyId: { in: companies.map((c) => c.id) } } });
  const equip = await prisma.equipment.findMany({ where: { companyId: { in: companies.map((c) => c.id) } } });
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
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(45), vehicleId: v1.id, companyId: cia.id, driverId: bombero1.id, registeredById: encMaterial.id, odometerKm: 67800, fuelLiters: 195, fuelCost: 310000, fuelStation: 'Copec Dieciocho', fullTank: true },
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(28), vehicleId: v1.id, companyId: cia.id, driverId: bombero2.id, registeredById: encMaterial.id, odometerKm: 68100, fuelLiters: 170, fuelCost: 272000, fuelStation: 'Petrobras Arturo Prat', fullTank: true },
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(12), vehicleId: v1.id, companyId: cia.id, driverId: bombero1.id, registeredById: encMaterial.id, odometerKm: 68400, fuelLiters: 185, fuelCost: 295000, fuelStation: 'Copec Victoria', fullTank: true },
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(8), vehicleId: v2.id, companyId: c2.id, driverId: cap2.id, registeredById: encMaterial.id, odometerKm: 91800, fuelLiters: 130, fuelCost: 208000, fuelStation: 'Shell Ruta L-55', fullTank: false },
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(3), vehicleId: v2.id, companyId: c2.id, driverId: b2a.id, registeredById: encMaterial.id, odometerKm: 92100, fuelLiters: 145, fuelCost: 232000, fuelStation: 'Copec Dieciocho', fullTank: true },
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(20), vehicleId: v4.id, companyId: c4.id, driverId: cap4.id, registeredById: encMaterial.id, odometerKm: 112000, fuelLiters: 220, fuelCost: 350000, fuelStation: 'Petrobras', fullTank: true },
      { type: FleetLogType.COMBUSTIBLE, date: daysAgoFleet(5), vehicleId: v5.id, companyId: c5.id, driverId: b5a.id, registeredById: encMaterial.id, odometerKm: 145200, fuelLiters: 200, fuelCost: 318000, fuelStation: 'Copec Catillo', fullTank: true },
      { type: FleetLogType.SERVICIO, date: daysAgoFleet(7), vehicleId: v3.id, companyId: c3.id, driverId: b3a.id, registeredById: encMaterial.id, odometerKm: 31950, serviceLabel: 'Revisión pre-salida', description: 'Luces, frenos, niveles OK' },
      { type: FleetLogType.OPERACION, date: daysAgoFleet(1), vehicleId: v5.id, companyId: c5.id, driverId: cap5.id, registeredById: capitan.id, odometerKm: 145250, serviceLabel: `Salida ${inc3.code}`, description: 'Despacho incendio forestal Catillo' },
    ],
  });
  await prisma.vehicle.update({ where: { id: v1.id }, data: { kilometers: 68450 } });
  await prisma.vehicle.update({ where: { id: v2.id }, data: { kilometers: 92100 } });
  await prisma.vehicle.update({ where: { id: v5.id }, data: { kilometers: 145250 } });
  console.log('✅ Libro flota (9 registros)');

  // ─── Documentos ───────────────────────────────────────────────────────────
  await prisma.document.createMany({
    data: [
      { title: 'Manual Operaciones Cuerpo Parral', category: 'Protocolo', fileUrl: '/uploads/demo-manual-parral.pdf', uploadedBy: 'Mario González', companyId: cia.id },
      { title: 'Protocolo HazMat sector rural', category: 'Protocolo', fileUrl: '/uploads/demo-hazmat.pdf', uploadedBy: 'Ana Martínez', companyId: cia.id, expiresAt: daysAhead(200) },
      { title: 'Acta Directiva Mayo 2026', category: 'Acta', fileUrl: '/uploads/demo-acta.pdf', uploadedBy: 'Valentina Pérez', companyId: cia.id },
      { title: 'Convenio Mutual Seguridad', category: 'Convenio', fileUrl: '/uploads/demo-convenio.pdf', uploadedBy: 'Valentina Pérez', companyId: cia.id, expiresAt: daysAhead(20) },
      { title: 'Rev. técnica BPR-01', category: 'Certificado', fileUrl: '/uploads/demo-rev-01.pdf', uploadedBy: 'Pedro López', companyId: c1.id, expiresAt: daysAhead(15) },
      { title: 'Rev. técnica BPR-05', category: 'Certificado', fileUrl: '/uploads/demo-rev-05.pdf', uploadedBy: 'Pedro López', companyId: c5.id, expiresAt: daysAhead(-25) },
      { title: 'Informe Anual 2025', category: 'Informe', fileUrl: '/uploads/demo-informe.pdf', uploadedBy: 'Mario González', companyId: cia.id },
    ],
  });
  console.log('✅ Documentos');

  // ─── Compras y facturas ─────────────────────────────────────────────────────
  const oc1 = await prisma.purchase.create({
    data: { number: 'OC-PR-2026-001', description: 'Trajes aproximación NFPA x4', supplier: 'Equipos Seguridad Maule', status: 'RECIBIDA', totalAmount: 4200000, approvedAt: daysAgo(60), receivedAt: daysAgo(45), companyId: cia.id },
  });
  const oc2 = await prisma.purchase.create({
    data: { number: 'OC-PR-2026-002', description: 'SCBA Scott x2 + repuestos', supplier: 'MSA Chile', status: 'APROBADA', totalAmount: 5800000, approvedAt: daysAgo(25), companyId: cia.id },
  });
  const oc3 = await prisma.purchase.create({
    data: { number: 'OC-PR-2026-003', description: 'Mantención preventiva flota', supplier: 'Taller Diesel Maule', status: 'RECIBIDA', totalAmount: 1350000, approvedAt: daysAgo(50), receivedAt: daysAgo(35), companyId: cia.id },
  });
  await prisma.purchase.create({
    data: { number: 'OC-PR-2026-004', description: 'Mangueras y acoples Storz', supplier: 'Contra Incendio Chile', status: 'PENDIENTE', totalAmount: 920000, companyId: cia.id },
  });
  await prisma.invoice.createMany({
    data: [
      { number: 'FAC-PR-45231', supplier: 'Equipos Seguridad Maule', amount: 4200000, issuedAt: daysAgo(45), dueAt: daysAgo(15), paidAt: daysAgo(20), purchaseId: oc1.id, companyId: cia.id },
      { number: 'FAC-PR-78902', supplier: 'Taller Diesel Maule', amount: 1350000, issuedAt: daysAgo(35), dueAt: daysAgo(5), paidAt: daysAgo(8), purchaseId: oc3.id, companyId: cia.id },
      { number: 'FAC-PR-12034', supplier: 'MSA Chile', amount: 2900000, issuedAt: daysAgo(20), dueAt: daysAhead(10), purchaseId: oc2.id, companyId: cia.id },
      { number: 'FAC-PR-67890', supplier: 'Petrobras', amount: 195000, issuedAt: daysAgo(30), dueAt: daysAgo(0), paidAt: daysAgo(25), companyId: cia.id },
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
    { category: 'INFRAESTRUCTURA', description: 'Mejoras cuartel Calle Dieciocho', planned: 5500000, executed: 1200000 },
    { category: 'CAPACITACION', description: 'Cursos NFPA, RCP, HazMat', planned: 2200000, executed: 980000 },
  ] as const;
  for (const company of companies) {
    for (const b of budgets) {
      const scale = company.number === 1 ? 1 : company.number <= 3 ? 0.35 : 0.2;
      await prisma.budget.create({
        data: {
          year,
          category: b.category,
          description: `${b.description} — ${company.name}`,
          planned: Math.round(b.planned * scale),
          executed: Math.round(b.executed * scale),
          companyId: company.id,
        },
      });
    }
  }
  console.log('✅ Presupuesto 2026 (6 compañías)');

  // ─── Tesorería social ─────────────────────────────────────────────────────
  const feeMay = await prisma.membershipFee.create({
    data: {
      name: 'Cuota mensual — Mayo 2026',
      description: 'Aporte ordinario socios activos Cuerpo de Bomberos de Parral',
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
    const companyNum = companies.find((c) => c.id === u.companyId)?.number ?? 1;
    await prisma.memberProfile.create({
      data: {
        userId: u.id,
        companyId: u.companyId!,
        memberNumber: `PRL-${companyNum}-${String((i % 20) + 1).padStart(3, '0')}`,
        status: i === allMembers.length - 1 ? 'MOROSO' : 'ACTIVO',
        joinedAt: new Date(2018 + (i % 5), (i % 12) + 1, 1),
      },
    });
  }
  await prisma.socialContribution.createMany({
    data: [
      { userId: comandante.id, companyId: cia.id, feeId: feeMay.id, amount: 15000, paidAt: daysAgo(12), method: 'TRANSFERENCIA', status: 'PAGADO', receiptNumber: 'TRX-PRL-001', recordedBy: tesorero.id },
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
      { name: 'Plaza de Armas de Parral', description: 'Punto reunión principal evacuación', location: { lat: -36.1435, lng: -71.8220 }, address: 'Plaza de Armas, Parral', capacity: 150, companyId: cia.id },
      { name: 'Estacionamiento cuartel', location: { lat: -36.1428, lng: -71.8258 }, address: 'Calle Dieciocho 685', capacity: 60, companyId: cia.id },
    ],
  });
  await prisma.evacuationRoute.create({
    data: {
      name: 'Cuartel → Plaza de Armas',
      description: 'Ruta evacuación estándar',
      startPoint: { lat: -36.1428, lng: -71.8258 },
      endPoint: { lat: -36.1435, lng: -71.8220 },
      companyId: cia.id,
    },
  });
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  await prisma.drill.createMany({
    data: [
      { title: 'Simulacro evacuación cuartel', description: 'Evacuación completa y punto encuentro', scheduledAt: nextMonth, status: 'PROGRAMADO', participants: ['Comandancia', 'Guardia'], emergencyPlanId: planIncendio.id, companyId: cia.id },
      { title: 'Simulacro forestal Catillo', description: 'Ejercicio 5ª Compañía — línea de control y motosierras', scheduledAt: daysAgo(20), executedAt: daysAgo(20), status: 'EJECUTADO', participants: ['5ª Compañía', '6ª Compañía'], emergencyPlanId: planForestal.id, companyId: c5.id },
    ],
  });
  console.log('✅ Simulacros y evacuación');

  // ─── Capacitación ─────────────────────────────────────────────────────────
  const in90 = daysAhead(90);
  const in15 = daysAhead(15);
  const expired = daysAgo(20);
  await prisma.memberCertification.createMany({
    data: [
      { name: 'Licencia Clase B', category: 'LICENCIA', issuer: 'Municipalidad de Parral', issuedAt: daysAgo(400), expiresAt: in90, userId: bombero1.id, companyId: cia.id },
      { name: 'Certificación Maquinista', category: 'HABILITACION', issuer: 'Academia Nacional de Bomberos', issuedAt: daysAgo(600), expiresAt: in90, userId: encMaterial.id, companyId: cia.id },
      { name: 'Certificación Maquinista', category: 'HABILITACION', issuer: 'Academia Nacional de Bomberos', issuedAt: daysAgo(500), expiresAt: in90, userId: capitan.id, companyId: cia.id },
      { name: 'Certificación Maquinista', category: 'HABILITACION', issuer: 'Academia Nacional de Bomberos', issuedAt: daysAgo(450), expiresAt: in90, userId: bombero3.id, companyId: cia.id },
      { name: 'Examen médico operativo', category: 'MEDICO', issuer: 'Mutual', issuedAt: daysAgo(200), expiresAt: in15, userId: bombero2.id, companyId: cia.id, notes: 'Renovar pronto' },
      { name: 'Certificación SCBA', category: 'EPP', issuer: 'Academia Nacional de Bomberos', issuedAt: daysAgo(900), expiresAt: expired, userId: encMaterial.id, companyId: cia.id },
      { name: 'Comando de incidentes', category: 'CURSO', issuer: 'CBN', issuedAt: daysAgo(300), userId: capitan.id, companyId: cia.id },
      { name: 'Licencia Clase B', category: 'LICENCIA', issuedAt: daysAgo(500), expiresAt: in90, userId: b4a.id, companyId: c4.id },
      { name: 'RCP / DEA', category: 'CURSO', issuer: 'Cruz Roja', issuedAt: daysAgo(180), expiresAt: daysAhead(545), userId: b3b.id, companyId: c3.id },
      { name: 'Combate forestal', category: 'CURSO', issuer: 'CONAF', issuedAt: daysAgo(220), expiresAt: daysAhead(500), userId: cap5.id, companyId: c5.id },
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

  // ─── Hidrantes (urbano + rural por compañía) ──────────────────────────────
  await prisma.hydrant.createMany({
    data: [
      { code: 'H-C1-001', type: 'COLUMNAR', status: 'OPERATIVO', diameter: 100, pressure: 58, flowRate: 1150, address: 'Calle Dieciocho 685', location: '1ª Compañía — cuartel central', latitude: -36.1428, longitude: -71.8258, companyId: c1.id },
      { code: 'H-C1-002', type: 'PIBA', status: 'OPERATIVO', diameter: 64, pressure: 52, flowRate: 780, address: 'Calle Arturo Prat 450', location: 'Centro urbano', latitude: -36.1442, longitude: -71.8235, companyId: c1.id },
      { code: 'H-C2-001', type: 'COLUMNAR', status: 'OPERATIVO', diameter: 100, pressure: 55, flowRate: 1050, address: 'Plaza de Armas', location: '2ª Compañía — sector plaza', latitude: -36.1435, longitude: -71.8220, companyId: c2.id },
      { code: 'H-C3-001', type: 'SUBTERRANEO', status: 'NO_OPERATIVO', diameter: 150, pressure: 0, flowRate: 0, address: 'Calle Victoria 1220', location: '3ª Compañía — sector hospital', latitude: -36.1415, longitude: -71.8280, companyId: c3.id, notes: 'Válvula en reparación — ESSAL' },
      { code: 'H-C4-001', type: 'COLUMNAR', status: 'OPERATIVO', diameter: 100, pressure: 60, flowRate: 1200, address: 'Pasaje Plaza 345', location: '4ª Compañía — sector norte', latitude: -36.1385, longitude: -71.8310, companyId: c4.id },
      { code: 'H-C5-001', type: 'PIBA', status: 'OPERATIVO', diameter: 64, pressure: 48, flowRate: 650, address: 'Catillo, acceso sur', location: '5ª Compañía — cordillera', latitude: -36.2876, longitude: -71.6518, companyId: c5.id },
      { code: 'H-C6-001', type: 'PIBA', status: 'EN_MANTENCION', diameter: 64, pressure: 40, flowRate: 400, address: 'Remulcao km 17', location: '6ª Compañía — zona sur rural', latitude: -36.1985, longitude: -71.7820, companyId: c6.id },
    ],
  });
  console.log('✅ Hidrantes');

  // ─── Comunicados ──────────────────────────────────────────────────────────
  await prisma.announcement.createMany({
    data: [
      { title: 'Dotación del Cuerpo — 6 compañías', content: 'El Cuerpo de Bomberos de Parral cuenta con ~130 voluntarios activos distribuidos en Primera a Sexta Compañía. Administración central: Dieciocho 685.', type: 'OFFICIAL', priority: 'MEDIUM', publishedBy: 'Mario González', companyId: c1.id, targetAudience: 'ALL_PERSONNEL' },
      { title: 'Renovación cuotas sociales', content: 'Recordatorio: cuota mayo vence el 10. Tesorería central atiende en Dieciocho 685.', type: 'OFFICIAL', priority: 'MEDIUM', publishedBy: 'Sofía Torres', companyId: c1.id },
      { title: 'Simulacro programado', content: 'Próximo simulacro de evacuación en cuartel central — asistencia obligatoria 1ª a 3ª Compañía.', type: 'ANNOUNCEMENT', priority: 'URGENT', publishedBy: 'Ana Martínez', companyId: c1.id, expiresAt: daysAhead(30) },
    ],
  });
  console.log('✅ Comunicados');

  // ─── N° operativo por compañía (1, 2, 3…) ───────────────────────────────
  const companiesForOp = await prisma.company.findMany({
    where: { isActive: true },
    select: { id: true },
    orderBy: { number: 'asc' },
  });
  for (const c of companiesForOp) {
    const members = await prisma.user.findMany({
      where: { companyId: c.id, isActive: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: { id: true },
    });
    let n = 1;
    for (const m of members) {
      if (n > 999) break;
      await prisma.user.update({ where: { id: m.id }, data: { operativeNumber: n } });
      n += 1;
    }
  }
  console.log('✅ N° operativos por compañía');

  console.log('\n🎉 Base de datos demo — Cuerpo de Bomberos de Parral (6 compañías)');
  console.log('──────────────────────────────────────────────────');
  console.log('  ~130 voluntarios activos (demo: 25 usuarios operativos)');
  console.log('  Central: Dieciocho 685 — Vista pública: /central/bomberos-parral');
  console.log('  Compañías: 1ª–3ª urbanas | 4ª periférica | 5ª Catillo | 6ª Remulcao');
  console.log('──────────────────────────────────────────────────');
  console.log('  SUPER ADMIN:   admin@nodo360.cl           /  Admin1234!');
  console.log('  COMANDANTE:    gonzalez@bomberosparral.cl /  Demo1234!');
  console.log('  CAPITÁN:       martinez@bomberosparral.cl /  Demo1234!');
  console.log('  ENC. MATERIAL: lopez@bomberosparral.cl   /  Demo1234!');
  console.log('  TESORERO:      torres@bomberosparral.cl  /  Demo1234!');
  console.log('  BOMBERO:       fuentes@bomberosparral.cl /  Demo1234!');
  console.log('  AUDITOR:       soto@bomberosparral.cl    /  Demo1234!');
  console.log('  OP. CENTRAL:   central@bomberosparral.cl /  Demo1234!');
  console.log('  → Perfil central: /central-operativa');
  console.log('──────────────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
