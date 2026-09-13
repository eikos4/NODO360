import type { EmergencyResponseStatus } from '@nodo360/shared';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  companyId: string | null;
  stationAvailable?: boolean;
  stationAvailableAt?: string | null;
  company?: { id: string; name: string; number: number; city: string; logoUrl?: string | null } | null;
}

export interface TeamResponse {
  status: EmergencyResponseStatus | null;
  statusLabel: string | null;
  user: { id: string; firstName: string; lastName: string; operativeNumber?: number | null };
}

export interface ActiveIncident {
  id: string;
  code: string;
  type: string;
  address: string;
  description?: string | null;
  dispatchedAt: string;
  emergencyCodeId?: string | null;
  radioMessage?: string;
  vehicles?: Array<{ patent: string; type?: string | null; brand?: string | null }>;
  dispatchGps: { latitude: number; longitude: number } | null;
  fieldGps: { latitude: number; longitude: number; confirmedAt?: string | null } | null;
  mapLat: number | null;
  mapLng: number | null;
  myResponse: { status: EmergencyResponseStatus; statusLabel: string } | null;
  teamSummary: {
    going: number;
    notGoing: number;
    notAvailable: number;
    onScene: number;
    locationMarked: number;
    total: number;
    responses: TeamResponse[];
  };
}

export interface EmergencySnapshot {
  schemaVersion: 1;
  snapshotVersion: string;
  serverTime: string;
  company: { id: string; name: string; number: number; city: string; logoUrl?: string | null };
  user: { id: string; fullName: string; operativeNumber?: number | null; stationAvailable?: boolean };
  incidents: ActiveIncident[];
  statusLabels: Record<string, string>;
}

export interface TimelineEvent {
  id: string;
  kind: string;
  label: string;
  note?: string | null;
  occurredAt: string;
  author?: { id: string; firstName: string; lastName: string } | null;
}

export interface EmergencyRecap {
  incident: {
    id: string;
    code: string;
    type: string;
    address: string;
    description?: string | null;
    dispatchedAt: string;
    closedAt?: string | null;
    status: string;
  };
  myResponse: {
    status: EmergencyResponseStatus | null;
    statusLabel: string | null;
    respondedAt?: string;
    onSceneAt?: string | null;
  } | null;
  timeline: TimelineEvent[];
  report: {
    id: string;
    title: string;
    emergencyType?: string | null;
    address?: string | null;
    occurredAt: string;
    summary: string;
    actionsTaken?: string | null;
    personnelNotes?: string | null;
    vehicleNotes?: string | null;
    outcome?: string | null;
    observations?: string | null;
    author?: { firstName: string; lastName: string } | null;
  } | null;
}

export interface AlarmHistoryItem {
  id: string;
  incidentId: string;
  title: string;
  body: string;
  createdAt: string;
  status: string;
  deliveries: Array<{ status: string; openedAt?: string | null; acknowledgedAt?: string | null }>;
}

export interface QueuedResponse {
  id: string;
  incidentId: string;
  status: EmergencyResponseStatus;
  action?: 'respond' | 'mark-location';
  latitude?: number;
  longitude?: number;
  createdAt: string;
  attempts: number;
}

export type ConnectionState = 'online' | 'offline' | 'syncing';
