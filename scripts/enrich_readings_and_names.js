const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../data.json');
const jsDataFile = path.join(__dirname, '../js/data.js');

const raw = fs.readFileSync(dataFile, 'utf-8');
const db = JSON.parse(raw);
const items = db.data;

// ひらがな・カタカナ変換ヘルパー
function kataToHira(str) {
  return str.replace(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60));
}
function hiraToKata(str) {
  return str.replace(/[\u3041-\u3096]/g, m => String.fromCharCode(m.charCodeAt(0) + 0x60));
}

// 漢方生薬包括マスター辞書
// カタカナ・漢字・ひらがな・混じり表記の相互マッピング
const HERB_DICT = {
  // 附子関連
  'ブシ': { kanji: ['附子', '加工附子', '炮附子', '烏頭'], hira: ['ぶし'], synonyms: ['ブシ2', 'ブシ末', 'ブシ末2', '加工ブシ', 'ウズ'] },
  'ブシ2': { kanji: ['附子', '加工附子'], hira: ['ぶし'], synonyms: ['ブシ', 'ブシ末', 'ブシ末2'] },
  'ブシ末': { kanji: ['附子末', '附子'], hira: ['ぶしまつ', 'ぶし'], synonyms: ['ブシ末2'] },
  'ブシ末2': { kanji: ['附子末', '附子'], hira: ['ぶしまつ', 'ぶし'], synonyms: ['ブシ末', 'ブシ'] },
  '加工ブシ': { kanji: ['加工附子', '附子'], hira: ['かこうぶし', 'ぶし'], synonyms: ['ブシ'] },
  'ウズ': { kanji: ['烏頭', '附子'], hira: ['うず', 'ぶし'], synonyms: ['ブシ'] },

  // 地黄関連
  '乾ジオウ': { kanji: ['乾地黄', '地黄'], hira: ['かんじおう', 'じおう'], synonyms: ['ジオウ', 'カンジオウ', '乾地黄'] },
  '熟ジオウ': { kanji: ['熟地黄', '地黄'], hira: ['じゅくじおう', 'じおう'], synonyms: ['ジオウ', 'ジュクジオウ', '熟地黄'] },
  'ジオウ': { kanji: ['地黄', '乾地黄', '熟地黄'], hira: ['じおう', 'かんじおう', 'じゅくじおう'], synonyms: ['乾ジオウ', '熟ジオウ'] },

  // ヨクイニン関連
  'よく苡仁': { kanji: ['薏苡仁', 'ヨクイニン'], hira: ['よくいにん'], synonyms: ['ヨクイニン', 'ヨクイ仁', 'よくい仁'] },
  'ヨクイニン': { kanji: ['薏苡仁'], hira: ['よくいにん'], synonyms: ['よく苡仁', 'よくい仁'] },

  // 川芎関連
  '川きゅう': { kanji: ['川芎'], hira: ['せんきゅう'], synonyms: ['センキュウ', '川キュウ'] },
  'センキュウ': { kanji: ['川芎'], hira: ['せんきゅう'], synonyms: ['川きゅう', '川キュウ'] },

  // 括楼仁・栝楼根
  'か楼仁': { kanji: ['栝楼仁', '括楼仁'], hira: ['かろにん'], synonyms: ['カロニン'] },
  'カロニン': { kanji: ['栝楼仁', '括楼仁'], hira: ['かろにん'], synonyms: ['か楼仁'] },
  'カロコン': { kanji: ['栝楼根', '括楼根'], hira: ['かろこん'] },

  // 蝉退
  'せん退': { kanji: ['蝉退', '蝉蛻'], hira: ['せんたい'], synonyms: ['センタイ'] },
  'センタイ': { kanji: ['蝉退', '蝉蛻'], hira: ['せんたい'], synonyms: ['せん退'] },

  // 淫羊藿
  '淫羊かく': { kanji: ['淫羊藿', '淫羊かく'], hira: ['いんようかく'], synonyms: ['イカリソウ'] },
  'イカリソウ': { kanji: ['淫羊藿', '淫羊かく'], hira: ['いんようかく', 'いかりそう'], synonyms: ['淫羊かく'] },

  // 主要生薬（五十音順）
  'アキョウ': { kanji: ['阿膠'], hira: ['あきょう'] },
  'アロエ': { kanji: ['蘆薈', 'アロエ'], hira: ['あろえ'] },
  'イレイセン': { kanji: ['威霊仙'], hira: ['いれいせん'] },
  'インチンコウ': { kanji: ['茵蔯蒿', '茵陳蒿'], hira: ['いんちんこう'] },
  'ウイキョウ': { kanji: ['茴香'], hira: ['ういきょう'] },
  'ウコン': { kanji: ['鬱金', 'ウコン'], hira: ['うこん'] },
  'ウバイ': { kanji: ['烏梅'], hira: ['うばい'] },
  'ウヤク': { kanji: ['烏薬'], hira: ['うやく'] },
  'エイジツ': { kanji: ['営実'], hira: ['えいじつ'] },
  'エンゴサク': { kanji: ['延胡索'], hira: ['えんごさく'] },
  'エンメイソウ': { kanji: ['延命草'], hira: ['えんめいそう'] },
  'オウギ': { kanji: ['黄耆'], hira: ['おうぎ'] },
  'オウゴン': { kanji: ['黄芩'], hira: ['おうごん'] },
  'オウバク': { kanji: ['黄柏'], hira: ['おうばく'] },
  'オウヒ': { kanji: ['桜皮'], hira: ['おうひ'] },
  'オウレン': { kanji: ['黄連'], hira: ['おうれん'] },
  'オンジ': { kanji: ['遠志'], hira: ['おんじ'] },
  'カイカ': { kanji: ['槐花'], hira: ['かいか'] },
  'カゴソウ': { kanji: ['夏枯草'], hira: ['かごそう', 'かこそそう'] },
  'カシ': { kanji: ['訶子'], hira: ['かし'] },
  'カシュウ': { kanji: ['何首烏'], hira: ['かしゅう'] },
  'カッコウ': { kanji: ['藿香'], hira: ['かっこう'] },
  'カッコン': { kanji: ['葛根'], hira: ['かっこん'] },
  'カッセキ': { kanji: ['滑石'], hira: ['かっせき'] },
  'カノコソウ': { kanji: ['鹿子草'], hira: ['かのこそう'] },
  'カンキョウ': { kanji: ['乾姜'], hira: ['かんきょう'] },
  'カンゾウ': { kanji: ['甘草', '炙甘草'], hira: ['かんぞう'] },
  'ガイヨウ': { kanji: ['艾葉'], hira: ['がいよう'] },
  'ガジュツ': { kanji: ['莪朮'], hira: ['がじゅつ'] },
  'キキョウ': { kanji: ['桔梗', '桔梗根'], hira: ['ききょう'] },
  'キクカ': { kanji: ['菊花'], hira: ['きくか'] },
  'キコク': { kanji: ['枳殻'], hira: ['きこく'] },
  'キジツ': { kanji: ['枳実'], hira: ['きじつ'] },
  'キッピ': { kanji: ['橘皮'], hira: ['きっぴ'] },
  'キョウカツ': { kanji: ['羌活'], hira: ['きょうかつ'] },
  'キョウニン': { kanji: ['杏仁'], hira: ['きょうにん'] },
  'キンギンカ': { kanji: ['金銀花'], hira: ['きんぎんか'] },
  'ギュウオウ': { kanji: ['牛黄'], hira: ['ぎゅうおう', 'ごおう'], synonyms: ['ゴオウ'] },
  'クコシ': { kanji: ['枸杞子'], hira: ['くこし'] },
  'クコヨウ': { kanji: ['枸杞葉'], hira: ['くこよう'] },
  'クジン': { kanji: ['苦参'], hira: ['くじん'] },
  'ケイガイ': { kanji: ['荊芥', '荊芥穂'], hira: ['けいがい'] },
  'ケイシ': { kanji: ['桂枝'], hira: ['けいし'] },
  'ケイヒ': { kanji: ['桂皮', '肉桂'], hira: ['けいひ', 'にっけい'] },
  'ケツメイシ': { kanji: ['決明子'], hira: ['けつめいし'] },
  'ケンゴシ': { kanji: ['牽牛子'], hira: ['けんごし'] },
  'ゲンジン': { kanji: ['玄参'], hira: ['げんじん'] },
  'ゲンチアナ': { kanji: ['ゲンチアナ', '竜胆草'], hira: ['げんちあな'] },
  'ワキョウカツ': { kanji: ['和羌活', '羌活'], hira: ['わきょうかつ'] },
  '和羌活': { kanji: ['和羌活', '羌活'], hira: ['わきょうかつ'], synonyms: ['ワキョウカツ'] },
  'コウイ': { kanji: ['膠飴'], hira: ['こうい'] },
  'コウカ': { kanji: ['紅花'], hira: ['こうか'] },
  'コウジン': { kanji: ['紅参'], hira: ['こうじん'] },
  'コウブシ': { kanji: ['香附子'], hira: ['こうぶし'] },
  'コウベイ': { kanji: ['粳米'], hira: ['こうべい'] },
  'コウホン': { kanji: ['藁本'], hira: ['こうほん'] },
  'コウボク': { kanji: ['厚朴'], hira: ['こうぼく'] },
  'ゴオウ': { kanji: ['牛黄'], hira: ['ごおう', 'ぎゅうおう'], synonyms: ['ギュウオウ'] },
  'ゴシツ': { kanji: ['牛膝'], hira: ['ごしつ'] },
  'ゴシュユ': { kanji: ['呉茱萸'], hira: ['ごしゅゆ'] },
  'ゴボウシ': { kanji: ['牛蒡子'], hira: ['ごぼうし'] },
  'ゴマ': { kanji: ['胡麻', 'ゴマ'], hira: ['ごま'] },
  'ゴミシ': { kanji: ['五味子'], hira: ['ごみし'] },
  'サイコ': { kanji: ['柴胡'], hira: ['さいこ'] },
  'サイシン': { kanji: ['細辛'], hira: ['さいしん'] },
  'サイチャ': { kanji: ['細茶', '茶葉'], hira: ['さいちゃ', 'ちゃよう'] },
  'サフラン': { kanji: ['番紅花', 'サフラン'], hira: ['さふらん'] },
  'サンキライ': { kanji: ['山帰来', '菝葜'], hira: ['さんきらい'] },
  'サンザシ': { kanji: ['山査子'], hira: ['さんざし'] },
  'サンシシ': { kanji: ['山梔子', '梔子'], hira: ['さんしし'] },
  'サンシュユ': { kanji: ['山茱萸'], hira: ['さんしゅゆ'] },
  'サンショウ': { kanji: ['山椒'], hira: ['さんしょう'] },
  'サンズコン': { kanji: ['山豆根'], hira: ['さんずこん'] },
  'サンソウニン': { kanji: ['酸棗仁'], hira: ['さんそうにん'] },
  'サンヤク': { kanji: ['山薬'], hira: ['さんやく'] },
  'シオン': { kanji: ['紫苑', '紫菀'], hira: ['しおん'] },
  'シコン': { kanji: ['紫根'], hira: ['しこん'] },
  'シソシ': { kanji: ['紫蘇子'], hira: ['しそし'] },
  'シツリシ': { kanji: ['蒺藜子'], hira: ['しつりし'] },
  'シテイ': { kanji: ['柿蒂'], hira: ['してい'] },
  'シャカンゾウ': { kanji: ['炙甘草', '甘草'], hira: ['しゃかんぞう', 'かんぞう'] },
  'シャクヤク': { kanji: ['芍薬', '白芍', '赤芍'], hira: ['しゃくやく'] },
  'シャジン': { kanji: ['沙参'], hira: ['しゃじん'] },
  'シャゼンシ': { kanji: ['車前子'], hira: ['しゃぜんし'] },
  'シャゼンソウ': { kanji: ['車前草'], hira: ['しゃぜんそう'] },
  'シャタン': { kanji: ['蛇胆'], hira: ['しゃたん', 'じゃたん'] },
  'シュクシャ': { kanji: ['縮砂'], hira: ['しゅくしゃ'] },
  'ショウキョウ': { kanji: ['生姜'], hira: ['しょうきょう'] },
  'ショウバク': { kanji: ['小麦'], hira: ['しょうばく'] },
  'ショウマ': { kanji: ['升麻'], hira: ['しょうま'] },
  'シンイ': { kanji: ['辛夷'], hira: ['しんい'] },
  'シンキク': { kanji: ['神曲'], hira: ['しんきく'] },
  'シンギ': { kanji: ['辛荑', '辛夷'], hira: ['しんぎ', 'しんい'] },
  'ジコッピ': { kanji: ['地骨皮'], hira: ['じこっぴ'] },
  'ジャコウ': { kanji: ['麝香'], hira: ['じゃこう'] },
  'ジャショウシ': { kanji: ['蛇床子'], hira: ['じゃしょうし'] },
  'ジュウヤク': { kanji: ['十薬'], hira: ['じゅうやく'] },
  'ジリュウ': { kanji: ['地竜'], hira: ['じりゅう'] },
  'ジンギョウ': { kanji: ['秦艽'], hira: ['じんぎょう'] },
  'ジンコウ': { kanji: ['沈香'], hira: ['じんこう'] },
  'セイヒ': { kanji: ['青皮'], hira: ['せいひ'] },
  'セキシャク': { kanji: ['赤芍', '芍薬'], hira: ['せきしゃく', 'しゃくやく'] },
  'セッコウ': { kanji: ['石膏'], hira: ['せっこう'] },
  'セッコク': { kanji: ['石斛'], hira: ['せっこく'] },
  'センコツ': { kanji: ['川骨'], hira: ['せんこつ'] },
  'センソ': { kanji: ['蟾酥'], hira: ['せんそ'] },
  'センナ': { kanji: ['旃那', 'センナ'], hira: ['せんな'] },
  'センブリ': { kanji: ['当薬'], hira: ['せんぶり', 'とうやく'] },
  'ゼンコ': { kanji: ['前胡'], hira: ['ぜんこ'] },
  'ソウキセイ': { kanji: ['桑寄生'], hira: ['そうきせい'] },
  'ソウジュツ': { kanji: ['蒼朮'], hira: ['そうじゅつ'] },
  'ソウハクヒ': { kanji: ['桑白皮'], hira: ['そうはくひ'] },
  'ソボク': { kanji: ['蘇木'], hira: ['そぼく'] },
  'ソヨウ': { kanji: ['蘇葉', '紫蘇葉'], hira: ['そよう', 'しそよう'] },
  'タイソウ': { kanji: ['大棗'], hira: ['たいそう'] },
  'タクシャ': { kanji: ['沢瀉'], hira: ['たくしゃ'] },
  'タシチニンジン': { kanji: ['田七人参'], hira: ['たしちにんじん', 'でんしちにんじん'] },
  'タンジン': { kanji: ['丹参'], hira: ['たんじん'] },
  'タンズシ': { kanji: ['淡豆豉'], hira: ['たんずし'] },
  'タンチクヨウ': { kanji: ['淡竹葉'], hira: ['たんちくよう'] },
  'ダイオウ': { kanji: ['大黄'], hira: ['だいおう'] },
  'ダイフクヒ': { kanji: ['大腹皮'], hira: ['だいふくひ'] },
  'チクジョ': { kanji: ['竹茹'], hira: ['ちくじょ'] },
  'チクセツニンジン': { kanji: ['竹節人参'], hira: ['ちくせつにんじん'] },
  'チクヨウ': { kanji: ['竹葉'], hira: ['ちくよう'] },
  'チモ': { kanji: ['知母'], hira: ['ちも'] },
  'チャヨウ': { kanji: ['茶葉'], hira: ['ちゃよう'] },
  'チョウジ': { kanji: ['丁子', '丁香'], hira: ['ちょうじ'] },
  'チョウトウコウ': { kanji: ['釣藤鈎'], hira: ['ちょうとうこう'] },
  'チョレイ': { kanji: ['猪苓'], hira: ['ちょれい'] },
  'チンピ': { kanji: ['陳皮'], hira: ['ちんぴ'] },
  'テンナンショウ': { kanji: ['天南星'], hira: ['てんなんしょう'] },
  'テンマ': { kanji: ['天麻'], hira: ['てんま'] },
  'テンモンドウ': { kanji: ['天門冬'], hira: ['てんもんどう'] },
  'トウガシ': { kanji: ['冬瓜子'], hira: ['とうがし'] },
  'トウキ': { kanji: ['当帰'], hira: ['とうき'] },
  'トウシンソウ': { kanji: ['燈心草'], hira: ['とうしんそう'] },
  'トウジン': { kanji: ['党参'], hira: ['とうじん'] },
  'トウドクカツ': { kanji: ['唐独活'], hira: ['とうどくかつ'] },
  'トウニン': { kanji: ['桃仁'], hira: ['とうにん'] },
  'トウヒ': { kanji: ['橙皮'], hira: ['とうひ'] },
  'トチュウ': { kanji: ['杜仲'], hira: ['とちゅう'] },
  'ドクカツ': { kanji: ['独活'], hira: ['どくかつ', 'どっこつ'], synonyms: ['ドッコツ'] },
  'ドベッコウ': { kanji: ['土別甲', '鼈甲'], hira: ['どべっこう', 'べっこう'], synonyms: ['ベッコウ'] },
  'ナンテンジツ': { kanji: ['南天実'], hira: ['なんてんじつ'] },
  'ニガキ': { kanji: ['苦木'], hira: ['にがき'] },
  'ニクズク': { kanji: ['肉豆蔲'], hira: ['にくずく'] },
  'ニンジン': { kanji: ['人参', '高麗人参', '朝鮮人参'], hira: ['にんじん'] },
  'ニンドウ': { kanji: ['忍冬'], hira: ['にんどう'] },
  'ハクガイシ': { kanji: ['白芥子'], hira: ['はくがいし'] },
  'ハッカ': { kanji: ['薄荷'], hira: ['はっか'] },
  'ハマボウフウ': { kanji: ['浜防風'], hira: ['はまぼうふう'] },
  'ハンゲ': { kanji: ['半夏'], hira: ['はんげ'] },
  'バイモ': { kanji: ['貝母'], hira: ['ばいも'] },
  'バクガ': { kanji: ['麦芽'], hira: ['ばくが'] },
  'バクモンドウ': { kanji: ['麦門冬'], hira: ['ばくもんどう'] },
  'ヒシノミ': { kanji: ['菱実'], hira: ['ひしのみ'] },
  'ビャクゴウ': { kanji: ['百合'], hira: ['びゃくごう'] },
  'ビャクシ': { kanji: ['白芷'], hira: ['びゃくし'] },
  'ビャクジュツ': { kanji: ['白朮'], hira: ['びゃくじゅつ'] },
  'ビワヨウ': { kanji: ['枇杷葉'], hira: ['びわよう'] },
  'ビンロウジ': { kanji: ['檳榔子'], hira: ['びんろうじ'] },
  'ヘンズ': { kanji: ['扁豆'], hira: ['へんず'] },
  'ベッコウ': { kanji: ['鼈甲'], hira: ['べっこう'] },
  'ボウイ': { kanji: ['防己'], hira: ['ぼうい'] },
  'ボウコン': { kanji: ['茅根'], hira: ['ぼうこん'] },
  'ボウフウ': { kanji: ['防風'], hira: ['ぼうふう'] },
  'ボクソク': { kanji: ['朴樕'], hira: ['ぼくそく'] },
  'ボタンピ': { kanji: ['牡丹皮'], hira: ['ぼたんぴ'] },
  'ボレイ': { kanji: ['牡蛎', '牡蠣'], hira: ['ぼれい'] },
  'マオウ': { kanji: ['麻黄'], hira: ['まおう'] },
  'マシニン': { kanji: ['麻子仁'], hira: ['ましにん'] },
  'マムシ': { kanji: ['反鼻', 'まむし'], hira: ['まむし', 'はんぴ'] },
  'マンケイシ': { kanji: ['蔓荊子'], hira: ['まんけいし'] },
  'モクツウ': { kanji: ['木通'], hira: ['もくつう'] },
  'モッカ': { kanji: ['木瓜'], hira: ['もっか'] },
  'モッコウ': { kanji: ['木香'], hira: ['もっこう'] },
  'ヤクチ': { kanji: ['益智'], hira: ['やくち'] },
  'ヤクモソウ': { kanji: ['益母草'], hira: ['やくもそう'] },
  'ユウタン': { kanji: ['熊胆'], hira: ['ゆうたん'] },
  'リヒ': { kanji: ['梨皮'], hira: ['りひ'] },
  'リュウガンニク': { kanji: ['竜眼肉', '龍眼肉'], hira: ['りゅうがんにく'] },
  'リュウコツ': { kanji: ['竜骨'], hira: ['りゅうこつ'] },
  'リュウタン': { kanji: ['竜胆'], hira: ['りゅうたん'] },
  'リュウノウ': { kanji: ['竜脳'], hira: ['りゅうのう'] },
  'リョウキョウ': { kanji: ['良姜', '高良姜'], hira: ['りょうきょう'] },
  'レイヨウカク': { kanji: ['羚羊角'], hira: ['れいようかく'] },
  'レンギョウ': { kanji: ['連翹'], hira: ['れんぎょう'] },
  'レンセンソウ': { kanji: ['連銭草'], hira: ['れんせんそう'] },
  'レンニク': { kanji: ['蓮肉', '蓮子'], hira: ['れんにく'] },
  'ロクジョウ': { kanji: ['鹿茸'], hira: ['ろくじょう'] },
  'ブクリョウ': { kanji: ['茯苓', '赤茯苓'], hira: ['ぶくりょう'] },
  'ボウショウ': { kanji: ['芒硝', '無水芒硝'], hira: ['ぼうしょう'], synonyms: ['無水ボウショウ'] },
  '無水ボウショウ': { kanji: ['芒硝', '無水芒硝'], hira: ['ぼうしょう'], synonyms: ['ボウショウ'] },
  'ミツロウ': { kanji: ['蜜蝋', '白蝋'], hira: ['みつろう'] },
  'シベット': { kanji: ['霊猫香', 'シベット'], hira: ['れいびょうこう', 'しべっと'] },
  'ランオウ': { kanji: ['卵黄', '卵黄油'], hira: ['らんおう'], synonyms: ['ランオウ末'] },
  'ランオウ末': { kanji: ['卵黄末', '卵黄'], hira: ['らんおうまつ', 'らんおう'] },
  'オウセイ': { kanji: ['黄精'], hira: ['おうせい'] },
  // 処方エキス・中成薬エキス（読み仮名完全登録）
  '芎帰調血飲第一加減': { kanji: ['芎帰調血飲第一加減'], hira: ['きゅうきちょうけついんだいいちかげん'], synonyms: ['キュウキチョウケツインダイイチカゲン'] },
  '芎帰調血飲': { kanji: ['芎帰調血飲'], hira: ['きゅうきちょうけついん'], synonyms: ['キュウキチョウケツイン'] },
  '参蘇飲': { kanji: ['参蘇飲'], hira: ['じんそいん', 'さんそいん'], synonyms: ['ジンソイン', 'サンソイン'] },
  '清心蓮子飲': { kanji: ['清心蓮子飲'], hira: ['せいしんれんしいん'], synonyms: ['セイシンレンシイン'] },
  '治打撲一方': { kanji: ['治打撲一方'], hira: ['ちだぼくいっぽう', 'ぢだぼくいっぽう'], synonyms: ['チダボクイッポウ', 'ヂダボクイッポウ'] },
  '当帰飲子': { kanji: ['当帰飲子'], hira: ['とうきいんし'], synonyms: ['トウキインシ'] },
  '茯苓飲': { kanji: ['茯苓飲'], hira: ['ぶくりょういん'], synonyms: ['ブクリョウイン'] },
  '治頭瘡一方': { kanji: ['治頭瘡一方'], hira: ['ぢづそういっぽう', 'ぢずそういっぽう', 'ちづそういっぽう'], synonyms: ['ヂヅソウイッポウ', 'ヂズソウイッポウ'] },
  '折衝飲': { kanji: ['折衝飲'], hira: ['せっしょういん'], synonyms: ['セッショウイン'] },
  '衛益': { kanji: ['衛益'], hira: ['えいえき'], synonyms: ['エイエキ'] },
  '冠元': { kanji: ['冠元'], hira: ['かんげん'], synonyms: ['カンゲン'] },
  '健胃': { kanji: ['健胃'], hira: ['けんぴ', 'けんい'], synonyms: ['ケンピ', 'ケンイ'] },
  '勝湿': { kanji: ['勝湿'], hira: ['しょうしつ'], synonyms: ['ショウシツ'] },
  '心脾': { kanji: ['心脾'], hira: ['しんぴ'], synonyms: ['シンピ'] },
  '清営': { kanji: ['清営'], hira: ['せいえい'], synonyms: ['セイエイ'] },
  '双料杞菊': { kanji: ['双料杞菊'], hira: ['そうりょうこぎく'], synonyms: ['ソウリョウコギク'] },
  '頂調': { kanji: ['頂調'], hira: ['ちょうちょう'], synonyms: ['チョウチョウ'] },
  '独歩': { kanji: ['独歩'], hira: ['どっぽ'], synonyms: ['ドッポ'] },
  '麦味参': { kanji: ['麦味参'], hira: ['ばくみさん'], synonyms: ['バクミサン'] },
  '平喘': { kanji: ['平喘'], hira: ['へいぜい'], synonyms: ['ヘイゼイ'] },
  '麻杏止咳': { kanji: ['麻杏止咳'], hira: ['まきょうしがい'], synonyms: ['マキョウシガイ'] },
  '瀉火利湿': { kanji: ['瀉火利湿'], hira: ['しゃかりしつ'], synonyms: ['シャカリシツ'] },
  '逍遙': { kanji: ['逍遙', '逍遥'], hira: ['しょうよう'], synonyms: ['ショウヨウ'] }
};

