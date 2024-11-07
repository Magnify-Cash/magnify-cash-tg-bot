import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SbtConfig {
  constructor(private readonly configService: ConfigService) {}

  get contractAddress(): string {
    return this.configService.getOrThrow<string>('SBT_CONTRACT_ADDRESS');
  }
}
