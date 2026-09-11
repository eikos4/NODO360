import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, throwError } from 'rxjs';
import { PlatformLogService } from './platform-log.service';

@Injectable()
export class ErrorLogInterceptor implements NestInterceptor {
  constructor(private readonly logs: PlatformLogService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      catchError((err: unknown) => {
        const status = err instanceof HttpException ? err.getStatus() : 500;
        if (status >= 500) {
          const req = context.switchToHttp().getRequest();
          const message = err instanceof Error ? err.message : 'Error interno';
          void this.logs.write({
            level: 'ERROR',
            source: 'api',
            message,
            detail: {
              path: req?.url,
              method: req?.method,
              status,
            },
          });
        }
        return throwError(() => err);
      }),
    );
  }
}
