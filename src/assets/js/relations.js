// ドゥームズデイ相関図: チップ位置を実測してSVGで関係線を描画。
// モバイル(760px未満)はrival/mystery優先の主要8本のみ。視聴済み作品の登場キャラは✨発光。
(function () {
  const canvas = document.getElementById('rel-canvas');
  const svg = document.getElementById('rel-svg');
  if (!canvas || !svg) return;
  const DATA = JSON.parse(document.getElementById('rel-data').textContent);
  const STYLE = {
    family: { stroke: '#DE1673', dash: '', w: 3 },
    love: { stroke: '#e74c3c', dash: '', w: 3 },
    ally: { stroke: '#1a7f37', dash: '', w: 2.5 },
    rival: { stroke: '#e67e22', dash: '8 5', w: 3 },
    mystery: { stroke: '#7f8c8d', dash: '4 6', w: 2.5 },
  };

  function chipCenter(id) {
    const el = canvas.querySelector('.rel-chip[data-id="' + id + '"]');
    if (!el) return null;
    const c = canvas.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2 };
  }

  function draw() {
    const mobile = window.innerWidth < 760;
    let edges = DATA.edges;
    if (mobile) {
      const prio = edges.filter(e => e.type === 'rival' || e.type === 'mystery');
      edges = prio.slice(0, 8);
    }
    svg.setAttribute('width', canvas.scrollWidth);
    svg.setAttribute('height', canvas.scrollHeight);
    svg.innerHTML = '';
    canvas.querySelectorAll('.rel-why').forEach(el => el.remove());
    for (const e of edges) {
      const a = chipCenter(e.from), b = chipCenter(e.to);
      if (!a || !b) continue;
      const s = STYLE[e.type];
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y);
      ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
      ln.setAttribute('stroke', s.stroke);
      ln.setAttribute('stroke-width', s.w);
      if (s.dash) ln.setAttribute('stroke-dasharray', s.dash);
      ln.setAttribute('opacity', '0.7');
      svg.appendChild(ln);
      // ラベル吹き出し(中点の?マーカー、mysteryは「考察」バッジ調)
      const dot = document.createElement('span');
      dot.className = 'map-why rel-why' + (e.type === 'mystery' ? ' mystery' : '');
      dot.tabIndex = 0;
      dot.dataset.why = e.label;
      dot.textContent = e.type === 'mystery' ? '?' : '·';
      dot.style.left = ((a.x + b.x) / 2 - 11) + 'px';
      dot.style.top = ((a.y + b.y) / 2 - 11) + 'px';
      dot.style.borderColor = s.stroke;
      canvas.appendChild(dot);
    }
  }

  // 視聴済み連動: 視聴済み作品に登場するキャラを発光
  const watched = new Set(JSON.parse(localStorage.getItem('ac-watched') || '[]'));
  if (watched.size) {
    for (const [cid, works] of Object.entries(DATA.works)) {
      if (works.some(w => watched.has(w))) {
        const el = canvas.querySelector('.rel-chip[data-id="' + cid + '"]');
        if (el) el.classList.add('seen');
      }
    }
  }

  document.getElementById('rel-table-toggle').addEventListener('click', function () {
    const t = document.getElementById('rel-table');
    t.hidden = !t.hidden;
    this.textContent = t.hidden ? '📋 全関係を一覧で見る' : '📋 一覧を閉じる';
  });

  let timer;
  window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(draw, 200); });
  // フォント読み込みで位置がずれるため、load後にも再描画
  draw();
  window.addEventListener('load', draw);
})();
