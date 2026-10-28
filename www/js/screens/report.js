/*!
 * E4U — "report a problem" sheet: a tester writes a note, the server e-mails it to the owner
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * openReport(context, shown) — context: the current task as plain text, sent to the owner (or '' for general
 * feedback); shown: the part the tester sees under the text field (without the correct answer).
 * The sheet lives outside #app, so the game screen underneath is not redrawn.
 */
import { T, getLang } from '../core/i18n.js';
import { on } from '../core/router.js';
import { ICON } from '../core/ui.js';
import { esc } from '../core/util.js';
import { APP } from '../config.js';
import { signedIn } from './admin.js';

/** Flag button for the game's top bar; hidden where there is no server (npm start). */
export const reportButton = () => signedIn()
  ? `<button class="iconbtn" data-act="report" aria-label="${T('report')}" title="${T('report')}">${ICON.flag}</button>` : '';

export const writeAuthorLink = () => signedIn()
  ? `<button class="linkbtn" data-act="writeauthor">${T('writeAuthor')}</button>` : '';

const ERR = { auth: 'authLost', too_many: 'tooMany' };

export function openReport(context = '', shown = context) {
  close();
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.id = 'report';
  wrap.innerHTML = `<form class="sheet" role="dialog" aria-modal="true" aria-labelledby="rph">
    <h3 id="rph">${context ? T('report') : T('writeAuthor')}</h3>
    <textarea id="rpt" rows="4" maxlength="2000" placeholder="${T('reportPh')}" aria-label="${T('reportPh')}"></textarea>
    ${context ? `<p class="sub" style="margin:0">${T('reportCtx')}</p><pre class="ctx">${esc(shown)}</pre>` : ''}
    <p class="msg" id="rpm" role="status"></p>
    <div class="row" style="border:0;padding:0">
      <button type="button" class="big ghost" data-close>${T('cancel')}</button>
      <button type="submit" class="big">${T('send')}</button></div>
  </form>`;
  document.body.appendChild(wrap);
  const form = wrap.querySelector('form'), ta = wrap.querySelector('#rpt'), msg = wrap.querySelector('#rpm');
  wrap.addEventListener('click', ev => { if (ev.target === wrap || ev.target.closest('[data-close]')) close(); });
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    const btns = form.querySelectorAll('button');
    btns.forEach(b => { b.disabled = true; });
    msg.className = 'msg'; msg.textContent = T('loading');
    try {
      const res = await fetch('api/feedback', {
        method: 'POST', redirect: 'manual', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-E4U': '1' },
        body: JSON.stringify({ text, context, lang: getLang(), version: APP.version }),
      });
      if (res.type === 'opaqueredirect' || res.status === 401) throw new Error('auth');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'server');
      msg.className = 'msg ok'; msg.textContent = T('reportThanks');
      setTimeout(close, 1600);
    } catch (e) {
      msg.className = 'msg no'; msg.textContent = T(ERR[e.message] || 'netErr');
      btns.forEach(b => { b.disabled = false; });
    }
  });
  ta.focus();
}

function close() { document.getElementById('report')?.remove(); }

on('writeauthor', () => openReport(''));
