import { SharedSocketIOOptions } from './types';

/**
 * Các tùy chọn mặc định cho Socket.IO Shared Worker
 */
export const DEFAULT_OPTIONS: SharedSocketIOOptions = {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
  notifications: {
    enabled: true,
    requireInteraction: false
  },
  longPolling: {
    enabled: true,
    interval: 30000,
    timeout: 25000
  },
  workerUrl: undefined
};


/**
 * Thời gian timeout cho ACK (ms)
 */
export const ACK_TIMEOUT = 30000;

/**
 * Tiền tố cho ID client
 */
export const CLIENT_ID_PREFIX = 'client_';

/**
 * Các trạng thái quyền thông báo
 */
export const NOTIFICATION_PERMISSION = {
  GRANTED: 'granted',
  DENIED: 'denied',
  DEFAULT: 'default'
}; 