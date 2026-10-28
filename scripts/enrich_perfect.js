const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BASE_URL = "https://www.kegg.jp";
const DATA_FILE = path.join(__dirname, '../data.json');
const DATA_JS_FILE = path.join(__dirname, '../js/data.js');
const CACHE_FILE = path.join(__dirname, 'cache_perfect.json');

const delay = ms => new Promise(r => setTimeout(r, ms));

let cache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`Loaded ${Object.keys(cache).length} items from cache.`);
  } catch(e) {}
}

function parseText($, el) {
  if (!el || !el.length) return "";
  const clone = el.clone();
  clone.find('br').replaceWith('\n');
  clone.find('tr, p, div, li, h1, h2, h3, h4, h5').each((_, b) => { $(b).prepend('\n'); });
  clone.find('td, th').each((_, c) => { $(c).append(' \n'); });
  return clone.text().replace(/\n\s*\n+/g, '\n').trim();
}

function parseIngredientsFromText(rawText) {
  const list = [];
  const clean = rawText.replace(/\(D\d+\)/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ');

  const extMatch = clean.match(/((?:乾燥|水製乾燥|水製|軟)?エキス(?:粉末)?)\s*([\d.]+)\s*(g|mg)/i) || 
                   clean.match(/(エキス(?:粉末)?)\s*([\d.]+)\s*(g|mg)/i);
  if (extMatch) {
    const amt = parseFloat(extMatch[2]);
    const unit = extMatch[3];
    list.push({
      name: extMatch[1].replace(/粉末$/, ''),
      amount: unit === 'mg' ? amt / 1000 : amt,
      amountStr: `${extMatch[2]}${unit}`,
      isExtract: true
    });
  }

  const herbRegex = /(?:日局|局)?([ァ-ヶー一-龯]{2,}(?:（[^）]*）)?)\s*([\d.]+)\s*(g|mg|mL)/g;
  let m;
  while ((m = herbRegex.exec(clean)) !== null) {
    let name = m[1].replace(/^日局/, '').replace(/[（(].*?[）)]/g, '').replace(/末$/, '').trim();
    if (!name.includes('エキス') && !name.includes('ゼラチン') && !name.includes('ステアリン酸') && !name.includes('セルロース')) {
      const amt = parseFloat(m[2]);
      const unit = m[3];
      if (!list.find(x => x.name === name)) {
        list.push({
          name,
          amount: unit === 'mg' ? amt / 1000 : amt,
          amountStr: `${m[2]}${unit}`,
          isExtract: false
        });
      }
    }
  }
  return list;
}

async function fetchOneItem(url, type) {
  const fullUrl = `${BASE_URL}/medicus-bin/${url}`;
  const res = await fetch(fullUrl);
  if (!res.ok) return null;
  const html = await res.text();
  const $ = cheerio.load(html);

  const result = {
    efficacy: "",
    usage: "",
    precautions: "",
    dailyDose: "",
    ingredients: [],
    additives: []
  };

  if (type === 'medical') {
    $("h3, h4").each((_, h) => {
      const heading = $(h).text().trim();
      const nextDiv = $(h).next();
      const text = parseText($, nextDiv);
      if (/効能|効果/.test(heading) && !/禁忌/.test(heading) && !result.efficacy) {
        result.efficacy = text;
      } else if (/用法.*用量|用量.*用法/.test(heading) && !result.usage) {
        result.usage = text;
        const dMatch = text.match(/1日\s*([\d.]+\s*g)/);
        if (dMatch) result.dailyDose = dMatch[1];
      } else if (/使用上の注意|重要な基本的注意|特定の背景を有する患者|相互作用|副作用/.test(heading)) {
        result.precautions = (result.precautions ? result.precautions + '\n\n' : '') + `【${heading}】\n` + text;
      }
    });

    // Match JAPIC code with alphanumeric (J123, K123, 000123)
    const jCode = url.match(/japic_code=([A-Za-z0-9]+)/);
    if (jCode) {
      try {
        const pUrl = `${BASE_URL}/medicus-bin/japic_med_product?id=${jCode[1]}`;
        const pRes = await fetch(pUrl);
        if (pRes.ok) {
          const pHtml = await pRes.text();
          const $p = cheerio.load(pHtml);
          $p('td.title, th').each((_, th) => {
            const title = $p(th).text().trim();
            const nextTd = $p(th).next();
            if (/有効成分|成分/.test(title)) {
              const rawText = nextTd.text();
              const doseMatch = rawText.match(/本品\s*([\d.]+\s*g)中/);
              if (doseMatch && !result.dailyDose) result.dailyDose = doseMatch[1];
              result.ingredients = parseIngredientsFromText(rawText);
            } else if (/添加剤|添加物/.test(title)) {
              result.additives = nextTd.text().replace(/\(D\d+\)/g, '').trim().split(/[\s,、]+/).filter(Boolean);
            }
          });
        }
      } catch(e) {}
    }
  } else {
    // OTC (japic_otc)
    $("h3, h4").each((_, h) => {
      const heading = $(h).text().trim();
      const nextDiv = $(h).next();
      const text = parseText($, nextDiv);
      if (/効能|効果/.test(heading) && !result.efficacy) result.efficacy = text;
      else if (/用法|用量/.test(heading) && !result.usage) result.usage = text;
      else if (/使用上の注意/.test(heading) && !result.precautions) result.precautions = text;
    });

    $("td.title, th").each((_, th) => {
      const title = $(th).text().trim();
      const nextTd = $(th).next();
      if (/成分/.test(title)) {
        const doseMatch = title.match(/[（(]([^）)]+)[）)]/);
        if (doseMatch) result.dailyDose = doseMatch[1].replace(/中$/, '');
        const rawText = nextTd.text();
        result.ingredients = parseIngredientsFromText(rawText);
      } else if (/添加物/.test(title)) {
        result.additives = nextTd.text().replace(/\(D\d+\)/g, '').trim().split(/[\s,、]+/).filter(Boolean);
      }
    });
  }

  if (result.ingredients && result.ingredients.length > 0) {
    result.ingredients.sort((a, b) => {
      if (a.isExtract && !b.isExtract) return -1;
      if (!a.isExtract && b.isExtract) return 1;
      return (b.amount || 0) - (a.amount || 0);
    });
  }

  return result;
}

