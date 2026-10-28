const fs = require('fs');
const path = require('path');
const { COMPREHENSIVE_FORMULA_READINGS } = require('./formula_readings_map');

const dataFile = path.join(__dirname, '../data.json');
const jsDataFile = path.join(__dirname, '../js/data.js');
const csvFile = path.join(__dirname, '../処方名・生薬名読み一覧.csv');

const raw = fs.readFileSync(dataFile, 'utf-8');
const db = JSON.parse(raw);
const items = db.data;

// ひらがな・カタカナ変換ヘルパー
function kataToHira(str) {
  if (!str) return '';
  return str.replace(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60));
}
function hiraToKata(str) {
  if (!str) return '';
  return str.replace(/[\u3041-\u3096]/g, m => String.fromCharCode(m.charCodeAt(0) + 0x60));
}

// 1. 包括マスター辞書
const FORMULA_DICT = {}; // 処方名・製品名辞書: key -> Set of variants
const HERB_DICT = {};    // 生薬名辞書: key -> Set of variants

function addFormulaEntry(kanji, hira, kata, synonyms = []) {
  const set = new Set([kanji, hira, kata, ...synonyms].filter(Boolean));
  set.forEach(item => {
    set.add(kataToHira(item));
    set.add(hiraToKata(item));
  });
  set.forEach(key => {
    if (!FORMULA_DICT[key]) FORMULA_DICT[key] = new Set();
    set.forEach(v => FORMULA_DICT[key].add(v));
  });
}

function addHerbEntry(kanji, hira, kata, synonyms = []) {
  const set = new Set([kanji, hira, kata, ...synonyms].filter(Boolean));
  set.forEach(item => {
    set.add(kataToHira(item));
    set.add(hiraToKata(item));
  });
  set.forEach(key => {
    if (!HERB_DICT[key]) HERB_DICT[key] = new Set();
    set.forEach(v => HERB_DICT[key].add(v));
  });
}

// CSVから読み込み
if (fs.existsSync(csvFile)) {
  const lines = fs.readFileSync(csvFile, 'utf-8').split('\n').map(l => l.trim()).filter(Boolean);
  lines.slice(1).forEach(line => {
    const parts = line.split(',');
    if (parts.length >= 5) {
      const type = parts[0];
      const name = parts[1];
      const kanji = parts[2];
      const hira = parts[3];
      const kata = parts[4];
      if (type === '処方名') {
        addFormulaEntry(kanji, hira, kata, [name]);
      } else if (type === '生薬名') {
        addHerbEntry(kanji, hira, kata, [name]);
      }
    }
  });
}

