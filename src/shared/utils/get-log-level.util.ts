import { LogLevel } from '@nestjs/common';
import { Environment } from 'src/shared/configs/server.config';
import { exhaustiveCheck } from './exhaustive-check.util';

export const PRODUCTION_LOG_LEVEL: LogLevel[] = [
  'log',
  'error',
  'warn',
  'fatal',
];

export const DEVELOPMENT_LOG_LEVEL: LogLevel[] = [
  ...PRODUCTION_LOG_LEVEL,
  'debug',
  'verbose',
];

export function getLogLevel(env: Environment): LogLevel[] {
  switch (env) {
    case Environment.PROD:
      return PRODUCTION_LOG_LEVEL;

    case Environment.DEV:
      return DEVELOPMENT_LOG_LEVEL;

    default:
      exhaustiveCheck(env);
  }
}
