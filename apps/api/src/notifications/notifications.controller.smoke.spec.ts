import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationsController } from './notifications.controller';

describe('notifications controller smoke (no external credentials)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns a safe empty public Firebase config when credentials are absent', () => {
    [
      'FIREBASE_WEB_API_KEY',
      'FIREBASE_WEB_AUTH_DOMAIN',
      'FIREBASE_WEB_PROJECT_ID',
      'FIREBASE_WEB_STORAGE_BUCKET',
      'FIREBASE_WEB_MESSAGING_SENDER_ID',
      'FIREBASE_WEB_APP_ID',
      'FIREBASE_WEB_VAPID_KEY',
    ].forEach((name) => vi.stubEnv(name, ''));
    const controller = new NotificationsController({} as never, {} as never);

    expect(controller.webConfig()).toEqual({
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
      vapidKey: '',
    });
  });

  it('passes the authenticated identity to history and acknowledgement operations', async () => {
    const alarms = {
      listOwn: vi.fn().mockResolvedValue([]),
      markForUser: vi.fn().mockResolvedValue({ ok: true }),
    };
    const controller = new NotificationsController({} as never, alarms as never);
    const request = { user: { sub: 'user-1' } };

    await controller.mine(request, '12');
    await controller.acknowledged(request, 'notification-1', {});

    expect(alarms.listOwn).toHaveBeenCalledWith('user-1', 12);
    expect(alarms.markForUser).toHaveBeenCalledWith(
      'user-1',
      'notification-1',
      'ACKNOWLEDGED',
      undefined,
    );
  });
});
