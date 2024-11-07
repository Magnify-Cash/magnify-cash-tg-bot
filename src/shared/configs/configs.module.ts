import { Module, OnModuleInit } from '@nestjs/common';
import { ServerConfig } from './server.config';
import { SwaggerConfig } from './swagger.config';
import { ConfigModule } from '@nestjs/config';
import { TelegramConfig } from './telegram.config';
import { WorldIdConfig } from './world-coin.config';
import { CoinbaseConfig } from './coinbase.config';
import { CollateralNftConfig } from './collateral-nft.config';
import { SbtConfig } from './sbt.config copy';
import { LendingDeskConfig } from './lending-desk.config';
import { EncryptionConfig } from './encryption.config';

const configProviders = [
  ServerConfig,
  SwaggerConfig,
  TelegramConfig,
  WorldIdConfig,
  CoinbaseConfig,
  CollateralNftConfig,
  SbtConfig,
  LendingDeskConfig,
  EncryptionConfig,
];

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [],
  providers: configProviders,
  exports: configProviders,
})
export class ConfigsModule implements OnModuleInit {
  constructor(
    private readonly serverConfig: ServerConfig,
    private readonly swaggerConfig: SwaggerConfig,
    private readonly telegramConfig: TelegramConfig,
    private readonly worldIdConfig: WorldIdConfig,
    private readonly coinbaseConfig: CoinbaseConfig,
    private readonly collateralNftConfig: CollateralNftConfig,
    private readonly sbtConfig: SbtConfig,
    private readonly lendingDeskConfig: LendingDeskConfig,
    private readonly encryptionConfig: EncryptionConfig,
  ) {}

  onModuleInit(): void {
    const configs = [
      this.serverConfig,
      this.swaggerConfig,
      this.telegramConfig,
      this.worldIdConfig,
      this.coinbaseConfig,
      this.collateralNftConfig,
      this.sbtConfig,
      this.lendingDeskConfig,
      this.encryptionConfig,
    ];

    for (const config of configs) {
      this.validateConfig(config);
    }
  }

  private validateConfig(config: any): void {
    const prototype = Object.getPrototypeOf(config);
    const gettersKeys: string[] = [];

    Object.getOwnPropertyNames(prototype).forEach((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);

      if (descriptor && typeof descriptor.get === 'function') {
        gettersKeys.push(name);
      }
    });

    for (const getterKey of gettersKeys) {
      config[getterKey];
    }
  }
}
