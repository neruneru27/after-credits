// キャラ検索: ビルド時レンダリング済みカードをライブ検索で表示切替
(function () {
  const input = document.getElementById('chara-input');
  const nohit = document.getElementById('chara-nohit');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let hits = 0;
    document.querySelectorAll('#chara-grid .chara').forEach(el => {
      const text = (el.dataset.key + ' ' + el.textContent).toLowerCase();
      const show = !q || text.includes(q);
      el.classList.toggle('hide', !show);
      if (show) hits++;
    });
    nohit.classList.toggle('show', hits === 0);
  });
})();
