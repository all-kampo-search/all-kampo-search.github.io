const fs = require('fs');
const path = require('path');
const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
const iskraItems = db.data.filter(it => it.company === 'iskra');

console.log('--- イスクラ全33商品のURL/コード調査 ---');
iskraItems.forEach((it, idx) => {
  console.log(`[${idx+1}] ${it.name} | url: ${it.url}`);
});
