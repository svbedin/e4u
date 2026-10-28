/*!
 * E4U — small helpers
 * Copyright (c) 2026 Serg. All rights reserved.
 */
export const rnd = a => a[Math.floor(Math.random() * a.length)];

export const shuf = a => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** lower-case, trim, collapse spaces; ' and ‘ count as ’ (isn't = isn’t) */
export const normAnswer = s => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/['‘`]/g, '’');

/** remove diacritics: "čítať" -> "citat" */
export const stripDiacritics = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export const fmtTime = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
