import { Global, Module } from '@nestjs/common';
import { CoinbaseService } from './coinbase.service';
import { ContractsModule } from 'src/contracts/contracts.module';

@Global()
@Module({
  imports: [ContractsModule],
  controllers: [],
  providers: [CoinbaseService],
  exports: [CoinbaseService],
})
export class CoinbaseModule {}
