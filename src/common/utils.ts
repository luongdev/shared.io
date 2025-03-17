/**
 * Utility Classes and Functions
 *
 * This module provides utility functions and classes for the Socket.IO Shared Worker.
 */

import { CLIENT_ID_PREFIX, NOTIFICATION_PERMISSION } from './constants';

/**
 * Utility class for generating IDs and checking browser features
 */
export class Utils {
  /**
   * Generate a unique ID
   * @param prefix Prefix for the ID
   * @returns Unique ID
   */
  public static generateUniqueId(prefix: string = ''): string {
    return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if the browser supports Shared Worker
   * @returns true if supported, false otherwise
   */
  public static workerSupported(): string | undefined {
    if (typeof SharedWorker !== 'undefined') {
      return isModuleScript() ? 'es' : 'umd';
    }

    return undefined;
  }

  /**
   * Check if the current browser tab is visible
   * @returns true if visible, false otherwise
   */
  public static isBrowserTabVisible(): boolean {
    return document.visibilityState === 'visible';
  }

  /**
   * Request notification permission
   * @returns Promise with the permission result
   */
  public static requestNotificationPermission(): Promise<string> {
    if (!('Notification' in window)) {
      return Promise.resolve(NOTIFICATION_PERMISSION.DENIED);
    }

    if (Notification.permission === NOTIFICATION_PERMISSION.GRANTED) {
      return Promise.resolve(NOTIFICATION_PERMISSION.GRANTED);
    }

    if (Notification.permission === NOTIFICATION_PERMISSION.DENIED) {
      return Promise.resolve(NOTIFICATION_PERMISSION.DENIED);
    }

    return Notification.requestPermission();
  }

  /**
   * Kiểm tra xem script đang chạy dưới dạng ES Module hay Classic
   * @returns true nếu là module, false nếu là classic
   */
  public static isModuleScript(): boolean {
    try {
      // Chỉ có thể truy cập import.meta trong môi trường module
      return typeof import.meta !== 'undefined';
    } catch (error) {
      // Nếu có lỗi, giả định là classic script
      return false;
    }
  }
}

/**
 * Error handling utility class
 */
export class ErrorUtils {
  /**
   * Convert an error object to a serializable format
   * @param error Error object to convert
   * @returns Serializable object
   */
  public static serializeError(error: any): Record<string, any> {
    if (!error) {
      return { message: 'Unknown error' };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    const serialized: Record<string, any> = {
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
    };

    if (error.stack) {
      serialized.stack = error.stack;
    }

    if (error.code) {
      serialized.code = error.code;
    }

    return serialized;
  }

  /**
   * Convert a serialized error object back to an Error
   * @param serializedError Serialized error object
   * @returns Error object
   */
  public static deserializeError(serializedError: Record<string, any>): Error {
    if (!serializedError) {
      return new Error('Unknown error');
    }

    const error = new Error(serializedError.message || 'Unknown error');

    if (serializedError.name) {
      error.name = serializedError.name;
    }

    if (serializedError.stack) {
      error.stack = serializedError.stack;
    }

    if (serializedError.code) {
      (error as any).code = serializedError.code;
    }

    return error;
  }
}

/**
 * Interface for transport fallback
 */
export interface Transport {
  postMessage(message: any): void;
  onMessage(callback: (message: any) => void): void;
  close(): void;
}

/**
 * BroadcastChannel transport implementation
 */
export class BroadcastChannelTransport implements Transport {
  private channel: BroadcastChannel;

  constructor() {
    this.channel = new BroadcastChannel('socket-io-shared-worker');
  }

  public postMessage(message: any): void {
    this.channel.postMessage(message);
  }

  public onMessage(callback: (message: any) => void): void {
    this.channel.onmessage = (event) => callback(event.data);
  }

  public close(): void {
    this.channel.close();
  }
}

/**
 * LocalStorage transport implementation
 */
export class LocalStorageTransport implements Transport {
  private clientId: string;
  private storageKey: string;
  private listeners: ((message: any) => void)[] = [];

  constructor() {
    this.clientId = Utils.generateUniqueId(CLIENT_ID_PREFIX);
    this.storageKey = 'socket-io-shared-worker';
    window.addEventListener('storage', this.handleStorageEvent);
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== this.storageKey) return;
    if (!event.newValue) return;

    try {
      const data = JSON.parse(event.newValue);

      // Ignore messages from this client
      if (data.sender === this.clientId) return;

      // Call all listeners
      this.listeners.forEach((listener) => listener(data.message));
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  public postMessage(message: any): void {
    const data = {
      sender: this.clientId,
      message,
      timestamp: Date.now(),
    };

    localStorage.setItem(this.storageKey, JSON.stringify(data));
    // Remove and set again to trigger storage event
    localStorage.removeItem(this.storageKey);
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  public onMessage(callback: (message: any) => void): void {
    this.listeners.push(callback);
  }

  public close(): void {
    window.removeEventListener('storage', this.handleStorageEvent);
    this.listeners = [];
  }
}

/**
 * Transport factory class
 */
export class TransportFactory {
  /**
   * Create a fallback transport when Shared Worker is not supported
   * @returns Transport object
   */
  public static createFallbackTransport(): Transport {
    // Try to use BroadcastChannel if supported
    if (typeof BroadcastChannel !== 'undefined') {
      return new BroadcastChannelTransport();
    }

    // Fallback to localStorage
    return new LocalStorageTransport();
  }
}

// Export functions for backward compatibility
export const generateUniqueId = Utils.generateUniqueId;
export const workerSupported = Utils.workerSupported;
export const isBrowserTabVisible = Utils.isBrowserTabVisible;
export const requestNotificationPermission = Utils.requestNotificationPermission;
export const serializeError = ErrorUtils.serializeError;
export const deserializeError = ErrorUtils.deserializeError;
export const createFallbackTransport = TransportFactory.createFallbackTransport;
export const isModuleScript = Utils.isModuleScript;
