/*!
 * E4U — entry point
 * Copyright (c) 2026 Serg. All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution or use is prohibited.
 */
import { APP } from './config.js';
import { initErrors } from './core/errors.js';
import { initStore, getProfile, save, LEVELS, persistStorage } from './core/store.js';
import { setLang, addStrings } from './core/i18n.js';
import { on, go, render, startRouter, currentScreen } from './core/router.js';
import { SECTIONS, sectionStateOf } from './sections/registry.js';
import { initPWA } from './pwa.js';
import { applyTheme, THEMES, muteButton } from './core/ui.js';
import { initSpeech, speak, preferVoice } from './core/speech.js';
import { refreshReminder, storeText } from './core/push.js';
import './screens/screens.js';
import './games/engine.js';
import './screens/privacy.js';
import { checkAdmin } from './screens/admin.js';
import './screens/stats.js';
import './screens/grammar.js';

initErrors();
initStore();
persistStorage();
setLang(getProfile().lang);
applyTheme(getProfile().theme);

for (const s of SECTIONS) {
  if (s.soon) continue;
  if (s.strings) addStrings(s.strings);
  if (s.init) s.init({ on, st: () => sectionStateOf(s), save, rerender: render });
}

// a new language: the reminder (if on) speaks it too
on('lang', v => { getProfile().lang = v; setLang(v); save(); render(); if ((getProfile().remind || {}).on) storeText().catch(() => {}); });
on('say', v => speak(v));
// language level on the home screen: applies to every section
on('level', v => { if (!LEVELS.includes(v)) return; getProfile().level = v; save(); render(); });
// a chosen voice says a short sample, so the player hears what was picked
on('voice', v => { getProfile().voice = v; preferVoice(v); save(); render(); speak('Dobrý deň'); });
// the speaker in the game's top bar: all sounds (signals and spoken answers) on or off without leaving the game
on('mute', (v, b) => {
  const P = getProfile(); P.sound = !P.sound; save();
  b.outerHTML = muteButton();
});
on('theme', v => { if (!THEMES.includes(v)) return; getProfile().theme = v; applyTheme(v); save(); render(); });
on('go', v => { const [name, section] = v.split(':'); go(name, section ? { section } : {}); });
on('back', () => history.back());

initPWA();
// the reminder (if on): its text in the current language, the time zone and the last daily day sent again
refreshReminder().catch(() => {});
startRouter('home');
// the English voice may load a moment later; redraw so the 🔊 buttons appear (not mid-game: the board would reshuffle)
preferVoice(getProfile().voice);
initSpeech(() => { if (currentScreen().name !== 'game') render(); });
checkAdmin();
window.E4U = { version: APP.version }; // handy when checking which build is deployed
