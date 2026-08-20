// ゲーム個別ページ: 実写登場/ゲーム限定 + ロールの2軸フィルタ(軸間AND)
(function () {
  const state = { live: 'all', role: 'all' };
  const chars = document.querySelectorAll('#game-chars .gchar');
  const nohit = document.getElementById('game-nohit');
  if (!chars.length) return;

  function apply() {
    let hits = 0;
    chars.forEach(el => {
      const okL = state.live === 'all' || el.dataset.live === state.live;
      const okR = state.role === 'all' || el.dataset.role === state.role;
      const show = okL && okR;
      el.classList.toggle('hide', !show);
      if (show) hits++;
    });
    nohit.classList.toggle('show', hits === 0);
  }

  [['game-filter', 'live'], ['game-role', 'role']].forEach(([rowId, key]) => {
    const row = document.getElementById(rowId);
    if (!row) return;
    row.querySelectorAll('.fbtn').forEach(btn => {
      btn.addEventListener('click', () => {
        state[key] = btn.dataset[key];
        row.querySelectorAll('.fbtn').forEach(b => b.setAttribute('aria-pressed', b === btn));
        apply();
      });
    });
  });
})();
