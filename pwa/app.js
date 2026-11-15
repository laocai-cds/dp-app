import { syncXa, syncTinh, SyncError, GATEWAY } from './engine.js';

const $ = s => document.querySelector(s);
const store = {
  get(k, d = '') { try { const v = localStorage.getItem('dp.' + k); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('dp.' + k, v); } catch (e) { /* bỏ qua */ } },
  del(k) { try { localStorage.removeItem('dp.' + k); } catch (e) { /* bỏ qua */ } }
};
const p2 = n => String(n).padStart(2, '0');
const hm = (d = new Date()) => p2(d.getHours()) + ':' + p2(d.getMinutes());

let cfg = null;      // config.json
let busy = false;
let abort = null;
let autoTimer = null;
let wake = null;

/* ───────────── thông báo, nhật ký ───────────── */
let toastT = 0;
function toast(m) {
  const t = $('#toast'); t.textContent = m; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3500);
}
const logLines = (() => { try { return JSON.parse(store.get('log', '[]')); } catch (e) { return []; } })();
function log(m) {
  logLines.push('[' + new Date().toLocaleString('vi-VN', { hour12: false }) + '] ' + m);
  while (logLines.length > 120) logLines.shift();
  store.set('log', JSON.stringify(logLines));
  renderLog();
}
function renderLog() {
  const el = $('#log');
  el.textContent = logLines.length ? logLines.join('\n') : 'Chưa có hoạt động.';
  el.scrollTop = el.scrollHeight;
}

/* thanh trạng thái dưới màn hình, có đồng hồ giây */
let barT = null, barStart = 0, barMsg = '', barLv = 'run', barHide = 0;
function say(m, lv = 'run') {
  barMsg = m; barLv = lv;
  clearTimeout(barHide);
  const bar = $('#bar');
  bar.hidden = false;
  bar.className = 'bar' + (lv === 'ok' ? ' ok' : lv === 'bad' ? ' bad' : '');
  if (lv === 'run') {
    if (!barT) { barStart = performance.now(); barT = setInterval(paintBar, 200); }
  } else if (barT) { clearInterval(barT); barT = null; }
  paintBar();
  if (lv !== 'run') barHide = setTimeout(() => { bar.hidden = true; }, lv === 'ok' ? 20000 : 30000);
}
function paintBar() {
  $('#barTxt').textContent = barMsg + (barT ? '   ⏱ ' + ((performance.now() - barStart) / 1000).toFixed(1).replace('.', ',') + 's' : '');
}

/* ───────────── token ───────────── */
function cleanToken(t) {
  return String(t || '').trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '').trim();
}
function jwtExp(t) {
  try {
    const b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const j = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b), c => c.charCodeAt(0))));
    return j.exp ? j.exp * 1000 : 0;
  } catch (e) { return 0; }
}
function paintToken() {
  const t = cleanToken(store.get('token'));
  const chip = $('#tkChip');
  if (!t) { chip.textContent = 'chưa có'; chip.className = 'chip bad'; return; }
  const exp = jwtExp(t);
  if (!exp) { chip.textContent = 'đã lưu'; chip.className = 'chip'; return; }
  const min = Math.floor((exp - Date.now()) / 60000);
  if (min < 0) { chip.textContent = 'đã hết hạn'; chip.className = 'chip bad'; }
  else if (min <= 5) { chip.textContent = 'còn ' + min + ' phút'; chip.className = 'chip warn'; }
  else { chip.textContent = 'còn ' + min + ' phút'; chip.className = 'chip ok'; }
}
function setToken(t) {
  t = cleanToken(t);
  if (t) store.set('token', t); else store.del('token');
  $('#token').value = t;
  paintToken();
}
function takeTokenFromHash() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  const t = h.get('t');
  if (!t) return;
  history.replaceState(null, '', location.pathname + location.search); // xóa token khỏi thanh địa chỉ
  setToken(t);
  toast('Đã nhận token từ gqtthc');
  log('Đã nhận token từ trang gqtthc.');
}
function bookmarkletCode() {
  const url = location.origin + location.pathname;
  const js = "(function(){if(!/gqtthc\\.dcs\\.vn$/.test(location.hostname)){alert('Hãy bấm khi đang mở trang gqtthc.dcs.vn (đã đăng nhập).');return}" +
    "var t=localStorage.getItem('token');if(!t){alert('Chưa đăng nhập gqtthc.dcs.vn.');return}" +
    "var u=" + JSON.stringify(url) + "+'#t='+encodeURIComponent(t);if(!window.open(u,'_blank'))location.href=u})()";
  return 'javascript:' + encodeURIComponent(js);
}

