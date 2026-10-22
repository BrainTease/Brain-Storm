import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { JwtAuthGuard } from './jwt-auth.guard';

// passport is not installed in this workspace; only getRequest is under test.
jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class {
      canActivate() {
        return true;
      }
    },
}));

describe('JwtAuthGuard (#1289)', () => {
  const guard = new JwtAuthGuard();

  it('reads the request from the HTTP context for REST routes', () => {
    const httpReq = { headers: { authorization: 'Bearer x' } };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => httpReq }),
    } as unknown as ExecutionContext;

    expect(guard.getRequest(context)).toBe(httpReq);
  });

  it('reads the request from the GraphQL context for resolvers', () => {
    const gqlReq = { headers: { authorization: 'Bearer y' } };
    const context = { getType: () => 'graphql' } as unknown as ExecutionContext;
    const spy = jest
      .spyOn(GqlExecutionContext, 'create')
      .mockReturnValue({ getContext: () => ({ req: gqlReq }) } as unknown as GqlExecutionContext);

    expect(guard.getRequest(context)).toBe(gqlReq);
    expect(spy).toHaveBeenCalledWith(context);
    spy.mockRestore();
  });
});
