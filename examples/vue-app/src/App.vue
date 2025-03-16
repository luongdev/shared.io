<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { createSharedSocketIO } from 'shared.io';

// Định nghĩa kiểu dữ liệu cho tin nhắn
interface Message {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
  isMe?: boolean;
}

// Định nghĩa kiểu dữ liệu cho trạng thái kết nối
interface ConnectionStatus {
  connected: boolean;
  url: string | null;
  error: Error | null;
}

// State cho tin nhắn
const messages = ref<Message[]>([]);
// State cho tin nhắn đang soạn
const messageText = ref('');
// State cho trạng thái kết nối
const connectionStatus = ref<ConnectionStatus>({
  connected: false,
  url: null,
  error: null
});
// State cho số lượng tab đang kết nối
// State cho ID của client
const clientId = ref<string | null>(null);
// State cho loại transport đang sử dụng
const transportType = ref<string>('Đang kiểm tra...');
// State cho việc hỗ trợ SharedWorker
const sharedWorkerSupport = ref<boolean | null>(null);
// State cho phòng hiện tại
const currentRoom = ref<string>('');
// State cho tên phòng đang nhập
const roomName = ref<string>('');
// State cho thông báo
const notification = ref<string | null>(null);

// Tham chiếu đến đối tượng socket
let socket: any = null;

// Kiểm tra hỗ trợ SharedWorker
onMounted(() => {
  sharedWorkerSupport.value = typeof SharedWorker !== 'undefined';
  connectToServer();
});

// Ngắt kết nối khi component unmount
onUnmounted(() => {
  disconnectFromServer();
});

// Hiển thị thông báo
const showNotification = (message: string) => {
  notification.value = message;
  setTimeout(() => {
    notification.value = null;
  }, 3000);
};

// Kết nối đến máy chủ Socket.IO
const connectToServer = () => {
  try {
    // Tạo URL worker với timestamp để tránh cache    
    // Tạo kết nối Socket.IO được chia sẻ
    socket = createSharedSocketIO('http://localhost:3001', {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      longPolling: {
        enabled: false,
        interval: 30000,
        timeout: 25000
      }
    });

    // Thiết lập các sự kiện
    setupSocketEvents();

    // Xác định loại transport
    if (typeof SharedWorker !== 'undefined') {
      transportType.value = 'SharedWorker';
    } else if (typeof BroadcastChannel !== 'undefined') {
      transportType.value = 'BroadcastChannel';
    } else {
      transportType.value = 'LocalStorage';
    }

  } catch (error) {
    console.error('Lỗi kết nối:', error);
    connectionStatus.value = {
      connected: false,
      url: null,
      error: error as Error
    };
  }
};

// Ngắt kết nối khỏi máy chủ Socket.IO
const disconnectFromServer = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    connectionStatus.value = {
      connected: false,
      url: null,
      error: null
    };
    clientId.value = null;
  }
};

// Thiết lập các sự kiện Socket.IO
const setupSocketEvents = () => {
  // Sự kiện kết nối
  socket.on('connect', () => {
    console.log('Đã kết nối đến máy chủ');
    connectionStatus.value = {
      connected: true,
      url: 'http://localhost:3001',
      error: null
    };
    clientId.value = socket.id;
  });

  // Sự kiện ngắt kết nối
  socket.on('disconnect', (reason: string) => {
    console.log(`Đã ngắt kết nối: ${reason}`);
    connectionStatus.value = {
      connected: false,
      url: null,
      error: null
    };
  });

  // Sự kiện lỗi kết nối
  socket.on('connect_error', (error: Error) => {
    console.error('Lỗi kết nối:', error);
    connectionStatus.value = {
      connected: false,
      url: null,
      error: error
    };
  });

  // Sự kiện chào mừng
  socket.on('welcome', (data: any) => {
    console.log('Đã nhận tin nhắn chào mừng:', data);
    showNotification(`Chào mừng! ${data.message}`);
  });

  // Sự kiện người dùng tham gia
  socket.on('userJoined', (data: any) => {
    console.log('Người dùng đã tham gia:', data);
    showNotification(`Người dùng ${data.userId} đã tham gia`);
  });

  // Sự kiện người dùng rời đi
  socket.on('userLeft', (data: any) => {
    console.log('Người dùng đã rời đi:', data);
    showNotification(`Người dùng ${data.userId} đã rời đi`);
  });

  // Sự kiện tin nhắn mới
  socket.on('newMessage', (data: any) => {
    console.log('Đã nhận tin nhắn mới:', data);
    const newMessage: Message = {
      id: Date.now().toString(),
      userId: data.userId,
      text: data.text,
      timestamp: data.timestamp,
      isMe: data.userId === socket.id
    };
    messages.value.push(newMessage);
  });

  // Sự kiện cập nhật phòng
  socket.on('roomUpdate', (data: any) => {
    console.log('Cập nhật phòng:', data);
    showNotification(`${data.userId} đã ${data.action} phòng ${data.room}`);
  });

  // Sự kiện tin nhắn phòng
  socket.on('roomMessage', (data: any) => {
    console.log('Đã nhận tin nhắn phòng:', data);
    if (data.room === currentRoom.value) {
      const newMessage: Message = {
        id: Date.now().toString(),
        userId: data.userId,
        text: data.text,
        timestamp: data.timestamp,
        isMe: data.userId === socket.id
      };
      messages.value.push(newMessage);
    }
  });
};

// Gửi tin nhắn
const sendMessage = () => {
  if (!socket || !messageText.value.trim()) return;

  const message = {
    text: messageText.value.trim()
  };

  if (currentRoom.value) {
    // Gửi tin nhắn đến phòng
    socket.emit('roomMessage', {
      room: currentRoom.value,
      text: messageText.value.trim()
    });
  } else {
    // Gửi tin nhắn đến tất cả
    socket.emit('chatMessage', message);
  }

  messageText.value = '';
};

