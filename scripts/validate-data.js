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
  if (g.terms.length !== 296) err(`glossary: terms 件数が 296 でない: ${g.terms.length}`);
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
  if (e.entries.length !== 124) err(`encyclopedia: 件数が 124 でない: ${e.entries.length}`);
  const factions = Object.keys(e.meta.filters.faction);
  const origins = Object.keys(e.meta.filters.origin);
  const seriesKeys = Object.keys(e.meta.filters.series);
  for (const ch of e.entries) {
    if (encIds.has(ch.id)) err(`encyclopedia: id 重複: ${ch.id}`);
    encIds.add(ch.id);
    if (!ch.comic) err(`encyclopedia: ${ch.id} に comic が無い`);
    if (!Array.isArray(ch.live_versions) || ch.live_versions.length < 1) {
      err(`encyclopedia: ${ch.id} の live_versions が空`);
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
  if (c.cards.length !== 124) err(`charaCards: 件数が 124 でない: ${c.cards.length}`);
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
  for (const s of o.series) {
    for (const w of s.items) {
      for (const k of ['title', 'year', 'desc', 'syn', 'sp']) {
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

// ---- 異常文字列チェック(全JSON: キリル文字・かな漢字に挟まれた英字の混入検出) ----
{
  // かな漢字に挟まれた小文字英字はタイポ・機械混入の疑い。スキーマ用語は除外
  const allowTokens = new Set(['sp', 'syn', 'desc', 'jp', 'id', 'no', 'db', 'ver', 'url', 'meta', 'tags', 'live', 'key', 'keys', 'note', 'eps', 'pos', 'mid', 'post']);
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
console.log("✔ データ検証 OK(glossary 296 / mcu 68 / comics 416 / encyclopedia 124 / cards 124)");
