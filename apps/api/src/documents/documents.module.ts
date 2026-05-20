import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';

@Module({
  providers: [DocumentsService, RolesGuard],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
