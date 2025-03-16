# Ví dụ sử dụng Socket.IO Shared Worker

Thư mục này chứa các ví dụ về cách sử dụng thư viện Socket.IO Shared Worker.

## Cấu trúc thư mục

- `server/`: Server Socket.IO đơn giản để sử dụng với các ví dụ
- `vue-app/`: Ứng dụng Vue 3 + Vite sử dụng thư viện Socket.IO Shared Worker

## Hướng dẫn chạy ví dụ

### 1. Khởi động server Socket.IO

```bash
cd server
npm install
npm start
```

Server sẽ chạy trên cổng 3001.

### 2. Khởi động ứng dụng Vue

```bash
cd vue-app
npm install
npm run dev
```

Ứng dụng Vue sẽ chạy trên cổng 5173.

### 3. Mở trình duyệt

Mở nhiều tab trình duyệt tại địa chỉ `http://localhost:5173` để thấy kết nối Socket.IO được chia sẻ giữa các tab.

## Tính năng demo

- Kết nối Socket.IO được chia sẻ giữa các tab trình duyệt
- Gửi và nhận tin nhắn trong thời gian thực
- Tham gia và rời phòng chat
- Hiển thị thông báo khi người dùng tham gia/rời đi
- Hiển thị trạng thái kết nối và thông tin client

## Lưu ý

- Ứng dụng sử dụng URL worker với timestamp để tránh cache
- Có script xóa cache trong `index.html`
- Cấu hình Vite được tối ưu để tránh cache trong quá trình phát triển 