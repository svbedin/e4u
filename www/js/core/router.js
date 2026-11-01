/*!
 * E4U — screens, navigation and click actions
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * register('hub', params => html|void)   — a screen renders into #app
 * on('lang', (value, button) => {...})    — handler for <button data-act="lang" data-v="...">
 * go('hub', {section:'verbs'})            — navigate (adds a browser/Android back step)
 */
const screens = {};
const actions = {};
let current = { name: 'home', params: {} };
const leaveHooks = new Set();

export const app = () => document.getElementById('app');
export const register = (name, fn) => { screens[name] = fn; };
export const on = (act, fn) => { actions[act] = fn; };
export const currentScreen = () => current;
/** called before leaving any screen (timers etc.) */
export const onLeave = fn => leaveHooks.add(fn);

export function render() {
  const out = screens[current.name](current.params);
  if (typeof out === 'string') app().innerHTML = out;
}

let navAt = 0;  // when the screen last changed (see the taps below)
export function go(name, params = {}, { push = true, replace = false } = {}) {
  navAt = Date.now();
  leaveHooks.forEach(fn => fn());
  current = { name, params };
  try {
    const state = { name, params };
    if (replace || name === 'home') history.replaceState(state, '');
    else if (push) history.pushState(state, '');
  } catch (e) { /* history unavailable */ }
  render();
  window.scrollTo(0, 0);
}

/** Screens that can't be restored from history (a running game) fall back to this. */
const BACK_FALLBACK = { game: 'hub', result: 'hub' };

export function startRouter(first = 'home') {
  window.addEventListener('popstate', ev => {
    let s = ev.state || { name: 'home', params: {} };
    if (BACK_FALLBACK[s.name]) s = { name: BACK_FALLBACK[s.name], params: s.params };
    go(s.name, s.params, { push: false });
  });
  // one press counts once: some people tap a button twice or three times. A repeat of the same button within 0.4 s is
  // ignored, and so is a tap in the first 0.3 s on a new screen (the second tap of a double tap would land on whatever
  // button is there now). The letters of the typing keyboard are exempt: "ll" or "ss" are two real presses.
  const REPEAT_MS = 400, AFTER_NAV_MS = 300, TYPING = ['key', 'dk'];
  let last = { id: '', at: 0 };
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const fn = actions[b.dataset.act];
    if (!fn) return;
    const now = Date.now(), id = b.dataset.act + ':' + (b.dataset.v || '');
    if (!TYPING.includes(b.dataset.act)) {
      if (now - navAt < AFTER_NAV_MS) return;
      if (id === last.id && now - last.at < REPEAT_MS) return;
      last = { id, at: now };
    }
    fn(b.dataset.v, b);
  });
  go(first, {}, { replace: true });
}
