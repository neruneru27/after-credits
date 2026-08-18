// 実写ページ: 並び替え・絞り込み(初期表示はビルド時レンダリング済み。操作時のみ再描画)
// マークアップは _includes/partials/work-item.njk と同一に保つこと
(function () {
  const WORKS = JSON.parse(document.getElementById('mcu-data').textContent);
  const AMZ = JSON.parse(document.getElementById('amz-data').textContent);
  // pathPrefix対応: ビルド済みリンクから基底パスを拾う
  const BASE = (document.querySelector('#watch-list .w-more a') || { getAttribute: () => '/live/x/' })
    .getAttribute('href').replace(/[^/]+\/$/, '');

  function moreLink(id) {
    return '<p class="w-more"><a href="' + BASE + id + '/">→ 作品ページ(クレジットシーン・登場キャラ)</a></p>';
  }

  // ---------- 視聴済み(localStorage) ----------
  const METERS = JSON.parse((document.getElementById('meter-data') || { textContent: '{}' }).textContent);
  const loadWatched = () => new Set(JSON.parse(localStorage.getItem('ac-watched') || '[]'));
  const saveWatched = (s) => localStorage.setItem('ac-watched', JSON.stringify([...s]));
  let watched = loadWatched();

  function meterHtml(id) {
    const m = METERS[id];
    return m ? ' <span class="prep-meter ' + m.cls + '">' + m.label + '</span>' : '';
  }
  function updateProgress() {
    const count = document.getElementById('watch-count');
    const fill = document.getElementById('watch-fill');
    if (!count) return;
    count.textContent = watched.size;
    fill.style.width = (watched.size / 68 * 100) + '%';
  }
  function bindChecks(root) {
    (root || document).querySelectorAll('.watch-check').forEach(el => {
      const id = el.dataset.id;
      const sync = () => {
        el.setAttribute('aria-checked', watched.has(id));
        el.classList.toggle('on', watched.has(id));
      };
      sync();
      const toggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        watched.has(id) ? watched.delete(id) : watched.add(id);
        saveWatched(watched);
        sync();
        updateProgress();
      };
      el.addEventListener('click', toggle);
      el.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') toggle(e); });
    });
  }

  function buyRow(id) {
    const a = AMZ.enabled && AMZ.links[id];
    if (!a || id.startsWith('_')) return '';
    const btn = (asin, label) => asin
      ? '<a class="amz-btn" href="https://www.amazon.co.jp/dp/' + asin + '?tag=' + AMZ.tag + '" rel="sponsored noopener" target="_blank">' + label + '</a>'
      : '';
    const btns = btn(a.bd, 'Blu-ray') + btn(a.dvd, 'DVD') + btn(a.pv, 'プライムビデオ');
    return btns ? '<p class="w-buy">' + btns + '<span class="pr-label">[PR]</span></p>' : '';
  }
  const typeLabel = { movie: '映画', drama: 'ドラマ', anime: 'アニメ', special: 'SP' };
  const liveState = { mode: 'release', filter: 'all' };

  function jpSortKey(w) {
    const d = w.date_jp || w.date || '';
    return d.length === 10 ? d : '9999-' + String(w.release_order).padStart(3, '0');
  }
  function fmtDate(d) {
    if (!d) return '未定';
    return d.length === 10 ? d.replace(/-/g, '/') : d + '年(予定)';
  }
  function makeItem(w, num) {
    const head =
      '<span class="w-num">' + num + '</span>' +
      '<div><h3>' + w.title +
        (w.brand ? '<span class="w-badge">単独OK</span>' : '') +
        (w.status === 'upcoming' ? '<span class="w-badge upcoming">公開予定</span>' : '') +
      '</h3>' + (w.desc ? '<p class="w-desc">' + w.desc + '</p>' : '') +
      '<p class="w-meta">日本: ' + fmtDate(w.date_jp) + (w.chrono_note ? ' / ' + w.chrono_note : '') + meterHtml(w.id) + '</p></div>' +
      '<span class="watch-check" data-id="' + w.id + '" role="checkbox" aria-checked="false" tabindex="0" title="視聴済みにする">✓</span>' +
      '<span class="w-type ' + w.type + '">' + typeLabel[w.type] + '</span>';
    if (!w.syn) {
      const wrap = document.createElement('div');
      wrap.innerHTML = '<div class="watch">' + head + '</div><div class="w-more-solo">' + moreLink(w.id) + '</div>';
      return wrap;
    }
    const el = document.createElement('details');
    el.className = 'watch-d';
    el.innerHTML =
      '<summary class="watch has-detail">' + head + '</summary>' +
      '<div class="w-detail">' +
        '<p class="w-syn"><b>あらすじ(ネタバレなし):</b> ' + w.syn + '</p>' + buyRow(w.id) +
        (w.sp
          ? '<details class="spoiler-box"><summary>⚠ ネタバレあり要約を表示(結末まで書いています)</summary><p>' + w.sp + '</p></details>'
          : (w.sp_pending ? '<p class="sp-pending">⚠ ネタバレあり要約は準備中です(公開から日が浅いため、確認でき次第追加します)</p>' : '')) +
      moreLink(w.id) +
      '</div>';
    return el;
  }
  function renderLive() {
    const list = document.getElementById('watch-list');
    const offBlock = document.getElementById('offtime-block');
    const offList = document.getElementById('offtime-list');
    list.innerHTML = ''; offList.innerHTML = '';
    const works = WORKS.filter(w => liveState.filter === 'all' || w.type === liveState.filter);
    if (liveState.mode === 'release') {
      works.slice().sort((a, b) => jpSortKey(a) < jpSortKey(b) ? -1 : 1)
        .forEach((w, idx) => list.appendChild(makeItem(w, idx + 1)));
      offBlock.style.display = 'none';
    } else {
      const timed = works.filter(w => w.chrono_order != null)
        .sort((a, b) => a.chrono_order - b.chrono_order);
      const off = works.filter(w => w.chrono_order == null);
      timed.forEach((w, idx) => list.appendChild(makeItem(w, idx + 1)));
      off.forEach(w => offList.appendChild(makeItem(w, '※')));
      offBlock.style.display = off.length ? 'block' : 'none';
    }
    bindChecks(list);
    bindChecks(offList);
  }
  const btnRelease = document.getElementById('btn-release');
  const btnChrono = document.getElementById('btn-chrono');
  function setMode(mode) {
    liveState.mode = mode;
    btnRelease.setAttribute('aria-pressed', mode === 'release');
    btnChrono.setAttribute('aria-pressed', mode === 'chrono');
    renderLive();
  }
  btnRelease.addEventListener('click', () => setMode('release'));
  btnChrono.addEventListener('click', () => setMode('chrono'));
  // SPA時代の既知バグ対策: セレクタは必ずこのページの filter-row にスコープする
  document.querySelectorAll('#live-filter-row .fbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      liveState.filter = btn.dataset.filter;
      document.querySelectorAll('#live-filter-row .fbtn').forEach(b => b.setAttribute('aria-pressed', b === btn));
      renderLive();
    });
  });

  // 初期表示(ビルド時レンダリング分)にもチェック状態を反映
  bindChecks(document);
  updateProgress();
})();
