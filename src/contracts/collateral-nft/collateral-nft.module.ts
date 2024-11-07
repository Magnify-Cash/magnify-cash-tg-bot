import { Module } from '@nestjs/common';
import { CollateralNftService } from './collateral-nft.service';

@Module({
  imports: [],
  controllers: [],
  providers: [CollateralNftService],
  exports: [CollateralNftService],
})
export class CollateralNftModule {}
