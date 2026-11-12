# ĐP Đảng phí – ứng dụng đồng bộ gqtthc → Google Sheet

Ứng dụng Windows nhúng trang gqtthc.dcs.vn, có sẵn nút ĐP của các xã. Đăng nhập gqtthc, bấm nút (hoặc tích chọn nhiều xã) để lấy số liệu đảng phí và gửi lên Google Sheet của từng xã.

## Tải về
Vào mục **Releases**, tải file **`DP-DangPhi-Setup.exe`** (một file duy nhất), bấm đôi để cài (không cần quyền admin), mở bằng biểu tượng ngoài Desktop. Bản zip `DP-DangPhi-win32-x64.zip` dùng cho cập nhật đầy đủ. Xem `HUONG-DAN.txt`.

## Phát hành bản mới (người quản trị)
Mỗi lần push lên `main`, GitHub Actions tự đóng gói và tạo/cập nhật Release có tag `v<version>` (lấy từ `package.json`). Muốn ra bản mới cho người dùng: tăng `version` trong `package.json` rồi push. Ứng dụng tự báo "Cập nhật lên bản …" khi Releases có phiên bản cao hơn bản đang chạy.

## Cấu hình
`config.json`: danh sách xã (mã gqtthc, địa chỉ Apps Script). `"only": "vanban"` để máy xã chỉ hiện nút xã mình. Mã đồng bộ không nằm trong repo, mỗi máy nhập một lần và lưu cục bộ.

Mã lấy số liệu từng xã nằm ở `bm/`.
