/**
 * Client API Layer
 * 
 * This module exports the public API for the Socket.IO Shared Worker client.
 */

export { createSharedSocketIO } from './socket-client';
export { createWorkerClient } from './worker-client';
export type { 
  SharedSocketIOOptions,
  SharedSocketClient,
  WorkerClient,
  NotificationAPI,
  NotificationOptions,
  ConnectionStatus
} from '../common/types';
export type { ISharedSocketClient } from './socket-client';
export type { IWorkerClient } from './worker-client'; 