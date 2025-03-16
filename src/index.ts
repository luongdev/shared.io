/**
 * Socket.IO Shared Worker Library
 * 
 * This library allows sharing a Socket.IO connection across multiple browser tabs
 * using a Shared Worker.
 */

// Export factory functions
export { createSharedSocketIO } from './client/socket-client';
export { createWorkerClient } from './client/worker-client';

// Export interfaces from client
export type { ISharedSocketClient } from './client/socket-client';
export type { IWorkerClient } from './client/worker-client';

// Export utility classes
export { Utils, ErrorUtils, TransportFactory } from './common/utils';
export type { Transport } from './common/utils';

// Export interfaces from common
export type {
  SharedSocketClient,
  SharedSocketIOOptions,
  NotificationOptions,
  ConnectionStatus,
  WorkerClient,
  WorkerMessage,
  MessageType,
  NotificationAPI
} from './common/types'; 