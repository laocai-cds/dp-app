// proxy-worker.js — Cloudflare Worker (tùy chọn).
// Chỉ cần khi trình duyệt báo máy chủ gqtthc "không cho trang này gọi trực tiếp" (lỗi CORS).
// Worker chuyển tiếp đúng 2 đường dẫn của gateway, kèm token do người dùng gửi lên, và thêm tiêu đề CORS.
// Worker KHÔNG lưu token.
//
// Cài đặt: Cloudflare → Workers & Pages → Create Worker → dán file này → Deploy.
// Settings → Variables → thêm ALLOWED_ORIGINS = địa chỉ nơi đặt PWA, ví dụ https://laocai-cds.github.io
// (nhiều địa chỉ thì cách nhau bằng dấu phẩy). Sau đó dán địa chỉ Worker vào PWA, mục "Nâng cao → proxy".

const UPSTREAM = 'https://gateway-gqtthc.dcs.vn';
const PATHS = new Set(['/report/dashboard/danh-sach-theo-doi-dang-phi', '/report/s02/danh-sach']);

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!allowed.includes(origin)) return new Response('Origin not allowed', { status: 403 });
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const path = new URL(req.url).pathname;
    if (req.method !== 'POST' || !PATHS.has(path)) return new Response('Not found', { status: 404, headers: cors });
    const auth = req.headers.get('Authorization');
    if (!auth) return new Response('Missing token', { status: 401, headers: cors });
    const up = await fetch(UPSTREAM + path, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: req.body
    });
    return new Response(up.body, { status: up.status, headers: { ...cors, 'Content-Type': up.headers.get('Content-Type') || 'application/json' } });
  }
};
