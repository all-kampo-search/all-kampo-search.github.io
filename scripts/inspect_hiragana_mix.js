const fs = require('fs');
const path = require('path');
const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
const items = db.data;

const hiraRegex = /[\u3041-\u3096]/;

console.log('--- ひらがな交ざり調査 ---');
const subCategoryHira = new Map();
const nameHira = [];

items.forEach((it, idx) => {
  const sub = it.subCategory || '';
  if (hiraRegex.test(sub)) {
    subCategoryHira.set(sub, (subCategoryHira.get(sub) || 0) + 1);
  }

  const name = it.name || '';
  if (hiraRegex.test(name)) {
    // 会社名プレフィックス（「クラシエ」「ツムラ」「ウチダの」「トチモトの」等の「の」）は自然
    // それ以外の処方名部分にひらがなが混ざっているものを探す
    nameHira.push({ idx, company: it.company, name, subCategory: sub });
  }
});

console.log('1. ひらがなが含まれる小分類（subCategory）一覧:');
Array.from(subCategoryHira.entries()).forEach(([sub, cnt]) => {
  console.log(`  - "${sub}": ${cnt}件`);
});

console.log('\n2. ひらがなが含まれる商品名サンプル（先頭30件）:');
nameHira.slice(0, 30).forEach(x => {
  console.log(`  [${x.company}] ${x.name} (sub: ${x.subCategory})`);
});
console.log('Total name with hira:', nameHira.length);
