/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Khai báo kiểu cho shared.io
declare module 'shared.io' {
  import { Socket } from 'socket.io-client';

  export interface ISharedSocketClient {
    connect(): void;
    disconnect(): void;
    emit(event: string, ...args: any[]): void;
    on(event: string, callback: Function): void;
    off(event: string, callback?: Function): void;
    once(event: string, callback: Function): void;
    requestNotificationPermission(): Promise<NotificationPermission>;
    showNotification(title: string, options?: NotificationOptions): Promise<Notification | null>;
  }

  export function createSharedSocketIO(url: string, options?: any): ISharedSocketClient;
}
