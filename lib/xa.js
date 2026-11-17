/* Danh sách xã: xã kéo thêm, ẩn/xóa nút, mã đồng bộ */
const {app,ipcMain}=require('electron');
const path=require('path');
const fs=require('fs');
module.exports=function init(ctx){
/* ===== Xã thêm bằng cách kéo nút "ĐP" từ website xã vào app (lưu trên máy này) ===== */
const extraFile=()=>path.join(app.getPath('userData'),'extra-xa.json');
/* mọi nút ĐP xã (apiBookmarklet) dùng chung một lõi bm/core.js; khác biệt từng xã nằm ở tham số trong config.json */
const bmFile=x=>x&&x.fn==='apiBookmarklet'?'bm/core.js':(x&&x.file);
ctx.bmFile=bmFile;

const readExtra=()=>{try{const a=JSON.parse(fs.readFileSync(extraFile(),'utf8'));return Array.isArray(a)?a:[]}catch(e){return[]}};
const writeExtra=a=>fs.writeFileSync(extraFile(),JSON.stringify(a,null,2));
function loadExtra(){const have=new Set(ctx.cfg.xa.map(x=>x.id));const srcs=new Set(),eps=new Set();ctx.cfg.xa.forEach(x=>{if(x.arg&&typeof x.arg==='object'){if(x.arg.src)srcs.add(x.arg.src);if(x.arg.ep)eps.add(x.arg.ep)}});readExtra().forEach(x=>{if(!x||!x.id||have.has(x.id))return;const g=x.arg&&typeof x.arg==='object'?x.arg:{};/* bỏ nút tự kéo thả nếu xã đó đã có sẵn trong app (tránh trùng) */if((g.src&&srcs.has(g.src))||(g.ep&&eps.has(g.ep)))return;ctx.cfg.xa.push(x);have.add(x.id);if(g.src)srcs.add(g.src);if(g.ep)eps.add(g.ep)})}
function parseDp(raw){
  let t=String(raw||'').trim();if(!t)throw new Error('Chưa có nội dung.');
  t=t.split(/\r?\n/).map(l=>l.trim()).find(l=>/^javascript:/i.test(l))||t;
  if(/^javascript:/i.test(t)){t=t.replace(/^javascript:/i,'');try{t=decodeURIComponent(t)}catch(e){}}
  const tail=/\)\s*;?\s*void 0\s*;?\s*$/;
  let end=t.search(tail);if(end<0)end=t.length;
  const i=t.lastIndexOf(')({',end);if(i<0||t.indexOf('apiBookmarklet')<0)throw new Error('Đây không phải nút ĐP của website xã (không thấy apiBookmarklet).');
  let C;try{C=JSON.parse(t.slice(i+2,end))}catch(e){throw new Error('Không đọc được thông số trong nút ĐP.')}
  if(!C||typeof C.name!=='string'||!C.name||!C.k||!C.src||!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(String(C.ep||'')))throw new Error('Nút ĐP thiếu thông số (tên xã, địa chỉ Apps Script). Hãy mở website xã khi đã nối Google Sheet rồi kéo lại nút.');
  if(!/^[\w.-]+$/.test(String(C.k))||!/^[\w.-]+$/.test(String(C.src)))throw new Error('Thông số nút ĐP không hợp lệ.');
  return C;
}
function addXaCore(raw){
  try{const C=parseDp(raw);
    const dup=ctx.cfg.xa.find(x=>x.arg&&typeof x.arg==='object'&&(x.arg.src===C.src||x.arg.ep===C.ep));
    if(dup)return{err:'Xã này đã có nút "'+dup.label+'" trong app.'};
    const id='x_'+String(C.src).replace(/^website-/,'').replace(/-api$/,'').replace(/[^\w-]/g,'');
    const label='ĐP '+C.name.replace(/^(Đảng bộ|Đảng ủy)\s+(xã|phường|thị trấn)\s+/i,'').trim();
    const arg={pid:+C.pid||0,name:C.name,max:+C.max||0,k:C.k,src:C.src,m:true,ep:C.ep};if(C.cid)arg.cid=+C.cid;
    const ent={id,label,fn:'apiBookmarklet',file:'bm/core.js',key:C.k,arg,extra:true};
    const a=readExtra().filter(x=>x.id!==id);a.push(ent);writeExtra(a);ctx.log('Thêm nút '+label+' (kéo từ website xã)');
    return{ok:true,label}}catch(err){return{err:String(err&&err.message||err)}}
}
ipcMain.handle('xa:add',(e,raw)=>addXaCore(raw));
ipcMain.on('xa:add:internal',(e,raw)=>{const r=addXaCore(raw);try{ctx.win.webContents.send('xaadded',r)}catch(_){}});
ipcMain.handle('xa:remove',(e,id)=>{const a=readExtra();if(!a.some(x=>x.id===id))return{err:'Chỉ gỡ được nút do bạn tự thêm.'};writeExtra(a.filter(x=>x.id!==id));const c=readCodes();delete c[id];writeCodes(c);return{ok:true}});
const hiddenFile=()=>path.join(app.getPath('userData'),'hidden-xa.json');
const readHidden=()=>{try{const a=JSON.parse(fs.readFileSync(hiddenFile(),'utf8'));return Array.isArray(a)?a:[]}catch(e){return[]}};
const writeHidden=a=>fs.writeFileSync(hiddenFile(),JSON.stringify(a));
loadExtra();
{const hd=new Set(readHidden());if(hd.size)ctx.cfg.xa=ctx.cfg.xa.filter(x=>!hd.has(x.id))}
/* Xóa nút xã: phải nhập đúng mã chung đã lưu. Nút tự thêm bị xóa hẳn; nút có sẵn chỉ bị ẩn trên máy này (khôi phục được) */
const passOk=p=>{const a=readCodes().__all;return !!a&&String(p||'').trim()===a};
ipcMain.handle('xa:delete',(e,{ids,pass})=>{
  if(!readCodes().__all)return{err:'Chưa lưu mã chung trong app nên chưa xóa được. Hãy nhập và lưu "Mã chung" trước.'};
  if(!passOk(pass))return{err:'Mật khẩu (mã chung) không đúng.'};
  ids=(ids||[]).filter(i=>typeof i==='string');if(!ids.length)return{err:'Chưa chọn nút nào.'};
  const ex=readExtra();writeExtra(ex.filter(x=>!ids.includes(x.id)));
  const exIds=new Set(ex.map(x=>x.id));const hid=new Set(readHidden());ids.forEach(i=>{if(!exIds.has(i))hid.add(i)});writeHidden([...hid]);
  const c=readCodes();ids.forEach(i=>{if(exIds.has(i)){delete c[i];delete c[i+'_api']}});writeCodes(c);
  ctx.cfg.xa=ctx.cfg.xa.filter(x=>!ids.includes(x.id));ctx.log('Đã xóa nút: '+ids.join(', '));
  return{ok:true,n:ids.length}});
