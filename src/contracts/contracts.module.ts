import { Module } from '@nestjs/common';
import { CollateralNftModule } from './collateral-nft/collateral-nft.module';
import { SbtModule } from './sbt/sbt.module';
import { LendingDeskModule } from './lending-desk/lending-desk.module';

@Module({
  imports: [CollateralNftModule, SbtModule, LendingDeskModule],
  controllers: [],
  providers: [],
  exports: [CollateralNftModule, SbtModule, LendingDeskModule],
})
export class ContractsModule {}
