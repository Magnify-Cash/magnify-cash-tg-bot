import { Controller, Post, Body } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { ApiTags } from '@nestjs/swagger';
import { Update } from 'node-telegram-bot-api';

@ApiTags('telegram-bot-controller')
@Controller('telegram-bot')
export class TelegramBotController {
  constructor(private readonly telegramBotService: TelegramBotService) {}

  @Post('processUpdate')
  processUpdate(@Body() update: Update): void {
    this.telegramBotService.processUpdate(update);
  }
}
