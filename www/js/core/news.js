/*!
 * E4U — "What's new" after an update, and "Update now" when a new version is ready
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * NEWS is what is new in this version, in every interface language — rewritten at every release (npm run check
 * makes sure its version is the app's). A player who missed several versions sees only the latest one.
 * profile.seenVersion = the version whose news the player has seen; a new player (no progress yet) starts with the
 * current one, so the card is not shown to them.
 */
import { APP } from '../config.js';
import { getProfile, save } from './store.js';
import { T } from './i18n.js';
import { esc } from './util.js';
import { on, render, currentScreen } from './router.js';

export const NEWS = {
  v: '1.2.0',
  ru: [
    "Мой учебник: уроки 7 и 8 Complete Key for Schools — город и дорога, Past Simple, Turn left!, техника, Past Continuous, can / could.",
    "Готовы уроки 1–8.",
  ],
  sk: [
    "Moja učebnica: lekcie 7 a 8 Complete Key for Schools — mesto a cesta, Past Simple, Turn left!, technika, Past Continuous, can / could.",
    "Hotové sú lekcie 1–8.",
  ],
  uk: [
    "Мій підручник: уроки 7 і 8 Complete Key for Schools — місто й дорога, Past Simple, Turn left!, техніка, Past Continuous, can / could.",
    "Готові уроки 1–8.",
  ],
};

const fill = (key, v) => T(key).replace(' {v}', v ? ' ' + v : '');

/** The card on the home screen: once per new version, for players who used the app before. */
export function newsCard() {
  const P = getProfile();
  if (P.seenVersion === APP.version || NEWS.v !== APP.version) return '';
  const items = NEWS[document.documentElement.lang] || NEWS.ru;
  return `<div class="note news" role="status"><b>${esc(fill('newsT', APP.version))}</b>
    <ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul><button class="big ghost" data-act="newsok">${T('newsOk')}</button></div>`;
}

// a new version was downloaded while the app is open (the service worker took over): offer to restart on it
let ready = false, readyV = '';
export const updateBar = () => (ready
  ? `<div class="note signin" role="status">${esc(fill('updReady', readyV))}<button class="big" data-act="update">${T('updBtn')}</button></div>` : '');

export function initNews() {
  const P = getProfile();
  if (!P.seenVersion && !(P.xp > 0)) { P.seenVersion = APP.version; save(); }
  on('newsok', () => { getProfile().seenVersion = APP.version; save(); render(); });
  on('update', () => location.reload());
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;  // the first install is not an update
  navigator.serviceWorker.addEventListener('controllerchange', async () => {
    if (ready) return;
    try { readyV = ((await (await fetch('js/config.js', { cache: 'no-store' })).text()).match(/version: '([^']+)'/) || [])[1] || ''; } catch { readyV = ''; }
    if (readyV === APP.version) return;
    ready = true;
    if (currentScreen().name === 'home') render();
  });
}
