/* Cấu hình, biến dùng chung (cửa sổ, đường dẫn, config.json) */
const {app}=require('electron');
const path=require('path');
const fs=require('fs');
const ROOT=path.join(__dirname,'..');
module.exports=function init(ctx){
ctx.win=undefined;ctx.view=undefined;
/* không cho Windows/Chromium làm chậm hoặc dừng trang khi cửa sổ bị thu nhỏ xuống thanh tác vụ */
for(const s of ['disable-renderer-backgrounding','disable-background-timer-throttling','disable-backgrounding-occluded-windows'])app.commandLine.appendSwitch(s);
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
const WIN_TITLE='Đồng bộ đảng phí 2026 - Phát triển bởi: Mr. Dũng - Phòng CĐS-CY VPTU Lào Cai';
ctx.WIN_TITLE=WIN_TITLE;

const exeDir=app.isPackaged?path.dirname(process.execPath):ROOT;
ctx.exeDir=exeDir;

function loadCfg(){
  for(const p of [path.join(exeDir,'config.json'),path.join(ROOT,'config.json')]){try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch(e){}}
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
const cfg=loadCfg();
ctx.cfg=cfg;
ctx.BAR=cfg.only?110:178;
};
