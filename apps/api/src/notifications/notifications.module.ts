import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [PushService],
  exports: [PushService],
})
export class NotificationsModule {}
