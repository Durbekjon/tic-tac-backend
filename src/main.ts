import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS with configuration from environment
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    methods: ['GET','POST'],
    credentials: true,
  });


  // Get port and host from environment variables
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  console.log(`Listening on http://${host}:${port}`);
  await app.listen(port, host);
}

bootstrap();
