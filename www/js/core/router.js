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

export function go(name, params = {}, { push = true, replace = false } = {}) {
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
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const fn = actions[b.dataset.act];
    if (fn) fn(b.dataset.v, b);
  });
  go(first, {}, { replace: true });
}
