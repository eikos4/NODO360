import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaClientExceptionFilter } from './prisma/prisma-client-exception.filter';
import { ensureDemoDatabaseSeeded } from './bootstrap/ensure-demo-seed';

async function bootstrap() {
  await ensureDemoDatabaseSeeded();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(compression());

  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

  const corsOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map((o) => o.trim().replace(/\/$/, '')) : []),
  ];
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const httpAdapter = app.getHttpAdapter();
  const rootPayload = {
    ok: true,
    service: 'NODO360 API',
    message: 'Servicio activo. Los endpoints están bajo /api',
    login: '/api/auth/login',
    health: '/api/ping',
  };
  httpAdapter.get('/', (_req: unknown, res: { json: (body: unknown) => void }) => res.json(rootPayload));
  httpAdapter.get('/api', (_req: unknown, res: { json: (body: unknown) => void }) => res.json(rootPayload));

  const { httpAdapter: adapterHost } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(adapterHost));

  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`NODO360 API running on http://0.0.0.0:${port}/api`);
}

bootstrap();
