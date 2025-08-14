/**
 * Socket Manager
 *
 * This module manages Socket.IO connection and event handling.
 */

import { io, Socket } from 'socket.io-client';
import { ConnectionStatus, EventType, MessageType, SharedSocketIOOptions, WorkerMessage } from '../common/types';
import { generateUniqueId, serializeError } from '../common/utils';
import { IMessageRouter } from './message-router';
import { IAckManager } from './ack-manager';
import { INotificationManager } from './notification';
import { ILongPollingManager } from './long-polling';
import { IStateManager } from './simple-state';
import { getWorkerId } from './index';

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

  getCachedStatus(agentId: string): any | undefined;
}

/**
 * Socket Manager class to handle Socket.IO connections
 */
export class SocketManager implements ISocketManager {
  private socket: Socket | null = null;
  private connectionStatus: ConnectionStatus = {
    connected: false,
  };
  private registeredEvents: Record<string, Set<string>> = {};

  /**
   * @param messageRouter Message router instance
   * @param ackManager ACK manager instance
   * @param notificationManager Notification manager instance
   * @param longPollingManager Long polling manager instance
   * @param stateManager State manager instance
   */
  constructor(
    private messageRouter: IMessageRouter,
    private ackManager?: IAckManager,
    private notificationManager?: INotificationManager,
    private longPollingManager?: ILongPollingManager,
    private stateManager?: IStateManager
  ) {}

