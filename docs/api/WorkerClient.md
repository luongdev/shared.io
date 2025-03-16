# WorkerClient

The `WorkerClient` interface represents a client that communicates with a Shared Worker. It provides methods for connecting to the worker, sending messages, and handling responses.

## Definition

```typescript
interface WorkerClient {
  connect(): Promise<void>;
  disconnect(): void;
  
  send(type: string, data?: any): void;
  sendWithResponse(type: string, data?: any, timeout?: number): Promise<any>;
  
  subscribe(type: string, callback: (data: any) => void): void;
  unsubscribe(type: string, callback?: (data: any) => void): void;
  
  isConnected(): boolean;
}
```

## Methods

### connect()

Connects to the Shared Worker.

```typescript
connect(): Promise<void>;
```

**Returns**: A Promise that resolves when the connection is established or rejects if the connection fails.

**Description**: This method establishes a connection to the Shared Worker. If the browser doesn't support Shared Workers, it will use a fallback transport mechanism (BroadcastChannel or LocalStorage).

**Example**:
```typescript
const client = createWorkerClient('/path/to/worker.js');
client.connect()
  .then(() => {
    console.log('Connected to worker');
  })
  .catch(error => {
    console.error('Failed to connect to worker:', error);
  });
```

### disconnect()

Disconnects from the Shared Worker.

```typescript
disconnect(): void;
```

**Description**: This method closes the connection to the Shared Worker and cleans up any resources. If using a fallback transport, it will close that connection as well.

**Example**:
```typescript
client.disconnect();
```

### send()

Sends a message to the Shared Worker without expecting a response.

```typescript
send(type: string, data?: any): void;
```

**Parameters**:
- `type`: The type of message to send
- `data` (optional): The data to send with the message

**Description**: This method sends a message to the Shared Worker. The message consists of a type and optional data. The worker will process the message but no response is expected.

**Example**:
```typescript
client.send('log', { level: 'info', message: 'Hello, Worker!' });
```

### sendWithResponse()

Sends a message to the Shared Worker and waits for a response.

```typescript
sendWithResponse(type: string, data?: any, timeout?: number): Promise<any>;
```

**Parameters**:
- `type`: The type of message to send
- `data` (optional): The data to send with the message
- `timeout` (optional): The maximum time to wait for a response in milliseconds

**Returns**: A Promise that resolves with the response data or rejects if the timeout is reached or an error occurs.

**Description**: This method sends a message to the Shared Worker and returns a Promise that will be resolved when the worker sends a response. If no response is received within the timeout period, the Promise will be rejected.

**Example**:
```typescript
client.sendWithResponse('getData', { id: 123 }, 5000)
  .then(response => {
    console.log('Received response:', response);
  })
  .catch(error => {
    console.error('Error or timeout:', error);
  });
```

### subscribe()

Subscribes to messages of a specific type from the Shared Worker.

```typescript
subscribe(type: string, callback: (data: any) => void): void;
```

**Parameters**:
- `type`: The type of message to subscribe to
- `callback`: The function to call when a message of the specified type is received

**Description**: This method registers a callback function that will be called whenever a message of the specified type is received from the Shared Worker.

**Example**:
```typescript
client.subscribe('notification', data => {
  console.log('Received notification:', data);
  showNotification(data.title, data.body);
});
```

### unsubscribe()

Unsubscribes from messages of a specific type.

```typescript
unsubscribe(type: string, callback?: (data: any) => void): void;
```

**Parameters**:
- `type`: The type of message to unsubscribe from
- `callback` (optional): The callback function to remove. If not provided, all callbacks for the specified type will be removed.

**Description**: This method removes a previously registered callback function for a specific message type. If no callback is provided, all callbacks for the specified type will be removed.

**Example**:
```typescript
const handleNotification = data => {
  console.log('Received notification:', data);
};

// Subscribe
client.subscribe('notification', handleNotification);

// Later, unsubscribe
client.unsubscribe('notification', handleNotification);

// Or remove all notification handlers
client.unsubscribe('notification');
```

### isConnected()

Checks if the client is currently connected to the Shared Worker.

```typescript
isConnected(): boolean;
```

**Returns**: `true` if the client is connected to the Shared Worker, `false` otherwise.

**Description**: This method returns the current connection status of the client.

**Example**:
```typescript
if (client.isConnected()) {
  console.log('Client is connected to the worker');
} else {
  console.log('Client is not connected to the worker');
  client.connect();
}
```

## Usage

The `WorkerClient` interface is typically used to communicate with a Shared Worker that manages a Socket.IO connection or other shared resources.

```typescript
import { createWorkerClient } from 'socket-io-shared-worker';

// Create a worker client
const client = createWorkerClient('/worker.js');

// Connect to the worker
await client.connect();

// Subscribe to messages
client.subscribe('socketEvent', data => {
  console.log('Socket event received:', data);
});

// Send a message and get a response
const response = await client.sendWithResponse('getStatus');
console.log('Worker status:', response);

// When done, disconnect
client.disconnect();
```

## See Also

- [createWorkerClient](./createWorkerClient.md)
- [WorkerMessage](./WorkerMessage.md)
- [MessageType](./MessageType.md) 