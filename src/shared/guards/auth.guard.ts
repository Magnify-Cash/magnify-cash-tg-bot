import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TelegramConfig } from '../configs/telegram.config';
import { verifyInitData } from '../utils/verify-init-data.util';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly telegramConfig: TelegramConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const { botToken } = this.telegramConfig;

    const req = context.switchToHttp().getRequest<Request>();
    const initData = req.get('init-data');

    let isVerifiedInitData: boolean;

    try {
      isVerifiedInitData = verifyInitData({
        initData,
        botToken,
      });
    } catch {
      isVerifiedInitData = false;
    }

    if (!isVerifiedInitData) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
