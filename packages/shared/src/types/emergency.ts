export const EMERGENCY_RESPONSE_STATUSES = [
  'GOING',
  'NOT_GOING',
  'NOT_AVAILABLE',
  'ON_SCENE',
] as const;

export type EmergencyResponseStatus = (typeof EMERGENCY_RESPONSE_STATUSES)[number];

export const EMERGENCY_EVENT_NAMES = [
  'emergency.dispatch.created.v1',
  'emergency.response.updated.v1',
  'emergency.location.updated.v1',
  'emergency.incident.updated.v1',
  'emergency.incident.cancelled.v1',
  'emergency.incident.closed.v1',
] as const;

export type EmergencyEventName = (typeof EMERGENCY_EVENT_NAMES)[number];

export interface EmergencyEventEnvelope<T = unknown> {
  eventId: string;
  event: EmergencyEventName;
  schemaVersion: 1;
  occurredAt: string;
  snapshotVersion: string;
  incidentId: string;
  companyIds: string[];
  data: T;
}
