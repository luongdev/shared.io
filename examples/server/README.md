# Socket.IO Server cho Shared Worker Demo

Server Socket.IO đơn giản để sử dụng với ứng dụng demo Socket.IO Shared Worker.

## Tính năng

- Kết nối Socket.IO với CORS được bật
- Xử lý tin nhắn chat công khai
- Quản lý phòng chat
- Thông báo khi người dùng tham gia/rời đi
- Theo dõi người dùng và phòng

## Cài đặt

```bash
# Cài đặt các gói phụ thuộc
npm install
```

## Chạy server

```bash
# Khởi động server
npm start

# Khởi động server với nodemon (tự động khởi động lại khi có thay đổi)
npm run dev
```

## API Socket.IO

### Sự kiện từ server đến client

- `welcome`: Gửi khi client kết nối
- `userJoined`: Gửi khi có người dùng mới tham gia
- `userLeft`: Gửi khi có người dùng rời đi
- `newMessage`: Gửi khi có tin nhắn mới trong chat công khai
- `roomUpdate`: Gửi khi có người dùng tham gia/rời phòng
- `roomMessage`: Gửi khi có tin nhắn mới trong phòng

### Sự kiện từ client đến server

- `chatMessage`: Gửi tin nhắn đến tất cả người dùng
- `joinRoom`: Tham gia phòng chat
- `leaveRoom`: Rời phòng chat
- `roomMessage`: Gửi tin nhắn đến phòng chat

## Cấu trúc dự án

- `server.js`: File chính của server
- `package.json`: Cấu hình dự án và các gói phụ thuộc 