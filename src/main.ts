import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.enableCors({
    origin: '*',
  });
  app.setGlobalPrefix('api');

  // Get port and host from environment variables
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  Logger.log(`Listening on http://${host}:${port}`);
  await app.listen(port, host);
}

bootstrap();
