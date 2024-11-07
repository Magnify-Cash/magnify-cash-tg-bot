import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CollateralNftConfig {
  constructor(private readonly configService: ConfigService) {}

  get contractAddress(): string {
    return this.configService.getOrThrow<string>(
      'COLLATERAL_NFT_CONTRACT_ADDRESS',
    );
  }
}
