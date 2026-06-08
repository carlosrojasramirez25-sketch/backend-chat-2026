import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3001',
      'https://front-chat-2026.vercel.app',
      /\.vercel\.app$/,
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
