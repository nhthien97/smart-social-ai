import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class UrlNormalizationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // Normalize avatar URLs - remove /api/v1 prefix if present
    if (body && body.avatar) {
      body.avatar = this.normalizeUrl(body.avatar);
    }
    if (body && body.avatar_url) {
      body.avatar_url = this.normalizeUrl(body.avatar_url);
    }

    return next.handle();
  }

  private normalizeUrl(url: string): string {
    if (!url) return url;
    // Remove /api/v1 prefix if it exists at the start
    return url.replace(/^\/api\/v1\//, '/');
  }
}
