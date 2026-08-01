import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * SparseFieldsInterceptor — #709 Payload slimming
 *
 * When a request includes `?fields=id,title,level` the interceptor strips
 * every top-level key from each item in the list that is NOT in the
 * requested set.
 *
 * Works for:
 *  - Plain arrays          →  items trimmed directly
 *  - `{ data: [...] }`     →  items in `.data` trimmed (TransformInterceptor
 *                             wraps all responses in this shape)
 *  - `{ data: {}, ... }`   →  single-item responses trimmed
 *
 * Usage (client):
 *   GET /v1/courses?fields=id,title,level,price
 *
 * Payload reduction example (50-course list):
 *   Full response:    ~42 KB  (after gzip: ~8 KB)
 *   With 4 fields:   ~6 KB   (after gzip: ~1.5 KB)
 */
@Injectable()
export class SparseFieldsInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = ctx.switchToHttp().getRequest<{ query: Record<string, string> }>();
    const rawFields = request.query['fields'];

    if (!rawFields) return next.handle();

    const allowedFields = new Set(
      rawFields
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean)
    );
    if (allowedFields.size === 0) return next.handle();

    return next
      .handle()
      .pipe(map((response) => SparseFieldsInterceptor.trim(response, allowedFields)));
  }

  private static trim(response: unknown, fields: Set<string>): unknown {
    if (response === null || response === undefined) return response;

    // Plain array
    if (Array.isArray(response)) {
      return response.map((item) => SparseFieldsInterceptor.pickFields(item, fields));
    }

    // Wrapped response — TransformInterceptor shape: { data, statusCode, timestamp }
    if (typeof response === 'object') {
      const obj = response as Record<string, unknown>;
      if ('data' in obj) {
        return {
          ...obj,
          data: Array.isArray(obj.data)
            ? (obj.data as unknown[]).map((item) =>
                SparseFieldsInterceptor.pickFields(item, fields)
              )
            : SparseFieldsInterceptor.pickFields(obj.data, fields),
        };
      }
    }

    return response;
  }

  private static pickFields(item: unknown, fields: Set<string>): unknown {
    if (typeof item !== 'object' || item === null) return item;
    const result: Record<string, unknown> = {};
    for (const key of fields) {
      if (key in (item as Record<string, unknown>)) {
        result[key] = (item as Record<string, unknown>)[key];
      }
    }
    return result;
  }
}
