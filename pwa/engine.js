// engine.js — logic đồng bộ đảng phí, chuyển từ các script dấu trang (assets/bm/*.js) trong APK.
// Khác bản APK: không còn chạy "bên trong" trang gqtthc nên token và địa chỉ máy chủ được truyền qua ctx.
//
// ctx = {
//   token,        // token đăng nhập gqtthc (localStorage.token của trang gqtthc.dcs.vn)
//   pw,           // Mã chung (mật khẩu Apps Script DP-CHUNG) — dùng cho các xã
//   pwTinh,       // mật khẩu Apps Script cấp Tỉnh (nếu trống dùng pw)
//   base,         // địa chỉ gateway hoặc proxy (mặc định GATEWAY)
//   chung,        // địa chỉ Apps Script dùng chung (config.chung)
//   y, m,         // kỳ cần lấy: năm, tháng
//   say(msg, lv), // báo tiến độ; lv: 'run' | 'ok' | 'bad'
//   signal,       // AbortSignal để hủy
//   store         // {get(k), set(k,v)} lưu mã đơn vị đã dò được
// }

export const GATEWAY = 'https://gateway-gqtthc.dcs.vn';
const PATH_LIST = '/report/dashboard/danh-sach-theo-doi-dang-phi';
const PATH_S02 = '/report/s02/danh-sach';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const num = x => Number(x) || 0;
const txt = x => String(x == null ? '' : x).trim();
const digitsOf = x => Number(String(x == null ? '' : x).replace(/[^\d]/g, '')) || 0;
const f1 = ms => (ms / 1000).toFixed(1).replace('.', ',') + 's';
const isTinh = x => /tỉnh Lào Cai/i.test(txt(x.tenDonVi));
const p2 = n => String(n).padStart(2, '0');

export class SyncError extends Error {
  constructor(msg, code) { super(msg); this.code = code || 'ERR'; }
}

const check = ctx => { if (ctx.signal && ctx.signal.aborted) throw new SyncError('Đã hủy', 'ABORT'); };

function netError(e) {
  if (e && e.name === 'AbortError') return new SyncError('API phản hồi quá chậm (quá 90 giây, đã thử 3 lần). Kiểm tra mạng rồi bấm lại.', 'TIMEOUT');
  if (e instanceof TypeError) return new SyncError('Không gọi được máy chủ gqtthc. Kiểm tra mạng; nếu mạng bình thường thì máy chủ không cho trang này gọi trực tiếp — hãy dùng proxy (mục Nâng cao).', 'NET');
  return e;
}

