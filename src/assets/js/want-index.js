// 逆算視聴ガイド一覧: ライブ検索
(function () {
  const input = document.getElementById('want-input');
  const nohit = document.getElementById('want-nohit');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let hits = 0;
    document.querySelectorAll('#want-grid .want-card').forEach(el => {
      const show = !q || (el.dataset.key + ' ' + el.textContent).toLowerCase().includes(q);
      el.classList.toggle('hide', !show);
      if (show) hits++;
    });
    nohit.classList.toggle('show', hits === 0);
  });
})();
