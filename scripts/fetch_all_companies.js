const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const {
    BASE_URL,
    COMPANIES,
    detailsCache,
    saveCache,
    xA, q0, L0, U0, Q0,
    fetchDetails,
    delay
} = require('./fetch_helpers.js');

// ツムラ処方番号対応表 (代表的標準138処方)
const TSUMURA_NUMBERS = {
    "葛根湯": 1, "葛根湯加川芎辛夷": 2, "乙字湯": 3, "安中散": 5, "十味敗毒湯": 6,
    "八味地黄丸": 7, "大柴胡湯": 8, "小柴胡湯": 9, "柴胡桂枝湯": 10, "柴胡桂枝乾姜湯": 11,
    "柴胡加竜骨牡蛎湯": 12, "半夏瀉心湯": 14, "黄連解毒湯": 15, "半夏厚朴湯": 16, "五苓散": 17,
    "桂枝加朮附湯": 18, "小青竜湯": 19, "防已黄耆湯": 20, "小半夏加茯苓湯": 21, "消風散": 22,
    "当帰湯": 23, "加味逍遙散": 24, "桂枝茯苓丸": 25, "桂枝加竜骨牡蛎湯": 26, "麻黄湯": 27,
    "越婢加朮湯": 28, "麦門冬湯": 29, "真武湯": 30, "呉茱萸湯": 31, "人参湯": 32,
    "大黄牡丹皮湯": 33, "白虎加人参湯": 34, "四逆散": 35, "木防已湯": 36, "半夏白朮天麻湯": 37,
    "当帰四逆加呉茱萸生姜湯": 38, "苓桂朮甘湯": 39, "猪苓湯": 40, "補中益気湯": 41, "大建中湯": 100,
    "小建中湯": 99, "六君子湯": 43, "当帰芍薬散": 23, "十全大補湯": 48, "牛車腎気丸": 107,
    "芍薬甘草湯": 68, "抑肝散": 54, "抑肝散加陳皮半夏": 83, "清上防風湯": 58, "治打撲一方": 89,
    "排膿散及湯": 122, "神秘湯": 85, "柴苓湯": 114, "胃苓湯": 115, "茵蔯蒿湯": 135,
    "麻子仁丸": 126, "潤腸湯": 51, "五積散": 63, "防風通聖散": 62, "炙甘草湯": 64,
    "辛夷清肺湯": 104, "清肺湯": 90, "滋陰降火湯": 93, "滋陰至宝湯": 92, "竹茹温胆湯": 91
};