/* ───────────── danh sách xã ───────────── */
function onlySet() {
  const q = new URLSearchParams(location.search).get('only') || store.get('only');
  return q ? new Set(q.split(/[,\s]+/).filter(Boolean)) : null;
}
function visibleXa() {
  const o = onlySet();
  return cfg.xa.filter(x => !o || o.has(x.id));
}
function selected() {
  try { const s = JSON.parse(store.get('sel', 'null')); if (Array.isArray(s)) return new Set(s); } catch (e) { /* mặc định */ }
  return new Set(visibleXa().map(x => x.id));
}
function lastOf(id) { try { return JSON.parse(store.get('last.' + id, 'null')); } catch (e) { return null; } }
function renderList() {
  const sel = selected();
  const ul = $('#xaList'); ul.textContent = '';
  for (const x of visibleXa()) {
    const li = document.createElement('li');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = x.id; cb.checked = sel.has(x.id); cb.id = 'x_' + x.id;
    cb.setAttribute('aria-label', x.label);
    const nm = document.createElement('div'); nm.className = 'nm';
    const b = document.createElement('b'); b.textContent = x.label;
    const st = document.createElement('span'); st.className = 'st'; st.id = 'st_' + x.id;
    nm.append(b, st);
    const go = document.createElement('button'); go.className = 'btn'; go.textContent = 'ĐP'; go.title = 'Lấy riêng ' + x.label; go.dataset.id = x.id;
    li.append(cb, nm, go); ul.append(li);
    paintStatus(x.id);
  }
  syncAll();
}
function paintStatus(id) {
  const el = $('#st_' + id); if (!el) return;
  const l = lastOf(id);
  if (!l) { el.textContent = 'Chưa lấy lần nào'; el.className = 'st'; return; }
  el.textContent = (l.ok ? '✅ ' : '✕ ') + l.t + ' · ' + l.msg;
  el.className = 'st ' + (l.ok ? 'ok' : 'bad');
}
function selectedIds() {
  return [...document.querySelectorAll('#xaList input[type=checkbox]:checked')].map(c => c.value);
}
function syncAll() {
  const boxes = [...document.querySelectorAll('#xaList input[type=checkbox]')];
  const n = boxes.filter(b => b.checked).length;
  $('#all').checked = n === boxes.length && n > 0;
  $('#all').indeterminate = n > 0 && n < boxes.length;
  $('#selCount').textContent = n + '/' + boxes.length + ' đã chọn';
  store.set('sel', JSON.stringify(selectedIds()));
}

/* ───────────── kỳ ───────────── */
function renderPeriod() {
  const sel = $('#period'), now = new Date(); sel.textContent = '';
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1), y = d.getFullYear(), m = d.getMonth() + 1;
    const o = document.createElement('option'); o.value = y + '-' + m;
    o.textContent = 'Tháng ' + m + '/' + y + (i ? '' : ' (hiện tại)'); sel.append(o);
  }
}

