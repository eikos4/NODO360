import { describe, expect, it, vi } from 'vitest';
import { resolveAlarmTone, resolveApnsSound } from './alarm-payload';

describe('alarm payload mapping', () => {
  it.each(Array.from({ length: 13 }, (_, index) => `10-${index}`))(
    'maps %s to its native channel and sound',
    (code) => {
      expect(resolveAlarmTone(code)).toEqual({
        code,
        channelId: `nodo360_alarm_${code.replace('-', '_')}`,
        sound: `tone_${code.replace('-', '_')}`,
      });
    },
  );

  it('extracts the operational code from noisy dispatch text and falls back safely', () => {
    expect(resolveAlarmTone('ALARMA', '10_12-1 incendio')).toMatchObject({ code: '10-12' });
    expect(resolveAlarmTone('sin código')).toMatchObject({ code: '10-0' });
  });

  it('maps a Nodo360 preaviso to the brand ident channel', () => {
    expect(resolveAlarmTone('NODO360 · Atención', 'STANDBY', 'PREAVISO')).toEqual({
      code: 'NODO',
      channelId: 'nodo360_alarm_nodo360',
      sound: 'tone_nodo360',
    });
  });

  it('only emits an APNs critical sound payload when explicitly enabled', () => {
    const enabled = { get: vi.fn().mockReturnValue('true') };
    const disabled = { get: vi.fn().mockReturnValue('false') };

    expect(resolveApnsSound('tone_10_4', enabled)).toEqual({
      critical: true,
      name: 'tone_10_4.caf',
      volume: 1,
    });
    expect(resolveApnsSound('tone_10_4', disabled)).toBe('tone_10_4.caf');
  });
});
