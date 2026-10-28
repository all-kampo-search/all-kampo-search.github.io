const fs = require('fs');
const cheerio = require('cheerio');
const {
    BASE_URL,
    xA, q0, L0, U0, Q0,
    delay
} = require('./fetch_helpers.js');

const NIKKANKYO_ADDITIONAL_COMPANIES = [
    { id: 'zaiseido', name: '剤盛堂薬品(ホノミ)', query: '剤盛堂薬品' },
    { id: 'kyushin', name: '救心製薬', query: '救心製薬' },
    { id: 'tochimoto', name: '栃本天海堂', query: '栃本天海堂' },
    { id: 'yatsume', name: '八ッ目製薬', query: '八ッ目製薬' },
    { id: 'sakamoto', name: '阪本漢法製薬', query: '阪本漢法製薬' },
    { id: 'sugihara', name: '杉原達二商店', query: '杉原達二商店' }
];

async function fetchAdditional() {
    console.log("Fetching additional Nikkankyo companies from KEGG...");
    const items = [];

    for (const comp of NIKKANKYO_ADDITIONAL_COMPANIES) {
        console.log(`Fetching: ${comp.name}...`);
        
        // 1. Med
        let page = 1;
        while (true) {
            const url = `${BASE_URL}/medicus-bin/search_drug?search_keyword=${encodeURIComponent(comp.query)}&page=${page}`;
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
                    
                    const isKampo = efficacyType.includes("漢方") || 
                                    efficacyType.includes("生薬") ||
                                    /湯|散|丸|飲|煎|膏|平胃|三黄|二陳|四君子|六君子|十全|柴苓|五苓/.test(subRaw) ||
                                    /湯|散|丸|飲|煎|膏/.test(rawName);
                    if (!isKampo) return;
                    
                    const subCategory = L0(subRaw);
                    const name = U0(rawName);
                    const sortKey = Q0(name);
                    const subCategorySortKey = Q0(subCategory);
                    
                    items.push({
                        name, rawName, url: link, type: "medical",
                        company: comp.id, companyName: comp.name,
                        formulaNo: null, otcCategory: null,
                        subCategory, sortKey, subCategorySortKey,
                        efficacy: " ", usage: "", ingredients: [], components: [], additives: []
                    });
                    found++;
                });
                const hasNext = $("a").toArray().some(a => $(a).text().trim() === "次へ");
                if (found === 0 || !hasNext) break;
                page++;
                await delay(400);
            } catch(e) {
                break;
            }
        }

        // 2. OTC
        page = 1;
        while (true) {
            const url = `${BASE_URL}/medicus-bin/search_drug?display=otc&search_keyword=${encodeURIComponent(comp.query)}&page=${page}`;
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
                    const subRaw = $(tds[2]).text().trim();
                    
                    const isKampo = /湯|散|丸|飲|煎|膏|平胃|三黄|二陳|四君子|六君子|十全|柴苓|五苓|生薬|漢方/.test(subRaw) ||
                                    /湯|散|丸|飲|煎|膏|エキス|漢方|心|胃/.test(rawName);
                    if (!isKampo) return;
                    
                    const subCategory = L0(subRaw);
                    const name = U0(rawName);
                    const sortKey = Q0(name);
                    const subCategorySortKey = Q0(subCategory);
                    
                    items.push({
                        name, rawName, url: link, type: "otc",
                        company: comp.id, companyName: comp.name,
                        formulaNo: null, otcCategory: "otc",
                        subCategory, sortKey, subCategorySortKey,
                        efficacy: " ", usage: "", ingredients: [], components: [], additives: []
                    });
                    found++;
                });
                const hasNext = $("a").toArray().some(a => $(a).text().trim() === "次へ");
                if (found === 0 || !hasNext) break;
                page++;
                await delay(400);
            } catch(e) {
                break;
            }
        }
    }

    const path = require('path');
    const outFile = path.join(__dirname, 'nikkankyo_additional.json');
    fs.writeFileSync(outFile, JSON.stringify(items, null, 2));
    console.log(`Saved ${items.length} additional Nikkankyo products!`);
}

fetchAdditional().catch(console.error);