/* ───────────── chạy đồng bộ ───────────── */
function ctxFor(y, m) {
  const proxy = store.get('proxy').trim().replace(/\/+$/, '');
  return {
    token: cleanToken(store.get('token')), pw: store.get('pw').trim(), pwTinh: store.get('pwTinh').trim(),
    base: proxy || GATEWAY, chung: cfg.chung, y, m, say, signal: abort.signal,
    store: { get: k => store.get(k), set: (k, v) => store.set(k, v) }
  };
}
function setBusy(b) {
  busy = b;
  $('#btnRun').disabled = b; $('#btnRun').hidden = b;
  $('#btnStop').hidden = !b;
  document.querySelectorAll('#xaList .btn').forEach(x => { x.disabled = b; });
}
async function runIds(ids, auto) {
  if (busy) return;
  if (!ids.length) { toast('Chưa chọn xã nào'); return; }
  setBusy(true); abort = new AbortController();
  const now = new Date();
  let y, m;
  if (auto) { y = now.getFullYear(); m = now.getMonth() + 1; }
  else { [y, m] = $('#period').value.split('-').map(Number); }
  const ctx = ctxFor(y, m);
  const exp = jwtExp(ctx.token);
  if (exp && exp < Date.now()) { log('Token đã hết hạn — thử chạy, nếu máy chủ từ chối hãy lấy token mới.'); }
  let okN = 0, badN = 0, stop = false;
  log((auto ? 'Tự động: ' : '') + 'bắt đầu ' + ids.length + ' đơn vị, kỳ ' + m + '/' + y + '.');
  for (const id of ids) {
    const xa = cfg.xa.find(x => x.id === id); if (!xa) continue;
    ctx.say = (msg, lv) => say(xa.label + ': ' + msg, lv);
    let res;
    try {
      res = xa.fn === 'dpBookmarklet' ? await syncTinh(xa, ctx) : await syncXa(xa, ctx);
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      res = { ok: false, msg };
      if (e instanceof SyncError && (e.code === 'AUTH' || e.code === 'PW' || e.code === 'ABORT')) stop = true;
      if (e instanceof SyncError && e.code === 'AUTH') { paintToken(); }
    }
    store.set('last.' + id, JSON.stringify({ ok: res.ok, t: hm(), msg: String(res.msg).split('\n')[0].slice(0, 90) }));
    paintStatus(id);
    log((res.ok ? '✅ ' : '✕ ') + xa.label + ': ' + res.msg + (res.detail ? '\n    ' + res.detail.replace(/\n/g, '\n    ') : ''));
    res.ok ? okN++ : badN++;
    if (stop) break;
  }
  setBusy(false);
  const summary = badN ? '✕ Xong: ' + okN + ' thành công, ' + badN + ' lỗi — xem Nhật ký.' : '✅ Hoàn thành ' + okN + ' đơn vị.';
  say(summary, badN ? 'bad' : 'ok');
  if (stop && autoTimer) { setAuto(0); log('Đã tắt tự động vì cần lấy lại token/mã.'); toast('Đã tắt tự động — cần lấy lại token'); }
  return { stopped: stop };
}

/* ───────────── tự động lặp + giữ màn hình sáng ───────────── */
async function holdWake() {
  try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* bỏ qua */ }
}
function dropWake() { try { if (wake) wake.release(); } catch (e) { /* bỏ qua */ } wake = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && autoTimer) holdWake(); });
function setAuto(min) {
  clearInterval(autoTimer); autoTimer = null; dropWake();
  const b = $('#autoBadge');
  if (min > 0) {
    autoTimer = setInterval(() => { if (!busy) runIds(selectedIds(), true).then(() => paintBadge()); }, min * 60000);
    holdWake();
    b.dataset.min = min; paintBadge();
  } else { b.hidden = true; $('#auto').value = '0'; }
}
function paintBadge() {
  const b = $('#autoBadge'); if (!autoTimer) { b.hidden = true; return; }
  b.hidden = false;
  b.textContent = '⏱ Tự động mỗi ' + b.dataset.min + ' phút · lần cuối ' + hm() + ' — giữ app mở, thoát app sẽ dừng';
}

