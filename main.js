const {app}=require('electron');
/* Điểm vào ứng dụng: nạp các module trong lib/ theo thứ tự, dùng chung đối tượng ctx */
const ctx={};
for(const m of ['config','xa','window','run','results','health','schedule','update'])require('./lib/'+m)(ctx);
if(!app.requestSingleInstanceLock()){app.quit()}else{app.on('second-instance',()=>ctx.showWin());
app.whenReady().then(()=>{ctx.createWindow();ctx.announceUpdated();ctx.reportUpdLog();ctx.fixShortcuts();ctx.applySched();setInterval(ctx.tickSched,30000);ctx.armUpd();ctx.win.webContents.on('did-finish-load',()=>setTimeout(ctx.checkUpdate,1500))});
app.on('window-all-closed',()=>app.quit());
}
