import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { NotificationsController } from './notifications.controller';
import { AlarmQueueService } from './alarm-queue.service';
import { AlarmWorkerService } from './alarm-worker.service';

@Module({
  controllers: [NotificationsController],
  providers: [PushService, AlarmQueueService, AlarmWorkerService],
  exports: [PushService, AlarmQueueService],
})
export class NotificationsModule {}
