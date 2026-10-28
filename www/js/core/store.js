/*!
 * E4U — profile storage
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * The whole app reads and writes the player's profile only through this module.
 * Today the profile lives in the browser (localAdapter). Later a cloud adapter
 * (Supabase / Firebase) can be plugged in with useAdapter() without touching
 * the game code.
 *
 * Profile shape (schema v2):
 * {
 *   v: 2, lang, sound, strict, theme ('auto' | 'light' | 'dark'), speak (say the answer), voice (English voice id, '' = default),
 *   level (language level for every section: 'a1' | 'a2', each includes the levels below), xp, bestStreak, updatedAt,
 *   sections: { verbs: { tenses, pool, best: {mode: score}, mist: {verbKey: count} }, ... }
 * }
 */
const KEY = 'e4u.profile.v2';
/** Language levels, lowest first; a level includes everything from the ones before it. */
export const LEVELS = ['a1', 'a2'];
const LEGACY_KEY = 'e4u.v1';

export function detectLang() {
  const l = (navigator.language || 'ru').slice(0, 2).toLowerCase();
  return l === 'uk' ? 'uk' : (l === 'sk' || l === 'cs') ? 'sk' : 'ru';
}

// new fields get their default here, so older saved profiles need no migration
const defaults = () => ({ v: 2, lang: detectLang(), sound: true, strict: false, theme: 'auto', speak: true, voice: '', level: 'a1', remind: { on: false, time: '19:00' }, xp: 0, bestStreak: 0, sections: {}, updatedAt: 0 });

/** Adapter contract: read() -> profile|null, write(profile), readLegacy() -> object|null */
export const localAdapter = {
  read() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
  write(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* storage unavailable */ } },
  readLegacy() { try { return JSON.parse(localStorage.getItem(LEGACY_KEY)); } catch (e) { return null; } },
};

/** v1 (single verbs trainer) -> v2 (sections) */
function migrateV1(o) {
  if (!o) return null;
  return {
    lang: o.lang, sound: o.sound, strict: o.strict, xp: o.xp || 0, bestStreak: o.bestStreak || 0,
    sections: { verbs: { tenses: o.tenses, pool: o.pool === 'a1' ? 'a1' : 'a2', best: o.best || {}, mist: o.mist || {} } },
  };
}

let adapter = localAdapter;
let profile = null;
const listeners = new Set();

export function initStore() {
  let p = adapter.read();
  if (!p) p = migrateV1(adapter.readLegacy());
  profile = Object.assign(defaults(), p || {});
  // 2.15: the language level moved from the verbs menu (sections.verbs.pool) to the whole app (profile.level)
  const oldPool = p && !p.level && p.sections && p.sections.verbs && p.sections.verbs.pool;
  if (oldPool) profile.level = oldPool === 'a1' ? 'a1' : 'a2';
  if (!LEVELS.includes(profile.level)) profile.level = 'a1';
  profile.v = 2;
  return profile;
}

export function getProfile() { return profile; }

export function save() {
  profile.updatedAt = Date.now();
  adapter.write(profile);
  listeners.forEach(fn => { try { fn(profile); } catch (e) { /* ignore */ } });
}

export function onSave(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Swap the storage backend (e.g. a cloud adapter after sign-in). */
export function useAdapter(a) { adapter = a; }

/** The whole profile as the text of a file: to move the progress to another phone or keep a copy (Settings → Progress). */
export function exportProfile() {
  return JSON.stringify({ app: 'e4u', saved: new Date().toISOString(), profile });
}

/** Replaces the profile with the one from a file made by exportProfile(). Throws 'bad' for any other file.
 *  The reminder stays as it is on this device: it belongs to the device (its push subscription), not to the file. */
export function importProfile(text) {
  let o = null;
  try { o = JSON.parse(text); } catch (e) { /* not JSON */ }
  const p = o && o.app === 'e4u' ? o.profile : null;
  if (!p || typeof p !== 'object' || p.v !== 2 || !p.sections || typeof p.sections !== 'object') throw new Error('bad');
  p.remind = profile.remind;
  adapter.write(p);
  initStore();
  save();
}

/** Asks the browser to keep the profile even when the phone runs out of space (granted silently, or not at all). */
export function persistStorage() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* not supported */ }
}

/** Per-section state, filled with defaults for missing keys. */
export function sectionState(id, def) {
  const cur = profile.sections[id] || {};
  const merged = Object.assign(JSON.parse(JSON.stringify(def)), cur);
  profile.sections[id] = merged;
  return merged;
}
