# createWorkerClient

The `createWorkerClient` function creates a client that communicates with a Shared Worker. It provides a high-level API for connecting to the worker, sending messages, and handling responses.

## Syntax

```typescript
function createWorkerClient(workerUrl: string, options?: WorkerClientOptions): WorkerClient;
```

## Parameters

### workerUrl

The URL of the Shared Worker script.

**Type**: `string`

**Description**: The path to the Shared Worker script that will be loaded. This can be an absolute URL or a relative path from the current page.

**Example**:
```typescript
const client = createWorkerClient('/worker.js');
```

### options (optional)

Configuration options for the worker client.

**Type**: `WorkerClientOptions`

**Description**: An object containing configuration options for the worker client.

**Default**: 
```typescript
{
  timeout: 20000,
  autoConnect: true
}
```

## Return Value

A `WorkerClient` instance that can be used to communicate with the Shared Worker.

**Type**: `WorkerClient`

**Description**: The returned client provides methods for connecting to the worker, sending messages, and handling responses.

## WorkerClientOptions

```typescript
interface WorkerClientOptions {
  timeout?: number;
  autoConnect?: boolean;
}
```

### timeout

The timeout for requests that expect a response.

**Type**: `number`

**Default**: `20000` (20 seconds)

**Description**: The maximum time (in milliseconds) to wait for a response from the worker before rejecting the Promise.

### autoConnect

Whether to automatically connect to the worker when the client is created.

**Type**: `boolean`

**Default**: `true`

**Description**: If `true`, the client will automatically connect to the worker when created. If `false`, you must call the `connect()` method manually.

## Examples

### Basic Usage

```typescript
import { createWorkerClient } from 'socket-io-shared-worker';

// Create a worker client with default options
const client = createWorkerClient('/worker.js');

// Send a message to the worker
client.send('hello', { message: 'Hello, Worker!' });

// Send a message and wait for a response
client.sendWithResponse('getData', { id: 123 })
  .then(response => {
    console.log('Received response:', response);
  })
  .catch(error => {
    console.error('Error or timeout:', error);
  });

// Subscribe to messages from the worker
client.subscribe('notification', data => {
  console.log('Received notification:', data);
});

// When done, disconnect
client.disconnect();
```

### Manual Connection

```typescript
import { createWorkerClient } from 'socket-io-shared-worker';

// Create a worker client without auto-connecting
const client = createWorkerClient('/worker.js', {
  autoConnect: false,
  timeout: 10000  // 10 seconds timeout
});

// Connect manually
client.connect()
  .then(() => {
    console.log('Connected to worker');
    
    // Now we can send messages
    return client.sendWithResponse('getData', { id: 123 });
  })
  .then(response => {
    console.log('Received response:', response);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### Error Handling

```typescript
import { createWorkerClient } from 'socket-io-shared-worker';

const client = createWorkerClient('/worker.js');

// Handle connection errors
client.connect()
  .catch(error => {
    console.error('Failed to connect to worker:', error);
    // Implement fallback behavior
  });

// Handle errors in responses
client.sendWithResponse('riskyOperation')
  .then(response => {
    console.log('Operation succeeded:', response);
  })
  .catch(error => {
    console.error('Operation failed:', error);
    // Handle the error appropriately
  });
```

### TypeScript Usage with Generic Types

```typescript
import { createWorkerClient } from 'socket-io-shared-worker';

// Define types for your messages
interface GetUserRequest {
  id: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

const client = createWorkerClient('/worker.js');

// Use type parameters for better type safety
client.sendWithResponse<GetUserRequest, User>('getUser', { id: 123 })
  .then(user => {
    // TypeScript knows that user is of type User
    console.log(`User: ${user.name} (${user.email})`);
  });
```

## Fallback Behavior

If the browser doesn't support Shared Workers, the client will automatically use a fallback transport mechanism:

1. First, it will try to use `BroadcastChannel` for communication between tabs.
2. If `BroadcastChannel` is not supported, it will fall back to using `localStorage` events.

This ensures that the basic functionality (sharing a Socket.IO connection between tabs) works even in browsers that don't support Shared Workers.

## Notes

- The worker script must be properly set up to handle the messages sent by the client. It should listen for messages and respond appropriately.
- The client uses a unique ID for each message that expects a response, allowing it to match responses to the original requests.
- If multiple tabs are using the same worker URL, they will share the same Shared Worker instance, allowing for efficient resource usage.
- The client automatically handles reconnection if the worker crashes or is terminated.

## See Also

- [WorkerClient](./WorkerClient.md)
- [WorkerMessage](./WorkerMessage.md)
- [MessageType](./MessageType.md)
- [createSharedSocketIO](./createSharedSocketIO.md) 