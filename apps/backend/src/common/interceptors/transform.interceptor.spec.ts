import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';
import { ApiResponseDto, PaginatedResponseDto } from '../dto/api-response.dto';
import { ExecutionContext } from '@nestjs/common';

/** Build a minimal ExecutionContext mock with the given HTTP status code */
function buildCtx(statusCode = 200): ExecutionContext {
  const getResponse = jest.fn().mockReturnValue({ statusCode });
  const switchToHttp = jest.fn().mockReturnValue({ getResponse });
  return { switchToHttp } as unknown as ExecutionContext;
}

/** Run the interceptor and collect the emitted value */
async function run(interceptor: TransformInterceptor<any>, ctx: ExecutionContext, data: unknown) {
  return new Promise((resolve) => {
    interceptor
      .intercept(ctx, { handle: () => of(data) } as any)
      .subscribe(resolve);
  });
}

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should wrap a plain object in ApiResponseDto', async () => {
    const ctx = buildCtx(200);
    const result = await run(interceptor, ctx, { id: '1', name: 'Alice' });

    expect(result).toBeInstanceOf(ApiResponseDto);
    const dto = result as ApiResponseDto<any>;
    expect(dto.data).toEqual({ id: '1', name: 'Alice' });
    expect(dto.statusCode).toBe(200);
    expect(typeof dto.timestamp).toBe('string');
  });

  it('should wrap a plain array in ApiResponseDto', async () => {
    const ctx = buildCtx(200);
    const result = await run(interceptor, ctx, [{ id: '1' }, { id: '2' }]);

    expect(result).toBeInstanceOf(ApiResponseDto);
    const dto = result as ApiResponseDto<any>;
    expect(dto.data).toHaveLength(2);
  });

  it('should pass through an existing ApiResponseDto as-is', async () => {
    const ctx = buildCtx(200);
    const existing = new ApiResponseDto({ id: '1' }, 200);
    const result = await run(interceptor, ctx, existing);

    expect(result).toBe(existing);
  });

  it('should pass through an existing PaginatedResponseDto as-is', async () => {
    const ctx = buildCtx(200);
    const existing = new PaginatedResponseDto([{ id: '1' }], 200, 1, 10, 1);
    const result = await run(interceptor, ctx, existing);

    expect(result).toBe(existing);
  });

  it('should include the correct statusCode from the response', async () => {
    const ctx = buildCtx(201);
    const result = (await run(interceptor, ctx, { id: 'new' })) as ApiResponseDto<any>;

    expect(result.statusCode).toBe(201);
  });

  it('should wrap null data without throwing', async () => {
    const ctx = buildCtx(200);
    const result = (await run(interceptor, ctx, null)) as ApiResponseDto<any>;

    expect(result).toBeInstanceOf(ApiResponseDto);
    expect(result.data).toBeNull();
  });
});
