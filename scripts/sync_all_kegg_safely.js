const fs = require('fs');
const path = require('path');
const https = require('https');

const dataFile = path.join(__dirname, '../data.json');
const jsDataFile = path.join(__dirname, '../js/data.js');
const cacheFile = path.join(__dirname, 'cache_kegg_all_sync.json');

const db = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const items = db.data;

// キャッシュのロード
let cache = {};
if (fs.existsSync(cacheFile)) {
  try {
    cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    console.log(`Loaded existing cache: ${Object.keys(cache).length} entries.`);
  } catch (e) {
    cache = {};
  }
}

// 既存のキャッシュ（cache_products.json, cache_otc_products.json）も統合活用して無駄なアクセスを徹底排除
const oldMedCacheFile = path.join(__dirname, 'cache_products.json');
if (fs.existsSync(oldMedCacheFile)) {
  try {
    const oldMed = JSON.parse(fs.readFileSync(oldMedCacheFile, 'utf8'));
    for (const [k, v] of Object.entries(oldMed)) {
      if (v && v.length > 200 && !cache['med_' + k]) {
        cache['med_' + k] = v;
      }
    }
  } catch (e) {}
}
const oldOtcCacheFile = path.join(__dirname, 'cache_otc_products.json');
if (fs.existsSync(oldOtcCacheFile)) {
  try {
    const oldOtc = JSON.parse(fs.readFileSync(oldOtcCacheFile, 'utf8'));
    for (const [k, v] of Object.entries(oldOtc)) {
      if (v && v.length > 200 && !cache['otc_' + k]) {
        cache['otc_' + k] = v;
      }
    }
  } catch (e) {}
}

console.log(`Total integrated pre-cache entries: ${Object.keys(cache).length}`);

// ユーティリティ
const sleep = ms => new Promise(r => setTimeout(r, ms));

function getJapicCode(url) {
  if (!url) return null;
  const m = url.match(/japic_code=([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

// 安全なHTTPリクエスト（403/429検知時の自動クールダウン＆リトライ付き）
async function fetchKeggHtml(code, isMedical) {
  const cacheKey = (isMedical ? 'med_' : 'otc_') + code;
  if (cache[cacheKey] && cache[cacheKey].length > 200) {
    return cache[cacheKey];
  }

  const endpoint = isMedical ? 'japic_med' : 'japic_otc';
  const url = `https://www.kegg.jp/medicus-bin/${endpoint}?japic_code=${code}`;

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const result = await new Promise((resolve) => {
        const req = https.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
          },
          timeout: 10000
        }, (res) => {
          if (res.statusCode === 200) {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ success: true, html: data }));
          } else if (res.statusCode === 403 || res.statusCode === 429 || res.statusCode === 503) {
            resolve({ success: false, blocked: true, status: res.statusCode });
          } else {
            resolve({ success: false, status: res.statusCode });
          }
        });

        req.on('error', (err) => resolve({ success: false, error: err.message }));
        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false, timeout: true });
        });
      });

      if (result.success && result.html) {
        cache[cacheKey] = result.html;
        return result.html;
      }

      if (result.blocked) {
        console.warn(`[WAF ALERT] Received status ${result.status} for ${code}. Cooling down for 65 seconds to prevent block...`);
        await sleep(65000);
        continue; // リトライ
      }

      // その他のエラー
      await sleep(1500);
    } catch (e) {
      await sleep(2000);
    }
  }

  return null;
}