/* ───────────── khởi tạo ───────────── */
async function main() {
  cfg = await (await fetch('config.json', { cache: 'no-cache' })).json();
  $('#token').value = cleanToken(store.get('token'));
  $('#pw').value = store.get('pw'); $('#pwTinh').value = store.get('pwTinh');
  $('#proxy').value = store.get('proxy'); $('#only').value = store.get('only');
  $('#bmLink').href = bookmarkletCode();
  renderPeriod(); renderList(); renderLog(); takeTokenFromHash(); paintToken();
  window.addEventListener('hashchange', takeTokenFromHash);
  setInterval(paintToken, 30000);

  $('#token').addEventListener('change', e => setToken(e.target.value));
  $('#btnPaste').addEventListener('click', async () => {
    try { const t = await navigator.clipboard.readText(); if (!cleanToken(t)) { toast('Bộ nhớ tạm đang trống'); return; } setToken(t); toast('Đã dán token'); }
    catch (e) { toast('Không đọc được bộ nhớ tạm — hãy dán thủ công vào ô'); $('#token').focus(); }
  });
  $('#btnTokOpen').addEventListener('click', () => window.open('https://gqtthc.dcs.vn/', '_blank', 'noopener'));
  $('#bmLink').addEventListener('click', e => { e.preventDefault(); toast('Hãy kéo nút này lên thanh dấu trang, đừng bấm tại đây'); });
  $('#btnBmCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(decodeURIComponent(bookmarkletCode())); toast('Đã sao chép mã dấu trang'); } catch (e) { toast('Không sao chép được'); }
  });
  $('#pw').addEventListener('change', e => store.set('pw', e.target.value.trim()));
  $('#pwTinh').addEventListener('change', e => store.set('pwTinh', e.target.value.trim()));
  $('#proxy').addEventListener('change', e => store.set('proxy', e.target.value.trim()));
  $('#only').addEventListener('change', e => { store.set('only', e.target.value.trim()); store.del('sel'); renderList(); });
  $('#btnPwShow').addEventListener('click', () => { const p = $('#pw'), q = $('#pwTinh'); const t = p.type === 'password' ? 'text' : 'password'; p.type = t; q.type = t; });
  $('#all').addEventListener('change', e => { document.querySelectorAll('#xaList input[type=checkbox]').forEach(c => { c.checked = e.target.checked; }); syncAll(); });
  $('#xaList').addEventListener('change', syncAll);
  $('#xaList').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) go([b.dataset.id]); });
  $('#btnRun').addEventListener('click', () => go(selectedIds()));
  $('#btnStop').addEventListener('click', () => { if (abort) abort.abort(); });
  $('#btnClear').addEventListener('click', () => { logLines.length = 0; store.del('log'); renderLog(); });

  function go(ids) {
    // lưu các ô nhập phòng khi chưa kịp mất tiêu điểm
    setToken($('#token').value); store.set('pw', $('#pw').value.trim()); store.set('pwTinh', $('#pwTinh').value.trim()); store.set('proxy', $('#proxy').value.trim());
    const min = +$('#auto').value || 0;
    runIds(ids, false).then(r => { if (!r) return; if (r.stopped || min === 0) setAuto(0); else setAuto(min); });
  }

  /* cài đặt PWA */
  let dip = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); dip = e; $('#btnInstall').hidden = false; });
  $('#btnInstall').addEventListener('click', async () => { if (!dip) return; dip.prompt(); await dip.userChoice; dip = null; $('#btnInstall').hidden = true; });
  window.addEventListener('appinstalled', () => { $('#btnInstall').hidden = true; toast('Đã cài đặt'); });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone;
  if (ios) $('#iosHint').hidden = false;

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
main().catch(e => { $('#log').textContent = 'Lỗi khởi động: ' + (e && e.message || e); });
