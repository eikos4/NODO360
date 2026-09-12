import type { ConfigService } from '@nestjs/config';

export type AlarmTone = {
  code: string;
  channelId: string;
  sound: string;
};

export function resolveAlarmTone(...values: Array<string | undefined>): AlarmTone {
  const text = values.filter(Boolean).join(' ');
  if (/\b(NODO|STANDBY|PREAVISO)\b/i.test(text)) {
    return {
      code: 'NODO',
      channelId: 'nodo360_alarm_nodo360',
      sound: 'tone_nodo360',
    };
  }
  const match = text.match(/\b10[-_ ]?(1[0-2]|\d)(?:-\d+)?\b/i);
  const code = `10-${match?.[1] ?? '0'}`;
  const suffix = code.replace('-', '_');
  return {
    code,
    channelId: `nodo360_alarm_${suffix}`,
    sound: `tone_${suffix}`,
  };
}

export function resolveApnsSound(
  sound: string,
  config: Pick<ConfigService, 'get'>,
): string | { critical: true; name: string; volume: 1 } {
  const name = `${sound}.caf`;
  return config.get<string>('IOS_CRITICAL_ALERTS_ENABLED') === 'true'
    ? { critical: true, name, volume: 1 }
    : name;
}