// ユーザー指定処方・主要漢方処方
const EXTRA_FORMULAS = [
  { kanji: '芎帰調血飲第一加減', hira: 'きゅうきちょうけついんだいいちかげん', kata: 'キュウキチョウケツインダイイチカゲン' },
  { kanji: '芎帰調血飲', hira: 'きゅうきちょうけついん', kata: 'キュウキチョウケツイン' },
  { kanji: '参蘇飲', hira: 'じんそいん', kata: 'ジンソイン', synonyms: ['さんそいん', 'サンソイン'] },
  { kanji: '清心蓮子飲', hira: 'せいしんれんしいん', kata: 'セイシンレンシイン' },
  { kanji: '治打撲一方', hira: 'ちだぼくいっぽう', kata: 'チダボクイッポウ', synonyms: ['ぢだぼくいっぽう', 'ヂダボクイッポウ'] },
  { kanji: '当帰飲子', hira: 'とうきいんし', kata: 'トウキインシ' },
  { kanji: '茯苓飲', hira: 'ぶくりょういん', kata: 'ブクリョウイン' },
  { kanji: '治頭瘡一方', hira: 'ぢづそういっぽう', kata: 'ヂヅソウイッポウ', synonyms: ['ぢずそういっぽう', 'ちづそういっぽう', 'チヅソウイッポウ'] },
  { kanji: '折衝飲', hira: 'せっしょういん', kata: 'セッショウイン' },
  { kanji: '衛益', hira: 'えいえき', kata: 'エイエキ', synonyms: ['衛益顆粒', 'えいえきかりゅう', 'エイエキカリュウ'] },
  { kanji: '冠元', hira: 'かんげん', kata: 'カンゲン', synonyms: ['冠元顆粒', 'かんげんかりゅう', 'カンゲンカリュウ'] },
  { kanji: '健胃', hira: 'けんぴ', kata: 'ケンピ', synonyms: ['健脾', 'けんい', 'ケンイ', '健胃顆粒'] },
  { kanji: '勝湿', hira: 'しょうしつ', kata: 'ショウシツ', synonyms: ['勝湿顆粒', 'しょうしつかりゅう'] },
  { kanji: '心脾', hira: 'しんぴ', kata: 'シンピ', synonyms: ['帰脾', 'きひ', 'キヒ', '心脾顆粒'] },
  { kanji: '清営', hira: 'せいえい', kata: 'セイエイ', synonyms: ['清営顆粒'] },
  { kanji: '双料杞菊', hira: 'そうりょうこぎく', kata: 'ソウリョウコギク', synonyms: ['杞菊地黄丸', 'こぎくじおうがん'] },
  { kanji: '頂調', hira: 'ちょうちょう', kata: 'チョウチョウ', synonyms: ['頂調顆粒', '川芎茶調散'] },
  { kanji: '独歩', hira: 'どっぽ', kata: 'ドッポ', synonyms: ['独歩顆粒', '独活寄生湯'] },
  { kanji: '麦味参', hira: 'ばくみさん', kata: 'バクミサン', synonyms: ['麦味参顆粒', '生脈散'] },
  { kanji: '平喘', hira: 'へいぜい', kata: 'ヘイゼイ', synonyms: ['平喘顆粒', '定喘湯'] },
  { kanji: '麻杏止咳', hira: 'まきょうしがい', kata: 'マキョウシガイ', synonyms: ['麻杏止咳顆粒'] },
  { kanji: '瀉火利湿', hira: 'しゃかりしつ', kata: 'シャカリシツ', synonyms: ['瀉火利湿顆粒', '竜胆瀉肝湯'] },
  { kanji: '逍遙', hira: 'しょうよう', kata: 'ショウヨウ', synonyms: ['逍遥', '逍遙散', '加味逍遙散', 'かみしょうようさん'] },
  { kanji: '牛膝散', hira: 'ごしつさん', kata: 'ゴシツサン' },
  { kanji: '駆風解毒散', hira: 'くふうげどくさん', kata: 'クフウゲドクサン' },
  { kanji: '桂枝加竜骨牡蠣湯', hira: 'けいしかりゅうこつぼれいとう', kata: 'ケイシカリュウコツボレイトウ' },
  { kanji: '柴胡加竜骨牡蠣湯', hira: 'さいこかりゅうこつぼれいとう', kata: 'サイコカリュウコツボレイトウ' },
  { kanji: '清上防風湯', hira: 'せいじょうぼうふうとう', kata: 'セイジョウボウフウトウ' },
  { kanji: '防風通聖散', hira: 'ぼうふうつうしょうさん', kata: 'ボウフウツウショウサン' },
  { kanji: '八味地黄丸', hira: 'はちみじおうがん', kata: 'ハチミジオウガン' },
  { kanji: '六味丸', hira: 'ろくみがん', kata: 'ロクミガン', synonyms: ['六味地黄丸', 'ろくみじおうがん'] },
  { kanji: '葛根湯', hira: 'かっこんとう', kata: 'カッコントウ' },
  { kanji: '安中散', hira: 'あんちゅうさん', kata: 'アンチュウサン' },
  { kanji: '補中益気湯', hira: 'ほちゅうえっきとう', kata: 'ホチュウエッキトウ' },
  { kanji: '小柴胡湯', hira: 'しょうさいことう', kata: 'ショウサイコトウ' },
  { kanji: '大柴胡湯', hira: 'だいさいことう', kata: 'ダイサイコトウ' },
  { kanji: '半夏瀉心湯', hira: 'はんげしゃしんとう', kata: 'ハンゲシャシントウ' },
  { kanji: '半夏厚朴湯', hira: 'はんげこうぼくとう', kata: 'ハンゲコウボクトウ' },
  { kanji: '麦門冬湯', hira: 'ばくもんどうとう', kata: 'バクモンドウトウ' },
  { kanji: '五苓散', hira: 'ごれいさん', kata: 'ゴレイサン' },
  { kanji: '猪苓湯', hira: 'ちょれいとう', kata: 'チョレイトウ' },
  { kanji: '当帰芍薬散', hira: 'とうきしゃくやくさん', kata: 'トウキシャクヤクサン' },
  { kanji: '加味逍遙散', hira: 'かみしょうようさん', kata: 'カミショウヨウサン' },
  { kanji: '桂枝茯苓丸', hira: 'けいしぶくりょうがん', kata: 'ケイシブクリョウガン' },
  { kanji: '麻黄湯', hira: 'まおうとう', kata: 'マオウトウ' },
  { kanji: '小青竜湯', hira: 'しょうせいりゅうとう', kata: 'ショウセイリュウトウ', synonyms: ['小青龍湯'] },
  { kanji: '小青龍湯', hira: 'しょうせいりゅうとう', kata: 'ショウセイリュウトウ' },
  { kanji: '胃風湯', hira: 'いふうとう', kata: 'イフウトウ' },
  { kanji: '胃苓湯', hira: 'いれいとう', kata: 'イレイトウ' },
  { kanji: '響声破笛丸', hira: 'きょうせいはてきがん', kata: 'キョウセイハテキガン' },
  { kanji: '四逆湯', hira: 'しぎゃくとう', kata: 'シギャクトウ' },
  { kanji: '潤腸湯', hira: 'じゅんちょうとう', kata: 'ジュンチョウトウ' },
  { kanji: '調胃承気湯', hira: 'ちょういじょうきとう', kata: 'チョウイジョウキトウ' },
  { kanji: '二朮湯', hira: 'にじゅつとう', kata: 'ニジュツトウ' },
  { kanji: '半夏散及湯', hira: 'はんげさんきゅうとう', kata: 'ハンゲサンキュウトウ' },
  { kanji: '立効散', hira: 'りっこうさん', kata: 'リッコウサン' },
  { kanji: '葛根湯加川芎辛夷', hira: 'かっこんとうかせんきゅうしんい', kata: 'カッコントウカセンキュウシンイ' },
  { kanji: '辛夷清肺湯', hira: 'しんいせいはいとう', kata: 'シンイセイハイトウ' },
  { kanji: '荊芥連翹湯', hira: 'けいがいれんぎょうとう', kata: 'ケイガイレンギョウトウ' },
  { kanji: '十味敗毒湯', hira: 'じゅうみはいどくとう', kata: 'ジュウミハイドクトウ' },
  { kanji: '消風散', hira: 'しょうふうさん', kata: 'ショウフウサン' },
  { kanji: '当帰四逆加呉茱萸生姜湯', hira: 'とうきしぎゃくかごしゅゆしょうきょうとう', kata: 'トウキシギャクカゴシュユショウキョウトウ' },
  { kanji: '真武湯', hira: 'しんぶとう', kata: 'シンブトウ', synonyms: ['玄武湯'] },
  { kanji: '人参湯', hira: 'にんじんとう', kata: 'ニンジントウ', synonyms: ['理中丸', 'りちゅうがん'] },
  { kanji: '大建中湯', hira: 'だいけんちゅうとう', kata: 'ダイケンチュウトウ' },
  { kanji: '小建中湯', hira: 'しょうけんちゅうとう', kata: 'ショウケンチュウトウ' },
  { kanji: '柴苓湯', hira: 'さいれいとう', kata: 'サイレイトウ' },
  { kanji: '防己黄耆湯', hira: 'ぼういおうぎとう', kata: 'ボウイオウギトウ' },
  { kanji: '苓桂朮甘湯', hira: 'りょうけいじゅつかんとう', kata: 'リョウケイジュツカントウ' },
  // 追加処方・独自商品名読みマスター
  { kanji: '婦人宝', hira: 'ふじんほう', kata: 'フジンホウ' },
  { kanji: '療方補気升陽', hira: 'りょうほうほきしょうよう', kata: 'リョウホウホキショウヨウ' },
  { kanji: '松鶴湯', hira: 'しょうかくとう', kata: 'ショウカクトウ' },
  { kanji: '療方調律', hira: 'りょうほうちょうりつ', kata: 'リョウホウチョウリツ' },
  { kanji: '桂輝湯', hira: 'けいきとう', kata: 'ケイキトウ' },
  { kanji: '療方調血', hira: 'りょうほうちょうけつ', kata: 'リョウホウチョウケツ' },
  { kanji: '巡苓丸', hira: 'じゅんれいがん', kata: 'ジュンレイガン' },
  { kanji: '健婦丸', hira: 'けんぷがん', kata: 'ケンプガン' },
  { kanji: '風痒湯', hira: 'ふうようとう', kata: 'フウヨウトウ' },
  { kanji: '明寿仙', hira: 'めいじゅせん', kata: 'メイジュセン' },
  { kanji: '杞菊妙見', hira: 'こぎくみょうけん', kata: 'コギクミョウケン' },
  { kanji: '温補利水丸', hira: 'おんぽりすいがん', kata: 'オンポリスイガン' },
  { kanji: '暖中', hira: 'だんちゅう', kata: 'ダンチュウ' },
  { kanji: '療方調流', hira: 'りょうほうちょうりゅう', kata: 'リョウホウチョウリュウ' },
  { kanji: '三黄丸', hira: 'さんおうがん', kata: 'サンオウガン' },
  { kanji: '航気散', hira: 'こうきさん', kata: 'コウキサン' },
  { kanji: '爽風仙', hira: 'そうふうせん', kata: 'ソウフウセン' },
  { kanji: '痙緩湯', hira: 'けいかんとう', kata: 'ケイカントウ' },
  { kanji: '十味敗毒散', hira: 'じゅうみはいどくさん', kata: 'ジュウミハイドクサン' },
  { kanji: '建命湯', hira: 'けんめいとう', kata: 'ケンメイトウ' },
  { kanji: '温滋', hira: 'おんじ', kata: 'オンジ' },
  { kanji: '健康丸', hira: 'けんこうがん', kata: 'ケンコウガン' },
  { kanji: '桃核承気丸', hira: 'とうかくじょうきがん', kata: 'トウカクジョウキガン' },
  { kanji: '涌出', hira: 'ゆうしゅつ', kata: 'ユウシュツ' },
  { kanji: '丹心', hira: 'たんしん', kata: 'タンシン' },
  { kanji: '蘭州金匱腎気丸', hira: 'らんしゅうきんきじんきがん', kata: 'ランシュウキンキジンキガン' },
  { kanji: '取痞湯', hira: 'しゅひとう', kata: 'シュヒトウ' },
  { kanji: '表水丹', hira: 'ひょうすいたん', kata: 'ヒョウスイタン' },
  { kanji: '療方昇陽', hira: 'りょうほうしょうよう', kata: 'リョウホウショウヨウ' },
  { kanji: '運加湯', hira: 'うんかとう', kata: 'ウンカトウ' },
  { kanji: '悦我', hira: 'えつが', kata: 'エツガ' },
  { kanji: '痛効散', hira: 'つうこうさん', kata: 'ツウコウサン' },
  { kanji: '水眩湯', hira: 'すいげんとう', kata: 'スイゲントウ' },
  { kanji: '養成煎', hira: 'ようせいせん', kata: 'ヨウセイセン' },
  { kanji: '強折衝瘀血散', hira: 'きょうせっしょうおけつさん', kata: 'キョウセッショウオケツサン' },
  { kanji: '血府逐瘀', hira: 'けっぷちくお', kata: 'ケップチクオ' },
  { kanji: '排膿散', hira: 'はいのうさん', kata: 'ハイノウサン' },
  { kanji: '中将湯', hira: 'ちゅうじょうとう', kata: 'チュウジョウトウ' },
  { kanji: '駆瘀血丸', hira: 'くおけつがん', kata: 'クオケツガン' },
  { kanji: '下通丸', hira: 'げつうがん', kata: 'ゲツウガン' },
  { kanji: '冠源活血丸', hira: 'かんげんかっけつがん', kata: 'カンゲンカッケツガン' },
  { kanji: '甘草乾姜散', hira: 'かんぞうかんきょうさん', kata: 'カンゾウカンキョウサン' },
  { kanji: '廣東牛黄清心元', hira: 'かんとうごおうせいしんげん', kata: 'カントウゴオウセイシンゲン' },
  { kanji: '大黄牡丹皮丸', hira: 'だいおうぼたんぴがん', kata: 'ダイオウボタンピガン' },
  { kanji: '当帰芍薬丸', hira: 'とうきしゃくやくがん', kata: 'トウキシャクヤクガン' },
  { kanji: '白朮散', hira: 'びゃくじゅつさん', kata: 'ビャクジュツサン' },
  { kanji: '釣藤散', hira: 'ちょうとうさん', kata: 'チョウトウサン' },
  { kanji: '抑肝散', hira: 'よくかんさん', kata: 'ヨッカンサン', synonyms: ['よくかんさん'] },
  { kanji: '抑肝散加陳皮半夏', hira: 'よくかんさんかちんぴはんげ', kata: 'ヨッカンサンカチンピハンゲ' },
  { kanji: '酸棗仁湯', hira: 'さんそうにんとう', kata: 'サンソウニントウ' },
  { kanji: '帰脾湯', hira: 'きひとう', kata: 'キヒトウ' },
  { kanji: '加味帰脾湯', hira: 'かみきひとう', kata: 'カミキヒトウ' },
  { kanji: '四物湯', hira: 'しもつとう', kata: 'シモツトウ' },
  { kanji: '十全大補湯', hira: 'じゅうぜんたいほとう', kata: 'ジュウゼンタイホトウ' },
  { kanji: '人参養栄湯', hira: 'にんじんようえいとう', kata: 'ニンジンヨウエイトウ' }
];