async function runEnrich() {
  const dataObj = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const items = dataObj.data;
  console.log(`Starting enrich for ${items.length} items with alphanumeric japic code fix...`);

  let updatedCount = 0;
  const total = items.length;

  for (let i = 0; i < total; i++) {
    const item = items[i];
    if (item.company === 'iskra') continue;

    // Only fetch if efficacy or ingredients is missing
    const hasValidEfficacy = item.efficacy && item.efficacy.trim().length > 1;
    const hasValidIngredients = item.ingredients && item.ingredients.length > 0;
    if (hasValidEfficacy && hasValidIngredients) {
      continue;
    }

    try {
      const details = await fetchOneItem(item.url, item.type);
      if (details) {
        if (details.efficacy && details.efficacy.trim().length > 1) item.efficacy = details.efficacy;
        if (details.usage) item.usage = details.usage;
        if (details.precautions) item.precautions = details.precautions;
        if (details.dailyDose) item.dailyDose = details.dailyDose;
        if (details.ingredients && details.ingredients.length > 0) item.ingredients = details.ingredients;
        if (details.additives && details.additives.length > 0) item.additives = details.additives;

        updatedCount++;
      }
    } catch(e) {}

    await delay(300);

    if ((i + 1) % 40 === 0 || i === total - 1) {
      console.log(`Progress: ${i + 1} / ${total} (${Math.round((i + 1) / total * 100)}%) - Newly Updated: ${updatedCount}`);
      fs.writeFileSync(DATA_FILE, JSON.stringify(dataObj));
      fs.writeFileSync(DATA_JS_FILE, 'window.__KAMPO_DATA__ = ' + JSON.stringify(dataObj) + ';');
    }
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(dataObj));
  fs.writeFileSync(DATA_JS_FILE, 'window.__KAMPO_DATA__ = ' + JSON.stringify(dataObj) + ';');
  console.log(`Enrich complete! Total newly updated: ${updatedCount}`);
}

runEnrich().catch(console.error);
