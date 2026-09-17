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

  it('recycles the parent tone for 10-10 por 10-0 and 10-10x10-4', () => {
    expect(resolveAlarmTone('10-10 por 10-0 — Apoyo a otros cuerpos')).toMatchObject({
      code: '10-0',
      sound: 'tone_10_0',
    });
    expect(resolveAlarmTone('10-10x10-4')).toMatchObject({ code: '10-4', sound: 'tone_10_4' });
    expect(resolveAlarmTone('ALARMA 10-11 POR 10-0')).toMatchObject({ code: '10-0' });
  });

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
