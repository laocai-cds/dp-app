/* Kiểm tra và cài đặt bản cập nhật, sửa biểu tượng */
const {app,ipcMain,shell,net}=require('electron');
const {spawn}=require('child_process');
const os=require('os');
const path=require('path');
const fs=require('fs');
module.exports=function init(ctx){
ctx.announceUpdated=announceUpdated;ctx.reportUpdLog=reportUpdLog;ctx.fixShortcuts=fixShortcuts;ctx.armUpd=armUpd;ctx.checkUpdate=checkUpdate;
let latest=null;
let lastWhy='';
async function checkUpdate(){
  try{let j=null;
    /* 1) latest.json (tệp phát hành, không qua GitHub API nên không bị 403) */
    try{const rl=await net.fetch('https://github.com/'+ctx.REPO+'/releases/latest/download/latest.json',{headers:{'User-Agent':'dp-dangphi'}});
      if(rl.ok){const lj=await rl.json();if(lj&&/^\d+\.\d+\.\d+$/.test(String(lj.ver||''))){
        const tag='v'+lj.ver,base='https://github.com/'+ctx.REPO+'/releases/download/'+tag+'/',ev=process.versions.electron;
        const names=['DP-DangPhi-win32-x64.zip','app-electron-'+ev+'.asar.bin','dp-config.json'];
        const ok=await Promise.all(names.map(async n=>{try{return (await net.fetch(base+n,{method:'HEAD',headers:{'User-Agent':'dp-dangphi'}})).ok}catch(_){return false}}));
        j={tag_name:tag,html_url:'https://github.com/'+ctx.REPO+'/releases/tag/'+tag,assets:names.filter((n,i)=>ok[i]).map(n=>({name:n,browser_download_url:base+n}))};lastWhy=''}}}catch(_){}
    if(!j)try{const r=await net.fetch('https://api.github.com/repos/'+ctx.REPO+'/releases/latest',{headers:{'User-Agent':'dp-dangphi'}});if(r.ok)j=await r.json();else lastWhy='GitHub API trả mã '+r.status}catch(e){lastWhy=String(e&&e.message||e).slice(0,50)}
    if(!j){/* API bị giới hạn (403/429) → dùng trang releases/latest (không bị giới hạn) */
      let tag='';
      for(const u of ['https://github.com/'+ctx.REPO+'/releases.atom','https://github.com/'+ctx.REPO+'/releases/latest']){
        try{const r2=await net.fetch(u,{headers:{'User-Agent':'dp-dangphi'}});const fin=/\/releases\/tag\/(v[\d.]+)/.exec(r2.url||'');if(fin){tag=fin[1];break}
          const tx=await r2.text();const all=[...tx.matchAll(/\/releases\/tag\/(v\d+\.\d+\.\d+)/g)].map(z=>z[1]);
          if(all.length){all.sort((p,q)=>{const x=p.slice(1).split('.').map(Number),y=q.slice(1).split('.').map(Number);for(let i=0;i<3;i++)if(x[i]!==y[i])return y[i]-x[i];return 0});tag=all[0];break}
        }catch(e2){lastWhy=String(e2&&e2.message||e2).slice(0,50)}
      }
      const mm=tag?[0,tag]:null;if(!mm){try{ctx.win.webContents.send('latestver','')}catch(_){}return 'err'}
      const base='https://github.com/'+ctx.REPO+'/releases/download/'+mm[1]+'/',ev=process.versions.electron;
      const ex=async n=>{try{const h=await net.fetch(base+n,{method:'HEAD',headers:{'User-Agent':'dp-dangphi'}});return h.ok}catch(_){return false}};
      const names=['DP-DangPhi-win32-x64.zip','app-electron-'+ev+'.asar.bin','dp-config.json'],ok=await Promise.all(names.map(ex));
      j={tag_name:mm[1],html_url:'https://github.com/'+ctx.REPO+'/releases/tag/'+mm[1],assets:names.filter((n,i)=>ok[i]).map(n=>({name:n,browser_download_url:base+n}))};lastWhy='';
    }
const nv=String(j.tag_name||'').replace(/^v/,''),cv=app.getVersion();try{ctx.win.webContents.send('latestver',nv)}catch(_){}
    const cmp=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return(x[i]||0)>(y[i]||0)?1:-1}return 0};
    const as=(j.assets||[]).find(a=>/DP-DangPhi-win32-x64\.zip$/i.test(a.name));
    const lt=(j.assets||[]).find(a=>{const k=/^app-electron-([\d.]+)\.asar\.bin$/.exec(a.name);return k&&k[1]===process.versions.electron});
    const cf=(j.assets||[]).find(a=>a.name==='dp-config.json');
    if(nv&&cmp(nv,cv)>0){latest={ver:nv,url:j.html_url,asset:as&&as.browser_download_url||'',light:lt&&lt.browser_download_url||'',cfg:cf&&cf.browser_download_url||''};ctx.win.webContents.send('update',latest);prefetch();maybeAuto();return 'new'}
    lastWhy='';return 'same'}catch(e){lastWhy=String(e&&e.message||e).slice(0,50);try{ctx.win.webContents.send('latestver','')}catch(_){}return 'err'}
}
const updFile=()=>path.join(app.getPath('userData'),'update.json');
const readUpd=()=>{try{return Object.assign({auto:true,mins:15},JSON.parse(fs.readFileSync(updFile(),'utf8')))}catch(e){return{auto:true,mins:15}}};
let updTimer=null;
function armUpd(){if(updTimer)clearInterval(updTimer);const u=readUpd();const mins=Math.min(1440,Math.max(5,+u.mins||30));updTimer=setInterval(checkUpdate,mins*60*1000)}
async function maybeAuto(){const u=readUpd();if(!u.auto||!latest)return;
  if(ctx.schedBusy||Date.now()-ctx.lastActive<180000){ctx.log('Có bản '+latest.ver+' nhưng đang chạy lấy số liệu — hoãn cập nhật tự động');return}
  ctx.log('Tự động cập nhật lên bản '+latest.ver);ctx.say('🔄 Tự động cập nhật lên bản '+latest.ver+'…');const r=await installUpdate();if(r&&r.err){ctx.log('Tự cập nhật lỗi: '+r.err);ctx.say('✕ Tự cập nhật lỗi: '+r.err)}}
