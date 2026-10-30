/*!
 * E4U — section "Numbers and time" (A1): numbers in words, ordinals, the time, dates, prices, years, by ear
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Implements the section contract described in ARCHITECTURE.md. The words are built by rule in data.js.
 * A task key names what is asked, so a mistake comes back as the same task: "n:47" (a number), "o:21" (an ordinal),
 * "t:6:30" (the time), "d:15:3" (a date), "p:£:5:50" (a price), "y:1990" (a year).
 * In the order of the A1 coursebooks: numbers in unit 1–2, the time in unit 2, prices in unit 4, dates and years in unit 8.
 */
import { word, variants, digits, ordinal, ordShort, ordinalWrong, MONTHS, MONTH_DAYS, TIME_MINUTES, timeShown, timeWord, timeAlso, timeNear,
  dateShown, dateWord, dateAlso, dateWrong, CURRENCIES, priceShown, priceWord, priceAlso, yearWord, yearAlso } from './data.js';
import strings from './strings.js';
import { T } from '../../core/i18n.js';
import { rnd, shuf, esc } from '../../core/util.js';
import { canSpeak } from '../../core/speech.js';

export const STAGES = ['n100', 'big', 'ord', 'time', 'date', 'price', 'year'];
const STAGE_KEY = { n100: 'num100', big: 'numBig', ord: 'numOrd', time: 'numTime', date: 'numDate', price: 'numPrice', year: 'numYear' };
// the dictation is typed on a keypad of digits: whole numbers and years only
const DICT_STAGES = ['n100', 'big', 'year'];
const MAX = 1e6;
const between = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const KIND = { n: n => (n <= 100 ? 'n100' : 'big'), o: () => 'ord', t: () => 'time', d: () => 'date', p: () => 'price', y: () => 'year' };

/** A task from its key: { key, kind, … } with what is shown, the answer, what is also right and what is wrong; null if not valid. */
function item(key) {
  const [k, a, b, c] = key.split(':');
  if (k === 'n' && +a >= 0 && +a <= MAX) {
    const n = +a;
    return { key, stage: KIND.n(n), n, shown: digits(n), right: word(n), also: [], wrong: () => near(n).map(word).concat(spellTrap(word(n))), digitsOnly: true };
  }
  if (k === 'o' && +a >= 1 && +a <= 100) {
    const n = +a;
    return { key, stage: 'ord', shown: ordShort(n), right: ordinal(n), also: [], wrong: () => ordinalWrong(n) };
  }
  if (k === 't' && +a >= 1 && +a <= 12 && TIME_MINUTES.includes(+b)) {
    const h = +a, m = +b;
    return { key, stage: 'time', shown: timeShown(h, m), right: timeWord(h, m), also: timeAlso(h, m), wrong: () => timeNear(h, m) };
  }
  if (k === 'd' && +b >= 1 && +b <= 12 && +a >= 1 && +a <= MONTH_DAYS[+b - 1]) {
    const d = +a, m = +b;
    return { key, stage: 'date', shown: dateShown(d, m), right: dateWord(d, m), also: dateAlso(d, m), wrong: () => dateWrong(d, m) };
  }
  if (k === 'p' && CURRENCIES[a] && +b >= 0 && +b <= 100 && +c >= 0 && +c <= 99 && (+b || +c)) {
    const cur = a, w = +b, s = +c;
    return { key, stage: 'price', shown: priceShown(cur, w, s), right: priceWord(cur, w, s), also: priceAlso(cur, w, s), wrong: () => priceNear(cur, w, s) };
  }
  if (k === 'y' && +a >= 1000 && +a <= 2099) {
    const y = +a;
    return { key, stage: 'year', y, shown: String(y), right: yearWord(y), also: yearAlso(y), digitsOnly: true,
      wrong: () => [y + 10, y - 10, y + 1, y - 1, swapYear(y)].filter(x => x !== y && x >= 1000 && x <= 2099).map(yearWord) };
  }
  return null;
}

