import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { WebAppUser } from './init-data.decorator';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WebAppUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const initData = req.get('init-data');
    const initDataParams = new URLSearchParams(initData);

    const currentUserStr = initDataParams.get('user');

    if (!currentUserStr) {
      throw new UnauthorizedException();
    }

    return JSON.parse(currentUserStr);
  },
);
