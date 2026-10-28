/*!
 * E4U — service worker (offline support; the reminder of the daily training)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * When you publish a new version: bump CACHE and keep SHELL in sync with the files
 * (README → "Обновление версии").
 */
const CACHE = 'e4u-v1';
const SHELL = ['./', './css/app.css', './css/fonts.css', './fonts/Manrope-Variable.ttf', './fonts/OFL-Manrope.txt', './fonts/OFL-Unbounded.txt', './fonts/Unbounded-Variable.ttf', './icons/favicon-32.png', './icons/icon-192.png', './icons/icon-512.png', './index.html', './js/config.js', './js/core/errors.js', './js/core/i18n.js', './js/core/push.js', './js/core/router.js', './js/core/sound.js', './js/core/speech.js', './js/core/store.js', './js/core/ui.js', './js/core/util.js', './js/games/engine.js', './js/main.js', './js/pwa.js', './js/screens/admin.js', './js/screens/grammar-data.js', './js/screens/grammar.js', './js/screens/privacy.js', './js/screens/report.js', './js/screens/screens.js', './js/screens/stats.js', './js/screens/tournament.js', './js/sections/daily/index.js', './js/sections/daily/strings.js', './js/sections/nouns/data.js', './js/sections/nouns/index.js', './js/sections/nouns/strings.js', './js/sections/phrases/data.js', './js/sections/phrases/index.js', './js/sections/phrases/strings.js', './js/sections/registry.js', './js/sections/verbs/data.js', './js/sections/verbs/index.js', './js/sections/verbs/strings.js', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // old app caches go; 'e4u-push' (the reminder text, www/js/core/push.js) stays
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'e4u-push').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // fonts: cache first
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== location.origin) return;
  // server answers (admin screen) must always be fresh and never cached
  if (url.pathname.startsWith('/api/')) return;
  // app files: serve from cache instantly, refresh in background (new version on next launch)
  e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit || c.match('./index.html'));
    return hit || net;
  })));
});

// a reminder (worker/push.js): { t: 'daily' | 'soon' | 'over', at } — or an empty push (daily); the text is the one the app
// stored, in its language ({time} = when the sign-in ends, in the phone's local time)
self.addEventListener('push', e => {
  let msg = { t: 'daily' };
  try { if (e.data) msg = e.data.json(); } catch { /* empty or not JSON: the daily reminder */ }
  e.waitUntil(caches.open('e4u-push').then(c => c.match('/push-text')).then(r => (r ? r.json() : null)).catch(() => null).then(all => {
    const t = (all && (all[msg.t] || all)) || {};
    let time = '';
    try { time = msg.at ? new Date(msg.at).toLocaleTimeString((all && all.lang) || undefined, { hour: '2-digit', minute: '2-digit' }) : ''; } catch { /* no time */ }
    return self.registration.showNotification(t.title || 'E4U', {
      body: (t.body || 'Tréning dňa čaká — 12 úloh, asi 5 minút.').replace('{time}', time),
      icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: msg.t === 'daily' ? 'daily' : 'signin', data: { url: './' },
    });
  }));
});
// a tap on the reminder opens E4U (or brings the open one to the front)
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => new URL(c.url).origin === location.origin);
    return open ? open.focus() : self.clients.openWindow('./');
  }));
});
