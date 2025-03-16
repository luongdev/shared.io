# ConnectionStatus

The `ConnectionStatus` interface represents the current connection state of a Socket.IO connection managed by the Shared Worker.

## Definition

```typescript
interface ConnectionStatus {
  connected: boolean;
  url?: string;
  error?: string;
}
```

## Properties

### connected

Indicates whether the Socket.IO connection is currently established.

```typescript
connected: boolean;
```

**Type**: `boolean`

**Description**: A boolean value that is `true` when the connection to the Socket.IO server is active and `false` otherwise.

**Example**:
```typescript
const status = socket.getConnectionStatus();
console.log('Is connected:', status.connected);
```

### url

The URL of the Socket.IO server that the client is connected to or attempting to connect to.

```typescript
url?: string;
```

**Type**: `string` (optional)

**Description**: The URL of the Socket.IO server. This property may be undefined if no connection has been attempted yet.

**Example**:
```typescript
const status = socket.getConnectionStatus();
if (status.connected) {
  console.log('Connected to:', status.url);
}
```

### error

Contains error information if the connection failed or encountered an error.

```typescript
error?: string;
```

**Type**: `string` (optional)

**Description**: A string describing the error that occurred during connection. This property is only present if an error occurred and the connection is not established.

**Example**:
```typescript
const status = socket.getConnectionStatus();
if (!status.connected && status.error) {
  console.error('Connection error:', status.error);
}
```

## Usage

The `ConnectionStatus` interface is typically used with the `getConnectionStatus()` method of the `SharedSocketClient` to check the current state of the Socket.IO connection.

```typescript
import { createSharedSocketIO } from 'socket-io-shared-worker';

const socket = createSharedSocketIO('https://example.com');

// Check connection status
const status = socket.getConnectionStatus();

if (status.connected) {
  console.log(`Connected to ${status.url}`);
} else {
  console.log('Not connected');
  if (status.error) {
    console.error(`Error: ${status.error}`);
  }
}
```

## See Also

- [SharedSocketClient](./SharedSocketClient.md)
- [createSharedSocketIO](./createSharedSocketIO.md) 