async function gwPost(ctx, path, body, ms = 90000) {
  const ac = new AbortController();
  const stop = () => ac.abort();
  if (ctx.signal) ctx.signal.addEventListener('abort', stop);
  const to = setTimeout(stop, ms);
  try {
    return await fetch((ctx.base || GATEWAY) + path, {
      method: 'POST', signal: ac.signal,
      headers: { Authorization: 'Bearer ' + ctx.token, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
  } finally {
    clearTimeout(to);
    if (ctx.signal) ctx.signal.removeEventListener('abort', stop);
  }
}

/** Đọc Apps Script bằng JSONP (Apps Script không bật CORS cho GET có kiểm tra). */
export function jsonp(url, ms = 9000) {
  return new Promise(res => {
    const cb = '__dp' + Date.now() + Math.random().toString(36).slice(2);
    const sc = document.createElement('script');
    const t = setTimeout(() => { delete window[cb]; sc.remove(); res(null); }, ms);
    window[cb] = v => { clearTimeout(t); delete window[cb]; sc.remove(); res(v); };
    sc.onerror = () => { clearTimeout(t); delete window[cb]; sc.remove(); res(null); };
    sc.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb + '&t=' + Date.now();
    document.head.appendChild(sc);
  });
}

/** Gọi danh sách theo dõi đảng phí của một đơn vị cha; tự thử lại khi chậm hoặc máy chủ báo lỗi 5xx. */
async function getL(ctx, pid, kS, kE, size = 1000) {
  let r = null;
  for (let at = 1; at <= 3 && !r; at++) {
    check(ctx);
    try {
      if (at > 1) ctx.say('API phản hồi chậm, đang thử lại lần ' + at + '…', 'run');
      const rr = await gwPost(ctx, PATH_LIST, { kyNopStart: kS, kyNopEnd: kE, parentId: pid, hasChildren: true, page: 1, size });
      if (rr.status >= 500 && at < 3) {
        ctx.say('Máy chủ gqtthc đang bận (lỗi ' + rr.status + '), tự thử lại lần ' + (at + 1) + ' sau 5 giây…', 'run');
        await sleep(5000);
        continue;
      }
      r = rr;
    } catch (e) {
      check(ctx);
      if (at >= 3) throw netError(e);
    }
  }
  if (!r.ok) {
    throw new SyncError('API trả lỗi ' + r.status + (r.status === 401 ? ' — token hết hạn, hãy lấy lại token từ trang gqtthc.' : ''), r.status === 401 ? 'AUTH' : 'HTTP');
  }
  const raw = await r.text();
  let J = null;
  try { J = JSON.parse(raw); } catch (e) { /* để trống */ }
  return { raw, st: r.status, list: (J && J.data) || [] };
}

function needAuth(ctx) {
  if (!ctx.token) throw new SyncError('Chưa có token gqtthc. Hãy lấy token ở mục 1.', 'AUTH');
}

/* ───────────────────────── Đồng bộ một xã (apiBookmarklet) ───────────────────────── */
export async function syncXa(xa, ctx) {
  const C = xa.arg;
  needAuth(ctx);
  if (!ctx.pw) throw new SyncError('Chưa nhập Mã chung ở mục 2.', 'PW');
  const pw = ctx.pw, cy = ctx.y, SM = ctx.m;
  const T0 = performance.now();
  const mm = p2(SM);
  const kS = '01/' + mm + '/' + cy, kE = new Date(cy, SM, 0).getDate() + '/' + mm + '/' + cy;
  const T = C.m ? ('Thang' + SM + (cy === 2026 ? '' : '-' + cy)) : ''; // năm 2026: Thang10; năm khác: Thang1-2027
  const rd = C.ep + '?action=read' + (T ? '&tab=' + encodeURIComponent(T) : '');
  const post = (body) => fetch(ctx.chung || C.ep, { method: 'POST', mode: 'no-cors', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });

  if (navigator.onLine === false) throw new SyncError('Máy đang mất kết nối mạng. Kiểm tra mạng rồi bấm lại.', 'NET');
  ctx.say('Đang lấy số liệu tháng ' + SM + '/' + cy + ' từ API…', 'run');
  const b0P = jsonp(rd); // đọc trước lastSync + làm nóng Apps Script trong lúc chờ API
  const tA = performance.now();

  // Đường nhanh: đã biết mã của chính đơn vị thì gọi thẳng danh sách con (truy vấn cấp tỉnh rất chậm)
  let R = null;
  const ck = 'cid.' + xa.id;
  try {
    const sv = ctx.store.get(ck) || C.cid;
    if (sv) {
      ctx.say('Đang lấy số liệu tháng ' + SM + '/' + cy + ' (đường nhanh)…', 'run');
      const X0 = await getL(ctx, sv, kS, kE);
      if (X0.list.length && !X0.list.some(x => isTinh(x) || txt(x.tenDonVi) === C.name)) R = X0;
    }
  } catch (e) { if (e.code === 'ABORT' || e.code === 'AUTH') throw e; }
  if (!R) {
    R = await getL(ctx, C.pid, kS, kE);
    if (!R.list.length) { await sleep(2000); R = await getL(ctx, C.pid, kS, kE); }
  }
  const tB = performance.now();
  if (!R.list.length) throw new SyncError('API không trả đơn vị nào cho ' + C.name + ' (HTTP ' + R.st + ', kỳ ' + kS + ' – ' + kE + ', parentId ' + C.pid + ').\nPhản hồi: ' + String(R.raw).slice(0, 180) + '\nNếu tài khoản đang đăng nhập không quản lý đơn vị này, hãy đăng nhập đúng tài khoản.');

  // C.pid là mã cấp tỉnh: tìm đúng dòng của đơn vị rồi lấy danh sách con của chính nó
  const me = R.list.find(x => txt(x.tenDonVi) === C.name);
  if (me) {
    const cand = [], seen = new Set();
    const add = v => {
      if (v == null || typeof v === 'object') return;
      const t = String(v).trim();
      if (t && !seen.has(t) && (/^\d{5,}$/.test(t) || /^[A-Za-z0-9._-]{3,}$/.test(t))) { seen.add(t); cand.push(/^\d+$/.test(t) ? Number(t) : t); }
    };
    const walk = (o, d) => {
      if (!o || typeof o !== 'object' || d > 2) return;
      for (const k in o) {
        const v = o[k];
        if (v && typeof v === 'object') walk(v, d + 1);
        else if (/id|ma|donVi|code/i.test(k) && !/soLuong|tongSo|tien|ty|muc|ky/i.test(k)) add(v);
      }
    };
    if (me.donVi && typeof me.donVi === 'object') walk(me.donVi, 0); else add(me.donVi);
    walk(me, 0);
    let found = null;
    for (const c of cand.slice(0, 8)) {
      if (String(c) === String(C.pid)) continue;
      let X;
      try { X = await getL(ctx, c, kS, kE); } catch (e) { if (e.code === 'ABORT' || e.code === 'AUTH') throw e; continue; }
      if (X.list.length && !X.list.some(x => isTinh(x) || txt(x.tenDonVi) === C.name)) { found = X; ctx.store.set(ck, String(c)); break; }
    }
    if (!found) throw new SyncError('Không lấy được danh sách con của ' + C.name + '. donVi=' + JSON.stringify(me.donVi) + '; đã thử: ' + cand.join(', '));
    R = found;
  }

  const tC = performance.now();
  let list = C.max ? R.list.slice(0, C.max) : R.list;
  if (C.skip0) list = list.filter(x => num(x.tongSoLuongDangVien) || num(x.tongSoHoSoDaDuyetDaNop) || num(x.tongSoTienDaNop) || num(x.tongSoTienDaKhaiBao)); // bỏ đơn vị 0/0
  if (!list.length) throw new SyncError('API không trả đơn vị nào.');
  if (list.some(x => isTinh(x) || txt(x.tenDonVi) === C.name)) throw new SyncError('Dữ liệu KHÔNG phải của các chi bộ/đảng bộ trực thuộc ' + C.name + ' (nhận ' + list.length + ' đơn vị, đầu tiên: ' + (list[0] && list[0].tenDonVi) + '). Đã dừng, chưa ghi vào Google Sheet.');

  const h1 = ['STT', 'Tên đơn vị', 'Đảng viên', '', '', '', '', 'Hồ sơ đảng phí', '', '', '', 'Số tiền', '', ''];
  const h2 = ['', '', 'Tổng sl đảng viên (1)', 'Số lượng ĐV sinh hoạt chính thức (2)', 'Số lượng ĐV sinh hoạt tạm thời (3)', 'Số lượng ĐV đã chuyển sinh hoạt đảng tạm thời (4)', 'Số lượng được miễn giảm ĐP (5)', 'Chưa duyệt (6)', 'Đã duyệt, chưa nộp (7)', 'Đã duyệt, đã nộp (8)', 'Số đảng viên chưa có hồ sơ (9)', 'Tổng tiền theo hồ sơ đã khai báo', 'Tổng tiền đã nộp', 'Tỷ lệ hoàn thành\n đảng phí thực tế'];
  const rows = [h2].concat(list.map((x, i) => [i + 1, x.tenDonVi, num(x.tongSoLuongDangVien), num(x.soLuongDangVienChinhThuc), num(x.soLuongDangVienTamThoi), num(x.soLuongChuyenTamThoi), num(x.soLuongDangVienMienGiam), num(x.tongSoHoSoChuaDuyet), num(x.tongSoHoSoDaDuyetChuaNop), num(x.tongSoHoSoDaDuyetDaNop), num(x.soLuongHoSoChuaKhaiBao), num(x.tongSoTienDaKhaiBao), num(x.tongSoTienDaNop), Math.round(num(x.mucDoThucHien) * 100) / 10000]));

  check(ctx);
  const b0 = await b0P, before = b0 && b0.ok ? (b0.lastSync || '') : null;
  const sentNames = new Set(list.map(x => txt(x.tenDonVi)));
  const sentPaid = list.reduce((a, x) => a + num(x.tongSoTienDaNop), 0);
  const sentMem = list.reduce((a, x) => a + num(x.tongSoLuongDangVien), 0);
  let nRead = 0, nFail = 0, tMin = 1e9, last = '';
  // Dữ liệu trong tab đích khớp với dữ liệu vừa gửi (đủ đơn vị, cùng tổng tiền đã nộp và tổng đảng viên)
  const same = d => {
    let c = 0, sp = 0, sm = 0;
    (d.rows || []).forEach(r => { if (Array.isArray(r) && sentNames.has(txt(r[1]))) { c++; sm += digitsOf(r[2]); sp += digitsOf(r[12]); } });
    last = 'đọc được ' + (d.rows || []).length + ' dòng, khớp ' + c + '/' + list.length + ', đã nộp ' + sp + ' (gửi ' + sentPaid + ')';
    return c >= sentNames.size && sp === sentPaid && sm === sentMem;
  };

  ctx.say('Đang gửi ' + list.length + ' đơn vị và chờ Google Sheet xác nhận…', 'run');
  const tD = performance.now();
  let ok = null, postErr = null, tE = null;
  // Gửi không chờ phản hồi, hỏi lại mỗi 1 giây (tối đa 3 lần cùng lúc) để biết dữ liệu đã lên ngay khi Apps Script ghi xong
  post(Object.assign(T ? { tab: T } : {}, { headers: h1, rows, token: pw, source: C.src, sentAt: new Date().toISOString() }))
    .then(() => { tE = performance.now(); }, er => { postErr = er; });
  await new Promise(res => {
    let done = false, fly = 0;
    const t1 = performance.now();
    const end = () => { if (done) return; done = true; clearInterval(iv); res(); };
    const iv = setInterval(() => {
      if (done) return;
      if ((ctx.signal && ctx.signal.aborted) || postErr || performance.now() - t1 > 60000) { end(); return; }
      if (fly < 3) {
        fly++;
        const ts = performance.now();
        jsonp(rd, 20000).then(x => {
          if (!x || !x.ok) { nFail++; return; }
          nRead++; tMin = Math.min(tMin, performance.now() - ts);
          if (done) return;
          if (same(x) || (before !== null && (x.lastSync || '') !== before)) { ok = x; end(); }
        }).finally(() => { fly--; });
      }
    }, 1000);
  });
  check(ctx);
  if (postErr && !ok) throw new SyncError('Không gửi được lên Google Sheet: ' + (postErr.message || postErr));
  const tF = performance.now();

  if (ok && C.m) {
    ctx.say('Đang cập nhật tab “Thu theo tháng”…', 'run');
    const MK = cy + '-' + p2(SM), paid = rows.slice(1).reduce((a, r) => a + (Number(r[12]) || 0), 0);
    const x = await jsonp(C.ep + '?action=read&tab=' + encodeURIComponent('Thu theo tháng'), 9000);
    if (x && x.ok) {
      const map = {};
      (x.rows || []).forEach(r => { const k = txt(r && r[0]); if (/^\d{4}-\d{2}$/.test(k)) map[k] = [k, digitsOf(r[1]), r[2] || '']; });
      map[MK] = [MK, paid, 'PWA lúc ' + new Date().toLocaleString('vi-VN', { hour12: false })];
      await post({ tab: 'Thu theo tháng', headers: ['Tháng', 'Đã nộp trong kỳ (₫)', 'Ghi nhận'], rows: Object.keys(map).sort().map(k => map[k]), token: pw, source: C.src + '-monthly', sentAt: new Date().toISOString() });
    }
  }

  const apiT = tC - tA;
  const speed = apiT < 2500 ? '🟢 Nhanh' : apiT < 6000 ? '🟡 Bình thường' : '🔴 Chậm';
  const detail = '⏱ Tổng ' + f1(tF - T0) + ' · Kết nối ' + speed + ' · API ' + f1(apiT) + ' (chờ ' + f1(tB - tA) + ', tải ' + Math.max(1, Math.round(R.raw.length / 1024)) + ' KB) · Gửi Sheet ' + (tE != null ? f1(tE - tD) : '…') + ' · Xác nhận ' + f1(tF - tD);
  if (ok) return { ok: true, count: list.length, tab: T, msg: 'Đã đồng bộ ' + list.length + ' đơn vị tháng ' + SM + '/' + cy + ' lên Google Sheet (' + T + ').', detail };
  return {
    ok: false, count: list.length, tab: T,
    msg: 'Đã gửi ' + list.length + ' đơn vị nhưng chưa thấy Google Sheet cập nhật. Kiểm tra Mã chung rồi bấm lại.',
    detail: '🔎 Đọc lại Google Sheet: ' + nRead + ' lần được, ' + nFail + ' lần lỗi/quá 20s' + (nRead ? ' (nhanh nhất ' + f1(tMin) + '; ' + last + ')' : '') + (tE != null ? '. Script đã phản hồi sau ' + f1(tE - tD) : '. Script chưa phản hồi') + '\n' + detail
  };
}

/* ───────────────────────── Đồng bộ cấp Tỉnh (dpBookmarklet) ───────────────────────── */
export async function syncTinh(xa, ctx) {
  const API = xa.arg;
  needAuth(ctx);
  const pw = ctx.pwTinh || ctx.pw;
  if (!pw) throw new SyncError('Chưa nhập mật khẩu đồng bộ ở mục 2.', 'PW');
  const cy = ctx.y, SM = ctx.m, T0 = performance.now(), mm = p2(SM);
  if (navigator.onLine === false) throw new SyncError('Máy đang mất kết nối mạng. Kiểm tra mạng rồi bấm lại.', 'NET');
  ctx.say('Đang lấy số liệu tháng ' + SM + '/' + cy + ' từ API…', 'run');
  try { fetch(API + '?action=status&warm=' + Date.now(), { mode: 'no-cors' }).catch(() => {}); } catch (e) { /* bỏ qua */ }
  const tA = performance.now();
  const kS = '01/' + mm + '/' + cy, kE = new Date(cy, SM, 0).getDate() + '/' + mm + '/' + cy;
  // Sổ S02 chạy song song với API chính
  const s02P = gwPost(ctx, PATH_S02, { page: 1, size: 500, donViId: null, fromDate: kS, toDate: kE }).then(r2 => { if (!r2.ok) throw new Error('HTTP ' + r2.status); return r2.json(); });
  s02P.catch(() => {});
  const R = await getL(ctx, 2122408, kS, kE, 500);
  const tB = performance.now();
  const list = R.list;
  if (!list.length) throw new SyncError('API không trả đơn vị nào.');
  const rows = list.map((x, i) => [i + 1, x.tenDonVi, num(x.tongSoLuongDangVien), num(x.soLuongDangVienChinhThuc), num(x.soLuongDangVienTamThoi), num(x.soLuongChuyenTamThoi), num(x.soLuongDangVienMienGiam), num(x.tongSoHoSoChuaDuyet), num(x.tongSoHoSoDaDuyetChuaNop), num(x.tongSoHoSoDaDuyetDaNop), num(x.soLuongHoSoChuaKhaiBao), num(x.tongSoTienDaKhaiBao), num(x.tongSoTienDaNop), num(x.mucDoThucHien)]);

  // Sổ S02: phải nộp cấp trên, đã nộp cấp trên, còn nợ cuối kỳ → 3 cột O:Q. Lỗi S02 không làm hỏng đồng bộ chính.
  let s02Msg = '';
  try {
    ctx.say('Đang lấy sổ S02 (nộp cấp trên)…', 'run');
    const j2 = await s02P, l2 = j2.data || [];
    const nm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const kr = o => num(o && o.kyBaoCao), mp = new Map(l2.map(x => [nm(x.tenToChucDang), x]));
    let hit = 0;
    rows.forEach(r => { const x = mp.get(nm(r[1])); if (x) { hit++; r.push(kr(x.dangPhiPhaiNopCapTren), kr(x.dangPhiDaNopCapTren), num(x.dangPhiChuaNopCapTrenCuoiKyBaoCao)); } else r.push(0, 0, 0); });
    s02Msg = 'Sổ S02: khớp ' + hit + '/' + rows.length + ' đơn vị';
  } catch (e2) {
    check(ctx);
    rows.forEach(r => { r.length = 14; });
    s02Msg = '⚠ Chưa lấy được sổ S02 (' + (e2 && e2.message || e2) + ') — các cột nộp cấp trên giữ nguyên.';
  }
  const sum = k => rows.reduce((a, r) => a + r[k], 0);
  const declared = sum(11), paid = sum(12);
  const syncId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const d = new Date();
  const payload = {
    token: pw, syncId,
    fileName: 'API gqtthc kỳ T' + SM + '/' + cy + ' · ' + p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()),
    month: cy + '-' + mm, source: 'api-month',
    totals: { units: rows.length, members: sum(2), paidProfiles: sum(9), declared, paid, rate: declared > 0 ? Math.round(paid / declared * 10000) / 100 : 0 },
    rows
  };
  ctx.say('Đang gửi ' + rows.length + ' đơn vị lên Google Sheet…', 'run');
  const tD = performance.now();
  await fetch(API, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ payload: JSON.stringify(payload) }) });
  const tE = performance.now();
  ctx.say('Đang xác nhận kết quả trên Google Sheet…', 'run');
  let ok = null;
  for (let k = 0; k < 12 && !ok; k++) {
    check(ctx);
    ok = await jsonp(API + '?action=status', 9000);
    if (ok && ok.lastError && ok.lastError.syncId === syncId) throw new SyncError(ok.lastError.error);
    if (!(ok && ok.last && ok.last.syncId === syncId)) { ok = null; await sleep(1000); }
  }
  const tF = performance.now();
  const detail = s02Msg + '\n⏱ Tổng ' + f1(tF - T0) + ' · API ' + f1(tB - tA) + ' · Gửi Sheet ' + f1(tE - tD) + ' · Xác nhận ' + f1(tF - tE);
  if (ok) return { ok: true, count: ok.last.rowCount || rows.length, tab: ok.last.tab || '', msg: 'Đã đồng bộ ' + (ok.last.rowCount || rows.length) + ' đơn vị kỳ tháng ' + SM + '/' + cy + (ok.last.tab ? ' (tab ' + ok.last.tab + ')' : '') + '.', detail };
  return { ok: false, count: rows.length, msg: 'Đã gửi ' + rows.length + ' đơn vị. Chưa xác nhận được kết quả — hãy mở trang Đảng phí để xem “Lần đồng bộ gần nhất”.', detail };
}
