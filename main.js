const {app,BrowserWindow,WebContentsView,ipcMain,shell,net,powerSaveBlocker,Notification,Tray,Menu,dialog}=require('electron');
const {spawn}=require('child_process');
const os=require('os');
const path=require('path'),fs=require('fs');
let win,view;
/* không cho Windows/Chromium làm chậm hoặc dừng trang khi cửa sổ bị thu nhỏ xuống thanh tác vụ */
for(const s of ['disable-renderer-backgrounding','disable-background-timer-throttling','disable-backgrounding-occluded-windows'])app.commandLine.appendSwitch(s);
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const WIN_TITLE='Đồng bộ đảng phí 2026 - Phát triển bởi: Mr. Dũng - Phòng CĐS-CY VPTU Lào Cai';
const exeDir=app.isPackaged?path.dirname(process.execPath):__dirname;
function loadCfg(){
  for(const p of [path.join(exeDir,'config.json'),path.join(__dirname,'config.json')]){try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch(e){}}
  return {title:'ĐP',home:'https://gqtthc.dcs.vn/',only:'',xa:[]};
}
function mergeNewCfg(){try{const nf=path.join(exeDir,'config.new.json'),cf=path.join(exeDir,'config.json');if(!fs.existsSync(nf)||!fs.existsSync(cf))return;
  const n=JSON.parse(fs.readFileSync(nf,'utf8')),c=JSON.parse(fs.readFileSync(cf,'utf8'));
  const ids=new Set((c.xa||[]).map(x=>x.id));let ch=false;(n.xa||[]).forEach(x=>{if(!ids.has(x.id)){c.xa.push(x);ch=true}});
  /* cập nhật thông số các xã đã có (giữ nguyên "only") */
  (n.xa||[]).forEach(x=>{const i=c.xa.findIndex(y=>y.id===x.id);if(i>=0&&JSON.stringify(c.xa[i])!==JSON.stringify(x)){c.xa[i]=x;ch=true}});
  if(n.chung!==undefined&&c.chung!==n.chung){c.chung=n.chung;ch=true}
  if(ch)fs.writeFileSync(cf,JSON.stringify(c,null,2));fs.unlinkSync(nf)}catch(e){}}
mergeNewCfg();
const cfg=loadCfg();let BAR=cfg.only?110:178;
/* ===== Xã thêm bằng cách kéo nút "ĐP" từ website xã vào app (lưu trên máy này) ===== */
const extraFile=()=>path.join(app.getPath('userData'),'extra-xa.json');
const readExtra=()=>{try{const a=JSON.parse(fs.readFileSync(extraFile(),'utf8'));return Array.isArray(a)?a:[]}catch(e){return[]}};
const writeExtra=a=>fs.writeFileSync(extraFile(),JSON.stringify(a,null,2));
function loadExtra(){const have=new Set(cfg.xa.map(x=>x.id));readExtra().forEach(x=>{if(x&&x.id&&!have.has(x.id)){cfg.xa.push(x);have.add(x.id)}})}
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
    const dup=cfg.xa.find(x=>x.arg&&typeof x.arg==='object'&&(x.arg.src===C.src||x.arg.ep===C.ep));
    if(dup)return{err:'Xã này đã có nút "'+dup.label+'" trong app.'};
    const id='x_'+String(C.src).replace(/^website-/,'').replace(/-api$/,'').replace(/[^\w-]/g,'');
    const label='ĐP '+C.name.replace(/^(Đảng bộ|Đảng ủy)\s+(xã|phường|thị trấn)\s+/i,'').trim();
    const arg={pid:+C.pid||0,name:C.name,max:+C.max||0,k:C.k,src:C.src,m:true,ep:C.ep};if(C.cid)arg.cid=+C.cid;
    const ent={id,label,fn:'apiBookmarklet',file:'bm/xuanhoa.js',key:C.k,arg,extra:true};
    const a=readExtra().filter(x=>x.id!==id);a.push(ent);writeExtra(a);log('Thêm nút '+label+' (kéo từ website xã)');
    return{ok:true,label}}catch(err){return{err:String(err&&err.message||err)}}
}
ipcMain.handle('xa:add',(e,raw)=>addXaCore(raw));
ipcMain.on('xa:add:internal',(e,raw)=>{const r=addXaCore(raw);try{win.webContents.send('xaadded',r)}catch(_){}});
ipcMain.handle('xa:remove',(e,id)=>{const a=readExtra();if(!a.some(x=>x.id===id))return{err:'Chỉ gỡ được nút do bạn tự thêm.'};writeExtra(a.filter(x=>x.id!==id));const c=readCodes();delete c[id];writeCodes(c);return{ok:true}});
const hiddenFile=()=>path.join(app.getPath('userData'),'hidden-xa.json');
const readHidden=()=>{try{const a=JSON.parse(fs.readFileSync(hiddenFile(),'utf8'));return Array.isArray(a)?a:[]}catch(e){return[]}};
const writeHidden=a=>fs.writeFileSync(hiddenFile(),JSON.stringify(a));
loadExtra();
{const hd=new Set(readHidden());if(hd.size)cfg.xa=cfg.xa.filter(x=>!hd.has(x.id))}
/* Xóa nút xã: phải nhập đúng mã chung đã lưu. Nút tự thêm bị xóa hẳn; nút có sẵn chỉ bị ẩn trên máy này (khôi phục được) */
const passOk=p=>{const a=readCodes().__all;return !!a&&String(p||'').trim()===a};
ipcMain.handle('xa:delete',(e,{ids,pass})=>{
  if(!readCodes().__all)return{err:'Chưa lưu mã chung trong app nên chưa xóa được. Hãy nhập và lưu "Mã chung" trước.'};
  if(!passOk(pass))return{err:'Mật khẩu (mã chung) không đúng.'};
  ids=(ids||[]).filter(i=>typeof i==='string');if(!ids.length)return{err:'Chưa chọn nút nào.'};
  const ex=readExtra();writeExtra(ex.filter(x=>!ids.includes(x.id)));
  const exIds=new Set(ex.map(x=>x.id));const hid=new Set(readHidden());ids.forEach(i=>{if(!exIds.has(i))hid.add(i)});writeHidden([...hid]);
  const c=readCodes();ids.forEach(i=>{if(exIds.has(i)){delete c[i];delete c[i+'_api']}});writeCodes(c);
  cfg.xa=cfg.xa.filter(x=>!ids.includes(x.id));log('Đã xóa nút: '+ids.join(', '));
  return{ok:true,n:ids.length}});
ipcMain.handle('xa:restore',(e,pass)=>{
  if(!passOk(pass))return{err:'Mật khẩu (mã chung) không đúng.'};
  if(!readHidden().length)return{err:'Không có nút nào đang bị ẩn.'};
  writeHidden([]);log('Khôi phục các nút đã ẩn');setTimeout(()=>{app.relaunch();app.exit(0)},600);return{ok:true}});
