/**
 * DP-CHUNG — Apps Script dùng chung cho ứng dụng ĐP (đồng bộ đảng phí các xã)
 *
 * Ứng dụng ĐP chỉ cần NHẬP 1 MÃ DUY NHẤT (mã chung). Script này kiểm tra mã chung,
 * rồi chuyển dữ liệu tới Apps Script RIÊNG của từng xã kèm mã riêng của xã đó
 * (mã riêng được lưu ở đây, trong Script Properties, không nằm trong app).
 * Các Apps Script của từng xã KHÔNG bị sửa; trang web và nút dùng mã riêng vẫn chạy như cũ.
 *
 * CÁCH CÀI (làm 1 lần):
 *  1. script.google.com → Dự án mới → đặt tên "DP-CHUNG" → dán toàn bộ mã này.
 *  2. Trong hàm datMa(): điền MÃ CHUNG và mã riêng từng xã → chọn hàm datMa → Chạy (cấp quyền khi được hỏi).
 *  3. XÓA các mã vừa điền khỏi hàm datMa() (để trống lại) rồi Lưu.
 *  4. Triển khai → Tùy chọn triển khai mới → Ứng dụng web → Thực thi: Tôi; Ai có quyền truy cập: Bất kỳ ai → Triển khai.
 *  5. Gửi lại URL kết thúc bằng /exec cho Claude để đưa vào app.
 */

// Khóa nguồn (source) của từng xã → địa chỉ /exec của Apps Script xã đó
const XA = {
  'website-van-ban-api': 'https://script.google.com/macros/s/AKfycbwA6gO_3VpRmqjs1qIPprnFzo-Ala4uBqsYK3620rzqv3bl_27N623RFnf9V9wXxV12/exec', // ĐP Văn Bàn
  'website-xuan-hoa-api': 'https://script.google.com/macros/s/AKfycbxNpIwIdSufuR51f3iLL1eKILxo9Km3BjvhGiyeXVZ7d1_3SBXWexRBaSBbTY9LEbYu/exec', // ĐP Xuân Hòa
  'website-pung-luong-api': 'https://script.google.com/macros/s/AKfycbzb0GE2RWwHftri7SGaW8uh4l8bt58e01bzWW1xgZiwVHBVUNkoAnd1mOePbSny16nh7Q/exec', // ĐP Púng Luông
  'website-bao-thang-api': 'https://script.google.com/macros/s/AKfycbxAaE46jDGIDki4cYGffdymtqMqJDfnutoP7QsVgLM8kyMu-3gpBxfdEZGn8HMsWrR1/exec', // ĐP Bảo Thắng
  'website-luong-thinh-api': 'https://script.google.com/macros/s/AKfycbw8NhU4T_iEjgoQebNAGVbjTs9rcaTIzkeDTtztpdFEkMwgNc1gRqk7jsmsBMgNxI6MKA/exec', // ĐP Lương Thịnh
  'website-nghia-do-api': 'https://script.google.com/macros/s/AKfycbyA58Z6sF1diN5q_xLTRW8Eb7z6RHBB6sODiluiw3dqWDDIORLV84BD4VMm07c2YHs6gg/exec', // ĐP Nghĩa Đô
  'website-phinh-ho-api': 'https://script.google.com/macros/s/AKfycbxVbYRtH1aYVo3gkA7lMPpfu7gCShvAvozkh71d7kJTkjXHltAvfVp8O2yW1CS31pc1UQ/exec', // ĐP Phình Hồ
  'website-phuc-khanh-api': 'https://script.google.com/macros/s/AKfycbzmZKP2MNQ8Hgeh4Qc1QjZp98ddQLyjqrIohVUrbaRaHO0sJg4_KMxJLF9Znhem876dmQ/exec', // ĐP Phúc Khánh
  'website-si-ma-cai-api': 'https://script.google.com/macros/s/AKfycbyb0fvQHdmdDwKMOnF4qM-K5CniGORlNzRKjKaxKe6Whc19PLj8myU3yQ7aiYXPYlcylQ/exec', // ĐP Si Ma Cai
  'website-tram-tau-api': 'https://script.google.com/macros/s/AKfycbyDJxQWv3T9ESqRZAPYhyP-HyKEIgJa3oxiYmG4qcs-RR-ha9gZb1374VxhAm3iWq_W/exec', // ĐP Trạm Tấu
  'website-vo-lao-api': 'https://script.google.com/macros/s/AKfycbyZuNu5E1HxfD7kAL195eZ2JpTaElgViDjGDHTauIhXpC7lnqjPixHd49VpuhsIbXmh/exec', // ĐP Võ Lao
  'website-den-sang-api': 'https://script.google.com/macros/s/AKfycbzABnJRJPBsEx0qQ5GtEK05nRHjsbUZQHKu23adXPwTAiVG_1CZ8pFnhZf1gS6gqDVpmw/exec', // ĐP Dền Sáng
};

function datMa() {
  const CHUNG = '';            // <-- mã chung (điền, chạy, rồi xóa)
  const RIENG = {               // <-- mã riêng từng xã (điền, chạy, rồi xóa)
    'website-van-ban-api': '', // ĐP Văn Bàn
    'website-xuan-hoa-api': '', // ĐP Xuân Hòa
    'website-pung-luong-api': '', // ĐP Púng Luông
    'website-bao-thang-api': '', // ĐP Bảo Thắng
    'website-luong-thinh-api': '', // ĐP Lương Thịnh
    'website-nghia-do-api': '', // ĐP Nghĩa Đô
    'website-phinh-ho-api': '', // ĐP Phình Hồ
    'website-phuc-khanh-api': '', // ĐP Phúc Khánh
    'website-si-ma-cai-api': '', // ĐP Si Ma Cai
    'website-tram-tau-api': '', // ĐP Trạm Tấu
    'website-vo-lao-api': '', // ĐP Võ Lao
    'website-den-sang-api': '', // ĐP Dền Sáng
  };
  const P = PropertiesService.getScriptProperties();
  if (CHUNG) P.setProperty('CHUNG_HASH', sha_(CHUNG));
  Object.keys(RIENG).forEach(k => { if (RIENG[k]) P.setProperty('XA_' + k, RIENG[k]); });
  const con = Object.keys(XA).filter(k => !P.getProperty('XA_' + k));
  Logger.log('Mã chung: ' + (P.getProperty('CHUNG_HASH') ? 'đã đặt' : 'CHƯA đặt'));
  Logger.log('Xã còn thiếu mã riêng: ' + (con.length ? con.join(', ') : 'không'));
}

function sha_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)
    .map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return out_({ ok: true, name: 'DP-CHUNG', version: 1 });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const P = PropertiesService.getScriptProperties();
    const hash = P.getProperty('CHUNG_HASH');
    if (!hash || sha_(body.token || '') !== hash) return out_({ ok: false, error: 'Mã đồng bộ chung không đúng.' });
    const src = String(body.source || '');
    const key = Object.keys(XA).find(k => src.indexOf(k) === 0);
    if (!key) return out_({ ok: false, error: 'Không xác định được xã từ nguồn: ' + src });
    const code = P.getProperty('XA_' + key);
    if (!code) return out_({ ok: false, error: 'Chưa đặt mã riêng cho ' + key });
    body.token = code;
    const r = UrlFetchApp.fetch(XA[key], {
      method: 'post', contentType: 'text/plain;charset=utf-8',
      payload: JSON.stringify(body), muteHttpExceptions: true, followRedirects: true
    });
    return out_({ ok: r.getResponseCode() < 400, status: r.getResponseCode(), xa: key });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}
