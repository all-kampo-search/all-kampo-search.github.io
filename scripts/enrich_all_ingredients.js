// KEGG japic_med_product から全社の医療用漢方製剤の生薬・エキス・添加物データを完全取得・補完するスクリプト
const fs = require('fs');
const path = require('path');
const https = require('https');

const dataJsonPath = path.join(__dirname, '..', 'data.json');
const jsDataPath = path.join(__dirname, '..', 'js', 'data.js');
const cachePath = path.join(__dirname, 'cache_products.json');

const raw = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
const items = raw.data || [];

let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (e) {
    cache = {};
  }
}

// japic_code を抽出
function getJapicCode(url) {
  if (!url) return null;
  const m = url.match(/japic_code=([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

// HTMLから成分・添加物をパース
function parseProductHtml(html) {
  const ingredients = [];
  const additives = [];

  const match = html.match(/有効成分<\/td><td[^>]*>([\s\S]*?)<\/td>/);
  if (match) {
    const text = match[1].replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/g, ' ');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    lines.forEach(line => {
      // 乾燥エキス / 水製エキス
      const extMatch = line.match(/(?:乾燥エキス|水製エキス|水製乾燥エキス|エキス)\s*([0-9.]+)\s*g/);
      if (extMatch) {
        const amt = parseFloat(extMatch[1]);
        ingredients.push({
          name: '乾燥エキス',
          amount: amt,
          amountStr: amt + 'g',
          isExtract: true
        });
      }
      // 生薬
      const herbMatch = line.match(/(?:日局|局外規)?\s*([^\s0-9]+)\s+([0-9.]+)\s*(g|mg)?/);
      if (herbMatch && !/エキス|乾燥|水製|下記|本品|割合/.test(herbMatch[1])) {
        const name = herbMatch[1].replace(/^(日局|局外規)/, '').trim();
        let amount = parseFloat(herbMatch[2]);
        if (herbMatch[3] === 'mg') amount = Math.round((amount / 1000) * 10000) / 10000;
        ingredients.push({
          name: name,
          amount: amount,
          amountStr: amount + 'g',
          isExtract: false
        });
      }
    });
  }

  const addMatch = html.match(/添加剤<\/td><td[^>]*>([\s\S]*?)<\/td>/);
  if (addMatch) {
    const addText = addMatch[1].replace(/<[^>]+>/g, '').replace(/日局/g, '').trim();
    addText.split(/[、,，\s\n]+/).forEach(a => {
      const cleaned = a.trim();
      if (cleaned && !additives.includes(cleaned)) additives.push(cleaned);
    });
  }

  return { ingredients, additives };
}

// HTTP GET with Promise
function fetchHtml(code) {
  return new Promise((resolve) => {
    if (cache[code]) {
      return resolve(cache[code]);
    }
    const url = `https://www.kegg.jp/medicus-bin/japic_med_product?id=${code}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        cache[code] = '';
        return resolve('');
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        cache[code] = data;
        resolve(data);
      });
    });
    req.on('error', () => {
      cache[code] = '';
      resolve('');
    });
    req.setTimeout(8000, () => {
      req.destroy();
      cache[code] = '';
      resolve('');
    });
  });
}

async function main() {
  console.log(`Total items: ${items.length}`);

  // 対象となるアイテム（医療用で生薬が空のもの）
  const targets = items.filter(it => it.type === 'medical' && (!it.ingredients || it.ingredients.length === 0));
  console.log(`Medical items needing ingredients: ${targets.length}`);

  // ユニークな japic_code を収集
  const codeToItems = new Map();
  targets.forEach(it => {
    const code = getJapicCode(it.url);
    if (code) {
      if (!codeToItems.has(code)) codeToItems.set(code, []);
      codeToItems.get(code).push(it);
    }
  });

  console.log(`Unique japic codes to fetch: ${codeToItems.size}`);

  const codes = Array.from(codeToItems.keys());
  let processed = 0;
  let successCount = 0;

  // バッチで順次取得（サーバーに過大な負荷をかけないよう並列数5、遅延100ms）
  const BATCH_SIZE = 5;
  for (let i = 0; i < codes.length; i += BATCH_SIZE) {
    const batch = codes.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (code) => {
      const html = await fetchHtml(code);
      if (html) {
        const parsed = parseProductHtml(html);
        if (parsed.ingredients.length > 0) {
          const itemList = codeToItems.get(code) || [];
          itemList.forEach(it => {
            it.ingredients = JSON.parse(JSON.stringify(parsed.ingredients));
            if (parsed.additives.length > 0) {
              it.additives = Array.from(new Set([...(it.additives || []), ...parsed.additives]));
            }
          });
          successCount += itemList.length;
        }
      }
      processed++;
    }));

    if (processed % 50 === 0 || processed === codes.length) {
      console.log(`Progress: ${processed} / ${codes.length} codes processed (Success items: ${successCount})`);
      fs.writeFileSync(cachePath, JSON.stringify(cache), 'utf8');
    }

    await new Promise(r => setTimeout(r, 100));
  }

  // 単味生薬製品（オウギ末、炮附子末、トチモトのアキョウ等）で成分が空のものを自己登録
  let singleHerbCount = 0;
  items.forEach(it => {
    if (!it.ingredients || it.ingredients.length === 0) {
      // 単味生薬の判定（subCategoryに生薬名がある、または末剤・煎剤生薬）
      if (it.dosageForm === '末剤' || it.dosageForm === '煎剤・生薬' || (it.subCategory && /^[ァ-ヶ一-龠々\s]+$/.test(it.subCategory))) {
        let herbName = (it.subCategory || it.name).split(/[\s　]+/)[0].replace(/^(ウチダの|トチモトの|ツムラの生薬|小太郎漢方の)/, '').replace(/末[M]?$/, '');
        if (herbName && herbName.length >= 2) {
          it.ingredients = [{
            name: herbName,
            amount: it.dailyDose ? parseFloat(it.dailyDose) || null : null,
            amountStr: it.dailyDose || '調剤用生薬',
            isExtract: false
          }];
          singleHerbCount++;
        }
      }
    }
  });

  console.log(`Single herb self-assigned items: ${singleHerbCount}`);

  // ツムラ安中散の確認
  const anchu = items.find(it => it.name === 'ツムラ安中散エキス顆粒');
  if (anchu) {
    console.log('\n--- Verification: ツムラ安中散エキス顆粒 ---');
    console.log(JSON.stringify(anchu.ingredients, null, 2));
  }

  // data.json & js/data.js の更新
  raw.data = items;
  fs.writeFileSync(dataJsonPath, JSON.stringify(raw, null, 2), 'utf8');
  console.log(`\nUpdated ${dataJsonPath}`);

  const jsContent = `window.__KAMPO_DATA__ = ${JSON.stringify(raw)};\n`;
  fs.writeFileSync(jsDataPath, jsContent, 'utf8');
  console.log(`Updated ${jsDataPath}`);
}

main().catch(console.error);
