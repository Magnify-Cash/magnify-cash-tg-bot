import { Module } from '@nestjs/common';
import { LendingDeskService } from './lending-desk.service';
import { CollateralNftModule } from '../collateral-nft/collateral-nft.module';

@Module({
  imports: [CollateralNftModule],
  controllers: [],
  providers: [LendingDeskService],
  exports: [LendingDeskService],
})
export class LendingDeskModule {}
