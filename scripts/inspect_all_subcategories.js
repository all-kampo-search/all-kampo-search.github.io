const fs = require('fs');
const path = require('path');
const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
const items = db.data;

console.log('Total items:', items.length);

const subCatMap = new Map();
const anomalous = [];

items.forEach((it, idx) => {
  const sub = it.subCategory;
  if (!sub || sub.trim() === '') {
    anomalous.push({ idx, name: it.name, company: it.company, reason: 'EMPTY' });
    return;
  }
  // 商品名とsubCategoryが完全に同じ場合（処方名になっていない疑い）
  if (it.name === sub || it.rawName === sub) {
    // 単味生薬や独自商品の場合もあるので記録
    anomalous.push({ idx, name: it.name, company: it.company, subCategory: sub, reason: 'NAME_EQUALS_SUBCAT' });
  }
  // 記号や細粒、包などがsubCategoryに入っている場合
  if (/[0-9０-９号包錠散顆粒細粒エキス]/.test(sub) && !['エキス', '散', '湯', '丸', '膏', '顆粒'].some(k => sub === k)) {
    if (sub.includes('〔') || sub.includes('[') || sub.includes('細粒') || sub.includes('顆粒') || sub.includes('エキス') || sub.includes('号') || sub.includes('錠')) {
      anomalous.push({ idx, name: it.name, company: it.company, subCategory: sub, reason: 'CONTAINS_FORM_OR_NUMBER' });
    }
  }

  subCatMap.set(sub, (subCatMap.get(sub) || 0) + 1);
});

console.log('Total unique subCategories:', subCatMap.size);
console.log('Anomalous items count:', anomalous.length);
console.log('Sample anomalous items (first 30):');
console.log(JSON.stringify(anomalous.slice(0, 30), null, 2));
