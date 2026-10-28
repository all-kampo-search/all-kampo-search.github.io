const fs = require('fs');
const path = require('path');

const files = ['生薬名読み一覧.csv', '読み一覧.csv', '処方名読み一覧.csv'];
files.forEach(f => {
  const p = path.join(__dirname, '..', '..', f);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.split('\n').slice(0, 10);
    console.log('=== ' + f + ' ===');
    lines.forEach(l => console.log('  ', l.trim()));
  } else {
    console.log('Not found:', p);
  }
});
