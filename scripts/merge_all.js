const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../data.json');
const iskraFile = path.join(__dirname, 'iskra_items.json');
const nikkankyoFile = path.join(__dirname, 'nikkankyo_additional.json');

const orig = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const iskraItems = fs.existsSync(iskraFile) ? JSON.parse(fs.readFileSync(iskraFile, 'utf8')) : [];
const nikkankyoItems = fs.existsSync(nikkankyoFile) ? JSON.parse(fs.readFileSync(nikkankyoFile, 'utf8')) : [];

console.log(`Original: ${orig.data.length}, Iskra: ${iskraItems.length}, Nikkankyo add: ${nikkankyoItems.length}`);

// Combine and deduplicate
const map = new Map();

for (const it of orig.data) {
  const key = `${it.company}_${it.rawName || it.name}_${it.type}`;
  map.set(key, it);
}

for (const it of iskraItems) {
  const key = `${it.company}_${it.rawName || it.name}_${it.type}`;
  map.set(key, it);
}

for (const it of nikkankyoItems) {
  const key = `${it.company}_${it.rawName || it.name}_${it.type}`;
  if (!map.has(key)) {
    map.set(key, it);
  }
}

const merged = Array.from(map.values());

// Sort
merged.sort((a, b) => {
  const sortA = a.subCategorySortKey || a.sortKey || a.name;
  const sortB = b.subCategorySortKey || b.sortKey || b.name;
  return sortA.localeCompare(sortB, 'ja');
});

const companiesDef = [
  { id: 'all', name: '全社' },
  { id: 'tsumura', name: 'ツムラ' },
  { id: 'kracie', name: 'クラシエ' },
  { id: 'kotaro', name: '小太郎漢方' },
  { id: 'iskra', name: 'イスクラ産業' },
  { id: 'osugi', name: '大杉製薬' },
  { id: 'sanwa', name: '三和生薬' },
  { id: 'uchida', name: 'ウチダ和漢薬' },
  { id: 'jps', name: 'ジェーピーエス製薬' },
  { id: 'honzo', name: '本草製薬' },
  { id: 'matsuura', name: '松浦薬業' },
  { id: 'zaiseido', name: '剤盛堂(ホノミ)' },
  { id: 'kyushin', name: '救心製薬' },
  { id: 'tochimoto', name: '栃本天海堂' },
  { id: 'taikoseido', name: '太虎精堂' },
  { id: 'tatebayashi', name: '建林松鶴堂' },
  { id: 'yatsume', name: '八ッ目製薬' },
  { id: 'sakamoto', name: '阪本漢法' },
  { id: 'sugihara', name: '杉原達二商店' }
];

const finalOutput = {
  companies: companiesDef,
  data: merged,
  totalCount: merged.length,
  lastUpdated: new Date().toISOString()
};

fs.writeFileSync(dataFile, JSON.stringify(finalOutput));
console.log(`Successfully merged! Total items: ${merged.length}`);

// Output count by company
const counts = {};
merged.forEach(it => {
  counts[it.companyName] = (counts[it.companyName] || 0) + 1;
});
console.log('Company breakdown:', counts);
