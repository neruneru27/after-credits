module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });

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
