const fs = require('fs');
const path = require('path');
const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
const items = db.data;

// 1. 黄連解毒湯Aエキス細粒「分包」三和生薬 を確認
const orenSanwa = items.find(it => it.name.includes('黄連解毒湯Aエキス細粒「分包」三和生薬'));
console.log('--- 黄連解毒湯Aエキス細粒「分包」三和生薬 ---');
if (orenSanwa) {
  console.log('URL:', orenSanwa.url);
  console.log('Precautions:');
  console.log(orenSanwa.precautions);
} else {
  console.log('Not found');
}

// 2. 全商品で使用上の注意（precautions）が「■相談すること」だけ、または極端に短い（50文字未満）ものを調査
const shortPrecautions = [];
items.forEach((it, idx) => {
  const p = (it.precautions || '').trim();
  if (p.length < 50 || p === '■相談すること' || p === '■してはいけないこと' || (p.startsWith('■相談すること') && p.length < 30)) {
    shortPrecautions.push({ idx, company: it.company, name: it.name, len: p.length, text: p.replace(/\n/g, ' ') });
  }
});

console.log('\n--- 使用上の注意が極端に短い/欠落している商品数 ---');
console.log('Count:', shortPrecautions.length);
console.log('Sample (first 20):');
console.log(JSON.stringify(shortPrecautions.slice(0, 20), null, 2));
