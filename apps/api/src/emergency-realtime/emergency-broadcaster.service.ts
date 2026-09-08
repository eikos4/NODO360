import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EmergencyGateway } from './emergency.gateway';
import {
  EmergencyEventEnvelope,
  EmergencyEventName,
} from './emergency-events.contract';

@Injectable()
export class EmergencyBroadcaster {
  constructor(private readonly gateway: EmergencyGateway) {}

  emit<T>(input: {
    event: EmergencyEventName;
    incidentId: string;
    companyIds: string[];
    snapshotVersion: Date | string;
    data: T;
  }): EmergencyEventEnvelope<T> {
    const occurredAt = new Date().toISOString();
    const envelope: EmergencyEventEnvelope<T> = {
      eventId: randomUUID(),
      event: input.event,
      schemaVersion: 1,
      occurredAt,
      snapshotVersion:
        input.snapshotVersion instanceof Date
          ? input.snapshotVersion.toISOString()
          : input.snapshotVersion,
      incidentId: input.incidentId,
      companyIds: [...new Set(input.companyIds)],
      data: input.data,
    };
    this.gateway.emitToCompanies(envelope);
    return envelope;
  }
}
