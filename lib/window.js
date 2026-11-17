/* Cửa sổ chính, khung công cụ, hộp chọn xã, hướng dẫn */
const {app,BrowserWindow,WebContentsView,ipcMain,shell}=require('electron');
const path=require('path');
const ROOT=path.join(__dirname,'..');
module.exports=function init(ctx){
ctx.createWindow=createWindow;
let helpWin=null;
ipcMain.handle('help:open',()=>{
  if(helpWin&&!helpWin.isDestroyed()){helpWin.show();helpWin.focus();return true}
  helpWin=new BrowserWindow({width:900,height:780,parent:ctx.win,title:'Hướng dẫn sử dụng - Đồng bộ đảng phí',icon:path.join(ROOT,'build','icon.png'),autoHideMenuBar:true,webPreferences:{sandbox:true}});
  helpWin.setMenuBarVisibility(false);helpWin.loadFile('huong-dan.html');
  helpWin.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//.test(url))shell.openExternal(url);return{action:'deny'}});
  helpWin.webContents.on('will-navigate',(e,u)=>{if(!u.startsWith('file:')){e.preventDefault();if(/^https:\/\//.test(u))shell.openExternal(u)}});
  helpWin.on('closed',()=>{helpWin=null});return true});
ipcMain.handle('bar',(e,h)=>{const n=Math.round(Math.min(Math.max(+h||0,60),520));if(n!==ctx.BAR){ctx.BAR=n;try{layout()}catch(_){}}return true});
function layout(){const [w,h]=ctx.win.getContentSize();ctx.view.setBounds({x:0,y:ctx.BAR,width:w,height:Math.max(100,h-ctx.BAR)})}
/* hộp xổ chọn đơn vị: một khung nổi nằm trên khung gqtthc (như danh sách chọn trong APK) */
let pop=null,popAt=0;
function popClose(){if(!pop)return;const p=pop;pop=null;try{ctx.win.contentView.removeChildView(p)}catch(_){}try{p.webContents.close()}catch(_){}popAt=Date.now();try{ctx.win.webContents.send('pop:closed')}catch(_){}}
ipcMain.handle('pop:open',(e,o)=>{
  if(pop){popClose();return true}
  if(Date.now()-popAt<300)return true;
  const items=(o&&o.items)||[],[ww,wh]=ctx.win.getContentSize();
  const w=Math.min(340,Math.max(240,ww-20)),h=Math.min(46+items.length*37+52,Math.max(160,wh-(o.y||0)-12));
  const x=Math.max(4,Math.min(Math.round(o.x||0),ww-w-4)),y=Math.round(o.y||0);
  pop=new WebContentsView({webPreferences:{preload:path.join(ROOT,'preload-pop.js'),contextIsolation:true,backgroundThrottling:false}});
  ctx.win.contentView.addChildView(pop);pop.setBounds({x,y,width:w,height:h});
  pop.webContents.loadFile('xapop.html');
  pop.webContents.once('did-finish-load',()=>{try{pop.webContents.send('pop:data',{items,checked:o.checked||[]});pop.webContents.focus()}catch(_){}});
  pop.webContents.on('blur',()=>setTimeout(()=>{if(pop&&!pop.webContents.isFocused())popClose()},120));
  return true});
ipcMain.on('pop:change',(e,ids)=>{try{ctx.win.webContents.send('pop:sel',ids)}catch(_){}});
ipcMain.on('pop:run',(e,id)=>{popClose();try{ctx.win.webContents.send('pop:run',id)}catch(_){}});
ipcMain.on('pop:close',()=>popClose());
function createWindow(){
  ctx.win=new BrowserWindow({width:1320,height:860,title:ctx.WIN_TITLE,icon:path.join(ROOT,'build','icon.png'),autoHideMenuBar:true,webPreferences:{preload:path.join(ROOT,'preload.js'),backgroundThrottling:false}});
  ctx.win.setTitle(ctx.WIN_TITLE);ctx.win.on('close',e=>{try{const s=ctx.readSched();if(!ctx.quitting&&process.platform==='win32'){e.preventDefault();ctx.win.hide();ctx.setupTray();if(!ctx.trayTold){ctx.trayTold=true;ctx.notify('Đồng bộ đảng phí','Ứng dụng vẫn chạy nền ở khay hệ thống (góc phải thanh tác vụ, bấm mũi tên ^ nếu không thấy). Bấm biểu tượng để mở lại hoặc chọn Thoát hẳn.')}}}catch(_){}});ctx.win.on('page-title-updated',e=>e.preventDefault());ctx.win.on('resize',()=>popClose());ctx.win.on('minimize',()=>popClose());
  ctx.win.loadFile('toolbar.html');
  /* mở lên phía trước và hiện giao diện (kể cả khi vừa tự khởi động lại sau cập nhật) */
  ctx.win.once('ready-to-show',()=>{try{if(ctx.win.isMinimized())ctx.win.restore();ctx.win.show();ctx.win.setAlwaysOnTop(true);ctx.win.focus();setTimeout(()=>{try{ctx.win.setAlwaysOnTop(false)}catch(_){}},1500)}catch(e){}});
  ctx.view=new WebContentsView({webPreferences:{partition:'persist:gqtthc',contextIsolation:true,backgroundThrottling:false}});
  ctx.win.contentView.addChildView(ctx.view);layout();ctx.win.on('resize',layout);
  ctx.view.webContents.on('will-navigate',(e,u)=>{if(!/^https?:/i.test(u))e.preventDefault()});
  /* kéo nút ĐP từ website xã thả thẳng vào khung gqtthc cũng được */
  const DROPJS="(()=>{if(window.__dpDrop)return;window.__dpDrop=1;const g=(dt,k)=>{try{return dt.getData(k)||''}catch(e){return''}};const t=dt=>g(dt,'text/uri-list')||g(dt,'URL')||g(dt,'text/plain');const ok=dt=>/apiBookmarklet|^javascript:/i.test(t(dt));addEventListener('dragover',e=>{if(e.dataTransfer&&(e.dataTransfer.types||[]).some(x=>/uri-list|text\\/plain|URL/.test(x))){e.preventDefault();e.stopPropagation()}},true);addEventListener('drop',e=>{const x=t(e.dataTransfer);if(!/apiBookmarklet|^javascript:/i.test(x))return;e.preventDefault();e.stopPropagation();console.log('\\u0001DPADD\\u0001'+x)},true)})();void 0";
  ctx.view.webContents.on('dom-ready',()=>{try{ctx.view.webContents.executeJavaScript(DROPJS)}catch(_){}});
  ctx.view.webContents.on('console-message',(e,level,message)=>{const m=String((e&&e.message)||message||'');if(m.charAt(0)!=='\u0001'||m.indexOf('\u0001DPADD\u0001')!==0)return;
    ipcMain.emit('xa:add:internal',null,m.slice(7))});
  ctx.view.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\/[^/]*dcs\.vn\//.test(url))ctx.view.webContents.loadURL(url);else shell.openExternal(url);return{action:'deny'}});
  ctx.view.webContents.loadURL(ctx.cfg.home);
  ctx.view.webContents.on('did-fail-load',(e,c,d)=>{if(c!==-3)ctx.win.webContents.send('status','Không mở được trang: '+d)});
}
ipcMain.handle('init',()=>({ver:app.getVersion(),admin:!ctx.cfg.only,title:ctx.cfg.title,xa:ctx.xaList().map(x=>({id:x.id,label:x.label,has:!!ctx.readCodes()[x.id],extra:!!x.extra}))}));
ipcMain.handle('nav',(e,a)=>{if(a==='home')ctx.view.webContents.loadURL(ctx.cfg.home);else if(a==='reload')ctx.view.webContents.reload()});
ipcMain.handle('reset',(e,id)=>{const c=ctx.readCodes();delete c[id];ctx.writeCodes(c);return true});
};
