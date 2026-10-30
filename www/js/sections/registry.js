/*!
 * E4U — list of sections
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * To add a section: create sections/<id>/index.js (see ARCHITECTURE.md),
 * import it here and put it into SECTIONS. Placeholders show as "Soon".
 */
import verbs from './verbs/index.js';
import nouns from './nouns/index.js';
import nums from './nums/index.js';
import adj from './adj/index.js';
import pron from './pron/index.js';
import phrases from './phrases/index.js';
import daily from './daily/index.js';
import { sectionState } from '../core/store.js';

export const SECTIONS = [
  verbs,
  nouns,
  adj,
  pron,
  nums,
  phrases,  // last, right above the tournament: phrases bring together what the sections above train
  daily,    // hidden: started from its own card at the top of the home screen
];

daily.connect(SECTIONS, s => sectionStateOf(s));

export const getSection = id => SECTIONS.find(s => s.id === id && !s.soon) || SECTIONS[0];

/** The section's saved settings and progress (inside the player profile). */
export function sectionStateOf(section) {
  const st = sectionState(section.id, section.defaults);
  if (section.normalize) section.normalize(st);
  return st;
}
