const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const B0 = require('./B0.js');

const BASE_URL = "https://www.kegg.jp";
const CACHE_FILE = path.join(__dirname, 'cache_details.json');

// Kanji & text normalizations
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
            .replace(/　/g, "")
            .replace(/ /g, "")
            .trim()
            .toLowerCase();
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
    return q0(r);
}

function U0(n) {
    let r = n.replace(/[（(].*/g, "").replace(/\s+/g, " ").trim();
    return q0(r);
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
    if (!n) return r;
    let l = n.replace(/\r\n/g, " ").replace(/[\r\n]/g, " ").replace(/[\s\u3000]+/g, " ").trim();

    // 1. エキス（水製乾燥エキス、乾燥エキス等、mgまたはg）
    const extMatch = l.match(/((?:水製乾燥|乾燥|水製)?エキス)\s*(\d+(?:\.\d+)?)\s*(mg|g)/i) || 
                     l.match(/([^　\s,、。]*エキス)\s*(\d+(?:\.\d+)?)\s*(mg|g)/i);
    if (extMatch) {
        let name = extMatch[1].replace(/^日局/, "").trim();
        name = name.replace(/^.*?((?:水製乾燥|水製|乾燥)?エキス)$/, "$1");
        if (name && !name.includes("ゼラチン")) {
            name = name.replace(/[（(].*/g, "").trim();
            let amt = parseFloat(extMatch[2]);
            if (extMatch[3].toLowerCase() === 'mg') {
                amt = +(amt / 1000).toFixed(4);
            }
            r.push({ name: name, amount: amt, amountStr: `${amt}g`, isExtract: true });
        }
    }

    // 2. 「日局」が付く生薬（スペースの有無、全角スペース、mg/g対応）
    const o = /日局\s*([ァ-ヶー一-龯]+(?:\d+)?(?:（[^）]*）)?)\s*(\d+(?:\.\d+)?)\s*(mg|g)/gi;
    let f;
    while ((f = o.exec(l)) !== null) {
        let d = f[1].trim();
        d = d.replace(/[（(].*/g, "").trim();
        let amt = parseFloat(f[2]);
        if (f[3].toLowerCase() === 'mg') {
            amt = +(amt / 1000).toFixed(4);
        }
        r.push({ name: d, amount: amt, amountStr: `${amt}g`, isExtract: false });
    }

    // 3. 日局が付いていない生薬
    if (r.filter(x => !x.isExtract).length === 0) {
        const d2 = /(?:^|[\s,、。]+)([ァ-ヶー一-龯]{2,}(?:（[^）]*）)?)\s*(\d+(?:\.\d+)?)\s*(mg|g)/gi;
        let f2;
        while ((f2 = d2.exec(l)) !== null) {
            let d3 = f2[1].trim();
            if (d3 !== "水製エキス" && d3 !== "乾燥エキス" && d3 !== "水製乾燥エキス" && !d3.includes("ゼラチン") && !d3.includes("添加物") && !d3.includes("日局")) {
                d3 = d3.replace(/[（(].*/g, "").trim();
                let amt = parseFloat(f2[2]);
                if (f2[3].toLowerCase() === 'mg') {
                    amt = +(amt / 1000).toFixed(4);
                }
                r.push({ name: d3, amount: amt, amountStr: `${amt}g`, isExtract: false });
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
    const l = `${BASE_URL}/medicus-bin/${url}`;
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
            const h = `${BASE_URL}/medicus-bin/japic_med_product?id=${d[1]}`;
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
                            const cells = $2(tr).find("th, td");
                            if (cells.length >= 2) {
                                const headerText = $2(cells[0]).text().trim();
                                if (headerText === "有効成分" || headerText.includes("成分及び分量") || headerText.includes("成分・分量")) {
                                    r.ingredients = Ey($2(cells[1]).text() || "");
                                }
                            }
                        });
                    });
                }
            } catch (err) {
                // ignore
            }
        }
        return r;
    }
    
    // OTC Details
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

// Load or create cache
let detailsCache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        detailsCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        console.log(`Loaded ${Object.keys(detailsCache).length} items from cache.`);
    } catch (e) {}
}

function saveCache() {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(detailsCache));
}

// Target companies definition (excluding 一元製薬)
const COMPANIES = [
    { id: 'tsumura', name: 'ツムラ', query: 'ツムラ', brandColor: '#C8102E' },
    { id: 'kracie', name: 'クラシエ', query: 'クラシエ', brandColor: '#0066B2' },
    { id: 'kotaro', name: '小太郎漢方製薬', query: '小太郎漢方製薬', brandColor: '#1b6840' },
    { id: 'osugi', name: '大杉製薬', query: '大杉製薬', brandColor: '#E65100' },
    { id: 'sanwa', name: '三和生薬', query: '三和生薬', brandColor: '#4A148C' },
    { id: 'honzo', name: '本草製薬', query: '本草製薬', brandColor: '#00695C' },
    { id: 'matsuura', name: '松浦薬業', query: '松浦薬業', brandColor: '#8D6E63' },
    { id: 'taikoseido', name: '太虎精堂製薬', query: '太虎精堂製薬', brandColor: '#880E4F' },
    { id: 'tatebayashi', name: '建林松鶴堂', query: '建林松鶴堂', brandColor: '#2E7D32' },
    { id: 'uchida', name: 'ウチダ和漢薬', query: 'ウチダ和漢薬', brandColor: '#1A237E' },
    { id: 'jps', name: 'ジェーピーエス製薬', query: 'ジェーピーエス製薬', brandColor: '#00838F' }
];

module.exports = {
    BASE_URL,
    COMPANIES,
    CACHE_FILE,
    detailsCache,
    saveCache,
    xA, q0, L0, U0, Q0,
    fetchDetails,
    delay
};
