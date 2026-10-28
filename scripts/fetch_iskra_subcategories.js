const https = require('https');
const fs = require('fs');
const path = require('path');

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
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function check() {
  console.log('Fetching KEGG subcategories for Iskra...');
  for (const [name, code] of Object.entries(ISKRA_KEGG_MAP)) {
    const url = `https://www.kegg.jp/medicus-bin/japic_otc?japic_code=${code}`;
    const html = await fetchUrl(url);
    const m = html.match(/小分類<\/td>\s*<td class="item">([\s\S]*?)<\/td>/i);
    const subCat = m ? m[1].replace(/<[^>]+>/g, '').trim() : 'NOT_FOUND';
    console.log(`${name} (${code}) => KEGG小分類: [${subCat}]`);
    await new Promise(r => setTimeout(r, 200));
  }
}

check();