EXTRA_FORMULAS.forEach(f => {
  addFormulaEntry(f.kanji, f.hira, f.kata, f.synonyms || []);
  // 生薬名としても登録（ingredients に処方名が入っている商品の救済）
  addHerbEntry(f.kanji, f.hira, f.kata, f.synonyms || []);
});

// ホノミ漢方（剤盛堂）、建林松鶴堂、イスクラ、救心等の固有商品マスター
const SPECIAL_PRODUCTS = [
  // 剤盛堂（ホノミ漢方）
  { kanji: '強下血散', hira: 'きょうげけつさん', kata: 'キョウゲケツサン' },
  { kanji: '強六君利気散', hira: 'きょうりっくんりきさん', kata: 'キョウリックンリキサン' },
  { kanji: '六君利気錠', hira: 'りっくんりきじょう', kata: 'リックンリキジョウ' },
  { kanji: '強冒眩散', hira: 'きょうぼうげんさん', kata: 'キョウボウゲンサン' },
  { kanji: '強喘咳散', hira: 'きょうぜんがいさん', kata: 'キョウゼンガイサン' },
  { kanji: '強回血散', hira: 'きょうかいけつさん', kata: 'キョウカイケツサン' },
  { kanji: '強安中脾虚散', hira: 'きょうあんちゅうひきょさん', kata: 'キョウアンチュウヒキョサン' },
  { kanji: '強実胸散', hira: 'きょうじつきょうさん', kata: 'キョウジツキョウサン' },
  { kanji: '強平胃食傷散', hira: 'きょうへいいしょくしょうさん', kata: 'キョウヘイイショクショウサン' },
  { kanji: '強悪阻散', hira: 'きょうおそさん', kata: 'キョウオソサン' },
  { kanji: '強気上散', hira: 'きょうきじょうさん', kata: 'キョウキジョウサン' },
  { kanji: '気上錠', hira: 'きじょうじょう', kata: 'キジョウジョウ' },
  { kanji: '強水逆散', hira: 'きょうすいぎゃくさん', kata: 'キョウスイギャクサン' },
  { kanji: '強治胸散', hira: 'きょうちきょうさん', kata: 'キョウチキョウサン' },
  { kanji: '強清肝散', hira: 'きょうせいかんさん', kata: 'キョウセイカンサン' },
  { kanji: '強温血散', hira: 'きょうおんけつさん', kata: 'キョウオンケツサン' },
  { kanji: '強痰飲散', hira: 'きょうたんいんさん', kata: 'キョウタンインサン' },
  { kanji: '強発汗散', hira: 'きょうはっかんさん', kata: 'キョウハッカンサン' },
  { kanji: '強結胸散', hira: 'きょうけっきょうさん', kata: 'キョウケッキョウサン' },
  { kanji: '強胃痛散', hira: 'きょういつうさん', kata: 'キョウイツウサン' },
  { kanji: '強胃腸散', hira: 'きょういちょうさん', kata: 'キョウイチョウサン' },
  { kanji: '強胸汗散', hira: 'きょうきょうかんさん', kata: 'キョウキョウカンサン' },
  { kanji: '強胸虚散', hira: 'きょうきょうきょさん', kata: 'キョウキョウキョサン' },
  { kanji: '胸虚錠', hira: 'きょうきょじょう', kata: 'キョウキョジョウ' },
  { kanji: '強蘇生散', hira: 'きょうそせいさん', kata: 'キョウソセイサン' },
  { kanji: '蘇生錠', hira: 'そせいじょう', kata: 'ソセイジョウ' },
  { kanji: '強虚労散', hira: 'きょうきょろうさん', kata: 'キョウキョロウサン' },
  { kanji: '強表水散', hira: 'きょうひょうすいさん', kata: 'キョウヒョウスイサン' },
  { kanji: '強衰性散', hira: 'きょうすいせいさん', kata: 'キョウスイセイサン' },
  { kanji: '強補中医王散', hira: 'きょうほちゅういおうさん', kata: 'キョウホチュウイオウサン' },
  { kanji: '補中医王錠', hira: 'ほちゅういおうじょう', kata: 'ホチュウイオウジョウ' },
  { kanji: '強足腫散', hira: 'きょうそくしゅさん', kata: 'キョウソクシュサン' },
  { kanji: '強鎮咳散', hira: 'きょうちんがいさん', kata: 'キョウチンガイサン' },
  { kanji: '強鎮悸散', hira: 'きょうちんきさん', kata: 'キョウチンキサン' },
  { kanji: '強風弱散', hira: 'きょうふうじゃくさん', kata: 'キョウフウジャクサン' },
  { kanji: '抑肝眩悸散', hira: 'よくかんげんきさん', kata: 'ヨッカンゲンキサン' },
  { kanji: '香蘇発表散', hira: 'こうそはっぴょうさん', kata: 'コウソハッピョウサン' },
  { kanji: '黄解清血散', hira: 'おうかいせいけつさん', kata: 'オウカイセイケツサン' },
  { kanji: '腹寒散', hira: 'ふくかんさん', kata: 'フクカンサン' },
  { kanji: '華蔘仙', hira: 'かじんせん', kata: 'カジンセン' },
  { kanji: '安静錠', hira: 'あんせいじょう', kata: 'アンセイジョウ' },
  { kanji: '四物血行散', hira: 'しもつけっこうさん', kata: 'シモツケッコウサン' },
  { kanji: '五積腰痛散', hira: 'ごしゃくようつうさん', kata: 'ゴシャクヨウツウサン' },

  // 建林松鶴堂
  { kanji: '喜効', hira: 'きこう', kata: 'キコウ' },
  { kanji: '松鶴天与', hira: 'しょうかくてんよ', kata: 'ショウカクテンヨ' },
  { kanji: '仁壽', hira: 'じんじゅ', kata: 'ジンジュ' },
  { kanji: '壽徳湯', hira: 'じゅとくとう', kata: 'ジュトクトウ' },
  { kanji: '威徳', hira: 'いとく', kata: 'イトク' },
  { kanji: '常楽', hira: 'じょうらく', kata: 'ジョウラク' },
  { kanji: '春香', hira: 'しゅんこう', kata: 'シュンコウ' },
  { kanji: '止血', hira: 'しけつ', kata: 'シケツ' },
  { kanji: '治咳湯', hira: 'ちがいとう', kata: 'チガイトウ' },
  { kanji: '流毒湯', hira: 'りゅうどくとう', kata: 'リュウドクトウ' },
  { kanji: '消毒湯', hira: 'しょうどくとう', kata: 'ショウドクトウ' },
  { kanji: '清風湯', hira: 'せいふうとう', kata: 'セイフウトウ' },
  { kanji: '神心', hira: 'しんしん', kata: 'シンシン' },
  { kanji: '耳痛', hira: 'じつう', kata: 'ジツウ' },
  { kanji: '花月湯', hira: 'かげつとう', kata: 'カゲツトウ' },
  { kanji: '豊心', hira: 'ほうしん', kata: 'ホウシン' },
  { kanji: '長命丸', hira: 'ちょうめいがん', kata: 'チョウメイガン' },
  { kanji: '長壽湯', hira: 'ちょうじゅとう', kata: 'チョウジュトウ' },
  { kanji: '順血湯', hira: 'じゅんけつとう', kata: 'ジュンケツトウ' },
  { kanji: '凌雲', hira: 'りょううん', kata: 'リョウウン' },
  { kanji: '荘蓉湯', hira: 'そうようとう', kata: 'ソウヨウトウ' },
  { kanji: '瑞祥湯', hira: 'ずいしょうとう', kata: 'ズイショウトウ' },
  { kanji: '口紫湯', hira: 'こうしとう', kata: 'コウシトウ' },
  { kanji: '妙煎', hira: 'みょうせん', kata: 'ミョウセン' },
  { kanji: '潤勝散', hira: 'じゅんしょうさん', kata: 'ジュンショウサン' },
  { kanji: '潤肌', hira: 'じゅんき', kata: 'ジュンキ' },
  { kanji: '回春散', hira: 'かいしゅんさん', kata: 'カイシュンサン' },
  { kanji: '不癢湯', hira: 'ふようとう', kata: 'フヨウトウ' },

  // 救心・中成薬・その他
  { kanji: '活命参', hira: 'かつめいさん', kata: 'カツメイサン' },
  { kanji: '能活精', hira: 'のうかっせい', kata: 'ノウカッセイ' },
  { kanji: '霊鹿参', hira: 'れいろくさん', kata: 'レイロクサン' },
  { kanji: '霊黄参', hira: 'れいおうさん', kata: 'レイオウサン' },
  { kanji: '複方霊黄参丸', hira: 'ふくほうれいおうさんがん', kata: 'フクホウレイオウサンガン' },
  { kanji: '点温膏K', hira: 'てんうんこうけー', kata: 'テンウンコウケー', synonyms: ['てんうんこう', 'テンウンコウ'] },
  { kanji: '開豊瓊玉膏', hira: 'かいほうけいぎょくこう', kata: 'カイホウケイギョクコウ' },
  { kanji: '紫參蒜内服液', hira: 'しさんさんないふくえき', kata: 'シサンサンナイフクエキ' },
  { kanji: '銀翹風熱丸', hira: 'ぎんぎょうふうねつがん', kata: 'ギンギョウフウネツガン' },
  { kanji: '精華潤腸丸', hira: 'せいかじゅんちょうがん', kata: 'セイカジュンチョウガン' },
  { kanji: '海馬補腎丸', hira: 'かいばほじんがん', kata: 'カイバホジンガン' },
  { kanji: '冠源活血丸', hira: 'かんげんかっけつがん', kata: 'カンゲンカッケツガン' },
  { kanji: '天王補心丸', hira: 'てんのうほしんがん', kata: 'テンノウホシンガン' },
  { kanji: '丹心方', hira: 'たんしんほう', kata: 'タンシンホウ' },
  { kanji: '双参', hira: 'そうじん', kata: 'ソウジン' },
  { kanji: '壮若錠', hira: 'そうじゃくじょう', kata: 'ソウジャクジョウ' },
  { kanji: '療方扶陽理中顆粒', hira: 'りょうほうふようりちゅうかりゅう', kata: 'リョウホウフヨウリチュウカリュウ' },
  { kanji: '薬参', hira: 'やくじん', kata: 'ヤクジン', synonyms: ['やくさん', 'ヤクサン'] },
  { kanji: '薬参α', hira: 'やくじんあるふぁ', kata: 'ヤクジンアルファ' },
  { kanji: '本草正露丸糖衣', hira: 'ほんぞうせいろがんとうい', kata: 'ホンゾウセイロガントウイ' },
  { kanji: '正露丸', hira: 'せいろがん', kata: 'セイロガン' },
  { kanji: '救心', hira: 'きゅうしん', kata: 'キュウシン' },
  { kanji: '救心錠剤', hira: 'きゅうしんじょうざい', kata: 'キュウシンジョウザイ' },
  { kanji: '救心六神丸', hira: 'きゅうしんろくしんがん', kata: 'キュウシンロクシンガン' },
  { kanji: '救心感応丸', hira: 'きゅうしんかんのうがん', kata: 'キュウシンカンノウガン', synonyms: ['救心感應丸'] },
  { kanji: '虔脩六神丸', hira: 'けんしゅうろくしんがん', kata: 'ケンシュウロクシンガン' },
  { kanji: '六神丸', hira: 'ろくしんがん', kata: 'ロクシンガン' },
  { kanji: '律鼓心', hira: 'りっこしん', kata: 'リッコシン' },

  // イスクラ丸剤等
  { kanji: '華陀膏', hira: 'かだこう', kata: 'カダコウ' },
  { kanji: '開気丸', hira: 'かいきがん', kata: 'カイキガン' },
  { kanji: '参茸補血丸', hira: 'さんじょうほけつがん', kata: 'サンジョウホケツガン' },
  { kanji: '参馬補腎丸', hira: 'じんばほじんがん', kata: 'ジンバホジンガン' },
  { kanji: '双料参茸丸', hira: 'そうりょうさんじょうがん', kata: 'ソウリョウサンジョウガン' },
  { kanji: '八仙丸', hira: 'はっせんがん', kata: 'ハッセンガン' },
  { kanji: '補中丸', hira: 'ほちゅうがん', kata: 'ホチュウガン' },
  { kanji: '槐角丸', hira: 'かいかくがん', kata: 'カイカクガン' },
  { kanji: '瀉火補腎丸', hira: 'しゃかほじんがん', kata: 'シャカホジンガン' },
  { kanji: '血府逐お顆粒', hira: 'けっぷちくおかりゅう', kata: 'ケップチクオカリュウ' },
  { kanji: '駆お血丸', hira: 'くおけつがん', kata: 'クオケツガン' },
  { kanji: '生脈宝エキス細粒A', hira: 'しょうみゃくほうえきすさいりゅうえー', kata: 'ショウミャクホウエキスサイリュウエー' }
];

