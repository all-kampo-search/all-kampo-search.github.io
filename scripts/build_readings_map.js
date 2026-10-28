// 漢字・ひらがな・カタカナ双方向検索辞書を生成するスクリプト
const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '..', 'data.json');
const jsDataPath = path.join(__dirname, '..', 'js', 'data.js');
const raw = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
const items = raw.data || [];

const herbCsvPath = path.join(__dirname, '..', '..', '生薬名読み一覧.csv');
const formulaCsvPath = path.join(__dirname, '..', '..', '処方名読み一覧.csv');

// ひらがな <-> カタカナ変換
function hiraToKata(str) {
  return str.replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}
function kataToHira(str) {
  return str.replace(/[\u30a1-\u30f6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

// 辞書マップ（正規化文字列 -> { kanji, hira, kata }）
const dictionary = {};

function addEntry(kanji, kana, hira) {
  const normKanji = kanji ? kanji.trim() : '';
  const normKana = kana ? kana.trim() : (hira ? hiraToKata(hira.trim()) : '');
  const normHira = hira ? hira.trim() : (kana ? kataToHira(kana.trim()) : '');

  const terms = [normKanji, normKana, normHira].filter(Boolean);
  const entry = { kanji: normKanji, kana: normKana, hira: normHira };

  terms.forEach(term => {
    if (term) {
      if (!dictionary[term]) dictionary[term] = [];
      // 重複チェック
      if (!dictionary[term].some(e => e.kanji === normKanji && e.kana === normKana)) {
        dictionary[term].push(entry);
      }
    }
  });
}

// 1. 処方名CSVの取り込み
if (fs.existsSync(formulaCsvPath)) {
  const lines = fs.readFileSync(formulaCsvPath, 'utf8').split('\n');
  lines.slice(1).forEach(l => {
    const parts = l.split(',').map(s => s.trim());
    if (parts.length >= 2 && parts[0]) {
      addEntry(parts[0], parts[2] || '', parts[1] || '');
    }
  });
}

// 2. 生薬名CSVの取り込み
if (fs.existsSync(herbCsvPath)) {
  const lines = fs.readFileSync(herbCsvPath, 'utf8').split('\n');
  lines.slice(1).forEach(l => {
    const parts = l.split(',').map(s => s.trim());
    if (parts.length >= 3 && parts[1]) {
      addEntry(parts[0] || '', parts[1] || '', parts[2] || '');
    }
  });
}

// 3. 辞書に載っていない特殊な生薬やイスクラ・独自処方の補完
const customAdditions = [
  // イスクラ産業
  { kanji: '衛益', kana: 'エイエキ', hira: 'えいえき' },
  { kanji: '冠元', kana: 'カンゲン', hira: 'かんげん' },
  { kanji: '頂調', kana: 'チョウチョウ', hira: 'ちょうちょう' },
  { kanji: '麦味参', kana: 'バクミサン', hira: 'ばくみさん' },
  { kanji: '勝湿', kana: 'ショウシツ', hira: 'しょうしつ' },
  { kanji: '平喘', kana: 'ヘイゼン', hira: 'へいぜん' },
  { kanji: '婦宝当帰膠', kana: 'フホウトウキコウ', hira: 'ふほうとうきこう' },
  { kanji: '開気丸', kana: 'カイキガン', hira: 'かいきがん' },
  { kanji: '補中丸', kana: 'ホチュウガン', hira: 'ほちゅうがん' },
  { kanji: '参茸補血丸', kana: 'サンジョウホケツガン', hira: 'さんじょうほけつがん' },
  { kanji: '参馬補腎丸', kana: 'サンバホジンガン', hira: 'さんばほじんがん' },
  { kanji: '双料参茸丸', kana: 'ソウリョウサンジョウガン', hira: 'そうりょうさんじょうがん' },
  { kanji: '双料杞菊', kana: 'ソウリョウコギク', hira: 'そうりょうこぎく' },
  { kanji: '八仙丸', kana: 'ハッセンガン', hira: 'はっせんがん' },
  { kanji: '涼解楽', kana: 'リョウカイラク', hira: 'りょうかいらく' },
  { kanji: '槐角丸', kana: 'カイカクガン', hira: 'かいかくがん' },
  { kanji: '瀉火補腎丸', kana: 'シャカホジンガン', hira: 'しゃかほじんがん' },
  { kanji: '瀉火利湿', kana: 'シャカリシツ', hira: 'しゃかりしつ' },
  { kanji: '天王補心丹', kana: 'テンノウホシンタン', hira: 'てんのうほしんたん' },
  { kanji: '華陀膏', kana: 'カダコウ', hira: 'かだこう' },
  // 生薬のバリエーション（〜末、乾、熟、よく苡仁など）
  { kanji: '附子末', kana: 'ブシマツ', hira: 'ぶしまつ' },
  { kanji: '炮附子末', kana: 'ホウブシマツ', hira: 'ほうぶしまつ' },
  { kanji: '乾地黄', kana: 'カンジオウ', hira: 'かんじおう' },
  { kanji: '熟地黄', kana: 'ジュクジオウ', hira: 'じゅくじおう' },
  { kanji: '薏苡仁', kana: 'ヨクイニン', hira: 'よくいにん' },
  { kanji: '淫羊藿', kana: 'インヨウカク', hira: 'いんようかく' },
  { kanji: '鹿茸末', kana: 'ロクジョウマツ', hira: 'ろくじょうまつ' },
  { kanji: '牛黄末', kana: 'ゴオウマツ', hira: 'ごおうまつ' },
  { kanji: '大黄末', kana: 'ダイオウマツ', hira: 'だいおうまつ' },
  { kanji: '芍薬末', kana: 'シャクヤクマツ', hira: 'しゃくやくまつ' },
  { kanji: '甘草末', kana: 'カンゾウマツ', hira: 'かんぞうまつ' },
  { kanji: 'アロエ末', kana: 'アロエマツ', hira: 'あろえまつ' },
  { kanji: '厚朴末', kana: 'コウボクマツ', hira: 'こうぼくまつ' },
  { kanji: '枳実末', kana: 'キジツマツ', hira: 'きじつまつ' },
  { kanji: '莪朮末', kana: 'ガジュツマツ', hira: 'がじゅつまつ' }
];

customAdditions.forEach(c => addEntry(c.kanji, c.kana, c.hira));

// 各アイテムに読み検索用キーワード（searchReadings）を埋め込む
items.forEach(it => {
  const readings = new Set();
  
  // 処方名から読みを展開
  const sub = (it.subCategory || '').trim();
  if (sub) {
    readings.add(sub);
    readings.add(kataToHira(sub));
    readings.add(hiraToKata(sub));

    // 単味生薬処方（「オウギ 黄耆」など）の分割登録
    const parts = sub.split(/[\s　]+/);
    parts.forEach(p => {
      readings.add(p);
      readings.add(kataToHira(p));
      readings.add(hiraToKata(p));
    });

    if (dictionary[sub]) {
      dictionary[sub].forEach(e => {
        if (e.kanji) readings.add(e.kanji);
        if (e.hira) readings.add(e.hira);
        if (e.kana) readings.add(e.kana);
      });
    }
  }

  // 商品名からひらがな・カタカナを展開
  const name = (it.name || '').trim();
  if (name) {
    readings.add(name);
    readings.add(kataToHira(name));
    readings.add(hiraToKata(name));
  }

  // 構成生薬から漢字・ひらがな・カタカナを展開
  if (Array.isArray(it.ingredients)) {
    it.ingredients.forEach(ing => {
      const ingName = (ing.name || '').trim();
      if (ingName) {
        readings.add(ingName);
        readings.add(kataToHira(ingName));
        readings.add(hiraToKata(ingName));

        if (dictionary[ingName]) {
          dictionary[ingName].forEach(e => {
            if (e.kanji) readings.add(e.kanji);
            if (e.hira) readings.add(e.hira);
            if (e.kana) readings.add(e.kana);
          });
        }
      }
    });
  }

  it.searchReadings = Array.from(readings).join(' ');
});

// data.json の更新
raw.data = items;
fs.writeFileSync(dataJsonPath, JSON.stringify(raw, null, 2), 'utf8');
console.log(`Updated ${dataJsonPath} with searchReadings`);

// js/data.js の更新
const jsContent = `window.__KAMPO_DATA__ = ${JSON.stringify(raw)};\n`;
fs.writeFileSync(jsDataPath, jsContent, 'utf8');
console.log(`Updated ${jsDataPath}`);
