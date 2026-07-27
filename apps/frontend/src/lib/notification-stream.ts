/**
 * Real-time notification stream with WebSocket and polling fallback
 */

import { io, Socket } from 'socket.io-client';
import { ReconnectStrategy, DEFAULT_RECONNECT_CONFIG } from './reconnect-strategy';

export interface StreamConfig {
  url: string;
  token: string;
  onNotification?: (notification: unknown) => void;
  onRead?: (ids: string[]) => void;
  onUnread?: (ids: string[]) => void;
  onInit?: (notifications: unknown[]) => void;
  onConnectionChange?: (connected: boolean) => void;
  pollingIntervalMs?: number;
}

interface PendingOperation {
  event: string;
  data: unknown;
}

/**
 * Manages real-time notifications with WebSocket and graceful polling fallback
 */
export class NotificationStream {
  private socket: Socket | null = null;
  private reconnectStrategy: ReconnectStrategy;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private pendingOperations: PendingOperation[] = [];
  private isConnected = false;
  private config: StreamConfig;

  constructor(config: StreamConfig) {
    this.config = config;
    this.reconnectStrategy = new ReconnectStrategy(DEFAULT_RECONNECT_CONFIG);
  }

  /**
   * Connect to notification stream
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    try {
      this.socket = io(`${this.config.url}/notifications`, {
        auth: { token: this.config.token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: this.reconnectStrategy.getDelay(0),
        reconnectionDelayMax: 30000,
        reconnectionAttempts: Infinity,
      });

      this.setupSocketListeners();
      this.reconnectStrategy.reset();
    } catch (error) {
      console.error('Failed to connect to notification stream:', error);
      this.startPollingFallback();
    }
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectStrategy.reset();
      this.flushPendingOperations();
      this.stopPollingFallback();
      this.config.onConnectionChange?.(true);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.config.onConnectionChange?.(false);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.warn('Connection error, falling back to polling:', error);
      this.startPollingFallback();
    });

    // Notification events
    this.socket.on('notifications:init', (notifications: unknown[]) => {
      this.config.onInit?.(notifications);
    });

    this.socket.on('notification', (notification: unknown) => {
      this.config.onNotification?.(notification);
    });

    this.socket.on('notifications:read', (ids: string[]) => {
      this.config.onRead?.(ids);
    });

    this.socket.on('notifications:unread', (ids: string[]) => {
      this.config.onUnread?.(ids);
    });
  }

  /**
   * Mark notifications as read
   */
  markAsRead(ids: string[]): void {
    const operation = { event: 'notifications:markRead', data: ids };

    if (this.isConnected && this.socket) {
      this.socket.emit(...Object.values(operation));
    } else {
      this.pendingOperations.push(operation);
    }
  }

  /**
   * Mark notifications as unread
   */
  markAsUnread(ids: string[]): void {
    const operation = { event: 'notifications:markUnread', data: ids };

    if (this.isConnected && this.socket) {
      this.socket.emit(...Object.values(operation));
    } else {
      this.pendingOperations.push(operation);
    }
  }

  /**
   * Update notification preferences on server
   */
  updatePreferences(preferences: unknown): void {
    const operation = { event: 'notifications:updatePreferences', data: preferences };

    if (this.isConnected && this.socket) {
      this.socket.emit(...Object.values(operation));
    } else {
      this.pendingOperations.push(operation);
    }
  }

  /**
   * Flush pending operations when connection is restored
   */
  private flushPendingOperations(): void {
    if (!this.socket) return;

    for (const op of this.pendingOperations) {
      this.socket.emit(op.event, op.data);
    }

    this.pendingOperations = [];
  }

  /**
   * Start polling fallback when WebSocket is unavailable
   */
  private startPollingFallback(): void {
    if (this.pollingInterval) return;

    const intervalMs = this.config.pollingIntervalMs || 5000;

    this.pollingInterval = setInterval(() => {
      this.pollNotifications();
    }, intervalMs);
  }

  /**
   * Stop polling fallback
   */
  private stopPollingFallback(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Poll notifications via REST API
   */
  private async pollNotifications(): Promise<void> {
    try {
      const response = await fetch(`${this.config.url}/notifications`, {
        headers: { Authorization: `Bearer ${this.config.token}` },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const notifications = await response.json();
      this.config.onInit?.(notifications);
    } catch (error) {
      console.warn('Polling failed:', error);
    }
  }

  /**
   * Check if connected via WebSocket
   */
  isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from stream
   */
  disconnect(): void {
    this.stopPollingFallback();
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
  }
}
