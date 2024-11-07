import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ServerConfig } from './shared/configs/server.config';
import { getLogLevel } from './shared/utils/get-log-level.util';
import { setupSwagger } from './shared/utils/setup-swagger.util';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const GLOBAL_PREFIX = '/api';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const { host, port, env } = app.get(ServerConfig);

  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.useLogger(getLogLevel(env));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      enableDebugMessages: true,
      skipUndefinedProperties: false,
      skipNullProperties: false,
      skipMissingProperties: false,
      whitelist: true,
      forbidUnknownValues: true,
      disableErrorMessages: false,
    }),
  );
  app.enableShutdownHooks();

  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  setupSwagger(GLOBAL_PREFIX, app);

  await app.listen(port, host, async () => {
    const baseUrl = await app.getUrl();

    Logger.log(`Server is running at ${baseUrl}`, 'main.ts');
    Logger.log(`Swagger UI: ${baseUrl}${GLOBAL_PREFIX}`, 'main.ts');
  });
}
bootstrap();
