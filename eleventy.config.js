module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  // Google Search Console 所有権確認ファイル(削除しないこと)
  eleventyConfig.addPassthroughCopy({ 'src/google527b257ac0f4a504.html': 'google527b257ac0f4a504.html' });
  eleventyConfig.ignores.add('src/google527b257ac0f4a504.html');

  // Amazonリンク生成(データ一元管理。実IDへの差し替えは site.json の amazonTag のみ)
  eleventyConfig.addShortcode('amazonLink', function (isbnOrAsin, tag) {
    const id = String(isbnOrAsin || '').replace(/-/g, '');
    return `https://www.amazon.co.jp/dp/${id}?tag=${tag}`;
  });

  // ASIN未設定(プレースホルダ)の商品はAmazon検索結果へリンク
  eleventyConfig.addShortcode('amazonSearch', function (keyword, tag) {
    return `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}&tag=${tag}`;
  });

  eleventyConfig.addFilter('jsonify', (v) => JSON.stringify(v));

  // 日本公開順ソート(SPA jpSortKey と同一ロジック)
  eleventyConfig.addFilter('sortJpRelease', (works) => {
    const key = (w) => {
      const d = w.date_jp || w.date || '';
      return d.length === 10 ? d : '9999-' + String(w.release_order).padStart(3, '0');
    };
    return works.slice().sort((a, b) => (key(a) < key(b) ? -1 : 1));
  });

  // 日付表示(SPA fmtDate と同一)
  eleventyConfig.addFilter('fmtDate', (d) => {
    if (!d) return '未定';
    return d.length === 10 ? d.replace(/-/g, '/') : d + '年(予定)';
  });

  eleventyConfig.addFilter('yen', (n) => (n == null ? '' : Number(n).toLocaleString('ja-JP')));

  eleventyConfig.addFilter('pluck', (arr, key) => (arr || []).map((x) => x[key]));

  // 記事本文の【DB◯◯】マーカー → コミックDBリンク+在庫区分バッジ(区分はビルド時にDBから取得)
  // 対応形式: 【DB10】【DB11〜13】【DB379・380】および末尾の手書き注記(・以降の非数値)は破棄して動的表示に置換
  eleventyConfig.addFilter('dbRefs', function (content, items) {
    const byNo = Object.fromEntries((items || []).map((b) => [b.no, b]));
    const csLabel = { A: '在庫あり', S: '店頭在庫のみ', R: '流通限定', D: '9/30消滅' };
    const prefix = (process.env.PATH_PREFIX || '/').replace(/\/$/, '');
    return String(content).replace(/【DB([^】]*)】/g, (whole, spec) => {
      const nums = [];
      for (const tok of spec.split('・')) {
        const range = tok.match(/^(\d+)[〜~](\d+)$/);
        if (range) {
          for (let i = +range[1]; i <= +range[2]; i++) nums.push(i);
        } else if (/^\d+$/.test(tok)) {
          nums.push(+tok);
        } else break; // 数値でないトークン以降は手書き注記なので破棄
      }
      if (!nums.length || nums.some((n) => !byNo[n])) return whole; // 不明な番号はそのまま残す(validateで検出)
      const links = nums.map((n) => {
        const b = byNo[n];
        return `<a class="db-ref" href="${prefix}/comics/#db-${n}"><span class="cs-badge ${b.status_code}">${csLabel[b.status_code]}</span>No.${n}</a>`;
      });
      return `<span class="db-refs">${links.join('')}</span>`;
    });
  });

  // 百科appearances: 実写出演を公開順にソート(work_id→mcuのdate、title直書きは西暦抽出、不明は元順維持)
  eleventyConfig.addFilter('sortAppLive', (items, works) => {
    const byId = Object.fromEntries((works || []).map((w) => [w.id, w]));
    const key = (x) => {
      const w = byId[x.work_id];
      if (w && w.date) return w.date;
      const m = (x.title || '').match(/(19|20)\d{2}/);
      return m ? m[0] + '-00-00' : '9999';
    };
    return (items || [])
      .map((x, i) => ({ x, i }))
      .sort((a, b) => {
        const ka = key(a.x), kb = key(b.x);
        return ka < kb ? -1 : ka > kb ? 1 : a.i - b.i;
      })
      .map((o) => o.x);
  });

  // 実写個別ページ: 百科appearancesの逆引き(この作品に登場するキャラ+役どころ)
  eleventyConfig.addFilter('charsInWork', (entries, workId) => {
    const out = [];
    for (const ch of entries || []) {
      const hit = ((ch.appearances || {}).live || []).find((x) => x.work_id === workId);
      if (hit) out.push({ id: ch.id, name: ch.name, en: ch.en, role: hit.role });
    }
    return out;
  });

  // 実写個別ページ: comics-dbのscreen連結(この作品の原作・関連コミック)
  // screen値は "id" / "id(注記)" / シリーズ総称("what-if"等) の3形式に対応
  eleventyConfig.addFilter('comicsForWork', (items, workId) =>
    (items || []).filter((b) => (b.screen || []).some((s) => {
      const base = s.split('(')[0].replace(/\?$/, '');
      return base === workId || workId.startsWith(base + '-');
    })));

  // 百科appearances: comics-dbのno→書籍情報解決
  eleventyConfig.addFilter('comicByNo', (no, items) => (items || []).find((b) => b.no === no) || null);

  // 視聴コース: 作品id→タイトル解決(見つからなければidをそのまま返す)
  eleventyConfig.addFilter('workTitle', (id, works) => {
    const w = (works || []).find((x) => x.id === id);
    return w ? w.title : id;
  });

  // 記事等のルート相対リンク(/live/… /comics/…)にpathPrefixを自動付与
  const prefix = (process.env.PATH_PREFIX || '/').replace(/\/$/, '');
  if (prefix) {
    const esc = prefix.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(href|src)="/(?!/)(?!${esc}/)`, 'g');
    eleventyConfig.addTransform('prefixRootLinks', function (content) {
      if (!(this.page.outputPath || '').endsWith('.html')) return content;
      return content.replace(re, `$1="${prefix}/`);
    });
  }

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data',
    },
    pathPrefix: process.env.PATH_PREFIX || '/',
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
};
