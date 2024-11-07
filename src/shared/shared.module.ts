import { Global, Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { ConfigsModule } from './configs/configs.module';

@Global()
@Module({
  imports: [PrismaModule, HealthModule, ConfigsModule],
  controllers: [],
  providers: [],
  exports: [PrismaModule, HealthModule, ConfigsModule],
})
export class SharedModule {}
