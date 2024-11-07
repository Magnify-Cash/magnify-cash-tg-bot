import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SwaggerConfig } from '../configs/swagger.config';

export function setupSwagger(path: string, app: INestApplication<any>): void {
  const { title, description, version } = app.get(SwaggerConfig);

  const config = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version)
    .addSecurity('ApiKeyAuth', {
      type: 'apiKey',
      in: 'header',
      name: 'x-api-key',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(path, app, document);
}
