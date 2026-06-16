# 🌿 Himalaya Herbal VN — Hệ thống MKT EC

Hệ thống quản lý kế hoạch kinh doanh & KPI cho team MKT/EC.

## Cấu trúc thư mục

```
himalaya-app/
├── server.js          ← Backend Node.js (API + SQLite)
├── package.json       ← Cấu hình project
├── 啟動系統.bat        ← Script khởi động (double-click để chạy)
├── data/
│   └── himalaya.db    ← Database SQLite (tự tạo khi chạy lần đầu)
└── public/
    ├── index.html     ← Giao diện chính
    ├── dang-ky.html   ← Form đăng ký Livestream (công khai)
    ├── css/
    │   └── app.css    ← Stylesheet
    └── js/
        └── app.js     ← Frontend JavaScript
```

## Yêu cầu hệ thống

- Windows 10/11
- Node.js v22+ (đã có sẵn trong Genspark Claw)
- Không cần npm install

## Cách chạy

### Khởi động nhanh
Double-click `啟動系統.bat`

### Khởi động thủ công
```bat
"C:\Users\user\AppData\Roaming\Genspark Claw\bin\node.exe" server.js
```

## Truy cập

| Địa chỉ | Mô tả |
|---------|-------|
| http://localhost:3456 | Máy tính hiện tại |
| http://192.168.1.11:3456 | Mạng LAN |
| https://app.markyaomac.work | Internet (cần Cloudflare Tunnel chạy) |

## Tài khoản mặc định

| Tài khoản | Mật khẩu | Vai trò |
|-----------|----------|---------|
| admin | admin123 | Quản trị viên |
| manager | manager123 | Quản lý |
| hien | hien123 | Nhân viên |
| vy | vy123 | Nhân viên |

## Các tính năng

- 📊 Dashboard tổng quan
- 🎯 KPI theo tháng / nền tảng (Shopee, Lazada, TikTok, Website)
- 🎨 Chủ đề Branding theo tháng
- 🏷️ Deal sàn & kết quả
- 🧴 Bảng giá sản phẩm
- 📺 Lịch Livestream
- 📝 Đăng ký Livestream (form công khai cho ứng viên)
- 🎥 KOC Booking
- 📋 Kế hoạch công việc theo tuần
- ⚙️ Quản lý tài khoản & đổi mật khẩu
- 📥 Nhập dữ liệu từ CSV (kéo thả)
- 👥 Quản lý người dùng (admin)
- 📜 Nhật ký hoạt động

## Công nghệ

- **Backend**: Node.js 22 + Express 5
- **Database**: SQLite (node:sqlite built-in)
- **Frontend**: Vanilla JS + CSS (không dùng framework)
- **Tunnel**: Cloudflare Tunnel (HTTPS công khai)
