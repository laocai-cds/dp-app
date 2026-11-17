/* Kiểm tra hệ thống, giữ phiên gqtthc, đồng bộ cấu hình từ xa */
const {app,ipcMain,net,dialog}=require('electron');
const path=require('path');
const fs=require('fs');
const ROOT=path.join(__dirname,'..');
module.exports=function init(ctx){
/* ===== Kiểm tra hệ thống / bảng tình trạng ===== */
async function fetchJson(u,ms){const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms||9000);try{const r=await net.fetch(u,{signal:ac.signal,headers:{'User-Agent':'dp-dangphi'}});return JSON.parse(await r.text())}finally{clearTimeout(t)}}
const parseVN=s=>{const k=/^(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)(?::(\d+))?/.exec(String(s||''));return k?new Date(+k[3],+k[2]-1,+k[1],+k[4],+k[5],+(k[6]||0)).getTime():0};
const epOf=x=>{const c=ctx.readCodes();return x.fn==='dpBookmarklet'?(c[x.id+'_api']||(typeof x.arg==='string'?x.arg:'')):((x.arg&&x.arg.ep)||'')};
async function healthCore(){
  let login=false;try{login=await ctx.view.webContents.executeJavaScript("!!localStorage.getItem('token')")}catch(_){}
  const codes=ctx.readCodes();
  const rs=await Promise.all(ctx.cfg.xa.map(async x=>{
    const o={id:x.id,label:x.label,ok:false,t:0,msg:'',code:!!(codes[x.id]||codes.__all)};
    /* mốc cập nhật lấy từ chính phần mềm: lần chạy thành công gần nhất đã ghi trên máy này */
    const lr=ctx.RES[x.id],lt=lr?(lr.okT||(lr.ok?lr.t:0)):0;if(lt){o.ok=true;o.t=lt;return o}
    const ep=epOf(x);
    if(!ep){o.msg='chưa có địa chỉ Apps Script';return o}
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(ep)){o.msg='địa chỉ Apps Script không đúng dạng …/exec';return o}
    try{const j=await fetchJson(ep+'?action=status&_='+Date.now());
      if(!j||j.ok===false){o.msg=(j&&j.error)||'script báo lỗi';return o}
      o.ok=true;
      if(j.last&&j.last.updatedAtText){o.t=parseVN(j.last.updatedAtText)}else if(j.lastSync){o.t=Date.parse(j.lastSync)||0}
      if(!o.t)o.msg='chưa đồng bộ lần nào trên máy này'
    }catch(e){o.msg='không kết nối được ('+String(e&&e.message||e).slice(0,30)+')'}
    return o}));
  let chung='';if(ctx.cfg.chung){try{const j=await fetchJson(ctx.cfg.chung+'?_='+Date.now(),9000);chung=j&&j.ok?('DP-CHUNG v'+(j.version||'?')+(j.tthc?' (có ĐP Tỉnh)':' (chưa hỗ trợ ĐP Tỉnh — cần triển khai bản mới)')):'DP-CHUNG báo lỗi'}catch(_){chung='DP-CHUNG không kết nối được'}}
  return {login,rs,chung};
}
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<60?m+' phút trước':m<1440?Math.round(m/60)+' giờ trước':Math.round(m/1440)+' ngày trước'};
const hhmm=t=>{const d=new Date(t),p=n=>String(n).padStart(2,'0');return p(d.getHours())+':'+p(d.getMinutes())+' '+p(d.getDate())+'/'+p(d.getMonth()+1)};
ipcMain.handle('health',async()=>{
  ctx.say('🩺 Đang kiểm tra hệ thống…');const h=await healthCore();
  const lines=[(h.login?'✅ Đã đăng nhập gqtthc':'✕ CHƯA đăng nhập gqtthc — hãy đăng nhập ở khung bên dưới')];
  if(h.chung)lines.push((/chưa hỗ trợ|lỗi|không kết nối/.test(h.chung)?'⚠ ':'✅ ')+h.chung);
  lines.push('');
  h.rs.forEach(o=>{const age=o.t?Date.now()-o.t:0;const ic=!o.ok?'✕':!o.t?'⚪':age<6*3600e3?'🟢':age<24*3600e3?'🟡':'🔴';
    lines.push(ic+' '+o.label+' — '+(o.ok?(o.t?hhmm(o.t)+' ('+ago(o.t)+')':o.msg):o.msg)+(o.code?'':' · thiếu mã đồng bộ'))});
  lines.push('','🟢 mới (<6 giờ)  🟡 <24 giờ  🔴 cũ >24 giờ  ✕ lỗi kết nối/địa chỉ  ⚪ chưa có dữ liệu');
  ctx.say('🩺 Kiểm tra xong');try{ctx.log('Kiểm tra hệ thống:\n'+lines.join('\n'))}catch(_){}
  await dialog.showMessageBox(ctx.win,{type:'info',title:'Tình trạng hệ thống',message:'Tình trạng đồng bộ các đơn vị',detail:lines.join('\n'),buttons:['Đóng']});return true});
