/*!
 * E4U — reminder of the daily training on this device (push notifications); the server part is worker/push.js
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * profile.remind = { on, time }. Switching on asks the phone for permission (only after a tap), subscribes the
 * service worker to push and sends the server the push address, the time and the time zone. The text of the
 * reminders is kept on the device (cache 'e4u-push', read by www/sw.js), in the interface language: the daily
 * training, "tomorrow E4U asks for the code" and "the sign-in has ended" (the server picks which, worker/push.js).
 * After a daily training (sections/daily) the server is told that today is done: no reminder today.
 */
import { getProfile, save } from './store.js';
import { T } from './i18n.js';

export const TIMES = ['17:00', '18:00', '19:00', '20:00', '21:00'];  // the same as worker/push.js
const TEXT_CACHE = 'e4u-push', TEXT_URL = '/push-text';
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/** 'ok' | 'install' (iPhone: add to the home screen first) | 'denied' (blocked in the phone's settings) | 'no' (the browser cannot) */
export function pushState() {
  if (isIOS() && !standalone()) return 'install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'no';
  if (Notification.permission === 'denied') return 'denied';
  return 'ok';
}

const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Bratislava';
async function api(path, body) {
  const res = await fetch(path, { method: body ? 'POST' : 'GET', credentials: 'same-origin', redirect: 'manual',
    headers: body ? { 'Content-Type': 'application/json', 'X-E4U': '1' } : { 'X-E4U': '1' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'server');
  return data;
}
const keyBytes = b64 => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - b64.length % 4) % 4)), c => c.charCodeAt(0));
async function subscription(create) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub && create) {
    const { key } = await api('api/push/key');
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  }
  return sub;
}
/** The reminder texts in the interface language, for the service worker ({time} in 'soon' = when the sign-in ends). */
export async function storeText() {
  if (!('caches' in window)) return;
  const c = await caches.open(TEXT_CACHE), lang = document.documentElement.lang || 'en';
  const texts = { lang, title: T('pushTitle'), body: T('pushBody'),
    daily: { title: T('pushTitle'), body: T('pushBody') }, soon: { title: T('pushCodeT'), body: T('pushSoonB') }, over: { title: T('pushCodeT'), body: T('pushOverB') } };
  await c.put(TEXT_URL, new Response(JSON.stringify(texts), { headers: { 'Content-Type': 'application/json' } }));
}
const keysOf = sub => { const k = (sub.toJSON && sub.toJSON().keys) || {}; return { p256dh: k.p256dh || '', auth: k.auth || '' }; };
const lastDaily = () => (getProfile().sections.daily || {}).lastDay || '';

/** Switch on (or change the time): permission, subscription, the server. Throws 'denied' / 'off' / 'server'. */
export async function enableReminder(time) {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('denied');
  const sub = await subscription(true);
  await api('api/push/subscribe', { endpoint: sub.endpoint, keys: keysOf(sub), time, tz: zone(), day: lastDaily() });
  await storeText();
  const P = getProfile(); P.remind = { on: true, time }; save();
}
/** Switch off: the device unsubscribes, the server forgets it. */
export async function disableReminder() {
  const P = getProfile(); P.remind = { ...(P.remind || {}), on: false }; save();
  const sub = pushState() === 'ok' ? await subscription(false).catch(() => null) : null;
  if (sub) { await api('api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
}
/** On every start with the reminder on: the text in the current language, the time zone and the last daily day refreshed. */
export async function refreshReminder() {
  const P = getProfile();
  if (!P.remind || !P.remind.on || pushState() !== 'ok' || Notification.permission !== 'granted') return;
  const sub = await subscription(false).catch(() => null);
  if (!sub) return;
  await storeText();
  await api('api/push/subscribe', { endpoint: sub.endpoint, keys: keysOf(sub), time: P.remind.time, tz: zone(), day: lastDaily() }).catch(() => {});
}
/** The daily training is done: no reminder today. */
export async function dailyDone() {
  const P = getProfile();
  if (!P.remind || !P.remind.on || pushState() !== 'ok') return;
  const sub = await subscription(false).catch(() => null);
  if (sub) await api('api/push/done', { endpoint: sub.endpoint, day: today() }).catch(() => {});
}
