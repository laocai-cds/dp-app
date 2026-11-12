const {app,BrowserWindow,WebContentsView,ipcMain,shell,net,powerSaveBlocker}=require('electron');
const path=require('path'),fs=require('fs');
let win,view;
const exeDir=app.isPackaged?path.dirname(process.execPath):__dirname;
function loadCfg(){
  for(const p of [path.join(exeDir,'config.json'),path.join(__dirname,'config.json')]){try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch(e){}}
  return {title:'ĐP',home:'https://gqtthc.dcs.vn/',only:'',xa:[]};
}
const cfg=loadCfg();const BAR=cfg.only?150:250;
const xaList=()=>cfg.xa.filter(x=>!cfg.only||x.id===cfg.only);
const codesFile=()=>path.join(app.getPath('userData'),'codes.json');
const readCodes=()=>{try{return JSON.parse(fs.readFileSync(codesFile(),'utf8'))}catch(e){return{}}};
const writeCodes=o=>fs.writeFileSync(codesFile(),JSON.stringify(o));
const PRE=`(()=>{
if(!window.__dpCancelInit){window.__dpCancelInit=1;window.__dpCancelled=false;window.__dpAC=new Set();
 const of=window.fetch;window.fetch=function(u,i){if(window.__dpCancelled&&/dcs\\.vn|script\\.google|googleusercontent/.test(String(u&&u.url||u)))return Promise.reject(new DOMException('Đã hủy','AbortError'));
  const ac=new AbortController();window.__dpAC.add(ac);i=Object.assign({},i);const sg=i.signal;if(sg){if(sg.aborted)ac.abort();else sg.addEventListener('abort',()=>ac.abort())}i.signal=ac.signal;
  return of.call(this,u,i).finally(()=>window.__dpAC.delete(ac))};
 const addX=el=>{if(!el.style||el.style.position!=='fixed'||el.style.top!=='14px'||el.style.right!=='14px')return;
  if(window.__dpCancelled){el.remove();return}
  if(el.querySelector('[title^="Tắt"]'))return;
  const x=document.createElement('span');x.textContent='✕';x.title='Tắt / hủy lấy số liệu';x.style.cssText='position:absolute;top:3px;right:9px;cursor:pointer;font-size:17px;line-height:1;opacity:.85';
  x.onclick=e=>{e.stopPropagation();window.__dpCancelled=true;window.__dpAC.forEach(a=>{try{a.abort()}catch(_){}});document.querySelectorAll('div').forEach(d=>{if(d.style&&d.style.position==='fixed'&&d.style.top==='14px'&&d.style.right==='14px')d.remove()})};
  el.style.paddingRight='34px';el.appendChild(x)};
 new MutationObserver(()=>{document.querySelectorAll('div').forEach(d=>{if(d.style&&d.style.position==='fixed'&&d.style.top==='14px'&&d.style.right==='14px'&&true)addX(d)})}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});}
new MutationObserver(()=>{if(!window.__dpMonth)return;const ov=[...document.querySelectorAll('div')].find(d=>d.querySelector&&d.querySelector('select')&&d.querySelector('[data-ok]'));if(ov&&!ov.__auto){ov.__auto=1;const sel=ov.querySelector('select');const o=[...sel.options].find(x=>x.value===window.__dpMonth);if(o)sel.value=o.value;setTimeout(()=>{const b=ov.querySelector('[data-ok]');if(b)b.click()},300)}}).observe(document.documentElement,{childList:true,subtree:true});
window.__dpCancelled=false;})();\n`;
function layout(){const [w,h]=win.getContentSize();view.setBounds({x:0,y:BAR,width:w,height:Math.max(100,h-BAR)})}
function createWindow(){
  win=new BrowserWindow({width:1320,height:860,title:cfg.title,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.js')}});
  win.loadFile('toolbar.html');
  view=new WebContentsView({webPreferences:{partition:'persist:gqtthc',contextIsolation:true}});
  win.contentView.addChildView(view);layout();win.on('resize',layout);
  view.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\/[^/]*dcs\.vn\//.test(url))view.webContents.loadURL(url);else shell.openExternal(url);return{action:'deny'}});
  view.webContents.loadURL(cfg.home);
  view.webContents.on('did-fail-load',(e,c,d)=>{if(c!==-3)win.webContents.send('status','Không mở được trang: '+d)});
}
ipcMain.handle('init',()=>({admin:!cfg.only,title:cfg.title,xa:xaList().map(x=>({id:x.id,label:x.label,has:!!readCodes()[x.id]}))}));
ipcMain.handle('nav',(e,a)=>{if(a==='home')view.webContents.loadURL(cfg.home);else if(a==='reload')view.webContents.reload()});
ipcMain.handle('reset',(e,id)=>{const c=readCodes();delete c[id];writeCodes(c);return true});
async function doRun(id,code,api,month){
  const x=cfg.xa.find(v=>v.id===id);if(!x)return{err:'Không có cấu hình xã này'};
  const codes=readCodes();if(code){codes[id]=String(code).trim();}
  if(api){codes[id+'_api']=String(api).trim();}
  if(code||api)writeCodes(codes);
  const needApi=x.fn==='dpBookmarklet';
  const apiUrl=needApi?(codes[id+'_api']||(typeof x.arg==='string'?x.arg:'')):'';
  if(needApi&&!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(apiUrl))return{need:'api'};
  if(!codes[id])return{need:'code'};
  const url=view.webContents.getURL();
  if(!/^https:\/\/gqtthc\.dcs\.vn\//.test(url))return{err:'Hãy mở và đăng nhập trang gqtthc.dcs.vn trước.'};
  let BM;try{BM=fs.readFileSync(path.join(__dirname,x.file),'utf8')}catch(err){return{err:'Thiếu file '+x.file}}
  const arg=needApi?apiUrl:x.arg;
  const js=PRE+'window.__dpMonth='+JSON.stringify(month||'')+';(()=>{window.prompt=()=>null;window.confirm=()=>true;try{localStorage.setItem('+JSON.stringify(x.key)+','+JSON.stringify(codes[id])+')}catch(e){}\n'+BM+'\n('+x.fn+')('+JSON.stringify(arg)+')})();void 0';
  try{await view.webContents.executeJavaScript(js);return{ok:true}}catch(err){return{err:String(err&&err.message||err)}}
}
const BOXJS="(()=>{const b=[...document.querySelectorAll('div')].find(d=>d.style&&d.style.position==='fixed'&&d.style.top==='14px'&&d.style.right==='14px');return b?b.textContent.trim().slice(0,160):null})()";
let batchStop=false;
ipcMain.handle('run',(e,{id,code,api})=>doRun(id,code,api,''));
ipcMain.handle('stop',()=>{batchStop=true;return true});
/* chạy một xã ở chế độ lô: chờ tới khi có kết quả (✅ xong / ✕ lỗi / bị hủy) */
async function runWaitCore(id,month){
  batchStop=false;
  try{await view.webContents.executeJavaScript("document.querySelectorAll('div').forEach(d=>{if(d.style&&d.style.position==='fixed'&&d.style.top==='14px'&&d.style.right==='14px')d.remove()});void 0")}catch(_){}
  const r=await doRun(id,null,null,month);
  if(!r.ok)return r;
  const t0=Date.now();let seen=false,miss=0;
  while(Date.now()-t0<8*60*1000){
    await new Promise(z=>setTimeout(z,2000));
    if(batchStop)return{result:'stop'};
    let t=null;try{t=await view.webContents.executeJavaScript(BOXJS)}catch(_){}
    if(t){seen=true;miss=0;
      if(t.startsWith('✅'))return{result:'done',msg:t};
      if(t.startsWith('✕'))return{result:'fail',msg:t};
    }else{miss++;if(seen&&miss>=2)return{result:'cancel'};if(!seen&&Date.now()-t0>25000)return{result:'fail',msg:'Không thấy tiến độ (chưa đăng nhập hoặc bị chặn?)'}}
  }
  return{result:'fail',msg:'Quá thời gian chờ (8 phút)'};
}
ipcMain.handle('runWait',(e,{id,month})=>runWaitCore(id,month));

/* ===== Hẹn giờ tự chạy hằng ngày ===== */
const schedFile=()=>path.join(app.getPath('userData'),'schedule.json');
const readSched=()=>{try{return Object.assign({enabled:false,time:'06:00',ids:[],openAtLogin:false,last:''},JSON.parse(fs.readFileSync(schedFile(),'utf8')))}catch(e){return{enabled:false,time:'06:00',ids:[],openAtLogin:false,last:''}}};
const writeSched=o=>fs.writeFileSync(schedFile(),JSON.stringify(o));
let blockId=null,schedBusy=false;
function applySched(){const s=readSched();
  if(s.enabled&&blockId===null)blockId=powerSaveBlocker.start('prevent-app-suspension');
  if(!s.enabled&&blockId!==null){powerSaveBlocker.stop(blockId);blockId=null}
  try{app.setLoginItemSettings({openAtLogin:!!s.openAtLogin})}catch(e){}}
const say=t=>{try{win.webContents.send('status',t)}catch(e){}};
const logFile=()=>path.join(app.getPath('userData'),'lich-chay.log');
const log=t=>{try{fs.appendFileSync(logFile(),new Date().toLocaleString('vi-VN')+'  '+t+'\n')}catch(e){}};
async function runBatchMain(ids,label){
  const now=new Date(),month=now.getFullYear()+'-'+(now.getMonth()+1);const res=[];
  /* tải lại trang để làm mới phiên, kiểm tra còn đăng nhập */
  try{await new Promise(r=>{view.webContents.once('did-finish-load',r);view.webContents.loadURL(cfg.home);setTimeout(r,20000)});await new Promise(r=>setTimeout(r,2500))}catch(e){}
  let tok=false;try{tok=await view.webContents.executeJavaScript("!!localStorage.getItem('token')")}catch(e){}
  if(!tok){const t='⚠ '+label+': chưa đăng nhập gqtthc — hãy đăng nhập lại trong ứng dụng';say(t);log(t);return false}
  batchStop=false;
  for(let i=0;i<ids.length;i++){
    const id=ids[i],x=cfg.xa.find(v=>v.id===id);if(!x)continue;
    say(label+' ('+(i+1)+'/'+ids.length+') '+x.label+'…');
    const r=await runWaitCore(id,month);
    if(r.need){res.push('⚠ '+x.label+' (chưa có mã)');continue}
    if(r.err){res.push('✕ '+x.label+': '+r.err);continue}
    if(r.result==='done')res.push('✅ '+x.label);else if(r.result==='stop'||r.result==='cancel'){res.push('■ '+x.label+' hủy');break}else res.push('✕ '+x.label+': '+String(r.msg||'lỗi').slice(0,60));
  }
  const t=label+' xong: '+res.join(' · ');say(t);log(t);return true;
}
function tickSched(){
  const s=readSched();if(!s.enabled||schedBusy||!s.ids.length)return;
  const now=new Date(),today=now.getFullYear()+'-'+(now.getMonth()+1)+'-'+now.getDate();
  const [h,mi]=s.time.split(':').map(Number);const due=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,mi);
  if(s.last===today||now<due||now-due>3*3600*1000)return; /* chỉ chạy trong 3 giờ sau giờ hẹn */
  schedBusy=true;s.last=today;writeSched(s);
  runBatchMain(s.ids,'⏰ Tự chạy').finally(()=>{schedBusy=false});
}
ipcMain.handle('sched:get',()=>readSched());
ipcMain.handle('sched:set',(e,o)=>{const old=readSched();const s=Object.assign({},old,{enabled:!!o.enabled,time:/^\d\d:\d\d$/.test(o.time)?o.time:'06:00',ids:Array.isArray(o.ids)?o.ids:[],openAtLogin:!!o.openAtLogin});if((!old.enabled&&s.enabled)||old.time!==s.time)s.last='';writeSched(s);applySched();return s});
ipcMain.handle('sched:runnow',async()=>{const s=readSched();if(schedBusy||!s.ids.length)return false;schedBusy=true;try{await runBatchMain(s.ids,'⏰ Chạy thử')}finally{schedBusy=false}return true});
ipcMain.handle('log:add',(e,t)=>{log(String(t).slice(0,600));return true});
ipcMain.handle('sched:openlog',async()=>{const f=logFile();try{if(!fs.existsSync(f))fs.writeFileSync(f,'Nhật ký chạy ĐP (chưa có lần chạy nào)\n')}catch(err){}return await shell.openPath(f)||f});
ipcMain.handle('sched:log',()=>{try{return fs.readFileSync(logFile(),'utf8').split('\n').slice(-12).join('\n')}catch(e){return''}});
const REPO='laocai-cds/dp-app';
async function checkUpdate(){
  try{const r=await net.fetch('https://api.github.com/repos/'+REPO+'/releases/latest',{headers:{'User-Agent':'dp-dangphi'}});if(!r.ok)return;
    const j=await r.json();const nv=String(j.tag_name||'').replace(/^v/,''),cv=app.getVersion();
    const cmp=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return(x[i]||0)>(y[i]||0)?1:-1}return 0};
    if(nv&&cmp(nv,cv)>0)win.webContents.send('update',{ver:nv,url:j.html_url})}catch(e){}
}
ipcMain.handle('open',(e,u)=>{if(/^https:\/\/github\.com\/laocai-cds\//.test(u))shell.openExternal(u)});
app.whenReady().then(()=>{createWindow();applySched();setInterval(tickSched,30000);win.webContents.on('did-finish-load',()=>setTimeout(checkUpdate,1500))});
app.on('window-all-closed',()=>app.quit());
