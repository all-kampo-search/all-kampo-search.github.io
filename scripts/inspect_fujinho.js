const https = require('https');
const url = 'https://www.kegg.jp/medicus-bin/japic_otc?japic_code=J1501000168';
https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('婦人宝 KEGG snippet:');
    const m = d.match(/包装[\s\S]*?<\/td>/i);
    console.log(m ? m[0] : 'No pack');
    const u = d.indexOf('用法・用量');
    if (u >= 0) console.log(d.substring(u, u + 300));
  });
});
