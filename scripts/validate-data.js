/**
 * ビルド前データ検証(HANDOFF.md 運用ルール1)
 * 検証失敗時は exit 1 でビルドを停止する。
 * 過去にJSONへの出所不明データ混入事故が2回あったため、このチェックは削除・緩和しないこと。
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'src', '_data');
const load = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const errors = [];
const err = (msg) => errors.push(msg);

// ---- glossary ----
{
  const g = load('glossary.json');
  const validCats = ['sekai', 'chimei', 'soshiki', 'item', 'power', 'pub', 'mcu', 'event'];
  const catKeys = Object.keys(g.cats || {});
  if (catKeys.length !== 8 || !validCats.every((c) => catKeys.includes(c))) {
    err(`glossary: cats が正規8種と不一致: ${catKeys.join(',')}`);
  }
  const seen = new Set();
  for (const t of g.terms) {
    if (!validCats.includes(t.cat)) err(`glossary: "${t.term}" の cat が不正: ${t.cat}`);
    const hasDef = typeof t.def === 'string' && t.def.length > 0;
    const hasSplit = t.def_comic && t.def_mcu;
    if (!hasDef && !hasSplit) err(`glossary: "${t.term}" に def も def_comic+def_mcu も無い`);
    if (seen.has(t.term)) err(`glossary: term 重複: "${t.term}"`);
    seen.add(t.term);
  }
  for (const t of g.terms) {
    for (const r of t.rel || []) {
      if (!seen.has(r)) err(`glossary: "${t.term}" の rel 参照先が存在しない: "${r}"`);
    }
  }
  if (g.terms.length !== 298) err(`glossary: terms 件数が 298 でない: ${g.terms.length}`);
}

// ---- mcu-works ----
{
  const m = load('mcu.json');
  if (m.works.length !== 68) err(`mcu: works 件数が 68 でない: ${m.works.length}`);
  const seen = new Set();
  for (const w of m.works) {
    if (seen.has(w.id)) err(`mcu: id 重複: ${w.id}`);
    seen.add(w.id);
    if (!['released', 'upcoming'].includes(w.status)) err(`mcu: ${w.id} の status 不正: ${w.status}`);
    if (w.status === 'upcoming' && (w.syn || w.sp)) {
      err(`mcu: upcoming の ${w.id} に syn/sp が存在する(執筆はチャット側担当。混入疑い)`);
    }
    if (w.sp && w.sp_pending) err(`mcu: ${w.id} が sp と sp_pending を両方持つ`);
    if (w.status === 'released' && !w.sp && !w.sp_pending) {
      err(`mcu: released の ${w.id} に sp も sp_pending も無い`);
    }
  }
  const spCount = m.works.filter((w) => w.sp).length;
  const pendCount = m.works.filter((w) => w.sp_pending).length;
  const upCount = m.works.filter((w) => w.status === 'upcoming').length;
  if (spCount + pendCount + upCount !== 68) {
    err(`mcu: sp(${spCount}) + sp_pending(${pendCount}) + upcoming(${upCount}) ≠ 68`);
  }
}

// ---- comics-db ----
{
  const c = load('comics.json');
  if (c.items.length !== 416) err(`comics: 件数が 416 でない: ${c.items.length}`);
  // ISBN仕様(2026-08-17 実データ確認): D=電子版のみのため紙ISBNなし(全176件null)、
  // Rも一部null。A/Sは必須。非nullは 978-4- 始まりのハイフン区切り形式。
  const seenNo = new Set();
  for (const b of c.items) {
    if (!['A', 'S', 'R', 'D'].includes(b.status_code)) {
      err(`comics: No.${b.no} "${b.title}" の status_code 不正: ${b.status_code}`);
    }
    if (b.isbn == null) {
      if (b.status_code === 'A' || b.status_code === 'S') {
        err(`comics: No.${b.no} "${b.title}" (${b.status_code}区分) に ISBN が無い`);
      }
    } else if (!/^978-4-\d{4,7}-\d{1,5}-\d$/.test(b.isbn)) {
      err(`comics: No.${b.no} "${b.title}" の ISBN 形式不正: ${b.isbn}`);
    }
    if (seenNo.has(b.no)) err(`comics: no 重複: ${b.no}`);
    seenNo.add(b.no);
  }
}

// ---- キャラ百科(124体) ----
let encIds = new Set();
{
  const e = load('encyclopedia.json');
  if (e.entries.length !== 125) err(`encyclopedia: 件数が 125 でない: ${e.entries.length}`);
  const factions = Object.keys(e.meta.filters.faction);
  const origins = Object.keys(e.meta.filters.origin);
  const seriesKeys = Object.keys(e.meta.filters.series);
  for (const ch of e.entries) {
    if (encIds.has(ch.id)) err(`encyclopedia: id 重複: ${ch.id}`);
    encIds.add(ch.id);
    if (!ch.comic) err(`encyclopedia: ${ch.id} に comic が無い`);
    if (!Array.isArray(ch.live_versions) || ch.live_versions.length < 1) {
      err(`encyclopedia: ${ch.id} の live_versions が空`);
    } else {
      // 形式統一(2026-08-18裁定): ver/actor/years/text 必須。label/desc形式の混在を機械で防ぐ
      for (const v of ch.live_versions) {
        for (const k of ['ver', 'actor', 'years', 'text']) {
          if (!v[k]) err(`encyclopedia: ${ch.id} の live_versions に ${k} が無い(label/desc形式は不可)`);
        }
      }
    }
    const t = ch.tags || {};
    if (!Array.isArray(t.faction) || t.faction.length < 1) err(`encyclopedia: ${ch.id} の tags.faction が空`);
    else for (const f of t.faction) if (!factions.includes(f)) err(`encyclopedia: ${ch.id} の faction 不正: ${f}`);
    if (!t.origin) err(`encyclopedia: ${ch.id} に tags.origin が無い`);
    else if (!origins.includes(t.origin)) err(`encyclopedia: ${ch.id} の origin 不正: ${t.origin}`);
    if (!Array.isArray(t.series) || t.series.length < 1) err(`encyclopedia: ${ch.id} の tags.series が空`);
    else for (const s of t.series) if (!seriesKeys.includes(s)) err(`encyclopedia: ${ch.id} の series 不正: ${s}`);
  }
}

// ---- charaCards(検索カード120体) ----
{
  const c = load('charaCards.json');
  if (c.cards.length !== 125) err(`charaCards: 件数が 125 でない: ${c.cards.length}`);
  const seen = new Set();
  for (const card of c.cards) {
    if (!['c', 'm', 'y', 'k'].includes(card.color)) {
      err(`charaCards: "${card.name}" の color 不正: ${card.color}`);
    }
    if (!card.live) err(`charaCards: "${card.name}" に live が無い`);
    if (!card.tags) err(`charaCards: "${card.name}" に tags が無い`);
    if (!card.enc_id) err(`charaCards: "${card.name}" に enc_id が無い`);
    else if (!encIds.has(card.enc_id)) err(`charaCards: "${card.name}" の enc_id が百科に存在しない: ${card.enc_id}`);
    if (seen.has(card.enc_id)) err(`charaCards: enc_id 重複: ${card.enc_id}`);
    seen.add(card.enc_id);
  }
}

// ---- appearances(百科の出演作リスト、Tier1〜段階追加) ----
{
  const e = load('encyclopedia.json');
  const wids = new Set(load('mcu.json').works.map((w) => w.id));
  const nos = new Set(load('comics.json').items.map((b) => b.no));
  for (const ch of e.entries) {
    const ap = ch.appearances;
    if (!ap) continue;
    for (const x of ap.live || []) {
      if (!x.work_id && !x.title) err(`appearances: ${ch.id} のlive項目に work_id も title も無い`);
      if (x.work_id && !wids.has(x.work_id)) err(`appearances: ${ch.id} の work_id が mcu に無い: ${x.work_id}`);
      if (!x.role) err(`appearances: ${ch.id} のlive項目に role が無い`);
    }
    for (const x of ap.comic || []) {
      if (!x.db_no && !x.title) err(`appearances: ${ch.id} のcomic項目に db_no も title も無い`);
      if (x.db_no && !nos.has(x.db_no)) err(`appearances: ${ch.id} の db_no が comics に無い: ${x.db_no}`);
      if (!x.role) err(`appearances: ${ch.id} のcomic項目に role が無い`);
    }
  }
}

// ---- otherSeries(MCU外シリーズ・24作+ディフェンダーズ視聴順) ----
{
  const o = load('otherSeries.json');
  if (o.defenders_order.items.length !== 13) {
    err(`otherSeries: defenders_order が 13 でない: ${o.defenders_order.items.length}`);
  }
  if (o.series.length !== 6) err(`otherSeries: ブロック数が 6 でない: ${o.series.length}`);
  for (const s of o.series) {
    for (const w of s.items) {
      const upcoming = /予定/.test(w.year || '');
      const req = upcoming ? ['title', 'year', 'desc'] : ['title', 'year', 'desc', 'syn', 'sp'];
      for (const k of req) {
        if (!w[k]) err(`otherSeries: ${s.id} "${w.title || '?'}" に ${k} が無い`);
      }
    }
  }
}

// ---- liveExtra(実写個別ページ用拡張データ・全68作品) ----
{
  const le = load('liveExtra.json');
  const wids = new Set(load('mcu.json').works.map((w) => w.id));
  const ids = Object.keys(le.works);
  if (ids.length !== 68) err(`liveExtra: 件数が 68 でない: ${ids.length}`);
  for (const id of ids) {
    if (!wids.has(id)) err(`liveExtra: mcu に無い id: ${id}`);
    const x = le.works[id];
    if (!x.director) err(`liveExtra: ${id} に director が無い`);
    for (const r of x.requires || []) if (!wids.has(r)) err(`liveExtra: ${id} の requires 不整合: ${r}`);
    for (const r of x.leads_to || []) if (!wids.has(r)) err(`liveExtra: ${id} の leads_to 不整合: ${r}`);
    for (const c of x.credits || []) {
      if (!['mid', 'post'].includes(c.pos)) err(`liveExtra: ${id} の credits.pos 不正: ${c.pos}`);
      if (!c.sp) err(`liveExtra: ${id} の credits に sp が無い`);
    }
    if (Array.isArray(x.credits) && x.credits.length === 0 && !x.note) {
      err(`liveExtra: ${id} は credits 空だが note が無い`);
    }
  }
}

// ---- timelineMap(あみだくじマップ・68作品全配置) ----
{
  const tm = load('timelineMap.json');
  const wids = new Set(load('mcu.json').works.map((w) => w.id));
  const lanes = new Set(tm.lanes.map((l) => l.id));
  const placed = [...tm.nodes.map((n) => n.work_id), ...tm.bars.map((b) => b.work_id)];
  if (placed.length !== 68) err(`timelineMap: 配置数が 68 でない: ${placed.length}`);
  const seen = new Set();
  for (const id of placed) {
    if (seen.has(id)) err(`timelineMap: 重複配置: ${id}`);
    seen.add(id);
    if (!wids.has(id)) err(`timelineMap: mcu に無い id: ${id}`);
  }
  for (const id of wids) if (!seen.has(id)) err(`timelineMap: 未配置の作品: ${id}`);
  for (const n of tm.nodes) if (!lanes.has(n.lane)) err(`timelineMap: ${n.work_id} の lane 不明: ${n.lane}`);
  for (const c of tm.cross_links) {
    if (!seen.has(c.from)) err(`timelineMap: cross_links.from 不整合: ${c.from}`);
    if (!seen.has(c.to)) err(`timelineMap: cross_links.to 不整合: ${c.to}`);
    if (!c.why) err(`timelineMap: cross_link ${c.from}→${c.to} に why が無い`);
  }
}

// ---- comicNavi(どこから読む?診断) ----
{
  const cn = load('comicNavi.json');
  const db = Object.fromEntries(load('comics.json').items.map((b) => [b.no, b]));
  const q1ids = cn.q1.options.map((o) => o.id);
  const rkeys = Object.keys(cn.results);
  if (q1ids.length !== rkeys.length || !q1ids.every((i) => rkeys.includes(i))) {
    err(`comicNavi: q1選択肢とresultsキーが不一致: [${q1ids}] vs [${rkeys}]`);
  }
  for (const [key, r] of Object.entries(cn.results)) {
    for (const p of [...(r.picks_any || []), ...(r.picks_paper || [])]) {
      if (!db[p.db]) err(`comicNavi: ${key} の db_no が存在しない: ${p.db}`);
      if (!p.why) err(`comicNavi: ${key} の db ${p.db} に why が無い`);
    }
    for (const p of r.picks_paper || []) {
      if (db[p.db] && db[p.db].status_code === 'D') {
        err(`comicNavi: ${key} の picks_paper に D区分(9/30消滅)が混入: db ${p.db} "${db[p.db].title}"`);
      }
    }
    if (!(r.picks_any || []).length || !(r.picks_paper || []).length) {
      err(`comicNavi: ${key} の picks_any / picks_paper が空`);
    }
  }
}

// ---- doomsdayRelations(相関図・35体) ----
{
  const r = load('doomsdayRelations.json');
  const enc = Object.fromEntries(load('encyclopedia.json').entries.map((x) => [x.id, x]));
  const gids = new Set(r.groups.map((g) => g.id));
  const nids = new Set(r.nodes.map((n) => n.id));
  if (r.nodes.length !== 35) err(`relations: node数が 35 でない: ${r.nodes.length}`);
  for (const n of r.nodes) {
    if (!enc[n.id]) err(`relations: encyclopedia に無い node: ${n.id}`);
    else if (!enc[n.id].tags.doomsday) err(`relations: ${n.id} は doomsday=true でない`);
    if (!gids.has(n.group)) err(`relations: ${n.id} の group 不明: ${n.group}`);
  }
  for (const x of r.edges) {
    if (!nids.has(x.from) || !nids.has(x.to)) err(`relations: edge端点不整合: ${x.from}→${x.to}`);
    if (!['family', 'love', 'ally', 'rival', 'mystery'].includes(x.type)) err(`relations: edge type 不正: ${x.type}`);
    if (x.type === 'mystery' && !x.label.includes('考察')) err(`relations: mysteryラベルに「考察」が無い: ${x.label}`);
  }
}

// ---- charaGoods(キャラ別グッズ・124キャラ網羅) ----
{
  const g = load('charaGoods.json');
  const encIds2 = new Set(load('encyclopedia.json').entries.map((x) => x.id));
  const keys = Object.keys(g.chars);
  if (keys.length !== 125) err(`goods: 件数が 125 でない: ${keys.length}`);
  for (const id of encIds2) if (!g.chars[id]) err(`goods: 未網羅のキャラ: ${id}`);
  for (const [id, v] of Object.entries(g.chars)) {
    if (!v.query) err(`goods: ${id} に query が無い`);
    for (const a of v.asins || []) {
      if (!/^B0[A-Z0-9]{8}$/.test(a)) err(`goods: ${id} の ASIN 形式不正: ${a}`);
    }
  }
}

// ---- streaming(配信状況・68作品網羅) ----
{
  const s = load('streaming.json');
  const wids = new Set(load('mcu.json').works.map((w) => w.id));
  const valid = [true, false, 'theater', 'upcoming', 'check'];
  const keys = Object.keys(s.works);
  if (keys.length !== 68) err(`streaming: 件数が 68 でない: ${keys.length}`);
  for (const id of wids) if (!(id in s.works)) err(`streaming: 未収録の作品: ${id}`);
  for (const [id, v] of Object.entries(s.works)) {
    if (!wids.has(id)) err(`streaming: mcu に無い id: ${id}`);
    if (!valid.includes(v.dplus)) err(`streaming: ${id} の dplus 値不正: ${JSON.stringify(v.dplus)}`);
  }
  for (const [k, v] of Object.entries(s.other || {})) {
    if (!valid.includes(v.dplus)) err(`streaming: other.${k} の dplus 値不正: ${JSON.stringify(v.dplus)}`);
  }
}

// ---- futureSlate(その先のロードマップ) ----
{
  const fsl = load('futureSlate.json');
  const wids = new Set(load('mcu.json').works.map((w) => w.id));
  if (!fsl.pre_text) err('futureSlate: pre_text が無い');
  for (const it of fsl.items) {
    for (const k of ['id', 'title', 'us_date', 'note']) {
      if (!it[k]) err(`futureSlate: ${it.id || '?'} に ${k} が無い`);
    }
    if (wids.has(it.id)) err(`futureSlate: ${it.id} は mcu.json に昇格済み(このリストから削除すること)`);
  }
}

// ---- 異常文字列チェック(全JSON: キリル文字・かな漢字に挟まれた英字の混入検出) ----
{
  // かな漢字に挟まれた小文字英字はタイポ・機械混入の疑い。スキーマ用語は除外
  const allowTokens = new Set(['sp', 'syn', 'desc', 'jp', 'id', 'no', 'db', 'ver', 'url', 'meta', 'tags', 'live', 'key', 'keys', 'note', 'eps', 'pos', 'mid', 'post', 'node', 'edge', 'label', 'type', 'query', 'until', 'en', 'row', 'lane', 'from', 'to', 'why']);
  for (const f of fs.readdirSync(DATA).filter((x) => x.endsWith('.json'))) {
    const raw = fs.readFileSync(path.join(DATA, f), 'utf8');
    const cyr = raw.match(/[а-яА-Я]+/);
    if (cyr) err(`${f}: キリル文字の混入疑い: "${cyr[0]}"`);
    for (const m of raw.matchAll(/[ぁ-んァ-ヶ一-龥]([a-z]{1,4})[ぁ-んァ-ヶ一-龥]/g)) {
      if (!allowTokens.has(m[1])) err(`${f}: かな漢字に挟まれた英字の混入疑い: "${m[0]}"`);
    }
  }
}

if (errors.length) {
  console.error(`\n✖ データ検証 失敗(${errors.length}件)— ビルドを中止します\n`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log("✔ データ検証 OK(glossary 298 / mcu 68 / comics 416 / encyclopedia 125 / cards 125)");
