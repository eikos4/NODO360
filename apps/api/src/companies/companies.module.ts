import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { CompaniesPublicController } from './companies-public.controller';

@Module({
  providers: [CompaniesService, RolesGuard],
  controllers: [CompaniesController, CompaniesPublicController],
  exports: [CompaniesService],
})
export class CompaniesModule {}
