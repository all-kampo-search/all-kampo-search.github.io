const fs = require('fs');
const path = require('path');
const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
const items = db.data;

console.log('Total items in DB:', items.length);

const issues = {
  usageWithCompanyInfo: [],
  dummyIngredients: [],
  emptyIngredients: [],
  suspiciousAdditives: []
};

items.forEach((it, idx) => {
  const u = it.usage || '';
  if (u.includes('問い合わせ先') || u.includes('お客様相談') || u.includes('製造販売元住所') || u.includes('電話番号') || u.includes('0120-') || u.includes('03-') || u.includes('06-') || u.includes('047-')) {
    issues.usageWithCompanyInfo.push({ idx, company: it.company, name: it.name, snippet: u.slice(0, 80).replace(/\n/g, ' ') });
  }

  const ings = it.ingredients || [];
  if (ings.length === 0) {
    issues.emptyIngredients.push({ idx, company: it.company, name: it.name });
  } else if (ings.length === 1 && (ings[0].amountStr === '調剤用生薬' || ings[0].name.includes('調剤') || ings[0].name.includes('製剤'))) {
    issues.dummyIngredients.push({ idx, company: it.company, name: it.name, ing: ings[0] });
  }
});

console.log('=== 全社調査結果 ===');
console.log('1. 用法用量に会社情報・問い合わせ先が混入している商品数:', issues.usageWithCompanyInfo.length);
if (issues.usageWithCompanyInfo.length > 0) {
  const companyCounts = {};
  issues.usageWithCompanyInfo.forEach(x => companyCounts[x.company] = (companyCounts[x.company] || 0) + 1);
  console.log('  会社別内訳:', companyCounts);
  console.log('  サンプル:', issues.usageWithCompanyInfo.slice(0, 5));
}

console.log('\n2. 生薬配合量がダミー1行になっている商品数:', issues.dummyIngredients.length);
if (issues.dummyIngredients.length > 0) {
  const companyCounts = {};
  issues.dummyIngredients.forEach(x => companyCounts[x.company] = (companyCounts[x.company] || 0) + 1);
  console.log('  会社別内訳:', companyCounts);
  console.log('  サンプル:', issues.dummyIngredients.slice(0, 10));
}

console.log('\n3. 生薬配合量が空（0件）の商品数:', issues.emptyIngredients.length);
if (issues.emptyIngredients.length > 0) {
  const companyCounts = {};
  issues.emptyIngredients.forEach(x => companyCounts[x.company] = (companyCounts[x.company] || 0) + 1);
  console.log('  会社別内訳:', companyCounts);
}
