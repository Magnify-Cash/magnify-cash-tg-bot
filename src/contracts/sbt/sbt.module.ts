import { Module } from '@nestjs/common';
import { SbtService } from './sbt.service';

@Module({
  imports: [],
  controllers: [],
  providers: [SbtService],
  exports: [SbtService],
})
export class SbtModule {}
