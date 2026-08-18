// 開幕演出「You Will Return」: ホームのみ・セッション1回のみ・タップで即スキップ。
// prefers-reduced-motion 環境では表示しない。本編は常に下に描画済み(オーバーレイ方式)。
(function () {
  const el = document.getElementById('splash');
  if (!el) return;
  if (sessionStorage.getItem('ac-splash')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  sessionStorage.setItem('ac-splash', '1');

  const phases = JSON.parse(document.getElementById('splash-data').textContent);
  const now = Date.now();
  const phase = phases.find(p => !p.until || now < new Date(p.until).getTime()) || phases[phases.length - 1];
  document.getElementById('splash-en').textContent = phase.en;
  document.getElementById('splash-jp').textContent = phase.jp;
  document.getElementById('splash-gold').textContent = phase.gold;

  el.hidden = false;
  document.documentElement.classList.add('splash-lock');
  requestAnimationFrame(() => el.classList.add('run'));

  let done = false;
  function end() {
    if (done) return;
    done = true;
    el.classList.add('out');
    document.documentElement.classList.remove('splash-lock');
    setTimeout(() => el.remove(), 650);
  }
  el.addEventListener('click', end);
  el.addEventListener('keydown', end);
  setTimeout(end, 3000);
})();
