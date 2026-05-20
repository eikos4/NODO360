import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GuardLogModule } from '../guard-log/guard-log.module';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';

@Module({
  imports: [GuardLogModule],
  providers: [IncidentsService, RolesGuard],
  controllers: [IncidentsController],
  exports: [IncidentsService],
})
export class IncidentsModule {}
