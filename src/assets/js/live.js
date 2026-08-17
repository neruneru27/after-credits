// 実写ページ: 並び替え・絞り込み(初期表示はビルド時レンダリング済み。操作時のみ再描画)
// マークアップは _includes/partials/work-item.njk と同一に保つこと
(function () {
  const WORKS = JSON.parse(document.getElementById('mcu-data').textContent);
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
      '<p class="w-meta">日本: ' + fmtDate(w.date_jp) + (w.chrono_note ? ' / ' + w.chrono_note : '') + '</p></div>' +
      '<span class="w-type ' + w.type + '">' + typeLabel[w.type] + '</span>';
    if (!w.syn) {
      const el = document.createElement('div');
      el.className = 'watch';
      el.innerHTML = head;
      return el;
    }
    const el = document.createElement('details');
    el.className = 'watch-d';
    el.innerHTML =
      '<summary class="watch has-detail">' + head + '</summary>' +
      '<div class="w-detail">' +
        '<p class="w-syn"><b>あらすじ(ネタバレなし):</b> ' + w.syn + '</p>' +
        (w.sp
          ? '<details class="spoiler-box"><summary>⚠ ネタバレあり要約を表示(結末まで書いています)</summary><p>' + w.sp + '</p></details>'
          : (w.sp_pending ? '<p class="sp-pending">⚠ ネタバレあり要約は準備中です(公開から日が浅いため、確認でき次第追加します)</p>' : '')) +
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
})();
