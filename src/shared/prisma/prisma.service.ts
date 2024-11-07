import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger: Logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();

      this.logger.log('PostgreSQL connection established');
    } catch (error) {
      this.logger.error('PostgreSQL connection failed');

      throw error;
    }
  }
}
