/*!
 * E4U — numbers and time: the words, built by rule (British English); tools/check.mjs compares them with examples
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Numbers 0 – 999 999 999 (and after hundreds: 342 = three hundred and forty-two), ordinals (21st = twenty-first),
 * the time (6:30 = half past six), dates (15.03. = the fifteenth of March), prices (£5.50 = five pounds fifty)
 * and years (1990 = nineteen ninety, 2026 = twenty twenty-six).
 * Typing: the app's keyboard has no hyphen, so every answer is also accepted with spaces (twenty five).
 */
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** 0–99: twenty-five */
function under100(n) { return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''); }
/** 0–999: three hundred and forty-two */
function under1000(n) {
  const h = Math.floor(n / 100), r = n % 100;
  return h ? `${ONES[h]} hundred${r ? ' and ' + under100(r) : ''}` : under100(r);
}

/** A number in words: 2025 = two thousand and twenty-five, 1500 = one thousand five hundred. */
export function word(n) {
  if (n === 0) return 'zero';
  const m = Math.floor(n / 1e6), k = Math.floor(n / 1000) % 1000, r = n % 1000, out = [];
  if (m) out.push(under1000(m) + ' million');
  if (k) out.push(under1000(k) + ' thousand');
  // "and" before the last part when it is below a hundred: two thousand and five
  if (r) out.push(r < 100 && (m || k) ? 'and ' + under100(r) : under1000(r));
  return out.join(' ');
}

/** The ways an answer may be written: with or without the hyphen (the app's keyboard has none), with or without "and"
 *  (American English), "a hundred" for "one hundred". */
export function variants(s) {
  const out = new Set([s]);
  for (const x of [...out]) out.add(x.replace(/ and /g, ' '));
  for (const x of [...out]) out.add(x.replace(/^one (hundred|thousand|million)/, 'a $1'));
  for (const x of [...out]) out.add(x.replace(/-/g, ' '));
  return [...out];
}

/** Digits with commas: 125,300 */
export const digits = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/* ---------- ordinals ---------- */
const ORD_SPECIAL = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
const ordOf = w => ORD_SPECIAL[w] || (w.endsWith('y') ? w.slice(0, -1) + 'ieth' : w + 'th');
/** 21 = twenty-first, 100 = one hundredth: only the last word changes */
export function ordinal(n) {
  const w = word(n), i = Math.max(w.lastIndexOf(' '), w.lastIndexOf('-'));
  return w.slice(0, i + 1) + ordOf(w.slice(i + 1));
}
/** 1st, 2nd, 3rd, 4th, 11th, 21st */
export const ordShort = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
/** Ordinals a learner might write: the plain number + -th (fiveth, twelveth, nineth, twenty-oneth), the number itself,
 *  -teen and -ty mixed up (fifteenth / fiftieth). */
export function ordinalWrong(n) {
  const w = word(n), i = Math.max(w.lastIndexOf(' '), w.lastIndexOf('-')), last = w.slice(i + 1), head = w.slice(0, i + 1);
  const out = [head + last + 'th', w, head + (last.endsWith('y') ? last + 'th' : last + 'th')];
  if (n >= 13 && n <= 19) out.push(ordinal((n - 10) * 10));
  if (n >= 30 && n <= 90 && n % 10 === 0) out.push(ordinal(n / 10 + 10));
  out.push(ordinal(n + 1), n > 1 ? ordinal(n - 1) : ordinal(n + 2));
  const right = ordinal(n);
  return [...new Set(out)].filter(x => x !== right);
}

/* ---------- the time: 6:30 = half past six ---------- */
export const TIME_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const hourAfter = h => (h % 12) + 1;
export const timeShown = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
export function timeWord(h, m) {
  if (m === 0) return `${ONES[h]} o’clock`;
  if (m === 15) return `a quarter past ${ONES[h]}`;
  if (m === 30) return `half past ${ONES[h]}`;
  if (m === 45) return `a quarter to ${ONES[hourAfter(h)]}`;
  return m < 30 ? `${under100(m)} past ${ONES[h]}` : `${under100(60 - m)} to ${ONES[hourAfter(h)]}`;
}
/** Also right: "quarter past six" without a, and the digital way — six thirty, six oh five. */
export function timeAlso(h, m) {
  const out = [timeWord(h, m).replace(/^a quarter/, 'quarter'), m === 0 ? ONES[h] : `${ONES[h]} ${m < 10 ? 'oh ' + ONES[m] : under100(m)}`];
  if (m && m < 10) out.push(`${ONES[h]} o ${ONES[m]}`);
  return out;
}
/** Other times that are easy to take for this one: the next hour (half past seven for 6:30 — "половина седьмого"),
 *  past and to swapped, five minutes more or less. Each is the word of another time, so it is surely wrong. */
