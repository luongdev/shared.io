/**
 * Socket Client
 *
 * This module provides a Socket.IO client interface that uses a Shared Worker.
 */

import {
  ConnectionStatus,
  MessageType,
  NotificationAPI,
  NotificationOptions,
  SharedSocketClient,
  SharedSocketIOOptions,
  WorkerClient,
} from '../common/types';
import { createWorkerClient } from './worker-client';
import { DEFAULT_OPTIONS } from '../common/constants';
import { generateUniqueId, requestNotificationPermission } from '../common/utils';

/**
 * Interface for Shared Socket.IO Client
 */
export interface ISharedSocketClient extends SharedSocketClient {
  connect(): string;
  disconnect(): void;
  emit(eventName: string, ...args: any[]): void;
  emitWithAck(eventName: string, ...args: any[]): Promise<any>;
  on(eventName: string, callback: Function): void;
  off(eventName: string, callback?: Function): void;
  once(eventName: string, callback: Function): void;
  notifications: NotificationAPI;
}

/**
 * Notification API implementation
 */
class NotificationAPIImpl implements NotificationAPI {
  /**
   * @param workerClient Worker client instance
   */
  constructor(private workerClient: WorkerClient) { }

  /**
   * Subscribe to notifications for an event
   * @param eventName Event name to subscribe to
   * @param options Notification options
   * @returns Promise that resolves when subscription is complete
   */
  public async subscribe(eventName: string, options: NotificationOptions): Promise<void> {
    const permission = await requestNotificationPermission();

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    this.workerClient.send({ type: MessageType.SUBSCRIBE_NOTIFICATION, payload: { eventName, options } });
  }

  /**
   * Unsubscribe from notifications for an event
   * @param eventName Event name to unsubscribe from
   */
  public unsubscribe(eventName: string): void {
    this.workerClient.send({ type: MessageType.UNSUBSCRIBE_NOTIFICATION, payload: { eventName } });
  }
}

/**
 * Shared Socket.IO Client class
 */
export class SharedSocketIOClient implements ISharedSocketClient {
  private workerClient: WorkerClient;
  private eventListeners: Record<string, Set<Function>> = {};
  private connectionStatus: ConnectionStatus = {
    connected: false,
  };
  private socketOptions: SharedSocketIOOptions;
  public notifications: NotificationAPI;

  /**
   * @param url Socket.IO server URL
   * @param options Socket.IO options
   */
  constructor(
    private url: string,
    options?: Partial<SharedSocketIOOptions>
  ) {
    this.socketOptions = { ...DEFAULT_OPTIONS, ...options };
    this.workerClient = createWorkerClient(this.socketOptions);
    this.notifications = new NotificationAPIImpl(this.workerClient);

    this.setupEventListeners();

    if (this.socketOptions.autoConnect) {
      this.connect();
    }
  }

  /**
   * Set up event listeners for worker client messages
   */
  private setupEventListeners(): void {
    this.workerClient.subscribe(MessageType.EVENT, (payload) => {
      const { eventName, args } = payload;

      if (this.eventListeners[eventName]) {
        this.eventListeners[eventName].forEach((callback) => {
          try {
            callback(...args);
          } catch (error) {
            console.error(`Error in event listener for event ${eventName}:`, error);
          }
        });
      }
    });

    this.workerClient.subscribe(MessageType.CONNECTED, (payload) => {
      this.connectionStatus = payload.status;

      if (this.eventListeners['connect']) {
        this.eventListeners['connect'].forEach((callback) => {
          try {
            callback();
          } catch (error) {
            console.error('Error in connect listener:', error);
          }
        });
      }
    });

    this.workerClient.subscribe(MessageType.DISCONNECTED, (payload) => {
      this.connectionStatus = { connected: false, error: payload.reason };

      if (this.eventListeners['disconnect']) {
        this.eventListeners['disconnect'].forEach((callback) => {
          try {
            callback(payload.reason);
          } catch (error) {
            console.error('Error in disconnect listener:', error);
          }
        });
      }
    });

    this.workerClient.subscribe(MessageType.ERROR, (payload) => {
      if (this.eventListeners['error']) {
        this.eventListeners['error'].forEach((callback) => {
          try {
            callback(payload);
          } catch (error) {
            console.error('Error in error listener:', error);
          }
        });
      } else {
        console.error('Unhandled Socket.IO error:', payload);
      }
    });
  }

  /**
   * Connect to Socket.IO server
   * @returns Connection ID that can be used to identify this connection
   */
  public connect(): string {
    const connectionId = generateUniqueId();
    this.workerClient.send({
      type: MessageType.CONNECT,
      payload: {
        url: this.url,
        options: this.socketOptions,
        connectionId,
      },
    });
    return connectionId;
  }

  /**
   * Disconnect from Socket.IO server
   */
  public disconnect(): void {
    this.workerClient.send({ type: MessageType.DISCONNECT, payload: {} });
  }

  /**
   * Emit an event to Socket.IO server
   * @param eventName Event name
   * @param args Event arguments
   */
  public emit(eventName: string, ...args: any[]): void {
    this.workerClient.send({ type: MessageType.EMIT, payload: { eventName, args } });
  }

  /**
   * Emit an event to Socket.IO server and wait for acknowledgement
   * @param eventName Event name
   * @param args Event arguments
   * @returns Promise with acknowledgement result
   */
  public emitWithAck(eventName: string, ...args: any[]): Promise<any> {
    return this.workerClient.sendWithResponse({
      type: MessageType.EMIT_WITH_ACK,
      payload: { eventName, args },
      id: generateUniqueId(),
    });
  }

  /**
   * Register event listener
   * @param eventName Event name
   * @param callback Callback function
   */
  public on(eventName: string, callback: Function): void {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = new Set();
      this.workerClient.send({ type: MessageType.ON, payload: { eventName } });
    }

    this.eventListeners[eventName].add(callback);
  }

  /**
   * Unregister event listener
   * @param eventName Event name
   * @param callback Callback function (optional)
   */
  public off(eventName: string, callback?: Function): void {
    if (!this.eventListeners[eventName]) return;

    if (callback) {
      this.eventListeners[eventName].delete(callback);
      if (this.eventListeners[eventName].size === 0) {
        delete this.eventListeners[eventName];
        this.workerClient.send({ type: MessageType.OFF, payload: { eventName } });
      }
    } else {
      delete this.eventListeners[eventName];
      this.workerClient.send({ type: MessageType.OFF, payload: { eventName } });
    }
  }

  /**
   * Register one-time event listener
   * @param eventName Event name
   * @param callback Callback function
   */
  public once(eventName: string, callback: Function): void {
    const onceWrapper = (...args: any[]) => {
      this.off(eventName, onceWrapper);
      callback(...args);
    };

    this.on(eventName, onceWrapper);
    this.workerClient.send({ type: MessageType.ONCE, payload: { eventName } });
  }

  /**
   * Get current connection status
   * @returns Connection status
   */
  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
}

/**
 * Create a shared Socket.IO client instance
 * @param url Socket.IO server URL
 * @param options Socket.IO options
 * @returns SharedSocketClient instance
 */
export function createSharedSocketIO(url: string, options?: Partial<SharedSocketIOOptions>): SharedSocketClient {
  return new SharedSocketIOClient(url, options);
}
