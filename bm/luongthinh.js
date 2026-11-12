function apiBookmarklet(C){
  let AM=0;
  /* Nhãn góc trái dưới: đang tự động lặp, lần cuối lúc nào; bấm để tắt */
  const badge=t=>{let b=document.getElementById('__dpBmBadge');if(!window.__dpBmTimer){if(b)b.remove();return}
    if(!b){b=document.createElement('div');b.id='__dpBmBadge';b.title='Bấm để tắt tự động đồng bộ';b.style.cssText='position:fixed;z-index:2147483646;left:14px;bottom:14px;padding:8px 14px;border-radius:20px;background:#0f8a3c;color:#fff;font:700 13px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer';
      b.onclick=()=>{if(confirm('Tắt tự động đồng bộ đảng phí?')){clearInterval(window.__dpBmTimer);window.__dpBmTimer=0;window.__dpBmAM=0;b.remove()}};document.body.appendChild(b)}
    b.dataset.am=b.dataset.am||AM;b.textContent='⏱ Tự động mỗi '+b.dataset.am+' phút'+(t?' · lần cuối '+t:' · đang chờ lần đầu')};
  const hm=()=>{const d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')};
  const go=async(auto)=>{
    const box=document.createElement('div');
    box.style.cssText='position:fixed;z-index:2147483647;top:14px;right:14px;max-width:380px;padding:12px 16px;border-radius:12px;background:#12315f;color:#fff;font:600 14px/1.45 system-ui,sans-serif;white-space:pre-line;box-shadow:0 8px 28px rgba(0,0,0,.35)';
    let T0=performance.now(),curMsg='',curBad=false,curOk=false,tick=null,dead=false;const acs=new Set();
    const f1=ms=>(ms/1000).toFixed(1).replace('.',',')+'s';
    const paint=()=>{if(dead)return;box.textContent=curMsg+(tick?'   ⏱ '+f1(performance.now()-T0):'');box.style.background=curBad?'#a50d26':curOk?'#0f8a3c':'#12315f';if(!box.parentNode)document.body.appendChild(box)};
    const say=(m,bad,run,good)=>{curMsg=m;curBad=!!bad;curOk=!!good;if(run){if(!tick)tick=setInterval(paint,100)}else if(tick){clearInterval(tick);tick=null}paint()};
    const jp=(u,ms)=>new Promise(res=>{const cb='__apibm'+Date.now()+Math.random().toString(36).slice(2),sc=document.createElement('script');const t=setTimeout(()=>{delete window[cb];sc.remove();res(null)},ms||9000);window[cb]=v=>{clearTimeout(t);delete window[cb];sc.remove();res(v)};sc.onerror=()=>{clearTimeout(t);res(null)};sc.src=u+(u.includes('?')?'&':'?')+'callback='+cb+'&t='+Date.now();document.head.appendChild(sc)});
    try{
      if(!/gqtthc\.dcs\.vn$/.test(location.hostname)){alert('Hãy bấm dấu trang này khi đang mở trang gqtthc.dcs.vn (đã đăng nhập).');return}
      const tk=localStorage.getItem('token');
      if(!tk){if(auto){say('⏱ Tự động: chưa đăng nhập gqtthc.dcs.vn — hãy đăng nhập lại.',true);setTimeout(()=>box.remove(),15000)}else alert('Chưa đăng nhập gqtthc.dcs.vn.');return}
      if(!C.ep){alert('Chưa có địa chỉ Google Sheet trên trang đồng bộ.');return}
      let pw=localStorage.getItem(C.k)||'';
      if(!pw&&auto)return;
      if(!pw){pw=(prompt('Mã đồng bộ ('+C.name+'):')||'').trim();if(!pw)return}
      /* chọn tháng: chỉ các tháng của năm hiện tại (sheet Thang1…Thang12 không phân biệt năm) */
      const now=new Date();
      const PK=auto?(now.getFullYear()+'-'+(now.getMonth()+1)):await new Promise(res=>{
        const ov=document.createElement('div');
        ov.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font:14px/1.45 system-ui,sans-serif';
        let o='';for(let i=0;i<12;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1),y=d.getFullYear(),m=d.getMonth()+1;o+='<option value="'+y+'-'+m+'"'+(i?'':' selected')+'>Tháng '+m+'/'+y+(i?'':' (hiện tại)')+'</option>'}
        ov.innerHTML='<div style="background:#fff;color:#12315f;padding:20px 24px;border-radius:12px;min-width:300px;box-shadow:0 8px 28px rgba(0,0,0,.35)"><div style="font-weight:700;font-size:16px">Lấy số liệu đảng phí</div><div data-n style="font-size:13px;color:#555;margin-top:2px"></div><select style="width:100%;margin:14px 0;padding:8px;font-size:14px;border:1px solid #bbb;border-radius:8px">'+o+'</select><div data-amst style="font-size:13px;font-weight:700;margin:0 0 8px;color:#6b7280"></div><div style="font-size:13px;color:#12315f;margin:0 0 6px">Tự động lặp lại (tháng hiện tại)</div><select data-am style="width:100%;margin:0 0 14px;padding:8px;font-size:14px;border:1px solid #bbb;border-radius:8px"><option value="0" selected>Không — chỉ lấy một lần</option><option value="2">Mỗi 2 phút</option><option value="5">Mỗi 5 phút</option><option value="10">Mỗi 10 phút</option><option value="15">Mỗi 15 phút</option><option value="30">Mỗi 30 phút</option></select><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-x style="padding:7px 14px;border:1px solid #bbb;background:#fff;border-radius:8px;cursor:pointer">Hủy</button><button type="button" data-ok style="padding:7px 16px;border:0;background:#b3261e;color:#fff;font-weight:700;border-radius:8px;cursor:pointer">Lấy dữ liệu</button></div></div>';
        ov.querySelector('[data-n]').textContent=C.name;
        {const st=ov.querySelector('[data-amst]'),am=ov.querySelector('[data-am]');if(window.__dpBmTimer&&window.__dpBmAM){am.value=String(window.__dpBmAM);st.textContent='⏱ Đang chạy tự động: '+window.__dpBmAM+' phút';st.style.color='#0f8a3c'}else st.textContent='Hiện chưa chạy tự động'}
        const sel=ov.querySelector('select'),done=v=>{if(v)AM=+ov.querySelector('[data-am]').value||0;ov.remove();document.removeEventListener('keydown',kd,true);res(v)};
        const kd=e=>{if(e.key==='Escape'){e.preventDefault();done(0)}else if(e.key==='Enter'){e.preventDefault();done(sel.value)}};
        ov.querySelector('[data-x]').onclick=()=>done(0);ov.querySelector('[data-ok]').onclick=()=>done(sel.value);
        ov.onclick=e=>{if(e.target===ov)done(0)};document.addEventListener('keydown',kd,true);
        document.body.appendChild(ov);sel.focus();
      });
      if(!PK)return;
      if(!auto){if(window.__dpBmTimer){clearInterval(window.__dpBmTimer);window.__dpBmTimer=0}if(AM>0)window.__dpBmTimer=setInterval(()=>{if(window.__dpBmBusy)return;window.__dpBmBusy=true;go(true).finally(()=>{window.__dpBmBusy=false;badge(hm())})},AM*60000);window.__dpBmAM=window.__dpBmTimer?AM:0;const ob=document.getElementById('__dpBmBadge');if(ob)ob.remove();badge()}
      const cy=+PK.split('-')[0],SM=+PK.split('-')[1];
      T0=performance.now();
      if(navigator.onLine===false)throw new Error('Máy đang mất kết nối mạng. Kiểm tra mạng rồi bấm lại.');
      say('Đang lấy số liệu tháng '+SM+'/'+cy+' từ API…',false,true);
      const T=C.m?('Thang'+SM+(cy===2026?'':'-'+cy)):''/* năm 2026: Thang10; năm khác: Thang1-2027 */,rd=C.ep+'?action=read'+(T?'&tab='+encodeURIComponent(T):'');
      const b0P=jp(rd);/* đọc trước lastSync + làm nóng Apps Script song song với lúc chờ API */
      const tA=performance.now();
      const p2=n=>String(n).padStart(2,'0'),mm=p2(SM),yy=cy;
      const body={kyNopStart:'01/'+mm+'/'+yy,kyNopEnd:new Date(yy,SM,0).getDate()+'/'+mm+'/'+yy,parentId:C.pid,hasChildren:true,page:1,size:1000};
      let r=null;
      for(let at=1;at<=2&&!r;at++){/* chờ tối đa 90 giây mỗi lần; chậm hoặc lỗi máy chủ thì tự thử lại 1 lần */
        if(dead)throw new Error('Đã hủy');const ac=new AbortController();acs.add(ac);const to=setTimeout(()=>ac.abort(),90000);
        try{
          if(at>1)say('API phản hồi chậm, đang thử lại lần '+at+'…',false,true);
          const rr=await fetch('https://gateway-gqtthc.dcs.vn/report/dashboard/danh-sach-theo-doi-dang-phi',{signal:ac.signal,method:'POST',headers:{Authorization:'Bearer '+tk,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});
          clearTimeout(to);
          if(rr.status>=500&&at<2)continue;
          r=rr;
        }catch(e){clearTimeout(to);if(at>=2)throw e}
      }
      const tB=performance.now();
      if(!r.ok)throw new Error('API trả lỗi '+r.status+(r.status===401?' — hãy đăng nhập lại.':''));
      const raw=await r.text(),tC=performance.now();
      const j=JSON.parse(raw),list=j.data||[];
      if(!list.length)throw new Error('API không trả đơn vị nào.');
      const n=x=>Number(x)||0;
      const h1=['STT','Tên đơn vị','Đảng viên','','','','','Hồ sơ đảng phí','','','','Số tiền','',''];
      const h2=['','','Tổng sl đảng viên (1)','Số lượng ĐV sinh hoạt chính thức (2)','Số lượng ĐV sinh hoạt tạm thời (3)','Số lượng ĐV đã chuyển sinh hoạt đảng tạm thời (4)','Số lượng được miễn giảm ĐP (5)','Chưa duyệt (6)','Đã duyệt, chưa nộp (7)','Đã duyệt, đã nộp (8)','Số đảng viên chưa có hồ sơ (9)','Tổng tiền theo hồ sơ đã khai báo','Tổng tiền đã nộp','Tỷ lệ hoàn thành\n đảng phí thực tế'];
      const rows=[h2].concat(list.map((x,i)=>[i+1,x.tenDonVi,n(x.tongSoLuongDangVien),n(x.soLuongDangVienChinhThuc),n(x.soLuongDangVienTamThoi),n(x.soLuongChuyenTamThoi),n(x.soLuongDangVienMienGiam),n(x.tongSoHoSoChuaDuyet),n(x.tongSoHoSoDaDuyetChuaNop),n(x.tongSoHoSoDaDuyetDaNop),n(x.soLuongHoSoChuaKhaiBao),n(x.tongSoTienDaKhaiBao),n(x.tongSoTienDaNop),Math.round(n(x.mucDoThucHien)*100)/10000]));
      if(dead)throw new Error('Đã hủy');say('Đang gửi '+list.length+' đơn vị lên Google Sheet…',false,true);
      const tD=performance.now();
      const b0=await b0P,before=b0&&b0.ok?(b0.lastSync||''):null;
      await fetch(C.chung||C.ep,{method:'POST',mode:'no-cors',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign(T?{tab:T}:{},{headers:h1,rows:rows,token:pw,source:C.src,sentAt:new Date().toISOString()}))});
      const tE=performance.now();
      say('Đang xác nhận kết quả trên Google Sheet…',false,true);
      let ok=null;
      const sigRows=a=>{let n=0,s=0,p=0;(a||[]).forEach(r=>{if(r&&/^\d+$/.test(String(r[0]==null?'':r[0]).trim())){n++;s+=Number(String(r[2]).replace(/[^\d]/g,''))||0;p+=Number(String(r[12]).replace(/[^\d]/g,''))||0}});return n+'|'+s+'|'+p},want=sigRows(rows);
      for(let k=0;k<12&&!ok;k++){await new Promise(r2=>setTimeout(r2,1000));const x=await jp(rd,9000);if(x&&x.ok&&((x.lastSync||'')!==before||sigRows(x.rows)===want))ok=x}
      const tF=performance.now();
      if(ok&&C.m){say('Đang cập nhật tab “Thu theo tháng”…',false,true);
        const MK=cy+'-'+String(SM).padStart(2,'0'),paid=rows.slice(1).reduce((a,r)=>a+(Number(r[12])||0),0);
        const x=await jp(C.ep+'?action=read&tab='+encodeURIComponent('Thu theo tháng'),9000);
        if(x&&x.ok){const map={};(x.rows||[]).forEach(r=>{const k=String(r&&r[0]||'').trim();if(/^\d{4}-\d{2}$/.test(k))map[k]=[k,Number(String(r[1]).replace(/[^\d]/g,''))||0,r[2]||'']});
          map[MK]=[MK,paid,'Nút API lúc '+new Date().toLocaleString('vi-VN',{hour12:false})];
          await fetch(C.chung||C.ep,{method:'POST',mode:'no-cors',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({tab:'Thu theo tháng',headers:['Tháng','Đã nộp trong kỳ (₫)','Ghi nhận'],rows:Object.keys(map).sort().map(k=>map[k]),token:pw,source:C.src+'-monthly',sentAt:new Date().toISOString()})})}}
      if(ok){try{localStorage.setItem(C.k,pw)}catch(e){}}else{try{localStorage.removeItem(C.k)}catch(e){}}
      const apiT=tC-tA,nc=navigator.connection||{};
      const speed=apiT<2500?'🟢 Nhanh':apiT<6000?'🟡 Bình thường':'🔴 Chậm';
      const detail=(window.__dpBmTimer?'\n⏱ Tự động lặp mỗi '+AM+' phút — giữ tab này mở; tải lại trang sẽ dừng.':'')+'\n⏱ Tổng '+f1(tF-T0)+' · Kết nối '+speed+'\nAPI '+f1(apiT)+' (chờ '+f1(tB-tA)+', tải '+Math.max(1,Math.round(raw.length/1024))+' KB) · Gửi Sheet '+f1(tE-tD)+' · Xác nhận '+f1(tF-tE)+(nc.effectiveType?'\nMạng: '+nc.effectiveType+(nc.rtt?' · rtt '+nc.rtt+' ms':''):'');
      say(ok?'✅ HOÀN THÀNH — đã đồng bộ '+list.length+' đơn vị tháng '+SM+'/'+cy+' lên Google Sheet ('+T+').'+detail:'Đã gửi '+list.length+' đơn vị nhưng chưa thấy Google Sheet cập nhật. Kiểm tra mã đồng bộ rồi bấm lại (sẽ hỏi lại mã).'+detail,!ok,false,!!ok);
      setTimeout(()=>box.remove(),ok?25000:30000);
    }catch(e){say('✕ '+(e&&e.name==='AbortError'?'API phản hồi quá chậm (quá 90 giây, đã thử 2 lần). Kiểm tra mạng rồi bấm lại.':e.message)+'   (sau '+f1(performance.now()-T0)+')',true);setTimeout(()=>box.remove(),auto?15000:20000)}
  };
  window.__dpBmBusy=true;
  go(false).finally(()=>{window.__dpBmBusy=false;badge(hm())});
}
