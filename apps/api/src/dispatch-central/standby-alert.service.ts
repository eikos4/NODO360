import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EmergencyBroadcaster } from '../emergency-realtime/emergency-broadcaster.service';
import { EMERGENCY_EVENT_NAMES } from '../emergency-realtime/emergency-events.contract';
import { PushService } from '../notifications/push.service';
import { PrismaService } from '../prisma/prisma.service';

export type StandbyAlert = {
  id: string;
  companyId: string;
  companyLabel: string;
  message: string;
  at: string;
};

const TTL_MS = 90_000;
const COOLDOWN_MS = 15_000;

@Injectable()
export class StandbyAlertService {
  private readonly byCompany = new Map<string, StandbyAlert>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly emergencyBroadcaster: EmergencyBroadcaster,
  ) {}

  peek(companyId: string): StandbyAlert | null {
    const alert = this.byCompany.get(companyId);
    if (!alert) return null;
    if (Date.now() - Date.parse(alert.at) > TTL_MS) {
      this.byCompany.delete(companyId);
      return null;
    }
    return alert;
  }

  async trigger(companyId: string, note?: string): Promise<StandbyAlert & { phones: number }> {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, isActive: true },
      select: { id: true, name: true, number: true },
    });
    if (!company) throw new NotFoundException('Compañía no encontrada');

    const existing = this.byCompany.get(company.id);
    if (existing && Date.now() - Date.parse(existing.at) < COOLDOWN_MS) {
      throw new ConflictException('Esperá unos segundos antes de repetir el aviso Nodo360');
    }

    const companyLabel = `${company.number}ª ${company.name}`;
    const custom = note?.trim();
    const message = custom
      ? custom
      : `Atención. Nodo 360. Se viene una emergencia a ${companyLabel}. Estén atentos.`;

    const alert: StandbyAlert = {
      id: randomUUID(),
      companyId: company.id,
      companyLabel,
      message,
      at: new Date().toISOString(),
    };
    this.byCompany.set(company.id, alert);

    const { sent } = await this.push.notifyStandby({
      companyIds: [company.id],
      companyLabel,
      message,
      standbyId: alert.id,
    });

    this.emergencyBroadcaster.emit({
      event: EMERGENCY_EVENT_NAMES.standbyAlerted,
      incidentId: `standby:${alert.id}`,
      companyIds: [company.id],
      snapshotVersion: alert.at,
      data: alert,
    });

    return { ...alert, phones: sent };
  }
}
