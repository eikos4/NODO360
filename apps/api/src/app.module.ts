import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { InventoryModule } from './inventory/inventory.module';
import { IncidentsModule } from './incidents/incidents.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { ShiftsModule } from './shifts/shifts.module';
import { DocumentsModule } from './documents/documents.module';
import { PurchasesModule } from './purchases/purchases.module';
import { FinanceModule } from './finance/finance.module';
import { Nodo360Module } from './nodo360/nodo360.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { HydrantsModule } from './hydrants/hydrants.module';
import { EmergencyPlansModule } from './emergency-plans/emergency-plans.module';
import { MembershipModule } from './membership/membership.module';
import { EvacuationModule } from './evacuation/evacuation.module';
import { TrainingModule } from './training/training.module';
import { OperationalMapModule } from './operational-map/operational-map.module';
import { GuardLogModule } from './guard-log/guard-log.module';
import { InventoryAuditsModule } from './inventory-audits/inventory-audits.module';
import { FleetLogsModule } from './fleet-logs/fleet-logs.module';
import { HealthModule } from './health/health.module';
import { DispatchCentralModule } from './dispatch-central/dispatch-central.module';
import { TtsModule } from './tts/tts.module';
import { EmergencyBitacoraModule } from './emergency-bitacora/emergency-bitacora.module';
import { IncidentLocationPinModule } from './incident-location-pin/incident-location-pin.module';
import { EmergencyResponseModule } from './emergency-response/emergency-response.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    InventoryModule,
    IncidentsModule,
    MaintenanceModule,
    ShiftsModule,
    DocumentsModule,
    PurchasesModule,
    FinanceModule,
    Nodo360Module,
    AnnouncementsModule,
    HydrantsModule,
    EmergencyPlansModule,
    MembershipModule,
    EvacuationModule,
    TrainingModule,
    OperationalMapModule,
    GuardLogModule,
    InventoryAuditsModule,
    FleetLogsModule,
    HealthModule,
    DispatchCentralModule,
    TtsModule,
    EmergencyBitacoraModule,
    IncidentLocationPinModule,
    EmergencyResponseModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
