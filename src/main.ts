import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'https://front-chat-2026.vercel.app',
      /\.vercel\.app$/,
    ],
    credentials: true,
  });
  
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
