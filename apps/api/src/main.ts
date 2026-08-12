import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const rawOrigins = config.get<string>('WEB_ORIGIN', 'http://localhost:3000');
  const allowedOrigins = rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  });
  app.use(helmet());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidUnknownValues: true, transform: true }));

  const port = config.get<number>('PORT', 3001);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