export function timeNear(h, m) {
  const prev = h === 1 ? 12 : h - 1;
  const c = [[hourAfter(h), m], [h, (60 - m) % 60], [prev, m], [h, (m + 5) % 60], [h, (m + 55) % 60]];
  if (m === 0) c.push([h, 30]);
  const right = timeWord(h, m);
  return [...new Set(c.map(([a, b]) => timeWord(a, b)))].filter(x => x !== right);
}

/* ---------- dates: 15.03. = the fifteenth of March ---------- */
export const dateShown = (d, m) => `${d}. ${m}.`;
export const dateWord = (d, m) => `the ${ordinal(d)} of ${MONTHS[m - 1]}`;
export const dateAlso = (d, m) => [`${ordinal(d)} of ${MONTHS[m - 1]}`, `${MONTHS[m - 1]} the ${ordinal(d)}`, `${MONTHS[m - 1]} ${ordinal(d)}`];
/** Another month (the one before or after), the plain number (the fifteen of March), a wrong ordinal (the fiveth). */
export function dateWrong(d, m) {
  const next = (m % 12) + 1, prev = m === 1 ? 12 : m - 1, M = MONTHS[m - 1];
  const out = [dateWord(d, next), dateWord(d, prev), `the ${word(d)} of ${M}`, ...ordinalWrong(d).slice(0, 2).map(o => `the ${o} of ${M}`)];
  return [...new Set(out)].filter(x => x !== dateWord(d, m));
}

/* ---------- prices: £5.50 = five pounds fifty ---------- */
export const CURRENCIES = {
  '£': { one: 'pound', many: 'pounds', small: n => [`${word(n)} p`, `${word(n)} pence`], shownSmall: n => `${n}p` },
  '€': { one: 'euro', many: 'euros', small: n => [`${word(n)} ${n === 1 ? 'cent' : 'cents'}`], shownSmall: n => `€0.${String(n).padStart(2, '0')}` },
  '$': { one: 'dollar', many: 'dollars', small: n => [`${word(n)} ${n === 1 ? 'cent' : 'cents'}`], shownSmall: n => `$0.${String(n).padStart(2, '0')}` },
};
export const priceShown = (c, w, s) => (w ? `${c}${w}${s ? '.' + String(s).padStart(2, '0') : ''}` : CURRENCIES[c].shownSmall(s));
export function priceWord(c, w, s) {
  const C = CURRENCIES[c];
  if (!w) return C.small(s)[0];
  return `${word(w)} ${w === 1 ? C.one : C.many}${s ? ' ' + word(s) : ''}`;
}
/** Also right: "and" with the small coins named (five pounds and fifty pence), "a pound" for one pound. */
export function priceAlso(c, w, s) {
  const C = CURRENCIES[c], out = [];
  if (!w) return C.small(s).slice(1);
  const main = `${word(w)} ${w === 1 ? C.one : C.many}`;
  if (s) {
    const small = c === '£' ? (s === 1 ? 'penny' : 'pence') : (s === 1 ? 'cent' : 'cents');
    out.push(`${main} ${word(s)} ${small}`, `${main} and ${word(s)} ${small}`);
  }
  if (w === 1) out.push(...[priceWord(c, w, s), ...out].map(x => x.replace(/^one /, 'a ')));
  return out;
}

/* ---------- years: 1990 = nineteen ninety ---------- */
export function yearWord(y) {
  if (y >= 2000 && y <= 2009) return y === 2000 ? 'two thousand' : `two thousand and ${ONES[y - 2000]}`;
  const hi = Math.floor(y / 100), lo = y % 100;
  return `${under100(hi)} ${lo === 0 ? 'hundred' : lo < 10 ? 'oh ' + ONES[lo] : under100(lo)}`;
}
/** Also right: from 2010 the way of the 2000s (two thousand and twenty-six), "nineteen o five" with the letter o. */
export function yearAlso(y) {
  const out = [];
  if (y >= 2010 && y < 2100) out.push(word(y));
  if (y % 100 && y % 100 < 10 && !(y >= 2000 && y <= 2009)) out.push(yearWord(y).replace(' oh ', ' o '));
  return out;
}