async function fetchCompanyItems(company) {
    console.log(`\n========================================`);
    console.log(`Fetching items for: ${company.name} (${company.id})`);
    console.log(`========================================`);
    
    const items = [];
    
    // 1. Fetch Medical
    let page = 1;
    while (true) {
        const url = `${BASE_URL}/medicus-bin/search_drug?search_keyword=${encodeURIComponent(company.query)}&page=${page}`;
        try {
            const res = await fetch(url);
            const html = await res.text();
            const $ = cheerio.load(html);
            let found = 0;
            
            $("table.list1 tr").each((_, tr) => {
                const tds = $(tr).find("td");
                if (tds.length === 0) return;
                
                const a = $(tds[0]).find("a");
                if (!a.length) return;
                const link = a.attr("href").replace(/^\//, "");
                const rawName = a.text().trim();
                const subRaw = $(tds[1]).text().trim();
                const efficacyType = $(tds[2]).text().trim();
                
                // Filter: must be 漢方製剤 or 生薬 or have 漢方 formula name
                const isKampo = efficacyType.includes("漢方") || 
                                efficacyType.includes("生薬") ||
                                /湯|散|丸|飲|煎|膏|平胃|三黄|二陳|四君子|六君子|十全|柴苓|五苓/.test(subRaw) ||
                                /湯|散|丸|飲|煎|膏/.test(rawName);
                                
                if (!isKampo) return;
                
                const subCategory = L0(subRaw);
                const name = U0(rawName);
                const sortKey = Q0(name);
                const subCategorySortKey = Q0(subCategory);
                
                // Formula No. detection (e.g. ツムラ41, ツムラ葛根湯エキス顆粒)
                let formulaNo = null;
                const noMatch = rawName.match(/(\d+)/);
                if (company.id === 'tsumura') {
                    if (TSUMURA_NUMBERS[subCategory]) {
                        formulaNo = TSUMURA_NUMBERS[subCategory];
                    } else if (noMatch) {
                        formulaNo = parseInt(noMatch[1]);
                    }
                } else if (noMatch) {
                    formulaNo = parseInt(noMatch[1]);
                }
                
                items.push({
                    name,
                    rawName,
                    url: link,
                    type: "medical",
                    company: company.id,
                    companyName: company.name,
                    brandColor: company.brandColor,
                    formulaNo: formulaNo ? String(formulaNo) : null,
                    otcCategory: null,
                    subCategory,
                    sortKey,
                    subCategorySortKey
                });
                found++;
            });
            
            const hasNext = $("a").toArray().some(a => $(a).text().trim() === "次へ");
            if (found === 0 || !hasNext) break;
            page++;
            await delay(400);
        } catch (e) {
            console.error(`Error fetching medical page ${page} for ${company.name}:`, e.message);
            break;
        }
    }
    
    // 2. Fetch OTC
    page = 1;
    while (true) {
        const url = `${BASE_URL}/medicus-bin/search_drug?display=otc&search_keyword=${encodeURIComponent(company.query)}&page=${page}`;
        try {
            const res = await fetch(url);
            const html = await res.text();
            const $ = cheerio.load(html);
            let found = 0;
            
            $("table.list1 tr").each((_, tr) => {
                const tds = $(tr).find("td");
                if (tds.length === 0) return;
                
                const a = $(tds[0]).find("a");
                if (!a.length) return;
                const link = a.attr("href").replace(/^\//, "");
                const rawName = a.text().trim();
                const subRaw = $(tds[2]).text().trim(); // In OTC, tds[2] is 薬効(処方名)
                
                // Filter: must be Kampo-related
                const isKampo = /湯|散|丸|飲|煎|膏|平胃|三黄|二陳|四君子|六君子|十全|柴苓|五苓|生薬|漢方/.test(subRaw) ||
                                /湯|散|丸|飲|煎|膏|エキス|漢方/.test(rawName);
                if (!isKampo) return;
                
                const subCategory = L0(subRaw);
                const name = U0(rawName);
                const sortKey = Q0(name);
                const subCategorySortKey = Q0(subCategory);
                
                let formulaNo = null;
                const noMatch = rawName.match(/(\d+)/);
                if (noMatch) formulaNo = parseInt(noMatch[1]);
                
                items.push({
                    name,
                    rawName,
                    url: link,
                    type: "otc",
                    company: company.id,
                    companyName: company.name,
                    brandColor: company.brandColor,
                    formulaNo: formulaNo ? String(formulaNo) : null,
                    otcCategory: "otc",
                    subCategory,
                    sortKey,
                    subCategorySortKey
                });
                found++;
            });
            
            const hasNext = $("a").toArray().some(a => $(a).text().trim() === "次へ");
            if (found === 0 || !hasNext) break;
            page++;
            await delay(400);
        } catch (e) {
            console.error(`Error fetching OTC page ${page} for ${company.name}:`, e.message);
            break;
        }
    }
    
    console.log(`Found ${items.length} items for ${company.name}.`);
    return items;
}

// Concurrency helper
async function fetchDetailsInBatches(items, concurrency = 4) {
    let completed = 0;
    const total = items.length;
    
    for (let i = 0; i < items.length; i += concurrency) {
        const chunk = items.slice(i, i + concurrency);
        await Promise.all(chunk.map(async (item) => {
            const cacheKey = `${item.url}_${item.type}`;
            if (detailsCache[cacheKey]) {
                Object.assign(item, detailsCache[cacheKey]);
            } else {
                try {
                    const details = await fetchDetails(item.url, item.type);
                    Object.assign(item, details);
                    detailsCache[cacheKey] = details;
                } catch (e) {
                    console.error(`Failed ${item.url}:`, e.message);
                }
                await delay(200);
            }
            if (!item.efficacy) item.efficacy = " ";
            
            // Ingredients sort
            if (Array.isArray(item.ingredients)) {
                item.ingredients.sort((o, f) => {
                    if (o.isExtract && !f.isExtract) return -1;
                    if (!o.isExtract && f.isExtract) return 1;
                    if (f.amount !== o.amount) return (f.amount || 0) - (o.amount || 0);
                    return (o.name || "").localeCompare(f.name || "", "ja");
                });
                item.components = item.ingredients;
            }
            completed++;
        }));
        
        if (completed % 20 === 0 || completed === total) {
            console.log(`Details progress: ${completed} / ${total} (${Math.round(completed / total * 100)}%)`);
            saveCache();
        }
    }
}

async function main() {
    console.log("=== 全漢方製薬会社 医薬品データ収集開始 ===");
    
    let allItems = [];
    
    // 1. Load Kotaro existing items from original data.json
    const kotaroOrigPath = path.join(__dirname, '../../小太郎医薬品検索 - web/data.json');
    if (fs.existsSync(kotaroOrigPath)) {
        try {
            const orig = JSON.parse(fs.readFileSync(kotaroOrigPath, 'utf8'));
            const kotaroItems = (orig.data || orig).map(it => {
                return {
                    ...it,
                    company: 'kotaro',
                    companyName: '小太郎漢方製薬',
                    brandColor: '#1b6840',
                    formulaNo: it.rawName.match(/N\s*(\d+)/i) ? it.rawName.match(/N\s*(\d+)/i)[1] : null
                };
            });
            console.log(`Loaded ${kotaroItems.length} items from existing Kotaro data.`);
            allItems = allItems.concat(kotaroItems);
        } catch (e) {
            console.error("Error loading Kotaro data:", e.message);
        }
    }
    
    // 2. Fetch other companies (excluding kotaro which is already loaded, and 一元製薬 which is closed)
    const targetCompanies = COMPANIES.filter(c => c.id !== 'kotaro');
    
    for (const comp of targetCompanies) {
        const compItems = await fetchCompanyItems(comp);
        allItems = allItems.concat(compItems);
    }
    
    // Remove duplicates based on URL
    const seenUrls = new Set();
    const uniqueItems = [];
    for (const item of allItems) {
        const uid = `${item.company}_${item.url}`;
        if (!seenUrls.has(uid)) {
            seenUrls.add(uid);
            uniqueItems.push(item);
        }
    }
    console.log(`\nTotal unique items across all companies: ${uniqueItems.length}`);
    
    // 3. Fetch details for items needing them
    const itemsNeedingDetails = uniqueItems.filter(it => !it.ingredients || it.ingredients.length === 0);
    console.log(`Items needing details fetch: ${itemsNeedingDetails.length}`);
    
    if (itemsNeedingDetails.length > 0) {
        await fetchDetailsInBatches(itemsNeedingDetails, 4);
    }
    
    // Sort all items
    uniqueItems.sort((a, b) => {
        // Sort by company priority (Tsumura, Kracie, Kotaro first), then sortKey
        const compOrder = { tsumura: 1, kracie: 2, kotaro: 3, osugi: 4, sanwa: 5, honzo: 6, matsuura: 7, uchida: 8, jps: 9, taikoseido: 10, tatebayashi: 11 };
        const orderA = compOrder[a.company] || 99;
        const orderB = compOrder[b.company] || 99;
        if (orderA !== orderB) return orderA - orderB;
        return (a.sortKey || "").localeCompare(b.sortKey || "", "ja");
    });
    
    const finalData = {
        companies: COMPANIES,
        data: uniqueItems,
        totalCount: uniqueItems.length,
        lastUpdated: new Date().toISOString()
    };
    
    const outPath = path.join(__dirname, '../data.json');
    fs.writeFileSync(outPath, JSON.stringify(finalData));
    console.log(`\nSuccessfully wrote ${uniqueItems.length} items to ${outPath}`);
    saveCache();
}

main().catch(console.error);
