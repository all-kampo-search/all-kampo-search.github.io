const fs = require('fs');
const path = require('path');
const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
const nonIskra = db.data.filter(it => it.company !== 'iskra' && ((it.usage || '').includes('問い合わせ先') || (it.usage || '').includes('お客様相談')));
console.log('Non-iskra usage with 問い合わせ先:', nonIskra.length);
nonIskra.forEach(it => {
  console.log(`[${it.company}] ${it.name} -> URL: ${it.url}`);
  console.log('  Usage:', (it.usage || '').slice(0, 120).replace(/\n/g, ' '));
});
