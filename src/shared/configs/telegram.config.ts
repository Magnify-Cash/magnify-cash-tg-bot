import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramConfig {
  constructor(private readonly configService: ConfigService) {}

  get botToken(): string {
    const botToken =
      this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      throw new Error('Invalid TELEGRAM_BOT_TOKEN');
    }

    return botToken;
  }

  get botDomain(): string {
    const botServerUrl = this.configService.getOrThrow<string>(
      'TELEGRAM_BOT_DOMAIN',
    );

    if (!botServerUrl) {
      throw new Error('Invalid TELEGRAM_BOT_DOMAIN');
    }

    if (botServerUrl.startsWith('http:')) {
      throw new Error('Invalid TELEGRAM_BOT_DOMAIN protocol: HTTPS required');
    }

    return botServerUrl;
  }
}
