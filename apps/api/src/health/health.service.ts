import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MedicalExamStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, assertCompanyAccess, companyIdWhere, companyIdsForActor } from '../common/cuerpo-scope';
import { hasAnyRole } from '../common/user-roles';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';
import { UpdateHealthRecordDto } from './dto/update-health-record.dto';
import { CreateMedicalExamDto } from './dto/create-medical-exam.dto';
import { UpdateMedicalExamDto } from './dto/update-medical-exam.dto';
import { CreateMedicalConditionDto } from './dto/create-medical-condition.dto';
import { UpdateMedicalConditionDto } from './dto/update-medical-condition.dto';
import { CreateAllergyDto } from './dto/create-allergy.dto';
import { UpdateAllergyDto } from './dto/update-allergy.dto';
import { CreateMedicationDto } from './dto/create-medication.dto';
import { UpdateMedicationDto } from './dto/update-medication.dto';
import { CreateVaccinationDto } from './dto/create-vaccination.dto';
import { UpdateVaccinationDto } from './dto/update-vaccination.dto';

const SOON_DAYS = 30;

export type DateAlertStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'SIN_FECHA';

const RECORD_INCLUDE = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      rut: true,
      email: true,
      role: true,
    },
  },
  medicalExams: { orderBy: { examDate: 'desc' as const } },
  conditions: { orderBy: { name: 'asc' as const } },
  allergies: { orderBy: { name: 'asc' as const } },
  medications: { orderBy: { name: 'asc' as const } },
  vaccinations: { orderBy: { administeredAt: 'desc' as const } },
};

function computeDateStatus(date: Date | null | undefined): DateAlertStatus {
  if (!date) return 'SIN_FECHA';
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (days < 0) return 'VENCIDO';
  if (days <= SOON_DAYS) return 'POR_VENCER';
  return 'VIGENTE';
}

