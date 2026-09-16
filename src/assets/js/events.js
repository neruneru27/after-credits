// 劇場イベント: 日付で表示・文言を自動切替(ビルド不要)
(function () {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = 86400000;
  document.querySelectorAll('[data-start][data-end]').forEach(el => {
    const start = new Date(el.dataset.start + 'T00:00:00+09:00');
    const end = new Date(el.dataset.end + 'T00:00:00+09:00');
    const st = el.querySelector('[data-role="status"]');
    const isBanner = el.classList.contains('event-banner');
    let text, cls;
    if (today < start) {
      const d = Math.ceil((start - today) / day);
      text = d + '日後に公開'; cls = 'soon';
    } else if (today <= end) {
      const d = Math.ceil((end - today) / day);
      text = d === 0 ? '本日最終日' : '上映中・あと' + d + '日'; cls = 'live';
    } else {
      text = '上映終了'; cls = 'ended';
    }
    if (st) st.textContent = text;
    el.classList.add('ev-' + cls);
    if (isBanner) el.hidden = (cls === 'ended');
  });
})();