/** Numbers easy to mix up with n: neighbours, ±10, the digits swapped, -teen and -ty (14 / 40), ±100;
 *  for big ones ten times more or less (2,500 / 25,000) and the next step up or down. */
function near(n) {
  const c = new Set();
  if (n <= 1000) {
    [n + 1, n - 1, n + 10, n - 10, n + 2, n + 100, n - 100].forEach(x => c.add(x));
    const t = Math.floor(n / 10) % 10, u = n % 10, h = Math.floor(n / 100);
    if (n >= 10 && n < 100 && u) c.add(u * 10 + t);
    if (n > 12 && n < 20) c.add((n - 10) * 10);
    if (n >= 30 && n < 100 && !u) c.add(n / 10 + 10);
    if (h && n % 100 >= 10) c.add(h * 100 + u * 10 + t);
    return shuf([...c].filter(x => x >= 0 && x <= 1000 && x !== n)).slice(0, 3);
  }
  const mag = 10 ** Math.floor(Math.log10(n));
  [n * 10, n / 10, n + mag, n - mag, n + mag / 10, n - mag / 10].forEach(x => c.add(x));
  return shuf([...c].filter(x => Number.isInteger(x) && x > 100 && x <= MAX && x !== n)).slice(0, 3);
}
/** The spellings learners get wrong: fourty, fiveteen, fivety, ninty, eightteen. */
const TRAPS = [['forty', 'fourty'], ['fifteen', 'fiveteen'], ['fifty', 'fivety'], ['ninety', 'ninty'], ['eighteen', 'eightteen'], ['twelve', 'twelf']];
function spellTrap(w) { const t = TRAPS.find(([a]) => w.includes(a)); return t ? [w.replace(t[0], t[1])] : []; }
const swapYear = y => Math.floor(y / 100) * 100 + (y % 10) * 10 + Math.floor(y / 10) % 10;
/** Other prices easy to take for this one: fifteen / fifty, the two numbers swapped, one more or less. */
function priceNear(c, w, s) {
  const L = [[w + 1, s], [w ? w - 1 : 1, s], [w, s === 50 ? 15 : s === 15 ? 50 : (s + 10) % 100], [s && s <= 20 ? s : w + 2, w <= 99 ? w : s]];
  const right = priceWord(c, w, s);
  return [...new Set(L.filter(([a, b]) => a || b).map(([a, b]) => priceWord(c, a, b)))].filter(x => x !== right);
}

/** A new task of one of the stages picked. */
function fresh(st) {
  const s = rnd(st.stages);
  if (s === 'n100') return item(`n:${between(0, 100)}`);
  if (s === 'big') {
    const r = Math.random();
    const n = r < 0.4 ? between(101, 999) : r < 0.7 ? between(1001, 9999) : r < 0.9 ? between(10, 999) * (Math.random() < 0.5 ? 1000 : 100) : between(1, 10) * 1e6;
    return item(`n:${Math.min(n, MAX)}`);
  }
  // ordinals: mostly the days of a month (1–31), sometimes the tens up to 100
  if (s === 'ord') return item(`o:${Math.random() < 0.8 ? between(1, 31) : between(4, 10) * 10}`);
  if (s === 'time') return item(`t:${between(1, 12)}:${rnd(TIME_MINUTES)}`);
  if (s === 'date') { const m = between(1, 12); return item(`d:${between(1, MONTH_DAYS[m - 1] === 29 ? 28 : MONTH_DAYS[m - 1])}:${m}`); }
  if (s === 'price') {
    const c = rnd(Object.keys(CURRENCIES)), r = Math.random();
    // pounds and pence (£5.50), whole pounds (£20), only pence (80p)
    const w = r < 0.85 ? rnd([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 50, 99]) : 0;
    const sm = r < 0.6 || !w ? rnd([10, 20, 25, 30, 40, 45, 50, 60, 75, 80, 90, 95, 99]) : 0;
    return item(`p:${c}:${w}:${sm}`);
  }
  // years: mostly the 20th century and now (born in 1990, in 2026), sometimes older ones
  const r = Math.random();
  return item(`y:${r < 0.5 ? between(1950, 1999) : r < 0.85 ? between(2000, 2030) : between(1066, 1949)}`);
}

