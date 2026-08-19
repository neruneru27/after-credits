// 逆算視聴ガイド: コースタブ切替 + 視聴済み連動(取り消し線・残り本数)
(function () {
  const tabs = document.querySelectorAll('.course-tab');
  if (!tabs.length) return;
  const guideId = tabs[0].dataset.guide;

  tabs.forEach(btn => btn.addEventListener('click', () => {
    const cid = btn.dataset.course;
    tabs.forEach(b => b.setAttribute('aria-pressed', b === btn));
    ['ume', 'take', 'matsu'].forEach(c => {
      const pane = document.getElementById('cp-' + guideId + '-' + c);
      if (pane) pane.hidden = c !== cid;
    });
  }));

  // 視聴済み(実写ガイドのチェックと共有)
  const watched = new Set(JSON.parse(localStorage.getItem('ac-watched') || '[]'));
  if (!watched.size) return;
  document.querySelectorAll('.course-pane').forEach(pane => {
    let done = 0, total = 0;
    pane.querySelectorAll('.want-item[data-id]').forEach(li => {
      total++;
      if (watched.has(li.dataset.id)) { li.classList.add('done'); done++; }
    });
    const el = pane.querySelector('.want-remain');
    if (!el) return;
    const all = +el.dataset.total;
    const rest = all - done;
    el.textContent = rest === 0
      ? '✅ このコースは全て視聴済みです。いつでも本編へどうぞ'
      : '残り ' + rest + ' 本(視聴済み ' + done + ' / ' + all + ')';
    el.classList.add('show');
  });
})();
