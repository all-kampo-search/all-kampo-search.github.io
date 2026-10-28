const fs = require('fs');
const path = require('path');
const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
const items = db.data;

// 漢方薬における一般的な交ぜ書き辞書（ひらがな混じり -> 本来の漢字）
const KANJI_REPLACEMENTS = [
  // 処方名・生薬名
  { from: '茵ちん', to: '茵蔯' },
  { from: '川きゅう', to: '川芎' },
  { from: 'かっ香', to: '藿香' },
  { from: 'よく苡', to: '薏苡' },
  { from: 'きゅう帰', to: '芎帰' },
  { from: '駆お', to: '駆瘀' },
  { from: '逐お', to: '逐瘀' },
  { from: 'お血', to: '瘀血' },
  { from: '竹じょ', to: '竹茹' },
  { from: '釣とう', to: '釣藤' },
  { from: '荊がい', to: '荊芥' },
  { from: 'か楼', to: '栝楼' },
  { from: '神きく', to: '神曲' },
  { from: 'せん退', to: '蝉退' },
  { from: '莪じゅつ', to: '莪朮' },
  { from: '紫おん', to: '紫苑' },
  { from: 'しつり', to: '蒺藜' },
  { from: '肉豆く', to: '肉豆寇' },
  { from: '白し', to: '白芷' },
  { from: '樸そく', to: '朴樕' },
  { from: '淫羊かく', to: '淫羊藿' },
  { from: '連ぎょう', to: '連翹' },
  { from: '防ふう', to: '防風' },
  { from: '大黄ぼう硝', to: '大黄芒硝' },
  { from: '乾きょう', to: '乾姜' },
  { from: '小青りゅう', to: '小青竜' },
  { from: '柴胡加竜骨ぼれい', to: '柴胡加竜骨牡蠣' },
  { from: '桂枝加竜骨ぼれい', to: '桂枝加竜骨牡蠣' }
];

console.log('--- 全商品（name, rawName, subCategory）における交ぜ書きヒット数 ---');

let hitCount = 0;
const affectedList = [];

items.forEach((it, idx) => {
  let hasHit = false;
  const changes = [];

  ['name', 'rawName', 'subCategory'].forEach(field => {
    const val = it[field] || '';
    KANJI_REPLACEMENTS.forEach(rep => {
      if (val.includes(rep.from)) {
        hasHit = true;
        changes.push({ field, from: rep.from, to: rep.to, before: val });
      }
    });
  });

  if (hasHit) {
    hitCount++;
    affectedList.push({ idx, company: it.company, name: it.name, changes });
  }
});

console.log(`Total affected items: ${hitCount}`);
console.log('Sample affected items:');
console.log(JSON.stringify(affectedList.slice(0, 30), null, 2));
