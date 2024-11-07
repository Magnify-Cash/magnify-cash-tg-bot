import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LendingDeskConfig {
  constructor(private readonly configService: ConfigService) {}

  get lendingDeskId(): bigint {
    return BigInt(this.configService.getOrThrow<string>('LENDING_DESK_ID'));
  }

  get erc20ContractAddress(): string {
    return this.configService.getOrThrow<string>(
      'LENDING_DESK_ERC20_CONTRACT_ADDRESS',
    );
  }

  get erc20ContractDecimals(): number {
    return parseInt(
      this.configService.getOrThrow<string>(
        'LENDING_DESK_ERC20_CONTRACT_DECIMALS',
      ),
    );
  }

  get contractAddress(): string {
    return this.configService.getOrThrow<string>(
      'LENDING_DESK_CONTRACT_ADDRESS',
    );
  }
}
