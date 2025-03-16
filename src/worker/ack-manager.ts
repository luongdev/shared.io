/**
 * ACK Manager
 * 
 * This module manages acknowledgements (ACK) between clients and Socket.IO server.
 */

import { ACK_TIMEOUT } from '../common/constants';
import { serializeError } from '../common/utils';

/**
 * Interface for ACK Manager
 */
export interface IAckManager {
  registerAck(ackId: string, clientId: string): Promise<any>;
  resolveAck(ackId: string, response: any): void;
  rejectAck(ackId: string, error: any): void;
  clearClientAcks(clientId: string): void;
}

interface PendingAck {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: ReturnType<typeof setTimeout>;
  clientId: string;
}

/**
 * ACK Manager class to handle acknowledgements
 */
export class AckManager implements IAckManager {
  private pendingAcks: Record<string, PendingAck> = {};
  
  /**
   * Register a new ACK
   * @param ackId ID of the ACK
   * @param clientId ID of the client
   * @returns Promise containing the ACK result
   */
  public registerAck(ackId: string, clientId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (this.pendingAcks[ackId]) {
          this.pendingAcks[ackId].reject(new Error(`ACK timeout: ${ackId}`));
          delete this.pendingAcks[ackId];
        }
      }, ACK_TIMEOUT);
      
      // Store promise to handle when response is received
      this.pendingAcks[ackId] = {
        resolve,
        reject,
        timeout: timeoutId,
        clientId
      };
    });
  }
  
  /**
   * Resolve an ACK with successful result
   * @param ackId ID of the ACK
   * @param response Response data
   */
  public resolveAck(ackId: string, response: any): void {
    if (!this.pendingAcks[ackId]) {
      console.warn(`ACK not found: ${ackId}`);
      return;
    }
    
    const { resolve, timeout } = this.pendingAcks[ackId];
    clearTimeout(timeout);
    resolve(response);
    delete this.pendingAcks[ackId];
  }
  
  /**
   * Reject an ACK with error
   * @param ackId ID of the ACK
   * @param error Error object
   */
  public rejectAck(ackId: string, error: any): void {
    if (!this.pendingAcks[ackId]) {
      console.warn(`ACK not found: ${ackId}`);
      return;
    }
    
    const { reject, timeout } = this.pendingAcks[ackId];
    clearTimeout(timeout);
    reject(serializeError(error));
    delete this.pendingAcks[ackId];
  }
  
  /**
   * Clear all ACKs for a client
   * @param clientId ID of the client
   */
  public clearClientAcks(clientId: string): void {
    Object.keys(this.pendingAcks).forEach(ackId => {
      if (this.pendingAcks[ackId].clientId === clientId) {
        const { reject, timeout } = this.pendingAcks[ackId];
        clearTimeout(timeout);
        reject(new Error('Client disconnected'));
        delete this.pendingAcks[ackId];
      }
    });
  }
}

/**
 * Create an ACK manager instance
 * @returns AckManager instance
 */
export function createAckManager(): IAckManager {
  return new AckManager();
} 