/* cảnh báo dữ liệu cũ (>24 giờ): chạy nền mỗi giờ, nhắc tối đa 1 lần / 12 giờ */
let lastStaleWarn=0;
async function staleCheck(){try{if(Date.now()-lastStaleWarn<12*3600e3)return;const h=await healthCore();
  const old=h.rs.filter(o=>o.ok&&o.t&&Date.now()-o.t>24*3600e3).map(o=>o.label);
  if(old.length){lastStaleWarn=Date.now();ctx.notify('Dữ liệu đảng phí chưa cập nhật quá 24 giờ',old.slice(0,6).join(', ')+(old.length>6?'…':''));ctx.log('Cảnh báo dữ liệu cũ: '+old.join(', '))}}catch(_){}}
setTimeout(staleCheck,3*60e3);setInterval(staleCheck,60*60e3);
/* ===== Giữ phiên gqtthc "sống": cứ 10 phút gọi một API nhẹ như người đang thao tác; hiện hạn token còn lại ===== */
const keepFile=()=>path.join(app.getPath('userData'),'giu-phien.json');
const readKeep=()=>{try{return Object.assign({on:true},JSON.parse(fs.readFileSync(keepFile(),'utf8')))}catch(_){return{on:true}}};
let lastReload=0,sessInfo={text:'Phiên gqtthc: chưa kiểm tra',bad:false},lastExpWarn=0,lastKeepLog=0,lastKeepStatus=null;
const KEEPJS="(async()=>{const tk=localStorage.getItem('token');if(!tk)return{s:0,exp:0};let exp=0;try{exp=JSON.parse(atob(tk.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).exp||0}catch(e){}"+
 /* gqtthc có đồng hồ 'không hoạt động' 30 phút (ng2-idle): giả lập thao tác chuột/bàn phím để reset; gọi API đơn thuần không reset được */
 "const ex=()=>Number(localStorage.getItem('ng2Idle.main.expiry'))||0;const i0=ex();"+
 "try{const d=document.documentElement;['mousemove','keydown','mousedown','scroll'].forEach(t=>d.dispatchEvent(t==='keydown'?new KeyboardEvent(t,{key:'Shift',bubbles:true}):t==='scroll'?new Event(t,{bubbles:true}):new MouseEvent(t,{bubbles:true,clientX:5+Math.floor(Math.random()*50),clientY:5+Math.floor(Math.random()*50)})))}catch(e){}"+
 "await new Promise(r=>setTimeout(r,700));const i1=ex(),exp2=Number(localStorage.getItem('expirationTime'))||0;"+
 "try{const ac=new AbortController();setTimeout(()=>ac.abort(),20000);const r=await fetch('https://gateway-gqtthc.dcs.vn/category/v1/co-quan/get-all-by-current-user-v4',{headers:{Authorization:'Bearer '+tk,Accept:'application/json'},signal:ac.signal});return{s:r.status,exp,i0,i1,rt:exp2}}catch(e){return{s:-1,exp,i0,i1,rt:exp2}}})()";
