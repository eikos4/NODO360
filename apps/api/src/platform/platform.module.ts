import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PlatformLogService } from './platform-log.service';
import { ErrorLogInterceptor } from './error-log.interceptor';

@Global()
@Module({
  providers: [
    PlatformLogService,
    { provide: APP_INTERCEPTOR, useClass: ErrorLogInterceptor },
  ],
  exports: [PlatformLogService],
})
export class PlatformModule {}
