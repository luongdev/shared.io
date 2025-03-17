const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Cấu hình CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Phục vụ các file tĩnh
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

// Lưu danh sách các clients đang kết nối
const activeClients = new Set();

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  activeClients.add(socket.id);
  
  // Gửi danh sách clients cho dashboard
  io.emit('client-list-update', Array.from(activeClients));
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    activeClients.delete(socket.id);
    io.emit('client-list-update', Array.from(activeClients));
  });
});

// API routes để gửi messages và notifications
app.post('/api/send-message', (req, res) => {
  const { message, clientId } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  // Nếu có clientId, gửi cho client cụ thể, ngược lại broadcast
  if (clientId && activeClients.has(clientId)) {
    io.to(clientId).emit('message', { text: message, time: new Date() });
    console.log(`Message sent to ${clientId}: ${message}`);
  } else {
    io.emit('message', { text: message, time: new Date() });
    console.log(`Broadcast message: ${message}`);
  }
  
  res.json({ success: true });
});

app.post('/api/send-notification', (req, res) => {
  const { title, body, clientId } = req.body;
  
  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }
  
  const notification = { title, body, time: new Date() };
  
  // Nếu có clientId, gửi cho client cụ thể, ngược lại broadcast
  if (clientId && activeClients.has(clientId)) {
    io.to(clientId).emit('notification', notification);
    console.log(`Notification sent to ${clientId}: ${title}`);
  } else {
    io.emit('notification', notification);
    console.log(`Broadcast notification: ${title}`);
  }
  
  res.json({ success: true });
});

// Server dashboard để xem clients và gửi tin nhắn
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Khởi động server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 