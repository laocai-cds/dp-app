// Tạo dữ liệu dấu trang cho trang hướng dẫn iPhone (tthc/dp/iphone-data.js)
// Dùng: node tools/gen-iphone.mjs <đường-dẫn-file-đầu-ra>   (cần: npm i terser)
import fs from 'fs';
import { minify } from 'terser';
const out = process.argv[2] || 'iphone-data.js';
const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const list = [];
for (const x of cfg.xa) {
  const src = fs.readFileSync(x.file, 'utf8');
  const r = await minify(src, { compress: true, mangle: true, format: { comments: false } });
  const code = (r.code || src).replace(/\r?\n/g, ' ');
  list.push({ id: x.id, label: x.label, fn: x.fn, key: x.key, arg: x.arg, code });
}
fs.writeFileSync(out, 'window.DPXA=' + JSON.stringify(list) + ';window.DPCHUNG=' + JSON.stringify(cfg.chung || '') + ';\n');
console.log('OK', list.length, 'xã →', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