// Tham gia phòng
const joinRoom = () => {
  if (!socket || !roomName.value.trim()) return;

  // Rời phòng hiện tại nếu có
  if (currentRoom.value) {
    messages.value = [];
  }

  // Tham gia phòng mới
  socket.emit('joinRoom', roomName.value.trim());
  currentRoom.value = roomName.value.trim();
  roomName.value = '';
};

// Rời phòng
const leaveRoom = () => {
  if (!socket || !currentRoom.value) return;

  socket.emit('leaveRoom', currentRoom.value);
  currentRoom.value = '';
  messages.value = [];
};
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>Socket.IO Shared Worker Demo (Vue + Vite)</h1>
      <div class="connection-info">
        <div class="status">
          <span>Trạng thái: </span>
          <span :class="connectionStatus.connected ? 'connected' : 'disconnected'">
            {{ connectionStatus.connected ? 'Đã kết nối' : 'Đã ngắt kết nối' }}
          </span>
        </div>
        <div class="client-id">
          <span>Client ID: </span>
          <span>{{ clientId || 'N/A' }}</span>
        </div>
        <div class="transport">
          <span>Transport: </span>
          <span>{{ transportType }}</span>
        </div>
        <div class="shared-worker">
          <span>SharedWorker: </span>
          <span>{{ sharedWorkerSupport === null ? 'Đang kiểm tra...' : sharedWorkerSupport ? 'Hỗ trợ' : 'Không hỗ trợ' }}</span>
        </div>
      </div>
      <div class="connection-buttons">
        <button 
          @click="connectToServer" 
          :disabled="connectionStatus.connected"
          class="connect-btn"
        >
          Kết nối
        </button>
        <button 
          @click="disconnectFromServer" 
          :disabled="!connectionStatus.connected"
          class="disconnect-btn"
        >
          Ngắt kết nối
        </button>
      </div>
    </header>

    <main class="app-main">
      <div v-if="notification" class="notification">
        {{ notification }}
      </div>

      <div class="room-section">
        <div class="current-room">
          <template v-if="currentRoom">
            <h3>Phòng hiện tại: {{ currentRoom }}</h3>
            <button @click="leaveRoom" class="leave-room-btn">Rời phòng</button>
          </template>
          <h3 v-else>Phòng công khai</h3>
        </div>
        <div class="room-form">
          <input
            type="text"
            v-model="roomName"
            placeholder="Nhập tên phòng..."
            :disabled="!connectionStatus.connected"
          />
          <button 
            @click="joinRoom" 
            :disabled="!connectionStatus.connected || !roomName.trim()"
            class="join-room-btn"
          >
            Tham gia phòng
          </button>
        </div>
      </div>

      <div class="messages-container">
        <div v-if="messages.length === 0" class="no-messages">
          Chưa có tin nhắn nào.
        </div>
        <div 
          v-for="message in messages" 
          :key="message.id" 
          :class="['message', message.isMe ? 'my-message' : 'other-message']"
        >
          <div class="message-header">
            <span class="user-id">{{ message.isMe ? 'Bạn' : message.userId }}</span>
            <span class="timestamp">{{ message.timestamp }}</span>
          </div>
          <div class="message-body">
            {{ message.text }}
          </div>
        </div>
      </div>

      <div class="message-form">
        <input
          type="text"
          v-model="messageText"
          placeholder="Nhập tin nhắn..."
          :disabled="!connectionStatus.connected"
          @keyup.enter="sendMessage"
        />
        <button 
          @click="sendMessage" 
          :disabled="!connectionStatus.connected || !messageText.trim()"
          class="send-btn"
        >
          Gửi
        </button>
      </div>
    </main>

    <footer class="app-footer">
      <p>Socket.IO Shared Worker Demo - Mở nhiều tab để thử nghiệm</p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  font-family: Arial, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  color: #333;
}

.app-header {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h1 {
  color: #2c3e50;
  margin-top: 0;
  font-size: 24px;
}

.connection-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin: 15px 0;
}

.connection-info > div {
  padding: 8px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.connected {
  color: #4caf50;
  font-weight: bold;
}

.disconnected {
  color: #f44336;
  font-weight: bold;
}

.connection-buttons {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.connect-btn {
  background-color: #4caf50;
  color: white;
}

.disconnect-btn {
  background-color: #f44336;
  color: white;
}

.app-main {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.notification {
  background-color: #2196f3;
  color: white;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
  text-align: center;
}

.room-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.room-form {
  display: flex;
  gap: 10px;
}

.join-room-btn {
  background-color: #2196f3;
  color: white;
}

.leave-room-btn {
  background-color: #ff9800;
  color: white;
  margin-left: 10px;
}

.messages-container {
  height: 400px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 15px;
  background-color: #f9f9f9;
}

.no-messages {
  text-align: center;
  color: #999;
  padding: 20px;
}

.message {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 8px;
  max-width: 80%;
}

.my-message {
  background-color: #e3f2fd;
  margin-left: auto;
}

.other-message {
  background-color: #f1f1f1;
  margin-right: auto;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 12px;
}

.user-id {
  font-weight: bold;
  color: #2196f3;
}

.timestamp {
  color: #999;
}

.message-body {
  word-break: break-word;
}

.message-form {
  display: flex;
  gap: 10px;
}

input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.send-btn {
  background-color: #2196f3;
  color: white;
}

.app-footer {
  text-align: center;
  padding: 15px;
  color: #666;
  font-size: 14px;
}
</style>
