const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('pop',{
  onData:cb=>ipcRenderer.on('pop:data',(e,d)=>cb(d)),
  change:ids=>ipcRenderer.send('pop:change',ids),
  run:id=>ipcRenderer.send('pop:run',id),
  close:()=>ipcRenderer.send('pop:close')
});
