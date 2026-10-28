const fs = require('fs');
const path = require('path');
const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
const items = db.data;
const iskraItems = items.filter(it => it.company === 'iskra');

console.log('--- イスクラ全33商品 ---');
iskraItems.forEach((it, idx) => {
  console.log(`[${idx+1}] 商品名: ${it.name} | subCategory: ${it.subCategory} | keggId: ${it.keggId || it.packageCode || ''}`);
});