SPECIAL_PRODUCTS.forEach(p => {
  addFormulaEntry(p.kanji, p.hira, p.kata, p.synonyms || []);
  addHerbEntry(p.kanji, p.hira, p.kata, p.synonyms || []);
});

COMPREHENSIVE_FORMULA_READINGS.forEach(p => {
  addFormulaEntry(p.kanji, p.hira, p.kata, p.synonyms || []);
  addHerbEntry(p.kanji, p.hira, p.kata, p.synonyms || []);
});

// 生薬マスター辞書
const EXTRA_HERBS = [
  { kanji: '沙参', hira: 'しゃじん', kata: 'シャジン' },
  { kanji: '藁本', hira: 'こうほん', kata: 'コウホン' },
  { kanji: '附子', hira: 'ぶし', kata: 'ブシ', synonyms: ['加工附子', '炮附子', '烏頭', 'ウズ', 'うず', 'ブシ末', 'ぶしまつ', '加工ブシ'] },
  { kanji: '地黄', hira: 'じおう', kata: 'ジオウ', synonyms: ['乾地黄', '熟地黄', 'かんじおう', 'じゅくじおう', '乾ジオウ', '熟ジオウ'] },
  { kanji: '薏苡仁', hira: 'よくいにん', kata: 'ヨクイニン', synonyms: ['よく苡仁', 'ヨクイ仁', 'よくい仁'] },
  { kanji: '川芎', hira: 'せんきゅう', kata: 'センキュウ', synonyms: ['川きゅう', '川キュウ'] },
  { kanji: '栝楼仁', hira: 'かろにん', kata: 'カロニン', synonyms: ['括楼仁', 'か楼仁', 'か楼根', 'カロコン', '栝楼根'] },
  { kanji: '人参', hira: 'にんじん', kata: 'ニンジン', synonyms: ['紅参', 'こうじん', 'コウジン', '白参', '朝鮮人参'] },
  { kanji: '牛黄', hira: 'ごおう', kata: 'ゴオウ' },
  { kanji: '麝香', hira: 'じゃこう', kata: 'ジャコウ' },
  { kanji: '蟾酥', hira: 'せんそ', kata: 'センソ' },
  { kanji: '熊胆', hira: 'ゆうたん', kata: 'ユウタン' },
  { kanji: '竜脳', hira: 'りゅうのう', kata: 'リュウノウ', synonyms: ['龍脳'] },
  { kanji: '牛膝', hira: 'ごしつ', kata: 'ゴシツ' },
  { kanji: '桂皮', hira: 'けいひ', kata: 'ケイヒ', synonyms: ['肉桂', 'にっけい'] },
  { kanji: '芍薬', hira: 'しゃくやく', kata: 'シャクヤク', synonyms: ['白芍', '赤芍'] },
  { kanji: '甘草', hira: 'かんぞう', kata: 'カンゾウ', synonyms: ['炙甘草', 'しゃかんぞう'] },
  { kanji: '大棗', hira: 'たいそう', kata: 'タイソウ', synonyms: ['ナツメ', 'なつめ'] },
  { kanji: '生姜', hira: 'しょうきょう', kata: 'ショウキョウ', synonyms: ['ショウガ', 'しょうが'] },
  { kanji: '乾姜', hira: 'かんきょう', kata: 'カンキョウ' },
  { kanji: '半夏', hira: 'はんげ', kata: 'ハンゲ' },
  { kanji: '柴胡', hira: 'さいこ', kata: 'サイコ' },
  { kanji: '黄芩', hira: 'おうごん', kata: 'オウゴン' },
  { kanji: '黄連', hira: 'おうれん', kata: 'オウレン' },
  { kanji: '黄柏', hira: 'おうばく', kata: 'オウバク' },
  { kanji: '茯苓', hira: 'ぶくりょう', kata: 'ブクリョウ' },
  { kanji: '白朮', hira: 'びゃくじゅつ', kata: 'ビャクジュツ' },
  { kanji: '蒼朮', hira: 'そうじゅつ', kata: 'ソウジュツ' },
  { kanji: '当帰', hira: 'とうき', kata: 'トウキ' },
  { kanji: '川骨', hira: 'せんこつ', kata: 'センコツ' },
  { kanji: '麻黄', hira: 'まおう', kata: 'マオウ' },
  { kanji: '葛根', hira: 'かっこん', kata: 'カッコン' },
  { kanji: '杏仁', hira: 'きょうにん', kata: 'キョウニン' },
  { kanji: '厚朴', hira: 'こうぼく', kata: 'コウボク' },
  { kanji: '陳皮', hira: 'ちんぴ', kata: 'チンピ' },
  { kanji: '枳実', hira: 'きじつ', kata: 'キジツ' },
  { kanji: '山梔子', hira: 'さんしし', kata: 'サンシシ', synonyms: ['クチナシ'] },
  { kanji: '連翹', hira: 'れんぎょう', kata: 'レンギョウ' },
  { kanji: '防風', hira: 'ぼうふう', kata: 'ボウフウ' },
  { kanji: '荊芥', hira: 'けいがい', kata: 'ケイガイ' },
  { kanji: '細辛', hira: 'さいしん', kata: 'サイシン' },
  { kanji: '辛夷', hira: 'しんい', kata: 'シンイ' },
  { kanji: '五味子', hira: 'ごみし', kata: 'ゴミシ' },
  { kanji: '麦門冬', hira: 'ばくもんどう', kata: 'バクモンドウ' },
  { kanji: '天門冬', hira: 'てんもんどう', kata: 'テンモンドウ' },
  { kanji: '知母', hira: 'ちも', kata: 'チモ' },
  { kanji: '石膏', hira: 'せっこう', kata: 'セッコウ' },
  { kanji: '牡蛎', hira: 'ぼれい', kata: 'ボレイ', synonyms: ['牡蠣'] },
  { kanji: '竜骨', hira: 'りゅうこつ', kata: 'リュウコツ' },
  { kanji: '阿膠', hira: 'あきょう', kata: 'アキョウ' },
  { kanji: '艾葉', hira: 'がいよう', kata: 'ガイヨウ', synonyms: ['ヨモギ', 'よもぎ'] },
  { kanji: '牡丹皮', hira: 'ぼたんぴ', kata: 'ボタンピ' },
  { kanji: '桃仁', hira: 'とうにん', kata: 'トウニン' },
  { kanji: '紅花', hira: 'こうか', kata: 'コウカ' },
  { kanji: '蘇木', hira: 'そぼく', kata: 'ソボク' },
  { kanji: '延胡索', hira: 'えんごさく', kata: 'エンゴサク' },
  { kanji: '没薬', hira: 'もつやく', kata: 'モツヤク' },
  { kanji: '乳香', hira: 'にゅうこう', kata: 'ニュウコウ' },
  { kanji: '木香', hira: 'もっこう', kata: 'モッコウ' },
  { kanji: '香附子', hira: 'こうぶし', kata: 'コウブシ' },
  { kanji: '烏薬', hira: 'うやく', kata: 'ウヤク' },
  { kanji: '沈香', hira: 'じんこう', kata: 'ジンコウ' },
  { kanji: '丁香', hira: 'ちょうこう', kata: 'チョウコウ', synonyms: ['丁子', 'ちょうじ'] },
  { kanji: '縮砂', hira: 'しゅくしゃ', kata: 'シュクシャ', synonyms: ['砂仁', 'しゃにん'] },
  { kanji: '白豆寇', hira: 'びゃくずく', kata: 'ビャクズク' },
  { kanji: '草豆寇', hira: 'そうずく', kata: 'ソウズク' },
  { kanji: '益智', hira: 'やくち', kata: 'ヤクチ' },
  { kanji: '呉茱萸', hira: 'ごしゅゆ', kata: 'ゴシュユ' },
  { kanji: '山椒', hira: 'さんしょう', kata: 'サンショウ' },
  { kanji: '良姜', hira: 'りょうきょう', kata: 'リョウキョウ', synonyms: ['高良姜'] },
  { kanji: '小茴香', hira: 'しょうういきょう', kata: 'ショウウイキョウ', synonyms: ['茴香', 'ういきょう', 'ウイキョウ'] },
  { kanji: '胡椒', hira: 'こしょう', kata: 'コショウ' },
  { kanji: '大黄', hira: 'だいおう', kata: 'ダイオウ' },
  { kanji: '芒硝', hira: 'ぼうしょう', kata: 'ボウショウ', synonyms: ['無水芒硝', 'ボウショウ'] },
  { kanji: '麻子仁', hira: 'ましにん', kata: 'マシニン' },
  { kanji: '郁李仁', hira: 'いくりにん', kata: 'イクリニン' },
  { kanji: '蘆薈', hira: 'ろかい', kata: 'ロカイ', synonyms: ['アロエ', 'あろえ'] },
  { kanji: 'センナ', hira: 'せんな', kata: 'センナ' },
  { kanji: '当薬', hira: 'とうやく', kata: 'トウヤク', synonyms: ['センブリ', 'せんぶり'] },
  { kanji: '竜胆', hira: 'りゅうたん', kata: 'リュウタン' },
  { kanji: '苦参', hira: 'くじん', kata: 'クジン' },
  { kanji: '槐花', hira: 'かいか', kata: 'カイカ' },
  { kanji: '地楡', hira: 'ちゆ', kata: 'チユ' },
  { kanji: '側柏葉', hira: 'そくはくよう', kata: 'ソクハクヨウ' },
  { kanji: '白茅根', hira: 'びゃくぼうこん', kata: 'ビャクボウコン', synonyms: ['茅根', 'ぼうこん'] },
  { kanji: '蒲黄', hira: 'ほおう', kata: 'ホオウ' },
  { kanji: '三七', hira: 'さんしち', kata: 'サンシチ', synonyms: ['田七人参', '田七', 'でんしち', 'デンシチ'] },
  { kanji: '沢瀉', hira: 'たくしゃ', kata: 'タクシャ' },
  { kanji: '猪苓', hira: 'ちょれい', kata: 'チョレイ' },
  { kanji: '車前子', hira: 'しゃぜんし', kata: 'シャゼンシ' },
  { kanji: '車前草', hira: 'しゃぜんそう', kata: 'シャゼンソウ' },
  { kanji: '木通', hira: 'もくつう', kata: 'モクツウ' },
  { kanji: '通草', hira: 'つうそう', kata: 'ツウソウ' },
  { kanji: '滑石', hira: 'かっせき', kata: 'カッセキ' },
  { kanji: '茵蔯蒿', hira: 'いんちんこう', kata: 'インチンコウ', synonyms: ['茵陳蒿'] },
  { kanji: '金銀花', hira: 'きんぎんか', kata: 'キンギンカ' },
  { kanji: '蒲公英', hira: 'ほこうえい', kata: 'ホコウエイ', synonyms: ['タンポポ', 'たんぽぽ'] },
  { kanji: '紫花地丁', hira: 'しかじちょう', kata: 'シカジチョウ' },
  { kanji: '敗醤草', hira: 'はいしょうそう', kata: 'ハイショウソウ' },
  { kanji: '白頭翁', hira: 'はくとうおう', kata: 'ハクトウオウ' },
  { kanji: '馬歯莧', hira: 'ばしけん', kata: 'バシケン' },
  { kanji: '山豆根', hira: 'さんずこん', kata: 'サンズコン' },
  { kanji: '射干', hira: 'やかん', kata: 'ヤカン' },
  { kanji: '牛蒡子', hira: 'ごぼうし', kata: 'ゴボウシ' },
  { kanji: '升麻', hira: 'しょうま', kata: 'ショウマ' },
  { kanji: '葛花', hira: 'かっか', kata: 'カッカ' },
  { kanji: '桑白皮', hira: 'そうはくひ', kata: 'ソウハクヒ' },
  { kanji: '枇杷葉', hira: 'びわよう', kata: 'ビワヨウ' },
  { kanji: '前胡', hira: 'ぜんこ', kata: 'ゼンコ' },
  { kanji: '白前', hira: 'はくぜん', kata: 'ハクゼン' },
  { kanji: '紫苑', hira: 'しおん', kata: 'シオン' },
  { kanji: '款冬花', hira: 'かんとうか', kata: 'カントウカ' },
  { kanji: '百部', hira: 'ひゃくぶ', kata: 'ヒャクブ' },
  { kanji: '桔梗', hira: 'ききょう', kata: 'キキョウ' },
  { kanji: '旋覆花', hira: 'せんぷくか', kata: 'センプクカ' },
  { kanji: '白芥子', hira: 'はくがいし', kata: 'ハクガイシ' },
  { kanji: '蘇子', hira: 'そし', kata: 'ソシ', synonyms: ['紫蘇子', 'しそし'] },
  { kanji: '竹茹', hira: 'ちくじょ', kata: 'チクジョ' },
  { kanji: '昆布', hira: 'こんぶ', kata: 'コンブ' },
  { kanji: '海藻', hira: 'かいそう', kata: 'カイソウ' },
  { kanji: '海金沙', hira: 'かいきんしゃ', kata: 'カイキンシャ' },
  { kanji: '瞿麦', hira: 'くばく', kata: 'クバク' },
  { kanji: '扁蓄', hira: 'へんちく', kata: 'ヘンチク' },
  { kanji: '萆薢', hira: 'ひかい', kata: 'ヒカイ' },
  { kanji: '防己', hira: 'ぼうい', kata: 'ボウイ', synonyms: ['木防己', '漢防己'] },
  { kanji: '秦艽', hira: 'じんぎょう', kata: 'ジンギョウ' },
  { kanji: '威霊仙', hira: 'いれいせん', kata: 'イレイセン' },
  { kanji: '独活', hira: 'どっかつ', kata: 'ドッカツ' },
  { kanji: '桑寄生', hira: 'そうきせい', kata: 'ソウキセイ' },
  { kanji: '五加皮', hira: 'ごかひ', kata: 'ゴカヒ' },
  { kanji: '千年健', hira: 'せんねんけん', kata: 'センネンケン' },
  { kanji: '徐長卿', hira: 'じょちょうけい', kata: 'ジョチョウケイ' },
  { kanji: '海桐皮', hira: 'かいとうひ', kata: 'カイトウヒ' },
  { kanji: '豨薟草', hira: 'きけんそう', kata: 'キケンソウ' },
  { kanji: '白花蛇舌草', hira: 'びゃくかじゃぜつそう', kata: 'ビャッカジャゼツソウ' },
  { kanji: '半枝蓮', hira: 'はんしれん', kata: 'ハンシレン' },
  { kanji: '鹿茸', hira: 'ろくじょう', kata: 'ロクジョウ' },
  { kanji: '肉蓯蓉', hira: 'にくじゅよう', kata: 'ニクジュヨウ' },
  { kanji: '鎖陽', hira: 'さよう', kata: 'サヨウ' },
  { kanji: '淫羊藿', hira: 'いんようかく', kata: 'インヨウカク', synonyms: ['淫羊かく', 'イカリソウ', 'いかりそう'] },
  { kanji: '巴戟天', hira: 'はげきてん', kata: 'ハゲキテン' },
  { kanji: '補骨脂', hira: 'ほこつし', kata: 'ホコツシ' },
  { kanji: '益智仁', hira: 'やくちにん', kata: 'ヤクチニン' },
  { kanji: '菟絲子', hira: 'としし', kata: 'トシシ' },
  { kanji: '沙苑子', hira: 'さえんし', kata: 'サエンシ' },
  { kanji: '杜仲', hira: 'とちゅう', kata: 'トチュウ' },
  { kanji: '続断', hira: 'ぞくだん', kata: 'ゾクダン' },
  { kanji: '骨砕補', hira: 'こっさいほ', kata: 'コッサイホ' },
  { kanji: '狗脊', hira: 'くせき', kata: 'クセキ' },
  { kanji: '冬虫夏草', hira: 'とうちゅうかそう', kata: 'トウチュウカソウ' },
  { kanji: '蛤蚧', hira: 'ごうかい', kata: 'ゴウカイ' },
  { kanji: '紫河車', hira: 'しかしゃ', kata: 'シカシャ' },
  { kanji: '黄精', hira: 'おうせい', kata: 'オウセイ' },
  { kanji: '玉竹', hira: 'ぎょくちく', kata: 'ギョクチク' },
  { kanji: '石斛', hira: 'せっこく', kata: 'セッコク' },
  { kanji: '百合', hira: 'びゃくごう', kata: 'ビャクゴウ', synonyms: ['ゆり', 'ユリ'] },
  { kanji: '桑椹', hira: 'そうじん', kata: 'ソウジン' },
  { kanji: '黒芝麻', hira: 'こくしーま', kata: 'コクシーマ', synonyms: ['胡麻', 'ごま', 'ゴマ', '黒胡麻'] },
  { kanji: '女貞子', hira: 'じょていし', kata: 'ジョテイシ' },
  { kanji: '旱蓮草', hira: 'かんれんそう', kata: 'カンレンソウ' },
  { kanji: '亀板', hira: 'きばん', kata: 'キバン' },
  { kanji: '鼈甲', hira: 'べっこう', kata: 'ベッコウ' },
  { kanji: '酸棗仁', hira: 'さんそうにん', kata: 'サンソウニン' },
  { kanji: '柏子仁', hira: 'はくしにん', kata: 'ハクシニン' },
  { kanji: '遠志', hira: 'おんじ', kata: 'オンジ' },
  { kanji: '合歓皮', hira: 'ごうかんひ', kata: 'ゴウカンヒ' },
  { kanji: '夜交藤', hira: 'やこうとう', kata: 'ヤコウトウ' },
  { kanji: '朱砂', hira: 'しゅしゃ', kata: 'シュシャ' },
  { kanji: '磁石', hira: 'じしゃく', kata: 'ジシャク' },
  { kanji: '琥珀', hira: 'こはく', kata: 'コハク' },
  { kanji: '羚羊角', hira: 'れいようかく', kata: 'レイヨウカク' },
  { kanji: '釣藤鈎', hira: 'ちょうとうこう', kata: 'チョウトウコウ', synonyms: ['釣藤', 'ちょうとう'] },
  { kanji: '天麻', hira: 'てんま', kata: 'テンマ' },
  { kanji: '地竜', hira: 'じりゅう', kata: 'ジリュウ', synonyms: ['みみず', 'ミミズ'] },
  { kanji: '全蠍', hira: 'ぜんかつ', kata: 'ゼンカツ' },
  { kanji: '蜈蚣', hira: 'ごきょう', kata: 'ゴキョウ', synonyms: ['むかで', 'ムカデ'] },
  { kanji: '僵蚕', hira: 'きょうさん', kata: 'キョウサン' },
  { kanji: '山茱萸', hira: 'さんしゅゆ', kata: 'サンシュユ' },
  { kanji: '覆盆子', hira: 'ふくぼんし', kata: 'フクボンシ' },
  { kanji: '金桜子', hira: 'きんおうし', kata: 'キンオウシ' },
  { kanji: '海螵蛸', hira: 'かいひょうしょう', kata: 'カイヒョウショウ' },
  { kanji: '蓮肉', hira: 'れんにく', kata: 'レンニク', synonyms: ['蓮子', 'れんし'] },
  { kanji: '蓮鬚', hira: 'れんしゅ', kata: 'レンシュ' },
  { kanji: '芡実', hira: 'けんじつ', kata: 'ケンジツ' },
  { kanji: '訶子', hira: 'かし', kata: 'カシ' },
  { kanji: '肉豆寇', hira: 'にくずく', kata: 'ニクズク' },
  { kanji: '赤石脂', hira: 'しゃくせきし', kata: 'シャクセキシ' },
  { kanji: '禹余糧', hira: 'うよりょう', kata: 'ウヨリョウ' },
  { kanji: '浮小麦', hira: 'ふしょうばく', kata: 'フショウバク' },
  { kanji: '麻黄根', hira: 'まおうこん', kata: 'マオウコン' },
  { kanji: '糯稲根', hira: 'だとうこん', kata: 'ダトウコン' },
  { kanji: '椿皮', hira: 'ちんぴ', kata: 'チンピ' },
  { kanji: '鶏内金', hira: 'けいないきん', kata: 'ケイナイキン' },
  { kanji: '山査子', hira: 'さんざし', kata: 'サンザシ' },
  { kanji: '神麹', hira: 'しんきく', kata: 'シンキク', synonyms: ['神曲', '神麯', '神きく'] },
  { kanji: '神曲', hira: 'しんきく', kata: 'シンキク', synonyms: ['神麹', '神麯', '神きく'] },
  { kanji: '藿香', hira: 'かっこう', kata: 'カッコウ', synonyms: ['かっ香'] },
  { kanji: '蝉退', hira: 'せんたい', kata: 'センタイ', synonyms: ['せん退'] },
  { kanji: '莪朮', hira: 'がじゅつ', kata: 'ガジュツ', synonyms: ['莪じゅつ'] },
  { kanji: '蒺藜', hira: 'しつり', kata: 'シツリ', synonyms: ['しつり', '白蒺藜'] },
  { kanji: '白芷', hira: 'びゃくし', kata: 'ビャクシ', synonyms: ['白し'] },
  { kanji: '朴樕', hira: 'ぼくそく', kata: 'ボクソク', synonyms: ['樸そく'] },
  { kanji: '紫苑', hira: 'しおん', kata: 'シオン', synonyms: ['紫おん'] },
  { kanji: '麦芽', hira: 'ばくが', kata: 'バクガ' },
  { kanji: '莱菔子', hira: 'らいふくし', kata: 'ライフクシ' },
  { kanji: '榧子', hira: 'ひし', kata: 'ヒシ' },
  { kanji: '檳榔子', hira: 'びんろうじ', kata: 'ビンロウジ' },
  { kanji: '南瓜子', hira: 'なんかづ', kata: 'ナンカヅ' },
  { kanji: '雷丸', hira: 'らいがん', kata: 'ライガン' },
  { kanji: '鶴草芽', hira: 'かくそうが', kata: 'カクソウガ' },
  { kanji: '反鼻', hira: 'はんぴ', kata: 'ハンピ', synonyms: ['まむし', 'マムシ'] },
  { kanji: 'シベット', hira: 'しべっと', kata: 'シベット', synonyms: ['霊猫香', 'れいびょうこう'] },

  // 一般分類名・成分
  { kanji: '脂質', hira: 'ししつ', kata: 'シシツ' },
  { kanji: '炭水化物', hira: 'たんすいかぶつ', kata: 'タンスイカブツ' },
  { kanji: '食塩相当量', hira: 'しょくえんそうとうりょう', kata: 'ショクエンソウトウリョウ' },
  { kanji: '生薬製剤', hira: 'しょうやくせいざい', kata: 'ショウヤクセイザイ' },
  { kanji: '生薬主薬製剤', hira: 'しょうやくしゅやくせいざい', kata: 'ショウヤクシュヤクセイザイ' },
  { kanji: '化膿性疾患用薬', hira: 'かのうせいしっかんようやく', kata: 'カノウセイシッカンヨウヤク' },
  { kanji: '殺菌消毒薬', hira: 'さっきんしょうどくやく', kata: 'サッキンショウドクヤク' },
  { kanji: '婦人薬', hira: 'ふじんやく', kata: 'フジンヤク' },
  { kanji: '健胃薬', hira: 'けんいやく', kata: 'ケンイヤク' },
  { kanji: '止瀉薬', hira: 'ししゃやく', kata: 'シシャヤク' },
  { kanji: '強心薬', hira: 'きょうしんやく', kata: 'キョウシンヤク' },
  { kanji: '胃腸薬', hira: 'いちょうやく', kata: 'イチョウヤク' }
];

