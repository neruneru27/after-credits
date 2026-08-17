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
  const validCats = ['sekai', 'chimei', 'soshiki', 'item', 'power', 'pub', 'mcu'];
  const catKeys = Object.keys(g.cats || {});
  if (catKeys.length !== 7 || !validCats.every((c) => catKeys.includes(c))) {
    err(`glossary: cats が正規7種と不一致: ${catKeys.join(',')}`);
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
  if (g.terms.length !== 149) err(`glossary: terms 件数が 149 でない: ${g.terms.length}`);
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

// ---- characters(詳細17体) ----
{
  const c = load('characters.json');
  if (c.characters.length !== 17) err(`characters: 件数が 17 でない: ${c.characters.length}`);
  const seen = new Set();
  for (const ch of c.characters) {
    if (seen.has(ch.id)) err(`characters: id 重複: ${ch.id}`);
    seen.add(ch.id);
  }
}

// ---- charaCards(検索カード56枚) ----
{
  const c = load('charaCards.json');
  if (c.cards.length !== 56) err(`charaCards: 件数が 56 でない: ${c.cards.length}`);
  for (const card of c.cards) {
    if (!['c', 'm', 'y', 'k'].includes(card.badge)) {
      err(`charaCards: "${card.name}" の badge 不正: ${card.badge}`);
    }
  }
}

if (errors.length) {
  console.error(`\n✖ データ検証 失敗(${errors.length}件)— ビルドを中止します\n`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('✔ データ検証 OK(glossary 149 / mcu 68 / comics 416 / characters 17 / cards 56)');
