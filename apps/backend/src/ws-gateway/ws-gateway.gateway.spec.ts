import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { WsGatewayGateway } from './ws-gateway.gateway';

const mockRedis = () => ({ publish: jest.fn(), subscribe: jest.fn(), on: jest.fn() });

describe('WsGatewayGateway', () => {
  let gateway: WsGatewayGateway;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsGatewayGateway,
        { provide: JwtService, useValue: { verify: jest.fn() } },
        { provide: 'REDIS_PUBLISHER', useValue: mockRedis() },
        { provide: 'REDIS_SUBSCRIBER', useValue: mockRedis() },
      ],
    }).compile();

    gateway = module.get<WsGatewayGateway>(WsGatewayGateway);
    jwtService = module.get<JwtService>(JwtService);
    gateway.server = { to: jest.fn().mockReturnThis(), emit: jest.fn() } as any;
  });

  it('disconnects client when no token', () => {
    const client = { handshake: { auth: {} }, disconnect: jest.fn(), join: jest.fn() } as any;
    gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('disconnects client when invalid token', () => {
    jest.spyOn(jwtService, 'verify').mockImplementation(() => { throw new Error('invalid'); });
    const client = { handshake: { auth: { token: 'bad' } }, disconnect: jest.fn(), join: jest.fn() } as any;
    gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('joins room user:{sub} on valid token', () => {
    jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: '42' } as any);
    const client = { id: 'c1', handshake: { auth: { token: 'good' } }, disconnect: jest.fn(), join: jest.fn() } as any;
    gateway.handleConnection(client);
    expect(client.join).toHaveBeenCalledWith('user:42');
  });

  it('handlePing returns pong', () => {
    const result = gateway.handlePing();
    expect(result.event).toBe('pong');
    expect(typeof result.data).toBe('number');
  });

  it('emitToUser calls server.to().emit()', () => {
    const toMock = { emit: jest.fn() };
    (gateway.server.to as jest.Mock).mockReturnValue(toMock);
    gateway.emitToUser('99', 'test-event', { foo: 'bar' });
    expect(gateway.server.to).toHaveBeenCalledWith('user:99');
    expect(toMock.emit).toHaveBeenCalledWith('test-event', { foo: 'bar' });
  });
});