// KEGG HTMLパーサー
function parseKeggHtml(html, isMedical) {
  const ingredients = [];
  const additives = [];

  if (!html) return { ingredients, additives };

  if (isMedical) {
    // 医療用医薬品
    const actMatch = html.match(/有効成分<\/td><td[^>]*>([\s\S]*?)<\/td>/i);
    if (actMatch) {
      const text = actMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/g, ' ');
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      
      lines.forEach(line => {
        // 乾燥エキス
        const extMatch = line.match(/(?:乾燥エキス|水製エキス|水製乾燥エキス|エキス)\s*([0-9.]+)\s*(g|mg)?/i);
        if (extMatch) {
          let amt = parseFloat(extMatch[1]);
          if (extMatch[2] === 'mg') amt = Math.round((amt / 1000) * 10000) / 10000;
          ingredients.push({
            name: '乾燥エキス',
            amount: amt,
            amountStr: amt + 'g',
            isExtract: true
          });
        }
        // 生薬
        const herbMatch = line.match(/(?:日局|局外規)?\s*([ァ-ヶー一-龠々]+)\s+([0-9.]+)\s*(g|mg)?/);
        if (herbMatch) {
          const name = herbMatch[1].replace(/^(日局|局外規)/, '').trim();
          if (!/エキス|乾燥|水製|下記|本品|割合|成分|分量/.test(name) && name.length >= 2) {
            let amt = parseFloat(herbMatch[2]);
            if (herbMatch[3] === 'mg') amt = Math.round((amt / 1000) * 10000) / 10000;
            ingredients.push({
              name: name,
              amount: amt,
              amountStr: amt + 'g',
              isExtract: false
            });
          }
        }
      });
    }

    // 添加剤
    const addMatch = html.match(/添加剤<\/td><td[^>]*>([\s\S]*?)<\/td>/i);
    if (addMatch) {
      const addText = addMatch[1].replace(/<[^>]+>/g, ' ').replace(/日局/g, '').trim();
      addText.split(/[、,，\s\n]+/).forEach(a => {
        const cleaned = a.trim();
        if (cleaned && !additives.includes(cleaned) && cleaned !== 'なし') additives.push(cleaned);
      });
    }
  } else {
    // 一般用医薬品
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;

    const compIdx = html.indexOf('成分');
    const compSection = compIdx !== -1 ? html.slice(compIdx, compIdx + 15000) : html;

    while ((trMatch = trRegex.exec(compSection)) !== null) {
      const row = trMatch[1];
      const tdMatches = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      if (tdMatches.length >= 2) {
        let nameCol = tdMatches[0][1]
          .replace(/<span[^>]*>[\s\S]*?<\/span>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/^(日局|局外規)/, '')
          .trim();
        
        let amtCol = tdMatches[1][1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .trim();

        const amtMatch = amtCol.match(/([0-9.]+)\s*(g|mg|mL)/i);
        if (nameCol && amtMatch) {
          let amt = parseFloat(amtMatch[1]);
          const unit = amtMatch[2].toLowerCase();
          if (unit === 'mg') amt = Math.round((amt / 1000) * 10000) / 10000;

          const isExt = /エキス|乾燥|粉末/.test(nameCol);
          ingredients.push({
            name: nameCol,
            amount: amt,
            amountStr: amtCol,
            isExtract: isExt
          });
        }
      }
    }

    // 添加物
    const addIdx = compSection.indexOf('添加物');
    if (addIdx !== -1) {
      const addChunk = compSection.slice(addIdx, addIdx + 2000);
      const m = addChunk.match(/添加物[：:]?<\/t[dh]>\s*<td[^>]*>([\s\S]*?)<\/td>/i) || addChunk.match(/添加物として[、,\s]*([\s\S]*?)<\/td>/i);
      if (m) {
        const cleanAdd = m[1].replace(/<[^>]+>/g, ' ').replace(/\(.*?\)/g, '').trim();
        cleanAdd.split(/[、,，\s\n]+/).forEach(a => {
          const cleaned = a.trim();
          if (cleaned && !additives.includes(cleaned) && cleaned.length >= 2 && !/含有|添加物/.test(cleaned)) {
            additives.push(cleaned);
          }
        });
      }
    }
  }

  return { ingredients, additives };
}

// 検索インデックス再生成
function rebuildSearchIndexes(p) {
  const herbNames = (p.ingredients || []).map(i => i.name).filter(Boolean);
  const herbText = herbNames.join(' ');
  p.searchHerbs = herbText;
  p.searchAll = `${p.name} ${p.searchReadings || ''} ${herbText} ${p.subCategory || ''} ${p.company || ''} ${p.companyName || ''}`;
}

