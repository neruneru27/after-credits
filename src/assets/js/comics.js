// どこから読む?診断: ビルド時生成済みの結果カード12枚をタップで切替
(function () {
  const navi = document.getElementById('comic-navi');
  if (!navi) return;
  let q1 = null;
  const show = (id) => {
    navi.querySelectorAll('.navi-step').forEach(s => s.hidden = true);
    document.getElementById(id).hidden = false;
  };
  navi.querySelectorAll('[data-q1]').forEach(b => b.addEventListener('click', () => {
    q1 = b.dataset.q1;
    show('navi-q2');
  }));
  navi.querySelectorAll('[data-q2]').forEach(b => b.addEventListener('click', () => {
    if (q1) show('navi-r-' + q1 + '-' + b.dataset.q2);
  }));
  navi.querySelectorAll('[data-navi-restart]').forEach(b => b.addEventListener('click', () => {
    q1 = null;
    show('navi-q1');
  }));
})();

// コミックDB: ビルド時レンダリング済み416行を区分+検索語で表示切替(再描画なし)
(function () {
  const state = { f: 'all', q: '' };
  const rows = document.querySelectorAll('#comic-list .crow');
  const nohit = document.getElementById('comic-nohit');
  const countEl = document.getElementById('comic-count');
  const total = rows.length;

  function apply() {
    let hits = 0;
    rows.forEach(el => {
      let okF;
      if (state.f === 'all') okF = true;
      else if (state.f === 'screen') okF = el.dataset.screen === '1';
      else if (state.f === 'doom') okF = el.dataset.doom === '1';
      else okF = el.dataset.cs === state.f;
      const text = (el.dataset.key + ' ' + el.textContent).toLowerCase();
      const okQ = !state.q || text.includes(state.q);
      const show = okF && okQ;
      el.classList.toggle('hide', !show);
      if (show) hits++;
    });
    countEl.textContent = hits + ' / ' + total + '冊を表示(★=ドゥームズデイ予習優先)';
    nohit.classList.toggle('show', hits === 0);
  }
  document.getElementById('comic-input').addEventListener('input', e => {
    state.q = e.target.value.trim().toLowerCase();
    apply();
  });
  document.querySelectorAll('#comic-status-row .fbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.f = btn.dataset.cs;
      document.querySelectorAll('#comic-status-row .fbtn').forEach(b => b.setAttribute('aria-pressed', b === btn));
      apply();
    });
  });
})();
