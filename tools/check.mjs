/*!
 * E4U — data and translation check: `npm run check`
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * 1. data: every verb and noun row is complete, the forms look like English words, the meanings are there in ru / sk / uk;
 *    phrases: a gap's wrong forms differ from the answer; every task has its answer among the options
 * 2. translations: every interface string, grammar rule and privacy paragraph exists in every language of LANGS
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const WWW = join(ROOT, 'www');
const { LANGS } = await import('../www/js/core/i18n.js');
const EN = /^[a-z’ -]+$/i;  // English words: letters, the apostrophe, a space (ice cream), a hyphen
const problems = [];
const bad = (where, what) => problems.push(`${where}: ${what}`);
// the store reads the profile from localStorage: a memory one here
const memL = {};
globalThis.localStorage ??= { getItem: k => memL[k] ?? null, setItem: (k, v) => { memL[k] = v; }, removeItem: k => { delete memL[k]; } };
const { initStore, getProfile } = await import('../www/js/core/store.js');
initStore();
const meaning = (where, t) => { for (const l of LANGS) if (!t[l] || !String(t[l]).trim()) bad(where, `нет перевода (${l})`); };

// ---- 1. verbs ----
const { VERBS, STAGES, A2_STAGES, formFor, fits } = await import('../www/js/sections/verbs/data.js');
const vs = new Set();
for (const V of VERBS) {
  const w = `глагол «${V.v}»`;
  if (vs.has(V.v)) bad(w, 'повторяется'); vs.add(V.v);
  for (const f of [V.v, V.s, ...V.past, ...V.pp, ...V.ing]) if (!EN.test(f)) bad(w, `странная форма «${f}»`);
  if (V.v !== 'be' && V.v !== 'have' && !/s$/.test(V.s)) bad(w, `форма he / she «${V.s}» должна оканчиваться на -s`);
  if (!V.ing.every(f => f.endsWith('ing'))) bad(w, 'форма -ing должна оканчиваться на -ing');
  if (!V.irr && V.v !== 'be' && !V.past[0].endsWith('ed')) bad(w, `правильный глагол: Past Simple «${V.past}» должен оканчиваться на -ed`);
  meaning(w, V.t);
  for (const s of STAGES) if (fits(V, s)) for (const p of ['I', 'he', 'they']) { const f = formFor(V, s, p); if (!f.form || !EN.test(f.form)) bad(w, `нет формы (${s}, ${p})`); }
}

// ---- 2. nouns ----
const { NOUNS, wrongPlurals } = await import('../www/js/sections/nouns/data.js');
const ns = new Set();
for (const W of NOUNS) {
  const w = `существительное «${W.n}»`;
  if (ns.has(W.n)) bad(w, 'повторяется'); ns.add(W.n);
  if (!EN.test(W.n) || (W.pl && !EN.test(W.pl))) bad(w, 'странная форма');
  if (!['a', 'an'].includes(W.art)) bad(w, `артикль «${W.art}» — ожидается a или an`);
  // an before a vowel letter is the rule; the exceptions (an hour, a university) are written out and listed here
  const vowel = /^[aeiou]/.test(W.n), EXC = { hour: 'an', university: 'a', uniform: 'a', euro: 'a' };
  if (!(W.n in EXC) && (W.art === 'an') !== vowel) bad(w, `артикль «${W.art}» не совпадает с первой буквой — проверьте произношение`);
  if (W.pl && wrongPlurals(W).includes(W.pl)) bad(w, 'верное множественное число попало в неверные варианты');
  meaning(w, W.t);
}

// ---- 2b. numbers and time: the rules give the words of these examples ----
const N = await import('../www/js/sections/nums/data.js');
const EXAMPLES = [
  [N.word, [[0, 'zero'], [13, 'thirteen'], [15, 'fifteen'], [21, 'twenty-one'], [40, 'forty'], [99, 'ninety-nine'], [100, 'one hundred'],
    [101, 'one hundred and one'], [342, 'three hundred and forty-two'], [1000, 'one thousand'], [1500, 'one thousand five hundred'],
    [2025, 'two thousand and twenty-five'], [25000, 'twenty-five thousand'], [125300, 'one hundred and twenty-five thousand three hundred'],
    [1000000, 'one million'], [2500000, 'two million five hundred thousand']]],
  [N.ordinal, [[1, 'first'], [2, 'second'], [3, 'third'], [4, 'fourth'], [5, 'fifth'], [8, 'eighth'], [9, 'ninth'], [12, 'twelfth'], [20, 'twentieth'],
    [21, 'twenty-first'], [22, 'twenty-second'], [23, 'twenty-third'], [30, 'thirtieth'], [31, 'thirty-first'], [40, 'fortieth'], [100, 'one hundredth']]],
  [N.ordShort, [[1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [11, '11th'], [12, '12th'], [13, '13th'], [21, '21st'], [22, '22nd'], [23, '23rd'], [31, '31st']]],
  [([h, m]) => N.timeWord(h, m), [[[6, 0], 'six o’clock'], [[6, 5], 'five past six'], [[6, 15], 'a quarter past six'], [[6, 25], 'twenty-five past six'],
    [[6, 30], 'half past six'], [[6, 45], 'a quarter to seven'], [[6, 50], 'ten to seven'], [[12, 45], 'a quarter to one'], [[12, 30], 'half past twelve']]],
  [([d, m]) => N.dateWord(d, m), [[[1, 3], 'the first of March'], [[22, 12], 'the twenty-second of December'], [[31, 5], 'the thirty-first of May']]],
  [([c, w, s]) => N.priceWord(c, w, s), [[['£', 5, 50], 'five pounds fifty'], [['£', 1, 0], 'one pound'], [['£', 0, 80], 'eighty p'],
    [['€', 2, 99], 'two euros ninety-nine'], [['$', 12, 30], 'twelve dollars thirty'], [['€', 0, 50], 'fifty cents']]],
  [N.yearWord, [[1990, 'nineteen ninety'], [1905, 'nineteen oh five'], [1900, 'nineteen hundred'], [2000, 'two thousand'],
    [2005, 'two thousand and five'], [2026, 'twenty twenty-six'], [1066, 'ten sixty-six']]],
];
for (const [f, list] of EXAMPLES) for (const [x, want] of list) { const got = f(x); if (got !== want) bad('числа', `${JSON.stringify(x)}: «${got}», а должно быть «${want}»`); }
for (let n = 0; n <= 1000000; n += n < 2000 ? 1 : 997) if (!EN.test(N.word(n))) bad('числа', `странное слово для ${n}: «${N.word(n)}»`);

// ---- 2c. adjectives: every row complete, the wrong forms are not right ones ----
const { ADJ, compWrong, supWrong } = await import('../www/js/sections/adj/data.js');
const as = new Set();
for (const A of ADJ) {
  const w = `прилагательное «${A.a}»`;
  if (as.has(A.a)) bad(w, 'повторяется'); as.add(A.a);
  for (const f of [A.a, ...A.comp, ...A.sup, ...A.opp]) if (!EN.test(f)) bad(w, `странная форма «${f}»`);
  if (A.comp.length !== A.sup.length || (A.comp.length && A.comp.some(f => !/er$|^more /.test(f) && !['better', 'worse'].includes(f)))) bad(w, 'проверьте сравнительную степень');
  if (A.comp.length && (compWrong(A).some(f => A.comp.includes(f)) || supWrong(A).some(f => A.sup.includes(f)))) bad(w, 'верная форма попала в неверные варианты');
  if (A.comp.length && (compWrong(A).length < 2 || supWrong(A).length < 2)) bad(w, 'мало неверных вариантов');
  meaning(w, A.t);
}

// ---- 2d. pronouns: every sentence has its gap, the wrong forms differ from the answer, translations ----
const { SENT } = await import('../www/js/sections/pron/index.js');
for (const S of SENT) {
  const w = `местоимение «${S.full}»`;
  if (!S.a || !S.w.length || S.w.includes(S.a) || new Set(S.w).size !== S.w.length) bad(w, 'проверьте пропуск и неверные варианты');
  meaning(w, S.t);
}

// ---- 3. phrases ----
const { PHRASES, DIALOGS, TOPICS } = await import('../www/js/sections/phrases/index.js');
// every lesson topic has a name in every language and enough phrases to play it on its own
const phStr = (await import('../www/js/sections/phrases/strings.js')).default;
for (const t of TOPICS) {
  for (const l of LANGS) if (!phStr[l]?.['phTopic' + t]) bad(`тема фраз ${t}`, `нет названия (${l})`);
  const n = PHRASES.filter(P => P.topic === t).length;
  if (n < 10) bad(`тема фраз ${t}`, `фраз ${n} — нужно не меньше 10`);
}
const ps = new Set();
for (const P of PHRASES) {
  const w = `фраза «${P.full}»`;
  if (ps.has(P.key)) bad(w, 'повторяется'); ps.add(P.key);
  if (!P.gaps.length) bad(w, 'нет пропуска');
  for (const g of P.gaps) {
    if (!g.w.length) bad(w, `у пропуска «${g.a}» нет неверных вариантов`);
    if (g.w.includes(g.a)) bad(w, `неверный вариант совпадает с ответом «${g.a}»`);
    if (new Set(g.w).size !== g.w.length) bad(w, 'неверные варианты повторяются');
  }
  meaning(w, P.t);
}
for (const D of DIALOGS) {
  const w = `диалог «${D.line}»`;
  if (D.wrong.length !== 3) bad(w, `неверных ответов ${D.wrong.length} вместо 3`);
  if (D.wrong.includes(D.reply)) bad(w, 'неверный ответ совпадает с верным');
  meaning(w, D.t);
  for (const l of LANGS) if (!String(D.t[l]).includes(' — ')) bad(w, `перевод (${l}) должен быть «реплика — ответ»`);
}

// ---- 4. every task has its answer among the options, no option twice; at A1 no A2 stage is asked ----
const SECTIONS = {
  verbs: [(await import('../www/js/sections/verbs/index.js')).default, { stages: [...STAGES], mist: {} }],
  nouns: [(await import('../www/js/sections/nouns/index.js')).default, { stages: ['art', 'pl'], mist: {} }],
  phrases: [(await import('../www/js/sections/phrases/index.js')).default, { mist: {} }],
  // lesson topics picked: 2 and 11 (11 is A2 — at A1 only topic 2 is asked)
  adj: [(await import('../www/js/sections/adj/index.js')).default, { stages: ['mean', 'opp', 'comp', 'sup'], mist: {} }],
  pron: [(await import('../www/js/sections/pron/index.js')).default, { stages: ['forms', 'sent', 'refl'], mist: {} }],
  nums: [(await import('../www/js/sections/nums/index.js')).default, { stages: ['n100', 'big', 'ord', 'time', 'date', 'price', 'year'], mist: {} }],
  'phrases-topic': [(await import('../www/js/sections/phrases/index.js')).default, { topics: [2, 11], mist: {} }],
};
for (const level of ['a1', 'a2']) {
  getProfile().level = level;
  for (const [id, [S, st]] of Object.entries(SECTIONS)) for (const mode of S.modes.filter(m => !['match', 'dict'].includes(m))) for (let i = 0; i < 60; i++) {
    let q = S.question(mode === 'blitz' ? 'quiz' : mode, st, { seen: new Set() });
    for (let step = 0; q && step < 3; step++) {
      if (q.options && !q.order) {
        if (!q.options.some(o => o.value === q.answer)) bad(`${id} (${mode})`, `нет верного ответа среди вариантов: ${q.key}`);
        if (new Set(q.options.map(o => String(o.value).toLowerCase())).size !== q.options.length) bad(`${id} (${mode})`, `повтор варианта: ${q.key}`);
      }
      if (level === 'a1' && id === 'pron' && /self\b|selves\b/.test(q.answer)) bad('местоимения', `myself (A2) спрашивается при уровне A1: ${q.key}`);
      if (level === 'a1' && id === 'adj' && /^(comp|sup):/.test(q.key)) bad('прилагательные', `сравнение (A2) спрашивается при уровне A1: ${q.key}`);
      if (level === 'a1' && id === 'verbs' && q._raw && A2_STAGES.includes(q._raw.s)) bad('глаголы', `этап A2 «${q._raw.s}» спрашивается при уровне A1`);
      q = q.then ? q.then() : null;
    }
  }
  for (const id of ['verbs', 'nouns', 'adj', 'pron', 'nums']) { const [S, st] = SECTIONS[id]; const m = S.matchSet(st, {}); if (m.pairs.length < 4) bad(`${id} (пары)`, `пар ${m.pairs.length}`); }
}

// ---- 6. translations ----
function sameKeys(where, dict) {
  const all = new Set(LANGS.flatMap(l => Object.keys(dict[l] || {})));
  for (const l of LANGS) for (const k of all) {
    const s = dict[l] && dict[l][k];
    if (typeof s !== 'string' || !s.trim()) bad(where, `строка «${k}» отсутствует или пустая (${l})`);
  }
}
const src = await readFile(join(WWW, 'js/core/i18n.js'), 'utf8');
const start = src.indexOf('const STR = '), end = src.indexOf('\n};', start);
if (start < 0 || end < 0) bad('core/i18n.js', 'не найден объект STR'); else sameKeys('core/i18n.js', new Function(`return ${src.slice(start + 12, end + 2)}`)());
for (const s of ['verbs', 'nouns', 'adj', 'pron', 'nums', 'phrases', 'daily']) sameKeys(`sections/${s}/strings.js`, (await import(`../www/js/sections/${s}/strings.js`)).default);
{
  const { GRAMMAR } = await import('../www/js/screens/grammar-data.js');
  const ids = new Set();
  for (const g of GRAMMAR) {
    if (ids.has(g.id)) bad('screens/grammar-data.js', `правило «${g.id}» повторяется`); ids.add(g.id);
    for (const l of LANGS) {
      if (!g.title[l]) bad('screens/grammar-data.js', `«${g.id}»: нет заголовка (${l})`);
      if (!g.text[l] || g.text[l].length !== g.text.ru.length) bad('screens/grammar-data.js', `«${g.id}»: абзацы на ${l} не совпадают с русским`);
    }
    for (const [en, t] of g.ex) for (const l of LANGS) if (!t[l]) bad('screens/grammar-data.js', `«${g.id}»: пример «${en}» без перевода (${l})`);
  }
}
const { PRIVACY } = await import('../www/js/screens/privacy.js');
const shape = l => (PRIVACY[l] || []).map(p => (p.match(/\*\*/g) || []).length).join(',');
for (const l of LANGS) {
  if (!PRIVACY[l] || !PRIVACY[l].length) bad('screens/privacy.js', `нет текста (${l})`);
  else if (shape(l) !== shape('ru')) bad('screens/privacy.js', `абзацы на ${l} не совпадают с русским`);
}

// ---- result ----
console.log(`Глаголов: ${VERBS.length} (A1: ${VERBS.filter(V => V.a).length}, неправильных: ${VERBS.filter(V => V.irr).length}) · существительных: ${NOUNS.length} · фраз: ${PHRASES.length}, диалогов: ${DIALOGS.length}`);
if (problems.length) { console.log(`Проблем: ${problems.length}`); for (const p of problems) console.log('  - ' + p); process.exit(1); }
console.log('Проверка пройдена: данные и переводы в порядке.');
