# createSharedSocketIO

The `createSharedSocketIO` function creates a Socket.IO client that shares a single connection across multiple browser tabs using a Shared Worker.

## Syntax

```typescript
function createSharedSocketIO(url: string, options?: SharedSocketIOOptions): SharedSocketClient;
```

## Parameters

### url

The URL of the Socket.IO server to connect to.

**Type**: `string`

**Description**: The URL of the Socket.IO server. This should include the protocol, host, and port (if needed).

**Example**:
```typescript
const socket = createSharedSocketIO('https://example.com');
```

### options (optional)

Configuration options for the shared Socket.IO client.

**Type**: `SharedSocketIOOptions`

**Description**: An object containing configuration options for the Socket.IO connection and the Shared Worker.

**Default**: See the [SharedSocketIOOptions](./SharedSocketIOOptions.md) documentation for default values.

## Return Value

A `SharedSocketClient` instance that can be used to interact with the Socket.IO server.

**Type**: `SharedSocketClient`

**Description**: The returned client provides methods for connecting to the Socket.IO server, emitting events, and listening for events. The connection is shared across all tabs using the same URL and options.

## SharedSocketIOOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoConnect` | boolean | `true` | If `true`, the connection will be established automatically when the client is created. If `false`, you need to call the `connect()` method to establish the connection. |
| `workerUrl` | string | `'/worker.js'` | The path to the Shared Worker script. This path must point to the worker file created by the library. |
| `timeout` | number | `20000` | The timeout (in milliseconds) for emit requests with acknowledgement. If no response is received within this time, the Promise will be rejected with a timeout error. |
| `reconnection` | boolean | `true` | If `true`, the client will automatically reconnect when the connection is lost. |
| `reconnectionAttempts` | number | `Infinity` | The maximum number of reconnection attempts before giving up. |
| `reconnectionDelay` | number | `1000` | The initial delay (in milliseconds) before attempting to reconnect. This delay will increase exponentially with each attempt. |
| `reconnectionDelayMax` | number | `5000` | The maximum delay (in milliseconds) between reconnection attempts. |
| `randomizationFactor` | number | `0.5` | The randomization factor for the reconnection delay. |
| `auth` | Record<string, any> | `{}` | Authentication data to be sent when connecting. |
| `query` | Record<string, any> | `{}` | Query parameters to be added to the URL when connecting. |
| `extraHeaders` | Record<string, string> | `{}` | Additional headers to be sent when connecting. |
| `path` | string | `'/socket.io'` | The path of the Socket.IO server. |
| `transports` | string[] | `['polling', 'websocket']` | The transport methods to be used for the connection. |
| `upgrade` | boolean | `true` | If `true`, the client will try to upgrade from polling to websocket. |
| `forceNew` | boolean | `false` | If `true`, a new connection will be created even if there is already a connection to the same namespace. |
| `timestampRequests` | boolean | `true` | If `true`, a timestamp parameter will be added to each request to avoid caching. |
| `timestampParam` | string | `'t'` | The name of the timestamp parameter. |

## Examples

### Basic Example

```javascript
import { createSharedSocketIO } from 'socket-io-shared-worker';

// Create a shared Socket.IO connection
const socket = createSharedSocketIO('https://example.com');

// Listen for events
socket.on('message', (data) => {
  console.log('Received message:', data);
});

// Emit an event
socket.emit('chat message', 'Hello, world!');

// Emit an event with acknowledgement
socket.emitWithAck('login', { username: 'user1', password: 'pass123' })
  .then(response => {
    console.log('Login successful:', response);
  })
  .catch(error => {
    console.error('Login failed:', error);
  });

// Register for notifications
socket.notifications.subscribe('newMessage', {
  title: 'New Message',
  body: 'You have a new message'
});

// Check connection status
const status = socket.getConnectionStatus();
console.log('Connected:', status.connected);
```

### TypeScript Example with Type Safety

```typescript
import { createSharedSocketIO } from 'socket-io-shared-worker';

// Define interfaces for server-to-client and client-to-server events
interface ServerToClientEvents {
  message: (data: { text: string; from: string }) => void;
  notification: (data: { title: string; body: string }) => void;
}

interface ClientToServerEvents {
  'chat message': (message: string) => void;
  login: (credentials: { username: string; password: string }) => { success: boolean; token?: string };
}

// Create a typed shared Socket.IO connection
const socket = createSharedSocketIO<ServerToClientEvents, ClientToServerEvents>('https://example.com');

// Listen for events with type safety
socket.on('message', (data) => {
  // TypeScript knows that data has text and from properties
  console.log(`Message from ${data.from}: ${data.text}`);
});

// Emit events with type safety
socket.emit('chat message', 'Hello, world!');

// Emit with acknowledgement and type safety
socket.emitWithAck('login', { username: 'user1', password: 'pass123' })
  .then(response => {
    // TypeScript knows that response has a success property and possibly a token
    if (response.success && response.token) {
      console.log('Login successful, token:', response.token);
    }
  });
```

## Notes

- Connections created by `createSharedSocketIO` are shared across all tabs using the same URL and options.
- If the browser doesn't support Shared Workers, the library will fall back to using BroadcastChannel or LocalStorage for synchronization.
- Events will be received by all tabs that have registered to listen for them, while acknowledgements will only be received by the tab that sent the request.
- The connection will only be closed when all tabs have disconnected or closed.
- Notifications will only be shown when the tab is not focused, and only if the browser supports the Notifications API and the user has granted permission.

## See Also

- [SharedSocketClient](./SharedSocketClient.md)
- [NotificationAPI](./NotificationAPI.md)
- [SharedSocketIOOptions](./SharedSocketIOOptions.md) 