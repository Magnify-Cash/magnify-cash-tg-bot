import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';

export function ApiAuthHeader() {
  return applyDecorators(
    ApiHeader({
      name: 'init-data',
      description: 'Telegram Web App Data',
    }),
  );
}
