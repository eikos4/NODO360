import { Module } from '@nestjs/common';
import { GuardLogController } from './guard-log.controller';
import { GuardLogService } from './guard-log.service';

@Module({
  controllers: [GuardLogController],
  providers: [GuardLogService],
  exports: [GuardLogService],
})
export class GuardLogModule {}