ipcMain.handle('upd:get',()=>readUpd());
ipcMain.handle('upd:set',(e,o)=>{const u={auto:!!o.auto,mins:Math.min(1440,Math.max(5,parseInt(o.mins)||30))};fs.writeFileSync(updFile(),JSON.stringify(u));armUpd();if(u.auto)checkUpdate();return u});
ipcMain.handle('update:check',async()=>{const r=await checkUpdate();return {r,cur:app.getVersion(),why:lastWhy}});
async function dl(url,file,label,silent){
  const r=await net.fetch(url,{headers:{'User-Agent':'dp-dangphi'}});if(!r.ok)throw new Error('Không tải được ('+r.status+')');
  const total=+r.headers.get('content-length')||0;let got=0,last=0;const out=fs.createWriteStream(file);let werr=null;out.on('error',e=>{werr=e});
  const rd=r.body.getReader();for(;;){const {done,value}=await rd.read();if(done)break;out.write(Buffer.from(value));got+=value.length;if(total&&Date.now()-last>800){last=Date.now();try{ctx.win.webContents.send('updprog',Math.round(got*100/total))}catch(_){}if(!silent)ctx.say(label+': '+Math.round(got*100/total)+'% ('+(got/1048576).toFixed(1)+'/'+(total/1048576).toFixed(1)+' MB)')}}
  await new Promise(z=>out.end(z));if(werr)throw werr;try{ctx.win.webContents.send('updprog',100)}catch(_){}return got;
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
    mine.file=f;mine.done=true;ctx.log('Đã tải sẵn bản '+L.ver+' (chạy ngầm), sẵn sàng cài');try{ctx.win.webContents.send('predl',L.ver)}catch(_){}
  }catch(e){ctx.log('Tải ngầm bản '+L.ver+' lỗi: '+String(e&&e.message||e).slice(0,80));mine.ver=''}finally{mine.busy=null}})();
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
      if(pre.ver===latest.ver&&pre.busy){ctx.say('Đang hoàn tất tải ngầm bản '+latest.ver+'…');await pre.busy}
      if(pre.ver===latest.ver&&pre.done&&pre.file&&fs.existsSync(pre.file)){
        if(pre.file!==asar)fs.copyFileSync(pre.file,asar);
        if(pre.cfg&&fs.existsSync(pre.cfg)){try{fs.copyFileSync(pre.cfg,path.join(ctx.exeDir,'config.new.json'))}catch(e){}}
      }else{
        const n=await dl(latest.light,asar,'Đang tải bản '+latest.ver+' (cập nhật nhẹ)');
        if(n<20000)return{err:'File tải về quá nhỏ ('+n+' byte), có thể bị lỗi.'};
        if(latest.cfg){try{await dl(latest.cfg,path.join(ctx.exeDir,'config.new.json'),'Đang tải cấu hình')}catch(e){}}
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
      args=[String(process.pid),asar,ctx.exeDir,process.execPath];
    }else{
      mode='đầy đủ';
      const zip=path.join(os.tmpdir(),'dp-update.zip');
      if(pre.ver===latest.ver&&pre.busy){ctx.say('Đang hoàn tất tải ngầm bản '+latest.ver+'…');await pre.busy}
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
      args=[String(process.pid),zip,ctx.exeDir,process.execPath];
    }
    spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',ps,...args],{detached:true,stdio:'ignore',windowsHide:true}).unref();
    ctx.say('Đã tải xong (cập nhật '+mode+'), ứng dụng sẽ tự khởi động lại bản mới…');setTimeout(()=>app.quit(),800);return{ok:true};
  }catch(e){return{err:String(e&&e.message||e)}}
}
ipcMain.handle('update:install',()=>installUpdate());
ipcMain.handle('open',(e,u)=>{if(/^https:\/\/github\.com\/laocai-cds\//.test(u))shell.openExternal(u)});
function announceUpdated(){try{const f=path.join(app.getPath('userData'),'lastver.txt');let old='';try{old=fs.readFileSync(f,'utf8').trim()}catch(_){}
  const cur=app.getVersion();if(old&&old!==cur){setTimeout(()=>{ctx.say('✅ Đã cập nhật xong: bản '+old+' → bản '+cur+'. Ứng dụng đã khởi động lại bằng phiên bản mới.');ctx.log('Đã cập nhật '+old+' → '+cur)},2500)}
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
            shell.writeShortcutLink(p,'update',{target:exe,cwd:path.dirname(exe),icon:exe,iconIndex:0});n++;ctx.log('Sửa biểu tượng: '+p+' | '+t+' → '+exe)}}catch(_){}}};
    dirs.forEach(d=>walk(d,0));
    if(n)setTimeout(()=>ctx.say('✅ Đã sửa '+n+' biểu tượng cũ để mở đúng bản mới này.'),4000);
  }catch(e){}
}
function reportUpdLog(){try{const f=path.join(os.tmpdir(),'dp-update.log');if(!fs.existsSync(f))return;const t=fs.readFileSync(f,'utf8');fs.unlinkSync(f);ctx.log('Nhật ký cập nhật: '+t.replace(/\r?\n/g,' | ').slice(0,500));if(/THAT BAI/.test(t))setTimeout(()=>ctx.say('⚠ Cập nhật lần trước KHÔNG chép được file mới ('+(t.split('\n').filter(x=>/lan /.test(x)).pop()||'').slice(0,120)+'). Hãy cài đè bằng DP-DangPhi-Setup.exe.'),3000)}catch(_){}}
};
