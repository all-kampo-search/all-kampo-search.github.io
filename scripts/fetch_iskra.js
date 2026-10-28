const fs = require('fs');
const cheerio = require('cheerio');

const delay = ms => new Promise(r => setTimeout(r, ms));

async function fetchIskraAll() {
  console.log("Fetching Iskra products...");
  const productUrls = new Set();

  for (let page = 1; page <= 4; page++) {
    const url = `https://www.iskra.co.jp/products/?page=${page}&category=%E5%8C%BB%E8%96%AC%E5%93%81`;
    try {
      const res = await fetch(url);
      const html = await res.text();
      const $ = cheerio.load(html);
      
      $('a').each((_, a) => {
        const href = $(a).attr('href');
        if (href && href.match(/\/products\/\d+\/?$/)) {
          const full = href.startsWith('http') ? href : `https://www.iskra.co.jp${href}`;
          productUrls.add(full);
        }
      });
      console.log(`Page ${page}: accumulated ${productUrls.size} URLs.`);
      await delay(400);
    } catch(e) {
      console.error(`Page ${page} error:`, e.message);
    }
  }

  const items = [];
  const urlList = Array.from(productUrls);

  for (let i = 0; i < urlList.length; i++) {
    const pUrl = urlList[i];
    try {
      const res = await fetch(pUrl);
      const html = await res.text();
      const $ = cheerio.load(html);

      const rawName = $('h1').text().trim() || $('title').text().split('|')[0].trim();
      if (!rawName) continue;

      // Extract details
      const bodyText = $('body').text().replace(/\t/g, ' ');
      
      // Efficacy
      let efficacy = "";
      const effMatch = bodyText.match(/効能[・･\s]*効果([\s\S]*?)(?=容量|用法|成分|製品特徴|使用上の注意|$)/i);
      if (effMatch) {
        efficacy = effMatch[1].replace(/\n\s*\n+/g, '\n').trim();
      }

      // Usage
      let usage = "";
      const useMatch = bodyText.match(/用法[・･\s]*用量([\s\S]*?)(?=効能|成分|容量|使用上の注意|$)/i);
      if (useMatch) {
        usage = useMatch[1].replace(/\n\s*\n+/g, '\n').trim();
      }

      // Ingredients
      let ingredients = [];
      const ingMatch = bodyText.match(/成分[・･\s]*分量([\s\S]*?)(?=効能|用法|容量|製品特徴|使用上の注意|$)/i);
      if (ingMatch) {
        const ingText = ingMatch[1];
        // Parse herbs and extracts
        const herbRegex = /([ァ-ヶー一-龯]{2,}(?:（[^）]*）)?)\s*([\d.]+)\s*(g|mg|mL)/g;
        let m;
        while ((m = herbRegex.exec(ingText)) !== null) {
          ingredients.push({
            name: m[1].replace(/[（(].*?[）)]/g, '').trim(),
            amount: parseFloat(m[2]),
            amountStr: `${m[2]}${m[3]}`,
            isExtract: m[1].includes('エキス')
          });
        }
      }

      // SubCategory (canonical formula name)
      let subCategory = rawName
        .replace(/^イスクラ/g, '')
        .replace(/エキス顆粒.*$/g, '')
        .replace(/顆粒.*$/g, '')
        .replace(/丸.*$/g, '丸')
        .replace(/散.*$/g, '散')
        .replace(/湯.*$/g, '湯')
        .replace(/膏.*$/g, '膏')
        .replace(/錠.*$/g, '')
        .trim();
      if (!subCategory) subCategory = rawName;

      // Sort key
      const sortKey = rawName.toLowerCase();

      items.push({
        name: rawName,
        rawName: rawName,
        url: pUrl,
        type: "otc",
        company: "iskra",
        companyName: "イスクラ産業",
        brandColor: "#007A78",
        formulaNo: null,
        otcCategory: "otc",
        subCategory: subCategory,
        sortKey: sortKey,
        subCategorySortKey: sortKey,
        efficacy: efficacy || "効能情報の詳細は添付文書をご確認ください",
        usage: usage || "",
        ingredients: ingredients,
        components: ingredients,
        additives: [],
        dailyDose: "",
        precautions: "",
        isIskraDirect: true
      });
      console.log(`[${i+1}/${urlList.length}] Fetched: ${rawName}`);
      await delay(300);
    } catch(e) {
      console.error(`Error fetching ${pUrl}:`, e.message);
    }
  }

  fs.writeFileSync('d:/管理/ドキュメント/AntiGravity/小太郎関係/全漢方製薬会社検索 - web/scripts/iskra_items.json', JSON.stringify(items, null, 2));
  console.log(`Saved ${items.length} Iskra products!`);
}

fetchIskraAll().catch(console.error);
