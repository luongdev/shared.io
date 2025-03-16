/**
 * Socket Manager
 * 
 * This module manages Socket.IO connection and event handling.
 */

import { io, Socket } from 'socket.io-client';
import {
  WorkerMessage,
  MessageType,
  SharedSocketIOOptions,
  ConnectionStatus
} from '../common/types';
import { serializeError } from '../common/utils';
import { IMessageRouter } from './message-router';
import { IAckManager } from './ack-manager';
import { INotificationManager } from './notification';
import { ILongPollingManager } from './long-polling';

/**
 * Interface for Socket Manager
 */
export interface ISocketManager {
  connect(url: string, options: SharedSocketIOOptions, message: WorkerMessage): void;
  disconnect(message: WorkerMessage): void;
  emit(eventName: string, args: any[], message: WorkerMessage): void;
  emitWithAck(eventName: string, args: any[], message: WorkerMessage): Promise<any>;
  on(eventName: string, message: WorkerMessage): void;
  off(eventName: string, message: WorkerMessage): void;
  once(eventName: string, message: WorkerMessage): void;
  getConnectionStatus(): ConnectionStatus;
}

/**
 * Socket Manager class to handle Socket.IO connections
 */
export class SocketManager implements ISocketManager {
  private socket: Socket | null = null;
  private connectionStatus: ConnectionStatus = {
    connected: false
  };
  private registeredEvents: Record<string, Set<string>> = {};

  /**
   * @param messageRouter Message router instance
   * @param ackManager ACK manager instance
   * @param notificationManager Notification manager instance
   * @param longPollingManager Long polling manager instance
   */
  constructor(
    private messageRouter: IMessageRouter,
    private ackManager?: IAckManager,
    private notificationManager?: INotificationManager,
    private longPollingManager?: ILongPollingManager
  ) {}

