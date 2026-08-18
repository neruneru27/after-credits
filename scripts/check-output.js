/**
 * ビルド後チェック(SEO):
 * 1. 全ページのmeta descriptionがユニークであること
 * 2. JSON-LDが全てJSONとしてパース可能であること
 * 失敗時は exit 1。
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '_site');
const errors = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
  });
}

const descs = new Map();
for (const f of walk(OUT)) {
  const rel = path.relative(OUT, f).replace(/\\/g, '/');
  const html = fs.readFileSync(f, 'utf8');
  const d = html.match(/<meta name="description" content="([^"]*)"/);
  if (d) {
    if (descs.has(d[1])) errors.push(`description重複: ${rel} と ${descs.get(d[1])}`);
    else descs.set(d[1], rel);
  } else if (!rel.includes('google')) {
    errors.push(`descriptionが無い: ${rel}`);
  }
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch (e) {
      errors.push(`JSON-LDパース不能: ${rel}: ${e.message.slice(0, 60)}`);
    }
  }
}

if (errors.length) {
  console.error(`\n✖ 出力チェック 失敗(${errors.length}件)`);
  for (const e of errors.slice(0, 20)) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✔ 出力チェック OK(${descs.size}ページ: descriptionユニーク・JSON-LD全パース可)`);
