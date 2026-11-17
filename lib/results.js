/* Kết quả từng đơn vị, thông báo, webhook */
const {app,ipcMain,net,Notification}=require('electron');
const path=require('path');
const fs=require('fs');
module.exports=function init(ctx){
ctx.recRes=recRes;ctx.hookPost=hookPost;
/* ===== Kết quả từng đơn vị (hiện trong hộp xổ chọn) ===== */
const resFile=()=>path.join(app.getPath('userData'),'ket-qua.json');
ctx.RES={};try{ctx.RES=JSON.parse(fs.readFileSync(resFile(),'utf8'))||{}}catch(_){ctx.RES={}}
function recRes(id,r){
  if(!r||r.need)return;let ok,msg='';
  if(r.err){ok=false;msg=r.err}else if(r.result==='done'){ok=true;msg=r.msg||''}
  else if(r.result==='stop'){ok=false;msg='đã dừng'}else if(r.result==='cancel'){ok=false;msg='bị gián đoạn'}
  else if(r.result==='fail'){ok=false;msg=r.msg||'lỗi'}else return;
  const now=Date.now(),prev=ctx.RES[id]||{},prevOk=prev.okT||(prev.ok?prev.t:0)||0;
  /* okT = lần chạy THÀNH CÔNG gần nhất (giữ nguyên khi lần sau bị lỗi/dừng) — bảng tình trạng lấy mốc này */
  ctx.RES[id]={ok,t:now,okT:ok?now:prevOk,msg:String(msg).replace(/\s+/g,' ').slice(0,140)};
  try{fs.writeFileSync(resFile(),JSON.stringify(ctx.RES))}catch(_){}
  try{ctx.win.webContents.send('res',ctx.RES)}catch(_){}
}
ipcMain.handle('res:get',()=>ctx.RES);
const notify=(title,body)=>{try{if(Notification.isSupported())new Notification({title,body}).show()}catch(_){}};
ctx.notify=notify;

/* webhook báo kết quả (tùy chọn): POST JSON {text, content} — dùng được với Slack/Discord/Make/Zalo bot trung gian */
const hookFile=()=>path.join(app.getPath('userData'),'hook.json');
const readHook=()=>{try{return JSON.parse(fs.readFileSync(hookFile(),'utf8')).url||''}catch(_){return''}};
async function hookPost(text){const u=readHook();if(!/^https:\/\//.test(u))return;try{await net.fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,content:text})})}catch(e){ctx.log('Webhook lỗi: '+String(e&&e.message||e).slice(0,60))}}
ipcMain.handle('hook:get',()=>readHook());
ipcMain.handle('hook:set',(e,u)=>{u=String(u||'').trim();if(u&&!/^https:\/\//.test(u))return{err:'Địa chỉ webhook phải bắt đầu bằng https://'};fs.writeFileSync(hookFile(),JSON.stringify({url:u}));return{ok:true}});
};