const xaList=()=>cfg.xa.filter(x=>!cfg.only||x.id===cfg.only);
const codesFile=()=>path.join(app.getPath('userData'),'codes.json');
const readCodes=()=>{try{return JSON.parse(fs.readFileSync(codesFile(),'utf8'))}catch(e){return{}}};
const writeCodes=o=>fs.writeFileSync(codesFile(),JSON.stringify(o));
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
let helpWin=null;
ipcMain.handle('help:open',()=>{
  if(helpWin&&!helpWin.isDestroyed()){helpWin.show();helpWin.focus();return true}
  helpWin=new BrowserWindow({width:900,height:780,parent:win,title:'Hướng dẫn sử dụng - Đồng bộ đảng phí',icon:path.join(__dirname,'build','icon.png'),autoHideMenuBar:true,webPreferences:{sandbox:true}});
  helpWin.setMenuBarVisibility(false);helpWin.loadFile('huong-dan.html');
  helpWin.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//.test(url))shell.openExternal(url);return{action:'deny'}});
  helpWin.webContents.on('will-navigate',(e,u)=>{if(!u.startsWith('file:')){e.preventDefault();if(/^https:\/\//.test(u))shell.openExternal(u)}});
  helpWin.on('closed',()=>{helpWin=null});return true});
ipcMain.handle('bar',(e,h)=>{const n=Math.round(Math.min(Math.max(+h||0,60),520));if(n!==BAR){BAR=n;try{layout()}catch(_){}}return true});
function layout(){const [w,h]=win.getContentSize();view.setBounds({x:0,y:BAR,width:w,height:Math.max(100,h-BAR)})}
/* hộp xổ chọn đơn vị: một khung nổi nằm trên khung gqtthc (như danh sách chọn trong APK) */
let pop=null,popAt=0;
function popClose(){if(!pop)return;const p=pop;pop=null;try{win.contentView.removeChildView(p)}catch(_){}try{p.webContents.close()}catch(_){}popAt=Date.now();try{win.webContents.send('pop:closed')}catch(_){}}
ipcMain.handle('pop:open',(e,o)=>{
  if(pop){popClose();return true}
  if(Date.now()-popAt<300)return true;
  const items=(o&&o.items)||[],[ww,wh]=win.getContentSize();
  const w=Math.min(340,Math.max(240,ww-20)),h=Math.min(46+items.length*37+52,Math.max(160,wh-(o.y||0)-12));
  const x=Math.max(4,Math.min(Math.round(o.x||0),ww-w-4)),y=Math.round(o.y||0);
  pop=new WebContentsView({webPreferences:{preload:path.join(__dirname,'preload-pop.js'),contextIsolation:true,backgroundThrottling:false}});
  win.contentView.addChildView(pop);pop.setBounds({x,y,width:w,height:h});
  pop.webContents.loadFile('xapop.html');
  pop.webContents.once('did-finish-load',()=>{try{pop.webContents.send('pop:data',{items,checked:o.checked||[]});pop.webContents.focus()}catch(_){}});
  pop.webContents.on('blur',()=>setTimeout(()=>{if(pop&&!pop.webContents.isFocused())popClose()},120));
  return true});
ipcMain.on('pop:change',(e,ids)=>{try{win.webContents.send('pop:sel',ids)}catch(_){}});
ipcMain.on('pop:run',(e,id)=>{popClose();try{win.webContents.send('pop:run',id)}catch(_){}});
ipcMain.on('pop:close',()=>popClose());
function createWindow(){
  win=new BrowserWindow({width:1320,height:860,title:WIN_TITLE,icon:path.join(__dirname,'build','icon.png'),autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js'),backgroundThrottling:false}});
  win.setTitle(WIN_TITLE);win.on('close',e=>{try{const s=readSched();if(!quitting&&process.platform==='win32'&&(s.enabled||s.everyOn)){e.preventDefault();win.hide();setupTray();notify('Đồng bộ đảng phí','Ứng dụng vẫn chạy nền để tự động lấy số liệu. Bấm biểu tượng ở khay hệ thống (góc phải thanh tác vụ) để mở lại hoặc thoát hẳn.')}}catch(_){}});win.on('page-title-updated',e=>e.preventDefault());win.on('resize',()=>popClose());win.on('minimize',()=>popClose());
  win.loadFile('toolbar.html');
  /* mở lên phía trước và hiện giao diện (kể cả khi vừa tự khởi động lại sau cập nhật) */
  win.once('ready-to-show',()=>{try{if(win.isMinimized())win.restore();win.show();win.setAlwaysOnTop(true);win.focus();setTimeout(()=>{try{win.setAlwaysOnTop(false)}catch(_){}},1500)}catch(e){}});
  view=new WebContentsView({webPreferences:{partition:'persist:gqtthc',contextIsolation:true,backgroundThrottling:false}});
  win.contentView.addChildView(view);layout();win.on('resize',layout);
  view.webContents.on('will-navigate',(e,u)=>{if(!/^https?:/i.test(u))e.preventDefault()});
  /* kéo nút ĐP từ website xã thả thẳng vào khung gqtthc cũng được */
  const DROPJS="(()=>{if(window.__dpDrop)return;window.__dpDrop=1;const g=(dt,k)=>{try{return dt.getData(k)||''}catch(e){return''}};const t=dt=>g(dt,'text/uri-list')||g(dt,'URL')||g(dt,'text/plain');const ok=dt=>/apiBookmarklet|^javascript:/i.test(t(dt));addEventListener('dragover',e=>{if(e.dataTransfer&&(e.dataTransfer.types||[]).some(x=>/uri-list|text\\/plain|URL/.test(x))){e.preventDefault();e.stopPropagation()}},true);addEventListener('drop',e=>{const x=t(e.dataTransfer);if(!/apiBookmarklet|^javascript:/i.test(x))return;e.preventDefault();e.stopPropagation();console.log('\\u0001DPADD\\u0001'+x)},true)})();void 0";
  view.webContents.on('dom-ready',()=>{try{view.webContents.executeJavaScript(DROPJS)}catch(_){}});
  view.webContents.on('console-message',(e,level,message)=>{const m=String((e&&e.message)||message||'');if(m.charAt(0)!=='\u0001'||m.indexOf('\u0001DPADD\u0001')!==0)return;
    ipcMain.emit('xa:add:internal',null,m.slice(7))});
  view.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\/[^/]*dcs\.vn\//.test(url))view.webContents.loadURL(url);else shell.openExternal(url);return{action:'deny'}});
  view.webContents.loadURL(cfg.home);
  view.webContents.on('did-fail-load',(e,c,d)=>{if(c!==-3)win.webContents.send('status','Không mở được trang: '+d)});
}
ipcMain.handle('init',()=>({ver:app.getVersion(),admin:!cfg.only,title:cfg.title,xa:xaList().map(x=>({id:x.id,label:x.label,has:!!readCodes()[x.id],extra:!!x.extra}))}));
ipcMain.handle('nav',(e,a)=>{if(a==='home')view.webContents.loadURL(cfg.home);else if(a==='reload')view.webContents.reload()});
ipcMain.handle('reset',(e,id)=>{const c=readCodes();delete c[id];writeCodes(c);return true});
let _chOk=null,_chAt=0,_chT=false;
async function chungOk(){
  if(_chOk!==null&&Date.now()-_chAt<300000)return _chOk;
  let ok=false;
  try{const ac=new AbortController(),to=setTimeout(()=>ac.abort(),10000);
    const r=await net.fetch(cfg.chung,{signal:ac.signal,headers:{'User-Agent':'dp-dangphi'}});clearTimeout(to);
    const j=JSON.parse(await r.text());ok=!!(j&&j.ok&&j.name==='DP-CHUNG');_chT=ok&&j.tthc===true}catch(e){ok=false;_chT=false}
  _chOk=ok;_chAt=Date.now();log('DP-CHUNG '+(ok?'kết nối được: dùng mã chung qua DP-CHUNG':'KHÔNG kết nối được: gửi thẳng tới từng xã bằng mã đã lưu'));
  return ok;
}
async function doRun(id,code,api,month){
  const x=cfg.xa.find(v=>v.id===id);if(!x)return{err:'Không có cấu hình xã này'};
  const codes=readCodes();if(code){codes[id]=String(code).trim();}
  if(api){codes[id+'_api']=String(api).trim();}
  if(code||api)writeCodes(codes);
  const needApi=x.fn==='dpBookmarklet';
  const apiUrl=needApi?(codes[id+'_api']||(typeof x.arg==='string'?x.arg:'')):'';
  if(needApi&&!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(apiUrl))return{need:'api'};
  if(!x.extra&&!needApi&&!codes[id]&&codes.__all)codes[id]=codes.__all;
  if(!needApi&&!codes[id])return{need:'code'};
  const url=view.webContents.getURL();
  if(!/^https:\/\/gqtthc\.dcs\.vn\//.test(url))return{err:'Hãy mở và đăng nhập trang gqtthc.dcs.vn trước.'};
  let BM;try{BM=fs.readFileSync(path.join(__dirname,x.file),'utf8')}catch(err){return{err:'Thiếu file '+x.file}}
  const useChung=!!(!x.extra&&cfg.chung&&codes.__all&&await chungOk()&&(!needApi||_chT));
  if(useChung)codes[id]=codes.__all;
  if(!codes[id])return{need:'code'}; /* ĐP Tỉnh (tthc) chạy trực tiếp cần mật khẩu riêng của tthc, không dùng mã chung */
  /* ĐP Tỉnh Lào Cai (dpBookmarklet): qua DP-CHUNG thì thay địa chỉ Apps Script bằng DP-CHUNG, mật khẩu = mã chung */
  const arg=needApi?(useChung?cfg.chung:apiUrl):(useChung?Object.assign({},x.arg,{chung:cfg.chung}):x.arg);
  const js=PRE+'window.__dpMonth='+JSON.stringify(month||'')+';(()=>{window.prompt=()=>null;window.confirm=()=>true;try{localStorage.setItem('+JSON.stringify(x.key)+','+JSON.stringify(codes[id])+')}catch(e){}\n'+BM+'\n('+x.fn+')('+JSON.stringify(arg)+')})();void 0';
  try{await view.webContents.executeJavaScript(js);return{ok:true}}catch(err){return{err:String(err&&err.message||err)}}
}
const BOXJS="(()=>{const b=[...document.querySelectorAll('div')].find(d=>d.style&&d.style.position==='fixed'&&d.style.top==='14px'&&d.style.right==='14px');return {t:b?b.textContent.replace(/✕\\s*$/,'').trim().slice(0,160):null,c:!!window.__dpCancelled}})()";
let batchStop=false;
ipcMain.handle('run',(e,{id,code,api})=>doRun(id,code,api,''));
ipcMain.handle('code:all',(e,c)=>{const o=readCodes();if(c){o.__all=String(c).trim()}else delete o.__all;writeCodes(o);return !!o.__all});
ipcMain.handle('code:get',()=>readCodes().__all||'');
ipcMain.handle('code:hasAll',()=>!!readCodes().__all);
ipcMain.handle('stop',()=>{batchStop=true;return true});
/* chạy một xã ở chế độ lô: chờ tới khi có kết quả (✅ xong / ✕ lỗi / bị hủy) */
let lastActive=0;
/* Dừng hẳn mọi việc còn dang dở trong trang gqtthc (tải lại trang) để lần chạy bị lỗi/hủy không chạy ngầm tiếp */
async function killRun(){try{await new Promise(r=>{view.webContents.once('did-finish-load',r);view.webContents.reload();setTimeout(r,15000)});await new Promise(r=>setTimeout(r,800))}catch(_){}}
async function runWaitCore(id,month,code,api){const r=await runWaitCore0(id,month,code,api);recRes(id,r);if(r&&r.result&&r.result!=='done'){try{log('Dọn lần chạy dở ('+id+', '+r.result+'): tải lại trang gqtthc')}catch(_){}await killRun()}return r}
async function runWaitCore0(id,month,code,api){
  lastActive=Date.now();
  batchStop=false;
  try{await view.webContents.executeJavaScript("document.querySelectorAll('div').forEach(d=>{if(d.style&&d.style.position==='fixed'&&d.style.top==='14px'&&d.style.right==='14px')d.remove()});void 0")}catch(_){}
  const r=await doRun(id,code||null,api||null,month);
  if(!r.ok)return r;
  const t0=Date.now();let seen=false,lostAt=0;
  while(Date.now()-t0<8*60*1000){
    await new Promise(z=>setTimeout(z,2000));lastActive=Date.now();
    if(batchStop){try{log('Dừng lô ('+id+'): người dùng bấm Dừng; thu nhỏ='+win.isMinimized())}catch(_){}return{result:'stop'}}
    let st=null;try{st=await view.webContents.executeJavaScript(BOXJS)}catch(_){}
    if(!st)continue;
    if(st.c){try{log('Hủy ('+id+'): khung tiến độ bị bấm ✕ hoặc trang gqtthc tải lại; thu nhỏ='+win.isMinimized())}catch(_){}return{result:'cancel'}}          /* chỉ coi là hủy khi người dùng bấm ✕ */
    const t=st.t;
    if(t){seen=true;lostAt=0;
      if(t.startsWith('✅'))return{result:'done',msg:t};
      if(t.startsWith('✕'))return{result:'fail',msg:t};
    }else if(!seen){if(Date.now()-t0>40000)return{result:'fail',msg:'Không thấy tiến độ (chưa đăng nhập hoặc bị chặn?)'}}
    else{if(!lostAt)lostAt=Date.now();else if(Date.now()-lostAt>90000)return{result:'fail',msg:'Mất khung tiến độ quá 90 giây (trang gqtthc tải lại?)'}}
    /* khung tạm thời biến mất (thu nhỏ cửa sổ, tải lại trang…): cứ chờ tiếp */
  }
  return{result:'fail',msg:'Quá thời gian chờ (8 phút)'};
}

/* ===== Kết quả từng đơn vị (hiện trong hộp xổ chọn) ===== */
const resFile=()=>path.join(app.getPath('userData'),'ket-qua.json');
let RES={};try{RES=JSON.parse(fs.readFileSync(resFile(),'utf8'))||{}}catch(_){RES={}}
function recRes(id,r){
  if(!r||r.need)return;let ok,msg='';
  if(r.err){ok=false;msg=r.err}else if(r.result==='done'){ok=true;msg=r.msg||''}
  else if(r.result==='stop'){ok=false;msg='đã dừng'}else if(r.result==='cancel'){ok=false;msg='bị gián đoạn'}
  else if(r.result==='fail'){ok=false;msg=r.msg||'lỗi'}else return;
  const now=Date.now(),prev=RES[id]||{},prevOk=prev.okT||(prev.ok?prev.t:0)||0;
  /* okT = lần chạy THÀNH CÔNG gần nhất (giữ nguyên khi lần sau bị lỗi/dừng) — bảng tình trạng lấy mốc này */
  RES[id]={ok,t:now,okT:ok?now:prevOk,msg:String(msg).replace(/\s+/g,' ').slice(0,140)};
  try{fs.writeFileSync(resFile(),JSON.stringify(RES))}catch(_){}
  try{win.webContents.send('res',RES)}catch(_){}
}
ipcMain.handle('res:get',()=>RES);
const notify=(title,body)=>{try{if(Notification.isSupported())new Notification({title,body}).show()}catch(_){}};
/* webhook báo kết quả (tùy chọn): POST JSON {text, content} — dùng được với Slack/Discord/Make/Zalo bot trung gian */
const hookFile=()=>path.join(app.getPath('userData'),'hook.json');
const readHook=()=>{try{return JSON.parse(fs.readFileSync(hookFile(),'utf8')).url||''}catch(_){return''}};
async function hookPost(text){const u=readHook();if(!/^https:\/\//.test(u))return;try{await net.fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,content:text})})}catch(e){log('Webhook lỗi: '+String(e&&e.message||e).slice(0,60))}}
ipcMain.handle('hook:get',()=>readHook());
ipcMain.handle('hook:set',(e,u)=>{u=String(u||'').trim();if(u&&!/^https:\/\//.test(u))return{err:'Địa chỉ webhook phải bắt đầu bằng https://'};fs.writeFileSync(hookFile(),JSON.stringify({url:u}));return{ok:true}});
/* ===== Kiểm tra hệ thống / bảng tình trạng ===== */
async function fetchJson(u,ms){const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms||9000);try{const r=await net.fetch(u,{signal:ac.signal,headers:{'User-Agent':'dp-dangphi'}});return JSON.parse(await r.text())}finally{clearTimeout(t)}}
const parseVN=s=>{const k=/^(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)(?::(\d+))?/.exec(String(s||''));return k?new Date(+k[3],+k[2]-1,+k[1],+k[4],+k[5],+(k[6]||0)).getTime():0};
const epOf=x=>{const c=readCodes();return x.fn==='dpBookmarklet'?(c[x.id+'_api']||(typeof x.arg==='string'?x.arg:'')):((x.arg&&x.arg.ep)||'')};
async function healthCore(){
  let login=false;try{login=await view.webContents.executeJavaScript("!!localStorage.getItem('token')")}catch(_){}
  const codes=readCodes();
  const rs=await Promise.all(cfg.xa.map(async x=>{
    const o={id:x.id,label:x.label,ok:false,t:0,msg:'',code:!!(codes[x.id]||codes.__all)};
    /* mốc cập nhật lấy từ chính phần mềm: lần chạy thành công gần nhất đã ghi trên máy này */
    const lr=RES[x.id],lt=lr?(lr.okT||(lr.ok?lr.t:0)):0;if(lt){o.ok=true;o.t=lt;return o}
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
  let chung='';if(cfg.chung){try{const j=await fetchJson(cfg.chung+'?_='+Date.now(),9000);chung=j&&j.ok?('DP-CHUNG v'+(j.version||'?')+(j.tthc?' (có ĐP Tỉnh)':' (chưa hỗ trợ ĐP Tỉnh — cần triển khai bản mới)')):'DP-CHUNG báo lỗi'}catch(_){chung='DP-CHUNG không kết nối được'}}
  return {login,rs,chung};
}
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<60?m+' phút trước':m<1440?Math.round(m/60)+' giờ trước':Math.round(m/1440)+' ngày trước'};
const hhmm=t=>{const d=new Date(t),p=n=>String(n).padStart(2,'0');return p(d.getHours())+':'+p(d.getMinutes())+' '+p(d.getDate())+'/'+p(d.getMonth()+1)};
ipcMain.handle('health',async()=>{
  say('🩺 Đang kiểm tra hệ thống…');const h=await healthCore();
  const lines=[(h.login?'✅ Đã đăng nhập gqtthc':'✕ CHƯA đăng nhập gqtthc — hãy đăng nhập ở khung bên dưới')];
  if(h.chung)lines.push((/chưa hỗ trợ|lỗi|không kết nối/.test(h.chung)?'⚠ ':'✅ ')+h.chung);
  lines.push('');
  h.rs.forEach(o=>{const age=o.t?Date.now()-o.t:0;const ic=!o.ok?'✕':!o.t?'⚪':age<6*3600e3?'🟢':age<24*3600e3?'🟡':'🔴';
    lines.push(ic+' '+o.label+' — '+(o.ok?(o.t?hhmm(o.t)+' ('+ago(o.t)+')':o.msg):o.msg)+(o.code?'':' · thiếu mã đồng bộ'))});
  lines.push('','🟢 mới (<6 giờ)  🟡 <24 giờ  🔴 cũ >24 giờ  ✕ lỗi kết nối/địa chỉ  ⚪ chưa có dữ liệu');
  say('🩺 Kiểm tra xong');try{log('Kiểm tra hệ thống:\n'+lines.join('\n'))}catch(_){}
  await dialog.showMessageBox(win,{type:'info',title:'Tình trạng hệ thống',message:'Tình trạng đồng bộ các đơn vị',detail:lines.join('\n'),buttons:['Đóng']});return true});
/* cảnh báo dữ liệu cũ (>24 giờ): chạy nền mỗi giờ, nhắc tối đa 1 lần / 12 giờ */
let lastStaleWarn=0;
async function staleCheck(){try{if(Date.now()-lastStaleWarn<12*3600e3)return;const h=await healthCore();
  const old=h.rs.filter(o=>o.ok&&o.t&&Date.now()-o.t>24*3600e3).map(o=>o.label);
  if(old.length){lastStaleWarn=Date.now();notify('Dữ liệu đảng phí chưa cập nhật quá 24 giờ',old.slice(0,6).join(', ')+(old.length>6?'…':''));log('Cảnh báo dữ liệu cũ: '+old.join(', '))}}catch(_){}}
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
    if(!view||!/^https:\/\/gqtthc\.dcs\.vn\//.test(view.webContents.getURL()))return;
    const r=await view.webContents.executeJavaScript(KEEPJS);
    const hm=new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
    let text,bad=false;
    if(!r||r.s===0){text='Phiên gqtthc: chưa đăng nhập';bad=true}
    else if(r.s===401||r.s===403){text='Phiên gqtthc: ĐÃ HẾT HẠN — hãy đăng nhập lại';bad=true;
      if(Date.now()-lastExpWarn>3*3600e3){lastExpWarn=Date.now();notify('gqtthc đã hết phiên đăng nhập','Hãy mở ứng dụng và đăng nhập lại để các lượt tự động lấy được dữ liệu.');hookPost('⚠ gqtthc đã hết phiên đăng nhập');}}
    else{const left=r.exp?r.exp*1000-Date.now():0;
      text='Phiên gqtthc: '+(r.exp?(left>0?'token còn '+(left>=3600e3?Math.floor(left/3600e3)+' giờ ':'')+Math.round((left%3600e3)/60000)+' phút':'token đã quá hạn'):'không rõ hạn')+' · không hoạt động còn '+(r.i1?Math.max(0,Math.round((r.i1-Date.now())/60000)):'?')+' phút · giữ phiên lúc '+hm+(r.s>=200&&r.s<300?'':' (API '+r.s+')');
      if(r.exp&&left>0&&left<30*60e3&&Date.now()-lastExpWarn>3*3600e3){lastExpWarn=Date.now();notify('Phiên gqtthc sắp hết hạn','Còn dưới 30 phút. Hãy đăng nhập lại trong ứng dụng để lượt tự động không bị hụt.')}}
    /* token truy cập chỉ sống 1 giờ: sắp hết (<5 phút) thì tải lại trang gqtthc để trang tự dùng refresh_token (24 giờ) xin token mới — chỉ khi không đang chạy lấy số liệu */
    if(r&&r.exp&&r.exp*1000-Date.now()<5*60e3&&!manual&&!schedBusy&&Date.now()-lastActive>180000&&Date.now()-lastReload>15*60e3){
      lastReload=Date.now();log('Giữ phiên: token sắp hết hạn → tải lại trang gqtthc để làm mới token');
      try{await new Promise(z=>{view.webContents.once('did-finish-load',z);view.webContents.reload();setTimeout(z,20000)})}catch(_){}
      setTimeout(()=>keepAlive(true),6000)}
    sessInfo={text,bad};try{win.webContents.send('sess',sessInfo)}catch(_){}
    if(Date.now()-lastKeepLog>3600e3||lastKeepStatus!==(r&&r.s)){lastKeepLog=Date.now();lastKeepStatus=r&&r.s;log('Giữ phiên: HTTP '+(r&&r.s)+(r&&r.exp?' · token hết hạn lúc '+new Date(r.exp*1000).toLocaleString('vi-VN'):'')+(r&&r.i1?' · đồng hồ không-hoạt động '+(r.i1>r.i0?'đã reset':'KHÔNG reset')+' (còn '+Math.round((r.i1-Date.now())/60000)+' phút)':''))}
  }catch(_){}
}
ipcMain.handle('keep:get',()=>({on:readKeep().on,info:sessInfo}));
ipcMain.handle('keep:set',async(e,on)=>{fs.writeFileSync(keepFile(),JSON.stringify({on:!!on}));if(on)keepAlive(true);return true});
setTimeout(()=>keepAlive(),60e3);setInterval(()=>keepAlive(),10*60e3);
/* cấu hình từ xa: lấy config.json mới nhất trên GitHub (raw, không bị giới hạn API); áp dụng khi mở lại ứng dụng */
async function syncRemoteCfg(){try{
  const r=await net.fetch('https://raw.githubusercontent.com/'+REPO+'/main/config.json?_='+Date.now(),{headers:{'User-Agent':'dp-dangphi'}});if(!r.ok)return;
  const n=await r.json();if(!n||!Array.isArray(n.xa)||!n.xa.length)return;
  if(!n.xa.every(x=>x&&x.id&&x.file&&fs.existsSync(path.join(__dirname,x.file))))return;   /* chỉ nhận nếu bản app này có đủ bộ lấy số liệu */
  const cf=path.join(exeDir,'config.json'),c=JSON.parse(fs.readFileSync(cf,'utf8'));
  const need=n.xa.some(x=>{const y=(c.xa||[]).find(z=>z.id===x.id);return !y||JSON.stringify(y)!==JSON.stringify(x)})||(n.chung!==undefined&&n.chung!==c.chung);
  if(need){fs.writeFileSync(path.join(exeDir,'config.new.json'),JSON.stringify(n));log('Có cấu hình mới trên GitHub — sẽ áp dụng khi mở lại ứng dụng');say('ℹ Có cấu hình mới (địa chỉ/đơn vị). Hãy đóng và mở lại ứng dụng để áp dụng.')}
}catch(_){}}
setTimeout(syncRemoteCfg,25e3);setInterval(syncRemoteCfg,3*3600e3);
/* chạy nền ở khay hệ thống khi đang bật hẹn giờ / tự động */
let tray=null,quitting=false;app.on('before-quit',()=>{quitting=true});
const showWin=()=>{try{win.show();win.restore();win.focus()}catch(_){}};
function setupTray(){if(tray)return;app.getFileIcon(process.execPath).then(img=>{tray=new Tray(img);tray.setToolTip('Đồng bộ đảng phí — đang chạy nền');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'Mở cửa sổ',click:showWin},{label:'Thoát hẳn',click:()=>{quitting=true;app.quit()}}]));tray.on('click',showWin)}).catch(()=>{})}
ipcMain.handle('runWait',(e,{id,month,code,api})=>runWaitCore(id,month,code,api));

/* ===== Hẹn giờ tự chạy hằng ngày ===== */
const schedFile=()=>path.join(app.getPath('userData'),'schedule.json');
const readSched=()=>{try{return Object.assign({enabled:false,time:'06:00',ids:[],openAtLogin:false,last:'',everyOn:false,everyMins:60,lastEvery:0},JSON.parse(fs.readFileSync(schedFile(),'utf8')))}catch(e){return{enabled:false,time:'06:00',ids:[],openAtLogin:false,last:'',everyOn:false,everyMins:60,lastEvery:0}}};
const writeSched=o=>fs.writeFileSync(schedFile(),JSON.stringify(o));
let blockId=null,schedBusy=false;
function applySched(){const s=readSched();
  if((s.enabled||s.everyOn)&&blockId===null)blockId=powerSaveBlocker.start('prevent-app-suspension');
  if(!s.enabled&&!s.everyOn&&blockId!==null){powerSaveBlocker.stop(blockId);blockId=null}
  try{app.setLoginItemSettings({openAtLogin:!!s.openAtLogin})}catch(e){}}
const say=t=>{try{win.webContents.send('status',t)}catch(e){}};
const logFile=()=>path.join(app.getPath('userData'),'lich-chay.log');
const log=t=>{try{fs.appendFileSync(logFile(),new Date().toLocaleString('vi-VN')+'  '+t+'\n')}catch(e){}};
async function runBatchMain(ids,label){
  ids=[...ids].sort((a,b)=>(a==='tthc')-(b==='tthc')); /* xã chậm/hay lỗi (cấp tỉnh) chạy sau cùng */
  const now=new Date(),month=now.getFullYear()+'-'+(now.getMonth()+1);const res=[];
  /* tải lại trang để làm mới phiên, kiểm tra còn đăng nhập */
  try{await new Promise(r=>{view.webContents.once('did-finish-load',r);view.webContents.loadURL(cfg.home);setTimeout(r,20000)});await new Promise(r=>setTimeout(r,2500))}catch(e){}
  let tok=false;try{tok=await view.webContents.executeJavaScript("!!localStorage.getItem('token')")}catch(e){}
  if(!tok){const t='⚠ '+label+': chưa đăng nhập gqtthc — hãy đăng nhập lại trong ứng dụng';say(t);log(t);notify('Đồng bộ đảng phí — hết phiên đăng nhập','gqtthc đã hết phiên. Hãy mở ứng dụng và đăng nhập lại để lần chạy sau lấy được dữ liệu.');hookPost('⚠ '+t);try{win.show()}catch(_){}return false}
  batchStop=false;
  for(let i=0;i<ids.length;i++){
    const id=ids[i],x=cfg.xa.find(v=>v.id===id);if(!x)continue;
    say(label+' ('+(i+1)+'/'+ids.length+') '+x.label+'…');
    const r=await runWaitCore(id,month);
    if(r.need){res.push('⚠ '+x.label+' (chưa có mã)');continue}
    if(r.err){res.push('✕ '+x.label+': '+r.err);continue}
    if(r.result==='done')res.push('✅ '+x.label);else if(r.result==='stop'){res.push('■ '+x.label+' dừng');break}else if(r.result==='cancel'){res.push('↷ '+x.label+' bị gián đoạn (đã bỏ qua, chạy tiếp xã sau)')}else res.push('✕ '+x.label+': '+String(r.msg||'lỗi').slice(0,60));
  }
  const t=label+' xong: '+res.join(' · ');say(t);log(t);
  { const okN=res.filter(s=>s.startsWith('✅')).length,bad=res.filter(s=>!s.startsWith('✅'));
    notify('Đồng bộ đảng phí — '+okN+'/'+res.length+' thành công',bad.length?('Chưa xong: '+bad.join(' · ').slice(0,200)):'Tất cả đơn vị đã đồng bộ.');hookPost(t.slice(0,900)) }
  return true;
}
function tickSched(){
  const s=readSched();
  /* tự động lấy dữ liệu định kỳ: cứ mỗi N phút chạy các xã đã tích */
  if(s.everyOn&&!schedBusy&&s.ids.length&&Date.now()-lastActive>180000&&Date.now()-(s.lastEvery||0)>=Math.max(5,+s.everyMins||60)*60000){
    s.lastEvery=Date.now();writeSched(s);schedBusy=true;
    runBatchMain(s.ids,'🔁 Tự động').finally(()=>{schedBusy=false});return}if(!s.enabled||schedBusy||!s.ids.length)return;
  const now=new Date(),today=now.getFullYear()+'-'+(now.getMonth()+1)+'-'+now.getDate();
  const [h,mi]=s.time.split(':').map(Number);const due=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,mi);
  if(s.last===today||now<due||now-due>3*3600*1000)return; /* chỉ chạy trong 3 giờ sau giờ hẹn */
  schedBusy=true;s.last=today;writeSched(s);
  runBatchMain(s.ids,'⏰ Tự chạy').finally(()=>{schedBusy=false});
}
ipcMain.handle('sched:get',()=>readSched());
ipcMain.handle('sched:set',(e,o)=>{const old=readSched();const s=Object.assign({},old,{enabled:!!o.enabled,time:/^\d\d:\d\d$/.test(o.time)?o.time:'06:00',ids:Array.isArray(o.ids)?o.ids:[],openAtLogin:!!o.openAtLogin,everyOn:!!o.everyOn,everyMins:Math.min(1440,Math.max(5,parseInt(o.everyMins)||60))});if(!old.everyOn&&s.everyOn)s.lastEvery=Date.now();if((!old.enabled&&s.enabled)||old.time!==s.time)s.last='';writeSched(s);applySched();return s});
ipcMain.handle('sched:runnow',async()=>{const s=readSched();if(schedBusy||!s.ids.length)return false;schedBusy=true;try{await runBatchMain(s.ids,'⏰ Chạy thử')}finally{schedBusy=false}return true});
ipcMain.handle('log:add',(e,t)=>{log(String(t).slice(0,600));return true});
ipcMain.handle('sched:openlog',async()=>{const f=logFile();try{if(!fs.existsSync(f))fs.writeFileSync(f,'Nhật ký chạy ĐP (chưa có lần chạy nào)\n')}catch(err){}return await shell.openPath(f)||f});
ipcMain.handle('sched:log',()=>{try{return fs.readFileSync(logFile(),'utf8').split('\n').slice(-12).join('\n')}catch(e){return''}});
const REPO='laocai-cds/dp-app';
let latest=null;
let lastWhy='';
async function checkUpdate(){
  try{let j=null;
    /* 1) latest.json (tệp phát hành, không qua GitHub API nên không bị 403) */
    try{const rl=await net.fetch('https://github.com/'+REPO+'/releases/latest/download/latest.json',{headers:{'User-Agent':'dp-dangphi'}});
      if(rl.ok){const lj=await rl.json();if(lj&&/^\d+\.\d+\.\d+$/.test(String(lj.ver||''))){
        const tag='v'+lj.ver,base='https://github.com/'+REPO+'/releases/download/'+tag+'/',ev=process.versions.electron;
        const names=['DP-DangPhi-win32-x64.zip','app-electron-'+ev+'.asar.bin','dp-config.json'];
        const ok=await Promise.all(names.map(async n=>{try{return (await net.fetch(base+n,{method:'HEAD',headers:{'User-Agent':'dp-dangphi'}})).ok}catch(_){return false}}));
        j={tag_name:tag,html_url:'https://github.com/'+REPO+'/releases/tag/'+tag,assets:names.filter((n,i)=>ok[i]).map(n=>({name:n,browser_download_url:base+n}))};lastWhy=''}}}catch(_){}
    if(!j)try{const r=await net.fetch('https://api.github.com/repos/'+REPO+'/releases/latest',{headers:{'User-Agent':'dp-dangphi'}});if(r.ok)j=await r.json();else lastWhy='GitHub API trả mã '+r.status}catch(e){lastWhy=String(e&&e.message||e).slice(0,50)}
    if(!j){/* API bị giới hạn (403/429) → dùng trang releases/latest (không bị giới hạn) */
      let tag='';
      for(const u of ['https://github.com/'+REPO+'/releases.atom','https://github.com/'+REPO+'/releases/latest']){
        try{const r2=await net.fetch(u,{headers:{'User-Agent':'dp-dangphi'}});const fin=/\/releases\/tag\/(v[\d.]+)/.exec(r2.url||'');if(fin){tag=fin[1];break}
          const tx=await r2.text();const all=[...tx.matchAll(/\/releases\/tag\/(v\d+\.\d+\.\d+)/g)].map(z=>z[1]);
          if(all.length){all.sort((p,q)=>{const x=p.slice(1).split('.').map(Number),y=q.slice(1).split('.').map(Number);for(let i=0;i<3;i++)if(x[i]!==y[i])return y[i]-x[i];return 0});tag=all[0];break}
        }catch(e2){lastWhy=String(e2&&e2.message||e2).slice(0,50)}
      }
      const mm=tag?[0,tag]:null;if(!mm){try{win.webContents.send('latestver','')}catch(_){}return 'err'}
      const base='https://github.com/'+REPO+'/releases/download/'+mm[1]+'/',ev=process.versions.electron;
      const ex=async n=>{try{const h=await net.fetch(base+n,{method:'HEAD',headers:{'User-Agent':'dp-dangphi'}});return h.ok}catch(_){return false}};
      const names=['DP-DangPhi-win32-x64.zip','app-electron-'+ev+'.asar.bin','dp-config.json'],ok=await Promise.all(names.map(ex));
      j={tag_name:mm[1],html_url:'https://github.com/'+REPO+'/releases/tag/'+mm[1],assets:names.filter((n,i)=>ok[i]).map(n=>({name:n,browser_download_url:base+n}))};lastWhy='';
    }
const nv=String(j.tag_name||'').replace(/^v/,''),cv=app.getVersion();try{win.webContents.send('latestver',nv)}catch(_){}
    const cmp=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return(x[i]||0)>(y[i]||0)?1:-1}return 0};
    const as=(j.assets||[]).find(a=>/DP-DangPhi-win32-x64\.zip$/i.test(a.name));
    const lt=(j.assets||[]).find(a=>{const k=/^app-electron-([\d.]+)\.asar\.bin$/.exec(a.name);return k&&k[1]===process.versions.electron});
    const cf=(j.assets||[]).find(a=>a.name==='dp-config.json');
    if(nv&&cmp(nv,cv)>0){latest={ver:nv,url:j.html_url,asset:as&&as.browser_download_url||'',light:lt&&lt.browser_download_url||'',cfg:cf&&cf.browser_download_url||''};win.webContents.send('update',latest);prefetch();maybeAuto();return 'new'}
    lastWhy='';return 'same'}catch(e){lastWhy=String(e&&e.message||e).slice(0,50);try{win.webContents.send('latestver','')}catch(_){}return 'err'}
}
const updFile=()=>path.join(app.getPath('userData'),'update.json');
const readUpd=()=>{try{return Object.assign({auto:true,mins:15},JSON.parse(fs.readFileSync(updFile(),'utf8')))}catch(e){return{auto:true,mins:15}}};
let updTimer=null;
function armUpd(){if(updTimer)clearInterval(updTimer);const u=readUpd();const mins=Math.min(1440,Math.max(5,+u.mins||30));updTimer=setInterval(checkUpdate,mins*60*1000)}
async function maybeAuto(){const u=readUpd();if(!u.auto||!latest)return;
  if(schedBusy||Date.now()-lastActive<180000){log('Có bản '+latest.ver+' nhưng đang chạy lấy số liệu — hoãn cập nhật tự động');return}
  log('Tự động cập nhật lên bản '+latest.ver);say('🔄 Tự động cập nhật lên bản '+latest.ver+'…');const r=await installUpdate();if(r&&r.err){log('Tự cập nhật lỗi: '+r.err);say('✕ Tự cập nhật lỗi: '+r.err)}}
ipcMain.handle('upd:get',()=>readUpd());
ipcMain.handle('upd:set',(e,o)=>{const u={auto:!!o.auto,mins:Math.min(1440,Math.max(5,parseInt(o.mins)||30))};fs.writeFileSync(updFile(),JSON.stringify(u));armUpd();if(u.auto)checkUpdate();return u});
ipcMain.handle('update:check',async()=>{const r=await checkUpdate();return {r,cur:app.getVersion(),why:lastWhy}});
async function dl(url,file,label,silent){
  const r=await net.fetch(url,{headers:{'User-Agent':'dp-dangphi'}});if(!r.ok)throw new Error('Không tải được ('+r.status+')');
  const total=+r.headers.get('content-length')||0;let got=0,last=0;const out=fs.createWriteStream(file);let werr=null;out.on('error',e=>{werr=e});
  const rd=r.body.getReader();for(;;){const {done,value}=await rd.read();if(done)break;out.write(Buffer.from(value));got+=value.length;if(total&&Date.now()-last>800){last=Date.now();try{win.webContents.send('updprog',Math.round(got*100/total))}catch(_){}if(!silent)say(label+': '+Math.round(got*100/total)+'% ('+(got/1048576).toFixed(1)+'/'+(total/1048576).toFixed(1)+' MB)')}}
  await new Promise(z=>out.end(z));if(werr)throw werr;try{win.webContents.send('updprog',100)}catch(_){}return got;
}
let pre={ver:'',file:'',cfg:'',done:false,busy:null};
const PRE_CFG=()=>path.join(os.tmpdir(),'dp-config-new.json');
async function prefetch(){
  if(!latest||!app.isPackaged||process.platform!=='win32'||(!latest.asset&&!latest.light))return;
  if(pre.ver===latest.ver&&(pre.busy||pre.done))return;
  const L=latest,light=!!L.light;pre={ver:L.ver,file:'',cfg:'',done:false,busy:null};const mine=pre;
  mine.busy=(async()=>{try{
    const f=path.join(os.tmpdir(),light?'dp-app-new.bin':'dp-update.zip');
    const n=await dl(light?L.light:L.asset,f,'',true);
    if(n<(light?20000:5e6))throw new Error('file tải về quá nhỏ ('+n+' byte)');
    if(light&&L.cfg){try{await dl(L.cfg,PRE_CFG(),'',true);mine.cfg=PRE_CFG()}catch(e){}}
    mine.file=f;mine.done=true;log('Đã tải sẵn bản '+L.ver+' (chạy ngầm), sẵn sàng cài');try{win.webContents.send('predl',L.ver)}catch(_){}
  }catch(e){log('Tải ngầm bản '+L.ver+' lỗi: '+String(e&&e.message||e).slice(0,80));mine.ver=''}finally{mine.busy=null}})();
  return mine.busy;
}
const PS_UI=['$ver=$args[0]','$f=$null;$lb=$null',
  'function W($s){$e=(Get-Date).AddSeconds($s);while((Get-Date) -lt $e){try{[System.Windows.Forms.Application]::DoEvents()}catch{};Start-Sleep -Milliseconds 80}}',
  'function T($m){try{if($lb){$lb.Text=$m;[System.Windows.Forms.Application]::DoEvents()}}catch{}}',
  'try{Add-Type -AssemblyName System.Windows.Forms;Add-Type -AssemblyName System.Drawing;$f=New-Object System.Windows.Forms.Form;$f.Text="DP-DangPhi - Cập nhật";$f.ClientSize=New-Object System.Drawing.Size(420,90);$f.StartPosition="CenterScreen";$f.TopMost=$true;$f.ControlBox=$false;$f.FormBorderStyle="FixedDialog";$lb=New-Object System.Windows.Forms.Label;$lb.Location=New-Object System.Drawing.Point(14,12);$lb.Size=New-Object System.Drawing.Size(392,26);$lb.Font=New-Object System.Drawing.Font("Segoe UI",10);$lb.Text="Đang cài đặt bản mới…";$f.Controls.Add($lb);$pb=New-Object System.Windows.Forms.ProgressBar;$pb.Style="Marquee";$pb.MarqueeAnimationSpeed=25;$pb.Location=New-Object System.Drawing.Point(14,48);$pb.Size=New-Object System.Drawing.Size(392,22);$f.Controls.Add($pb);$f.Show();[System.Windows.Forms.Application]::DoEvents()}catch{$f=$null;$lb=$null}'];
async function installUpdate(){
  if(!latest||(!latest.asset&&!latest.light))return{err:'Chưa có file cập nhật trong Release (đợi GitHub Actions đóng gói xong hoặc tải tay từ trang Releases).'};
  if(!app.isPackaged||process.platform!=='win32')return{err:'Chỉ cập nhật tự động khi chạy bản .exe trên Windows.'};
  try{
    const ps=path.join(os.tmpdir(),'dp-update.ps1');
    let args,mode;
    if(latest.light){
      mode='nhẹ';
      const asar=path.join(os.tmpdir(),'dp-app-new.bin');
      if(pre.ver===latest.ver&&pre.busy){say('Đang hoàn tất tải ngầm bản '+latest.ver+'…');await pre.busy}
      if(pre.ver===latest.ver&&pre.done&&pre.file&&fs.existsSync(pre.file)){
        if(pre.file!==asar)fs.copyFileSync(pre.file,asar);
        if(pre.cfg&&fs.existsSync(pre.cfg)){try{fs.copyFileSync(pre.cfg,path.join(exeDir,'config.new.json'))}catch(e){}}
      }else{
        const n=await dl(latest.light,asar,'Đang tải bản '+latest.ver+' (cập nhật nhẹ)');
        if(n<20000)return{err:'File tải về quá nhỏ ('+n+' byte), có thể bị lỗi.'};
        if(latest.cfg){try{await dl(latest.cfg,path.join(exeDir,'config.new.json'),'Đang tải cấu hình')}catch(e){}}
      }
      fs.writeFileSync(ps,'\ufeff'+[
        'param($pid1,$asar,$dest,$exe)',
        ...PS_UI,
        '$log=Join-Path $env:TEMP "dp-update.log"',
        'function L($m){try{Add-Content -Path $log -Value ((Get-Date -Format "HH:mm:ss")+" "+$m)}catch{}}',
        'L ("bat dau; dich="+$dest)',
        'try{Wait-Process -Id $pid1 -Timeout 60 -ErrorAction SilentlyContinue}catch{}',
        'T "Đang cài đặt bản mới, vui lòng chờ…";W 2',
        '$t=Join-Path $dest "resources\\app.asar"',
        '$ok=$false',
        'for($i=1;$i -le 20 -and -not $ok;$i++){try{Copy-Item -LiteralPath $asar -Destination $t -Force -ErrorAction Stop;$ok=$true}catch{L ("lan "+$i+": "+$_.Exception.Message);T ("Đang chờ phần mềm cũ đóng hẳn… ("+$i+")");W 2}}',
        'if($ok){L "DA CHEP";T "Cài xong. Đang mở lại phần mềm…";W 1}else{L "THAT BAI: khong chep duoc app.asar";T "Không chép được file mới. Hãy cài đè bằng DP-DangPhi-Setup.exe";W 5}',
        'Start-Process -FilePath $exe',
        'try{if($f){$f.Close()}}catch{}'
      ].join('\r\n'),'utf8');
      args=[String(process.pid),asar,exeDir,process.execPath];
    }else{
      mode='đầy đủ';
      const zip=path.join(os.tmpdir(),'dp-update.zip');
      if(pre.ver===latest.ver&&pre.busy){say('Đang hoàn tất tải ngầm bản '+latest.ver+'…');await pre.busy}
      if(pre.ver===latest.ver&&pre.done&&pre.file&&fs.existsSync(pre.file)){
        if(pre.file!==zip)fs.copyFileSync(pre.file,zip);
      }else{
        const n=await dl(latest.asset,zip,'Đang tải bản '+latest.ver);
        if(n<5e6)return{err:'File tải về quá nhỏ ('+n+' byte), có thể bị lỗi.'};
      }
      fs.writeFileSync(ps,'\ufeff'+[
        'param($pid1,$zip,$dest,$exe)',
        ...PS_UI,
        'try{Wait-Process -Id $pid1 -Timeout 60 -ErrorAction SilentlyContinue}catch{}',
        'T "Đang cài đặt bản mới, vui lòng chờ…";W 2',
        '$tmp=Join-Path $env:TEMP "dp-update-x"',
        'Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue',
        'Expand-Archive -Path $zip -DestinationPath $tmp -Force',
        '$src=Join-Path $tmp "DP-DangPhi-win32-x64"',
        'Copy-Item (Join-Path $src "config.json") (Join-Path $dest "config.new.json") -Force -ErrorAction SilentlyContinue',
        'robocopy $src $dest /E /XF config.json /NFL /NDL /NJH /NJS /NP | Out-Null',
        'Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue',
        'T "Cài xong. Đang mở lại phần mềm…";W 1',
        'Start-Process -FilePath $exe',
        'try{if($f){$f.Close()}}catch{}'
      ].join('\r\n'),'utf8');
      args=[String(process.pid),zip,exeDir,process.execPath];
    }
    spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',ps,...args],{detached:true,stdio:'ignore',windowsHide:true}).unref();
    say('Đã tải xong (cập nhật '+mode+'), ứng dụng sẽ tự khởi động lại bản mới…');setTimeout(()=>app.quit(),800);return{ok:true};
  }catch(e){return{err:String(e&&e.message||e)}}
}
ipcMain.handle('update:install',()=>installUpdate());
ipcMain.handle('open',(e,u)=>{if(/^https:\/\/github\.com\/laocai-cds\//.test(u))shell.openExternal(u)});
function announceUpdated(){try{const f=path.join(app.getPath('userData'),'lastver.txt');let old='';try{old=fs.readFileSync(f,'utf8').trim()}catch(_){}
  const cur=app.getVersion();if(old&&old!==cur){setTimeout(()=>{say('✅ Đã cập nhật xong: bản '+old+' → bản '+cur+'. Ứng dụng đã khởi động lại bằng phiên bản mới.');log('Đã cập nhật '+old+' → '+cur)},2500)}
  if(old!==cur)fs.writeFileSync(f,cur)}catch(e){}}
/* Biểu tượng (shortcut) cũ trỏ tới bản khác của ứng dụng → sửa lại cho trỏ đúng bản đang chạy (Desktop, Start, thanh tác vụ) */
function fixShortcuts(){
  if(!app.isPackaged||process.platform!=='win32')return;
  try{
    const exe=process.execPath,base=path.basename(exe).toLowerCase(),dirs=[];
    try{dirs.push(app.getPath('desktop'))}catch(_){}
    try{dirs.push(path.join(process.env.PUBLIC||'C:\\Users\\Public','Desktop'))}catch(_){}
    const ap=process.env.APPDATA||'';
    if(ap){dirs.push(path.join(ap,'Microsoft','Windows','Start Menu','Programs'));dirs.push(path.join(ap,'Microsoft','Internet Explorer','Quick Launch','User Pinned','TaskBar'))}
    const seen=new Set();let n=0;
    const walk=(d,depth)=>{let es=[];try{es=fs.readdirSync(d,{withFileTypes:true})}catch(_){return}
      for(const e of es){const p=path.join(d,e.name);
        if(e.isDirectory()){if(depth<1)walk(p,depth+1);continue}
        if(!/\.lnk$/i.test(e.name)||seen.has(p))continue;seen.add(p);
        try{const s=shell.readShortcutLink(p);const t=String(s.target||'');
          if(t&&path.basename(t).toLowerCase()===base&&t.toLowerCase()!==exe.toLowerCase()){
            shell.writeShortcutLink(p,'update',{target:exe,cwd:path.dirname(exe),icon:exe,iconIndex:0});n++;log('Sửa biểu tượng: '+p+' | '+t+' → '+exe)}}catch(_){}}};
    dirs.forEach(d=>walk(d,0));
    if(n)setTimeout(()=>say('✅ Đã sửa '+n+' biểu tượng cũ để mở đúng bản mới này.'),4000);
  }catch(e){}
}
function reportUpdLog(){try{const f=path.join(os.tmpdir(),'dp-update.log');if(!fs.existsSync(f))return;const t=fs.readFileSync(f,'utf8');fs.unlinkSync(f);log('Nhật ký cập nhật: '+t.replace(/\r?\n/g,' | ').slice(0,500));if(/THAT BAI/.test(t))setTimeout(()=>say('⚠ Cập nhật lần trước KHÔNG chép được file mới ('+(t.split('\n').filter(x=>/lan /.test(x)).pop()||'').slice(0,120)+'). Hãy cài đè bằng DP-DangPhi-Setup.exe.'),3000)}catch(_){}}
app.whenReady().then(()=>{createWindow();announceUpdated();reportUpdLog();fixShortcuts();applySched();setInterval(tickSched,30000);armUpd();win.webContents.on('did-finish-load',()=>setTimeout(checkUpdate,1500))});
app.on('window-all-closed',()=>app.quit());
