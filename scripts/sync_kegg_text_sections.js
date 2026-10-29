const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../data.json');
const jsDataFile = path.join(__dirname, '../js/data.js');
const cacheFile = path.join(__dirname, 'cache_kegg_all_sync.json');

const db = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const items = db.data;
const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

console.log(`Loaded ${items.length} items from DB and ${Object.keys(cache).length} HTML pages from cache.`);

// テキストクリーンアップヘルパー
function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/，/g, '、')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .trim();
}

// 医療用HTMLパーサー
function parseMedHtml(html) {
  const result = {};

  // 1. 効能効果 (4.効能又は効果)
  const effMatch = html.match(/<p class="subtitle">\s*4\.\s*効能又は効果\s*<\/p>\s*<div class="block1">([\s\S]*?)<\/div>\s*<\/div>/i) ||
                   html.match(/4\.\s*効能又は効果[\s\S]*?<div class="block1">([\s\S]*?)<\/div>/i) ||
                   html.match(/<(?:td|th)[^>]*>(?:効能又は効果|効能[・･]効果)<\/(?:td|th)>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (effMatch) {
    const text = cleanText(effMatch[1]);
    if (text && text.length >= 3) result.efficacy = text;
  }

  // 2. 用法用量 (6.用法及び用量)
  const useMatch = html.match(/<p class="subtitle">\s*6\.\s*用法及び用量\s*<\/p>\s*<div class="block1">([\s\S]*?)<\/div>/i) ||
                   html.match(/6\.\s*用法及び用量[\s\S]*?<div class="block1">([\s\S]*?)<\/div>/i) ||
                   html.match(/<(?:td|th)[^>]*>(?:用法及び用量|用法[・･]用量)<\/(?:td|th)>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (useMatch) {
    const text = cleanText(useMatch[1]);
    if (text && text.length >= 3) {
      result.usage = text;
      // 1日服用量の抽出 (例: 通常、成人1日7.5gを2〜3回に分割し...)
      const dMatch = text.match(/(?:成人1日[^\s、。\n]+|1日[0-9.]+〜[0-9.]+g|1日[0-9.]+g)/);
      if (dMatch) {
        result.dailyDose = dMatch[0];
      }
    }
  }

  // 3. 使用上の注意
  // 医療用の場合、特定の背景を有する患者、副作用等の主要セクション
  const precParts = [];
  const sec8 = html.match(/<p class="subtitle">\s*8\.\s*重要な基本的注意\s*<\/p>\s*<div class="block1">([\s\S]*?)<\/div>/i);
  if (sec8) precParts.push('【重要な基本的注意】\n' + cleanText(sec8[1]));

  const sec9 = html.match(/<p class="subtitle">\s*9\.\s*特定の背景を有する患者に関する注意\s*<\/p>\s*<div class="block1">([\s\S]*?)<\/div>/i);
  if (sec9) precParts.push('【特定の背景を有する患者に関する注意】\n' + cleanText(sec9[1]));

  const sec11 = html.match(/<p class="subtitle">\s*11\.\s*副作用\s*<\/p>\s*<div class="block1">([\s\S]*?)<\/div>/i);
  if (sec11) {
    // 最初の数行のみ簡潔に抽出
    const sideText = cleanText(sec11[1]).split('\n').slice(0, 10).join('\n');
    precParts.push('【副作用】\n' + sideText);
  }

  // 単味調剤用生薬の場合
  const chouzai = html.match(/(?:【調剤上の注意】|調剤上の注意)[\s\S]*?(?:<\/div>|<\/td>)/i);
  if (chouzai) {
    precParts.push('【調剤上の注意】\n' + cleanText(chouzai[0]));
  }

  if (precParts.length > 0) {
    result.precautions = precParts.join('\n\n');
  }

  return result;
}

// 一般用HTMLパーサー
function parseOtcHtml(html) {
  const result = {};

  // 1. 効能効果
  const effMatch = html.match(/<h[34]>\s*効果[・･]効能\s*<\/h[34]>\s*<p class="info">([\s\S]*?)<\/p>/i) ||
                   html.match(/<h[34]>\s*効能[・･]効果\s*<\/h[34]>\s*<p class="info">([\s\S]*?)<\/p>/i);
  if (effMatch) {
    const text = cleanText(effMatch[1]);
    if (text && text.length >= 3) result.efficacy = text;
  }

  // 2. 用法用量
  const useMatch = html.match(/<h[34]>\s*用法[・･]用量\s*<\/h[34]>\s*<p class="info">([\s\S]*?)<\/p>/i);
  if (useMatch) {
    const text = cleanText(useMatch[1]);
    if (text && text.length >= 3) {
      result.usage = text;
      // 成人1回量・1日回数等の抽出
      const dMatch = text.match(/(?:成人（15才以上）[^\n]+|成人\s*1回[^\n]+|1日\s*[23]\s*回)/i);
      if (dMatch) {
        result.dailyDose = dMatch[0].trim();
      }
    }
  }

  // 3. 使用上の注意
  const precMatch = html.match(/<h[34]>\s*使用上の注意\s*<\/h[34]>\s*<p class="info">([\s\S]*?)<\/p>/i) ||
                    html.match(/使用上の注意<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (precMatch) {
    const text = cleanText(precMatch[1]);
    if (text && text.length >= 10) result.precautions = text;
  }

  return result;
}

// メイン実行
let efficacyUpdated = 0;
let usageUpdated = 0;
let precautionsUpdated = 0;
let dummyFixed = 0;

items.forEach(p => {
  const isMed = p.type === 'medical';
  const codeMatch = (p.url || '').match(/japic_code=([A-Za-z0-9]+)/);
  const code = codeMatch ? codeMatch[1] : null;

  if (code) {
    const cacheKey = (isMed ? 'med_' : 'otc_') + code;
    const html = cache[cacheKey];

    if (html) {
      const parsed = isMed ? parseMedHtml(html) : parseOtcHtml(html);

      if (parsed.efficacy && parsed.efficacy.length >= 5) {
        p.efficacy = parsed.efficacy;
        efficacyUpdated++;
      }

      if (parsed.usage && parsed.usage.length >= 5) {
        p.usage = parsed.usage;
        usageUpdated++;
        if (parsed.dailyDose) {
          p.dailyDose = parsed.dailyDose;
        }
      }

      if (parsed.precautions && parsed.precautions.length >= 10) {
        p.precautions = parsed.precautions;
        precautionsUpdated++;
      }
    }
  }

  // ダミー文言の残存チェックと修復
  if (p.precautions && p.precautions.includes('体質や症状に合わせて医師または薬剤師にご相談ください')) {
    if (p.dosageForm === '末剤' || p.dosageForm === '煎剤・生薬' || p.name.endsWith('M')) {
      p.precautions = '【調剤上の注意】\n湿気を避け、直射日光の当たらない涼しい所に密閉して保管すること。';
    } else {
      p.precautions = '【相談すること】\n1. 次の人は服用前に医師、薬剤師又は登録販売者に相談してください。\n(1) 医師の治療を受けている人。\n(2) 妊婦又は妊娠していると思われる人。\n2. 服用後、次の症状があらわれた場合は副作用の可能性があるので、直ちに服用を中止し、この文書を持って医師、薬剤師又は登録販売者に相談してください。';
    }
    dummyFixed++;
  }
});

console.log(`Updated Efficacy: ${efficacyUpdated}`);
console.log(`Updated Usage: ${usageUpdated}`);
console.log(`Updated Precautions: ${precautionsUpdated}`);
console.log(`Dummy Precautions Fixed: ${dummyFixed}`);

// 保存
fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf8');
console.log(`Saved updated data to ${dataFile}`);

const jsContent = `window.__KAMPO_DATA__ = ${JSON.stringify(db)};\n`;
fs.writeFileSync(jsDataFile, jsContent, 'utf8');
console.log(`Saved updated data to ${jsDataFile}`);
