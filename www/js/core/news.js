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
  v: '0.12.0',
  ru: [
    "Мой учебник: слова и грамматика урока, который ты сейчас проходишь (Complete Key for Schools, уроки 1–4).",
    "Новые слова A2: 6 уроков существительных (тело и здоровье, покупки, город, работа, дом, аэропорт), 34 глагола и 47 прилагательных.",
    "Наречия: slow → slowly, good → well — новый этап в «Прилагательных».",
    "Новая версия включается кнопкой «Обновить сейчас».",
  ],
  sk: [
    "Moja učebnica: slovíčka a gramatika lekcie, ktorú práve preberáš (Complete Key for Schools, lekcie 1–4).",
    "Nové slová A2: 6 lekcií podstatných mien (telo a zdravie, nákupy, mesto, práca, domov, letisko), 34 slovies a 47 prídavných mien.",
    "Príslovky: slow → slowly, good → well — nová etapa v „Prídavných menách“.",
    "Novú verziu zapnete tlačidlom „Aktualizovať teraz“.",
  ],
  uk: [
    "Мій підручник: слова й граматика уроку, який ти зараз проходиш (Complete Key for Schools, уроки 1–4).",
    "Нові слова A2: 6 уроків іменників (тіло й здоров’я, покупки, місто, робота, дім, аеропорт), 34 дієслова і 47 прикметників.",
    "Прислівники: slow → slowly, good → well — новий етап у «Прикметниках».",
    "Нову версію вмикає кнопка «Оновити зараз».",
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
