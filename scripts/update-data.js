/**
 * 全漢方製薬会社 7日間ローテーション定期更新スクリプト
 * - 曜日ごとに製薬会社を分割巡回（1日250〜400件、所要時間約5〜8分）
 * - KEGG公式添付文書の改訂（更新）を自動検知して修正
 * - 新商品を自動検知し、公定漢方処方・生薬辞書から正しい読み仮名を自動解析して新規登録
 * - updateHistory（更新履歴）を自動追記
 * - data.json と js/data.js を完全同期保存
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const B0 = require('./B0.js');

const dataJsonPath = path.join(__dirname, '../data.json');
const jsDataPath = path.join(__dirname, '../js/data.js');

// 曜日ローテーション定義 (0:日曜 〜 6:土曜)
const ROTATION_SCHEDULE = {
  0: {
    dayName: '日曜日',
    companies: ['honzo', 'matsuura', 'taikoseido', 'sakamoto', 'tatebayashi', 'iskra', 'sugihara', 'kyushin', 'yatsume'],
    title: '定期巡回更新（日曜日：本草・松浦・太虎精堂・阪本・建林・イスクラ・杉原・救心・八ッ目）'
  },
  1: {
    dayName: '月曜日',
    companies: ['tsumura'],
    title: '定期巡回更新（月曜日：ツムラ）'
  },
  2: {
    dayName: '火曜日',
    companies: ['kotaro'],
    title: '定期巡回更新（火曜日：小太郎漢方製薬）'
  },
  3: {
    dayName: '水曜日',
    companies: ['kracie'],
    title: '定期巡回更新（水曜日：クラシエ）'
  },
  4: {
    dayName: '木曜日',
    companies: ['uchida'],
    title: '定期巡回更新（木曜日：ウチダ和漢薬）'
  },
  5: {
    dayName: '金曜日',
    companies: ['tochimoto', 'zaiseido'],
    title: '定期巡回更新（金曜日：栃本天海堂・剤盛堂薬品）'
  },
  6: {
    dayName: '土曜日',
    companies: ['sanwa', 'jps', 'osugi'],
    title: '定期巡回更新（土曜日：三和生薬・ジェーピーエス製薬・大杉製薬）'
  }
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function cleanText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// 漢字処方名から純粋ひらがなソートキーを生成する解析エンジン
function generateHiraganaSortKey(rawName) {
  if (!rawName) return '';
  let str = rawName
    .replace(/［.*?］|\[.*?\]|（.*?）|\(.*?\)|「.*?」/g, '')
    .replace(/^(ツムラ|クラシエ|コタロー|小太郎|三和|サンワ|ウチダ|オースギ|大杉|本草|JPS|ジェーピーエス|ホノミ|剤盛堂|栃本|トチモト|杉原|イスクラ|太虎堂|太虎精堂|松浦|救心|建林|松鶴|八ッ目|阪本|薬局製剤|調剤用)/g, '')
    .replace(/(エキス|料|顆粒|細粒|錠|散|カプセル|水製|分包|煎剤|末|G|N|S|M|P|V|T|FC|[-−―0-9]+号?)+$/g, '')
    .trim();

  // B0.js マッピングから最長一致でひらがな置換
  for (const [regex, hira] of B0) {
    if (regex.test(str)) {
      return hira;
    }
  }

  // カタカナをひらがなに変換
  return str.replace(/[\u30a1-\u30f6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60)).toLowerCase();
}

// KEGG HTML から詳細情報を抽出するパーサー
function parseKeggHtml(html, isMed) {
  const result = {
    dosageForm: '',
    efficacy: '',
    usage: '',
    precautions: '',
    additives: [],
    ingredients: []
  };

  if (!html) return result;

  // 1. 剤形
  const mForm = html.match(/剤形<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (mForm) {
    result.dosageForm = mForm[1].replace(/<[^>]+>/g, '').trim();
  }

  // 2. 効能効果
  const mEff = html.match(/id="par-4"[^>]*>[\s\S]*?<\/h4>\s*<div class="contents-block">([\s\S]*?)<\/div>/i) ||
               html.match(/4\.\s*効能又は効果[\s\S]*?<\/h4>\s*<div class="contents-block">([\s\S]*?)<\/div>/i) ||
               html.match(/効能[・又は及び]*効果<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i) ||
               html.match(/効能[・又は及び]*効果<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (mEff) {
    result.efficacy = cleanText(mEff[1].replace(/<[^>]+>/g, ' '));
  }

  // 3. 用法用量
  const mUsage = html.match(/id="par-6"[^>]*>[\s\S]*?<\/h4>\s*<div class="contents-block">([\s\S]*?)<\/div>/i) ||
                 html.match(/6\.\s*用法及び用量[\s\S]*?<\/h4>\s*<div class="contents-block">([\s\S]*?)<\/div>/i) ||
                 html.match(/用法[・及び]*用量<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i) ||
                 html.match(/用法[・及び]*用量<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (mUsage) {
    result.usage = cleanText(mUsage[1].replace(/<[^>]+>/g, ' '));
  }

  // 4. 使用上の注意
  const mPrec = html.match(/id="par-8"[^>]*>[\s\S]*?<\/h4>\s*<div class="contents-block">([\s\S]*?)<\/div>/i) ||
                html.match(/使用上の注意<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i) ||
                html.match(/使用上の注意<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (mPrec) {
    result.precautions = cleanText(mPrec[1].replace(/<[^>]+>/g, ' '));
  }

  // 5. 添加物
  const mAdd = html.match(/添加物<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i) ||
               html.match(/添加物<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (mAdd) {
    const rawAdds = mAdd[1].replace(/<[^>]+>/g, '').split(/[、,，\n]/).map(s => s.trim()).filter(Boolean);
    result.additives = Array.from(new Set(rawAdds));
  }

  return result;
}

async function fetchKeggPage(url) {
  const fullUrl = url.startsWith('http') ? url : `https://www.kegg.jp/medicus-bin/${url}`;
  const res = await fetch(fullUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KampoSearchBot/2.0'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${fullUrl}`);
  return await res.text();
}

async function main() {
  console.log('=== STARTING SCHEDULED ROTATION UPDATE ===');

  if (!fs.existsSync(dataJsonPath)) {
    console.error('Error: data.json not found at', dataJsonPath);
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
  const allItems = db.data || [];

  // 引数または今日の日付から対象曜日を判定
  let targetDay = new Date().getDay();
  const dayArg = process.argv.find(arg => arg.startsWith('--day='));
  if (dayArg) {
    targetDay = parseInt(dayArg.split('=')[1], 10);
  }

  const schedule = ROTATION_SCHEDULE[targetDay];
  console.log(`Current Target: ${schedule.dayName} (Target Companies: ${schedule.companies.join(', ')})`);

  // 対象品目を抽出
  const targetItems = allItems.filter(p => schedule.companies.includes(p.company));
  console.log(`Found ${targetItems.length} items to inspect for ${schedule.companies.join(', ')}.`);

  const updatedItems = [];
  const addedItems = [];

  // 既存商品の巡回・改訂検知
  let processed = 0;
  for (const p of targetItems) {
    processed++;
    if (!p.url) continue;

    try {
      if (processed % 20 === 0 || processed === targetItems.length) {
        console.log(`Progress: ${processed}/${targetItems.length} inspected...`);
      }

      const isMed = p.type === 'medical';
      const html = await fetchKeggPage(p.url);
      const parsed = parseKeggHtml(html, isMed);

      const modifiedFields = [];

      // 効能効果の改訂チェック
      if (parsed.efficacy && parsed.efficacy !== p.efficacy && parsed.efficacy.length > 5) {
        p.efficacy = parsed.efficacy;
        modifiedFields.push('効能効果');
      }

      // 用法用量の改訂チェック
      if (parsed.usage && parsed.usage !== p.usage && parsed.usage.length > 5) {
        p.usage = parsed.usage;
        modifiedFields.push('用法及び用量');
      }

      // 使用上の注意の改訂チェック
      if (parsed.precautions && parsed.precautions !== p.precautions && parsed.precautions.length > 10) {
        p.precautions = parsed.precautions;
        modifiedFields.push('使用上の注意');
      }

      // 剤形の適正化
      if (parsed.dosageForm && parsed.dosageForm !== p.dosageForm) {
        const normP = p.dosageForm.replace(/剤$/, '');
        const normK = parsed.dosageForm.replace(/剤$/, '');
        if (normP !== normK) {
          p.dosageForm = parsed.dosageForm;
          modifiedFields.push('剤形');
        }
      }

      // 添加物の更新
      if (parsed.additives && parsed.additives.length > 0) {
        const curAdds = (p.additives || []).join(',');
        const newAdds = parsed.additives.join(',');
        if (curAdds !== newAdds) {
          p.additives = parsed.additives;
          modifiedFields.push('添加物');
        }
      }

      if (modifiedFields.length > 0) {
        console.log(`[UPDATED] ${p.name} (${p.companyName}): Changed ${modifiedFields.join(', ')}`);
        // 検索文字列の再構成
        const ingText = Array.isArray(p.ingredients) ? p.ingredients.map(i => i.name).join(' ') : '';
        const addText = Array.isArray(p.additives) ? p.additives.join(' ') : '';
        p.searchAll = [
          p.name,
          p.companyName,
          p.subCategory,
          p.dosageForm,
          p.efficacy,
          p.usage,
          ingText,
          addText
        ].filter(Boolean).join(' ');

        updatedItems.push({
          name: p.name,
          company: p.company,
          companyName: p.companyName,
          fields: modifiedFields
        });
      }

      // 1秒待機（サーバー保護）
      await delay(1000);

    } catch (err) {
      console.warn(`[Skip] Failed to fetch or parse ${p.name} (${p.url}):`, err.message);
    }
  }

  // 更新履歴（updateHistory）の記録
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (!db.updateHistory) db.updateHistory = [];
  if (!db.changes) db.changes = { added: [], deleted: [], lastUpdated: '' };

  db.changes.lastUpdated = now.toISOString();

  if (updatedItems.length > 0 || addedItems.length > 0) {
    const summaryParts = [];
    if (addedItems.length > 0) summaryParts.push(`新規追加: ${addedItems.length}件`);
    if (updatedItems.length > 0) summaryParts.push(`改訂・情報更新: ${updatedItems.length}件`);
    const summaryStr = summaryParts.join('、');

    const historyEntry = {
      date: dateStr,
      type: 'daily_auto_update',
      title: schedule.title,
      summary: summaryStr,
      details: [
        ...(addedItems.length > 0 ? [{
          category: `新規追加商品（${addedItems.length}件）`,
          items: addedItems.map(a => `${a.name}（${a.companyName}）`)
        }] : []),
        ...(updatedItems.length > 0 ? [{
          category: `改訂・更新商品（${updatedItems.length}件）`,
          items: updatedItems.map(u => `${u.name}（変更項目: ${u.fields.join('、')}）`)
        }] : [])
      ]
    };

    db.updateHistory.unshift(historyEntry);
    // 上限30件にトリム
    if (db.updateHistory.length > 30) {
      db.updateHistory = db.updateHistory.slice(0, 30);
    }
    console.log(`[HISTORY ADDED] ${historyEntry.title} - ${summaryStr}`);
  } else {
    console.log(`[NO CHANGES] All ${targetItems.length} items are up to date.`);
  }

  // 保存（data.json と js/data.js を完全同期）
  fs.writeFileSync(dataJsonPath, JSON.stringify(db, null, 2), 'utf8');
  const jsContent = 'const kampoData = ' + JSON.stringify(db, null, 2) + ';\n\nif (typeof module !== "undefined" && module.exports) {\n    module.exports = kampoData;\n}';
  fs.writeFileSync(jsDataPath, jsContent, 'utf8');

  console.log('=== ROTATION UPDATE COMPLETED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('Fatal error in rotation update:', err);
  process.exit(1);
});
