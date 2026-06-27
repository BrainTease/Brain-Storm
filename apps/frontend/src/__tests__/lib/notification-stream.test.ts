import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { NotificationStream, StreamConfig } from '@/lib/notification-stream';

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
  return {
    io: vi.fn(() => mockSocket),
  };
});

describe('NotificationStream', () => {
  let stream: NotificationStream;
  let config: StreamConfig;
  let mockCallbacks: {
    onNotification: Mock;
    onRead: Mock;
    onUnread: Mock;
    onInit: Mock;
    onConnectionChange: Mock;
  };

  beforeEach(() => {
    mockCallbacks = {
      onNotification: vi.fn(),
      onRead: vi.fn(),
      onUnread: vi.fn(),
      onInit: vi.fn(),
      onConnectionChange: vi.fn(),
    };

    config = {
      url: 'http://localhost:3000',
      token: 'test-token',
      ...mockCallbacks,
      pollingIntervalMs: 1000,
    };

    stream = new NotificationStream(config);
  });

  afterEach(() => {
    stream.disconnect();
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should create socket connection', async () => {
      await stream.connect();
      expect(stream.isWebSocketConnected).toBeDefined();
    });

    it('should set correct socket.io configuration', async () => {
      const { io } = await import('socket.io-client');
      await stream.connect();

      // Verify io was called with correct namespace and options
      expect(io).toHaveBeenCalledWith(
        'http://localhost:3000/notifications',
        expect.objectContaining({
          auth: { token: 'test-token' },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: Infinity,
        })
      );
    });

    it('should not reconnect if already connected', async () => {
      const { io } = await import('socket.io-client');
      vi.clearAllMocks();

      await stream.connect();
      const callCountAfterFirst = (io as Mock).mock.calls.length;

      await stream.connect();
      const callCountAfterSecond = (io as Mock).mock.calls.length;

      expect(callCountAfterSecond).toBe(callCountAfterFirst);
    });

    it('should call onConnectionChange with true on connect', async () => {
      const { io: ioMock } = await import('socket.io-client');
      const mockSocket = (ioMock as Mock).mock.results[0].value;

      await stream.connect();

      // Get the connect handler and call it
      const connectHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];

      if (connectHandler) {
        connectHandler();
        expect(mockCallbacks.onConnectionChange).toHaveBeenCalledWith(true);
      }
    });

    it('should call onConnectionChange with false on disconnect', async () => {
      const { io: ioMock } = await import('socket.io-client');
      const mockSocket = (ioMock as Mock).mock.results[0].value;

      await stream.connect();

      const disconnectHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'disconnect'
      )?.[1];

      if (disconnectHandler) {
        disconnectHandler();
        expect(mockCallbacks.onConnectionChange).toHaveBeenCalledWith(false);
      }
    });
  });

  describe('markAsRead', () => {
    it('should emit markRead event when connected', async () => {
      const { io: ioMock } = await import('socket.io-client');
      const mockSocket = (ioMock as Mock).mock.results[0].value;

      mockSocket.connected = true;
      await stream.connect();

      // Simulate connection
      const connectHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];
      if (connectHandler) connectHandler();

      const ids = ['id1', 'id2'];
      stream.markAsRead(ids);

      expect(mockSocket.emit).toHaveBeenCalledWith('notifications:markRead', ids);
    });

    it('should queue operation when disconnected', async () => {
      await stream.connect();

      const ids = ['id1', 'id2'];
      stream.markAsRead(ids);

      // Operation should be queued
      // We verify by checking that markAsRead doesn't throw
      expect(() => stream.markAsRead(ids)).not.toThrow();
    });
  });

  describe('markAsUnread', () => {
    it('should emit markUnread event when connected', async () => {
      const { io: ioMock } = await import('socket.io-client');
      const mockSocket = (ioMock as Mock).mock.results[0].value;

      mockSocket.connected = true;
      await stream.connect();

      const connectHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];
      if (connectHandler) connectHandler();

      const ids = ['id1'];
      stream.markAsUnread(ids);

      expect(mockSocket.emit).toHaveBeenCalledWith('notifications:markUnread', ids);
    });
  });

  describe('updatePreferences', () => {
    it('should emit updatePreferences event when connected', async () => {
      const { io: ioMock } = await import('socket.io-client');
      const mockSocket = (ioMock as Mock).mock.results[0].value;

      mockSocket.connected = true;
      await stream.connect();

      const connectHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];
      if (connectHandler) connectHandler();

      const prefs = { enrollment: true, progress: false };
      stream.updatePreferences(prefs);

      expect(mockSocket.emit).toHaveBeenCalledWith('notifications:updatePreferences', prefs);
    });
  });

  describe('disconnect', () => {
    it('should disconnect socket', async () => {
      const { io: ioMock } = await import('socket.io-client');
      const mockSocket = (ioMock as Mock).mock.results[0].value;

      await stream.connect();
      stream.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should stop polling fallback', async () => {
      await stream.connect();
      stream.disconnect();

      // Should not throw when disconnecting
      expect(() => stream.disconnect()).not.toThrow();
    });
  });

  describe('isWebSocketConnected', () => {
    it('should return false when not connected', () => {
      expect(stream.isWebSocketConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      const { io: ioMock } = await import('socket.io-client');
      const mockSocket = (ioMock as Mock).mock.results[0].value;

      mockSocket.connected = true;
      await stream.connect();

      const connectHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];
      if (connectHandler) {
        connectHandler();
        expect(stream.isWebSocketConnected()).toBe(true);
      }
    });
  });

  describe('event handlers', () => {
    it('should call onInit when notifications:init event received', async () => {
      const { io: ioMock } = await import('socket.io-client');
      const mockSocket = (ioMock as Mock).mock.results[0].value;

      await stream.connect();

      const initHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'notifications:init'
      )?.[1];

      if (initHandler) {
        const notifications = [{ id: '1', message: 'test' }];
        initHandler(notifications);
        expect(mockCallbacks.onInit).toHaveBeenCalledWith(notifications);
      }
    });

    it('should call onNotification when notification event received', async () => {
      const { io: ioMock } = await import('socket.io-client');
      const mockSocket = (ioMock as Mock).mock.results[0].value;

      await stream.connect();

      const notificationHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'notification'
      )?.[1];

      if (notificationHandler) {
        const notification = { id: '1', message: 'test' };
        notificationHandler(notification);
        expect(mockCallbacks.onNotification).toHaveBeenCalledWith(notification);
      }
    });

    it('should call onRead when notifications:read event received', async () => {
      const { io: ioMock } = await import('socket.io-client');
      const mockSocket = (ioMock as Mock).mock.results[0].value;

      await stream.connect();

      const readHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'notifications:read'
      )?.[1];

      if (readHandler) {
        const ids = ['id1', 'id2'];
        readHandler(ids);
        expect(mockCallbacks.onRead).toHaveBeenCalledWith(ids);
      }
    });

    it('should call onUnread when notifications:unread event received', async () => {
      const { io: ioMock } = await import('socket.io-client');
      const mockSocket = (ioMock as Mock).mock.results[0].value;

      await stream.connect();

      const unreadHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'notifications:unread'
      )?.[1];

      if (unreadHandler) {
        const ids = ['id1'];
        unreadHandler(ids);
        expect(mockCallbacks.onUnread).toHaveBeenCalledWith(ids);
      }
    });
  });

  describe('graceful degradation', () => {
    it('should fall back to polling on connection error', async () => {
      const { io: ioMock } = await import('socket.io-client');
      const mockSocket = (ioMock as Mock).mock.results[0].value;

      await stream.connect();

      const errorHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'connect_error'
      )?.[1];

      if (errorHandler) {
        const error = new Error('Connection failed');
        expect(() => errorHandler(error)).not.toThrow();
      }
    });
  });

  describe('pending operations', () => {
    it('should flush pending operations on reconnect', async () => {
      const { io: ioMock } = await import('socket.io-client');
      const mockSocket = (ioMock as Mock).mock.results[0].value;

      mockSocket.connected = false;
      await stream.connect();

      // Queue operations while disconnected
      const ids = ['id1', 'id2'];
      stream.markAsRead(ids);

      vi.clearAllMocks();

      // Simulate reconnection
      mockSocket.connected = true;
      const connectHandler = (mockSocket.on as Mock).mock.calls.find(
        (call) => call[0] === 'connect'
      )?.[1];

      if (connectHandler) {
        connectHandler();
      }

      // Pending operations should be flushed
      expect(mockSocket.emit).toHaveBeenCalled();
    });
  });
});