  /**
   * Connect to Socket.IO server
   * @param url Server URL
   * @param options Socket.IO options
   * @param message Original message
   */
  public connect(url: string, options: SharedSocketIOOptions, message: WorkerMessage): void {
    const clientId = message.clientId as string;

    // If already connected, do nothing
    if (this.socket && this.socket.connected) {
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.CONNECTED,
        payload: {
          status: this.connectionStatus
        },
        clientId
      });
      return;
    }

    try {
      // Initialize Socket.IO connection
      this.socket = io(url, {
        autoConnect: options.autoConnect,
        reconnection: options.reconnection,
        reconnectionAttempts: options.reconnectionAttempts,
        reconnectionDelay: options.reconnectionDelay,
        reconnectionDelayMax: options.reconnectionDelayMax,
        timeout: options.timeout,
        transports: options.transports
      });

      // Listen for connect event
      this.socket.on('connect', () => {
        this.connectionStatus = {
          connected: true,
          url,
          options
        };

        // Notify all clients
        this.messageRouter.broadcastMessage({
          type: MessageType.CONNECTED,
          payload: {
            status: this.connectionStatus
          }
        });

        // Start long polling if enabled
        if (this.longPollingManager && options.longPolling?.enabled) {
          this.longPollingManager.start(url, options.longPolling);
        }

        console.log(`Socket.IO connected to ${url}`);
      });

      // Listen for disconnect event
      this.socket.on('disconnect', (reason) => {
        this.connectionStatus = {
          connected: false,
          url,
          options,
          error: reason
        };

        // Notify all clients
        this.messageRouter.broadcastMessage({
          type: MessageType.DISCONNECTED,
          payload: {
            reason
          }
        });

        // Stop long polling
        if (this.longPollingManager && this.longPollingManager.isActive()) {
          this.longPollingManager.stop();
        }

        console.log(`Socket.IO disconnected: ${reason}`);
      });

      // Listen for error event
      this.socket.on('error', (error) => {
        const serializedError = serializeError(error);

        // Notify all clients
        this.messageRouter.broadcastMessage({
          type: MessageType.ERROR,
          payload: serializedError
        });

        console.error('Socket.IO error:', error);
      });

      // Connect if autoConnect = false
      if (!options.autoConnect) {
        this.socket.connect();
      }
    } catch (error) {
      const serializedError = serializeError(error);

      this.connectionStatus = {
        connected: false,
        url,
        options,
        error: serializedError
      };

      // Notify client of error
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.ERROR,
        payload: serializedError,
        id: message.id,
        clientId
      });

      console.error('Error connecting to Socket.IO server:', error);
    }
  }

  /**
   * Disconnect from Socket.IO server
   * @param message Original message
   */
  public disconnect(message: WorkerMessage): void {
    const clientId = message.clientId as string;

    if (!this.socket) {
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.DISCONNECTED,
        payload: {
          reason: 'Not connected'
        },
        id: message.id,
        clientId
      });
      return;
    }

    try {
      // Unregister all events for this client
      if (this.registeredEvents[clientId]) {
        this.registeredEvents[clientId].clear();
        delete this.registeredEvents[clientId];
      }

      // Disconnect if no clients are registered
      let hasRegisteredClients = false;
      Object.keys(this.registeredEvents).forEach(id => {
        if (this.registeredEvents[id].size > 0) {
          hasRegisteredClients = true;
        }
      });

      if (!hasRegisteredClients) {
        this.socket.disconnect();
        this.socket = null;

        this.connectionStatus = {
          connected: false
        };

        // Stop long polling
        if (this.longPollingManager && this.longPollingManager.isActive()) {
          this.longPollingManager.stop();
        }

        console.log('Socket.IO disconnected (no clients remaining)');
      }

      // Notify client
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.DISCONNECTED,
        payload: {
          reason: 'Disconnected by request'
        },
        id: message.id,
        clientId
      });
    } catch (error) {
      const serializedError = serializeError(error);

      // Notify client of error
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.ERROR,
        payload: serializedError,
        id: message.id,
        clientId
      });

      console.error('Error disconnecting Socket.IO:', error);
    }
  }

  /**
   * Emit an event to Socket.IO server
   * @param eventName Event name
   * @param args Event arguments
   * @param message Original message
   */
  public emit(eventName: string, args: any[], message: WorkerMessage): void {
    const clientId = message.clientId as string;

    if (!this.socket || !this.socket.connected) {
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.ERROR,
        payload: {
          message: 'Not connected to Socket.IO server'
        },
        id: message.id,
        clientId
      });
      return;
    }

    try {
      this.socket.emit(eventName, ...args);
    } catch (error) {
      const serializedError = serializeError(error);

      // Notify client of error
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.ERROR,
        payload: serializedError,
        id: message.id,
        clientId
      });

      console.error(`Error emitting event ${eventName}:`, error);
    }
  }

  /**
   * Emit an event to Socket.IO server and wait for ACK
   * @param eventName Event name
   * @param args Event arguments
   * @param message Original message
   * @returns Promise with ACK result
   */
  public emitWithAck(eventName: string, args: any[], message: WorkerMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      const clientId = message.clientId as string;

      if (!this.socket || !this.socket.connected) {
        reject(new Error('Not connected to Socket.IO server'));
        return;
      }

      try {
        // Use ACK Manager if available
        if (this.ackManager && message.id) {
          // Register ACK with ACK Manager
          const ackPromise = this.ackManager.registerAck(message.id, clientId);

          // Add callback to end of args
          this.socket.emit(eventName, ...args, (response: any) => {
            this.ackManager!.resolveAck(message.id as string, response);
          });

          // Return promise from ACK Manager
          ackPromise.then(resolve).catch(reject);
        } else {
          // Fallback if no ACK Manager
          this.socket.emit(eventName, ...args, (response: any) => {
            resolve(response);
          });
        }
      } catch (error) {
        // Handle error with ACK Manager if available
        if (this.ackManager && message.id) {
          this.ackManager.rejectAck(message.id as string, error);
        }

        reject(error);
        console.error(`Error emitting event ${eventName} with ACK:`, error);
      }
    });
  }

  /**
   * Register event listener
   * @param eventName Event name
   * @param message Original message
   */
  public on(eventName: string, message: WorkerMessage): void {
    const clientId = message.clientId as string;

    if (!this.socket) {
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.ERROR,
        payload: {
          message: 'Not connected to Socket.IO server'
        },
        id: message.id,
        clientId
      });
      return;
    }

    // Initialize set if not exists
    if (!this.registeredEvents[clientId]) {
      this.registeredEvents[clientId] = new Set();
    }

    // Add event to registered list
    this.registeredEvents[clientId].add(eventName);

    // Register listener if not already registered
    if (!this.socket.hasListeners(eventName)) {
      this.socket.on(eventName, (...args: any[]) => {
        // Send event to all registered clients
        Object.keys(this.registeredEvents).forEach(id => {
          if (this.registeredEvents[id].has(eventName)) {
            this.messageRouter.routeMessageToClient(id, {
              type: MessageType.EVENT,
              payload: {
                eventName,
                args
              }
            });
          }
        });

        // Handle notifications if Notification Manager exists
        if (this.notificationManager) {
          this.notificationManager.handleEvent(eventName, args);
        }
      });
    }
  }

  /**
   * Unregister event listener
   * @param eventName Event name
   * @param message Original message
   */
  public off(eventName: string, message: WorkerMessage): void {
    const clientId = message.clientId as string;

    if (!this.socket) {
      return;
    }

    // Remove event from registered list
    if (this.registeredEvents[clientId]) {
      this.registeredEvents[clientId].delete(eventName);
    }

    // Check if any clients are still registered for this event
    let hasRegisteredClients = false;
    Object.keys(this.registeredEvents).forEach(id => {
      if (this.registeredEvents[id].has(eventName)) {
        hasRegisteredClients = true;
      }
    });

    // If no clients are registered, remove listener
    if (!hasRegisteredClients) {
      this.socket.off(eventName);
    }
  }

  /**
   * Register one-time event listener
   * @param eventName Event name
   * @param message Original message
   */
  public once(eventName: string, message: WorkerMessage): void {
    const clientId = message.clientId as string;

    if (!this.socket) {
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.ERROR,
        payload: {
          message: 'Not connected to Socket.IO server'
        },
        id: message.id,
        clientId
      });
      return;
    }

    // Register one-time listener
    this.socket.once(eventName, (...args: any[]) => {
      // Send event to client
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.EVENT,
        payload: {
          eventName,
          args
        }
      });

      // Handle notifications if Notification Manager exists
      if (this.notificationManager) {
        this.notificationManager.handleEvent(eventName, args);
      }
    });
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
 * Create a socket manager instance
 * @param messageRouter Message router instance
 * @param ackManager ACK manager instance
 * @param notificationManager Notification manager instance
 * @param longPollingManager Long polling manager instance
 * @returns SocketManager instance
 */
export function createSocketManager(
  messageRouter: IMessageRouter,
  ackManager?: IAckManager,
  notificationManager?: INotificationManager,
  longPollingManager?: ILongPollingManager
): ISocketManager {
  return new SocketManager(messageRouter, ackManager, notificationManager, longPollingManager);
} 