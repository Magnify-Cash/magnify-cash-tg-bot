import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { SharedModule } from './shared/shared.module';
import { LoggerMiddleware } from './shared/middlewares/logger.middleware';
import { CacheControlMiddleware } from './shared/middlewares/cache-control.middleware';
import { TelegramBotModule } from './telegram-bot/telegram-bot.module';
import { WorldIdModule } from './world-id/world-id.module';
import { UsersModule } from './users/users.module';
import { CoinbaseModule } from './coinbase/coinbase.module';
import { ContractsModule } from './contracts/contracts.module';

@Module({
  imports: [
    SharedModule,
    WorldIdModule,
    UsersModule,
    CoinbaseModule,
    ContractsModule,
    TelegramBotModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes('*');
    consumer.apply(CacheControlMiddleware).forRoutes('*');
  }
}
