/* Khay hệ thống, hẹn giờ chạy hằng ngày, nhật ký lịch chạy */
const {app,ipcMain,shell,powerSaveBlocker,Tray,Menu}=require('electron');
const path=require('path');
const fs=require('fs');
module.exports=function init(ctx){
ctx.setupTray=setupTray;ctx.applySched=applySched;ctx.tickSched=tickSched;
let tray=null;ctx.quitting=false;ctx.trayTold=false;app.on('before-quit',()=>{ctx.quitting=true});
const showWin=()=>{try{ctx.win.show();ctx.win.restore();ctx.win.focus()}catch(_){}};
ctx.showWin=showWin;

function setupTray(){if(tray)return;app.getFileIcon(process.execPath).then(img=>{tray=new Tray(img);tray.setToolTip('Đồng bộ đảng phí — đang chạy nền (bấm để mở)');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'Mở cửa sổ',click:showWin},{label:'Thoát hẳn',click:()=>{ctx.quitting=true;app.quit()}}]));tray.on('click',showWin)}).catch(()=>{})}
ipcMain.handle('runWait',(e,{id,month,code,api})=>ctx.runWaitCore(id,month,code,api));

/* ===== Hẹn giờ tự chạy hằng ngày ===== */
const schedFile=()=>path.join(app.getPath('userData'),'schedule.json');
const readSched=()=>{try{return Object.assign({enabled:false,time:'06:00',ids:[],openAtLogin:false,last:'',everyOn:false,everyMins:60,lastEvery:0},JSON.parse(fs.readFileSync(schedFile(),'utf8')))}catch(e){return{enabled:false,time:'06:00',ids:[],openAtLogin:false,last:'',everyOn:false,everyMins:60,lastEvery:0}}};
ctx.readSched=readSched;

const writeSched=o=>fs.writeFileSync(schedFile(),JSON.stringify(o));
let blockId=null;ctx.schedBusy=false;
function applySched(){const s=readSched();
  if((s.enabled||s.everyOn)&&blockId===null)blockId=powerSaveBlocker.start('prevent-app-suspension');
  if(!s.enabled&&!s.everyOn&&blockId!==null){powerSaveBlocker.stop(blockId);blockId=null}
  try{app.setLoginItemSettings({openAtLogin:!!s.openAtLogin})}catch(e){}}
const say=t=>{try{ctx.win.webContents.send('status',t)}catch(e){}};
ctx.say=say;

const logFile=()=>path.join(app.getPath('userData'),'lich-chay.log');
const log=t=>{try{fs.appendFileSync(logFile(),new Date().toLocaleString('vi-VN')+'  '+t+'\n')}catch(e){}};
ctx.log=log;

