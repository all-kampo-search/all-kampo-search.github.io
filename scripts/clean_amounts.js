// 全医薬品データの生薬分量・エキス量の浮動小数点誤差をクレンジングするスクリプト
const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '..', 'data.json');
const jsDataPath = path.join(__dirname, '..', 'js', 'data.js');

const raw = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
const items = raw.data || [];

let cleanedCount = 0;

items.forEach(it => {
  if (Array.isArray(it.ingredients)) {
    it.ingredients.forEach(ing => {
      if (typeof ing.amount === 'number') {
        const rounded = Math.round(ing.amount * 10000) / 10000;
        if (rounded !== ing.amount) {
          console.log(`Fixing ${it.companyName} ${it.name} ${ing.name}: ${ing.amount} -> ${rounded}`);
          ing.amount = rounded;
          ing.amountStr = `${rounded}g`;
          cleanedCount++;
        }
      }
      if (typeof ing.amountStr === 'string' && /0000000\d|9999999\d/.test(ing.amountStr)) {
        const num = parseFloat(ing.amountStr);
        if (!isNaN(num)) {
          const rounded = Math.round(num * 10000) / 10000;
          ing.amountStr = `${rounded}g`;
        }
      }
    });
  }
});

console.log(`Total cleaned amounts: ${cleanedCount}`);

// data.json の更新
raw.data = items;
fs.writeFileSync(dataJsonPath, JSON.stringify(raw, null, 2), 'utf8');
console.log(`Updated ${dataJsonPath}`);

// js/data.js の更新
const jsContent = `window.__KAMPO_DATA__ = ${JSON.stringify(raw)};\n`;
fs.writeFileSync(jsDataPath, jsContent, 'utf8');
console.log(`Updated ${jsDataPath}`);
