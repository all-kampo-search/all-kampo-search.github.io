const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const B0 = require('./B0.js');

const Si = "https://www.kegg.jp";

function xA(n) {
    return n.replace(/[Ａ-Ｚａ-ｚ０-９]/g, r => String.fromCharCode(r.charCodeAt(0) - 65248))
            .replace(/[－―]/g, "-")
            .replace(/[〜～]/g, "~")
            .replace(/「.*?」/g, "")
            .replace(/『.*?』/g, "")
            .replace(/【.*?】/g, "")
            .replace(/（.*?）/g, "")
            .replace(/\(.*?\)/g, "")
            .replace(/[）)]/g, "")
            .replace(/®/g, "")
            .replace(/エキス/g, "")
            .replace(/顆粒/g, "")
            .replace(/細粒/g, "")
            .replace(/カプセル/g, "")
            .replace(/錠/g, "")
            .replace(/水製/g, "")
            .replace(/分包/g, "")
            .replace(/N$/i, "n")
            .replace(/S$/i, "s")
            .replace(/G$/i, "g")
            .replace(/V$/i, "v")
            .replace(/P$/i, "p")
            .replace(/コタロー/g, "")
            .replace(/小太郎/g, "")
            .replace(/漢方/g, "")
            .replace(/製薬/g, "")
            .replace(/株式会社/g, "")
            .replace(/株/g, "")
            .replace(/　/g, "")
            .replace(/ /g, "")
            .trim()
            .toLowerCase();
}

async function fetchKotaroBadges() {
    console.log("Fetching Kotaro official badge list...");
    const res = await fetch('https://www.kotaro.co.jp/iryou/product_list/');
    const html = await res.text();
    const $ = cheerio.load(html);
    const map = {};
    $('tr').each((_, tr) => {
        const tds = $(tr).find('td');
        if (tds.length > 0) {
            const name = $(tds[1]).text().trim() || $(tds[0]).text().trim();
            let cat = 'other';
            $(tds[0]).find('img').each((_, img) => {
                const src = $(img).attr('src');
                if (src) {
                    if (src.includes('product_cat_coop.gif')) cat = 'kyoryokukai';
                    else if (src.includes('product_cat_club.gif')) cat = 'sajikurabu';
                    else if (src.includes('product_cat_visual.gif')) cat = 'visual';
                }
            });
            if (cat !== 'other') {
                const key = U0(xA(name));
                if (key === "ヨクイニンs") cat = "kyoryokukai";
                map[key] = cat;
            }
        }
    });
    return map;
}

function q0(n) {
    const r = [
        [/川きゅう/g, "川芎"], [/かっ香正気散/g, "藿香正気散"], [/かっ香/g, "藿香"], [/きゅう帰調血飲/g, "芎帰調血飲"],
        [/きゅう帰膠艾湯/g, "芎帰膠艾湯"], [/きゅう帰/g, "芎帰"], [/よく苡仁湯/g, "薏苡仁湯"], [/よく苡仁/g, "薏苡仁"],
        [/黄ごん/g, "黄芩"], [/茵ちん五苓散/g, "茵陳五苓散"], [/茵ちん/g, "茵陳"], [/清上けん痛湯/g, "清上蠲痛湯"],
        [/麻杏よく甘湯/g, "麻杏薏甘湯"], [/葛根黄連黄ごん湯/g, "葛根黄連黄芩湯"], [/三物黄ごん湯/g, "三物黄芩湯"],
        [/黄ごん湯/g, "黄芩湯"], [/いんちんごれいさん/g, "茵蔯五苓散"], [/おうれんげどくとう/g, "黄連解毒湯"],
        [/しんぶとう/g, "真武湯"], [/ごれいさん/g, "五苓散"], [/はんげしゃしんとう/g, "半夏瀉心湯"],
        [/りょうけいじゅつかんとう/g, "苓桂朮甘湯"], [/ろくみがん/g, "六味丸"], [/はちみがん/g, "八味丸"],
        [/ごしゃじんきがん/g, "牛車腎気丸"], [/だいさいことう/g, "大柴胡湯"], [/しょうさいことう/g, "小柴胡湯"],
        [/さいこけいしかんきょうとう/g, "柴胡桂枝乾姜湯"], [/さいこけいしとう/g, "柴胡桂枝湯"], [/さいこせいかんとう/g, "柴胡清肝湯"],
        [/しょうせいりゅうとう/g, "小青竜湯"], [/だいけんちゅうとう/g, "大建中湯"], [/しょうけんちゅうとう/g, "小建中湯"],
        [/とうきしゃくやくさん/g, "当帰芍薬散"], [/かみしょうようさん/g, "加味逍遙散"], [/けいしかりゅうこつぼれいとう/g, "桂枝加竜骨牡蛎湯"],
        [/さいこかりゅうこつぼれいとう/g, "柴胡加竜骨牡蛎湯"], [/はんげこうぼくとう/g, "半夏厚朴湯"], [/ぶくりょういん/g, "茯苓飲"],
        [/いれいとう/g, "胃苓湯"], [/へいいさん/g, "平胃散"], [/ぼういおうぎとう/g, "防己黄耆湯"], [/ぼうふうつうしょうさん/g, "防風通聖散"],
        [/まおうとう/g, "麻黄湯"], [/かっこんとう/g, "葛根湯"], [/ばくもんどうとう/g, "麦門冬湯"], [/ききょうとう/g, "桔梗湯"]
    ];
    let l = n;
    for (const [s, o] of r) l = l.replace(s, o);
    return l;
}

