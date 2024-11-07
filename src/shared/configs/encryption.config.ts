import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EncryptionConfig {
  constructor(private readonly configService: ConfigService) {}

  get secret(): string {
    return this.configService.getOrThrow<string>('ENCRYPTION_KEY');
  }
}
