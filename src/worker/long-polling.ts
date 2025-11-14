/**
 * Long Polling Manager
 *
 * This module implements a long polling mechanism as a fallback when WebSocket is not available.
 */

import { LongPollingConfig, MessageType } from '../common/types';
import { DEFAULT_OPTIONS } from '../common/constants';
import { Utils } from '../common/utils';
import { IMessageRouter } from './message-router';
import { IStateManager } from '@/worker/simple-state.ts';

/**
 * Interface for Long Polling Manager
 */
export interface ILongPollingManager {
  start(url: string, config?: LongPollingConfig): void;
  stop(): void;
  isActive(): boolean;
  sendData(data: any): Promise<any>;

  setSocketManager(socketManager: any): void;
}

/**
 * Long Polling Manager class to handle long polling connections
 */
export class LongPollingManager implements ILongPollingManager {
  private isRunning: boolean = false;
  private pollingUrl: string = '';
  private pollingConfig: LongPollingConfig = DEFAULT_OPTIONS.longPolling || {
    enabled: true,
    interval: 30000,
    timeout: 25000,
  };
  private pollingInterval: number | null = null;
  // private retryCount: number = 0;
  // private lastReceivedData: any = null;
  private socketManager: any = null;

  /**
   * @param messageRouter The message router instance
   * @param stateManager The state manager instance
   */
  constructor(
    private messageRouter: IMessageRouter,
    private stateManager: IStateManager
  ) {}

  /**
   * Start long polling
   * @param url Server URL
   * @param config Long polling configuration
   */
  public start(url: string, config?: LongPollingConfig): void {
    if (this.isRunning) {
      return;
    }

    this.pollingUrl = url;

    if (config) {
      this.pollingConfig = { ...this.pollingConfig, ...config };
    }

    if (!this.pollingConfig.enabled) {
      console.log('Long polling is not enabled');
      return;
    }

    this.isRunning = true;
    // this.retryCount = 0;

    this.pollCurrentAgentStatus();

    const intervalId = setInterval(() => {
      this.pollCurrentAgentStatus();
    }, this.pollingConfig.interval);

    this.pollingInterval = intervalId as unknown as number;

    console.log('Long polling started');
  }

  /**
   * Stop long polling
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    console.log('Long polling stopped');
  }

  /**
   * Check if long polling is active
   * @returns Whether long polling is active
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Send data to the server
   * @param data Data to send
   * @returns Promise with the server response
   */
  public sendData(data: any): Promise<any> {
    if (!this.isRunning) {
      return Promise.reject(new Error('Long polling is not active'));
    }

    return fetch(`${Utils.removeTrailingSlash(this.pollingUrl)}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: this.pollingUrl,
      },
      body: JSON.stringify(data),
      credentials: 'include',
      mode: 'cors',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .catch((error) => {
        console.error('Error sending data:', error);
        throw error;
      });
  }

  /**
   * Poll the server for new data
   */
  // private poll(): void {
  //   if (!this.isRunning) {
  //     return;
  //   }
  //
  //   const controller = new AbortController();
  //   const timeoutId = setTimeout(() => controller.abort(), this.pollingConfig.timeout);
  //
  //   fetch(`${this.pollingUrl}/poll`, {
  //     method: 'GET',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Last-Event-ID': this.lastReceivedData ? JSON.stringify(this.lastReceivedData.id) : '0',
  //       Origin: this.pollingUrl,
  //     },
  //     credentials: 'include',
  //     mode: 'cors',
  //     signal: controller.signal,
  //   })
  //     .then((response) => {
  //       clearTimeout(timeoutId);
  //
  //       if (!response.ok) {
  //         throw new Error(`HTTP error! status: ${response.status}`);
  //       }
  //
  //       return response.json();
  //     })
  //     .then((data) => {
  //       if (data && data !== this.lastReceivedData) {
  //         this.lastReceivedData = data;
  //
  //         this.messageRouter.broadcastMessage({
  //           type: MessageType.EVENT,
  //           payload: { eventName: data.event, args: data.data },
  //         });
  //         this.retryCount = 0;
  //       }
  //     })
  //     .catch((error) => {
  //       clearTimeout(timeoutId);
  //       if (error.name !== 'AbortError') {
  //         this.retryCount++;
  //         this.messageRouter.broadcastMessage({
  //           type: MessageType.ERROR,
  //           payload: serializeError(error),
  //         });
  //
  //         console.error(`Long polling error (retry ${this.retryCount}):`, error);
  //         if (this.retryCount > 5) {
  //           this.stop();
  //           this.messageRouter.broadcastMessage({
  //             type: MessageType.DISCONNECTED,
  //             payload: {
  //               reason: 'Long polling failed after multiple retries',
  //             },
  //           });
  //         }
  //       }
  //     });
  // }

  /**
   * Poll status by domain and extension
   */
  private pollCurrentAgentStatus(): void {
    if (!this.stateManager) {
      console.warn('Status polling: No state manager available');
      return;
    }

    // Get domain and extension from state
    const domain = this.stateManager.getState<string>('polling-domain');
    const extension = this.stateManager.getState<string>('polling-extension');

    if (!domain || !extension) {
      console.debug('Status polling: No domain or extension available', { domain, extension });
      return;
    }

    console.debug(`Status polling: Checking status for domain ${domain}, extension ${extension}`);

    // Use socket manager to request the current status
    this.socketManager
      .emitWithAck('request-get-current-status', [{ domain, extension }], {
        type: MessageType.EMIT_WITH_ACK,
        payload: {
          eventName: 'request-get-current-status',
          args: [{ domain, extension }],
        },
        id: `status-poll-${Date.now()}`,
        timestamp: Date.now(),
      })
      .then((status: any) => {
        if (status && status.data) {
          const newStatus = status.data;

          // Get the previous cached status to compare if it's actually new
          const cacheKey = `domain-status-${domain}-${extension}`;
          const previousStatus = this.stateManager.getState(cacheKey) as any;

          // Check if this status is different from what clients already have
          // This prevents unnecessary UI updates during polling
          const isSameStatus =
            previousStatus &&
            previousStatus.status === newStatus.status &&
            previousStatus.reasonName === newStatus.reasonName &&
            previousStatus.changeTime === newStatus.changeTime;

          if (!isSameStatus) {
            console.debug(`Status polling: Broadcasting new status for domain ${domain}, extension ${extension}`);

            // Broadcast the new status to clients
            this.messageRouter.broadcastMessage({
              type: MessageType.EVENT,
              payload: {
                eventName: 'status-changed',
                args: [newStatus],
              },
            });
          } else {
            console.debug(
              `Status polling: No change in status for domain ${domain}, extension ${extension}, not broadcasting`
            );
          }
        }

        console.debug(`Status polling: Successfully checked status for domain ${domain}, extension ${extension}`);
      })
      .catch((error: any) => {
        console.error(`Status polling: Error fetching status for domain ${domain}, extension ${extension}:`, error);
      });
  }

  /**
   * Set the socket manager reference
   * @param socketManager Socket manager instance
   */
  public setSocketManager(socketManager: any): void {
    this.socketManager = socketManager;
  }
}

/**
 * Create a long polling manager instance
 * @param messageRouter The message router instance
 * @param stateManager The state manager instance
 * @returns LongPollingManager instance
 */
export function createLongPollingManager(
  messageRouter: IMessageRouter,
  stateManager: IStateManager
): ILongPollingManager {
  return new LongPollingManager(messageRouter, stateManager);
}
