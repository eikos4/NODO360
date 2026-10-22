import { afterEach, describe, expect, it } from 'vitest';
import { IncidentLocationPinService } from './incident-location-pin.service';

function service() {
  return new IncidentLocationPinService({} as never, {} as never, {} as never);
}

describe('IncidentLocationPinService public page', () => {
  const previous = process.env.FRONTEND_URL;

  afterEach(() => {
    process.env.FRONTEND_URL = previous;
  });

  it('prefers nodo360.net when several frontends are listed', () => {
    process.env.FRONTEND_URL = 'https://nodo360-web.onrender.com,https://www.nodo360.net';
    expect(service().publicPageUrl('pre_abc')).toBe('https://www.nodo360.net/localizar/pre_abc');
  });

  it('falls back to nodo360.net', () => {
    process.env.FRONTEND_URL = '';
    expect(service().publicPageUrl('tok')).toBe('https://nodo360.net/localizar/tok');
  });
});
