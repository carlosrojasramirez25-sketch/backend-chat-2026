import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security headers (X-Frame-Options, CSP, HSTS, X-Content-Type-Options, etc.)
  app.use(helmet());

  app.enableCors({
    origin: [
      'http://localhost:3002',
      'https://front-chat-2026.vercel.app',
    ],
    credentials: true,
  });

  // Global validation: strip unknown fields, reject invalid types
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,          // strip fields not in the DTO
    forbidNonWhitelisted: true, // reject requests with extra fields
    transform: true,          // auto-convert types (string → number, etc.)
  }));

  app.setGlobalPrefix('api');
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
bootstrap();