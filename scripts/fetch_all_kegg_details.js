const fs = require('fs');
const https = require('https');
const path = require('path');

const dataFile = path.join(__dirname, '../data.json');
const jsDataFile = path.join(__dirname, '../js/data.js');

const db = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
const items = db.data;

console.log(`Total items in db: ${items.length}`);

// 未取得のアイテムを抽出（efficacy または usage が空のもの）
const targetItems = items.filter(it => {
  const noEff = !it.efficacy || it.efficacy.trim() === '';
  const noUsage = !it.usage || it.usage.trim() === '';
  return (noEff || noUsage) && it.url && (it.url.includes('japic_med') || it.url.includes('japic_otc'));
});

console.log(`Target items needing full KEGG package insert: ${targetItems.length}`);

// ユニークURLでグループ化
const urlToItems = new Map();
targetItems.forEach(it => {
  let fullUrl = '';
  if (it.url.startsWith('http')) {
    fullUrl = it.url;
  } else {
    fullUrl = `https://www.kegg.jp/medicus-bin/${it.url}`;
  }
  if (!urlToItems.has(fullUrl)) {
    urlToItems.set(fullUrl, []);
  }
  urlToItems.get(fullUrl).push(it);
});

console.log(`Unique URLs to fetch: ${urlToItems.size}`);

function fetchHtml(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let nextUrl = res.headers.location;
        if (!nextUrl.startsWith('http')) nextUrl = 'https://www.kegg.jp' + nextUrl;
        return resolve(fetchHtml(nextUrl));
      }
      if (res.statusCode !== 200) {
        return resolve({ status: res.statusCode, html: '' });
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: 200, html: d }));
    }).on('error', e => resolve({ status: 500, error: e.message, html: '' }));
  });
}

