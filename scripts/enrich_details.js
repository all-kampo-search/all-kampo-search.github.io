const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BASE_URL = "https://www.kegg.jp";
const DATA_FILE = path.join(__dirname, '../data.json');
const CACHE_FILE = path.join(__dirname, 'cache_details.json');

const delay = ms => new Promise(r => setTimeout(r, ms));

let cache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch(e) {}
}

// Clean up empty cache entries
let cleanedCount = 0;
for (const [k, v] of Object.entries(cache)) {
    if (!v.efficacy && (!v.ingredients || v.ingredients.length === 0)) {
        delete cache[k];
        cleanedCount++;
    }
}
console.log(`Cleaned ${cleanedCount} empty entries from cache. Valid remaining: ${Object.keys(cache).length}`);

function parseText($, el) {
    if (!el || !el.length) return "";
    const clone = el.clone();
    clone.find('br').replaceWith('\n');
    clone.find('tr, p, div, li, h1, h2, h3, h4, h5').each((_, b) => { $(b).prepend('\n'); });
    clone.find('td, th').each((_, c) => { $(c).append(' \n'); });
    return clone.text().replace(/\n\s*\n+/g, '\n\n').trim();
}

function parseIngredientsFromText(text) {
    const list = [];
    const clean = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    
    // Extract
    const extMatch = clean.match(/((?:乾燥|水製|軟)?エキス)\s*([\d.]+)\s*g/i) || clean.match(/エキス\s*([\d.]+)\s*g/i);
    if (extMatch) {
        list.push({
            name: extMatch[1] || '乾燥エキス',
            amount: parseFloat(extMatch[2] || extMatch[1]),
            amountStr: `${extMatch[2] || extMatch[1]}g`,
            isExtract: true
        });
    }

    // Herbs
    const herbRegex = /(?:日局|局)?([ァ-ヶー一-龯]{2,}(?:（[^）]*）)?)\s*([\d.]+)\s*(g|mg|mL)/g;
    let m;
    while ((m = herbRegex.exec(clean)) !== null) {
        let name = m[1].replace(/^日局/, '').replace(/[（(].*?[）)]/g, '').trim();
        if (name !== 'エキス' && name !== '乾燥エキス' && !name.includes('ゼラチン') && !name.includes('ステアリン酸')) {
            const amt = parseFloat(m[2]);
            const unit = m[3];
            list.push({
                name,
                amount: amt,
                amountStr: `${m[2]}${unit}`,
                isExtract: false
            });
        }
    }
    return list;
}

async function fetchOneDetail(url, type) {
    const fullUrl = `${BASE_URL}/medicus-bin/${url}`;
    const res = await fetch(fullUrl);
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    const result = {
        type, efficacy: "", feature: "",
        ingredients: [], components: [], additives: [], dailyDose: "",
        usage: "", precautions: "", usageNotes: ""
    };

    if (type === 'medical') {
        // Parse Med
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

        // Fetch Japic Med Product for Ingredients
        const jCode = url.match(/japic_code=(\d+)/);
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
                            result.additives = nextTd.text().trim().split(/[\s,、]+/).filter(Boolean);
                        }
                    });
                }
            } catch(e) {}
        }
    } else {
        // OTC
        $("h3, h4").each((_, h) => {
            const heading = $(h).text().trim();
            const nextDiv = $(h).next();
            const text = parseText($, nextDiv);
            if (/効能|効果/.test(heading) && !result.efficacy) result.efficacy = text;
            else if (/用法|用量/.test(heading) && !result.usage) result.usage = text;
            else if (/注意/.test(heading) && !result.precautions) result.precautions = text;
        });

        $("td.title, th").each((_, th) => {
            const title = $(th).text().trim();
            const nextTd = $(th).next();
            if (/成分|分量/.test(title)) {
                const rawText = nextTd.text();
                const doseMatch = rawText.match(/本品\s*([\d.]+\s*g)中/);
                if (doseMatch) result.dailyDose = doseMatch[1];
                result.ingredients = parseIngredientsFromText(rawText);
            } else if (/添加物/.test(title)) {
                result.additives = nextTd.text().trim().split(/[\s,、]+/).filter(Boolean);
            }
        });
    }

    result.components = result.ingredients;
    return result;
}

async function enrichAll() {
    if (!fs.existsSync(DATA_FILE)) {
        console.error("data.json not found!");
        return;
    }

    const dataObj = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const items = dataObj.data;
    console.log(`Loaded ${items.length} items from data.json.`);

    let updatedCount = 0;
    const total = items.length;

    for (let i = 0; i < total; i++) {
        const item = items[i];
        const cacheKey = `${item.url}_${item.type}`;

        if (cache[cacheKey] && (cache[cacheKey].efficacy || (cache[cacheKey].ingredients && cache[cacheKey].ingredients.length > 0))) {
            Object.assign(item, cache[cacheKey]);
            continue;
        }

        // Fetch detail
        try {
            const details = await fetchOneDetail(item.url, item.type);
            if (details && (details.efficacy || details.ingredients.length > 0)) {
                Object.assign(item, details);
                cache[cacheKey] = details;
                updatedCount++;
            }
        } catch(e) {
            console.error(`Error fetching ${item.url}:`, e.message);
        }

        await delay(350); // safe 350ms delay

        if ((i + 1) % 25 === 0 || i === total - 1) {
            console.log(`Progress: ${i + 1} / ${total} (${Math.round((i + 1) / total * 100)}%) - Updated: ${updatedCount}`);
            fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
            fs.writeFileSync(DATA_FILE, JSON.stringify(dataObj));
        }
    }

    console.log(`\nEnrichment complete! Total updated: ${updatedCount}`);
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataObj));
}

enrichAll().catch(console.error);