function enrichRecord<T extends { nextCheckupAt: Date | null }>(record: T) {
  const checkupStatus = computeDateStatus(record.nextCheckupAt);
  const daysUntilCheckup = record.nextCheckupAt
    ? Math.ceil((record.nextCheckupAt.getTime() - Date.now()) / 86400000)
    : null;
  return { ...record, checkupStatus, daysUntilCheckup };
}

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  private async scopedCompanyWhere(actor: Actor, companyId?: string) {
    const ids = await companyIdsForActor(this.prisma, actor, companyId);
    return companyIdWhere(ids);
  }

  private async assertUserInScope(userId: string, actor: Actor) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    if (!user?.companyId) throw new NotFoundException('Bombero no encontrado');
    await assertCompanyAccess(this.prisma, actor, user.companyId);
  }

  private async assertHealthRecordInScope(healthRecordId: string, actor: Actor) {
    const record = await this.prisma.healthRecord.findUnique({
      where: { id: healthRecordId },
      select: { companyId: true },
    });
    if (!record) throw new NotFoundException('Ficha de salud no encontrada');
    await assertCompanyAccess(this.prisma, actor, record.companyId);
  }

  private async ensureUserInCompany(userId: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
    });
    if (!user) throw new NotFoundException('Bombero no encontrado en la compaÃ±Ã­a');
    return user;
  }

  private async getRecordOrThrow(userId: string) {
    const record = await this.prisma.healthRecord.findUnique({
      where: { userId },
      include: RECORD_INCLUDE,
    });
    if (!record) throw new NotFoundException('Ficha de salud no encontrada');
    return enrichRecord(record);
  }

  private async getRecordIdByUser(userId: string) {
    const record = await this.prisma.healthRecord.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!record) throw new NotFoundException('Ficha de salud no encontrada');
    return record.id;
  }

  async getSummary(actor: Actor, companyId?: string) {
    const scope = await this.scopedCompanyWhere(actor, companyId);
    const userWhere: Prisma.UserWhereInput = {
      isActive: true,
      ...scope,
    };

    const [members, records] = await Promise.all([
      this.prisma.user.count({ where: userWhere }),
      this.prisma.healthRecord.findMany({
        where: scope,
        include: {
          allergies: { where: { isActive: true } },
          medications: { where: { isActive: true } },
          medicalExams: true,
        },
      }),
    ]);

    let checkupVencido = 0;
    let checkupPorVencer = 0;
    let checkupVigente = 0;
    let examsAnormales = 0;
    let examsPendientes = 0;
    let activeAllergies = 0;
    let activeMedications = 0;

    for (const r of records) {
      const st = computeDateStatus(r.nextCheckupAt);
      if (st === 'VENCIDO') checkupVencido++;
      else if (st === 'POR_VENCER') checkupPorVencer++;
      else if (st === 'VIGENTE') checkupVigente++;

      activeAllergies += r.allergies.length;
      activeMedications += r.medications.length;
      examsAnormales += r.medicalExams.filter(
        (e) => e.status === MedicalExamStatus.ANORMAL,
      ).length;
      examsPendientes += r.medicalExams.filter(
        (e) =>
          e.status === MedicalExamStatus.PROGRAMADO ||
          e.status === MedicalExamStatus.RESULTADO_PENDIENTE,
      ).length;
    }

    return {
      totalMembers: members,
      withRecord: records.length,
      withoutRecord: Math.max(0, members - records.length),
      checkupVencido,
      checkupPorVencer,
      checkupVigente,
      examsAnormales,
      examsPendientes,
      activeAllergies,
      activeMedications,
      soonDays: SOON_DAYS,
      sponsoredBy: 'leucode.ia',
    };
  }

  async findExpiring(actor: Actor, companyId?: string, days = SOON_DAYS) {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + days);
    const scope = await this.scopedCompanyWhere(actor, companyId);

    const records = await this.prisma.healthRecord.findMany({
      where: {
        ...scope,
        OR: [
          { nextCheckupAt: { lte: horizon } },
          {
            medicalExams: {
              some: {
                examDate: { lte: horizon },
                status: {
                  in: [
                    MedicalExamStatus.PROGRAMADO,
                    MedicalExamStatus.RESULTADO_PENDIENTE,
                  ],
                },
              },
            },
          },
          {
            vaccinations: {
              some: { nextDoseAt: { lte: horizon } },
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rut: true,
          },
        },
        medicalExams: {
          where: {
            examDate: { lte: horizon },
            status: {
              in: [
                MedicalExamStatus.PROGRAMADO,
                MedicalExamStatus.RESULTADO_PENDIENTE,
                MedicalExamStatus.ANORMAL,
              ],
            },
          },
          orderBy: { examDate: 'asc' },
        },
      },
    });

    const checkups = records
      .filter((r) => r.nextCheckupAt && r.nextCheckupAt <= horizon)
      .map((r) => ({
        userId: r.userId,
        user: r.user,
        nextCheckupAt: r.nextCheckupAt,
        status: computeDateStatus(r.nextCheckupAt),
        daysUntil: r.nextCheckupAt
          ? Math.ceil((r.nextCheckupAt.getTime() - Date.now()) / 86400000)
          : null,
      }));

    const exams = records.flatMap((r) =>
      r.medicalExams.map((e) => ({
        ...e,
        user: r.user,
        userId: r.userId,
      })),
    );

    return {
      checkups,
      exams,
      soonDays: days,
    };
  }

  async rosterByCompany(actor: Actor, companyId: string) {
    await assertCompanyAccess(this.prisma, actor, companyId);
    const users = await this.prisma.user.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rut: true,
        role: true,
        healthRecord: {
          include: {
            allergies: { where: { isActive: true }, take: 3 },
            medicalExams: {
              orderBy: { examDate: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return users.map((u) => {
      const record = u.healthRecord
        ? enrichRecord(u.healthRecord)
        : null;
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        rut: u.rut,
        role: u.role,
        hasRecord: !!u.healthRecord,
        record,
        allergyCount: u.healthRecord?.allergies.length ?? 0,
        lastExam: u.healthRecord?.medicalExams[0] ?? null,
        checkupStatus: record?.checkupStatus ?? 'SIN_FECHA',
      };
    });
  }

  async getRecordByUserId(userId: string, actor: Actor) {
    if (actor.id === userId) return this.getRecordOrThrow(userId);
    if (!hasAnyRole(actor, 'SUPER_ADMIN', 'COMANDANTE', 'CAPITAN', 'SECRETARIO')) {
      throw new ForbiddenException('Sin permiso para esta ficha');
    }
    await this.assertUserInScope(userId, actor);
    return this.getRecordOrThrow(userId);
  }

  async upsertRecord(userId: string, dto: CreateHealthRecordDto, actor: Actor) {
    await this.assertUserInScope(userId, actor);
    await assertCompanyAccess(this.prisma, actor, dto.companyId);
    await this.ensureUserInCompany(userId, dto.companyId);

    const data = {
      bloodType: dto.bloodType,
      emergencyContact: dto.emergencyContact,
      emergencyPhone: dto.emergencyPhone,
      chronicDiseases: dto.chronicDiseases,
      surgeries: dto.surgeries,
      notes: dto.notes,
      lastCheckupAt: dto.lastCheckupAt ? new Date(dto.lastCheckupAt) : undefined,
      nextCheckupAt: dto.nextCheckupAt ? new Date(dto.nextCheckupAt) : undefined,
      companyId: dto.companyId,
    };

    const record = await this.prisma.healthRecord.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      include: RECORD_INCLUDE,
    });

    return enrichRecord(record);
  }

  async updateRecord(userId: string, dto: UpdateHealthRecordDto, actor: Actor) {
    await this.assertUserInScope(userId, actor);
    await this.getRecordIdByUser(userId);
    const record = await this.prisma.healthRecord.update({
      where: { userId },
      data: {
        bloodType: dto.bloodType,
        emergencyContact: dto.emergencyContact,
        emergencyPhone: dto.emergencyPhone,
        chronicDiseases: dto.chronicDiseases,
        surgeries: dto.surgeries,
        notes: dto.notes,
        lastCheckupAt: dto.lastCheckupAt
          ? new Date(dto.lastCheckupAt)
          : dto.lastCheckupAt === null
            ? null
            : undefined,
        nextCheckupAt: dto.nextCheckupAt
          ? new Date(dto.nextCheckupAt)
          : dto.nextCheckupAt === null
            ? null
            : undefined,
      },
      include: RECORD_INCLUDE,
    });
    return enrichRecord(record);
  }

  async deleteRecord(userId: string, actor: Actor) {
    await this.assertUserInScope(userId, actor);
    await this.getRecordIdByUser(userId);
    return this.prisma.healthRecord.delete({ where: { userId } });
  }

  // â”€â”€â”€ Medical exams â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async addExam(userId: string, dto: CreateMedicalExamDto, actor: Actor) {
    await this.assertUserInScope(userId, actor);
    const healthRecordId = await this.getRecordIdByUser(userId);
    return this.prisma.medicalExam.create({
      data: {
        healthRecordId,
        type: dto.type,
        name: dto.name,
        description: dto.description,
        examDate: new Date(dto.examDate),
        result: dto.result,
        status: dto.status,
        fileUrl: dto.fileUrl,
        notes: dto.notes,
      },
    });
  }

  async updateExam(id: string, dto: UpdateMedicalExamDto, actor: Actor) {
    const row = await this.prisma.medicalExam.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Examen no encontrado');
    await this.assertHealthRecordInScope(row.healthRecordId, actor);
    return this.prisma.medicalExam.update({
      where: { id },
      data: {
        type: dto.type,
        name: dto.name,
        description: dto.description,
        examDate: dto.examDate ? new Date(dto.examDate) : undefined,
        result: dto.result,
        status: dto.status,
        fileUrl: dto.fileUrl,
        notes: dto.notes,
      },
    });
  }

  async removeExam(id: string, actor: Actor) {
    const row = await this.prisma.medicalExam.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Examen no encontrado');
    await this.assertHealthRecordInScope(row.healthRecordId, actor);
    return this.prisma.medicalExam.delete({ where: { id } });
  }

  // â”€â”€â”€ Conditions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async addCondition(userId: string, dto: CreateMedicalConditionDto, actor: Actor) {
    await this.assertUserInScope(userId, actor);
    const healthRecordId = await this.getRecordIdByUser(userId);
    return this.prisma.medicalCondition.create({
      data: {
        healthRecordId,
        name: dto.name,
        description: dto.description,
        diagnosedAt: dto.diagnosedAt ? new Date(dto.diagnosedAt) : undefined,
        severity: dto.severity,
        isActive: dto.isActive ?? true,
        notes: dto.notes,
      },
    });
  }

  async updateCondition(id: string, dto: UpdateMedicalConditionDto, actor: Actor) {
    const row = await this.prisma.medicalCondition.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('CondiciÃ³n no encontrada');
    await this.assertHealthRecordInScope(row.healthRecordId, actor);
    return this.prisma.medicalCondition.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        diagnosedAt: dto.diagnosedAt ? new Date(dto.diagnosedAt) : undefined,
        severity: dto.severity,
        isActive: dto.isActive,
        notes: dto.notes,
      },
    });
  }

  async removeCondition(id: string, actor: Actor) {
    const row = await this.prisma.medicalCondition.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('CondiciÃ³n no encontrada');
    await this.assertHealthRecordInScope(row.healthRecordId, actor);
    return this.prisma.medicalCondition.delete({ where: { id } });
  }

  async addAllergy(userId: string, dto: CreateAllergyDto, actor: Actor) {
    await this.assertUserInScope(userId, actor);
    const healthRecordId = await this.getRecordIdByUser(userId);
    return this.prisma.allergy.create({
      data: {
        healthRecordId,
        name: dto.name,
        type: dto.type,
        severity: dto.severity,
        reaction: dto.reaction,
        isActive: dto.isActive ?? true,
        notes: dto.notes,
      },
    });
  }

  async updateAllergy(id: string, dto: UpdateAllergyDto, actor: Actor) {
    const row = await this.prisma.allergy.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Alergia no encontrada');
    await this.assertHealthRecordInScope(row.healthRecordId, actor);
    return this.prisma.allergy.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        severity: dto.severity,
        reaction: dto.reaction,
        isActive: dto.isActive,
        notes: dto.notes,
      },
    });
  }

  async removeAllergy(id: string, actor: Actor) {
    const row = await this.prisma.allergy.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Alergia no encontrada');
    await this.assertHealthRecordInScope(row.healthRecordId, actor);
    return this.prisma.allergy.delete({ where: { id } });
  }

  async addMedication(userId: string, dto: CreateMedicationDto, actor: Actor) {
    await this.assertUserInScope(userId, actor);
    const healthRecordId = await this.getRecordIdByUser(userId);
    return this.prisma.medication.create({
      data: {
        healthRecordId,
        name: dto.name,
        dosage: dto.dosage,
        frequency: dto.frequency,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isActive: dto.isActive ?? true,
        notes: dto.notes,
      },
    });
  }

  async updateMedication(id: string, dto: UpdateMedicationDto, actor: Actor) {
    const row = await this.prisma.medication.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Medicamento no encontrado');
    await this.assertHealthRecordInScope(row.healthRecordId, actor);
    return this.prisma.medication.update({
      where: { id },
      data: {
        name: dto.name,
        dosage: dto.dosage,
        frequency: dto.frequency,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isActive: dto.isActive,
        notes: dto.notes,
      },
    });
  }

  async removeMedication(id: string, actor: Actor) {
    const row = await this.prisma.medication.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Medicamento no encontrado');
    await this.assertHealthRecordInScope(row.healthRecordId, actor);
    return this.prisma.medication.delete({ where: { id } });
  }

  async addVaccination(userId: string, dto: CreateVaccinationDto, actor: Actor) {
    await this.assertUserInScope(userId, actor);
    const healthRecordId = await this.getRecordIdByUser(userId);
    return this.prisma.vaccination.create({
      data: {
        healthRecordId,
        name: dto.name,
        vaccineType: dto.vaccineType,
        dose: dto.dose,
        administeredAt: dto.administeredAt
          ? new Date(dto.administeredAt)
          : undefined,
        nextDoseAt: dto.nextDoseAt ? new Date(dto.nextDoseAt) : undefined,
        notes: dto.notes,
      },
    });
  }

  async updateVaccination(id: string, dto: UpdateVaccinationDto, actor: Actor) {
    const row = await this.prisma.vaccination.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Vacuna no encontrada');
    await this.assertHealthRecordInScope(row.healthRecordId, actor);
    return this.prisma.vaccination.update({
      where: { id },
      data: {
        name: dto.name,
        vaccineType: dto.vaccineType,
        dose: dto.dose,
        administeredAt: dto.administeredAt
          ? new Date(dto.administeredAt)
          : undefined,
        nextDoseAt: dto.nextDoseAt ? new Date(dto.nextDoseAt) : undefined,
        notes: dto.notes,
      },
    });
  }

  async removeVaccination(id: string, actor: Actor) {
    const row = await this.prisma.vaccination.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Vacuna no encontrada');
    await this.assertHealthRecordInScope(row.healthRecordId, actor);
    return this.prisma.vaccination.delete({ where: { id } });
  }

  async ensureRecordForUser(userId: string, companyId: string, actor: Actor) {
    await this.assertUserInScope(userId, actor);
    await assertCompanyAccess(this.prisma, actor, companyId);
    const existing = await this.prisma.healthRecord.findUnique({
      where: { userId },
    });
    if (existing) return enrichRecord(await this.getRecordOrThrow(userId));
    return this.upsertRecord(userId, { companyId }, actor);
  }
}
