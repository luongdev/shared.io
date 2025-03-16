# SharedSocketIOOptions

The `SharedSocketIOOptions` interface provides configuration options for the `createSharedSocketIO` function to create a Socket.IO connection shared across multiple browser tabs.

## Definition

```typescript
interface SharedSocketIOOptions {
  autoConnect?: boolean;
  workerUrl?: string;
  timeout?: number;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  randomizationFactor?: number;
  auth?: Record<string, any>;
  query?: Record<string, any>;
  extraHeaders?: Record<string, string>;
  path?: string;
  transports?: string[];
  upgrade?: boolean;
  forceNew?: boolean;
  timestampRequests?: boolean;
  timestampParam?: string;
}
```

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
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

```typescript
import { createSharedSocketIO } from 'socket-io-shared-worker';

const socket = createSharedSocketIO('https://example.com', {
  autoConnect: true,
  timeout: 10000,
  reconnection: true,
  reconnectionAttempts: 5,
  auth: {
    token: 'your-auth-token'
  }
});
```

### Advanced Example

```typescript
import { createSharedSocketIO } from 'socket-io-shared-worker';

const socket = createSharedSocketIO('https://example.com', {
  autoConnect: false,
  workerUrl: '/assets/worker.js',
  timeout: 30000,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.3,
  auth: {
    token: 'your-auth-token'
  },
  query: {
    version: '1.0.0'
  },
  extraHeaders: {
    'X-Client-Version': '1.0.0'
  },
  path: '/socket',
  transports: ['websocket'],
  upgrade: false
});

// Manual connection
socket.connect();
```

## Notes

- The options `autoConnect`, `workerUrl`, and `timeout` are specific to the Socket.IO Shared Worker library.
- The remaining options are passed directly to the Socket.IO client in the worker.
- When using the same URL and options, the connection will be shared between tabs. If you change any option, a new connection will be created.
- If you need multiple different connections, use different URLs or options.

## See Also

- [createSharedSocketIO](./createSharedSocketIO.md)
- [SharedSocketClient](./SharedSocketClient.md)
- [NotificationAPI](./NotificationAPI.md) 