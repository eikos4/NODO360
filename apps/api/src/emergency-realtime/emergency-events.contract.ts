export const EMERGENCY_SOCKET_NAMESPACE = '/emergencies';

export const EMERGENCY_EVENT_NAMES = {
  dispatchCreated: 'emergency.dispatch.created.v1',
  responseUpdated: 'emergency.response.updated.v1',
  locationUpdated: 'emergency.location.updated.v1',
  incidentUpdated: 'emergency.incident.updated.v1',
  incidentCancelled: 'emergency.incident.cancelled.v1',
  incidentClosed: 'emergency.incident.closed.v1',
  standbyAlerted: 'emergency.standby.v1',
} as const;

export type EmergencyEventName =
  (typeof EMERGENCY_EVENT_NAMES)[keyof typeof EMERGENCY_EVENT_NAMES];

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

export interface EmergencyReadyV1 {
  schemaVersion: 1;
  companyIds: string[];
  serverTime: string;
}

export interface EmergencySnapshotV1<TIncident = unknown, TUser = unknown, TCompany = unknown> {
  schemaVersion: 1;
  snapshotVersion: string;
  serverTime: string;
  company: TCompany;
  user: TUser;
  incidents: TIncident[];
  statusLabels: Record<string, string>;
}

export interface EmergencyDispatchCreatedData {
  incident: unknown;
}

export interface EmergencyResponseUpdatedData {
  response: unknown;
  replayed: boolean;
}

export interface EmergencyLocationUpdatedData {
  fieldGps: {
    latitude: number;
    longitude: number;
    confirmedAt: Date | string | null;
  };
  response?: unknown;
  replayed?: boolean;
}

export interface EmergencyIncidentUpdatedData {
  incident: unknown;
}
