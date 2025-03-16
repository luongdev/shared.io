/**
 * Worker Client
 * 
 * This module provides a client interface to communicate with the Shared Worker.
 */

import { 
  WorkerClient, 
  WorkerMessage, 
  SharedSocketIOOptions 
} from '../common/types';
import { 
  generateUniqueId, 
  isSupported, 
  createFallbackTransport, 
  getWorkerUrl,
  serializeError
} from '../common/utils';
import { CLIENT_ID_PREFIX, DEFAULT_OPTIONS } from '../common/constants';

/**
 * Interface for Worker Client
 */
export interface IWorkerClient extends WorkerClient {
  connect(): void;
  disconnect(): void;
  send(message: WorkerMessage): void;
  sendWithResponse(message: WorkerMessage): Promise<any>;
  subscribe(type: string, callback: (payload: any) => void): void;
  unsubscribe(type: string, callback?: (payload: any) => void): void;
}

/**
 * Worker Client class to communicate with the Shared Worker
 */
export class WorkerClientImpl implements IWorkerClient {
  private clientId: string;
  private options: SharedSocketIOOptions;
  private messageCallbacks: Record<string, Set<(payload: any) => void>> = {};
  private pendingResponses: Record<string, { 
    resolve: (value: any) => void, 
    reject: (reason: any) => void,
    timeout: number 
  }> = {};
  private worker: SharedWorker | null = null;
  private port: MessagePort | null = null;
  private fallbackTransport: any = null;
  private isConnected: boolean = false;

  /**
   * @param options Socket.IO options
   */
  constructor(options?: Partial<SharedSocketIOOptions>) {
    this.clientId = generateUniqueId(CLIENT_ID_PREFIX);
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    if (this.options.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to the Shared Worker
   */
  public connect(): void {
    if (this.isConnected) return;
    
    try {
      if (isSupported()) {
        const workerPath = this.options.workerUrl || new URL('./worker.js', import.meta.url).href;
        this.worker = new SharedWorker(workerPath, { name: 'shared.io' });
        this.port = this.worker.port;
        
        this.port.onmessage = this.handleMessage.bind(this);
        this.port.onmessageerror = this.handleError.bind(this);
        this.port.start();
      } else {
        this.fallbackTransport = createFallbackTransport();
        this.fallbackTransport.onMessage(this.handleMessage.bind(this));
      }
      
      this.isConnected = true;
    } catch (error) {
      console.error('Error connecting to Shared Worker:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the Shared Worker
   */
  public disconnect(): void {
    if (!this.isConnected) return;
    
    Object.keys(this.pendingResponses).forEach(id => {
      const { reject, timeout } = this.pendingResponses[id];
      clearTimeout(timeout);
      reject(new Error('Disconnected from worker'));
      delete this.pendingResponses[id];
    });
    
    if (this.port) {
      this.port.close();
      this.port = null;
    }
    
    if (this.fallbackTransport) {
      this.fallbackTransport.close();
      this.fallbackTransport = null;
    }
    
    this.worker = null;
    this.isConnected = false;
  }

  /**
   * Send a message to the Shared Worker
   * @param message Message to send
   */
  public send(message: WorkerMessage): void {
    if (!this.isConnected) {
      throw new Error('Not connected to worker');
    }
    
    const completeMessage: WorkerMessage = {
      ...message,
      clientId: message.clientId || this.clientId,
      timestamp: message.timestamp || Date.now()
    };
    
    try {
      if (this.port) {
        this.port.postMessage(completeMessage);
      } else if (this.fallbackTransport) {
        this.fallbackTransport.postMessage(completeMessage);
      }
    } catch (error) {
      console.error('Error sending message to worker:', error);
      throw error;
    }
  }

  /**
   * Send a message to the Shared Worker and wait for a response
   * @param message Message to send
   * @returns Promise with the response
   */
  public sendWithResponse(message: WorkerMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to worker'));
        return;
      }
      
      const messageId = message.id || generateUniqueId();
      const messageWithId: WorkerMessage = {
        ...message,
        id: messageId,
        clientId: message.clientId || this.clientId,
        timestamp: message.timestamp || Date.now()
      };
      
      // Set up timeout
      const timeoutId = window.setTimeout(() => {
        if (this.pendingResponses[messageId]) {
          this.pendingResponses[messageId].reject(new Error(`Timeout waiting for response to message: ${message.type}`));
          delete this.pendingResponses[messageId];
        }
      }, this.options.timeout || 20000);
      
      this.pendingResponses[messageId] = {
        resolve,
        reject,
        timeout: timeoutId
      };
      
      try {
        this.send(messageWithId);
      } catch (error) {
        clearTimeout(timeoutId);
        delete this.pendingResponses[messageId];
        reject(error);
      }
    });
  }

  /**
   * Subscribe to a message type
   * @param type Message type to subscribe to
   * @param callback Callback function
   */
  public subscribe(type: string, callback: (payload: any) => void): void {
    if (!this.messageCallbacks[type]) {
      this.messageCallbacks[type] = new Set();
    }
    
    this.messageCallbacks[type].add(callback);
  }

  /**
   * Unsubscribe from a message type
   * @param type Message type to unsubscribe from
   * @param callback Callback function (optional)
   */
  public unsubscribe(type: string, callback?: (payload: any) => void): void {
    if (!this.messageCallbacks[type]) return;
    
    if (callback) {
      this.messageCallbacks[type].delete(callback);
    } else {
      delete this.messageCallbacks[type];
    }
  }

  /**
   * Handle incoming messages from the Shared Worker
   * @param event Message event
   */
  private handleMessage(event: MessageEvent | any): void {
    const message: WorkerMessage = event.data || event;
    
    if (message.id && this.pendingResponses[message.id]) {
      const { resolve, reject, timeout } = this.pendingResponses[message.id];
      clearTimeout(timeout);
      
      if (message.type === 'error') {
        reject(message.payload);
      } else {
        resolve(message.payload);
      }
      
      delete this.pendingResponses[message.id];
      return;
    }
    
    if (this.messageCallbacks[message.type]) {
      this.messageCallbacks[message.type].forEach(callback => {
        try {
          callback(message.payload);
        } catch (error) {
          console.error(`Error in callback for message ${message.type}:`, error);
        }
      });
    }
  }

  /**
   * Handle errors from the Shared Worker
   * @param error Error object
   */
  private handleError(error: any): void {
    console.error('Error from Shared Worker:', error);
    
    if (this.messageCallbacks['error']) {
      const serializedError = serializeError(error);
      this.messageCallbacks['error'].forEach(callback => {
        try {
          callback(serializedError);
        } catch (callbackError) {
          console.error('Error in error callback:', callbackError);
        }
      });
    }
  }
}

/**
 * Create a worker client instance
 * @param options Socket.IO options
 * @returns WorkerClient instance
 */
export function createWorkerClient(options?: Partial<SharedSocketIOOptions>): WorkerClient {
  return new WorkerClientImpl(options);
} 