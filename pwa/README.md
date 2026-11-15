# ĐP Đảng phí — bản PWA

Chuyển từ app Android DP-DangPhi_4.apk (WebView + 13 script dấu trang). Logic đồng bộ giữ nguyên trong `engine.js`; danh sách xã và địa chỉ Apps Script lấy từ `config.json` của APK.

## Đặt lên mạng (bắt buộc HTTPS)
Chép cả thư mục này lên GitHub Pages (ví dụ repo laocai-cds/dp-app, thư mục `pwa/`) hoặc Cloudflare Pages. Mở địa chỉ đó trên điện thoại/máy tính rồi bấm **Cài đặt** (Android/Chrome, Edge) hoặc **Chia sẻ → Thêm vào Màn hình chính** (iPhone).

## Cách dùng
1. Lấy token gqtthc (mục 1): dùng dấu trang "Lấy token gqtthc" trên trang gqtthc.dcs.vn, hoặc dán thủ công. Token hết hạn sau khoảng 30 phút.
2. Nhập Mã chung (mục 2).
3. Chọn kỳ, tick xã, bấm "Lấy dữ liệu" (hoặc nút ĐP của từng xã). Tự động lặp chỉ chạy khi app đang mở.
Mỗi xã một máy: mở `.../index.html?only=vanban`.

## Nếu báo "không cho trang này gọi trực tiếp"
Gateway gqtthc có thể chỉ cho phép trang gqtthc.dcs.vn gọi. Khi đó triển khai `proxy-worker.js` (Cloudflare Worker, hướng dẫn ở đầu file) và dán địa chỉ vào Nâng cao → proxy.

## Không có so với app Windows/Android
Giữ phiên tự động, tự chạy hằng ngày khi app đóng, webhook báo kết quả, kéo-thả thêm xã, xóa nút có mật khẩu, tự cập nhật (PWA tự lấy bản mới khi có mạng).
