/*!
 * E4U — English pronunciation with the device's own voice (Web Speech API)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * No audio files: the phone or computer reads the English text with its built-in English voice.
 * Two voices are offered: the best female and the best male British or American voice (natural / online voices first,
 * British before American); where there is no English voice, canSpeak() is false and no 🔊 buttons appear.
 * The player picks one of the two in Settings (profile.voice).
 */
let voices = [], voice = null, preferred = '';

// the API does not say whether a voice is female or male: guess from well-known voice names
const FEMALE = /samantha|karen|kate|serena|susan|zira|hazel|libby|sonia|maisie|aria|jenny|michelle|ava|emma|moira|tessa|martha|female|woman/i;
const MALE = /daniel|alex|fred|david|george|ryan|thomas|arthur|oliver|guy|davis|andrew|brian|christopher|eric|\bmale\b|\bman\b/i;
const gender = v => (FEMALE.test(v.name) ? 'f' : MALE.test(v.name) && !/female/i.test(v.name) ? 'm' : '');
const idOf = v => v.voiceURI || v.name;
// the better voices first: the "natural" / online ones, then British before American, then the device's own
const quality = v => (/natural|neural|premium|enhanced|online|google/i.test(v.name) ? 0 : 1);
const rank = v => quality(v) * 4 + (/^en[-_]GB/i.test(v.lang) ? 0 : 1) * 2 + (v.localService ? 0 : 1);

/** Two voices only: the best female one and the best male one (or the two best when the names do not tell). */
function pick() {
  const all = window.speechSynthesis.getVoices().filter(v => /^en[-_](GB|US)$/i.test(v.lang || '')).sort((x, y) => rank(x) - rank(y));
  const f = all.find(v => gender(v) === 'f'), m = all.find(v => gender(v) === 'm');
  voices = [f, m].filter(Boolean);
  for (const v of all) if (voices.length < 2 && !voices.includes(v)) voices.push(v);
  voice = voices.find(v => idOf(v) === preferred) || voices[0] || null;
}

/** Find the English voices; onChange runs when they appear later (browsers load voices asynchronously). */
export function initSpeech(onChange) {
  if (!('speechSynthesis' in window)) return;
  pick();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    const had = voices.length; pick();
    if (had !== voices.length && onChange) onChange();
  });
}

export const canSpeak = () => !!voice;

/** The English voices offered on this device: [{ id, name, gender: 'f' | 'm' | '' , selected }]. */
export const voiceList = () => voices.map(v => ({ id: idOf(v), name: /GB/i.test(v.lang) ? 'UK' : 'US', gender: gender(v), selected: v === voice }));

/** Use the voice with this id (from voiceList); '' = the first one (British if there is one). */
export function preferVoice(id) {
  preferred = id || '';
  if ('speechSynthesis' in window) pick();
}

/** Is the voice still saying something? (the game waits for it before the next task) */
export const isSpeaking = () => !!voice && 'speechSynthesis' in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending);

/** Say an English word or phrase, cutting off whatever was still being said. slow = the 🐌 button of the dictation. */
export function speak(text, slow = false) {
  if (!voice || !text) return;
  const s = window.speechSynthesis;
  s.cancel();
  const u = new SpeechSynthesisUtterance(String(text));
  u.voice = voice; u.lang = voice.lang; u.rate = slow ? 0.6 : 0.9;  // a little slower than normal speech: easier to catch
  s.speak(u);
}
