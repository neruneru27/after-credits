// キャラ検索: 検索窓 + 4軸フィルタ(軸間AND・軸内単一選択)で表示切替(再描画なし)
(function () {
  const state = { q: '', faction: 'all', origin: 'all', series: 'all', doom: 'all' };
  const cards = document.querySelectorAll('#chara-grid .chara');
  const nohit = document.getElementById('chara-nohit');

  function apply() {
    let hits = 0;
    cards.forEach(el => {
      const okQ = !state.q || (el.dataset.key + ' ' + el.textContent).toLowerCase().includes(state.q);
      const okF = state.faction === 'all' || el.dataset.faction.split(' ').includes(state.faction);
      const okO = state.origin === 'all' || el.dataset.origin === state.origin;
      const okS = state.series === 'all' || el.dataset.series.split(' ').includes(state.series);
      const okD = state.doom === 'all' || el.dataset.doom === '1';
      const show = okQ && okF && okO && okS && okD;
      el.classList.toggle('hide', !show);
      if (show) hits++;
    });
    nohit.classList.toggle('show', hits === 0);
  }

  document.getElementById('chara-input').addEventListener('input', e => {
    state.q = e.target.value.trim().toLowerCase();
    apply();
  });

  [['filter-faction', 'faction'], ['filter-origin', 'origin'], ['filter-series', 'series'], ['filter-doom', 'doom']]
    .forEach(([rowId, key]) => {
      const row = document.getElementById(rowId);
      if (!row) return;
      row.querySelectorAll('.fbtn').forEach(btn => {
        btn.addEventListener('click', () => {
          state[key] = btn.dataset.v;
          row.querySelectorAll('.fbtn').forEach(b => b.setAttribute('aria-pressed', b === btn));
          apply();
        });
      });
    });
})();
