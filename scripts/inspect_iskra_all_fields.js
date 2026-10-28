const fs = require('fs');
const path = require('path');
const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
const iskraItems = db.data.filter(it => it.company === 'iskra');

console.log('Total Iskra items:', iskraItems.length);

iskraItems.forEach((it, idx) => {
  console.log(`\n=== [${idx+1}] ${it.name} ===`);
  console.log(`subCategory: ${it.subCategory}`);
  console.log(`url: ${it.url}`);
  console.log(`keggId / packageCode: ${it.keggId || it.packageCode || ''}`);
  console.log(`efficacy length: ${(it.efficacy || '').length}`);
  console.log(`usage: ${it.usage || ''}`);
  console.log(`ingredients (${(it.ingredients || []).length}):`, (it.ingredients || []).map(i => `${i.name}:${i.amountStr}`).join(', '));
  console.log(`additives: ${it.additives || ''}`);
  console.log(`precautions length: ${(it.precautions || '').length}`);
});
