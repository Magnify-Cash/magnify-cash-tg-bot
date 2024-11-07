import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export type WebAppUser = {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
};

export type WebAppInitData = {
  user?: WebAppUser;
};

export const InitData = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WebAppInitData => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const initData = req.get('init-data');
    const initDataParams = new URLSearchParams(initData);

    const result: WebAppInitData = {};

    const user = initDataParams.get('user');

    if (user) {
      result.user = JSON.parse(user);
    }

    return result;
  },
);