EXTRA_HERBS.forEach(h => {
  addHerbEntry(h.kanji, h.hira, h.kata, h.synonyms || []);
});

console.log(`Total Formula keys: ${Object.keys(FORMULA_DICT).length}`);
console.log(`Total Herb keys: ${Object.keys(HERB_DICT).length}`);

// 2. 全2,320商品の相互展開
let count = 0;

// 使用上の注意の空改行省略整形関数
function refinePrecautions(text) {
  if (!text) return '';
  let s = text
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = s.split('\n').map(l => l.trimEnd());
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) {
      if (newLines.length > 0 && newLines[newLines.length - 1] === '') continue;
      
      const nextLine = (lines[i + 1] || '').trim();
      if (/^[（\(][0-9０-９a-zA-Z]+[）\)]/.test(nextLine) ||
          /^[①-⑳]/.test(nextLine) ||
          /^まれに/.test(nextLine) ||
          /^その場合は/.test(nextLine) ||
          nextLine.includes('：') && !nextLine.startsWith('［') && !nextLine.startsWith('【')) {
        continue;
      }
      newLines.push('');
    } else {
      newLines.push(line);
    }
  }
  return newLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// 漢字置換マッピング（交ぜ書き -> 正式漢字）
const KANJI_REPLACEMENTS = [
  { from: /神きく/g, to: '神麹' },
  { from: /茵ちん/g, to: '茵蔯' },
  { from: /川きゅう/g, to: '川芎' },
  { from: /かっ香/g, to: '藿香' },
  { from: /よく苡/g, to: '薏苡' },
  { from: /きゅう帰/g, to: '芎帰' },
  { from: /駆お/g, to: '駆瘀' },
  { from: /逐お/g, to: '逐瘀' },
  { from: /お血/g, to: '瘀血' },
  { from: /竹じょ/g, to: '竹茹' },
  { from: /釣とう/g, to: '釣藤' },
  { from: /荊がい/g, to: '荊芥' },
  { from: /か楼/g, to: '栝楼' },
  { from: /せん退/g, to: '蝉退' },
  { from: /莪じゅつ/g, to: '莪朮' },
  { from: /紫おん/g, to: '紫苑' },
  { from: /しつり/g, to: '蒺藜' },
  { from: /肉豆く/g, to: '肉豆寇' },
  { from: /白し/g, to: '白芷' },
  { from: /樸そく/g, to: '朴樕' },
  { from: /淫羊かく/g, to: '淫羊藿' },
  { from: /連ぎょう/g, to: '連翹' },
  { from: /防ふう/g, to: '防風' },
  { from: /大黄ぼう硝/g, to: '大黄芒硝' },
  { from: /乾きょう/g, to: '乾姜' },
  { from: /小青りゅう/g, to: '小青竜' },
  { from: /柴胡加竜骨ぼれい/g, to: '柴胡加竜骨牡蠣' },
  { from: /桂枝加竜骨ぼれい/g, to: '桂枝加竜骨牡蠣' }
];

