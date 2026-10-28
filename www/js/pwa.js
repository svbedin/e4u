/*!
 * E4U — install prompt and offline support (PWA)
 * Copyright (c) 2026 Serg. All rights reserved.
 */
import { T } from './core/i18n.js';
import { on, render, currentScreen } from './core/router.js';

let deferredPrompt = null;
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
/** inside the future App Store / Google Play build (Capacitor) */
export const isNativeApp = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

export function installUI() {
  if (isStandalone() || isNativeApp()) return '';
  if (deferredPrompt) return `<button class="install" data-act="install">⬇ ${T('install')}</button>`;
  if (isIOS) return `<div class="install" style="flex-direction:column;gap:2px"><span>${T('install')}</span><small>${T('iosHint')}</small></div>`;
  return '';
}

export function initPWA() {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if (currentScreen().name === 'home') render(); });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; if (currentScreen().name === 'home') render(); });
  on('install', () => { if (!deferredPrompt) return; deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; render(); }); });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !isNativeApp()) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
