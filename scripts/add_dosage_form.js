// 全医薬品データに正確な剤形（dosageForm）を付与するスクリプト（散剤を顆粒/細粒へ統合、末剤を独立）
const fs = require('fs');
const path = require('path');

const dataJsonPath = path.join(__dirname, '..', 'data.json');
const jsDataPath = path.join(__dirname, '..', 'js', 'data.js');

const raw = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
const items = raw.data || [];

function determineDosageForm(it) {
  const name = (it.name || '').trim();
  const rawName = (it.rawName || '').trim();
  const subCategory = (it.subCategory || '').trim();
  const usage = (it.usage || '').trim();
  const company = it.company || '';

  // 処方名部分を除いた接尾辞を取得
  let suffix = name;
  if (subCategory && suffix.includes(subCategory)) {
    suffix = suffix.replace(subCategory, '');
  }
  let rawSuffix = rawName;
  if (subCategory && rawSuffix.includes(subCategory)) {
    rawSuffix = rawSuffix.replace(subCategory, '');
  }
  const combinedSuffix = (suffix + ' ' + rawSuffix).trim();

  // 1. カプセル剤
  if (/カプセル/.test(combinedSuffix) || /カプセル/.test(name) || /カプセル/i.test(usage) || /能活精|霊鹿参|霊黄参|活命参|牛黄カプセル/.test(name)) {
    return 'カプセル剤';
  }

  // 2. 錠剤（「散錠」「エキス錠」「錠」「トローチ」など）
  if (/錠|トローチ/.test(combinedSuffix) || /錠|トローチ/.test(name) || /1回\s*\d+\s*錠|錠/i.test(usage) || /アンラビリ|ファットドーン|マスラック|便秘薬|5T\b|ベルアベトン|ジヨッキ|アクマチック|ダイアベトン|ラムール/.test(name)) {
    return '錠剤';
  }

  // 3. 外用剤（軟膏、硬膏、パップ、貼付剤、膏）
  if (/軟膏|硬膏|パップ|膏|ベルクミン|点温膏/.test(name) && !/婦宝当帰膠|開豊瓊玉膏/.test(name)) {
    return '外用剤';
  }

  // 4. 煎剤・生薬（煎じ薬、調剤用刻み生薬など。「水約600mLを加え煮つめ」等）
  if (/煮つめ|煎じ|せんじ|袋をとり去り|分服|水約\d+mLを加/.test(usage) || /生薬|刻|寸切|ティーバッグ|養成煎|妙煎|中将湯/.test(name) || /ツムラの生薬/.test(name)) {
    return '煎剤・生薬';
  }
  if (company === 'uchida' && !/末|M|丸|カプセル|錠|分包|エキス|散|軟膏/.test(name)) {
    return '煎剤・生薬';
  }
  if (company === 'tochimoto' && !/末|丸|カプセル|錠|エキス/.test(name)) {
    return '煎剤・生薬';
  }

  // 5. 液剤・シロップ（内服液、ドリンク、シロップ、ゼリーなど）
  if (/内服液|シロップ|ドリンク|ゼリー|新ケイレノンゼリー|サマレスゼリー|薬参|婦宝当帰膠|隆持源|開豊瓊玉膏|葛根湯液|葛根湯KIDS/.test(name)) {
    return '液剤・シロップ';
  }

  // 6. 細粒剤（コタロー細粒、エキス細粒、エキス散、散料エキス散、杉原散など）
  if (/細粒/.test(combinedSuffix) || /細粒/.test(name) || /エキス散|散料エキス散|散剤|散$/.test(name) || company === 'sugihara') {
    return '細粒剤';
  }

  // 7. 顆粒剤（エキス顆粒、顆粒、エキスG、分包、ホノミ粒、モリシリーズ、サンワロン等）
  // ※名前にはっきりと「顆粒」が入っているものを優先判定
  if (/顆粒/.test(combinedSuffix) || /顆粒/.test(name) || /エキスG\b|エキスG(?=[「\s]|$)|エキスTG|粒\b|粒(?=[「\s(]|$)|涼解楽|衛益|分包|サンワロン|ホスロール|モリ|ハイ・|サン・|レディシトル|フラーリン.*粒|建林松鶴堂/.test(name)) {
    return '顆粒剤';
  }

  // 8. 末剤（単味粉末生薬、末M、末など。調剤用粉末原料）
  if (/末|末M/.test(combinedSuffix) || /M(?=[「\s(]|$)/.test(combinedSuffix) || /末(?=[「\s(]|$)/.test(name) || /加工ブシ|末$/.test(name) || /調剤原料/.test(usage)) {
    return '末剤';
  }
  if (/調剤に用いる/.test(usage) && !/生薬|刻|寸切/.test(name) && !/エキス/.test(name)) {
    return '末剤';
  }

  // 9. 丸剤（伝統丸薬、蜜丸、小粒丸剤）

  // 用法用量からの判定
  if (/1包|1回\s*\d+\s*包|包/i.test(usage)) {
    if (company === 'kotaro' || /「コタロー」/.test(name)) return '細粒剤';
    return '顆粒剤';
  }

  // 会社特有の補完
  if (company === 'kotaro' && /「コタロー」/.test(name)) return '細粒剤';
  if (company === 'osugi') return '顆粒剤';

  // 処方名に湯、丸、散がある場合のフォールバック
  if (/丸|丹/.test(name)) return '丸剤';
  if (/散/.test(name)) return '細粒剤';
  if (/湯/.test(name)) return '煎剤・生薬';

  return '顆粒剤'; // 漢方エキス製剤の一般標準
}

const formStats = {};
items.forEach(it => {
  const form = determineDosageForm(it);
  it.dosageForm = form;
  formStats[form] = (formStats[form] || 0) + 1;
});

console.log('=== Final Dosage Form Distribution ===');
console.log(formStats);

// 独活寄生丸、散剤、末剤の確認
console.log('\n--- 検証: 独活寄生丸 ---');
items.filter(it => it.name.includes('独活寄生丸')).forEach(it => {
  console.log(`[${it.dosageForm}] ${it.companyName}: ${it.name}`);
});

console.log('\n--- 検証: 当帰芍薬散（散剤の統合先） ---');
items.filter(it => it.subCategory && it.subCategory.includes('当帰芍薬散')).slice(0, 5).forEach(it => {
  console.log(`[${it.dosageForm}] ${it.companyName}: ${it.name}`);
});

console.log('\n--- 検証: 末剤（単味粉末生薬） ---');
items.filter(it => it.dosageForm === '末剤').slice(0, 5).forEach(it => {
  console.log(`[${it.dosageForm}] ${it.companyName}: ${it.name}`);
});

// data.json の更新
raw.data = items;
fs.writeFileSync(dataJsonPath, JSON.stringify(raw, null, 2), 'utf8');
console.log(`\nUpdated ${dataJsonPath}`);

// js/data.js の更新
const jsContent = `window.__KAMPO_DATA__ = ${JSON.stringify(raw)};\n`;
fs.writeFileSync(jsDataPath, jsContent, 'utf8');
console.log(`Updated ${jsDataPath}`);