async function main() {
  console.log('=== Starting Safe KEGG Full Synchronization ===');
  console.log(`Total database items: ${items.length}`);

  // 1. 同期対象の抽出（KEGG URLを持つ全商品を対象として固有データを同期）
  const targetItems = items.filter(it => {
    return it.url && (it.url.includes('japic_med') || it.url.includes('japic_otc'));
  });

  console.log(`Total KEGG target items to verify/sync: ${targetItems.length}`);

  let syncedCount = 0;
  let cachedHitCount = 0;
  let networkFetchCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < targetItems.length; i++) {
    const item = targetItems[i];
    const isMedical = item.type === 'medical';
    const code = getJapicCode(item.url);

    if (!code) continue;

    const cacheKey = (isMedical ? 'med_' : 'otc_') + code;
    const isCached = !!cache[cacheKey];

    if (isCached) {
      cachedHitCount++;
    } else {
      networkFetchCount++;
    }

    // 安全にフェッチ（キャッシュがあれば即時返却）
    const html = await fetchKeggHtml(code, isMedical);

    if (html) {
      const parsed = parseKeggHtml(html, isMedical);

      // 実生薬またはエキスが1件以上パースできた場合、固有データで更新
      if (parsed.ingredients && parsed.ingredients.length > 0) {
        item.ingredients = parsed.ingredients;
        if (parsed.additives && parsed.additives.length > 0) {
          item.additives = parsed.additives;
        }
        rebuildSearchIndexes(item);
        updatedCount++;
      }
    }

    syncedCount++;

    // ネットワークアクセス時のみ安全ディレイ
    if (!isCached) {
      await sleep(350); // 350ms ディレイ
      if (networkFetchCount % 50 === 0) {
        console.log(`[COOL DOWN] Processed ${networkFetchCount} network requests. Brief pause 2s...`);
        // キャッシュをファイルに定期永続化
        fs.writeFileSync(cacheFile, JSON.stringify(cache), 'utf8');
        await sleep(2000);
      }
    }

    if (syncedCount % 100 === 0 || syncedCount === targetItems.length) {
      console.log(`Progress: ${syncedCount} / ${targetItems.length} (Cache hits: ${cachedHitCount}, Network fetches: ${networkFetchCount}, Updated: ${updatedCount})`);
    }
  }

  // 2. 本草製薬の空欄2件の明示的検証・修復
  const honzo1 = items.find(it => it.name === '本草黄連解毒湯エキス顆粒−M');
  if (honzo1 && (!honzo1.ingredients || honzo1.ingredients.length === 0)) {
    honzo1.ingredients = [
      { name: '黄連解毒湯水製エキス', amount: 1.10, amountStr: '1.10g', isExtract: true },
      { name: 'オウゴン', amount: 3.0, amountStr: '3.0g', isExtract: false },
      { name: 'オウレン', amount: 2.0, amountStr: '2.0g', isExtract: false },
      { name: 'サンシシ', amount: 2.0, amountStr: '2.0g', isExtract: false },
      { name: 'オウバク', amount: 1.5, amountStr: '1.5g', isExtract: false }
    ];
    rebuildSearchIndexes(honzo1);
    console.log('[HONZO FIXED] 本草黄連解毒湯エキス顆粒−M 生薬登録完了');
  }

  const honzo2 = items.find(it => it.name === '本草乙字湯エキス顆粒−M');
  if (honzo2 && (!honzo2.ingredients || honzo2.ingredients.length === 0)) {
    honzo2.ingredients = [
      { name: '乙字湯水製乾燥エキス', amount: 2.10, amountStr: '2.10g', isExtract: true },
      { name: 'トウキ', amount: 6.0, amountStr: '6.0g', isExtract: false },
      { name: 'サイコ', amount: 5.0, amountStr: '5.0g', isExtract: false },
      { name: 'オウゴン', amount: 3.0, amountStr: '3.0g', isExtract: false },
      { name: 'カンゾウ', amount: 2.0, amountStr: '2.0g', isExtract: false },
      { name: 'ショウマ', amount: 1.5, amountStr: '1.5g', isExtract: false },
      { name: 'ダイオウ', amount: 1.0, amountStr: '1.0g', isExtract: false }
    ];
    rebuildSearchIndexes(honzo2);
    console.log('[HONZO FIXED] 本草乙字湯エキス顆粒−M 生薬登録完了');
  }

  // 3. 最終保存
  fs.writeFileSync(cacheFile, JSON.stringify(cache), 'utf8');
  console.log(`Saved cache to ${cacheFile}`);

  db.data = items;
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Saved updated database to ${dataFile}`);

  const jsContent = `window.__KAMPO_DATA__ = ${JSON.stringify(db)};\n`;
  fs.writeFileSync(jsDataFile, jsContent, 'utf8');
  console.log(`Saved updated database to ${jsDataFile}`);

  console.log('=== Safe KEGG Synchronization Finished Successfully ===');
}

main().catch(err => {
  console.error('Fatal sync error:', err);
});
