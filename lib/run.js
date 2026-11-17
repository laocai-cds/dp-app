/* Chạy lấy số liệu: một xã, tuần tự, song song */
const {app,BrowserWindow,ipcMain,net}=require('electron');
const path=require('path');
const fs=require('fs');
const ROOT=path.join(__dirname,'..');
module.exports=function init(ctx){
ctx.runWaitCore=runWaitCore;ctx.runPool=runPool;
let _chOk=null,_chAt=0,_chT=false;
async function chungOk(){
  if(_chOk!==null&&Date.now()-_chAt<300000)return _chOk;
  let ok=false;
  try{const ac=new AbortController(),to=setTimeout(()=>ac.abort(),10000);
    const r=await net.fetch(ctx.cfg.chung,{signal:ac.signal,headers:{'User-Agent':'dp-dangphi'}});clearTimeout(to);
    const j=JSON.parse(await r.text());ok=!!(j&&j.ok&&j.name==='DP-CHUNG');_chT=ok&&j.tthc===true}catch(e){ok=false;_chT=false}
  _chOk=ok;_chAt=Date.now();ctx.log('DP-CHUNG '+(ok?'kết nối được: dùng mã chung qua DP-CHUNG':'KHÔNG kết nối được: gửi thẳng tới từng xã bằng mã đã lưu'));
  return ok;
}
async function doRun(id,code,api,month,wc){
  wc=wc||ctx.view.webContents;
  const x=ctx.cfg.xa.find(v=>v.id===id);if(!x)return{err:'Không có cấu hình xã này'};
  const codes=ctx.readCodes();if(code){codes[id]=String(code).trim();}
  if(api){codes[id+'_api']=String(api).trim();}
  if(code||api)ctx.writeCodes(codes);
  const needApi=x.fn==='dpBookmarklet';
  const apiUrl=needApi?(codes[id+'_api']||(typeof x.arg==='string'?x.arg:'')):'';
  if(needApi&&!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(apiUrl))return{need:'api'};
  if(!x.extra&&!needApi&&!codes[id]&&codes.__all)codes[id]=codes.__all;
  if(!needApi&&!codes[id])return{need:'code'};
  const url=wc.getURL();
  if(!/^https:\/\/gqtthc\.dcs\.vn\//.test(url))return{err:'Hãy mở và đăng nhập trang gqtthc.dcs.vn trước.'};
  let BM;try{BM=fs.readFileSync(path.join(ROOT,ctx.bmFile(x)),'utf8')}catch(err){return{err:'Thiếu file '+ctx.bmFile(x)}}
  const useChung=!!(!x.extra&&ctx.cfg.chung&&codes.__all&&await chungOk()&&(!needApi||_chT));
  if(useChung)codes[id]=codes.__all;
  if(!codes[id])return{need:'code'}; /* ĐP Tỉnh (tthc) chạy trực tiếp cần mật khẩu riêng của tthc, không dùng mã chung */
  /* ĐP Tỉnh Lào Cai (dpBookmarklet): qua DP-CHUNG thì thay địa chỉ Apps Script bằng DP-CHUNG, mật khẩu = mã chung */
  const arg=needApi?(useChung?ctx.cfg.chung:apiUrl):(useChung?Object.assign({},x.arg,{chung:ctx.cfg.chung}):x.arg);
  const js=ctx.PRE+'window.__dpMonth='+JSON.stringify(month||'')+';(()=>{window.prompt=()=>null;window.confirm=()=>true;try{localStorage.setItem('+JSON.stringify(x.key)+','+JSON.stringify(codes[id])+')}catch(e){}\n'+BM+'\n('+x.fn+')('+JSON.stringify(arg)+')})();void 0';
  try{await wc.executeJavaScript(js);return{ok:true}}catch(err){return{err:String(err&&err.message||err)}}
}
const BOXJS="(()=>{const b=[...document.querySelectorAll('div')].find(d=>d.style&&d.style.position==='fixed'&&d.style.top==='14px'&&d.style.right==='14px');return {t:b?b.textContent.replace(/✕\\s*$/,'').trim().slice(0,160):null,c:!!window.__dpCancelled}})()";
ctx.batchStop=false;
ipcMain.handle('run',(e,{id,code,api})=>doRun(id,code,api,''));
ipcMain.handle('code:all',(e,c)=>{const o=ctx.readCodes();if(c){o.__all=String(c).trim()}else delete o.__all;ctx.writeCodes(o);return !!o.__all});
ipcMain.handle('code:get',()=>ctx.readCodes().__all||'');
ipcMain.handle('code:hasAll',()=>!!ctx.readCodes().__all);
ipcMain.handle('stop',()=>{ctx.batchStop=true;return true});
/* chạy một xã ở chế độ lô: chờ tới khi có kết quả (✅ xong / ✕ lỗi / bị hủy) */
ctx.lastActive=0;
/* Dừng hẳn mọi việc còn dang dở trong trang gqtthc (tải lại trang) để lần chạy bị lỗi/hủy không chạy ngầm tiếp */
async function killRun(wc){wc=wc||ctx.view.webContents;try{await new Promise(r=>{wc.once('did-finish-load',r);wc.reload();setTimeout(r,15000)});await new Promise(r=>setTimeout(r,800))}catch(_){}}
async function runWaitCore(id,month,code,api,wc,noReset){const r=await runWaitCore0(id,month,code,api,wc,noReset);ctx.recRes(id,r);if(r&&r.result&&r.result!=='done'){try{ctx.log('Dọn lần chạy dở ('+id+', '+r.result+'): tải lại trang gqtthc')}catch(_){}await killRun(wc)}return r}
async function runWaitCore0(id,month,code,api,wc,noReset){
  wc=wc||ctx.view.webContents;
  ctx.lastActive=Date.now();
  if(!noReset)ctx.batchStop=false;
  try{await wc.executeJavaScript("document.querySelectorAll('div').forEach(d=>{if(d.style&&d.style.position==='fixed'&&d.style.top==='14px'&&d.style.right==='14px')d.remove()});void 0")}catch(_){}
  const r=await doRun(id,code||null,api||null,month,wc);
  if(!r.ok)return r;
  const t0=Date.now();let seen=false,lostAt=0;
  while(Date.now()-t0<8*60*1000){
    await new Promise(z=>setTimeout(z,2000));ctx.lastActive=Date.now();
    if(ctx.batchStop){try{ctx.log('Dừng lô ('+id+'): người dùng bấm Dừng; thu nhỏ='+ctx.win.isMinimized())}catch(_){}return{result:'stop'}}
    let st=null;try{st=await wc.executeJavaScript(BOXJS)}catch(_){}
    if(!st)continue;
    if(st.c){try{ctx.log('Hủy ('+id+'): khung tiến độ bị bấm ✕ hoặc trang gqtthc tải lại; thu nhỏ='+ctx.win.isMinimized())}catch(_){}return{result:'cancel'}}          /* chỉ coi là hủy khi người dùng bấm ✕ */
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

/* ===== Chế độ chạy nhiều đơn vị: lần lượt (mặc định) hoặc song song ===== */
const rmFile=()=>path.join(app.getPath('userData'),'che-do-chay.json');
const readRM=()=>{let o={};try{o=JSON.parse(fs.readFileSync(rmFile(),'utf8'))||{}}catch(_){}return{mode:'seq',conc:Math.min(5,Math.max(2,parseInt(o.conc)||3))}};
ctx.readRM=readRM;

ipcMain.handle('rm:get',()=>readRM());
ipcMain.handle('rm:set',(e,o)=>{const v={mode:'seq',conc:Math.min(5,Math.max(2,parseInt(o&&o.conc)||3))};try{fs.writeFileSync(rmFile(),JSON.stringify(v))}catch(_){}return v});
/* cửa sổ ẩn dùng chung phiên đăng nhập gqtthc: mỗi cửa sổ có hộp tiến độ riêng nên chạy song song không đè lên nhau */
async function openWorker(){
  const w=new BrowserWindow({show:false,width:1200,height:800,webPreferences:{partition:'persist:gqtthc',contextIsolation:true,backgroundThrottling:false}});
  w.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  w.webContents.on('will-navigate',(e,u)=>{if(!/^https?:/i.test(u))e.preventDefault()});
  try{await new Promise(r=>{w.webContents.once('did-finish-load',r);w.webContents.loadURL(ctx.cfg.home);setTimeout(r,20000)});await new Promise(r=>setTimeout(r,2500))}catch(_){}
  let tok=false;try{tok=await w.webContents.executeJavaScript("!!localStorage.getItem('token')")}catch(_){}
  if(!tok){try{w.destroy()}catch(_){}return null}
  return w;
}
/* chạy song song tối đa `conc` xã cùng lúc; ĐP Tỉnh (tthc) nặng nên chạy riêng sau cùng. Trả về {id: kết quả} */
async function runPool(ids,month,conc,onProg){
  const light=ids.filter(i=>i!=='tthc'),heavy=ids.filter(i=>i==='tthc'),out={},total=ids.length;let next=0,done=0;
  const note=l=>{try{onProg&&onProg(done,total,l)}catch(_){}};
  const n=Math.min(Math.max(2,conc||3),light.length);
  if(n>=2){
    note('đang mở '+n+' luồng chạy…');
    const ws=(await Promise.all(Array.from({length:n},()=>openWorker()))).filter(Boolean);
    if(ws.length<2){ws.forEach(w=>{try{w.destroy()}catch(_){}});ctx.log('Song song: không mở được đủ luồng (chưa đăng nhập?) → chạy lần lượt');heavy.unshift(...light);light.length=0}
    else{
      ctx.batchStop=false;
      await Promise.all(ws.map(async w=>{
        while(!ctx.batchStop&&next<light.length){
          const id=light[next++],x=ctx.cfg.xa.find(v=>v.id===id);if(!x){done++;continue}
          note('đang chạy song song: '+x.label);
          let r;try{r=await runWaitCore(id,month,null,null,w.webContents,true)}catch(err){r={err:String(err&&err.message||err)}}
          out[id]=r;done++;note('xong '+x.label);
        }
      }));
      ws.forEach(w=>{try{w.destroy()}catch(_){}});
      light.slice(next).forEach(id=>{out[id]={result:'stop'}});
    }
  }else heavy.unshift(...light);
  for(const id of heavy){
    if(ctx.batchStop){out[id]={result:'stop'};continue}
    const x=ctx.cfg.xa.find(v=>v.id===id);if(!x){done++;continue}
    note('đang chạy: '+x.label);
    let r;try{r=await runWaitCore(id,month,null,null,null,true)}catch(err){r={err:String(err&&err.message||err)}}
    out[id]=r;done++;note('xong '+x.label);
  }
  return out;
}
const fmtRes=(label,r)=>{r=r||{};
  if(r.need)return'⚠ '+label+': chưa có mã — bấm riêng nút xã này một lần để nhập mã';
  if(r.err)return'✕ '+label+': '+r.err;
  if(r.result==='done')return'✅ '+label;
  if(r.result==='stop')return'■ '+label+': đã dừng';
  if(r.result==='cancel')return'↷ '+label+': bị gián đoạn, đã bỏ qua';
  return'✕ '+label+': '+String(r.msg||'lỗi').slice(0,70)};
ctx.fmtRes=fmtRes;

ipcMain.handle('runPar',async(e,{ids,month,conc})=>{
  ids=(Array.isArray(ids)?ids:[]).filter(i=>ctx.cfg.xa.some(v=>v.id===i));
  const out=await runPool(ids,month||'',conc,(d,t,l)=>{try{ctx.win.webContents.send('parprog',{d,t,l})}catch(_){}});
  const res={};ids.forEach(id=>{res[id]=fmtRes((ctx.cfg.xa.find(v=>v.id===id)||{}).label||id,out[id])});
  return{res,raw:out};
});
};
