/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Khai báo kiểu cho shared.io
declare module 'shared.io' {
  export interface ISharedSocketClient {
    connect(): void;
    disconnect(): void;
    emit(event: string, ...args: any[]): void;
    on(event: string, callback: (data: any) => void): void;
    off(event: string, callback?: (data: any) => void): void;
    once(event: string, callback: (data: any) => void): void;
  }

  export interface SharedSocketIOOptions {
    autoConnect?: boolean;
    reconnection?: boolean;
    notifications?: {
      enabled?: boolean;
      defaultOptions?: NotificationOptions;
    };
    longPolling?: {
      enabled?: boolean;
    };
  }

  export function createSharedSocketIO(
    url: string,
    options?: SharedSocketIOOptions
  ): ISharedSocketClient;
}
