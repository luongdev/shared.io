/**
 * Simple State Manager
 *
 * This module provides simple state management capabilities for the shared worker.
 */

/**
 * Status object structure
 */
export interface Status {
  agentId: string;
  status: any;
  changeTime: number;
  countTime?: number;
  reasonName?: string;

  [key: string]: any;
}

/**
 * Interface for a basic state manager
 */
export interface IStateManager {
  /**
   * Get a stored state value by key
   * @param key The key for the state
   * @returns The stored value or undefined if not found
   */
  getState<T>(key: string): T | undefined;

  /**
   * Set a state value
   * @param key The key for the state
   * @param value The value to store
   */
  setState<T>(key: string, value: T): void;

  /**
   * Set a status value with guard against duplicate or outdated updates
   * @param key The key for the status
   * @param status The status object to store
   * @returns True if status was updated, false if ignored (duplicate or outdated)
   */
  setStatus(key: string, status: Status): boolean;

  /**
   * Check if a state exists
   * @param key The key to check
   * @returns True if the state exists
   */
  hasState(key: string): boolean;

  /**
   * Delete a state
   * @param key The key to delete
   */
  deleteState(key: string): void;

  /**
   * Clear all states
   */
  clearState(): void;
}

/**
 * State manager implementation
 */
class StateManager implements IStateManager {
  private state: Map<string, any> = new Map();

  public getState<T>(key: string): T | undefined {
    return this.state.get(key);
  }

  public setState<T>(key: string, value: T): void {
    this.state.set(key, value);
  }

  /**
   * Set a status value with guards against duplicate or outdated updates
   * Only stores the status if it's newer (based on changeTime) than the currently stored one
   * or if it has the same changeTime but different status or reasonName values
   * @param key The key for the status
   * @param status The status object to store
   * @returns True if status was updated, false if ignored (duplicate or outdated)
   */
  public setStatus(key: string, status: Status): boolean {
    if (!status || typeof status !== 'object' || !('changeTime' in status)) {
      console.warn('Invalid status object provided to setStatus');
      return false;
    }

    // Get current status if it exists
    const currentStatus = this.state.get(key) as Status | undefined;

    // If no current status exists, always update
    if (!currentStatus) {
      const enhancedStatus = {
        ...status,
        cachedAt: Date.now(),
      };

      this.state.set(key, enhancedStatus);
      console.debug(`Status created for ${key}. Change time: ${status.changeTime}`);
      return true;
    }

    // For existing status, we need to check if the new one should replace it
    if (status.changeTime > currentStatus.changeTime) {
      // Newer changeTime always gets updated
      const enhancedStatus = {
        ...status,
        cachedAt: Date.now(),
      };

      this.state.set(key, enhancedStatus);
      console.debug(
        `Status updated for ${key} (newer changeTime). New: ${status.changeTime}, Current: ${currentStatus.changeTime}`
      );
      return true;
    } else if (status.changeTime === currentStatus.changeTime) {
      // Same changeTime, only update if status or reasonName are different
      const isStatusDifferent = status.status !== currentStatus.status;
      const isReasonDifferent = status.reasonName !== currentStatus.reasonName;

      if (isStatusDifferent || isReasonDifferent) {
        const enhancedStatus = {
          ...status,
          cachedAt: Date.now(),
        };

        this.state.set(key, enhancedStatus);
        console.debug(`Status updated for ${key} (same changeTime but different status/reason).`);
        return true;
      } else {
        console.debug(`Duplicate status ignored for ${key}. Change time: ${status.changeTime}`);
        return false;
      }
    } else {
      // Older changeTime, ignore
      console.debug(
        `Outdated status ignored for ${key}. Incoming change time: ${status.changeTime}, Current change time: ${currentStatus.changeTime}`
      );
      return false;
    }
  }

  public hasState(key: string): boolean {
    return this.state.has(key);
  }

  public deleteState(key: string): void {
    this.state.delete(key);
  }

  public clearState(): void {
    this.state.clear();
  }
}

/**
 * Create a state manager instance
 * @returns State manager instance
 */
export function createStateManager(): IStateManager {
  return new StateManager();
}
