import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startAt = process.hrtime();

    res.on('finish', () => {
      const { ip, method } = req;
      const url = req.originalUrl || req.url;
      const { statusCode } = res;
      const contentLength = res.get('content-length') ?? `"-"`;
      const referrer = req.headers.referer || '-';
      const diff = process.hrtime(startAt);
      const userAgent = req.get('user-agent') || '-';
      const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);

      this.logger.debug(
        `${ip} "${method} ${url}" ${statusCode} ${contentLength} "${referrer}" "${userAgent}" ${responseTime}ms`,
      );
    });

    next();
  }
}
