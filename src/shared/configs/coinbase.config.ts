import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Hex } from 'viem';

@Injectable()
export class CoinbaseConfig {
  constructor(private readonly configService: ConfigService) {}

  get apiKeyName(): string {
    return this.configService.getOrThrow<string>('COINBASE_API_KEY_NAME');
  }

  get privateKey(): string {
    return this.configService.getOrThrow<string>('COINBASE_PRIVATE_KEY');
  }

  get rpcUrl(): string {
    return this.configService.getOrThrow<string>('COINBASE_RPC_URL');
  }

  get minterPrivateKey(): Hex {
    return this.configService.getOrThrow<Hex>('MINTER_PRIVATE_KEY');
  }
}
