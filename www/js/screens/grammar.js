/*!
 * E4U — the "Grammar" screen: short rules with tables and examples (data in grammar-data.js)
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Opened from the home screen (all rules) or from a section menu (grammar:<section>): then the rules of that
 * section come first and are open. Each English example has 🔊; the translation is in the interface language.
 */
import { T, getLang, addStrings } from '../core/i18n.js';
import { register } from '../core/router.js';
import { backBar, sayButton } from '../core/ui.js';
import { esc } from '../core/util.js';
import { canSpeak } from '../core/speech.js';
import { GRAMMAR } from './grammar-data.js';

addStrings({
  ru: { grT: 'Грамматика', grD: 'Коротко о правилах — с таблицами и примерами. 🔊 — послушать пример.', grRules: 'Правила' },
  uk: { grT: 'Граматика', grD: 'Коротко про правила — з таблицями й прикладами. 🔊 — послухати приклад.', grRules: 'Правила' },
  sk: { grT: 'Gramatika', grD: 'Pravidlá v skratke — s tabuľkami a príkladmi. 🔊 — vypočuť si príklad.', grRules: 'Pravidlá' },
});

/** The rules a section's menu links to. */
export const grammarFor = id => GRAMMAR.filter(g => g.sections.includes(id));
// **bold** and *italic* inside an escaped paragraph
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
const tr = o => o[getLang()] || o.ru;

function topic(g, open) {
  const lang = getLang();
  // a form is said on a tap (as in the word reference): no button, so a row stays on one line
  const cell = f => (canSpeak() ? `<td class="sayf" data-act="say" data-v="${esc(f)}">${esc(f)}</td>` : `<td>${esc(f)}</td>`);
  const tables = (g.tables || []).map(t => `<table><caption>${esc(t.title)}</caption>${t.rows(lang).map(([a, b]) =>
    `<tr><td>${esc(a)}</td>${cell(b)}</tr>`).join('')}</table>`).join('');
  return `<details class="v gram" id="g-${g.id}" ${open ? 'open' : ''}><summary>${esc(tr(g.title))}<small class="pill">${g.level}</small></summary>
    <div class="gbody">${tr(g.text).map(p => `<p>${md(p)}</p>`).join('')}
      ${tables ? `<div class="tables">${tables}</div>` : ''}
      <ul class="gex">${g.ex.map(([en, t]) => `<li><b lang="en">${esc(en)}</b>${sayButton(en)}<br><small>${esc(tr(t))}</small></li>`).join('')}</ul>
    </div></details>`;
}

register('grammar', ({ section } = {}) => {
  const mine = section ? grammarFor(section) : [];
  const list = [...mine, ...GRAMMAR.filter(g => !mine.includes(g))];
  return `<div class="screen">${backBar(section ? 'hub' : 'home', section || '')}
    <div><h1>${T('grT')}</h1><p class="sub">${T('grD')}</p></div>
    <div class="vlist">${list.map(g => topic(g, mine.includes(g))).join('')}</div>
  </div>`;
});
