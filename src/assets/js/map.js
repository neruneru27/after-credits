// 相関マップ: 視聴済み(localStorage)をノードに反映して"攻略地図"化
(function () {
  const watched = new Set(JSON.parse(localStorage.getItem('ac-watched') || '[]'));
  let n = 0;
  document.querySelectorAll('.map-node').forEach(el => {
    const m = el.getAttribute('href').match(/\/live\/([a-z0-9-]+)\/$/);
    if (m && watched.has(m[1])) { el.classList.add('watched'); n++; }
  });
  const head = document.querySelector('[data-page="live-map"] .sec-head p');
  if (head && n) {
    const note = document.createElement('p');
    note.className = 'map-watched-note';
    note.textContent = '✅ 視聴済み ' + n + ' / 68 作品を色塗り表示中(実写ガイドのチェックと連動)';
    head.after(note);
  }
})();
