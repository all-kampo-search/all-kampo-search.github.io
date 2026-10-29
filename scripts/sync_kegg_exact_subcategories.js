const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../data.json');
const jsDataFile = path.join(__dirname, '../js/data.js');
const cacheFile = path.join(__dirname, 'cache_kegg_all_sync.json');

const db = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const items = db.data;
const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

console.log(`Loaded ${items.length} items from database.`);

// KEGG HTMLから小分類を正確に抽出する関数
function extractKeggSubCategory(html, isMedical) {
  if (!html) return null;
  if (isMedical) {
    // 医療用医薬品
    const m = html.match(/<title>\s*医療用医薬品\s*:\s*([^\(（\n]+)/i);
    if (m) {
      return m[1].trim();
    }
  } else {
    // 一般用医薬品
    const m = html.match(/<td class="title">小分類<\/td>\s*<td class="item">([\s\S]*?)<\/td>/i) ||
              html.match(/小分類<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
    if (m) {
      let sub = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      // ご指示の「（他の薬効群に属さない製剤）」を抜きにする
      sub = sub.replace(/[（\(]\s*他の薬効群に属さない製剤\s*[）\)]/g, '').trim();
      return sub;
    }
  }
  return null;
}

// 検索インデックス再生成
function rebuildSearchIndexes(p) {
  const herbNames = (p.ingredients || []).map(i => i.name).filter(Boolean);
  const herbText = herbNames.join(' ');
  p.searchHerbs = herbText;
  p.searchAll = `${p.name} ${p.searchReadings || ''} ${herbText} ${p.subCategory || ''} ${p.company || ''} ${p.companyName || ''} ${p.efficacy || ''}`;
}

let syncedCount = 0;
let cleanedBracketsCount = 0;
let unchangedCount = 0;

items.forEach(p => {
  const isMed = p.type === 'medical';
  const code = (p.url || '').match(/japic_code=([A-Za-z0-9]+)/)?.[1];

  if (code) {
    const cacheKey = (isMed ? 'med_' : 'otc_') + code;
    const html = cache[cacheKey];

    if (html) {
      const keggSub = extractKeggSubCategory(html, isMed);
      if (keggSub && keggSub.length > 0) {
        if (p.subCategory !== keggSub) {
          p.subCategory = keggSub;
          syncedCount++;
        } else {
          unchangedCount++;
        }
      }
    }
  }

  // 「他の薬効群に属さない製剤」が残っていれば確実に除去
  if (p.subCategory && p.subCategory.includes('他の薬効群に属さない製剤')) {
    p.subCategory = p.subCategory.replace(/[（\(]\s*他の薬効群に属さない製剤\s*[）\)]/g, '').trim();
    cleanedBracketsCount++;
  }

  // 検索インデックス再生成
  rebuildSearchIndexes(p);
});

console.log(`Updated subCategory for ${syncedCount} items to exact KEGG official text.`);
console.log(`Unchanged (already matching KEGG): ${unchangedCount} items.`);
console.log(`Cleaned note brackets: ${cleanedBracketsCount} items.`);

// 保存
db.data = items;
fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf8');
console.log(`Saved updated database to ${dataFile}`);

const jsContent = `window.__KAMPO_DATA__ = ${JSON.stringify(db)};\n`;
fs.writeFileSync(jsDataFile, jsContent, 'utf8');
console.log(`Saved updated database to ${jsDataFile}`);