async function keepAlive(manual){
  try{
    if(!manual&&!readKeep().on)return;
    if(!ctx.view||!/^https:\/\/gqtthc\.dcs\.vn\//.test(ctx.view.webContents.getURL()))return;
    const r=await ctx.view.webContents.executeJavaScript(KEEPJS);
    const hm=new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
    let text,bad=false;
    if(!r||r.s===0){text='Phiên gqtthc: chưa đăng nhập';bad=true}
    else if(r.s===401||r.s===403){text='Phiên gqtthc: ĐÃ HẾT HẠN — hãy đăng nhập lại';bad=true;
      if(Date.now()-lastExpWarn>3*3600e3){lastExpWarn=Date.now();ctx.notify('gqtthc đã hết phiên đăng nhập','Hãy mở ứng dụng và đăng nhập lại để các lượt tự động lấy được dữ liệu.');ctx.hookPost('⚠ gqtthc đã hết phiên đăng nhập');}}
    else{const left=r.exp?r.exp*1000-Date.now():0;
      text='Phiên gqtthc: '+(r.exp?(left>0?'token còn '+(left>=3600e3?Math.floor(left/3600e3)+' giờ ':'')+Math.round((left%3600e3)/60000)+' phút':'token đã quá hạn'):'không rõ hạn')+' · không hoạt động còn '+(r.i1?Math.max(0,Math.round((r.i1-Date.now())/60000)):'?')+' phút · giữ phiên lúc '+hm+(r.s>=200&&r.s<300?'':' (API '+r.s+')');
      if(r.exp&&left>0&&left<30*60e3&&Date.now()-lastExpWarn>3*3600e3){lastExpWarn=Date.now();ctx.notify('Phiên gqtthc sắp hết hạn','Còn dưới 30 phút. Hãy đăng nhập lại trong ứng dụng để lượt tự động không bị hụt.')}}
    /* token truy cập chỉ sống 1 giờ: sắp hết (<5 phút) thì tải lại trang gqtthc để trang tự dùng refresh_token (24 giờ) xin token mới — chỉ khi không đang chạy lấy số liệu */
    if(r&&r.exp&&r.exp*1000-Date.now()<5*60e3&&!manual&&!ctx.schedBusy&&Date.now()-ctx.lastActive>180000&&Date.now()-lastReload>15*60e3){
      lastReload=Date.now();ctx.log('Giữ phiên: token sắp hết hạn → tải lại trang gqtthc để làm mới token');
      try{await new Promise(z=>{ctx.view.webContents.once('did-finish-load',z);ctx.view.webContents.reload();setTimeout(z,20000)})}catch(_){}
      setTimeout(()=>keepAlive(true),6000)}
    sessInfo={text,bad};try{ctx.win.webContents.send('sess',sessInfo)}catch(_){}
    if(Date.now()-lastKeepLog>3600e3||lastKeepStatus!==(r&&r.s)){lastKeepLog=Date.now();lastKeepStatus=r&&r.s;ctx.log('Giữ phiên: HTTP '+(r&&r.s)+(r&&r.exp?' · token hết hạn lúc '+new Date(r.exp*1000).toLocaleString('vi-VN'):'')+(r&&r.i1?' · đồng hồ không-hoạt động '+(r.i1>r.i0?'đã reset':'KHÔNG reset')+' (còn '+Math.round((r.i1-Date.now())/60000)+' phút)':''))}
  }catch(_){}
}
ipcMain.handle('keep:get',()=>({on:readKeep().on,info:sessInfo}));
ipcMain.handle('keep:set',async(e,on)=>{fs.writeFileSync(keepFile(),JSON.stringify({on:!!on}));if(on)keepAlive(true);return true});
setTimeout(()=>keepAlive(),60e3);setInterval(()=>keepAlive(),10*60e3);
/* cấu hình từ xa: lấy config.json mới nhất trên GitHub (raw, không bị giới hạn API); áp dụng khi mở lại ứng dụng */
async function syncRemoteCfg(){try{
  const r=await net.fetch('https://raw.githubusercontent.com/'+ctx.REPO+'/main/config.json?_='+Date.now(),{headers:{'User-Agent':'dp-dangphi'}});if(!r.ok)return;
  const n=await r.json();if(!n||!Array.isArray(n.xa)||!n.xa.length)return;
  if(!n.xa.every(x=>x&&x.id&&x.file&&fs.existsSync(path.join(ROOT,ctx.bmFile(x)))))return;   /* chỉ nhận nếu bản app này có đủ bộ lấy số liệu */
  const cf=path.join(ctx.exeDir,'config.json'),c=JSON.parse(fs.readFileSync(cf,'utf8'));
  const need=n.xa.some(x=>{const y=(c.xa||[]).find(z=>z.id===x.id);return !y||JSON.stringify(y)!==JSON.stringify(x)})||(n.chung!==undefined&&n.chung!==c.chung);
  if(need){fs.writeFileSync(path.join(ctx.exeDir,'config.new.json'),JSON.stringify(n));ctx.log('Có cấu hình mới trên GitHub — sẽ áp dụng khi mở lại ứng dụng');ctx.say('ℹ Có cấu hình mới (địa chỉ/đơn vị). Hãy đóng và mở lại ứng dụng để áp dụng.')}
}catch(_){}}
setTimeout(syncRemoteCfg,25e3);setInterval(syncRemoteCfg,3*3600e3);
/* chạy nền ở khay hệ thống khi đang bật hẹn giờ / tự động */
};
