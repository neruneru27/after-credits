// 用語辞典: ビルド時レンダリング済みDOMをカテゴリ+検索語で表示切替(再描画なし)
(function () {
  const state = { cat: 'all', q: '' };
  const terms = document.querySelectorAll('#dict-list .term');
  const nohit = document.getElementById('dict-nohit');

  function apply() {
    let hits = 0;
    terms.forEach(el => {
      const okCat = state.cat === 'all' || el.dataset.cat === state.cat;
      const text = (el.dataset.key + ' ' + el.textContent).toLowerCase();
      const okQ = !state.q || text.includes(state.q);
      const show = okCat && okQ;
      el.classList.toggle('hide', !show);
      if (show) hits++;
    });
    nohit.classList.toggle('show', hits === 0);
  }
  document.getElementById('dict-input').addEventListener('input', e => {
    state.q = e.target.value.trim().toLowerCase();
    apply();
  });
  document.querySelectorAll('#dict-cat-row .fbtn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.cat = btn.dataset.cat;
      document.querySelectorAll('#dict-cat-row .fbtn').forEach(b => b.setAttribute('aria-pressed', b === btn));
      apply();
    });
  });
})();
