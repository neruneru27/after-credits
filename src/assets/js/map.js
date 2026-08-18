// 相関マップ: 画面幅に合わせて全体を縮小表示(横スクロール廃止)
(function () {
  const scroll = document.querySelector('.map-scroll');
  const canvas = document.querySelector('.map-canvas');
  if (!scroll || !canvas) return;
  const baseW = +canvas.dataset.w, baseH = +canvas.dataset.h;
  function fit() {
    const avail = scroll.clientWidth;
    const scale = Math.min(1, avail / baseW);
    canvas.style.transform = 'scale(' + scale + ')';
    canvas.style.transformOrigin = 'top left';
    scroll.style.height = Math.ceil(baseH * scale) + 'px';
  }
  fit();
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 150); });
})();

// 相関マップ: 視聴済み(localStorage)をノードに反映して"攻略地図"化
(function () {
  const watched = new Set(JSON.parse(localStorage.getItem('ac-watched') || '[]'));
  let n = 0;
  document.querySelectorAll('.map-node, .map-mobile li > a').forEach(el => {
    const m = el.getAttribute('href').match(/\/live\/([a-z0-9-]+)\/$/);
    if (m && watched.has(m[1])) { el.classList.add('watched'); if (el.classList.contains('map-node')) n++; }
  });
  const head = document.querySelector('[data-page="live-map"] .sec-head p');
  if (head && n) {
    const note = document.createElement('p');
    note.className = 'map-watched-note';
    note.textContent = '✅ 視聴済み ' + n + ' / 68 作品を色塗り表示中(実写ガイドのチェックと連動)';
    head.after(note);
  }
})();
