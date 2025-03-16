# SharedSocketClient

The `SharedSocketClient` interface represents a Socket.IO client that is shared across multiple browser tabs. It provides methods similar to a standard Socket.IO client, but is designed to work through a Shared Worker.

## Definition

```typescript
interface SharedSocketClient<
  ListenEvents extends Record<string, any> = any,
  EmitEvents extends Record<string, any> = any
> {
  connect(): void;
  disconnect(): void;
  
  emit<Ev extends keyof EmitEvents>(event: Ev, ...args: Parameters<EmitEvents[Ev]>): void;
  emitWithAck<Ev extends keyof EmitEvents>(event: Ev, ...args: Parameters<EmitEvents[Ev]>): Promise<ReturnType<EmitEvents[Ev]>>;
  
  on<Ev extends keyof ListenEvents>(event: Ev, callback: ListenEvents[Ev]): void;
  off<Ev extends keyof ListenEvents>(event: Ev, callback?: ListenEvents[Ev]): void;
  once<Ev extends keyof ListenEvents>(event: Ev, callback: ListenEvents[Ev]): void;
  
  notifications: NotificationAPI;
  getConnectionStatus(): ConnectionStatus;
}
```

## Methods

### connect()

Connects to the Socket.IO server.

```typescript
connect(): void;
```

**Description**: This method establishes a connection to the Socket.IO server through the Shared Worker. If `autoConnect` is set to `true` in the options, this method will be called automatically when the client is created.

**Example**:
```typescript
const socket = createSharedSocketIO('https://example.com', { autoConnect: false });
socket.connect();
```

### disconnect()

Disconnects from the Socket.IO server.

```typescript
disconnect(): void;
```

**Description**: This method disconnects from the Socket.IO server. Note that the connection will only be fully closed when all tabs have called `disconnect()` or have been closed.

**Example**:
```typescript
socket.disconnect();
```

### emit()

Emits an event to the Socket.IO server.

```typescript
emit<Ev extends keyof EmitEvents>(event: Ev, ...args: Parameters<EmitEvents[Ev]>): void;
```

**Parameters**:
- `event`: The name of the event
- `args`: The arguments for the event

**Description**: This method emits an event to the Socket.IO server without expecting a response.

**Example**:
```typescript
socket.emit('message', 'Hello!');
socket.emit('joinRoom', { roomId: 'room1', username: 'user1' });
```

### emitWithAck()

Emits an event to the Socket.IO server and waits for an acknowledgement.

```typescript
emitWithAck<Ev extends keyof EmitEvents>(event: Ev, ...args: Parameters<EmitEvents[Ev]>): Promise<ReturnType<EmitEvents[Ev]>>;
```

**Parameters**:
- `event`: The name of the event
- `args`: The arguments for the event

**Returns**: A Promise that resolves with the response from the server or rejects if a timeout occurs

**Description**: This method emits an event to the Socket.IO server and returns a Promise that will be resolved when a response is received from the server or rejected if a timeout occurs.

**Example**:
```typescript
socket.emitWithAck('login', { username: 'user1', password: 'pass123' })
  .then(response => {
    console.log('Login successful:', response);
  })
  .catch(error => {
    console.error('Login failed:', error);
  });
```

### on()

Registers a callback for a Socket.IO event.

```typescript
on<Ev extends keyof ListenEvents>(event: Ev, callback: ListenEvents[Ev]): void;
```

**Parameters**:
- `event`: The name of the event
- `callback`: The function to call when the event is received

**Description**: This method registers a callback function that will be called whenever an event is received from the Socket.IO server. The callback will be called each time the event is received.

**Example**:
```typescript
socket.on('message', (data) => {
  console.log('Received message:', data);
});

socket.on('roomUpdate', (room) => {
  console.log('Room updated:', room);
});
```

### off()

Unregisters a callback for a Socket.IO event.

```typescript
off<Ev extends keyof ListenEvents>(event: Ev, callback?: ListenEvents[Ev]): void;
```

**Parameters**:
- `event`: The name of the event
- `callback` (optional): The callback function to remove. If not provided, all callbacks for this event will be removed.

**Description**: This method unregisters a callback function for a Socket.IO event. If no callback is provided, all callbacks for the specified event will be removed.

**Example**:
```typescript
const handleMessage = (data) => {
  console.log('Received message:', data);
};

socket.on('message', handleMessage);
// Later
socket.off('message', handleMessage);

// Or remove all callbacks for the 'message' event
socket.off('message');
```

### once()

Registers a one-time callback for a Socket.IO event.

```typescript
once<Ev extends keyof ListenEvents>(event: Ev, callback: ListenEvents[Ev]): void;
```

**Parameters**:
- `event`: The name of the event
- `callback`: The function to call when the event is received

**Description**: This method registers a callback function that will be called the first time an event is received from the Socket.IO server. After the event is received once, the callback will be automatically unregistered.

**Example**:
```typescript
socket.once('connect', () => {
  console.log('Connected!');
});
```

### notifications

An object providing an API for registering and unregistering notifications.

```typescript
notifications: NotificationAPI;
```

**Description**: This property provides access to the notification API, allowing you to register and unregister notifications for Socket.IO events.

**Example**:
```typescript
socket.notifications.subscribe('newMessage', {
  title: 'New Message',
  body: 'You have a new message'
});

socket.notifications.unsubscribe('newMessage');
```

### getConnectionStatus()

Gets the current connection status.

```typescript
getConnectionStatus(): ConnectionStatus;
```

**Returns**: A `ConnectionStatus` object containing information about the connection status

**Description**: This method returns the current connection status, including information about whether the connection is active, the URL of the server, and error information if applicable.

**Example**:
```typescript
const status = socket.getConnectionStatus();
console.log('Connected:', status.connected);
console.log('URL:', status.url);
if (!status.connected && status.error) {
  console.error('Connection error:', status.error);
}
```

## Types

### ConnectionStatus

```typescript
interface ConnectionStatus {
  connected: boolean;
  url?: string;
  error?: string;
}
```

## See Also

- [createSharedSocketIO](./createSharedSocketIO.md)
- [NotificationAPI](./NotificationAPI.md)
- [SharedSocketIOOptions](./SharedSocketIOOptions.md)