ipcMain.handle('xa:restore',(e,pass)=>{
  if(!passOk(pass))return{err:'Mật khẩu (mã chung) không đúng.'};
  if(!readHidden().length)return{err:'Không có nút nào đang bị ẩn.'};
  writeHidden([]);ctx.log('Khôi phục các nút đã ẩn');setTimeout(()=>{app.relaunch();app.exit(0)},600);return{ok:true}});
const xaList=()=>ctx.cfg.xa.filter(x=>!ctx.cfg.only||x.id===ctx.cfg.only);
ctx.xaList=xaList;

const codesFile=()=>path.join(app.getPath('userData'),'codes.json');
const readCodes=()=>{try{return JSON.parse(fs.readFileSync(codesFile(),'utf8'))}catch(e){return{}}};
ctx.readCodes=readCodes;

const writeCodes=o=>fs.writeFileSync(codesFile(),JSON.stringify(o));
ctx.writeCodes=writeCodes;

const PRE=`(()=>{
if(!window.__dpCancelInit){window.__dpCancelInit=1;window.__dpCancelled=false;window.__dpAC=new Set();
 const of=window.fetch;window.fetch=function(u,i){if(window.__dpCancelled&&/dcs\\.vn|script\\.google|googleusercontent/.test(String(u&&u.url||u)))return Promise.reject(new DOMException('Đã hủy','AbortError'));
  const ac=new AbortController();window.__dpAC.add(ac);i=Object.assign({},i);const sg=i.signal;if(sg){if(sg.aborted)ac.abort();else sg.addEventListener('abort',()=>ac.abort())}i.signal=ac.signal;
  return of.call(this,u,i).finally(()=>window.__dpAC.delete(ac))};
 const addX=el=>{return;if(!el.style||el.style.position!=='fixed'||el.style.top!=='14px'||el.style.right!=='14px')return;
  if(window.__dpCancelled){el.remove();return}
  if(el.querySelector('[title^="Tắt"]'))return;
  const x=document.createElement('span');x.textContent='✕';x.title='Tắt / hủy lấy số liệu';x.style.cssText='position:absolute;top:3px;right:9px;cursor:pointer;font-size:17px;line-height:1;opacity:.85';
  x.onclick=e=>{e.stopPropagation();window.__dpCancelled=true;window.__dpAC.forEach(a=>{try{a.abort()}catch(_){}});document.querySelectorAll('div').forEach(d=>{if(d.style&&d.style.position==='fixed'&&d.style.top==='14px'&&d.style.right==='14px')d.remove()})};
  el.style.paddingRight='34px';el.appendChild(x)};
 new MutationObserver(()=>{document.querySelectorAll('div').forEach(d=>{if(d.style&&d.style.position==='fixed'&&d.style.top==='14px'&&d.style.right==='14px'&&true)addX(d)})}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});}
new MutationObserver(()=>{if(!window.__dpMonth)return;const ov=[...document.querySelectorAll('div')].find(d=>d.querySelector&&d.querySelector('select')&&d.querySelector('[data-ok]'));if(ov&&!ov.__auto){ov.__auto=1;const sel=ov.querySelector('select');const o=[...sel.options].find(x=>x.value===window.__dpMonth);if(o)sel.value=o.value;setTimeout(()=>{const b=ov.querySelector('[data-ok]');if(b)b.click()},300)}}).observe(document.documentElement,{childList:true,subtree:true});
window.__dpCancelled=false;})();\n`;
ctx.PRE=PRE;
};
