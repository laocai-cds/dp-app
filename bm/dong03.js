function run03Bookmarklet(C){'use strict';
  /* Nút "03" – đồng bộ số liệu 03 thủ tục (chuyển SH chính thức, tạm thời, nhận xét nơi cư trú) của 103 đơn vị từ gqtthc.dcs.vn
     vào Google Sheet "Theo dõi 03 thủ tục" qua Apps Script dự án "03 thủ tục". Số mới ghi đè số cũ. Chạy trên trang gqtthc.dcs.vn. */
  const K_03 = 'tthc03.code';
  const API03 = 'https://script.google.com/macros/s/AKfycbym3FHqtE20kg8F3SCuc6LizXSwGhSFT-KBY90c58BuOuRigFbOdyruPkTx4uBscZ-ibw/exec';
  const G3 = 'https://gateway-gqtthc.dcs.vn/report/api/v1/thong-ke-ho-so/theo-co-quan';
  const NAMES = { 10001: 'Nhận xét nơi cư trú', 10002: 'Chuyển SH chính thức', 10003: 'Chuyển SH tạm thời' };
  const num = x => Number(x) || 0, p2 = n => String(n).padStart(2, '0');
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;z-index:2147483647;top:14px;right:14px;left:14px;max-width:380px;margin-left:auto;padding:12px 16px;border-radius:12px;background:#12315f;color:#fff;font:600 14px/1.45 system-ui,sans-serif;white-space:pre-line;box-shadow:0 8px 28px rgba(0,0,0,.35)';
  const T0 = performance.now(); let tick = null, msg = '', bg = '#12315f';
  const f1 = ms => (ms / 1000).toFixed(0) + 's';
  const paint = () => { box.textContent = msg + (tick ? '   ⏱ ' + f1(performance.now() - T0) : ''); box.style.background = bg; if (!box.parentNode) document.body.appendChild(box); };
  const say = (m, kind) => { if (kind === 'bad') m = '✕ ' + String(m).replace(/^(✕|❌)\s*/, ''); msg = m; bg = kind === 'bad' ? '#a50d26' : kind === 'ok' ? '#0f8a3c' : '#12315f'; if (kind) { if (tick) { clearInterval(tick); tick = null; } } else if (!tick) tick = setInterval(paint, 500); paint(); };
  (async function () {
    try {
      /* Luôn hỏi mã ngay khi bấm (không lưu), nhập xong chạy một mạch đến khi hoàn thành. */
      let saved = ''; try { saved = localStorage.getItem(K_03) || ''; } catch (e) {}
      const code = String(saved || '').trim();
      if (!code) { say('Đã hủy: chưa nhập mã truy cập.', 'bad'); setTimeout(() => box.remove(), 6000); return; }
      const tk = localStorage.getItem('token');
      if (!tk) { say('Chưa đăng nhập gqtthc.dcs.vn.', 'bad'); setTimeout(() => box.remove(), 8000); return; }
      /* Lấy số liệu THEO TỪNG THÁNG (từ tháng bắt đầu có hồ sơ). Tháng đã qua nhớ trong trình duyệt 7 ngày; tổng lũy kế = cộng các tháng.
         Nhận xét nơi cư trú: mỗi đơn vị cộng cả đơn vị con (nhiều cấp); đơn vị không có con dùng luôn số lần hỏi đầu. */
      const now = new Date(), y = now.getFullYear(), cm = now.getMonth() + 1, first = y === 2026 ? 10 : 1;
      let months = []; for (let m = first; m <= cm; m++) months.push(p2(m) + '/' + y);
      let per = months[0], den = months[months.length - 1]; const curMo = p2(cm) + '/' + y;
      /* Chọn tháng cần LẤY MỚI (các tháng còn lại dùng số đã nhớ trong trình duyệt, chưa có thì tự lấy). Ví dụ: 11 · 10-11 · 10,11 · * (tất cả). Mặc định: tháng hiện tại. */
      const lastSel = (() => { try { return localStorage.getItem('tthc03.sel') || ''; } catch (e) { return ''; } })();
      const ans = (() => { const mm = /^(\d{4})-(\d{1,2})$/.exec(String(window.__dpMonth || '')); return mm && +mm[1] === y && +mm[2] >= first && +mm[2] <= cm ? String(+mm[2]) : String(cm); })();
            const sel = new Set(), txt = String(ans).trim() || String(cm);
      if (txt === '*') months.forEach(m => sel.add(m));
      else txt.split(/[,;\s]+/).filter(Boolean).forEach(part => { const mm = /^(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?$/.exec(part); if (!mm) return; const a = +mm[1], b = mm[2] ? +mm[2] : a; for (let m = Math.min(a, b); m <= Math.max(a, b); m++) if (m >= first && m <= cm) sel.add(p2(m) + '/' + y); });
      if (!sel.size) { say('Không có tháng hợp lệ (' + first + '–' + cm + ').', 'bad'); setTimeout(() => box.remove(), 6000); return; }
      /* CHẾ ĐỘ CHỈ-THÁNG: chọn tháng đã qua (không gồm tháng hiện tại) thì chỉ lấy đúng tháng đó và chỉ ghi vào tab tháng ("03 THANG mm-yyyy"), không đụng tab cộng dồn → nhanh hơn nhiều. Cần Apps Script Tthc03.gs bản có monthsOnly. */
      const monthsOnly = !sel.has(curMo);
      if (monthsOnly) { months = months.filter(m => sel.has(m)); per = months[0]; den = months[months.length - 1]; }
      const dropped = {};
      const st = { 10001: '⏳', 10002: '⏳', 10003: '⏳' };
      const show = () => say('Đang lấy số liệu 03 thủ tục · làm mới tháng ' + [...sel].map(m => +m.slice(0, 2)).join(', ') + modeTxt + '\n' + [10002, 10003, 10001].map(id => { const q = String(kShows[id] && /^⏳/.test(st[id]) ? kShows[id]() : st[id]).split('\n'); return q[0] + ' ' + NAMES[id] + (q.length > 1 ? '\n' + q.slice(1).join('\n') : ''); }).join('\n'));
      const retry = async (fn, n) => { let le; for (let a = 0; a < n; a++) { try { return await fn(); } catch (e) { le = e; if (a < n - 1) await new Promise(r => setTimeout(r, 800 + 1500 * a * a)); } } throw le; };
      const cget = k => { try { const c = JSON.parse(localStorage.getItem(k) || 'null'); if (c && c.t && Date.now() - c.t < 6048e5) return c.d; } catch (e) {} return null; };
      const cset = (k, d) => { try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} };
      let gAct = 0; const gQ = []; const gSlot = () => new Promise(res => { const go = () => { if (gAct < 14) { gAct++; res(); } else gQ.push(go); }; go(); }); const gFree = () => { gAct--; const n = gQ.shift(); if (n) n(); };
      const post = (id, uid, mo) => gSlot().then(() => fetch(G3, { method: 'POST', headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ dvcId: id, coQuanId: uid, page: 0, size: 300, tuThang: mo, denThang: mo }) })
        .then(rr => { if (!rr.ok) throw new Error('HTTP ' + rr.status); return rr.json(); }).then(jj => (jj.data && jj.data.data) || [])).finally(gFree);
      const topRows = (id, mo) => post(id, 2122408, mo).then(list => { const seen = {}; const rows = list.filter(x => { const n = String(x.coQuanTen || '').trim(); if (Number(x.coQuanId) === 2122408 || !/^đảng bộ\s/i.test(n) || seen[n.toLowerCase()]) { dropped[n || '(trống)'] = 1; return false; } seen[n.toLowerCase()] = 1; return true; }).map(x => [x.coQuanTen, num(x.dangXuLy), num(x.daTuChoi), num(x.daXuLyXong), x.coQuanId, x.coCapCon === false ? 0 : 1]); if (rows.length < 50) throw new Error('trả thiếu đơn vị (' + rows.length + ') tháng ' + mo); return rows; });
      const monthTop = async (id, mo) => { const k = 'tthc03.m.' + id + '.' + mo; if (mo !== curMo && !sel.has(mo)) { const c = cget(k); if (c) return c; } let rows;
        try { rows = await retry(() => topRows(id, mo), 7); }
        catch (e) { if (id !== 10001) throw e;
          /* gqtthc không trả nổi truy vấn gốc của nhận xét: lấy danh sách đơn vị từ chính thức rồi hỏi từng đơn vị một */
          const base = await retry(() => topRows(10002, mo), 5); rows = base.map(r => [r[0], 0, 0, 0, r[4], 1]); fallbackMo[mo] = 1; }
        if (mo !== curMo && !fallbackMo[mo]) cset(k, rows); return rows; };
      const kidFail = {}, lastErr = {}, kShows = {}; const fallbackMo = {};
      const walk = async (uid, seen, acc, depth, mo, pid) => {
        const rows = await retry(() => post(pid, uid, mo), 5);
        rows.forEach(r => { if (seen[r.coQuanId]) return; seen[r.coQuanId] = 1; acc[0] += num(r.dangXuLy); acc[1] += num(r.daTuChoi); acc[2] += num(r.daXuLyXong); });
        if (depth < 5) for (const r of rows) if (r.coCapCon && Number(r.coQuanId) !== Number(uid) && !seen['x' + r.coQuanId]) { seen['x' + r.coQuanId] = 1; await walk(r.coQuanId, seen, acc, depth + 1, mo, pid); }
      };
      /* ĐƯỜNG NHANH: API theo-tthc trả luôn số của cả 3 thủ tục (đã cộng đơn vị con nếu gqtthc làm vậy) trong MỘT lần gọi cho mỗi đơn vị.
         Chỉ dùng khi kiểm tra thấy khớp 100% với cách cộng từng đơn vị con; không khớp / lỗi thì tự dùng cách cũ. */
      const G3T = 'https://gateway-gqtthc.dcs.vn/report/api/v1/thong-ke-ho-so/theo-tthc';
      let FAST = false, modeTxt = '';
      const postT = (uid, mo) => gSlot().then(() => fetch(G3T, { method: 'POST', headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ tuThang: mo, denThang: mo, coQuanId: uid, page: 0, size: 1000 }) })
        .then(rr => { if (!rr.ok) throw new Error('HTTP ' + rr.status); return rr.json(); }).then(jj => (jj.data && jj.data.data) || [])).finally(gFree);
      const fm = {};
      const fastRows = (uid, mo) => { const k = uid + '|' + mo; if (!fm[k]) { fm[k] = retry(() => postT(uid, mo), 4).then(list => { const o = {}; list.forEach(x => { const d = Number(x.dvcId); if (d === 10001 || d === 10002 || d === 10003) o[d] = [num(x.dangXuLy), num(x.daTuChoi), num(x.daXuLyXong)]; }); return o; }); fm[k].catch(() => { delete fm[k]; }); } return fm[k]; };
      const fastAgg = async (uid, mo, pid, acc) => { const o = await fastRows(uid, mo); const v = o[pid] || [0, 0, 0]; acc[0] = v[0]; acc[1] = v[1]; acc[2] = v[2]; };
      const aggOf = (uid, mo, pid, acc) => FAST ? fastAgg(uid, mo, pid, acc).catch(() => walk(uid, {}, acc, 0, mo, pid)) : walk(uid, {}, acc, 0, mo, pid);
      let fastWhy = '';
      const detectFast = async mo => { try {
        say('Đang kiểm tra đường lấy số nhanh (1 lần gọi/đơn vị)…');
        const base = await retry(() => topRows(10002, mo), 5); const samp = base.filter(r => r[5] !== 0).slice(0, 6); if (samp.length < 3) { fastWhy = 'có ít hơn 3 đơn vị có đơn vị con để thử'; return false; } let informative = 0;
        let bad = '';
        await Promise.all(samp.map(async r => { const t = await fastRows(r[4], mo); const got = Object.keys(t).join('/') || 'không có thủ tục nào';
          for (const pid of [10002, 10003, 10001]) { if (bad) return; const acc = [0, 0, 0]; await walk(r[4], {}, acc, 0, mo, pid); const v = t[pid] || [0, 0, 0];
            if (acc[0] !== v[0] || acc[1] !== v[1] || acc[2] !== v[2]) { bad = 'số theo-tthc lệch: ' + String(r[0]).replace(/^đảng bộ\s*/i, '') + ' · ' + NAMES[pid] + ' · theo-tthc ' + v.join('/') + ' ≠ cộng con ' + acc.join('/') + ' (đơn vị riêng ' + [r[1], r[2], r[3]].join('/') + ') · có: ' + got; try { console.log('[03] kiểm tra đường nhanh', { donVi: r[0], thuTuc: pid, theoTthc: v, congDonViCon: acc, rieng: [r[1], r[2], r[3]], theoTthcTraVe: t }); } catch (e) {} return; }
            if (pid === 10002 && (acc[0] !== r[1] || acc[1] !== r[2] || acc[2] !== r[3])) informative++; } }));
        if (bad) { fastWhy = bad; return false; }
        if (!informative) { fastWhy = 'chưa chứng minh được theo-tthc có cộng đơn vị con (6 đơn vị thử đều bằng số riêng)'; return false; }
        return true;
      } catch (e) { fastWhy = 'lỗi khi thử: ' + String(e && e.message || e).slice(0, 80); return false; } };
      const kidsMonth = async (rows, mo, prog, pid) => {
        const k = pid === 10001 ? 'tthc03.k.' + mo : 'tthc03.k.' + pid + '.' + mo, memo = mo !== curMo && !sel.has(mo) ? (cget(k) || {}) : {}, added = {}, out = rows.map(r => r.slice()), failed = []; let next = 0;
        const worker = async () => { while (next < out.length) { const r = out[next++];
          if (r[5] !== 0) {
            if (memo[r[4]]) { r[1] = memo[r[4]][0]; r[2] = memo[r[4]][1]; r[3] = memo[r[4]][2]; }
            else try { const acc = [0, 0, 0]; await aggOf(r[4], mo, pid, acc); r[1] = acc[0]; r[2] = acc[1]; r[3] = acc[2]; added[r[4]] = acc; } catch (e) { failed.push(r); lastErr[pid] = String(e && e.message || e).slice(0, 80); }
          } prog(r[0]); } };
        await Promise.all(Array.from({ length: 10 }, worker));
        for (let pass = 0; pass < 2 && failed.length; pass++) { const again = failed.splice(0); let j = 0; await Promise.all(Array.from({ length: 3 }, async () => { while (j < again.length) { const r = again[j++]; try { const acc = [0, 0, 0]; await aggOf(r[4], mo, pid, acc); r[1] = acc[0]; r[2] = acc[1]; r[3] = acc[2]; added[r[4]] = acc; } catch (e) { failed.push(r); lastErr[pid] = String(e && e.message || e).slice(0, 80); } } })); }
        kidFail[pid] = (kidFail[pid] || 0) + failed.length;
        if (mo !== curMo && Object.keys(added).length) cset(k, Object.assign(memo, added));
        return out;
      };
      const errs = {}, byMonth = { 10001: {}, 10002: {}, 10003: {} };
      const get = async id => { try {
        let done = 0; const ks = {}; months.forEach(m => { ks[m] = { d: 0, t: 0, last: '', wait: true }; });
        const kline = () => months.filter(m => ks[m]).map(m => '   · T' + (+m.slice(0, 2)) + ': ' + (ks[m].wait ? 'đang tải danh sách đơn vị…' : ks[m].d >= ks[m].t ? '✓ ' + ks[m].t + '/' + ks[m].t + ' đơn vị' : ks[m].d + '/' + ks[m].t + ' đơn vị' + (ks[m].last ? ' — vừa xong: ' + String(ks[m].last).replace(/^đảng bộ\s*/i, '').slice(0, 40) : ''))).join('\n');
        kShows[id] = () => '⏳ ' + done + '/' + months.length + ' tháng\n' + kline();
        await Promise.all(months.map(async mo => {
          let rows = await monthTop(id, mo);
          { const k = ks[mo]; k.t = rows.length; k.wait = false; rows = await kidsMonth(rows, mo, nm => { k.d++; k.last = nm; st[id] = '⏳ ' + done + '/' + months.length + ' tháng\n' + kline(); }, id); }
          byMonth[id][mo] = rows; done++; st[id] = '⏳ ' + done + '/' + months.length + ' tháng\n' + kline(); show();
        }));
        if ((kidFail[id] || 0) > 25) throw new Error('lấy đơn vị con lỗi ' + kidFail[id] + ' đơn vị (' + lastErr[id] + ')');
        st[id] = '✓'; show(); return true;
      } catch (e2) { st[id] = '✕'; errs[id] = String(e2 && e2.message || e2).slice(0, 160); show(); return null; } };
      { const dm = sel.has(curMo) ? curMo : [...sel][0]; FAST = await detectFast(dm); modeTxt = FAST ? '  ⚡ đường nhanh' : '  (đường chi tiết' + (fastWhy ? ' — ' + fastWhy : '') + ')'; }
      const ti = setInterval(show, 1500);
      show();
      const ids = [10002, 10003, 10001];
      let got; try { got = await Promise.all(ids.map(id => get(id))); } finally { clearInterval(ti); }
      const t03 = {}, m03 = {};
      ids.forEach((id, k) => { if (!got[k]) return;
        const acc = {}; months.forEach(mo => (byMonth[id][mo] || []).forEach(r => { const a = acc[r[4]] || (acc[r[4]] = [r[0], 0, 0, 0]); a[0] = r[0]; a[1] += r[1]; a[2] += r[2]; a[3] += r[3]; }));
        t03[id] = Object.keys(acc).map(u => acc[u]);
        m03[id] = {}; months.filter(mo => sel.has(mo)).forEach(mo => { m03[id][mo] = (byMonth[id][mo] || []).map(r => [r[0], r[1], r[2], r[3]]); });
      });
      say('Đang ghi lên Google Sheet…');
      const sync = 's3' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await fetch(API03, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ payload: JSON.stringify(Object.assign({ action: 'tthc03', accessCode: code, syncId: sync, period: per + ' - ' + den, months03: m03, errors: errs }, monthsOnly ? { monthsOnly: true } : { tthc03: t03 })) }) });
      let ok = null;
      for (let k = 0; k < 45 && !ok; k++) {
        ok = await new Promise(res => {
          const cb = '__dp03' + Date.now() + k, s = document.createElement('script');
          const t = setTimeout(() => { delete window[cb]; s.remove(); res(null); }, 9000);
          window[cb] = v => { clearTimeout(t); delete window[cb]; s.remove(); res(v); };
          s.onerror = () => { clearTimeout(t); res(null); };
          s.src = API03 + '?action=tthc03_status&callback=' + cb + '&_=' + Date.now();
          document.head.appendChild(s);
        });
        if (ok && ok.last03 && ok.last03.syncId === sync && ok.last03.ok === false && /Mã truy cập/.test(ok.last03.error || '')) { try { localStorage.removeItem(K_03); } catch (e) {} throw new Error(ok.last03.error); }
        if (!(ok && ok.last03 && ok.last03.syncId === sync)) { ok = null; await new Promise(r => setTimeout(r, 800)); }
      }
      if (!ok) { say('✓ Đã gửi, chưa xác nhận được. Kiểm tra Sheet "Theo dõi 03 thủ tục" (cần triển khai Apps Script bản mới).', 'bad'); setTimeout(() => box.remove(), 20000); return; }
      try { if (ok.last03.ok !== false) localStorage.setItem(K_03, code); } catch (e) {}
      if (monthsOnly) { const Lm = ok.last03, mt = [...sel].map(m => +m.slice(0, 2)).join(', '); const errT = Object.keys(errs).length ? '\nLỗi lấy số: ' + Object.keys(errs).map(i => NAMES[i] + ' — ' + errs[i]).join('; ') : '';
        if (!Lm.monthsOnly) { say('Apps Script chưa là bản mới (chưa có chế độ chỉ-tháng): cần dán Tthc03.gs mới và Triển khai phiên bản mới.' + (Lm.error ? '\nLý do: ' + String(Lm.error).slice(0, 160) : ''), 'bad'); setTimeout(() => box.remove(), 30000); return; }
        const good = Lm.ok !== false && (Lm.months || 0) > 0 && !errT;
        say((good ? '✅ HOÀN THÀNH tháng ' + mt + ' — đã ghi ' + Lm.months + ' dòng vào tab tháng (tab cộng dồn giữ nguyên)' : 'THẤT BẠI tháng ' + mt + (Lm.error ? ' — ' + String(Lm.error).slice(0, 160) : ' — chưa ghi được dòng nào') + errT) + '\n' + f1(performance.now() - T0) + ' · chi tiết xem tab NHAT KY 03', good ? 'ok' : 'bad'); setTimeout(() => box.remove(), good ? 25000 : 40000); return; }
      const L = ok.last03; Object.keys(L.tabs || {}).forEach(id => { const t = L.tabs[id]; if (t && t.ok === undefined) t.ok = !t.error && (t.hit || 0) > 0; if (t && t.total === undefined) t.total = (t.hit || 0) + (t.miss || 0); }); const line = id => { const t = (L.tabs || {})[id]; return t ? (t.ok ? '✅ ' + NAMES[id] + ': ' + t.hit + '/' + t.total + ' đơn vị' + (t.miss ? ' (không khớp ' + t.miss + ')' : '') : '❌ ' + NAMES[id] + ': ' + t.error) : '❔ ' + NAMES[id] + ': chưa rõ'; };
      const nOk = [10002, 10003, 10001].filter(id => (L.tabs || {})[id] && L.tabs[id].ok).length;
      const errTxt = (L.ok === false && L.error ? '\nLý do: ' + String(L.error).slice(0, 200) : '') + (Object.keys(errs).length ? '\nLỗi lấy số: ' + Object.keys(errs).map(i => NAMES[i] + ' — ' + errs[i]).join('; ') : '');
      const head = nOk === 3 ? '✅ HOÀN THÀNH 03 thủ tục — đã thay số cũ bằng số mới' : nOk === 0 ? '❌ THẤT BẠI — chưa cập nhật thủ tục nào' : '⚠ XONG MỘT PHẦN (' + nOk + '/3 thủ tục) — bấm lại để thử các thủ tục còn lỗi';
      say(head + errTxt + '\n' + (L.ok === false ? '' : [10002, 10003, 10001].map(line).join('\n')) + (Object.keys(dropped).length ? '\nĐã bỏ ' + Object.keys(dropped).length + ' dòng không phải đơn vị (chi bộ, cơ quan tỉnh…)' : '') + '\nLúc ' + L.at + ' · ' + f1(performance.now() - T0) + ' · chi tiết xem tab NHAT KY', nOk === 3 ? 'ok' : 'bad');
      setTimeout(() => box.remove(), nOk === 3 ? 25000 : 40000);
    } catch (e) { say('✕ ' + (e && e.message || e), 'bad'); setTimeout(() => box.remove(), 20000); }
  })();
}
