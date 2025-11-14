/**
 * Shared Worker Entry Point
 *
 * This module is the entry point for the Shared Worker, handling connections from clients
 * and coordinating messages.
 */

import { MessageType, WorkerMessage } from '../common/types';
import { createMessageRouter, IMessageRouter } from './message-router';
import { createSocketManager, ISocketManager } from './socket-manager';
import { createAckManager, IAckManager } from './ack-manager';
import { createNotificationManager, INotificationManager } from './notification';
import { createLongPollingManager, ILongPollingManager } from './long-polling';
import { createStateManager, IStateManager } from './simple-state';
import { generateUniqueId } from '../common/utils';
import { WORKER_ID_PREFIX } from '../common/constants';

// Khai báo biến toàn cục để tránh lỗi TypeScript
declare const self: SharedWorkerGlobalScope;

// Generate a unique worker ID for this shared worker instance
const WORKER_ID = generateUniqueId(WORKER_ID_PREFIX);

// Initialize managers
const messageRouter: IMessageRouter = createMessageRouter();
const ackManager: IAckManager = createAckManager();
const notificationManager: INotificationManager = createNotificationManager(messageRouter);
const stateManager: IStateManager = createStateManager();
const longPollingManager: ILongPollingManager = createLongPollingManager(
  messageRouter,
  stateManager
);
const socketManager: ISocketManager = createSocketManager(
  messageRouter,
  ackManager,
  notificationManager,
  longPollingManager,
  stateManager
);

// Set up bidirectional relationship
longPollingManager.setSocketManager(socketManager);

// Store the worker ID in the state manager
stateManager.setState('workerId', WORKER_ID);

/**
 * Get the worker ID
 * @returns The unique worker ID
 */
export function getWorkerId(): string {
  return WORKER_ID;
}

/**
 * Initialize the Shared Worker
 */
export function initializeWorker(): void {
  try {
    // Listen for connection events from clients
    self.addEventListener('connect', (event: MessageEvent) => {
      handleConnect(event.ports[0]);
    });

    console.log(`Socket.IO Shared Worker initialized with ID: ${WORKER_ID}`);
  } catch (error) {
    console.error('Could not initialize Shared Worker:', error);
  }
}

/**
 * Handle connection from client
 * @param port MessagePort from client
 */
export function handleConnect(port: MessagePort): void {
  const clientId = messageRouter.registerPort(port);
  port.postMessage({ type: MessageType.INIT, clientId });

  // Set up handler for messages from client
  port.onmessage = (event: MessageEvent) => {
    handleMessage(event.data, clientId);
  };

  // Start listening for messages
  port.start();

  console.log(`Client ${clientId} connected`);
}

/**
 * Handle message from client
 * @param message Received message
 * @param port MessagePort of client
 * @param clientId ID of client
 */
export function handleMessage(message: WorkerMessage, clientId: string): void {
  // Ensure message has clientId
  if (!message.clientId) {
    message.clientId = clientId;
  }

  // Process message based on type
  switch (message.type) {
    case MessageType.CONNECT:
      socketManager.connect(message.payload.url, message.payload.options, message);
      break;

    case MessageType.DISCONNECT:
      socketManager.disconnect(message);
      // Clear all ACKs for this client
      ackManager.clearClientAcks(clientId);
      break;

    case MessageType.EMIT:
      socketManager.emit(message.payload.eventName, message.payload.args, message);
      break;

    case MessageType.EMIT_WITH_ACK:
      socketManager
        .emitWithAck(message.payload.eventName, message.payload.args, message)
        .then((response) => {
          messageRouter.routeMessageToClient(clientId, {
            type: MessageType.ACK_RESPONSE,
            payload: response,
            id: message.id,
            clientId,
          });
        })
        .catch((error) => {
          messageRouter.routeMessageToClient(clientId, {
            type: MessageType.ACK_ERROR,
            payload: error,
            id: message.id,
            clientId,
          });
        });
      break;

    case MessageType.ON:
      socketManager.on(message.payload.eventName, message);
      break;

    case MessageType.OFF:
      socketManager.off(message.payload.eventName, message);
      break;

    case MessageType.ONCE:
      socketManager.once(message.payload.eventName, message);
      break;

    case MessageType.SUBSCRIBE_NOTIFICATION:
      notificationManager.registerNotificationSubscription(
        message.payload.eventName,
        message.payload.options,
        clientId
      );
      break;

    case MessageType.UNSUBSCRIBE_NOTIFICATION:
      notificationManager.unregisterNotificationSubscription(message.payload.eventName, clientId);
      break;

    case MessageType.GET_WORKER_ID:
      messageRouter.routeMessageToClient(clientId, {
        type: MessageType.WORKER_ID_RESPONSE,
        payload: { workerId: stateManager.getState<string>('workerId') || getWorkerId() },
        id: message.id,
        clientId,
      });
      break;

    default:
      console.warn(`Unhandled message type: ${message.type}`);
      messageRouter.routeMessageToClient(clientId, {
        type: MessageType.ERROR,
        payload: { message: `Unhandled message type: ${message.type}` },
        id: message.id,
        clientId,
      });
  }
}

// Automatically initialize worker if running in worker environment
try {
  if (typeof self !== 'undefined' && !('window' in self)) {
    initializeWorker();
  }
} catch (error) {
  console.error('Error initializing worker:', error);
}
