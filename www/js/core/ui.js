/*!
 * E4U — shared UI pieces
 * Copyright (c) 2026 Serg. All rights reserved.
 */
import { T, LANGS, getLang } from './i18n.js';
import { getProfile } from './store.js';
import { canSpeak } from './speech.js';
import { esc } from './util.js';

export const XP_PER_LEVEL = 250;

export const ICON = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.5 1.1 4.3 2.4.8-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor"/></svg>',
  tiles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 15h9"/><rect x="14" y="10" width="7" height="8" rx="2" fill="currentColor"/><path d="M3 9h9"/></svg>',
  type: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>',
  match: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 6.5l10 11M7 17.5l10-11"/></svg>',
  blitz: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
  fix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7h5M11 7h10M3 13h10M3 19h6"/><path d="M15 12l5 5M20 12l-5 5"/></svg>',
  translate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h9M7.5 3v2M5 5c0 4 3 7 6 8M10 5c0 4-3 7-6 8"/><path d="M13 21l4-9 4 9M14.5 18h5"/></svg>',
  dialog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 4h12v8H8l-5 4z"/><path d="M15 9h6v8l-3-2h-7v-3" fill="currentColor"/></svg>',
  dict: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h3l4-4v14l-4-4H3z"/><path d="M14 19h7M14 15h4"/></svg>',
  slow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="13" r="5"/><path d="M11 13a2 2 0 1 0 2-2"/><path d="M2 18h17a3 3 0 0 0 3-3V8M20 8l-1-3M22 8l1-3"/></svg>',
  order: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2" y="4" width="7" height="6" rx="1.5"/><rect x="11" y="4" width="11" height="6" rx="1.5"/><rect x="2" y="14" width="11" height="6" rx="1.5" fill="currentColor"/><rect x="15" y="14" width="7" height="6" rx="1.5"/></svg>',
  book: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 4h6a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 4h-6a2 2 0 00-2 2v14a2 2 0 012-2h6z"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6L8 10z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>',
  speakerOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6L8 10z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 20h8M9 17h6"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
  fire: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2s5 4.5 5 10a5 5 0 01-10 0c0-2.4 1.2-3.9 2-4.6 0 1.8 1 3 2 3 0-3 1-6 1-8.4z"/></svg>',
};

/** 🔊 button that says an English word (action 'say', main.js); nothing where the device has no English voice. */
export const sayButton = text => canSpeak() && text
  ? `<button type="button" class="say" data-act="say" data-v="${esc(text)}" aria-label="${T('listen')}" title="${T('listen')}">${ICON.speaker}</button>` : '';

/** Game top bar: 🔊 / 🔇 for all sounds (action 'mute', main.js). */
export const muteButton = () => {
  const on = getProfile().sound !== false;
  return `<button class="iconbtn" data-act="mute" aria-pressed="${!on}" aria-label="${T(on ? 'mute' : 'unmute')}" title="${T(on ? 'mute' : 'unmute')}">${on ? ICON.speaker : ICON.speakerOff}</button>`;
};

export const THEMES = ['auto', 'light', 'dark'];
const BAR_COLOR = { light: '#0E7A6B', dark: '#0D1021' };  // same as the theme-color metas in index.html

/** 'auto' follows the phone's setting; 'light' / 'dark' override it (css: :root[data-theme]). */
export function applyTheme(t) {
  const forced = t === 'light' || t === 'dark';
  if (forced) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    m.dataset.auto ??= m.content;
    m.content = forced ? BAR_COLOR[t] : m.dataset.auto;
  });
}

// each language is named in itself, so everyone finds their own
export const LANG_NAME = { ru: 'Русский', uk: 'Українська', sk: 'Slovenčina' };

/** Language choice for the Settings screen (action 'lang'), in the alphabetical LANGS order. */
export const langChoice = () => `<div class="langlist" role="radiogroup" aria-label="Language">${LANGS.map(l =>
  `<button role="radio" data-act="lang" data-v="${l}" aria-checked="${getLang() === l}">${LANG_NAME[l]}</button>`).join('')}</div>`;

export const backBar = (to, param = '') =>
  `<div class="top"><button class="iconbtn" data-act="go" data-v="${to}${param ? ':' + param : ''}" aria-label="${T('back')}">${ICON.back}</button></div>`;

// the gear leads to Settings, where the language is chosen too
export const brandBar = () => `<div class="top"><div class="brand">E4U<i>.</i></div>
  <button class="iconbtn" data-act="go" data-v="settings" aria-label="${T('settings')} · Settings" title="${T('settings')}">${ICON.gear}</button></div>`;

export function levelBox() {
  const xp = getProfile().xp, lv = Math.floor(xp / XP_PER_LEVEL) + 1, cur = xp % XP_PER_LEVEL;
  return `<div class="levelbox"><div class="lvl tab">${lv}</div><div><span class="label">${T('level')} ${lv}</span></div><div class="tab" style="font-weight:800">${xp} XP</div>
  <div class="bar" style="grid-column:2/4"><span style="width:${cur / XP_PER_LEVEL * 100}%"></span></div></div>`;
}
