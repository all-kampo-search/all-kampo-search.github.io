const fs = require('fs');
const path = require('path');
const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../data.json'), 'utf8'));
const items = db.data;

const KANJI_REPLACEMENTS = [
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
  { from: '乾きょう', to: '乾姜' }
];

console.log('--- 生薬名（ingredients）における交ぜ書きチェック ---');
const affectedIngs = new Set();
items.forEach(it => {
  if (Array.isArray(it.ingredients)) {
    it.ingredients.forEach(ing => {
      if (!ing.name) return;
      KANJI_REPLACEMENTS.forEach(rep => {
        if (ing.name.includes(rep.from)) {
          affectedIngs.add(`${ing.name} -> ${ing.name.replace(new RegExp(rep.from, 'g'), rep.to)}`);
        }
      });
    });
  }
});

console.log('Affected ingredients count:', affectedIngs.size);
affectedIngs.forEach(x => console.log('  -', x));
