const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../data.json');
const jsDataFile = path.join(__dirname, '../js/data.js');
const db = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const items = db.data;

console.log('=== 全商品の剤形（dosageForm）徹底再検証 ===');

let updatedCount = 0;

function correctDosageForm(it) {
  const name = (it.name || '').trim();
  const rawName = (it.rawName || '').trim();
  const usage = (it.usage || '').trim();
  const dailyDose = (it.dailyDose || '').trim();
  const company = it.company || '';

  // 1. 液剤・シロップ（内服液、シロップ、ドリンク、ゼリー、mL/ml単位の液体）
  const isLiquid = /内服液|シロップ|ドリンク|ゼリー|新ケイレノンゼリー|サマレスゼリー|薬参|婦人宝|婦宝当帰膠|隆持源|開豊瓊玉膏|葛根湯液|葛根湯KIDS|液剤|液$|液\s*[「（]/.test(name) ||
                   /mL|ｍＬ|ml|滴|コップ/.test(usage) || /mL|ｍＬ|ml/.test(dailyDose);
  if (isLiquid && !/軟膏|硬膏|外用|パップ/.test(name)) {
    return '液剤・シロップ';
  }

  // 2. カプセル剤
  if (/カプセル/.test(name) || /カプセル/.test(usage) || /能活精|霊鹿参|霊黄参|活命参|牛黄カプセル/.test(name)) {
    return 'カプセル剤';
  }

  // 3. 錠剤（「錠」「トローチ」など）
  if (/錠|トローチ/.test(name) || (/錠/.test(usage) && !/散|細粒|顆粒|丸/.test(name))) {
    return '錠剤';
  }

  // 4. 外用剤（軟膏、硬膏、パップ、貼付剤、膏）
  if (/軟膏|硬膏|パップ|外用|貼付|ベルクミン|点温膏|紫雲膏|中黄膏|赤色ワグラス|チェリメント/.test(name) && !/婦宝当帰膠|開豊瓊玉膏|婦人宝/.test(name)) {
    return '外用剤';
  }

  // 5. 丸剤（伝統丸薬、蜜丸、小粒丸剤）
  if (/丸/.test(name) && !/顆粒|細粒|錠|エキス/.test(name)) {
    return '丸剤';
  }

  // 6. 煎剤・生薬（煎じ薬、調剤用刻み生薬など）
  if (/煮つめ|煎じ|せんじ|袋をとり去り|分服|水約\d+mLを加/.test(usage) || /生薬|刻|寸切|ティーバッグ|養成煎|妙煎|中将湯/.test(name) || /ツムラの生薬/.test(name)) {
    return '煎剤・生薬';
  }
  if (company === 'uchida' && !/末|M|丸|カプセル|錠|分包|エキス|散|細粒|顆粒|軟膏/.test(name)) {
    return '煎剤・生薬';
  }
  if (company === 'tochimoto' && !/末|丸|カプセル|錠|エキス|細粒|顆粒/.test(name)) {
    return '煎剤・生薬';
  }

  // 7. 末剤（単味粉末生薬、末M、末など。調剤用粉末原料）
  if (/末|末M/.test(name) || /M(?=[「\s(]|$)/.test(name) || /末$/.test(name) || /加工ブシ/.test(name) || (/調剤原料|調剤に用いる/.test(usage) && !/生薬|刻|寸切|エキス/.test(name))) {
    return '末剤';
  }

  // 8. 細粒剤（コタロー細粒、エキス細粒、エキス散、散料エキス散、杉原散など）
  if (/細粒/.test(name) || /エキス散|散料エキス散|散剤|散$/.test(name) || company === 'sugihara') {
    return '細粒剤';
  }

  // 9. 顆粒剤（エキス顆粒、顆粒、エキスG、分包、ホノミ粒、モリシリーズ、サンワロン等）
  if (/顆粒/.test(name) || /エキスG\b|エキスG(?=[「\s]|$)|エキスTG|粒\b|粒(?=[「\s(]|$)|涼解楽|衛益|分包|サンワロン|ホスロール|モリ|ハイ・|サン・|レディシトル|フラーリン.*粒|建林松鶴堂/.test(name)) {
    return '顆粒剤';
  }

  return it.dosageForm || 'その他';
}

items.forEach(it => {
  const oldForm = it.dosageForm;
  const newForm = correctDosageForm(it);
  if (oldForm !== newForm) {
    console.log(`[剤形修正] ${it.name} (${it.companyName}): ${oldForm} -> ${newForm}`);
    it.dosageForm = newForm;
    updatedCount++;
  }
});

console.log(`\n合計 ${updatedCount} 件の剤形を修正しました。`);

// 婦人宝の確認
const fujinho = items.find(it => it.name.includes('婦人宝'));
console.log('婦人宝の最終剤形:', fujinho ? fujinho.dosageForm : 'Not found');

fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf8');
fs.writeFileSync(jsDataFile, 'window.KANPO_DATA = ' + JSON.stringify(db, null, 2) + ';', 'utf8');
console.log('data.json および js/data.js を更新保存しました。');