/** An earlier mistake first; in "Review mistakes" only those; never the same task twice in a round. */
function pick(st, review, due, seen) {
  while (due && due.length) { const it = item(due.shift()); if (it && st.stages.includes(it.stage)) return { ...it, due: true }; }
  if (review) {
    const L = Object.keys(st.mist).map(item).filter(it => it && st.stages.includes(it.stage));
    const left = L.filter(it => !seen || !seen.has(it.key));
    if (left.length || L.length) return rnd(left.length ? left : L);
  }
  for (let i = 0; i < 50; i++) { const it = fresh(st); if (!seen || !seen.has(it.key)) return it; }
  return fresh(st);
}

const chips = s => [{ label: T(STAGE_KEY[s]), kind: 'ghost' }];

export default {
  id: 'nums',
  glyph: '25',
  titleKey: 'nums',
  descKey: 'numD',
  strings,
  defaults: { stages: [...STAGES], best: {}, mist: {} },
  // the dictation needs an English voice
  get modes() { return ['quiz', 'type', 'match', 'blitz', ...(canSpeak() ? ['dict'] : [])]; },
  modeDesc: { quiz: 'numQuizD', type: 'numTypeD', dict: 'numDictD' },

  normalize(st) {
    st.stages = (st.stages || []).filter(s => STAGES.includes(s));
    if (!st.stages.length) st.stages = [...STAGES];
  },

  settingsHTML(st) {
    return `<div class="group"><span class="label">${T('numStages')}</span>
      <div class="chips">${STAGES.map(s => `<button class="chip" data-act="nums:stage" data-v="${s}" aria-pressed="${st.stages.includes(s)}">${T(STAGE_KEY[s])}</button>`).join('')}</div></div>`;
  },

  summary() { return `0 … 1,000,000 · 6:30 · 15. 3. · £5.50 · 1990 · A1`; },

  init({ on, st, save, rerender }) {
    on('nums:stage', v => { const s = st(), i = s.stages.indexOf(v); if (i >= 0) { if (s.stages.length > 1) s.stages.splice(i, 1); } else s.stages.push(v); save(); rerender(); });
  },

  question(mode, st, { review, due, seen }) {
    // the dictation: only the stages with whole numbers (a keypad of digits)
    const dst = mode === 'dict' ? { ...st, stages: st.stages.filter(x => DICT_STAGES.includes(x)) } : st;
    if (mode === 'dict' && !dst.stages.length) dst.stages = ['n100'];
    const it = pick(dst, review, due, seen);
    const common = { key: it.key, due: !!it.due, chips: chips(it.stage), title: '', subtitle: '' };
    const accepted = [it.right, ...it.also].flatMap(variants);
    if (mode === 'dict') {
      // the number or the year is said; type it in digits
      const n = it.stage === 'year' ? it.y : it.n;
      return { ...common, chips: [{ label: T('numListen'), kind: 'ghost' }], say: '', main: () => '<div class="pron">?</div>', keypad: true, listen: it.right, options: null,
        answer: String(n), accepted: [String(n)], display: `${it.shown} — ${it.right}`, sayAfter: it.right, mistake: { text: `${T('numListen')}: ${it.right}`, form: it.shown } };
    }
    // the shown form → the words (typing always; quiz and blitz mostly); numbers and years also the other way, words → digits
    if (it.digitsOnly && mode !== 'type' && Math.random() < 0.35) {
      const year = it.stage === 'year', val = year ? it.y : it.n;
      const others = year ? shuf([val + 10, val - 10, val + 1, val - 1, swapYear(val)].filter(x => x !== val && x >= 1000 && x <= 2099)).slice(0, 3) : near(val);
      const opts = shuf([...new Set([val, ...others])]).map(x => (year ? String(x) : digits(x)));
      return { ...common, say: it.right, main: () => `<div class="phrase">${esc(it.right)}</div>`,
        options: opts.map(x => ({ label: x, value: x })), answer: it.shown, display: `${it.shown} — ${it.right}`, sayAfter: it.right,
        mistake: { text: it.right, form: it.shown } };
    }
    const wrong = shuf([...new Set(it.wrong())].filter(w => !accepted.includes(w))).slice(0, 3);
    const opts = shuf([it.right, ...wrong]);
    return { ...common, say: '',
      main: () => `<div class="pron"${it.shown.length > 8 ? ' style="font-size:clamp(26px,8.5vw,40px);white-space:nowrap"' : ''}>${esc(it.shown)}</div><p class="label" style="margin:6px 0 0">${T('numHow')}</p>`,
      // long answers (a quarter to seven, the twenty-second of December) one per row, so they fit on a phone
      wide: opts.some(x => x.length > 14),
      options: mode === 'type' ? null : opts.map(f => ({ label: esc(f), value: f })),
      answer: it.right, accepted, display: it.right, sayAfter: it.right, mistake: { text: it.shown, form: it.right } };
  },

  /** Pairs: six numbers, times, dates, prices or years and their words. */
  matchSet(st, { review, due }) {
    const items = [], seen = new Set();
    for (let i = 0; i < 60 && items.length < 6; i++) {
      const it = pick(st, review, due, seen);
      if (seen.has(it.key) || items.some(x => x.right === it.right)) continue;
      seen.add(it.key); items.push(it);
    }
    return {
      key: items[0].key, due: items.some(it => it.due), chips: [], title: T('nums'), subtitle: '', say: '', hint: T('numPairs'),
      pairs: items.map(it => ({ key: it.key, left: esc(it.shown), right: it.right, mistake: { text: it.shown, form: it.right } })),
    };
  },

  referenceTitleKey: 'numRef',
  mountReference(el) {
    const say = w => (canSpeak() ? ` class="sayf" data-act="say" data-v="${esc(w)}"` : '');
    const row = (a, b) => `<tr><td>${esc(a)}</td><td${say(b)}>${esc(b)}</td></tr>`;
    const block = (title, rows, note = '', open = false) => `<details class="v"${open ? ' open' : ''}><summary>${title}</summary><div class="tables">${note ? `<p class="note" style="margin:0 0 8px">${note}</p>` : ''}<table>${rows.join('')}</table></div></details>`;
    const nums = list => list.map(n => row(digits(n), word(n)));
    const range = (a, b, step = 1) => { const r = []; for (let i = a; i <= b; i += step) r.push(i); return r; };
    el.innerHTML = `<p class="note">${T('numRefNote')}</p><div class="vlist">
      ${block('0 – 20', nums(range(0, 20)), '', true)}${block('20 – 100', nums([...range(20, 100, 10), 21, 35, 47, 99]))}
      ${block('100 – 1,000,000', nums([100, 101, 115, 342, 999, 1000, 1500, 2025, 10000, 25000, 125300, 1000000]))}
      ${block(T('numOrd'), [...range(1, 31), 40, 50, 100].map(n => row(ordShort(n), ordinal(n))), T('numOrdNote'))}
      ${block(T('numTime'), TIME_MINUTES.map(m => row(timeShown(6, m), timeWord(6, m))), T('numTimeNote'))}
      ${block(T('numDate'), [[1, 1], [2, 2], [3, 3], [15, 3], [22, 12], [31, 5]].map(([d, m]) => row(dateShown(d, m), dateWord(d, m))).concat(MONTHS.map((M, i) => row(String(i + 1), M))), T('numDateNote'))}
      ${block(T('numPrice'), [['£', 5, 50], ['£', 1, 0], ['£', 0, 80], ['£', 12, 99], ['€', 2, 99], ['€', 0, 50], ['$', 12, 30], ['$', 100, 0]].map(([c, w, s]) => row(priceShown(c, w, s), priceWord(c, w, s))), T('numPriceNote'))}
      ${block(T('numYear'), [1066, 1900, 1905, 1990, 1999, 2000, 2005, 2010, 2026].map(y => row(String(y), yearWord(y))), T('numYearNote'))}</div>`;
  },
};
