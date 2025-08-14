/**
 * Các tùy chọn cấu hình cho Socket.IO Shared Worker
 */
export interface SharedSocketIOOptions {
  /** Tự động kết nối khi khởi tạo */
  autoConnect?: boolean;
  /** Cho phép tự động kết nối lại */
  reconnection?: boolean;
  /** Số lần thử kết nối lại */
  reconnectionAttempts?: number;
  /** Thời gian chờ giữa các lần kết nối lại (ms) */
  reconnectionDelay?: number;
  /** Thời gian chờ tối đa giữa các lần kết nối lại (ms) */
  reconnectionDelayMax?: number;
  /** Thời gian timeout cho kết nối (ms) */
  timeout?: number;
  /** Các phương thức transport */
  transports?: string[];
  /** Cấu hình thông báo */
  notifications?: NotificationConfig;
  /** Cấu hình long polling */
  longPolling?: LongPollingConfig;
  /** URL hoặc đường dẫn tương đối đến worker script */
  workerUrl?: string | URL;
  /** Đường dẫn socket.io (socket.io path) */
  path?: string;
  /** Tham số truy vấn (query params) */
  query?: Record<string, any>;
  /** Thông tin xác thực (auth) */
  auth?: Record<string, any> | ((cb: (data: object) => void) => void);
}

/**
 * Cấu hình thông báo
 */
export interface NotificationConfig {
  /** Bật/tắt thông báo */
  enabled?: boolean;
  /** Đường dẫn đến icon mặc định */
  icon?: string;
  /** Yêu cầu tương tác để đóng thông báo */
  requireInteraction?: boolean;
  /** Các tùy chọn mặc định cho thông báo */
  defaultOptions?: NotificationOptions;
}

/**
 * Cấu hình long polling
 */
export interface LongPollingConfig {
  /** Bật/tắt long polling */
  enabled?: boolean;
  /** Khoảng thời gian giữa các lần poll (ms) */
  interval?: number;
  /** Thời gian timeout cho mỗi lần poll (ms) */
  timeout?: number;
}

/**
 * Tin nhắn trao đổi giữa client và worker
 */
export interface WorkerMessage {
  /** Loại tin nhắn */
  type: string;
  /** Dữ liệu tin nhắn */
  payload: any;
  /** ID tin nhắn (cho ACK) */
  id?: string;
  /** ID của client gửi tin nhắn */
  clientId?: string;
  /** Thời gian gửi tin nhắn */
  timestamp?: number;
}

/**
 * Các sự kiện từ client đến worker
 */
export interface ClientToWorkerEvents {
  /** Yêu cầu kết nối */
  connect: { url: string; options?: any };
  /** Yêu cầu ngắt kết nối */
  disconnect: void;
  /** Gửi sự kiện */
  emit: { eventName: string; args: any[] };
  /** Gửi sự kiện với ACK */
  emitWithAck: { eventName: string; args: any[] };
  /** Đăng ký lắng nghe sự kiện */
  on: { eventName: string };
  /** Hủy đăng ký lắng nghe sự kiện */
  off: { eventName: string };
  /** Đăng ký lắng nghe sự kiện một lần */
  once: { eventName: string };
  /** Đăng ký nhận thông báo */
  subscribeNotification: { eventName: string; options: NotificationOptions };
  /** Hủy đăng ký nhận thông báo */
  unsubscribeNotification: { eventName: string };
}

/**
 * Các sự kiện từ worker đến client
 */
export interface WorkerToClientEvents {
  /** Đã kết nối */
  connected: { status: ConnectionStatus };
  /** Đã ngắt kết nối */
  disconnected: { reason?: string };
  /** Nhận sự kiện */
  event: { eventName: string; args: any[] };
  /** Phản hồi ACK */
  ackResponse: { ackId: string; response: any };
  /** Lỗi ACK */
  ackError: { ackId: string; error: any };
  /** Lỗi chung */
  error: { message: string; details?: any };
}

/**
 * Các loại tin nhắn
 */
export enum MessageType {
  INIT = 'init',
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  EMIT = 'emit',
  EMIT_WITH_ACK = 'emitWithAck',
  ON = 'on',
  OFF = 'off',
  ONCE = 'once',
  EVENT = 'event',
  ACK_RESPONSE = 'ackResponse',
  ACK_ERROR = 'ackError',
  ERROR = 'error',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  SUBSCRIBE_NOTIFICATION = 'subscribeNotification',
  UNSUBSCRIBE_NOTIFICATION = 'unsubscribeNotification',
  NOTIFICATION = 'notification',
  GET_WORKER_ID = 'getWorkerId',
  WORKER_ID_RESPONSE = 'workerIdResponse',
}

export enum EventType {
  BROADCAST_LOGOUT = 'broadcast-logout'
}

/**
 * Client API cho Socket.IO Shared Worker
 */
export interface SharedSocketClient {
  /** Kết nối đến server */
  connect(): string;

  /** Ngắt kết nối */
  disconnect(): void;

  /** Gửi sự kiện */
  emit(eventName: string, ...args: any[]): void;

  /** Gửi sự kiện và chờ ACK */
  emitWithAck(eventName: string, ...args: any[]): Promise<any>;

  /** Đăng ký lắng nghe sự kiện */
  on(eventName: string, callback: Function): void;

  /** Hủy đăng ký lắng nghe sự kiện */
  off(eventName: string, callback?: Function): void;

  /** Đăng ký lắng nghe sự kiện một lần */
  once(eventName: string, callback: Function): void;

  /** Lấy Worker ID */
  getWorkerId(): Promise<string>;

  /** API thông báo */
  notifications: NotificationAPI;
}

/**
 * API thông báo
 */
export interface NotificationAPI {
  /** Đăng ký nhận thông báo */
  subscribe(eventName: string, options: NotificationOptions): void;

  /** Hủy đăng ký nhận thông báo */
  unsubscribe(eventName: string): void;
}

/**
 * Tùy chọn thông báo
 */
export interface NotificationOptions {
  /** Tiêu đề thông báo */
  title: string;
  /** Các tùy chọn thông báo */
  options?: {
    /** Nội dung thông báo */
    body?: string;
    /** Đường dẫn đến icon */
    icon?: string;
    /** Tag để nhóm thông báo */
    tag?: string;
    /** Dữ liệu tùy chỉnh */
    data?: any;
    /** Yêu cầu tương tác để đóng thông báo */
    requireInteraction?: boolean;
  };
}

/**
 * Client API cho Worker
 */
export interface WorkerClient {
  /** Kết nối đến worker */
  connect(): void;

  /** Ngắt kết nối */
  disconnect(): void;

  /** Gửi tin nhắn đến worker */
  send(message: WorkerMessage): void;

  /** Gửi tin nhắn và chờ phản hồi */
  sendWithResponse(message: WorkerMessage): Promise<any>;

  /** Đăng ký lắng nghe tin nhắn */
  subscribe(type: string, callback: (payload: any) => void): void;

  /** Hủy đăng ký lắng nghe tin nhắn */
  unsubscribe(type: string, callback?: (payload: any) => void): void;
}

/**
 * Trạng thái kết nối
 */
export interface ConnectionStatus {
  /** Đã kết nối hay chưa */
  connected: boolean;
  /** URL của server */
  url?: string;
  /** Các tùy chọn kết nối */
  options?: any;
  /** Lỗi kết nối (nếu có) */
  error?: any;
}
