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
