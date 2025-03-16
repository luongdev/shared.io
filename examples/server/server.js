/**
 * Socket.IO Server for testing socket-io-shared-worker library
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Lưu trữ người dùng và phòng
const users = new Map();
const rooms = new Map();

// Xử lý kết nối Socket.IO
io.on('connection', (socket) => {
  console.log(`Người dùng đã kết nối: ${socket.id}`);
  
  // Lưu thông tin người dùng
  users.set(socket.id, {
    id: socket.id,
    rooms: new Set()
  });
  
  // Gửi tin nhắn chào mừng
  socket.emit('welcome', {
    message: `Chào mừng đến với Socket.IO Shared Worker Demo!`,
    timestamp: new Date().toISOString()
  });
  
  // Thông báo cho tất cả người dùng khác
  socket.broadcast.emit('userJoined', {
    userId: socket.id,
    timestamp: new Date().toISOString()
  });
  
  // Xử lý tin nhắn chat
  socket.on('chatMessage', (data) => {
    console.log(`Tin nhắn từ ${socket.id}: ${data.text}`);
    
    // Gửi tin nhắn đến tất cả người dùng
    io.emit('newMessage', {
      userId: socket.id,
      text: data.text,
      timestamp: new Date().toISOString()
    });
  });
  
  // Xử lý tham gia phòng
  socket.on('joinRoom', (roomName) => {
    console.log(`${socket.id} đang tham gia phòng ${roomName}`);
    
    // Tạo phòng nếu chưa tồn tại
    if (!rooms.has(roomName)) {
      rooms.set(roomName, new Set());
    }
    
    // Thêm người dùng vào phòng
    socket.join(roomName);
    rooms.get(roomName).add(socket.id);
    users.get(socket.id).rooms.add(roomName);
    
    // Thông báo cho tất cả người dùng
    io.emit('roomUpdate', {
      userId: socket.id,
      room: roomName,
      action: 'tham gia',
      timestamp: new Date().toISOString()
    });
  });
  
  // Xử lý rời phòng
  socket.on('leaveRoom', (roomName) => {
    console.log(`${socket.id} đang rời phòng ${roomName}`);
    
    // Xóa người dùng khỏi phòng
    socket.leave(roomName);
    if (rooms.has(roomName)) {
      rooms.get(roomName).delete(socket.id);
      
      // Xóa phòng nếu không còn ai
      if (rooms.get(roomName).size === 0) {
        rooms.delete(roomName);
      }
    }
    
    // Xóa phòng khỏi danh sách phòng của người dùng
    if (users.has(socket.id)) {
      users.get(socket.id).rooms.delete(roomName);
    }
    
    // Thông báo cho tất cả người dùng
    io.emit('roomUpdate', {
      userId: socket.id,
      room: roomName,
      action: 'rời',
      timestamp: new Date().toISOString()
    });
  });
  
  // Xử lý tin nhắn phòng
  socket.on('roomMessage', (data) => {
    console.log(`Tin nhắn phòng từ ${socket.id} trong phòng ${data.room}: ${data.text}`);
    
    // Kiểm tra xem người dùng có trong phòng không
    if (users.has(socket.id) && users.get(socket.id).rooms.has(data.room)) {
      // Gửi tin nhắn đến tất cả người dùng trong phòng
      io.to(data.room).emit('roomMessage', {
        userId: socket.id,
        room: data.room,
        text: data.text,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Xử lý ngắt kết nối
  socket.on('disconnect', () => {
    console.log(`Người dùng đã ngắt kết nối: ${socket.id}`);
    
    // Thông báo cho tất cả người dùng khác
    socket.broadcast.emit('userLeft', {
      userId: socket.id,
      timestamp: new Date().toISOString()
    });
    
    // Xóa người dùng khỏi tất cả phòng
    if (users.has(socket.id)) {
      const userRooms = [...users.get(socket.id).rooms];
      userRooms.forEach(roomName => {
        if (rooms.has(roomName)) {
          rooms.get(roomName).delete(socket.id);
          
          // Xóa phòng nếu không còn ai
          if (rooms.get(roomName).size === 0) {
            rooms.delete(roomName);
          }
          
          // Thông báo cho tất cả người dùng
          io.emit('roomUpdate', {
            userId: socket.id,
            room: roomName,
            action: 'rời',
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // Xóa người dùng
      users.delete(socket.id);
    }
  });
});

// Khởi động server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
}); 