  /**
   * Connect to Socket.IO server
   * @param url Server URL
   * @param options Socket.IO options
   * @param message Original message
   */
  public connect(url: string, options: SharedSocketIOOptions, message: WorkerMessage): void {
    const clientId = message.clientId as string;
    const connectionId = message.payload?.connectionId || generateUniqueId();

    // If already connected, do nothing
    if (this.socket && this.socket.connected) {
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.CONNECTED,
        payload: {
          status: this.connectionStatus,
          connectionId,
        },
        clientId,
      });
      return;
    }

    try {
      // Get the worker ID and include it in the query
      const workerId = getWorkerId();
      const queryWithWorkerId = {
        ...options.query,
        workerId,
      };

      // Initialize Socket.IO connection
      this.socket = io(url, {
        autoConnect: options.autoConnect,
        reconnection: options.reconnection,
        reconnectionAttempts: options.reconnectionAttempts,
        reconnectionDelay: options.reconnectionDelay,
        reconnectionDelayMax: options.reconnectionDelayMax,
        timeout: options.timeout,
        transports: options.transports,
        path: options.path,
        query: queryWithWorkerId,
        auth: options.auth,
      });

      // Listen for connect event
      this.socket.on('connect', () => {
        this.connectionStatus = {
          connected: true,
          url,
          options,
        };

        // Notify all clients
        this.messageRouter.broadcastMessage({
          type: MessageType.CONNECTED,
          payload: {
            status: this.connectionStatus,
            connectionId,
          },
        });

        // Start long polling if enabled
        if (this.longPollingManager && options.longPolling?.enabled) {
          this.longPollingManager.start(url, options.longPolling);
        }

        console.log(`Socket.IO connected to ${url} with connection ID ${connectionId}`);
      });

      // Listen for disconnect event
      this.socket.on('disconnect', (reason) => {
        this.connectionStatus = {
          connected: false,
          url,
          options,
          error: reason,
        };

        // Notify all clients
        this.messageRouter.broadcastMessage({
          type: MessageType.DISCONNECTED,
          payload: {
            reason,
            connectionId,
          },
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
          payload: serializedError,
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
        error: serializedError,
      };

      // Notify client of error
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.ERROR,
        payload: serializedError,
        id: message.id,
        clientId,
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
          reason: 'Not connected',
        },
        id: message.id,
        clientId,
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
      Object.keys(this.registeredEvents).forEach((id) => {
        if (this.registeredEvents[id].size > 0) {
          hasRegisteredClients = true;
        }
      });

      if (!hasRegisteredClients) {
        this.socket.disconnect();
        this.socket = null;

        this.connectionStatus = {
          connected: false,
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
          reason: 'Disconnected by request',
        },
        id: message.id,
        clientId,
      });
    } catch (error) {
      const serializedError = serializeError(error);

      // Notify client of error
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.ERROR,
        payload: serializedError,
        id: message.id,
        clientId,
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
          message: 'Not connected to Socket.IO server',
        },
        id: message.id,
        clientId,
      });
      return;
    }

    try {
      if (eventName === EventType.BROADCAST_LOGOUT) {
        try {
          Object.keys(this.registeredEvents).forEach((id) => {
            if (!this.registeredEvents[id].has(eventName)) {
              return;
            }
            this.messageRouter.routeMessageToClient(id, {
              type: MessageType.EVENT,
              payload: {
                eventName,
                args,
              },
            });
          });
        } catch (error) {
          console.warn('Broadcast logout:', error);
        }
      } else {
        this.socket.emit(eventName, ...args);
      }
    } catch (error) {
      const serializedError = serializeError(error);

      // Notify client of error
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.ERROR,
        payload: serializedError,
        id: message.id,
        clientId,
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

      // Special handling for request-get-current-status event to use cache if available
      if (eventName === 'request-get-current-status' && this.stateManager && args.length > 0) {
        const requestedAgentId = args[0]?.fsAgentId;
        if (requestedAgentId) {
          // Store the latest requested agent ID
          if (this.stateManager) {
            this.stateManager.setState('latest-requested-agent-id', requestedAgentId);
          }

          const cachedStatus = this.getCachedStatus(requestedAgentId);
          if (cachedStatus) {
            const cacheAge = Date.now() - (cachedStatus.cachedAt || 0);
            const maxCacheAge = 30000; // 30 seconds max cache age

            // If cache is fresh enough, return it immediately
            if (cacheAge < maxCacheAge) {
              console.debug(
                `Using cached status for agent ${requestedAgentId}, age: ${cacheAge}ms`
              );

              // Use ackManager to resolve the promise if available
              if (this.ackManager && message.id) {
                this.ackManager.resolveAck(message.id, {
                  status: true,
                  event: eventName,
                  data: cachedStatus,
                });
              }

              resolve({
                status: true,
                event: eventName,
                data: cachedStatus,
              });
              return;
            } else {
              console.debug(`Cache expired for agent ${requestedAgentId}, age: ${cacheAge}ms`);
            }
          }
        }
      }

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
            // Store response in cache if this is a status response
            if (
              eventName === 'request-get-current-status' &&
              this.stateManager &&
              response &&
              response.data
            ) {
              // Make sure we're working with a valid status object
              if (response.data.agentId && 'changeTime' in response.data) {
                const cacheKey = `agent-status-${response.data.agentId}`;
                // Use setStatus to ensure only newer statuses are stored
                const wasUpdated = this.stateManager.setStatus(cacheKey, response.data);

                if (wasUpdated) {
                  // Only store the latest agent ID if status was actually updated
                  this.stateManager.setState('latest-requested-agent-id', response.data.agentId);
                  console.debug(
                    `Status updated for agent ${response.data.agentId} from request-get-current-status response`
                  );
                  // Resolve with updated status
                  this.ackManager!.resolveAck(message.id as string, response);
                } else {
                  console.debug(
                    `Status not updated for agent ${response.data.agentId} (duplicate or outdated)`
                  );
                  // Resolve with the existing cached status since the incoming one wasn't valid
                  const currentStatus = this.getCachedStatus(response.data.agentId);
                  this.ackManager!.resolveAck(message.id as string, {
                    ...response,
                    data: currentStatus, // Use the validated status
                  });
                }
              } else {
                // Invalid status object
                console.warn('Invalid status object received:', response.data);
                this.ackManager!.resolveAck(message.id as string, response);
              }
            } else {
              // For non-status responses, just pass through
              this.ackManager!.resolveAck(message.id as string, response);
            }
          });

          // Return promise from ACK Manager
          ackPromise.then(resolve).catch(reject);
        } else {
          // Fallback if no ACK Manager
          this.socket.emit(eventName, ...args, (response: any) => {
            // Store response in cache if this is a status response
            if (
              eventName === 'request-get-current-status' &&
              this.stateManager &&
              response &&
              response.data
            ) {
              // Make sure we're working with a valid status object
              if (response.data.agentId && 'changeTime' in response.data) {
                const cacheKey = `agent-status-${response.data.agentId}`;
                // Use setStatus to ensure only newer statuses are stored
                const wasUpdated = this.stateManager.setStatus(cacheKey, response.data);

                if (wasUpdated) {
                  // Only store the latest agent ID if status was actually updated
                  this.stateManager.setState('latest-requested-agent-id', response.data.agentId);
                  console.debug(
                    `Status updated for agent ${response.data.agentId} from request-get-current-status response`
                  );
                  // Resolve with the updated status
                  resolve(response);
                } else {
                  console.debug(
                    `Status not updated for agent ${response.data.agentId} (duplicate or outdated)`
                  );
                  // Resolve with the existing cached status since the incoming one wasn't valid
                  const currentStatus = this.getCachedStatus(response.data.agentId);
                  resolve({
                    ...response,
                    data: currentStatus, // Use the validated status
                  });
                }
              } else {
                // Invalid status object
                console.warn('Invalid status object received:', response.data);
                resolve(response);
              }
            } else {
              // For non-status responses, just pass through
              resolve(response);
            }
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
          message: 'Not connected to Socket.IO server',
        },
        id: message.id,
        clientId,
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
        // Check if the last argument is an acknowledgment function
        console.debug(`Event ${eventName} received with args:`, args);
        const lastArg = args.length > 0 ? args[args.length - 1] : null;
        let ackFunction = null;

        if (typeof lastArg === 'function') {
          ackFunction = lastArg;
          // Create a copy of args without the ack function for forwarding to clients
          args = args.slice(0, -1);
          console.debug(`Event ${eventName} received with acknowledgment function`);
        }

        // Special handling for status-changed event to cache the status
        if (eventName === 'status-changed' && args.length > 0 && this.stateManager) {
          const statusData = args[0];
          // Make sure we have a valid status object
          if (statusData && statusData.agentId && 'changeTime' in statusData) {
            const cacheKey = `agent-status-${statusData.agentId}`;
            // Use setStatus to ensure only newer statuses are saved
            const wasUpdated = this.stateManager.setStatus(cacheKey, statusData);

            if (wasUpdated) {
              // Only store the latest agent ID if status was actually updated
              this.stateManager.setState('latest-requested-agent-id', statusData.agentId);
              console.debug(
                `Status updated for agent ${statusData.agentId} from status-changed event`
              );

              // Send validated status event to all registered clients
              Object.keys(this.registeredEvents).forEach((id) => {
                if (this.registeredEvents[id].has(eventName)) {
                  this.messageRouter.routeMessageToClient(id, {
                    type: MessageType.EVENT,
                    payload: {
                      eventName,
                      args,
                    },
                  });
                }
              });

              // Handle notifications if Notification Manager exists
              if (this.notificationManager) {
                this.notificationManager.handleEvent(eventName, args);
              }
            } else {
              console.debug(
                `Status not updated for agent ${statusData.agentId} (duplicate or outdated) - not forwarding to clients`
              );
              // Don't forward outdated or duplicate status events to clients
            }

            // Call the acknowledgment function if it exists
            if (ackFunction) {
              try {
                ackFunction({ success: true, event: eventName, statusUpdated: wasUpdated });
                console.debug(`Acknowledgment sent for event ${eventName}`);
              } catch (error) {
                console.error(
                  `Error calling acknowledgment function for event ${eventName}:`,
                  error
                );
              }
            }

            // We've handled the status-changed event specially, so return early
            return;
          } else {
            console.warn('Invalid status object received for status-changed event:', statusData);
          }
        }

        // For all other events (not status-changed, or status-changed without valid statusData)
        // Send event to all registered clients
        Object.keys(this.registeredEvents).forEach((id) => {
          if (this.registeredEvents[id].has(eventName)) {
            this.messageRouter.routeMessageToClient(id, {
              type: MessageType.EVENT,
              payload: {
                eventName,
                args,
              },
            });
          }
        });

        // Handle notifications if Notification Manager exists
        if (this.notificationManager) {
          this.notificationManager.handleEvent(eventName, args);
        }

        // Call the acknowledgment function if it exists
        if (ackFunction) {
          try {
            ackFunction({ success: true, event: eventName });
            console.debug(`Acknowledgment sent for event ${eventName}`);
          } catch (error) {
            console.error(`Error calling acknowledgment function for event ${eventName}:`, error);
          }
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
    Object.keys(this.registeredEvents).forEach((id) => {
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
          message: 'Not connected to Socket.IO server',
        },
        id: message.id,
        clientId,
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
          args,
        },
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

  /**
   * Get cached status for an agent
   * @param agentId Agent ID
   * @returns Cached status or undefined if not found
   */
  public getCachedStatus(agentId: string): any | undefined {
    if (!this.stateManager) {
      return undefined;
    }

    const cacheKey = `agent-status-${agentId}`;
    return this.stateManager.getState(cacheKey);
  }
}

/**
 * Create a socket manager instance
 * @param messageRouter Message router instance
 * @param ackManager ACK manager instance
 * @param notificationManager Notification manager instance
 * @param longPollingManager Long polling manager instance
 * @param stateManager State manager instance
 * @returns SocketManager instance
 */
export function createSocketManager(
  messageRouter: IMessageRouter,
  ackManager?: IAckManager,
  notificationManager?: INotificationManager,
  longPollingManager?: ILongPollingManager,
  stateManager?: IStateManager
): ISocketManager {
  return new SocketManager(
    messageRouter,
    ackManager,
    notificationManager,
    longPollingManager,
    stateManager
  );
}
