import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PushService } from './push.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly push: PushService) {}

  @Get('web-config')
  webConfig() {
    return {
      apiKey: process.env.FIREBASE_WEB_API_KEY ?? '',
      authDomain: process.env.FIREBASE_WEB_AUTH_DOMAIN ?? '',
      projectId: process.env.FIREBASE_WEB_PROJECT_ID ?? '',
      storageBucket: process.env.FIREBASE_WEB_STORAGE_BUCKET ?? '',
      messagingSenderId: process.env.FIREBASE_WEB_MESSAGING_SENDER_ID ?? '',
      appId: process.env.FIREBASE_WEB_APP_ID ?? '',
      vapidKey: process.env.FIREBASE_WEB_VAPID_KEY ?? '',
    };
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  register(
    @Req() req: { user: { id?: string; sub?: string } },
    @Body() body: { token?: string; platform?: string },
  ) {
    const userId = req.user.id ?? req.user.sub;
    if (!userId || !body.token) return { ok: false };
    return this.push.registerToken(userId, body.token, body.platform ?? 'web');
  }

  @Delete('register')
  @UseGuards(JwtAuthGuard)
  unregister(@Body() body: { token?: string }) {
    if (!body.token) return { ok: true };
    return this.push.unregisterToken(body.token);
  }
}
