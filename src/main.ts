import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { swaggerInit } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  app.enableCors({
    origin: '*',
  });
  app.setGlobalPrefix('api');

  swaggerInit(app, process.env.NODE_ENV);

  // Get port and host from environment variables
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  Logger.log(`Listening on http://${host}:${port}`);
  await app.listen(port, host);
}

bootstrap();
