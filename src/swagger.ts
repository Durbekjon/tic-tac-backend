import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export const swaggerInit = (app: INestApplication, env) => {
  if (env === 'local') {
    const config = new DocumentBuilder()
      .setTitle('Bootstrap API')
      .setVersion('0.0.1')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('/api/docs', app, document);
  }
};
