  function dpBookmarklet(API) {
    let AM = 0;
    /* Nhãn cố định góc trái dưới: cho biết đang tự động lặp, lần cuối lúc nào; bấm để tắt */
    const badge = t => {
      let b = document.getElementById('__dpBmBadge');
      if (!window.__dpBmTimer) { if (b) b.remove(); return; }
      if (!b) {
        b = document.createElement('div'); b.id = '__dpBmBadge'; b.title = 'Bấm để tắt tự động đồng bộ';
        b.style.cssText = 'position:fixed;z-index:2147483646;left:14px;bottom:14px;padding:8px 14px;border-radius:20px;background:#0f8a3c;color:#fff;font:700 13px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer';
        b.onclick = () => { if (confirm('Tắt tự động đồng bộ đảng phí?')) { clearInterval(window.__dpBmTimer); window.__dpBmTimer = 0; window.__dpBmAM = 0; b.remove(); } };
        document.body.appendChild(b);
      }
      b.dataset.am = b.dataset.am || AM;
      b.textContent = '⏱ Tự động mỗi ' + b.dataset.am + ' phút' + (t ? ' · lần cuối ' + t : ' · đang chờ lần đầu');
    };
    const hm = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    const go = async (auto) => {
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;z-index:2147483647;top:14px;right:14px;max-width:360px;padding:12px 16px;border-radius:12px;background:#12315f;color:#fff;font:600 14px/1.45 system-ui,sans-serif;white-space:pre-line;box-shadow:0 8px 28px rgba(0,0,0,.35)';
      const T0 = performance.now();
      let curMsg = '', curBad = false, curOk = false, tick = null, dead = false; const acs = new Set();
      const f1 = ms => (ms / 1000).toFixed(1).replace('.', ',') + 's';
      const paint = () => { if (dead) return; box.textContent = curMsg + (tick ? '   ⏱ ' + f1(performance.now() - T0) : ''); box.style.background = curBad ? '#a50d26' : curOk ? '#0f8a3c' : '#12315f'; if (!box.parentNode) document.body.appendChild(box); };
      /* run=true: đồng hồ giây chạy liên tục; run=false: dừng đồng hồ và hiện kết quả */
      const say = (m, bad, run, good) => { curMsg = m; curBad = !!bad; curOk = !!good; if (run) { if (!tick) tick = setInterval(paint, 100); } else if (tick) { clearInterval(tick); tick = null; } paint(); };
      try {
        if (!/gqtthc\.dcs\.vn$/.test(location.hostname)) { alert('Hãy bấm dấu trang này khi đang mở trang gqtthc.dcs.vn (đã đăng nhập).'); return; }
        const tk = localStorage.getItem('token');
        if (!tk) { if (auto) { say('⏱ Tự động: chưa đăng nhập gqtthc.dcs.vn — hãy đăng nhập lại.', true); setTimeout(() => box.remove(), 15000); } else alert('Chưa đăng nhập gqtthc.dcs.vn.'); return; }
        let pw = localStorage.getItem('dangphi.token') || '';
        if (!pw && auto) return;
        if (!pw) { pw = (prompt('Mật khẩu đồng bộ đảng phí:') || '').trim(); if (!pw) return; }
        /* Chọn kỳ: 12 tháng gần nhất (kèm năm); Apps Script v5 ghi vào tab của tháng đã chọn */
        const now0 = new Date();
        const PK = auto ? (now0.getFullYear() + '-' + (now0.getMonth() + 1)) : await new Promise(res => {
          const ov = document.createElement('div');
          ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font:14px/1.45 system-ui,sans-serif';
          let o = '';
          for (let i = 0; i < 12; i++) { const dd = new Date(now0.getFullYear(), now0.getMonth() - i, 1), y = dd.getFullYear(), m = dd.getMonth() + 1; o += '<option value="' + y + '-' + m + '"' + (i ? '' : ' selected') + '>Tháng ' + m + '/' + y + (i ? '' : ' (hiện tại)') + '</option>'; }
          ov.innerHTML = '<div style="background:#fff;color:#12315f;padding:20px 24px;border-radius:12px;min-width:300px;box-shadow:0 8px 28px rgba(0,0,0,.35)"><div style="font-weight:700;font-size:16px">Lấy số liệu đảng phí</div><div style="font-size:13px;color:#555;margin-top:2px">Đảng bộ tỉnh Lào Cai</div><select style="width:100%;margin:14px 0;padding:8px;font-size:14px;border:1px solid #bbb;border-radius:8px">' + o + '</select><div data-amst style="font-size:13px;font-weight:700;margin:0 0 8px;color:#6b7280"></div><div style="font-size:13px;color:#12315f;margin:0 0 6px">Tự động lặp lại (tháng hiện tại)</div><select data-am style="width:100%;margin:0 0 14px;padding:8px;font-size:14px;border:1px solid #bbb;border-radius:8px"><option value="0" selected>Không — chỉ lấy một lần</option><option value="2">Mỗi 2 phút</option><option value="5">Mỗi 5 phút</option><option value="10">Mỗi 10 phút</option><option value="15">Mỗi 15 phút</option><option value="30">Mỗi 30 phút</option></select><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-x style="padding:7px 14px;border:1px solid #bbb;background:#fff;border-radius:8px;cursor:pointer">Hủy</button><button type="button" data-ok style="padding:7px 16px;border:0;background:#b3261e;color:#fff;font-weight:700;border-radius:8px;cursor:pointer">Lấy dữ liệu</button></div></div>';
          { const st = ov.querySelector('[data-amst]'), am = ov.querySelector('[data-am]'); if (window.__dpBmTimer && window.__dpBmAM) { am.value = String(window.__dpBmAM); st.textContent = '⏱ Đang chạy tự động: ' + window.__dpBmAM + ' phút'; st.style.color = '#0f8a3c'; } else st.textContent = 'Hiện chưa chạy tự động'; }
          const sel = ov.querySelector('select'), done = v => { if (v) AM = +ov.querySelector('[data-am]').value || 0; ov.remove(); document.removeEventListener('keydown', kd, true); res(v); };
          const kd = e => { if (e.key === 'Escape') { e.preventDefault(); done(0); } else if (e.key === 'Enter') { e.preventDefault(); done(sel.value); } };
          ov.querySelector('[data-x]').onclick = () => done(0); ov.querySelector('[data-ok]').onclick = () => done(sel.value);
          ov.onclick = e => { if (e.target === ov) done(0); }; document.addEventListener('keydown', kd, true);
          document.body.appendChild(ov); sel.focus();
        });
        if (!PK) return;
        if (!auto) { if (window.__dpBmTimer) { clearInterval(window.__dpBmTimer); window.__dpBmTimer = 0; } if (AM > 0) window.__dpBmTimer = setInterval(() => { if (window.__dpBmBusy) return; window.__dpBmBusy = true; go(true).finally(() => { window.__dpBmBusy = false; badge(hm()); }); }, AM * 60000); { window.__dpBmAM = window.__dpBmTimer ? AM : 0; const o = document.getElementById('__dpBmBadge'); if (o) o.remove(); badge(); } }
        const cy = +PK.split('-')[0], SM = +PK.split('-')[1];
        if (navigator.onLine === false) throw new Error('Máy đang mất kết nối mạng. Kiểm tra mạng rồi bấm lại.');
        say('Đang lấy số liệu tháng ' + SM + '/' + cy + ' từ API…', false, true);
        /* Làm nóng Apps Script song song trong lúc chờ API gqtthc (tránh khởi động nguội khi gửi) */
        try { fetch(API + '?action=status&warm=' + Date.now(), { mode: 'no-cors' }).catch(() => {}); } catch (e) {}
        const tA = performance.now();
        const d = new Date(), p2 = n => String(n).padStart(2, '0'), mm = p2(SM), yy = cy;
        const body = { kyNopStart: '01/' + mm + '/' + yy, kyNopEnd: new Date(yy, SM, 0).getDate() + '/' + mm + '/' + yy, parentId: 2122408, hasChildren: true, page: 1, size: 500 };
        let r = null;
        for (let at = 1; at <= 3 && !r; at++) { /* chờ tối đa 90 giây mỗi lần; chậm hoặc lỗi máy chủ thì tự thử lại 1 lần */
          if (dead) throw new Error('Đã hủy'); const ac = new AbortController(); acs.add(ac); const to = setTimeout(() => ac.abort(), 90000);
          try {
            if (at > 1) say('API phản hồi chậm, đang thử lại lần ' + at + '…', false, true);
            const rr = await fetch('https://gateway-gqtthc.dcs.vn/report/dashboard/danh-sach-theo-doi-dang-phi', { signal: ac.signal, method: 'POST', headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
            clearTimeout(to);
            if (rr.status >= 500 && at < 3) { say('Máy chủ gqtthc đang bận (lỗi ' + rr.status + '), tự thử lại lần ' + (at + 1) + ' sau 5 giây…', false, true); await new Promise(z => setTimeout(z, 5000)); continue; }
            r = rr;
          } catch (e) { clearTimeout(to); if (at >= 3) throw e; }
        }
        const tB = performance.now();
        if (!r.ok) throw new Error('API trả lỗi ' + r.status + (r.status === 401 ? ' — hãy đăng nhập lại.' : ''));
        const raw = await r.text();
        const tC = performance.now();
        const j = JSON.parse(raw);
        const list = j.data || [];
        if (!list.length) throw new Error('API không trả đơn vị nào.');
        const num = x => Number(x) || 0;
        const rows = list.map((x, i) => [i + 1, x.tenDonVi, num(x.tongSoLuongDangVien), num(x.soLuongDangVienChinhThuc), num(x.soLuongDangVienTamThoi), num(x.soLuongChuyenTamThoi), num(x.soLuongDangVienMienGiam), num(x.tongSoHoSoChuaDuyet), num(x.tongSoHoSoDaDuyetChuaNop), num(x.tongSoHoSoDaDuyetDaNop), num(x.soLuongHoSoChuaKhaiBao), num(x.tongSoTienDaKhaiBao), num(x.tongSoTienDaNop), num(x.mucDoThucHien)]);
        /* Sổ S02 (report/s02/danh-sach): phải nộp cấp trên, đã nộp cấp trên, còn nợ cấp trên cuối kỳ → 3 cột O:Q. Lỗi S02 không làm hỏng đồng bộ chính. */
        let s02Msg = '';
        try {
          say('Đang lấy sổ S02 (nộp cấp trên)…', false, true);
          const r2 = await fetch('https://gateway-gqtthc.dcs.vn/report/s02/danh-sach', { method: 'POST', headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ page: 1, size: 500, donViId: null, fromDate: body.kyNopStart, toDate: body.kyNopEnd }) });
          if (!r2.ok) throw new Error('HTTP ' + r2.status);
          const j2 = await r2.json(), l2 = j2.data || [];
          const nm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          const kr = o => num(o && o.kyBaoCao), mp = new Map(l2.map(x => [nm(x.tenToChucDang), x]));
          let hit = 0;
          rows.forEach(r => { const x = mp.get(nm(r[1])); if (x) { hit++; r.push(kr(x.dangPhiPhaiNopCapTren), kr(x.dangPhiDaNopCapTren), num(x.dangPhiChuaNopCapTrenCuoiKyBaoCao)); } else r.push(0, 0, 0); });
          s02Msg = '\nSổ S02: khớp ' + hit + '/' + rows.length + ' đơn vị';
        } catch (e2) { rows.forEach(r => { r.length = 14; }); s02Msg = '\n⚠ Chưa lấy được sổ S02 (' + (e2 && e2.message || e2) + ') — các cột nộp cấp trên giữ nguyên.'; }
        const sum = k => rows.reduce((a, r) => a + r[k], 0);
        const declared = sum(11), paid = sum(12);
        const syncId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        const payload = { token: pw, syncId, fileName: 'API gqtthc kỳ T' + SM + '/' + cy + ' · ' + p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()), month: yy + '-' + mm, source: 'api-month',
          totals: { units: rows.length, members: sum(2), paidProfiles: sum(9), declared, paid, rate: declared > 0 ? Math.round(paid / declared * 10000) / 100 : 0 }, rows };
        say('Đang gửi ' + rows.length + ' đơn vị lên Google Sheet…', false, true);
        const tD = performance.now();
        await fetch(API, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ payload: JSON.stringify(payload) }) });
        const tE = performance.now();
        say('Đang xác nhận kết quả trên Google Sheet…', false, true);
        let ok = null;
        for (let k = 0; k < 12 && !ok; k++) {
          ok = await new Promise(res => {
            const cb = '__dpbm' + Date.now() + k, s = document.createElement('script');
            const t = setTimeout(() => { delete window[cb]; s.remove(); res(null); }, 9000);
            window[cb] = v => { clearTimeout(t); delete window[cb]; s.remove(); res(v); };
            s.onerror = () => { clearTimeout(t); res(null); };
            s.src = API + '?action=status&callback=' + cb + '&_=' + Date.now();
            document.head.appendChild(s);
          });
          if (ok && ok.lastError && ok.lastError.syncId === syncId) throw new Error(ok.lastError.error);
          if (!(ok && ok.last && ok.last.syncId === syncId)) { ok = null; await new Promise(r2 => setTimeout(r2, 1000)); }
        }
        const tF = performance.now();
        try { localStorage.setItem('dangphi.token', pw); } catch (e) {}
        const apiT = tC - tA, nc = navigator.connection || {};
        const speed = apiT < 2500 ? '🟢 Nhanh' : apiT < 6000 ? '🟡 Bình thường' : '🔴 Chậm';
        const detail = (window.__dpBmTimer ? '\n⏱ Tự động lặp mỗi ' + AM + ' phút — giữ tab này mở; tải lại trang sẽ dừng.' : '') + s02Msg + '\n⏱ Tổng ' + f1(tF - T0) + ' · Kết nối ' + speed + '\nAPI ' + f1(apiT) + ' (chờ ' + f1(tB - tA) + ', tải ' + Math.max(1, Math.round(raw.length / 1024)) + ' KB) · Gửi Sheet ' + f1(tE - tD) + ' · Xác nhận ' + f1(tF - tE) + (nc.effectiveType ? '\nMạng ' + nc.effectiveType + (nc.rtt ? ' · RTT ' + nc.rtt + 'ms' : '') : '');
        say((ok ? '✅ HOÀN THÀNH — đã đồng bộ ' + ok.last.rowCount + ' đơn vị kỳ tháng ' + SM + '/' + cy + (ok.last.tab ? ' (tab ' + ok.last.tab + ')' : '') + ' lúc ' + ok.last.updatedAtText + '.' : '✓ Đã gửi ' + rows.length + ' đơn vị. Chưa xác nhận được kết quả — hãy mở lại trang Đảng phí để xem “Lần đồng bộ gần nhất”.') + detail, false, false, !!ok);
        setTimeout(() => box.remove(), auto ? 6000 : 25000);
      } catch (e) {
        if (/mật khẩu|token|không hợp lệ/i.test(String(e.message))) { try { localStorage.removeItem('dangphi.token'); } catch (x) {} }
        say((auto ? '⏱ Tự động — ' : '') + '✕ ' + (e && e.name === 'AbortError' ? 'API phản hồi quá chậm (quá 90 giây, đã thử 2 lần). Kiểm tra mạng rồi bấm lại.' : e.message) + '   (sau ' + f1(performance.now() - T0) + ')', true);
        setTimeout(() => box.remove(), 15000);
      }
    };
    window.__dpBmBusy = true;
    go(false).finally(() => { window.__dpBmBusy = false; badge(hm()); });
  }
