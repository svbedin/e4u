/*!
 * E4U — sound effects (Web Audio, no files)
 * Copyright (c) 2026 Serg. All rights reserved.
 */
import { getProfile } from './store.js';

let ac = null;
export function beep(kind) {
  if (!getProfile().sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const seq = kind === 'ok' ? [660, 880] : kind === 'no' ? [220, 170] : kind === 'win' ? [523, 659, 784, 1046] : [440];
    seq.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = kind === 'no' ? 'square' : 'triangle'; o.frequency.value = f;
      const t = ac.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.18);
    });
    if (kind === 'no' && navigator.vibrate) navigator.vibrate(60);
  } catch (e) { /* audio unavailable */ }
}
