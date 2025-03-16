/**
 * Notification Manager
 * 
 * This module manages browser notifications for Socket.IO events.
 */

import {
  NotificationOptions,
  MessageType
} from '../common/types';
import { NOTIFICATION_PERMISSION } from '../common/constants';
import { isBrowserTabVisible } from '../common/utils';
import { IMessageRouter } from './message-router';

/**
 * Interface for Notification Manager
 */
export interface INotificationManager {
  showNotification(title: string, options?: NotificationOptions['options']): Promise<Notification | null>;
  registerNotificationSubscription(eventName: string, options: NotificationOptions, clientId: string): void;
  unregisterNotificationSubscription(eventName: string, clientId: string): void;
  handleNotificationClick(notification: Notification): void;
  handleEvent(eventName: string, args: any[]): void;
}

/**
 * Notification Manager class to handle browser notifications
 */
export class NotificationManager implements INotificationManager {
  private subscriptions: Record<string, Record<string, NotificationOptions>> = {};
  private activeNotifications: Record<string, Notification> = {};
  
  /**
   * @param messageRouter The message router instance
   */
  constructor(private messageRouter: IMessageRouter) {}

  /**
   * Check if notification permission is granted
   * @returns Whether notification permission is granted
   */
  private hasNotificationPermission(): boolean {
    return typeof Notification !== 'undefined' &&
      Notification.permission === NOTIFICATION_PERMISSION.GRANTED;
  }

  /**
   * Show a browser notification
   * @param title Notification title
   * @param options Notification options
   * @returns The created notification or null if not shown
   */
  public async showNotification(title: string, options?: NotificationOptions['options']): Promise<Notification | null> {
    if (!this.hasNotificationPermission()) {
      console.warn('Notification permission not granted');
      return null;
    }

    try {
      if (isBrowserTabVisible()) {
        return null;
      }

      const notification = new Notification(title, options);
      if (options?.tag) {
        this.activeNotifications[options.tag] = notification;
      }

      notification.onclick = () => this.handleNotificationClick(notification);

      notification.onclose = () => {
        if (options?.tag) {
          delete this.activeNotifications[options.tag];
        }
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Register a notification subscription for an event
   * @param eventName Event name to subscribe to
   * @param options Notification options
   * @param clientId Client ID
   */
  public registerNotificationSubscription(
    eventName: string,
    options: NotificationOptions,
    clientId: string
  ): void {
    if (!this.subscriptions[eventName]) {
      this.subscriptions[eventName] = {};
    }

    this.subscriptions[eventName][clientId] = options;
  }

  /**
   * Unregister a notification subscription
   * @param eventName Event name to unsubscribe from
   * @param clientId Client ID
   */
  public unregisterNotificationSubscription(eventName: string, clientId: string): void {
    if (this.subscriptions[eventName] && this.subscriptions[eventName][clientId]) {
      delete this.subscriptions[eventName][clientId];

      if (Object.keys(this.subscriptions[eventName]).length === 0) {
        delete this.subscriptions[eventName];
      }
    }
  }

  /**
   * Handle notification click event
   * @param notification The clicked notification
   */
  public handleNotificationClick(notification: Notification): void {
    const data = notification.data;
    const eventName = data?.eventName;
    const clientId = data?.clientId;

    if (eventName && clientId) {
      this.messageRouter.routeMessageToClient(clientId, {
        type: MessageType.EVENT,
        payload: { eventName: `${eventName}:click`, args: [data] }
      });

      notification.close();
      if (notification.tag) {
        delete this.activeNotifications[notification.tag];
      }
      if (typeof window !== 'undefined') {
        window.focus();
      }
    }
  }

  /**
   * Handle Socket.IO events and show notifications if subscribed
   * @param eventName Event name
   * @param args Event arguments
   */
  public handleEvent(eventName: string, args: any[]): void {
    if (!this.subscriptions[eventName]) {
      return;
    }
    
    Object.keys(this.subscriptions[eventName]).forEach(clientId => {
      const options = this.subscriptions[eventName][clientId];

      const notificationOptions = {
        ...options.options,
        data: {
          ...options.options?.data,
          eventName,
          clientId,
          args
        }
      };

      this.showNotification(options.title, notificationOptions);
    });
  }
}

/**
 * Create a notification manager instance
 * @param messageRouter The message router instance
 * @returns NotificationManager instance
 */
export function createNotificationManager(messageRouter: IMessageRouter): INotificationManager {
  return new NotificationManager(messageRouter);
} 