const fs = require('fs');
const path = require('path');
const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
const items = db.data;

console.log('--- 全社の小分類一覧サマリー ---');
const companySubCatCounts = {};
const suspiciousSubCats = [];

items.forEach((it, idx) => {
  const c = it.company;
  companySubCatCounts[c] = (companySubCatCounts[c] || 0) + 1;

  const sub = it.subCategory;
  if (!sub) {
    suspiciousSubCats.push({ idx, company: c, name: it.name, reason: 'EMPTY' });
    return;
  }

  // 処方名・漢方生薬製剤として不自然な小分類の検出
  // 例: 「S」「T」「G」「〔」「]」「エキス」「細粒」「顆粒」「錠」「包」「-」「号」
  if (/([A-Z0-9０-９号包錠散顆粒細粒エキス〔［\]])/.test(sub)) {
    // ただし、四物湯、五苓散、八味地黄丸、十全大補湯などの漢数字は除く（半角/全角英数字・記号のみ）
    if (/[A-Za-z0-9０-９号包細粒顆粒エキス〔［\]]/.test(sub)) {
      suspiciousSubCats.push({ idx, company: c, name: it.name, subCategory: sub, reason: 'CONTAINS_PRODUCT_NAME_ELEMENTS' });
    }
  }
});

console.log('Company product counts:', companySubCatCounts);
console.log('Suspicious subCategory count:', suspiciousSubCats.length);
console.log('Suspicious items:');
console.log(JSON.stringify(suspiciousSubCats, null, 2));
