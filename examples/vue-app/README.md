# Socket.IO Shared Worker Demo (Vue + Vite)

Ứng dụng demo sử dụng thư viện Socket.IO Shared Worker với Vue 3 và Vite.

## Tính năng

- Kết nối Socket.IO được chia sẻ giữa các tab trình duyệt
- Hỗ trợ SharedWorker, BroadcastChannel và LocalStorage
- Gửi và nhận tin nhắn trong thời gian thực
- Tham gia và rời phòng chat
- Hiển thị thông báo khi người dùng tham gia/rời đi
- Hiển thị trạng thái kết nối và thông tin client

## Cài đặt

```bash
# Cài đặt các gói phụ thuộc
npm install
```

## Chạy ứng dụng

```bash
# Khởi động ứng dụng ở chế độ phát triển
npm run dev
```

## Cấu trúc dự án

- `src/App.vue`: Component chính của ứng dụng
- `public/worker.js`: File worker được sử dụng bởi SharedWorker
- `index.html`: File HTML chính với script xóa cache

## Sử dụng

1. Khởi động server Socket.IO (trong thư mục `examples/server`)
2. Khởi động ứng dụng Vue
3. Mở nhiều tab trình duyệt để thấy kết nối được chia sẻ
4. Gửi tin nhắn và xem chúng xuất hiện trên tất cả các tab
5. Tham gia phòng chat để gửi tin nhắn riêng tư

## Lưu ý

- Ứng dụng sử dụng URL worker với timestamp để tránh cache
- Có script xóa cache trong `index.html`
- Cấu hình Vite được tối ưu để tránh cache trong quá trình phát triển
