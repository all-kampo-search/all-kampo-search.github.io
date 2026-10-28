const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8'));

console.log('Total items:', data.data.length);
const byForm = {};
data.data.forEach(it => {
  byForm[it.dosageForm] = byForm[it.dosageForm] || [];
  byForm[it.dosageForm].push(it);
});

for (const form in byForm) {
  console.log(`\n=== [${form}] Count: ${byForm[form].length} ===`);
  byForm[form].slice(0, 10).forEach(it => {
    console.log(`  ${it.companyName} | ${it.name} | raw: ${it.rawName} | usage: ${(it.usage||'').slice(0, 30)}`);
  });
}
