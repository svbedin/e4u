/*!
 * E4U — the daily training: one round of tasks from every section, earlier mistakes first
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Not a card among the sections (hidden): it is started from its own card at the top of the home screen.
 * Each task is asked by its own section (with that section's settings: tenses, stages, level) and carries
 * that section's progress in q.st, so a mistake is remembered there and comes back in that section too.
 * Its own progress: lastDay (YYYY-MM-DD, local) and days (how many days in a row).
 */
import strings from './strings.js';
import { T } from '../../core/i18n.js';
import { rnd } from '../../core/util.js';
import { sectionState } from '../../core/store.js';
import { dailyDone } from '../../core/push.js';

// the modes a section can be asked in here: choosing an answer, putting words in order, finding the mistake
// (typing, pairs and the dictation stay in the sections themselves)
const MODES = { verbs: ['quiz'], nouns: ['quiz'],
  phrases: ['quiz', 'fix', 'order', 'translate', 'dialog'] };

let R = null;  // this round: per section its mistakes still to ask, the keys asked, the last task
// the sections and their saved state: handed over by registry.js (no import back, to keep the modules from a cycle)
let SECTIONS = [], sectionStateOf = () => ({});

const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return today(d); };
const sections = () => SECTIONS.filter(s => !s.soon && !s.hidden && MODES[s.id]);

const state = () => sectionState('daily', { best: {}, mist: {}, lastDay: '', days: 0 });

/** The card at the top of the home screen: done today or not, and the days in a row. */
export function dailyCard() {
  const st = state(), done = st.lastDay === today(), going = done || st.lastDay === yesterday();
  // a second line: "✓ today · days in a row: 3"
  const line = [done ? `✓ ${T('dailyDone')}` : '', going && st.days ? `${T('dailyDays')}: <b>${st.days}</b>` : ''].filter(Boolean).join(' · ');
  return `<button class="sect main daily" data-act="play" data-v="daily:daily"><span class="glyph">★</span>
    <span class="grow"><b>${T('dailyT')}</b><span class="sub">${T('dailyD')}${line ? `<br>${line}` : ''}</span></span></button>`;
}

export default {
  id: 'daily',
  /** registry.js: the list of sections and how to read a section's state */
  connect(list, stateOf) { SECTIONS = list; sectionStateOf = stateOf; },
  hidden: true,
  glyph: '★',
  titleKey: 'dailyT',
  descKey: 'dailyD',
  strings,
  defaults: { best: {}, mist: {}, lastDay: '', days: 0 },
  modes: ['daily'],

  /** A new round: every section's mistakes (oldest first) wait to be asked first. */
  roundStart() {
    R = { per: Object.fromEntries(sections().map(S => [S.id, { due: Object.keys(sectionStateOf(S).mist), seen: new Set(), prev: null }])), turn: 0 };
  },

  question(mode, st, { review }) {
    if (!R) this.roundStart();
    const all = sections();
    // a section that still has mistakes to ask, taking turns; otherwise any section
    const withDue = all.filter(S => R.per[S.id].due.length);
    const S = withDue.length ? withDue[R.turn++ % withDue.length] : rnd(all);
    const sst = sectionStateOf(S), per = R.per[S.id];
    const modes = MODES[S.id].filter(m => S.modes.includes(m));
    const q = S.question(rnd(modes.length ? modes : ['quiz']), sst, { review, due: per.due, seen: per.seen, prev: per.prev });
    per.seen.add(q.key); per.prev = q;
    // the section's name first, so it is clear what is asked; the mistake belongs to that section —
    // also in the next steps of a task (find the mistake → fix it; the second gap)
    const own = x => ({ ...x, st: sst, sid: S.id, chips: [{ label: T(S.titleKey), kind: 'ghost' }, ...x.chips], then: x.then ? () => own(x.then()) : undefined });
    return own(q);
  },

  /** A round finished: done today; one more day in a row, or a new count. */
  onFinish(st) {
    const d = today();
    if (st.lastDay === d) return;
    st.days = st.lastDay === yesterday() ? (st.days || 0) + 1 : 1;
    st.lastDay = d;
    dailyDone();  // the reminder (if on) is not sent today
  },
};

