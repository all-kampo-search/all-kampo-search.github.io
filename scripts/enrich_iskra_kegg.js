const fs = require('fs');
const https = require('https');
const path = require('path');

const dataFile = path.join(__dirname, '../data.json');
const jsDataFile = path.join(__dirname, '../js/data.js');
const db = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
const items = db.data;

// 先ほど特定したイスクラの製品名とKEGG JAPICコードの対応マップ
const ISKRA_KEGG_MAP = {
  'イスクラ衛益顆粒': 'J2301000096',
  'イスクラ温胆湯エキス顆粒': 'J1101000166',
  'イスクラ華陀膏': 'K1902000008',
  'イスクラ開気丸': 'J1201000080',
  'イスクラ冠元顆粒': 'J1101000167',
  'イスクラ健胃顆粒S': 'J1201000081',
  'イスクラ健脾散エキス顆粒': 'K1212000012',
  'イスクラ参茸補血丸': 'J1001000392',
  'イスクラ参馬補腎丸': 'J1001000395',
  'イスクラ酸棗仁湯顆粒': 'J1101000168',
  'イスクラ勝湿顆粒': 'J1101000169',
  'イスクラ心脾顆粒': 'J1401000430',
  'イスクラ清営顆粒': 'J1101000172',
  'イスクラ双料参茸丸': 'J1001000396',
  'イスクラ双料杞菊顆粒': 'J1701000176',
  'イスクラ頂調顆粒': 'J1201000083',
  'イスクラ天王補心丹T': 'J1201000084',
  'イスクラ独歩顆粒': 'K1212000010',
  'イスクラ麦味参顆粒': 'J1001000398',
  'イスクラ八仙丸': 'J1601000122',
  'イスクラ婦宝当帰膠B': 'J1401000347',
  'イスクラ平喘顆粒': 'J1201000086',
  'イスクラ補中丸T': 'J1201000087',
  'イスクラ麻杏止咳顆粒S': 'J1201000088',
  'イスクラ杞菊地黄丸': 'J1001000391',
  'イスクラ槐角丸': 'K2601000012',
  'イスクラ瀉火補腎丸': 'J1401000346',
  'イスクラ瀉火利湿顆粒': 'J1001000393',
  'イスクラ逍遙顆粒': 'J1801000138'
};

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', (e) => resolve(''));
  });
}

function cleanHtmlText(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function run() {
  console.log('Fetching Iskra OTC package inserts from KEGG...');
  let updatedCount = 0;

  for (const [prodName, code] of Object.entries(ISKRA_KEGG_MAP)) {
    const item = items.find((it) => it.name === prodName && it.company === 'iskra');
    if (!item) {
      console.log('Item not found in db:', prodName);
      continue;
    }

    const url = `https://www.kegg.jp/medicus-bin/japic_otc?japic_code=${code}`;
    const html = await fetchUrl(url);
    if (!html || html.length < 500) {
      console.log(`Failed to fetch for ${prodName} (${code})`);
      continue;
    }

    // URL更新
    item.url = `japic_otc?japic_code=${code}`;

    // 効能・効果の抽出
    const effMatch = html.match(/効能[・･]効果[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i);
    if (effMatch) {
      item.efficacy = cleanHtmlText(effMatch[1]);
      item.effects = item.efficacy;
    }

    // 用法・用量の抽出
    const usageMatch = html.match(/用法[・･]用量[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i);
    if (usageMatch) {
      item.usage = cleanHtmlText(usageMatch[1]);
      // 1日服用量の抽出
      const dailyMatch = item.usage.match(/1日([0-9０-９]+)回.*?1回([0-9０-９\.\/]+[包錠g])/);
      if (dailyMatch) {
        item.dailyDose = `${dailyMatch[1]}回（1回${dailyMatch[2]}）`;
      }
    }

    // 特徴の抽出
    const featMatch = html.match(/特徴[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i);
    if (featMatch) {
      item.feature = cleanHtmlText(featMatch[1]);
      item.description = item.feature;
    }

    // 使用上の注意の抽出
    const precMatch = html.match(/使用上の注意[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i);
    if (precMatch) {
      item.precautions = cleanHtmlText(precMatch[1]);
    }

    // 成分・分量の抽出
    const ingMatch = html.match(/成分[・･]分量[\s\S]*?<div[^>]*class="block1"[^>]*>([\s\S]*?)<\/div>/i);
    if (ingMatch) {
      const ingText = cleanHtmlText(ingMatch[1]);
      // 生薬パース
      const parsedIngredients = [];
      const lines = ingText.split('\n');
      for (const line of lines) {
        // 例: タンジン・・・4.5g, コウカ 2.25g, イスクラ冠元顆粒エキス 4.5g
        const m = line.match(/^([^\s・0-9]+)[\s・…]+([0-9\.]+)\s*(g|mg|kg)?/);
        if (m) {
          const rawHerbName = m[1].replace(/［.*?］|\(.*?\)/g, '').trim();
          const amt = parseFloat(m[2]);
          const unit = m[3] || 'g';
          const isExt = rawHerbName.includes('エキス');
          parsedIngredients.push({
            name: rawHerbName,
            amount: amt,
            amountStr: `${amt}${unit}`,
            isExtract: isExt
          });
        }
      }

      if (parsedIngredients.length > 0) {
        item.ingredients = parsedIngredients;
      }

      // 添加物の抽出
      const addMatch = ingText.match(/添加物[として|：:]\s*([^\n]+)/);
      if (addMatch) {
        item.additives = addMatch[1].split(/[、,]/).map((s) => s.trim()).filter(Boolean);
      }
    }

    updatedCount++;
    console.log(`Updated ${prodName} from KEGG (${code}), ingredients: ${item.ingredients ? item.ingredients.length : 0}`);
  }

  console.log(`Total Iskra products updated: ${updatedCount}`);
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.writeFileSync(jsDataFile, 'window.KANPO_DATA = ' + JSON.stringify(db, null, 2) + ';', 'utf-8');
  console.log('Saved to data.json and js/data.js');
}

run();
