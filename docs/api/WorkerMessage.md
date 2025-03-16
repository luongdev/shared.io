# WorkerMessage

The `WorkerMessage` interface defines the structure of messages exchanged between the client and the Shared Worker. It provides a standardized format for communication across the worker boundary.

## Definition

```typescript
interface WorkerMessage<T = any> {
  id: string;
  type: string;
  data?: T;
  error?: {
    message: string;
    stack?: string;
    code?: string | number;
  };
  isResponse?: boolean;
}
```

## Properties

### id

A unique identifier for the message.

```typescript
id: string;
```

**Type**: `string`

**Description**: Each message has a unique ID that is used to correlate requests with their responses. When a client sends a message that expects a response, the worker will include the same ID in the response message, allowing the client to match the response to the original request.

**Example**:
```typescript
const message: WorkerMessage = {
  id: '1234-5678-9abc-def0',
  type: 'getData',
  data: { userId: 42 }
};
```

### type

The type of the message, indicating its purpose or the action to be performed.

```typescript
type: string;
```

**Type**: `string`

**Description**: The type property specifies the purpose of the message or the action that should be taken by the recipient. Common message types include 'connect', 'disconnect', 'emit', 'on', 'off', etc.

**Example**:
```typescript
const message: WorkerMessage = {
  id: '1234-5678-9abc-def0',
  type: 'emit',
  data: { event: 'chat message', args: ['Hello, world!'] }
};
```

### data

Optional data payload associated with the message.

```typescript
data?: T;
```

**Type**: Generic type `T` (defaults to `any`)

**Description**: The data property contains any additional information needed to process the message. The structure of this data depends on the message type. For example, an 'emit' message might include the event name and arguments, while a 'connect' message might include connection options.

**Example**:
```typescript
const message: WorkerMessage = {
  id: '1234-5678-9abc-def0',
  type: 'connect',
  data: {
    url: 'https://example.com',
    options: {
      reconnection: true,
      timeout: 10000
    }
  }
};
```

### error

Optional error information if the message represents an error response.

```typescript
error?: {
  message: string;
  stack?: string;
  code?: string | number;
};
```

**Type**: Object with error details

**Description**: When a message is a response to a request that resulted in an error, the error property contains information about the error. This includes a message describing the error, an optional stack trace, and an optional error code.

**Example**:
```typescript
const errorResponse: WorkerMessage = {
  id: '1234-5678-9abc-def0',
  type: 'connect',
  isResponse: true,
  error: {
    message: 'Failed to connect to Socket.IO server',
    code: 'ECONNREFUSED',
    stack: 'Error: Failed to connect...'
  }
};
```

### isResponse

Indicates whether the message is a response to a previous message.

```typescript
isResponse?: boolean;
```

**Type**: `boolean` (optional)

**Description**: When set to `true`, this property indicates that the message is a response to a previous request. The `id` property will match the ID of the original request message.

**Example**:
```typescript
// Original request
const request: WorkerMessage = {
  id: '1234-5678-9abc-def0',
  type: 'getData',
  data: { userId: 42 }
};

// Response to the request
const response: WorkerMessage = {
  id: '1234-5678-9abc-def0',  // Same ID as the request
  type: 'getData',
  isResponse: true,
  data: { name: 'John Doe', email: 'john@example.com' }
};
```

## Usage

The `WorkerMessage` interface is used for all communication between the client and the Shared Worker. It provides a consistent structure for messages, making it easier to handle different types of requests and responses.

### Sending a Message

```typescript
import { WorkerMessage } from 'socket-io-shared-worker';

// Create a message
const message: WorkerMessage = {
  id: generateUniqueId(),
  type: 'emit',
  data: {
    event: 'chat message',
    args: ['Hello from client!']
  }
};

// Send the message to the worker
worker.postMessage(message);
```

### Handling a Message

```typescript
// In the worker
self.addEventListener('message', (event) => {
  const message: WorkerMessage = event.data;
  
  switch (message.type) {
    case 'connect':
      // Handle connect request
      handleConnect(message.data);
      
      // Send a response
      const response: WorkerMessage = {
        id: message.id,
        type: message.type,
        isResponse: true,
        data: { success: true }
      };
      
      self.postMessage(response);
      break;
      
    case 'emit':
      // Handle emit request
      handleEmit(message.data);
      break;
      
    // Handle other message types
  }
});
```

## See Also

- [WorkerClient](./WorkerClient.md)
- [MessageType](./MessageType.md)
- [createWorkerClient](./createWorkerClient.md) 