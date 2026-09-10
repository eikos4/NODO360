import { IncidentTimelineKind } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { INCIDENT_TIMELINE_LABELS } from './incident-timeline.kinds';

describe('incident timeline kinds', () => {
  it('has a label for every enum value', () => {
    for (const kind of Object.values(IncidentTimelineKind)) {
      expect(INCIDENT_TIMELINE_LABELS[kind]?.length).toBeGreaterThan(2);
    }
  });
});