items.forEach(item => {
  // 特定成分の補正（行政薬効名からの生薬名復元）
  if (item.name.includes('地竜') && (!item.ingredients || item.ingredients.length === 0 || item.ingredients[0].name === '解熱鎮痛薬')) {
    item.ingredients = [{ name: '地竜', amount: 3.0, amountStr: '3.0g', isExtract: false }];
  }
  if ((item.name.includes('ヨクイニン') || item.name.includes('薏苡仁')) && (!item.ingredients || item.ingredients.length === 0 || item.ingredients[0].name === '皮膚軟化薬')) {
    item.ingredients = [{ name: 'ヨクイニン', amount: 19.5, amountStr: '19.5g', isExtract: false }];
  }
  if (item.name === 'ツムラ滋陰至宝湯エキス顆粒' && item.ingredients && item.ingredients.length === 1 && item.ingredients[0].name === '滋陰至宝湯') {
    item.ingredients = [
      { name: '滋陰至宝湯乾燥エキス', amount: 4.5, amountStr: '4.5g', isExtract: true },
      { name: 'トウキ', amount: 3.0, amountStr: '3.0g', isExtract: false },
      { name: 'シャクヤク', amount: 3.0, amountStr: '3.0g', isExtract: false },
      { name: 'ビャクジュツ', amount: 3.0, amountStr: '3.0g', isExtract: false },
      { name: 'ブクリョウ', amount: 3.0, amountStr: '3.0g', isExtract: false },
      { name: 'チンピ', amount: 2.0, amountStr: '2.0g', isExtract: false },
      { name: 'コウボク', amount: 2.0, amountStr: '2.0g', isExtract: false },
      { name: 'オウゴン', amount: 2.0, amountStr: '2.0g', isExtract: false },
      { name: 'キキョウ', amount: 2.0, amountStr: '2.0g', isExtract: false },
      { name: 'チモ', amount: 2.0, amountStr: '2.0g', isExtract: false },
      { name: 'バイモ', amount: 2.0, amountStr: '2.0g', isExtract: false },
      { name: 'サイコ', amount: 1.5, amountStr: '1.5g', isExtract: false },
      { name: 'カンゾウ', amount: 1.0, amountStr: '1.0g', isExtract: false },
      { name: 'ショウキョウ', amount: 0.5, amountStr: '0.5g', isExtract: false },
      { name: 'ハッカ', amount: 0.5, amountStr: '0.5g', isExtract: false }
    ];
  }
  ['name', 'rawName', 'subCategory', 'formulaName', 'sortKey', 'subCategorySortKey'].forEach(field => {
    if (item[field]) {
      let val = item[field];
      KANJI_REPLACEMENTS.forEach(rep => {
        if (rep.from.test(val)) val = val.replace(rep.from, rep.to);
      });
      item[field] = val;
    }
  });

  if (Array.isArray(item.ingredients)) {
    item.ingredients.forEach(ing => {
      if (ing.name) {
        let n = ing.name;
        KANJI_REPLACEMENTS.forEach(rep => {
          if (rep.from.test(n)) n = n.replace(rep.from, rep.to);
        });
        ing.name = n;
      }
    });
  }

  if (item.precautions) {
    item.precautions = refinePrecautions(item.precautions);
  }
  const nameSet = new Set();
  const herbSet = new Set();
  const readingsSet = new Set();

  // A. 商品名・処方名・通称名
  const rawNames = [
    item.name,
    item.rawName,
    item.subName,
    item.category,
    item.formulaName,
    item.formulaNo
  ].filter(Boolean);

  rawNames.forEach(rn => {
    nameSet.add(rn);
    nameSet.add(kataToHira(rn));
    nameSet.add(hiraToKata(rn));

    // 辞書マッチ（完全一致または部分一致）
    Object.keys(FORMULA_DICT).forEach(fKey => {
      if (rn.includes(fKey)) {
        FORMULA_DICT[fKey].forEach(variant => {
          nameSet.add(variant);
          readingsSet.add(variant);
        });
      }
    });

    const isSingleHerbItem = item.subCategory === '生薬' || item.classification === '生薬' ||
      item.name.startsWith('ウチダの') && !item.name.includes('丸') && !item.name.includes('湯') && !item.name.includes('散') ||
      item.name.startsWith('トチモトの') && !item.name.includes('丸') && !item.name.includes('湯') && !item.name.includes('散') ||
      item.name.startsWith('ツムラの生薬');

    if (isSingleHerbItem) {
      Object.keys(HERB_DICT).forEach(hKey => {
        if (rn.includes(hKey)) {
          HERB_DICT[hKey].forEach(variant => {
            nameSet.add(variant);
            readingsSet.add(variant);
          });
        }
      });
    }
  });

  // 処方番号・号数
  if (item.prescriptionNumber) {
    nameSet.add(`No.${item.prescriptionNumber}`);
    nameSet.add(`No${item.prescriptionNumber}`);
    nameSet.add(`${item.prescriptionNumber}番`);
    nameSet.add(`${item.prescriptionNumber}`);
    nameSet.add(`TJ-${item.prescriptionNumber}`);
  }
  if (item.companyNumber) {
    nameSet.add(`${item.companyNumber}号`);
    nameSet.add(`-${item.companyNumber}号`);
    nameSet.add(`${item.companyNumber}`);
  }

  // B. 生薬名
  if (Array.isArray(item.ingredients)) {
    item.ingredients.forEach(ing => {
      if (!ing.name) return;
      const rawHerb = ing.name.trim();
      herbSet.add(rawHerb);
      herbSet.add(kataToHira(rawHerb));
      herbSet.add(hiraToKata(rawHerb));

      let matched = false;
      const baseHerb = rawHerb.endsWith('末') ? rawHerb.slice(0, -1) : rawHerb;

      if (HERB_DICT[rawHerb]) {
        HERB_DICT[rawHerb].forEach(v => {
          herbSet.add(v);
          readingsSet.add(v);
        });
        matched = true;
      } else if (HERB_DICT[baseHerb]) {
        HERB_DICT[baseHerb].forEach(v => {
          herbSet.add(v);
          herbSet.add(v + '末');
          readingsSet.add(v);
        });
        matched = true;
      }

      // 処方名辞書にある場合
      if (FORMULA_DICT[rawHerb]) {
        FORMULA_DICT[rawHerb].forEach(v => {
          herbSet.add(v);
          readingsSet.add(v);
        });
        matched = true;
      }

      // 部分一致マッチ（例: "沙参M" -> "沙参", "コウホンM" -> "コウホン"）
      Object.keys(HERB_DICT).forEach(hKey => {
        if (hKey.length >= 2 && rawHerb.includes(hKey)) {
          HERB_DICT[hKey].forEach(v => {
            herbSet.add(v);
            readingsSet.add(v);
          });
          matched = true;
        }
      });
      Object.keys(FORMULA_DICT).forEach(fKey => {
        if (fKey.length >= 2 && rawHerb.includes(fKey)) {
          FORMULA_DICT[fKey].forEach(v => {
            herbSet.add(v);
            readingsSet.add(v);
          });
          matched = true;
        }
      });

      // 混じり表記の救済
      if (rawHerb.includes('シンキク') || rawHerb.includes('しんきく') || rawHerb.includes('神麹') || rawHerb.includes('神曲') || rawHerb.includes('神きく')) {
        ['神麹', '神曲', 'しんきく', 'シンキク', '神麯'].forEach(v => herbSet.add(v));
      }
      if (rawHerb.includes('ブシ') || rawHerb.includes('附子') || rawHerb.includes('烏頭')) {
        ['附子', 'ぶし', 'ブシ', '附子末', 'ぶしまつ', 'ブシ末', '加工附子', 'かこうぶし'].forEach(v => herbSet.add(v));
      }
      if (rawHerb.includes('ジオウ') || rawHerb.includes('地黄')) {
        ['地黄', 'じおう', 'ジオウ', '乾地黄', 'かんじおう', '乾ジオウ', '熟地黄', 'じゅくじおう', '熟ジオウ'].forEach(v => herbSet.add(v));
      }
      if (rawHerb.includes('苡仁') || rawHerb.includes('ヨクイニン')) {
        ['薏苡仁', 'よくいにん', 'ヨクイニン', 'よく苡仁'].forEach(v => herbSet.add(v));
      }
      if (rawHerb.includes('きゅう') || rawHerb.includes('芎') || rawHerb.includes('キュウ')) {
        if (rawHerb.includes('川') || rawHerb.includes('セン') || rawHerb.includes('せん')) {
          ['川芎', 'せんきゅう', 'センキュウ', '川きゅう'].forEach(v => herbSet.add(v));
        }
      }
    });
  }

  // 万一ひらがなやカタカナがまだない場合、商品名自体からひらがな・カタカナを展開
  if (!Array.from(nameSet).some(s => /[\u3041-\u3096\u30a1-\u30f6]/.test(s))) {
    nameSet.add(kataToHira(item.name));
    nameSet.add(hiraToKata(item.name));
  }
  if (item.ingredients && item.ingredients.length > 0) {
    if (!Array.from(herbSet).some(s => /[\u3041-\u3096\u30a1-\u30f6]/.test(s))) {
      item.ingredients.forEach(i => {
        if (i.name) {
          herbSet.add(kataToHira(i.name));
          herbSet.add(hiraToKata(i.name));
        }
      });
    }
  }

  // 反映
  item.searchName = Array.from(nameSet).join(' ');
  item.searchHerbs = Array.from(herbSet).join(' ');
  item.searchReadings = Array.from(readingsSet).join(' ');
  item.searchAll = `${item.searchName} ${item.searchHerbs} ${item.searchReadings} ${item.company || ''} ${item.effects || ''} ${item.description || ''}`;

  count++;
});

console.log(`Processed ${count} items.`);

// 保存
fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf-8');
fs.writeFileSync(jsDataFile, 'window.KANPO_DATA = ' + JSON.stringify(db, null, 2) + ';', 'utf-8');
console.log('Successfully saved to data.json and js/data.js.');
