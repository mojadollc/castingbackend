import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, ip } = req;
    const userId = req.user?.id ?? 'anon';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          this.logger.log(`${method} ${url} ${res.statusCode} ${Date.now() - start}ms [${userId}] ${ip}`);
        },
        error: (err) => {
          this.logger.warn(`${method} ${url} ${err.status ?? 500} ${Date.now() - start}ms [${userId}] ${ip} — ${err.message}`);
        },
      }),
    );
  }
}
