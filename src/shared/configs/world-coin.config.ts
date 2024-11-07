import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorldIdConfig {
  constructor(private readonly configService: ConfigService) {}

  get appId(): `app_${string}` {
    const appId =
      this.configService.getOrThrow<`app_${string}`>('WORLD_COIN_APP_ID');

    if (!appId) {
      throw new Error('Invalid WORLD_COIN_APP_ID');
    }

    return appId;
  }

  get action(): string {
    const action = this.configService.getOrThrow<string>(
      'WORLD_COIN_ACTION_IDENTIFIER',
    );

    if (!action) {
      throw new Error('Invalid WORLD_COIN_ACTION_IDENTIFIER');
    }

    return action;
  }
}
