# NotificationAPI

The `NotificationAPI` interface provides methods for subscribing to and unsubscribing from notifications for Socket.IO events. Notifications will be displayed when events are received from the Socket.IO server, even when the browser tab is not focused.

## Definition

```typescript
interface NotificationAPI {
  subscribe(eventName: string, options?: NotificationOptions): Promise<boolean>;
  unsubscribe(eventName: string): void;
}
```

## Methods

### subscribe()

Subscribes to notifications for a Socket.IO event.

```typescript
subscribe(eventName: string, options?: NotificationOptions): Promise<boolean>;
```

**Parameters**:
- `eventName`: The name of the Socket.IO event to subscribe to
- `options` (optional): Configuration options for the notification

**Returns**: Promise<boolean> - `true` if the subscription was successful, `false` if the user denied notification permission

**Description**: This method subscribes to notifications for a Socket.IO event. When the event is received from the server, a notification will be displayed even if the browser tab is not focused. This method will automatically request notification permission from the user if needed.

**Example**:
```typescript
// Simple notification subscription
socket.notifications.subscribe('newMessage')
  .then(granted => {
    if (granted) {
      console.log('Notification subscription successful');
    } else {
      console.log('User denied notification permission');
    }
  });

// Notification subscription with options
socket.notifications.subscribe('newMessage', {
  title: 'New Message',
  body: 'You have a new message',
  icon: '/path/to/icon.png',
  badge: '/path/to/badge.png',
  tag: 'message',
  requireInteraction: true,
  silent: false,
  onClick: (notification, data) => {
    console.log('User clicked on notification:', data);
    window.focus();
  }
})
  .then(granted => {
    if (granted) {
      console.log('Notification subscription successful');
    } else {
      console.log('User denied notification permission');
    }
  });
```

### unsubscribe()

Unsubscribes from notifications for a Socket.IO event.

```typescript
unsubscribe(eventName: string): void;
```

**Parameters**:
- `eventName`: The name of the Socket.IO event to unsubscribe from

**Description**: This method unsubscribes from notifications for a Socket.IO event. After calling this method, no more notifications will be displayed when this event is received from the server.

**Example**:
```typescript
socket.notifications.unsubscribe('newMessage');
```

## Types

### NotificationOptions

```typescript
interface NotificationOptions {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
  renotify?: boolean;
  vibrate?: number[];
  onClick?: (notification: Notification, data: any) => void;
}
```

**Properties**:
- `title`: The title of the notification. If not provided, the event name will be used.
- `body`: The body of the notification. If not provided, the first parameter of the event will be used.
- `icon`: The URL of the icon to display in the notification.
- `badge`: The URL of the badge to display when there is not enough room for the full notification.
- `image`: The URL of an image to display in the notification.
- `tag`: An identifier for the notification. Notifications with the same tag will replace each other.
- `data`: Custom data to attach to the notification.
- `requireInteraction`: If `true`, the notification will not automatically close.
- `silent`: If `true`, the notification will not make a sound or vibrate.
- `renotify`: If `true`, the notification will make a sound and vibrate even if it replaces an existing notification.
- `vibrate`: The vibration pattern for the notification.
- `onClick`: A callback function that will be called when the user clicks on the notification.

## Notes

- Notifications only work if the browser supports the Web Notifications API and the user has granted notification permission.
- Notifications will only be displayed when the browser tab is not focused. If the tab is focused, the event will be handled normally without displaying a notification.
- When the user clicks on a notification, the browser tab will be focused and the `onClick` callback will be called if provided.
- If multiple tabs subscribe to notifications for the same event, only one notification will be displayed when the event is received.

## See Also

- [createSharedSocketIO](./createSharedSocketIO.md)
- [SharedSocketClient](./SharedSocketClient.md)
- [SharedSocketIOOptions](./SharedSocketIOOptions.md) 