// 逆引き用マスター（漢字・別名・ひらがな・カタカナから全バリエーションを引く）
const HERB_LOOKUP = {};
Object.entries(HERB_DICT).forEach(([stdKana, info]) => {
  const allVariants = [stdKana, ...(info.kanji || []), ...(info.hira || []), ...(info.synonyms || [])];
  allVariants.forEach(v => {
    if (!HERB_LOOKUP[v]) HERB_LOOKUP[v] = [];
    allVariants.forEach(t => {
      if (!HERB_LOOKUP[v].includes(t)) HERB_LOOKUP[v].push(t);
    });
  });
});

let updatedItems = 0;
const unmappedHerbs = new Set();

items.forEach(item => {
  const searchKeywords = new Set();

  // 1. 商品名（漢字、ひらがな、カタカナ）
  searchKeywords.add(item.name);
  searchKeywords.add(kataToHira(item.name));
  searchKeywords.add(hiraToKata(item.name));

  // 2. 処方名（商品名検索でも処方名でヒットするようにする）
  if (item.formulaName) {
    searchKeywords.add(item.formulaName);
    searchKeywords.add(kataToHira(item.formulaName));
    searchKeywords.add(hiraToKata(item.formulaName));
  }

  // 3. 処方番号（No.X, X番, NoX, X）
  if (item.prescriptionNumber) {
    const num = item.prescriptionNumber;
    searchKeywords.add(`No.${num}`);
    searchKeywords.add(`No${num}`);
    searchKeywords.add(`${num}番`);
    searchKeywords.add(`${num}`);
    searchKeywords.add(`TJ-${num}`);
  }
  if (item.companyNumber) {
    searchKeywords.add(`${item.companyNumber}号`);
    searchKeywords.add(`-${item.companyNumber}号`);
  }

  // 4. 生薬名（全漢字・全かな・全カナ・混じり表記を展開）
  const herbSearchKeywords = new Set();
  if (item.ingredients) {
    item.ingredients.forEach(ing => {
      if (!ing.name) return;
      const herbName = ing.name.trim();
      herbSearchKeywords.add(herbName);
      herbSearchKeywords.add(kataToHira(herbName));
      herbSearchKeywords.add(hiraToKata(herbName));

      // 辞書展開
      let found = false;
      const baseHerbName = herbName.endsWith('末') ? herbName.slice(0, -1) : herbName;
      if (HERB_LOOKUP[herbName]) {
        HERB_LOOKUP[herbName].forEach(v => {
          herbSearchKeywords.add(v);
          herbSearchKeywords.add(kataToHira(v));
          herbSearchKeywords.add(hiraToKata(v));
        });
        found = true;
      } else if (HERB_LOOKUP[baseHerbName]) {
        HERB_LOOKUP[baseHerbName].forEach(v => {
          herbSearchKeywords.add(v);
          herbSearchKeywords.add(v + '末');
          herbSearchKeywords.add(kataToHira(v));
          herbSearchKeywords.add(kataToHira(v) + 'まつ');
          herbSearchKeywords.add(hiraToKata(v));
          herbSearchKeywords.add(hiraToKata(v) + 'マツ');
        });
        found = true;
      }

      // 「ブシ2」「ブシ末2」の正規化
      if (herbName.startsWith('ブシ') || herbName.startsWith('附子') || herbName === '烏頭') {
        ['附子', 'ぶし', 'ブシ', '附子末', 'ぶしまつ', 'ブシ末', '加工附子', 'かこうぶし'].forEach(v => herbSearchKeywords.add(v));
        found = true;
      }
      // 「ジオウ」混じり表記
      if (herbName.includes('ジオウ') || herbName.includes('地黄')) {
        ['地黄', 'じおう', 'ジオウ', '乾地黄', 'かんじおう', '乾ジオウ', '熟地黄', 'じゅくじおう', '熟ジオウ'].forEach(v => herbSearchKeywords.add(v));
        found = true;
      }
      // 「よく苡仁」混じり表記
      if (herbName.includes('苡仁') || herbName.includes('ヨクイニン')) {
        ['薏苡仁', 'よくいにん', 'ヨクイニン', 'よく苡仁'].forEach(v => herbSearchKeywords.add(v));
        found = true;
      }
      // 「川きゅう」
      if (herbName.includes('きゅう') || herbName.includes('芎') || herbName.includes('キュウ')) {
        if (herbName.includes('川') || herbName.includes('セン') || herbName.includes('せん')) {
          ['川芎', 'せんきゅう', 'センキュウ', '川きゅう'].forEach(v => herbSearchKeywords.add(v));
          found = true;
        }
      }

      // エキスや乾燥エキス、添加物等を除外して、真の生薬でマッピングされなかったもの
      const isAdditive = herbName.includes('酸') || herbName.includes('塩') || herbName.includes('油') || 
                         herbName.includes('エキス') || herbName.includes('ワセリン') || herbName.includes('ゼラチン') ||
                         herbName.includes('軟膏') || herbName.includes('膏') || herbName.includes('丸') || 
                         herbName.includes('散') || herbName.includes('湯') || herbName.includes('薬') ||
                         herbName.includes('混合粉') || herbName.includes('炭水化物') || herbName.includes('脂質') ||
                         herbName.includes('食塩');
      if (!found && !isAdditive) {
        unmappedHerbs.add(herbName);
      }
    });
  }

  // item に検索用文字列を付与
  item.searchName = Array.from(searchKeywords).join(' ');
  item.searchHerbs = Array.from(herbSearchKeywords).join(' ');
  item.searchAll = `${item.searchName} ${item.searchHerbs} ${item.company || ''} ${item.effects || ''} ${item.description || ''}`;

  updatedItems++;
});

console.log(`Updated ${updatedItems} items with extended search keywords.`);
console.log(`Total truly unmapped raw herbs count: ${unmappedHerbs.size}`);
console.log(`Unmapped herbs list:`, Array.from(unmappedHerbs));

// 保存
fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf-8');
fs.writeFileSync(jsDataFile, 'window.KANPO_DATA = ' + JSON.stringify(db, null, 2) + ';', 'utf-8');
console.log('Saved to data.json and js/data.js');
