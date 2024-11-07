import { Module } from '@nestjs/common';
import { WorldIdController } from './world-id.controller';
import { WorldIdService } from './world-id.service';

@Module({
  imports: [],
  controllers: [WorldIdController],
  providers: [WorldIdService],
  exports: [WorldIdService],
})
export class WorldIdModule {}
