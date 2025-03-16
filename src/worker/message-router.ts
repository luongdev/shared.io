/**
 * Message Router
 * 
 * This module handles routing messages between clients and the worker.
 */

import { WorkerMessage } from '../common/types';
import { generateUniqueId } from '../common/utils';
import { CLIENT_ID_PREFIX } from '../common/constants';

/**
 * Interface for Message Router
 */
export interface IMessageRouter {
  registerPort(port: MessagePort): string;
  unregisterPort(clientId: string): void;
  routeMessage(message: WorkerMessage): void;
  routeMessageToClient(clientId: string, message: WorkerMessage): void;
  broadcastMessage(message: WorkerMessage, excludeClientId?: string): void;
  addMessageHandler(type: string, handler: (message: WorkerMessage) => void): void;
  removeMessageHandler(type: string, handler?: (message: WorkerMessage) => void): void;
}

/**
 * Message Router class to handle message routing between clients
 */
export class MessageRouter implements IMessageRouter {
  private ports: Map<string, MessagePort> = new Map();
  private messageHandlers: Map<string, (message: WorkerMessage) => void> = new Map();
  
  /**
   * Register a new client port
   * @param port MessagePort from client
   * @returns Generated client ID
   */
  public registerPort(port: MessagePort): string {
    const clientId = generateUniqueId(CLIENT_ID_PREFIX);
    this.ports.set(clientId, port);
    
    // Set up disconnect handler
    port.addEventListener('close', () => {
      this.unregisterPort(clientId);
    });
    
    return clientId;
  }
  
  /**
   * Unregister a client port
   * @param clientId Client ID to unregister
   */
  public unregisterPort(clientId: string): void {
    if (this.ports.has(clientId)) {
      this.ports.delete(clientId);
      console.log(`Client ${clientId} disconnected`);
    }
  }
  
  /**
   * Route a message to the appropriate handler or client
   * @param message Message to route
   */
  public routeMessage(message: WorkerMessage): void {
    // If message has a specific client target, route to that client
    if (message.clientId && this.ports.has(message.clientId)) {
      this.routeMessageToClient(message.clientId, message);
      return;
    }
    
    // Otherwise, check for a handler for this message type
    if (message.type && this.messageHandlers.has(message.type)) {
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message);
      }
    } else {
      // If no specific handler, broadcast to all clients
      this.broadcastMessage(message);
    }
  }
  
  /**
   * Route a message to a specific client
   * @param clientId Target client ID
   * @param message Message to send
   */
  public routeMessageToClient(clientId: string, message: WorkerMessage): void {
    const port = this.ports.get(clientId);
    if (port) {
      try {
        port.postMessage(message);
      } catch (error) {
        console.error(`Error sending message to client ${clientId}:`, error);
        // If we can't send to this port, it might be disconnected
        this.unregisterPort(clientId);
      }
    }
  }
  
  /**
   * Broadcast a message to all connected clients
   * @param message Message to broadcast
   */
  public broadcastMessage(message: WorkerMessage, excludeClientId?: string): void {
    this.ports.forEach((port, clientId) => {
      if (excludeClientId && clientId === excludeClientId) {
        return;
      }

      try {
        port.postMessage(message);
      } catch (error) {
        console.error(`Error broadcasting to client ${clientId}:`, error);
        // If we can't send to this port, it might be disconnected
        this.unregisterPort(clientId);
      }
    });
  }
  
  /**
   * Add a message handler for a specific message type
   * @param type Message type to handle
   * @param handler Handler function
   */
  public addMessageHandler(type: string, handler: (message: WorkerMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }
  
  /**
   * Remove a message handler
   * @param type Message type to remove handler for
   */
  public removeMessageHandler(type: string, handler?: (message: WorkerMessage) => void): void {
    if (this.messageHandlers.has(type)) {
      if (handler) {
        this.messageHandlers.delete(type);
      } else {
        this.messageHandlers.delete(type);
      }
    }
  }
}

/**
 * Create a message router instance
 * @returns MessageRouter instance
 */
export function createMessageRouter(): IMessageRouter {
  return new MessageRouter();
} 