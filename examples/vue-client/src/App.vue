<template>
  <div class="app">
    <header>
      <h1>Shared.IO Vue Client</h1>
      <div class="connection-status" :class="{ connected: isConnected }">
        {{ isConnected ? 'Connected' : 'Disconnected' }}
      </div>
    </header>

    <main>
      <section class="messages-section">
        <h2>Messages</h2>
        <div class="messages-container">
          <div v-if="messages.length === 0" class="no-messages">
            No messages received
          </div>
          <div v-for="(msg, index) in messages" :key="index" class="message">
            <div class="message-time">{{ formatTime(msg.time) }}</div>
            <div class="message-text">{{ msg.text }}</div>
          </div>
        </div>
      </section>

      <section class="notifications-section">
        <h2>Notifications</h2>
        <div class="notifications-container">
          <div v-if="notifications.length === 0" class="no-notifications">
            No notifications received
          </div>
          <div v-for="(notif, index) in notifications" :key="index" class="notification">
            <div class="notification-time">{{ formatTime(notif.time) }}</div>
            <div class="notification-title">{{ notif.title }}</div>
            <div class="notification-body">{{ notif.body }}</div>
          </div>
        </div>
      </section>
    </main>

    <div class="actions">
      <button @click="requestNotifications">
        {{ hasNotificationPermission ? 'Notifications Enabled' : 'Enable Notifications' }}
      </button>
      <button @click="reconnect" :disabled="isConnected">
        Reconnect
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { createSharedSocketIO, ISharedSocketClient } from 'shared.io';

interface Message {
  text: string;
  time: Date;
}

interface Notification {
  title: string;
  body: string;
  time: Date;
}

export default defineComponent({
  name: 'App',
  setup() {
    const socket = ref<ISharedSocketClient | null>(null);
    const isConnected = ref(false);
    const messages = ref<Message[]>([]);
    const notifications = ref<Notification[]>([]);
    const hasNotificationPermission = ref(Notification.permission === 'granted');

    // Kết nối tới Socket.IO server thông qua shared.io
    const connect = () => {
      socket.value = createSharedSocketIO('http://localhost:3000', {
        autoConnect: true,
        reconnection: true,
        notifications: {
          enabled: true
        },
        longPolling: {
          enabled: false
        }
      });

      // Lắng nghe sự kiện kết nối
      socket.value.on('connect', () => {
        console.log('Connected to Socket.IO server');
        isConnected.value = true;
      });

      // Lắng nghe sự kiện ngắt kết nối
      socket.value.on('disconnect', () => {
        console.log('Disconnected from Socket.IO server');
        isConnected.value = false;
      });

      // Lắng nghe tin nhắn từ server
      socket.value.on('message', (data: Message) => {
        console.log('Message received:', data);
        
        // Convert string time to Date
        if (typeof data.time === 'string') {
          data.time = new Date(data.time);
        }
        
        messages.value.push(data);
        
        // Hiển thị thông báo trong trình duyệt
        if (Notification.permission === 'granted') {
          new Notification('New Message', {
            body: data.text,
            icon: '/favicon.ico'
          });
        }
      });

      // Lắng nghe thông báo từ server
      socket.value.on('notification', (data: Notification) => {
        console.log('Notification received:', data);
        
        // Convert string time to Date
        if (typeof data.time === 'string') {
          data.time = new Date(data.time);
        }
        
        notifications.value.push(data);
        
        // Hiển thị thông báo trong trình duyệt
        if (Notification.permission === 'granted') {
          new Notification(data.title, {
            body: data.body,
            icon: '/favicon.ico'
          });
        }
      });
    };

    // Yêu cầu quyền thông báo
    const requestNotifications = async () => {
      try {
        const permission = await Notification.requestPermission();
        hasNotificationPermission.value = permission === 'granted';
        console.log('Notification permission:', permission);
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };

    // Kết nối lại
    const reconnect = () => {
      if (socket.value) {
        socket.value.disconnect();
        socket.value.connect();
      } else {
        connect();
      }
    };

    // Format time
    const formatTime = (time: Date) => {
      if (!time) return '';
      return new Date(time).toLocaleTimeString();
    };

    // Lifecycle hooks
    onMounted(() => {
      connect();
    });

    onUnmounted(() => {
      if (socket.value) {
        socket.value.disconnect();
      }
    });

    return {
      isConnected,
      messages,
      notifications,
      hasNotificationPermission,
      requestNotifications,
      reconnect,
      formatTime
    };
  }
});
</script>

<style>
.app {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

h1 {
  margin: 0;
  font-size: 24px;
}

.connection-status {
  padding: 6px 12px;
  border-radius: 4px;
  background-color: #f44336;
  color: white;
  font-weight: bold;
}

.connection-status.connected {
  background-color: #4CAF50;
}

main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

section {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  overflow: hidden;
}

h2 {
  margin-top: 0;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.messages-container,
.notifications-container {
  height: 300px;
  overflow-y: auto;
}

.no-messages,
.no-notifications {
  color: #999;
  text-align: center;
  padding: 20px;
}

.message,
.notification {
  background-color: #f9f9f9;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 8px;
}

.message-time,
.notification-time {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.notification-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style> 