module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  // Google Search Console 所有権確認ファイル(削除しないこと)
  eleventyConfig.addPassthroughCopy({ 'src/google527b257ac0f4a504.html': 'google527b257ac0f4a504.html' });
  eleventyConfig.ignores.add('src/google527b257ac0f4a504.html');

  // ブランド素材(OGP画像・favicon群)はサイトルート直下に出力
  eleventyConfig.addPassthroughCopy({ 'src/brand': '.' });

  // Amazon検索クエリ用
  eleventyConfig.addFilter('urlencode', (s) => encodeURIComponent(s || ''));

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

  // 予習必要度メーター: liveExtraのrequires数から導出(0=単独OK/1-2=軽い予習/3+=本流)
  eleventyConfig.addFilter('prepMeter', (id, liveExtra) => {
    const x = (liveExtra.works || {})[id];
    if (!x) return null;
    const n = (x.requires || []).length;
    if (n === 0) return { cls: 'g', label: '🟢 単独OK', n };
    if (n <= 2) return { cls: 'y', label: '🟡 軽い予習', n };
    return { cls: 'r', label: '🔴 本流(要予習)', n };
  });

  // キャラid→表示名解決(見つからなければidを返す)
  eleventyConfig.addFilter('encName', (id, entries) => {
    const ch = (entries || []).find((x) => x.id === id);
    return ch ? ch.name : id;
  });

  // 相関図: キャラid→実写出演work_idの対応(視聴済み連動用)
  eleventyConfig.addFilter('charWorksMap', function (entries, nodeIds) {
    const want = new Set(nodeIds);
    const out = {};
    for (const ch of entries || []) {
      if (!want.has(ch.id)) continue;
      out[ch.id] = ((ch.appearances || {}).live || []).map((x) => x.work_id).filter(Boolean);
    }
    return out;
  });

  // 全作品分のメーターmap(クライアントJSの再描画用)
  eleventyConfig.addFilter('prepMeters', function (liveExtra) {
    const out = {};
    for (const id of Object.keys(liveExtra.works || {})) {
      const n = (liveExtra.works[id].requires || []).length;
      out[id] = n === 0 ? { cls: 'g', label: '🟢 単独OK' } : n <= 2 ? { cls: 'y', label: '🟡 軽い予習' } : { cls: 'r', label: '🔴 本流(要予習)' };
    }
    return out;
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

  // あみだくじマップ: timelineMap.json + mcu.works からSVG線+ノードカードのHTMLを生成
  eleventyConfig.addFilter('timelineMapHtml', function (map, works) {
    const prefix = (process.env.PATH_PREFIX || '/').replace(/\/$/, '');
    const COL = 150, ROW = 64, HEAD = 56, PADB = 24;
    const byId = Object.fromEntries(works.map((w) => [w.id, w]));
    const laneIdx = Object.fromEntries(map.lanes.map((l, i) => [l.id, i]));
    const laneColor = Object.fromEntries(map.lanes.map((l) => [l.id, l.color]));
    const width = COL * map.lanes.length;
    const height = HEAD + ROW * works.length + PADB;
    const cx = (lane) => laneIdx[lane] * COL + COL / 2;
    const cy = (row) => HEAD + row * ROW + ROW / 2;
    // ノード座標(barは全レーン中央)
    const pos = {};
    for (const n of map.nodes) pos[n.work_id] = { x: cx(n.lane), y: cy(n.row), lane: n.lane };
    for (const b of map.bars) pos[b.work_id] = { x: width / 2, y: cy(b.row), lane: null };

    let svg = `<svg class="map-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">`;
    // レーン縦線(同レーンの最初〜最後のノードを結ぶ)
    for (const l of map.lanes) {
      const rows = map.nodes.filter((n) => n.lane === l.id).map((n) => n.row);
      if (!rows.length) continue;
      svg += `<line x1="${cx(l.id)}" y1="${cy(Math.min(...rows))}" x2="${cx(l.id)}" y2="${cy(Math.max(...rows))}" stroke="${l.color}" stroke-width="4" opacity="0.55"/>`;
    }
    // 横棒(全員集合)
    for (const b of map.bars) {
      svg += `<line x1="${COL / 4}" y1="${cy(b.row)}" x2="${width - COL / 4}" y2="${cy(b.row)}" stroke="#191410" stroke-width="5"/>`;
    }
    // 斜め接続線
    for (const c of map.cross_links) {
      const a = pos[c.from], z = pos[c.to];
      svg += `<line x1="${a.x}" y1="${a.y}" x2="${z.x}" y2="${z.y}" stroke="#DE1673" stroke-width="3" stroke-dasharray="7 5" opacity="0.8"/>`;
    }
    svg += '</svg>';

    let html = `<div class="map-scroll"><div class="map-canvas" style="width:${width}px;height:${height}px">`;
    html += `<div class="map-lanehead" style="width:${width}px">`;
    for (const l of map.lanes) {
      html += `<div class="map-lane-label" style="width:${COL}px;border-top:6px solid ${l.color}" title="${l.desc}">${l.label}</div>`;
    }
    html += '</div>' + svg;
    const card = (id, x, y, w2, lane) => {
      const wk = byId[id];
      const dashed = wk.status === 'upcoming' ? ' upcoming' : '';
      const color = lane ? laneColor[lane] : '#191410';
      return `<a class="map-node${dashed}" href="${prefix}/live/${id}/" style="left:${x - w2 / 2}px;top:${y - 24}px;width:${w2}px;border-left:6px solid ${color}">${wk.title}</a>`;
    };
    for (const n of map.nodes) html += card(n.work_id, cx(n.lane), cy(n.row), COL - 18, n.lane);
    for (const b of map.bars) html += card(b.work_id, width / 2, cy(b.row), COL * 1.6, null);
    // 接続理由の吹き出し(CSSツールチップ・タップ対応にtabindex)
    for (const c of map.cross_links) {
      const a = pos[c.from], z = pos[c.to];
      const mx = (a.x + z.x) / 2, my = (a.y + z.y) / 2;
      html += `<span class="map-why" tabindex="0" data-why="${c.why}" style="left:${mx - 11}px;top:${my - 11}px">?</span>`;
    }
    html += '</div></div>';
    return html;
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
