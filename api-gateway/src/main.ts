import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 API Gateway corriendo en http://localhost:${port}`);
  console.log(`   → Auth Service:     ${process.env.AUTH_SERVICE_URL}`);
  console.log(`   → Users Service:    ${process.env.USERS_SERVICE_URL}`);
  console.log(`   → Groups Service:   ${process.env.GROUPS_SERVICE_URL}`);
  console.log(`   → Messaging Service:${process.env.MESSAGING_SERVICE_URL}`);
  console.log(`   → Media Service:    ${process.env.MEDIA_SERVICE_URL}`);
  console.log(`   → Presence Service: ${process.env.PRESENCE_SERVICE_URL}`);
}
bootstrap();