async function runBatchMain(ids,label){
  ids=[...ids].sort((a,b)=>(a==='tthc')-(b==='tthc')); /* xã chậm/hay lỗi (cấp tỉnh) chạy sau cùng */
  const now=new Date(),month=now.getFullYear()+'-'+(now.getMonth()+1);const res=[];
  /* tải lại trang để làm mới phiên, kiểm tra còn đăng nhập */
  try{await new Promise(r=>{ctx.view.webContents.once('did-finish-load',r);ctx.view.webContents.loadURL(ctx.cfg.home);setTimeout(r,20000)});await new Promise(r=>setTimeout(r,2500))}catch(e){}
  let tok=false;try{tok=await ctx.view.webContents.executeJavaScript("!!localStorage.getItem('token')")}catch(e){}
  if(!tok){const t='⚠ '+label+': chưa đăng nhập gqtthc — hãy đăng nhập lại trong ứng dụng';say(t);log(t);ctx.notify('Đồng bộ đảng phí — hết phiên đăng nhập','gqtthc đã hết phiên. Hãy mở ứng dụng và đăng nhập lại để lần chạy sau lấy được dữ liệu.');ctx.hookPost('⚠ '+t);try{ctx.win.show()}catch(_){}return false}
  ctx.batchStop=false;
  const rm=ctx.readRM();
  if(rm.mode==='par'&&ids.length>1){
    const out=await ctx.runPool(ids,month,rm.conc,(d,t,l)=>say(label+' ('+d+'/'+t+') song song · '+l));
    ids.forEach(id=>{const x=ctx.cfg.xa.find(v=>v.id===id);if(x)res.push(ctx.fmtRes(x.label,out[id]))});
  }else
  for(let i=0;i<ids.length;i++){
    const id=ids[i],x=ctx.cfg.xa.find(v=>v.id===id);if(!x)continue;
    say(label+' ('+(i+1)+'/'+ids.length+') '+x.label+'…');
    const r=await ctx.runWaitCore(id,month);
    if(r.need){res.push('⚠ '+x.label+' (chưa có mã)');continue}
    if(r.err){res.push('✕ '+x.label+': '+r.err);continue}
    if(r.result==='done')res.push('✅ '+x.label);else if(r.result==='stop'){res.push('■ '+x.label+' dừng');break}else if(r.result==='cancel'){res.push('↷ '+x.label+' bị gián đoạn (đã bỏ qua, chạy tiếp xã sau)')}else res.push('✕ '+x.label+': '+String(r.msg||'lỗi').slice(0,60));
  }
  const t=label+' xong: '+res.join(' · ');say(t);log(t);
  { const okN=res.filter(s=>s.startsWith('✅')).length,bad=res.filter(s=>!s.startsWith('✅'));
    ctx.notify('Đồng bộ đảng phí — '+okN+'/'+res.length+' thành công',bad.length?('Chưa xong: '+bad.join(' · ').slice(0,200)):'Tất cả đơn vị đã đồng bộ.');ctx.hookPost(t.slice(0,900)) }
  return true;
}
function tickSched(){
  const s=readSched();
  /* tự động lấy dữ liệu định kỳ: cứ mỗi N phút chạy các xã đã tích */
  if(s.everyOn&&!ctx.schedBusy&&s.ids.length&&Date.now()-ctx.lastActive>180000&&Date.now()-(s.lastEvery||0)>=Math.max(5,+s.everyMins||60)*60000){
    s.lastEvery=Date.now();writeSched(s);ctx.schedBusy=true;
    runBatchMain(s.ids,'🔁 Tự động').finally(()=>{ctx.schedBusy=false});return}if(!s.enabled||ctx.schedBusy||!s.ids.length)return;
  const now=new Date(),today=now.getFullYear()+'-'+(now.getMonth()+1)+'-'+now.getDate();
  const [h,mi]=s.time.split(':').map(Number);const due=new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,mi);
  if(s.last===today||now<due||now-due>3*3600*1000)return; /* chỉ chạy trong 3 giờ sau giờ hẹn */
  ctx.schedBusy=true;s.last=today;writeSched(s);
  runBatchMain(s.ids,'⏰ Tự chạy').finally(()=>{ctx.schedBusy=false});
}
ipcMain.handle('sched:get',()=>readSched());
ipcMain.handle('sched:set',(e,o)=>{const old=readSched();const s=Object.assign({},old,{enabled:!!o.enabled,time:/^\d\d:\d\d$/.test(o.time)?o.time:'06:00',ids:Array.isArray(o.ids)?o.ids:[],openAtLogin:!!o.openAtLogin,everyOn:!!o.everyOn,everyMins:Math.min(1440,Math.max(5,parseInt(o.everyMins)||60))});if(!old.everyOn&&s.everyOn)s.lastEvery=Date.now();if((!old.enabled&&s.enabled)||old.time!==s.time)s.last='';writeSched(s);applySched();return s});
ipcMain.handle('sched:runnow',async()=>{const s=readSched();if(ctx.schedBusy||!s.ids.length)return false;ctx.schedBusy=true;try{await runBatchMain(s.ids,'⏰ Chạy thử')}finally{ctx.schedBusy=false}return true});
ipcMain.handle('log:add',(e,t)=>{log(String(t).slice(0,600));return true});
ipcMain.handle('sched:openlog',async()=>{const f=logFile();try{if(!fs.existsSync(f))fs.writeFileSync(f,'Nhật ký chạy ĐP (chưa có lần chạy nào)\n')}catch(err){}return await shell.openPath(f)||f});
ipcMain.handle('sched:log',()=>{try{return fs.readFileSync(logFile(),'utf8').split('\n').slice(-12).join('\n')}catch(e){return''}});
const REPO='laocai-cds/dp-app';
ctx.REPO=REPO;
};