function L0(n) {
    let r = n.replace(/[（(].*/g, "").replace(/\s+/g, " ").trim();
    return r = q0(r), r;
}

function U0(n) {
    let r = n.replace(/[（(].*/g, "").replace(/\s+/g, " ").trim();
    return r = q0(r), r;
}

function Q0(n) {
    let r = n, l = "", s = r;
    while (s.length > 0) {
        let o = false;
        for (const [f, d] of B0) {
            const h = s.match(f);
            if (h && h.index === 0) {
                l += d;
                s = s.slice(h[0].length);
                o = true;
                break;
            }
        }
        if (!o) {
            l += s[0];
            s = s.slice(1);
        }
    }
    return l.replace(/[ァ-ン]/g, o => String.fromCharCode(o.charCodeAt(0) - 96)).toLowerCase();
}

function extractTextWithNewlines($, el) {
    const clone = $(el).clone();
    clone.find('br').replaceWith('\n');
    clone.find('tr, p, div, li, h1, h2, h3, h4, h5').each((_, block) => { $(block).prepend('\n'); });
    clone.find('td, th').each((_, cell) => { $(cell).append(' \n'); });
    return clone.text().replace(/\n\s*\n+/g, '\n\n').trim();
}

function Y0(el, $) {
    let text = "";
    let curr = $(el).next();
    while (curr.length && !curr.is("h1, h2, h3, h4")) {
        text += extractTextWithNewlines($, curr) + "\n\n";
        curr = curr.next();
    }
    return text.replace(/\n{3,}/g, '\n\n').trim();
}

function V0(el, $) {
    return $(el).text().trim().split(/\s*,\s*|\s*、\s*|\s+/).filter(Boolean);
}

function qo(n) {
    return n.replace(/\s+/g, "").replace(/[Ａ-Ｚａ-ｚ０-９]/g, r => String.fromCharCode(r.charCodeAt(0) - 65248));
}

function _A(table, $) {
    const r = [];
    $(table).find("tr").each((_, tr) => {
        const tds = $(tr).find("td");
        if (tds.length !== 2) return;
        const f = $(tds[0]).text().trim();
        const d = $(tds[1]).text().trim();
        let h = qo(f);
        if (!h) return;
        const m = d.match(/([\d.]+)\s*(g|mL|mg)/);
        if (!m) return;
        const p = parseFloat(m[1]);
        const v = m[2];
        if (isNaN(p) || p <= 0) return;
        
        let amountStr = "";
        if (v === "mg") amountStr = `${m[1]}mg`;
        else if (v === "mL") amountStr = `${m[1]}mL`;
        else amountStr = `${m[1]}g`;
        
        const isExtract = h.includes("エキス") || h.includes("水製");
        h = h.replace(/[（(].*/g, "").trim();
        r.push({ name: h, amount: p, amountStr, isExtract });
    });
    return r;
}

function Ey(n) {
    const r = [];
    let l = n.replace(/\n/g, " ").replace(/\r/g, "").replace(/\s+/g, " ").trim();
    const s = l.match(/((?:水製乾燥|水製|乾燥)エキス)\s*(\d+\.?\d*)\s*g/) || l.match(/([^　\s,、。]*エキス)\s*(\d+\.?\d*)\s*g/);
    if (s) {
        let d = s[1].replace(/^日局/, "").trim();
        d = d.replace(/^.*?((?:水製乾燥|水製|乾燥)?エキス)$/, "$1");
        if (d && !d.includes("ゼラチン")) {
            d = d.replace(/[（(].*/g, "").trim();
            r.push({ name: d, amount: parseFloat(s[2]), amountStr: `${s[2]}g`, isExtract: true });
        }
    }
    const o = /日局([ァ-ヶー一-龯]+(?:\d+)?(?:（[^）]*）)?)\s+(\d+\.?\d*)\s*g/g;
    let f;
    while ((f = o.exec(l)) !== null) {
        let d = f[1].trim();
        d = d.replace(/[（(].*/g, "").trim();
        r.push({ name: d, amount: parseFloat(f[2]), amountStr: `${f[2]}g`, isExtract: false });
    }
    if (r.filter(x => !x.isExtract).length === 0) {
        const d2 = /([ァ-ヶー一-龯]{2,})\s+(\d+\.?\d*)\s*g/g;
        let f2;
        while ((f2 = d2.exec(l)) !== null) {
            let d3 = f2[1].trim();
            if (d3 !== "水製エキス" && d3 !== "乾燥エキス" && !d3.includes("ゼラチン")) {
                d3 = d3.replace(/[（(].*/g, "").trim();
                r.push({ name: d3, amount: parseFloat(f2[2]), amountStr: `${f2[2]}g`, isExtract: false });
            }
        }
    }
    return r;
}

function zA(table, $) {
    const r = [];
    $(table).find("tr").each((_, tr) => {
        const text = $(tr).text().trim();
        if (/成分/.test(text) || /分量/.test(text) || /内訳/.test(text)) return;
        const tds = $(tr).find("td");
        if (tds.length === 2) {
            let name = $(tds[0]).text().replace(/^日局/, "").trim();
            const amtStr = $(tds[1]).text().trim();
            const m = amtStr.match(/([\d.]+)\s*g/);
            if (name && m) {
                const amount = parseFloat(m[1]);
                const isExtract = name.includes("エキス") || name.includes("水製");
                name = name.replace(/[（(].*/g, "").trim();
                r.push({ name, amount, amountStr: `${m[1]}g`, isExtract });
            }
        }
    });
    return r;
}

async function fetchDetails(url, type) {
    console.log(`Fetching details for ${url}...`);
    const l = `${Si}/medicus-bin/${url}`;
    const res = await fetch(l);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const r = {
        type, efficacy: "", feature: "",
        ingredients: [], components: [], additives: [], dailyDose: "",
        usage: "", precautions: "", usageNotes: ""
    };

    if (type === "medical") {
        $("h3, h4").each((_, h) => {
            const m = $(h).text().trim();
            const p = Y0(h, $);
            if (/効能|効果/.test(m) && !/禁忌/.test(m) && !r.efficacy) r.efficacy = p;
            else if (/用法.*用量|用量.*用法/.test(m) && !r.usage) {
                r.usage = p;
                const v = p.match(/1日\s*([\d.]+\s*g)/);
                if (v && !r.dailyDose) r.dailyDose = v[1];
            } else if (/禁忌|使用上の注意|重要な基本的注意|特定の背景を有する患者に関する注意|相互作用|副作用|その他の注意/.test(m)) {
                const title = m.replace(/^\d+\.?\s*/, '').trim();
                r.precautions = r.precautions ? r.precautions + '\n\n【' + title + '】\n' + p : '【' + title + '】\n' + p;
            }
            else if (/用法に関する注意/.test(m) && !r.usageNotes) r.usageNotes = p;
        });
        
        const d = url.match(/japic_code=(\d+)/);
        if (d) {
            const h = `${Si}/medicus-bin/japic_med_product?id=${d[1]}`;
            try {
                const m2 = await fetch(h);
                const html2 = await m2.text();
                const $2 = cheerio.load(html2);
                $2("td.title, td").each((_, s) => {
                    const o = $2(s).text().trim();
                    const f = $2(s).next();
                    if (f.length) {
                        if (/^成分/.test(o) || o === "有効成分") {
                            const dm = o.match(/[（(]([^）)]+)[）)]/);
                            if (dm) r.dailyDose = dm[1].replace(/中$/, "");
                            const ht = f.find("table");
                            if (ht.length) {
                                r.ingredients = zA(ht, $2);
                            } else {
                                r.ingredients = Ey(f.text() || "");
                            }
                        } else if (o === "添加剤" || o === "添加物") {
                            r.additives = V0(f, $2);
                        }
                    }
                });
                
                if (r.ingredients.length === 0) {
                    $2("table").each((_, o) => {
                        $2(o).find("tr").each((_, tr) => {
                            const th = $2(tr).find("th").text().trim();
                            const td = $2(tr).find("td");
                            if (th === "有効成分") {
                                r.ingredients = Ey(td.text() || "");
                            }
                        });
                    });
                }
            } catch (err) {
                console.warn(`Failed to fetch japic_med_product for ${url}`);
            }
        }
        return r;
    }
    
    // OTC Details logic
    $("td.title").each((_, m) => {
        const p = $(m).text().trim();
        const v = $(m).next();
        if (v.length) {
            if (/^成分/.test(p)) {
                const y = p.match(/[（(](.*)[）)]/);
                if (y) r.dailyDose = y[1].replace(/中$/, "");
            } else if (p === "添加物") {
                r.additives = V0(v, $);
            }
        }
    });

    const tables = $("table");
    tables.each((_, p) => {
        const v = $(p).find("tr");
        if (v.length < 2) return;
        const x = $(v[0]).find("td");
        if (x.length === 2) {
            const w = $(x[0]).text().trim();
            const O = $(x[1]).text().trim();
            if (/エキス|[ァ-ヶ]/.test(w) && /\d+\.?\d*(g|mL|mg)/.test(O)) {
                r.ingredients = _A(p, $);
                return false;
            }
        }
    });

    $("h3, h4").each((_, m) => {
        const p = $(m).text().trim();
        const v = Y0(m, $);
        if (/効果[・･]効能|効能[・･]効果/.test(p)) r.efficacy = v;
        else if (p === "特徴") r.feature = v;
        else if (/使用上の注意/.test(p) && !r.precautions) r.precautions = v;
        else if (/用法[・･]用量|用量[・･]用法/.test(p)) r.usage = v;
        else if (/用法に関する注意/.test(p)) r.usageNotes = v;
    });

    Object.keys(r).forEach(k => {
        if (typeof r[k] === 'string') {
            r[k] = r[k].replace(/，/g, '、');
        } else if (Array.isArray(r[k])) {
            r[k] = r[k].map(s => typeof s === 'string' ? s.replace(/，/g, '、') : s);
        }
    });
    return r;
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
    const badgeMap = await fetchKotaroBadges();
    console.log("Starting KEGG scrape...");
    const allItems = [];
    
    // Fetch Medical
    let page = 1;
    while (true) {
        console.log(`Fetching medical page ${page}...`);
        const url = `${Si}/medicus-bin/search_drug?search_keyword=%e5%b0%8f%e5%a4%aa%e9%83%8e%e6%bc%a2%e6%96%b9%e8%a3%bd%e8%96%ac&page=${page}`;
        const res = await fetch(url);
        const html = await res.text();
        const $ = cheerio.load(html);
        
        let found = 0;
        $("table.list1 tr").each((_, tr) => {
            const tds = $(tr).find("td");
            if (tds.length === 0) return;
            const a = $(tds[0]).find("a");
            if (!a.length) return;
            const w = a.attr("href").replace(/^\//, "");
            const x = a.text().trim();
            const O = $(tds[1]).text().trim();
            const C = L0(O);
            const N = U0(x); // Keep original display name with Kanji conversion!
            const sortKey = Q0(N); // Convert Kanji to Hiragana for perfect Gojuon sorting
            const subCategorySortKey = Q0(C);
            allItems.push({ name: N, rawName: x, url: w, type: "medical", otcCategory: null, subCategory: C, sortKey: sortKey, subCategorySortKey: subCategorySortKey });
            found++;
        });
        
        const hasNext = $("a").toArray().some(a => $(a).text().trim() === "次へ");
        if (found === 0 || !hasNext) break;
        page++;
        await delay(1000);
    }

    // Fetch OTC
    page = 1;
    while (true) {
        console.log(`Fetching OTC page ${page}...`);
        const url = `${Si}/medicus-bin/search_drug?display=otc&search_keyword=%e5%b0%8f%e5%a4%aa%e9%83%8e%e6%bc%a2%e6%96%b9%e8%a3%bd%e8%96%ac&page=${page}`;
        const res = await fetch(url);
        const html = await res.text();
        const $ = cheerio.load(html);
        
        let found = 0;
        $("table.list1 tr").each((_, tr) => {
            const tds = $(tr).find("td");
            if (tds.length === 0) return;
            const a = $(tds[0]).find("a");
            if (!a.length) return;
            const w = a.attr("href").replace(/^\//, "");
            const x = a.text().trim();
            const O = $(tds[2]).text().trim();
            const C = L0(O);
            const N = U0(x); // Keep original display name with Kanji conversion!
            const sortKey = Q0(N); // Convert Kanji to Hiragana for perfect Gojuon sorting
            const subCategorySortKey = Q0(C);
            
            // Match badge using fully converted Kanji names to absorb KEGG/Kotaro differences
            const matchKey = U0(xA(x));
            let B = badgeMap[matchKey] || "other";
            
            if (matchKey.includes("茵陳五苓散")) B = "sajikurabu";
            if (matchKey.includes("隆持源")) B = "kyoryokukai";
            if (matchKey.includes("ネオカキックス")) B = "visual";
            if (matchKey.includes("虔修六神丸")) B = "visual";
            
            allItems.push({ name: N, rawName: x, url: w, type: "otc", otcCategory: B, subCategory: C, sortKey: sortKey, subCategorySortKey: subCategorySortKey });
            
            if (matchKey === "ヨクイニンs") {
                allItems.push({ name: N + '\u200B', rawName: x + '\u200B', url: w + '&b=visual', type: "otc", otcCategory: "visual", subCategory: C, sortKey: sortKey, subCategorySortKey: subCategorySortKey });
            } else if (matchKey.includes("疎経活血湯")) {
                allItems.push({ name: N + '\u200B', rawName: x + '\u200B', url: w + '&b=saji', type: "otc", otcCategory: "sajikurabu", subCategory: C, sortKey: sortKey, subCategorySortKey: subCategorySortKey });
            }
            found++;
        });
        
        const hasNext = $("a").toArray().some(a => $(a).text().trim() === "次へ");
        if (found === 0 || !hasNext) break;
        page++;
        await delay(1000);
    }
    
    console.log(`Found ${allItems.length} total items. Fetching details...`);
    
    for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        try {
            const details = await fetchDetails(item.url, item.type);
            Object.assign(item, details); if (!item.efficacy) item.efficacy = " ";
            
            // Pre-sort ingredients by amount descending, extract first, to guarantee sorting even if frontend fails
            item.ingredients.sort((o, f) => {
                if (o.isExtract && !f.isExtract) return -1;
                if (!o.isExtract && f.isExtract) return 1;
                if (f.amount !== o.amount) return f.amount - o.amount;
                return o.name.localeCompare(f.name, "ja");
            });
            item.components = item.ingredients;
        } catch (e) {
            console.error(`Failed to fetch details for ${item.url}:`, e);
        }
        await delay(1000); // 1 sec delay to avoid IP block
    }
    // 既存の全社データを保護して安全にマージ
    let mergedData = allItems;
    const dataPath = path.join(__dirname, '../data.json');
    if (fs.existsSync(dataPath)) {
        try {
            const rawOrig = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            const origList = Array.isArray(rawOrig) ? rawOrig : (rawOrig.data || []);
            const nonKotaroItems = origList.filter(it => it.company && it.company !== 'kotaro');
            if (nonKotaroItems.length > 0) {
                allItems.forEach(it => { if (!it.company) it.company = 'kotaro'; });
                mergedData = [...nonKotaroItems, ...allItems];
            }
        } catch (e) {
            console.error("Warning: failed to read original data.json for merging", e);
        }
    }

    // Sort by sortKey
    mergedData.sort((a, b) => (a.sortKey || a.name || '').localeCompare(b.sortKey || b.name || '', "ja"));
    
    const finalData = {
        data: mergedData,
        changes: { added: [], deleted: [], lastUpdated: new Date().toISOString() }
    };
    
    fs.writeFileSync(dataPath, JSON.stringify(finalData));
    console.log("Successfully generated data.json!");
}

main().catch(console.error);
