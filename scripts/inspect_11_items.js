const https = require('https');
const urls = [
  'https://www.kegg.jp/medicus-bin/japic_otc?japic_code=J0601010938',
  'https://www.kegg.jp/medicus-bin/japic_med?japic_code=00001510'
];
urls.forEach(url => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('--- ' + url + ' ---');
      const idx = d.indexOf('効能');
      if (idx >= 0) {
        console.log(d.substring(idx, idx + 400));
      } else {
        console.log('No 効能');
      }
    });
  });
});
