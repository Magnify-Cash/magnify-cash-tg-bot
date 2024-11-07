import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_TITLE = 'Default Title';
const DEFAULT_DESCRIPTION = 'Default Description';
const DEFAULT_VERSION = 'n\\a';

@Injectable()
export class SwaggerConfig {
  constructor(private readonly configService: ConfigService) {}

  get title(): string {
    return this.configService.get<string>('SWAGGER_TITLE') || DEFAULT_TITLE;
  }

  get description(): string {
    return (
      this.configService.get<string>('SWAGGER_DESCRIPTION') ||
      DEFAULT_DESCRIPTION
    );
  }

  get version(): string {
    return this.configService.get<string>('SWAGGER_VERSION') || DEFAULT_VERSION;
  }
}
