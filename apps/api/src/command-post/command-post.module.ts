import { Module } from '@nestjs/common';
import { CommandPostController } from './command-post.controller';
import { CommandPostService } from './command-post.service';
import { EmergencyRealtimeModule } from '../emergency-realtime/emergency-realtime.module';

@Module({
  imports: [EmergencyRealtimeModule],
  controllers: [CommandPostController],
  providers: [CommandPostService],
})
export class CommandPostModule {}