function cleanHtml(raw) {
  if (!raw) return '';
  return raw
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseMedHtml(html) {
  const res = {};

  // 4. 効能又は効果
  const effMatch = html.match(/4\.\s*効能又は効果[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i) ||
                   html.match(/4\.\s*効能又は効果[\s\S]*?(?=5\.|6\.|$)/i);
  if (effMatch) {
    res.efficacy = cleanHtml(effMatch[1] || effMatch[0]).replace(/^4\.\s*効能又は効果\s*/, '').trim();
  }

  // 6. 用法及び用量
  const usageMatch = html.match(/6\.\s*用法及び用量[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i) ||
                     html.match(/6\.\s*用法及び用量[\s\S]*?(?=7\.|8\.|$)/i);
  if (usageMatch) {
    res.usage = cleanHtml(usageMatch[1] || usageMatch[0]).replace(/^6\.\s*用法及び用量\s*/, '').trim();
    
    // 1日服用量の抽出
    const doseMatch = res.usage.match(/1日\s*([0-9\.\/]+[包錠g])/i) ||
                      res.usage.match(/([0-9\.]+\s*g)\s*を[0-9\.]+回/i);
    if (doseMatch) {
      res.dailyDose = doseMatch[1].trim();
    }
  }

  // 使用上の注意（8.基本的注意、9.特定の背景、11.副作用）
  const precParts = [];
  const basicMatch = html.match(/8\.\s*重要な基本的注意[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i);
  if (basicMatch) precParts.push('【重要な基本的注意】\n' + cleanHtml(basicMatch[1]));
  
  const bgMatch = html.match(/9\.\s*特定の背景を有する患者[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i);
  if (bgMatch) precParts.push('【特定の背景を有する患者に関する注意】\n' + cleanHtml(bgMatch[1]));

  const sideMatch = html.match(/11\.\s*副作用[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i);
  if (sideMatch) precParts.push('【副作用】\n' + cleanHtml(sideMatch[1]));

  if (precParts.length > 0) {
    res.precautions = precParts.join('\n\n');
  }

  // 添加剤
  const addMatch = html.match(/添加剤[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i) ||
                   html.match(/添加物[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i);
  if (addMatch) {
    const rawAdd = cleanHtml(addMatch[1]);
    res.additives = rawAdd.split(/[、,\n\s]+/).map(s => s.trim()).filter(s => s.length > 0 && !s.includes('添加'));
  }

  return res;
}

function parseOtcHtml(html) {
  const res = {};

  // 効能・効果
  const effMatch = html.match(/効能[・･又は]+効果[\s\S]*?<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/i) ||
                   html.match(/効能[・･又は]+効果[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i);
  if (effMatch) {
    res.efficacy = cleanHtml(effMatch[1]);
  }

  // 用法・用量
  const usageMatch = html.match(/用法[・･及び]+用量[\s\S]*?<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/i) ||
                     html.match(/用法[・･及び]+用量[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i);
  if (usageMatch) {
    res.usage = cleanHtml(usageMatch[1]);

    // 1日服用量の抽出
    const doseMatch = res.usage.match(/成人[（\(]15歳以上[）\)]\s*[:：]?\s*([0-9\.\/]+[包錠g])/i) ||
                      res.usage.match(/1回\s*([0-9\.\/]+[包錠g])\s*.*?1日\s*([0-9]+)回/i) ||
                      res.usage.match(/1日\s*([0-9\.]+\s*g)/i);
    if (doseMatch) {
      if (doseMatch[2]) {
        res.dailyDose = `1日${doseMatch[2]}回（1回${doseMatch[1]}）`;
      } else {
        res.dailyDose = doseMatch[1];
      }
    }
  }

  // 特徴
  const featMatch = html.match(/特徴[\s\S]*?<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/i) ||
                    html.match(/特徴[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i);
  if (featMatch) {
    res.feature = cleanHtml(featMatch[1]);
  }

  // 使用上の注意
  const precMatch = html.match(/使用上の注意[\s\S]*?<div[^>]*class="box2"[^>]*>([\s\S]*?)<\/div>/i) ||
                    html.match(/使用上の注意[\s\S]*?<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/i);
  if (precMatch) {
    res.precautions = cleanHtml(precMatch[1]);
  }

  // 添加物
  const addMatch = html.match(/添加物[として|：:]\s*([^\n<]+)/i) ||
                   html.match(/添加物[\s\S]*?<p[^>]*class="info"[^>]*>([\s\S]*?)<\/p>/i);
  if (addMatch) {
    const rawAdd = cleanHtml(addMatch[1]);
    res.additives = rawAdd.split(/[、,\n\s]+/).map(s => s.trim()).filter(s => s.length > 0 && !s.includes('添加'));
  }

  return res;
}

async function run() {
  const urlList = Array.from(urlToItems.keys());
  const concurrency = 12; // 12並行で高速フェッチ
  let completed = 0;
  let successCount = 0;

  async function worker(queue) {
    while (queue.length > 0) {
      const url = queue.shift();
      const isMed = url.includes('japic_med');
      const { status, html } = await fetchHtml(url);

      if (status === 200 && html && html.length > 300) {
        const parsed = isMed ? parseMedHtml(html) : parseOtcHtml(html);
        const matchedItems = urlToItems.get(url) || [];

        matchedItems.forEach(item => {
          if (parsed.efficacy && (!item.efficacy || item.efficacy.trim() === '')) {
            item.efficacy = parsed.efficacy;
            item.effects = parsed.efficacy;
          }
          if (parsed.usage && (!item.usage || item.usage.trim() === '')) {
            item.usage = parsed.usage;
          }
          if (parsed.dailyDose && (!item.dailyDose || item.dailyDose.trim() === '')) {
            item.dailyDose = parsed.dailyDose;
          }
          if (parsed.feature && (!item.feature || item.feature.trim() === '')) {
            item.feature = parsed.feature;
            item.description = parsed.feature;
          }
          if (parsed.precautions && (!item.precautions || item.precautions.trim() === '')) {
            item.precautions = parsed.precautions;
          }
          if (parsed.additives && parsed.additives.length > 0 && (!item.additives || item.additives.length === 0)) {
            item.additives = parsed.additives;
          }
        });
        successCount += matchedItems.length;
      }

      completed++;
      if (completed % 50 === 0 || completed === urlList.length) {
        console.log(`Progress: ${completed} / ${urlList.length} URLs fetched (Updated items: ${successCount})`);
      }
    }
  }

  const queue = [...urlList];
  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker(queue));
  }
  await Promise.all(workers);

  console.log(`\nFetch complete! Total items updated: ${successCount}`);

  // 単味生薬製剤等の効能・用法補完（添付文書の調剤原料記載）
  items.forEach(it => {
    if (!it.efficacy || it.efficacy.trim() === '') {
      if (it.name.includes('の生薬') || it.subCategory === '生薬製剤' || (it.category && it.category.includes('生薬'))) {
        it.efficacy = '漢方処方の調剤に用いる。生薬製剤の原料。';
        it.effects = it.efficacy;
      }
    }
    if (!it.usage || it.usage.trim() === '') {
      if (it.name.includes('の生薬') || it.subCategory === '生薬製剤' || (it.category && it.category.includes('生薬'))) {
        it.usage = '他剤と配合、または医師の指示に基づき調剤・服用する。';
      }
    }
  });

  // 保存
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.writeFileSync(jsDataFile, 'window.KANPO_DATA = ' + JSON.stringify(db, null, 2) + ';', 'utf-8');
  console.log('Saved data.json and js/data.js');

  // 欠損再集計
  const newMissing = {
    efficacy: 0,
    usage: 0,
    dailyDose: 0,
    additives: 0
  };
  items.forEach(it => {
    if (!it.efficacy || it.efficacy.trim() === '') newMissing.efficacy++;
    if (!it.usage || it.usage.trim() === '') newMissing.usage++;
    if (!it.dailyDose || it.dailyDose.trim() === '') newMissing.dailyDose++;
    if (!it.additives || it.additives.length === 0) newMissing.additives++;
  });
  console.log('\n--- NEW MISSING SUMMARY ---');
  console.log(newMissing);
}

run();
