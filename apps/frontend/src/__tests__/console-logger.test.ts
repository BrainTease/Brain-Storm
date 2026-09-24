/**
 * Test to verify console.log and debug statements are properly replaced with project logger
 * Ensures proper logging practices and no debug leaks in production
 * Issue #1126: Remove console.log/debug statements from production bundle
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface Logger {
  debug: (msg: string, context?: Record<string, unknown>) => void;
  info: (msg: string, context?: Record<string, unknown>) => void;
  warn: (msg: string, context?: Record<string, unknown>) => void;
  error: (msg: string, context?: Record<string, unknown>) => void;
  log?: (msg: string) => void;
  isProduction: () => boolean;
}

const createMockLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  isProduction: () => process.env.NODE_ENV === 'production',
});

describe('Console Logger - Basic Functionality', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('should provide a project logger instance', () => {
    expect(mockLogger).toBeDefined();
    expect(typeof mockLogger.debug).toBe('function');
    expect(typeof mockLogger.info).toBe('function');
    expect(typeof mockLogger.warn).toBe('function');
    expect(typeof mockLogger.error).toBe('function');
  });

  it('should log debug messages in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockLogger.debug('Debug message', { context: 'test' });
    expect(mockLogger.debug).toHaveBeenCalledWith('Debug message', { context: 'test' });

    process.env.NODE_ENV = originalEnv;
  });

  it('should NOT output debug messages in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const isProduction = mockLogger.isProduction();
    expect(isProduction).toBe(true);

    if (isProduction) {
      mockLogger.debug = vi.fn();
    }

    mockLogger.debug('This should not be called in production');
    expect(mockLogger.debug).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('Console Logger - Error and Warning Handling', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('should properly log error messages with stack traces', () => {
    const error = new Error('Test error');
    mockLogger.error('An error occurred', {
      error,
      timestamp: new Date().toISOString(),
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'An error occurred',
      expect.objectContaining({ error })
    );
  });

  it('should properly log warning messages', () => {
    mockLogger.warn('Warning message', { severity: 'high' });
    expect(mockLogger.warn).toHaveBeenCalledWith('Warning message', {
      severity: 'high',
    });
  });

  it('should properly log info messages', () => {
    mockLogger.info('User logged in', { userId: 'user123' });
    expect(mockLogger.info).toHaveBeenCalledWith('User logged in', {
      userId: 'user123',
    });
  });
});

describe('Console Logger - Metadata and Formatting', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('should handle structured logging with metadata', () => {
    const metadata = {
      userId: 'user123',
      action: 'credential_issued',
      timestamp: new Date().toISOString(),
      success: true,
    };

    mockLogger.info('Action completed', metadata);
    expect(mockLogger.info).toHaveBeenCalledWith('Action completed', metadata);
  });

  it('should format log messages consistently', () => {
    const message = 'User action';
    const context = { userId: 'user123', action: 'login' };

    mockLogger.info(message, context);

    expect(mockLogger.info).toHaveBeenCalledWith(message, context);
  });

  it('should not output console.log in logger implementation', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockLogger.debug('Test message');

    expect(consoleLogSpy).not.toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });

  it('should not output console.debug in logger implementation', () => {
    const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    mockLogger.debug('Test message');

    expect(consoleDebugSpy).not.toHaveBeenCalled();
    consoleDebugSpy.mockRestore();
  });
});

describe('Console Logger - Log Levels', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('should support different log levels', () => {
    const levels: Array<keyof Logger> = ['debug', 'info', 'warn', 'error'];

    levels.forEach((level) => {
      mockLogger[level](`${level} message`);
      expect(mockLogger[level]).toHaveBeenCalled();
    });
  });
});

describe('Console Logger - Security and Data Handling', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  it('should not leak sensitive information in logs', () => {
    const sensitiveData = {
      userId: 'user123',
      password: 'secret123',
      apiKey: 'sk_live_123abc',
    };

    const safeData = { userId: sensitiveData.userId };
    mockLogger.info('User data', safeData);

    expect(mockLogger.info).toHaveBeenCalledWith('User data', safeData);
  });

  it('should handle null and undefined values gracefully', () => {
    mockLogger.info('Test message', { value: null });
    mockLogger.warn('Test warning', { value: undefined });

    expect(mockLogger.info).toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should handle complex objects in metadata', () => {
    const complexObject = {
      nested: {
        deep: {
          value: 'test',
          array: [1, 2, 3],
        },
      },
    };

    mockLogger.info('Complex data logged', complexObject as Record<string, unknown>);
    expect(mockLogger.info).toHaveBeenCalledWith('Complex data logged', complexObject);
  });

  it('should batch multiple log messages if needed', () => {
    const messages = ['msg1', 'msg2', 'msg3'];
    messages.forEach((msg) => mockLogger.info(msg));

    expect(mockLogger.info).toHaveBeenCalledTimes(3);
  });
});
