# MessageType

The `MessageType` enum defines the standard message types used for communication between the client and the Shared Worker. These types categorize the different kinds of operations and events that can be exchanged.

## Definition

```typescript
enum MessageType {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  EMIT = 'emit',
  EMIT_WITH_ACK = 'emitWithAck',
  ON = 'on',
  OFF = 'off',
  ONCE = 'once',
  SOCKET_EVENT = 'socketEvent',
  CONNECTION_STATUS = 'connectionStatus',
  ERROR = 'error',
  SUBSCRIBE_NOTIFICATION = 'subscribeNotification',
  UNSUBSCRIBE_NOTIFICATION = 'unsubscribeNotification',
  NOTIFICATION = 'notification',
  PING = 'ping',
  PONG = 'pong'
}
```

## Values

### CONNECT

Used to establish a connection to the Socket.IO server.

```typescript
CONNECT = 'connect'
```

**Description**: Sent from the client to the worker to initiate a connection to the Socket.IO server. The message data typically includes the server URL and connection options.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.CONNECT,
  data: {
    url: 'https://example.com',
    options: {
      reconnection: true,
      timeout: 10000
    }
  }
};
```

### DISCONNECT

Used to close the connection to the Socket.IO server.

```typescript
DISCONNECT = 'disconnect'
```

**Description**: Sent from the client to the worker to close the connection to the Socket.IO server.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.DISCONNECT
};
```

### EMIT

Used to emit an event to the Socket.IO server without expecting a response.

```typescript
EMIT = 'emit'
```

**Description**: Sent from the client to the worker to emit an event to the Socket.IO server. The message data includes the event name and arguments.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.EMIT,
  data: {
    event: 'chat message',
    args: ['Hello, world!']
  }
};
```

### EMIT_WITH_ACK

Used to emit an event to the Socket.IO server and expect an acknowledgement.

```typescript
EMIT_WITH_ACK = 'emitWithAck'
```

**Description**: Similar to EMIT, but the client expects a response from the server. The worker will send a response message back to the client when the acknowledgement is received.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.EMIT_WITH_ACK,
  data: {
    event: 'login',
    args: [{ username: 'user1', password: 'pass123' }]
  }
};
```

### ON

Used to register a listener for a Socket.IO event.

```typescript
ON = 'on'
```

**Description**: Sent from the client to the worker to register interest in a specific Socket.IO event. When the event occurs, the worker will send a SOCKET_EVENT message to the client.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.ON,
  data: {
    event: 'chat message'
  }
};
```

### OFF

Used to remove a listener for a Socket.IO event.

```typescript
OFF = 'off'
```

**Description**: Sent from the client to the worker to unregister interest in a specific Socket.IO event.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.OFF,
  data: {
    event: 'chat message'
  }
};
```

### ONCE

Used to register a one-time listener for a Socket.IO event.

```typescript
ONCE = 'once'
```

**Description**: Similar to ON, but the listener will be automatically removed after the event occurs once.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.ONCE,
  data: {
    event: 'connect'
  }
};
```

### SOCKET_EVENT

Used to notify clients about a Socket.IO event.

```typescript
SOCKET_EVENT = 'socketEvent'
```

**Description**: Sent from the worker to clients when a Socket.IO event occurs. The message data includes the event name and arguments.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.SOCKET_EVENT,
  data: {
    event: 'chat message',
    args: ['Hello from server!']
  }
};
```

### CONNECTION_STATUS

Used to report the current connection status.

```typescript
CONNECTION_STATUS = 'connectionStatus'
```

**Description**: Sent from the worker to clients to report changes in the connection status. The message data includes information about whether the connection is active and any error details.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.CONNECTION_STATUS,
  data: {
    connected: true,
    url: 'https://example.com'
  }
};
```

### ERROR

Used to report errors.

```typescript
ERROR = 'error'
```

**Description**: Sent from the worker to clients to report errors that occur during operation.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.ERROR,
  error: {
    message: 'Failed to connect to Socket.IO server',
    code: 'ECONNREFUSED'
  }
};
```

### SUBSCRIBE_NOTIFICATION

Used to subscribe to notifications for a Socket.IO event.

```typescript
SUBSCRIBE_NOTIFICATION = 'subscribeNotification'
```

**Description**: Sent from the client to the worker to register for browser notifications when a specific Socket.IO event occurs.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.SUBSCRIBE_NOTIFICATION,
  data: {
    event: 'new message',
    options: {
      title: 'New Message',
      body: 'You have a new message'
    }
  }
};
```

### UNSUBSCRIBE_NOTIFICATION

Used to unsubscribe from notifications for a Socket.IO event.

```typescript
UNSUBSCRIBE_NOTIFICATION = 'unsubscribeNotification'
```

**Description**: Sent from the client to the worker to unregister from browser notifications for a specific Socket.IO event.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.UNSUBSCRIBE_NOTIFICATION,
  data: {
    event: 'new message'
  }
};
```

### NOTIFICATION

Used to trigger a browser notification.

```typescript
NOTIFICATION = 'notification'
```

**Description**: Sent from the worker to clients to trigger a browser notification. The message data includes the notification details.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.NOTIFICATION,
  data: {
    title: 'New Message',
    body: 'You have a new message from John',
    icon: '/path/to/icon.png'
  }
};
```

### PING

Used for heartbeat messages to check if the connection is alive.

```typescript
PING = 'ping'
```

**Description**: Sent from the client to the worker or vice versa to check if the connection is still active. The recipient should respond with a PONG message.

**Example**:
```typescript
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.PING
};
```

### PONG

Used to respond to PING messages.

```typescript
PONG = 'pong'
```

**Description**: Sent in response to a PING message to confirm that the connection is still active.

**Example**:
```typescript
const message: WorkerMessage = {
  id: pingMessage.id,  // Same ID as the PING message
  type: MessageType.PONG,
  isResponse: true
};
```

## Usage

The `MessageType` enum is used to specify the type of messages exchanged between the client and the Shared Worker. It helps in routing messages to the appropriate handlers.

```typescript
import { MessageType, WorkerMessage } from 'socket-io-shared-worker';

// Create a message to connect to the Socket.IO server
const connectMessage: WorkerMessage = {
  id: generateUniqueId(),
  type: MessageType.CONNECT,
  data: {
    url: 'https://example.com',
    options: { /* connection options */ }
  }
};

// Send the message to the worker
worker.postMessage(connectMessage);

// Handle incoming messages
worker.addEventListener('message', (event) => {
  const message: WorkerMessage = event.data;
  
  switch (message.type) {
    case MessageType.SOCKET_EVENT:
      handleSocketEvent(message.data);
      break;
      
    case MessageType.CONNECTION_STATUS:
      updateConnectionStatus(message.data);
      break;
      
    case MessageType.ERROR:
      handleError(message.error);
      break;
      
    // Handle other message types
  }
});
```

## See Also

- [WorkerMessage](./WorkerMessage.md)
- [WorkerClient](./WorkerClient.md)
- [createWorkerClient](./createWorkerClient.md) 