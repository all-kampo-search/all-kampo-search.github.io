const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8'));

const byCompany = {};
data.data.forEach(it => {
  byCompany[it.company] = byCompany[it.company] || { total: 0, withNo: 0, sample: [] };
  byCompany[it.company].total++;
  if (it.formulaNo) {
    byCompany[it.company].withNo++;
    if (byCompany[it.company].sample.length < 3) {
      byCompany[it.company].sample.push(it.name + ' => No.' + it.formulaNo);
    }
  }
});

console.log('FormulaNo coverage by company:');
for (const c in byCompany) {
  console.log(c, ':', byCompany[c].withNo, '/', byCompany[c].total, byCompany[c].sample);
}

// 商品名の中に番号が含まれているもの（例: クラシエのKB-XX、小太郎のNXX/GXX、松浦のXX、建林のXXなど）
console.log('\n--- 番号が名前に埋め込まれている可能性のある例 ---');
const embeddedNumbers = [];
data.data.forEach(it => {
  if (!it.formulaNo) {
    // パターン: 「コタロー」のD-xxxやN-xxx、クラシエのEK-xxxやKB-xxx、松浦の番号
    const match = it.name.match(/[〔\[（(](\d+)[〕\]）)]|〔細粒〕(\d+)|〔煎剤〕(\d+)|[NGEKBD](\d{2,4})|№\s*(\d+)|No\.?\s*(\d+)/i);
    if (match) {
      const no = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
      embeddedNumbers.push({ company: it.companyName, name: it.name, extractedNo: no });
    }
  }
});
console.log('Found embedded numbers in names:', embeddedNumbers.length);
embeddedNumbers.slice(0, 20).forEach(x => console.log(x.company, '|', x.name, '=> No.', x.extractedNo));
