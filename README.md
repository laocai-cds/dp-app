# ĐP Đảng phí – ứng dụng đồng bộ gqtthc → Google Sheet

Ứng dụng Windows nhúng trang gqtthc.dcs.vn, có sẵn nút ĐP của các xã. Đăng nhập gqtthc, bấm nút (hoặc tích chọn nhiều xã) để lấy số liệu đảng phí và gửi lên Google Sheet của từng xã.

## Tải về
Vào mục **Releases** của repo này, tải file `DP-DangPhi-win32-x64.zip`, giải nén và chạy `DP-DangPhi.exe`. Xem `HUONG-DAN.txt`.

## Phát hành bản mới (người quản trị)
1. Sửa mã, commit và push lên `main`.
2. Tạo tag: `git tag v1.0.1 && git push origin v1.0.1` (hoặc Releases → Draft a new release → đặt tag `v1.0.1`).
3. GitHub Actions tự đóng gói và đính file zip vào Release (khoảng 3–5 phút).
Ứng dụng tự báo "Có bản mới" khi mở nếu Releases có phiên bản cao hơn bản đang chạy (đổi `version` trong `package.json` cho khớp tag).

## Cấu hình
`config.json`: danh sách xã (mã gqtthc, địa chỉ Apps Script). `"only": "vanban"` để máy xã chỉ hiện nút xã mình. Mã đồng bộ không nằm trong repo, mỗi máy nhập một lần và lưu cục bộ.

Mã lấy số liệu từng xã nằm ở `bm/`.
