import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum Environment {
  DEV = 'development',
  PROD = 'production',
}

const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_PORT = 3000;
const DEFAULT_ENV = Environment.DEV;

@Injectable()
export class ServerConfig {
  constructor(private readonly configService: ConfigService) {}

  get host(): string {
    return this.configService.get<string>('HOST') || DEFAULT_HOST;
  }

  get port(): number {
    const port = parseInt(this.configService.get<string>('PORT'));

    return isNaN(port) ? DEFAULT_PORT : port;
  }

  get env(): Environment {
    return this.configService.get<Environment>('NODE_ENV') || DEFAULT_ENV;
  }

  get isProduction(): boolean {
    return this.env === 'production';
  }
}
