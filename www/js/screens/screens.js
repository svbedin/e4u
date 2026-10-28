/*!
 * E4U — home, settings, section menu and reference screens
 * Copyright (c) 2026 Serg. All rights reserved.
 */
import { T, getLang } from '../core/i18n.js';
import { getProfile, save, LEVELS, exportProfile, importProfile } from '../core/store.js';
import { register, on, render, app } from '../core/router.js';
import { ICON, levelBox, brandBar, backBar, THEMES, langChoice } from '../core/ui.js';
import { fmtTime, esc } from '../core/util.js';
import { SECTIONS, getSection, sectionStateOf } from '../sections/registry.js';
import { installUI } from '../pwa.js';
import { tournamentCard } from './tournament.js';
import { adminLink } from './admin.js';
import { APP } from '../config.js';
import { canSpeak, voiceList } from '../core/speech.js';
import { writeAuthorLink } from './report.js';
import { dailyCard } from '../sections/daily/index.js';
import { pushState, enableReminder, disableReminder, TIMES as PUSH_TIMES } from '../core/push.js';
import { grammarFor } from './grammar.js';

/* ---------- home ---------- */
register('home', () => `<div class="screen">
  ${brandBar()}
  <div class="ornament"></div>
  <div><h1>${T('tag')}</h1></div>
  ${levelBox()}
  <div class="group"><span class="label">${T('cefr')}</span>
    <div class="seg" role="group" aria-label="${T('cefr')}">${LEVELS.map(l =>
      `<button data-act="level" data-v="${l}" aria-pressed="${getProfile().level === l}">${l.toUpperCase()}</button>`).join('')}
      <button disabled aria-disabled="true" class="later">B1 <small>${T('soon')}</small></button></div>
    <small style="color:var(--muted)">${T('cefrD')}</small></div>
  ${dailyCard()}
  <div class="cards">${SECTIONS.filter(s => !s.hidden).map(s => s.soon
    ? `<div class="sect soon" aria-disabled="true"><span class="glyph">${s.glyph}</span><span class="grow"><b>${T(s.titleKey)}</b></span><span class="pill">${T('soon')}</span></div>`
    : `<button class="sect" data-act="go" data-v="hub:${s.id}"><span class="glyph">${s.glyph}</span><span class="grow"><b>${T(s.titleKey)}</b><span class="sub">${T(s.descKey)}</span></span></button>`).join('')}
  </div>
  <button class="linkbtn" data-act="go" data-v="grammar">${ICON.book} ${T('grT')}</button>
  ${tournamentCard()}
  ${installUI()}
  <p class="foot">© 2026 Serg · E4U ${APP.version}<br>${T('foot')}</p>
</div>`);

/* ---------- section menu (hub) ---------- */
register('hub', ({ section: id }) => {
  const S = getSection(id), st = sectionStateOf(S);
  const best = m => st.best[m] != null ? `<span class="best">${T('best')}<strong class="tab">${m === 'match' ? fmtTime(st.best[m]) : st.best[m]}</strong></span>` : '<span class="best"></span>';
  return `<div class="screen">
    ${backBar('home')}
    <div><h1>${T(S.titleKey)}</h1>${S.summary ? `<p class="sub summary">${S.summary()}</p>` : ''}<p class="sub">${T('hubSub')}</p></div>
    ${S.settingsHTML ? S.settingsHTML(st) : ''}
    <div class="group"><span class="label">${T('modes')}</span>
      <div class="modes">${S.modes.map(m => `<button class="mode" data-act="play" data-v="${S.id}:${m}"><span class="ic">${ICON[m]}</span><b>${T(m)}</b><small>${T(S.modeDesc?.[m] || m + 'D')}</small>${best(m)}</button>`).join('')}</div></div>
    ${S.mountReference ? `<button class="linkbtn" data-act="go" data-v="ref:${S.id}">${ICON.book} ${T(S.referenceTitleKey)}</button>` : ''}
    ${grammarFor(S.id).length ? `<button class="linkbtn" data-act="go" data-v="grammar:${S.id}">${ICON.book} ${T('grRules')}</button>` : ''}
  </div>`;
});

/* ---------- settings (gear on the home screen): everything that applies to the whole app ---------- */
/** English voice: a choice when the device has several, otherwise its name and where to find more. */
function voiceRow() {
  const vs = voiceList();
  if (!vs.length) return '';
  const label = v => `${esc(v.name)}${v.gender ? ` · ${T(v.gender === 'f' ? 'voiceF' : 'voiceM')}` : ''}`;
  if (vs.length === 1) return `<div class="row"><span><b>${T('voice')}</b>: ${label(vs[0])}<br><small style="color:var(--muted)">${T('voiceOne')}</small></span></div>`;
  return `<div class="row" style="flex-direction:column;align-items:stretch;gap:8px"><b>${T('voice')}</b>
    <div class="langlist" role="radiogroup" aria-label="${T('voice')}">${vs.map(v =>
      `<button role="radio" data-act="voice" data-v="${esc(v.id)}" aria-checked="${v.selected}">${label(v)}</button>`).join('')}</div></div>`;
}

/** The reminder of the daily training (push): a switch and the time; on an iPhone outside the home screen, how to get it. */
let remindMsg = '', remindBusy = false;
function reminderBox() {
  const R = getProfile().remind || { on: false, time: '19:00' }, state = pushState();
  const hint = state === 'install' ? 'remindInstall' : state === 'denied' ? 'remindDenied' : state === 'no' ? 'remindNo' : '';
  const ok = state === 'ok';
  return `<div class="group" id="remind">
    <div class="row"><span><b>${T('remindT')}</b><br><small style="color:var(--muted)">${T(hint || 'remindD')}</small></span>
      <button class="switch" role="switch" data-act="remind" aria-checked="${ok && R.on}" aria-label="${T('remindT')}" ${ok && !remindBusy ? '' : 'disabled'}></button></div>
    ${ok && R.on ? `<div class="row" style="flex-direction:column;align-items:stretch;gap:8px"><b>${T('remindTime')}</b>
      <div class="seg" role="group" aria-label="${T('remindTime')}">${PUSH_TIMES.map(t => `<button data-act="remindtime" data-v="${t}" aria-pressed="${R.time === t}" ${remindBusy ? 'disabled' : ''}>${t}</button>`).join('')}</div></div>` : ''}
    ${remindMsg ? `<p class="note" role="status" style="margin:0">${T(remindMsg)}</p>` : ''}
  </div>`;
}
async function reminderDo(fn) {
  remindBusy = true; remindMsg = ''; render();
  try { await fn(); } catch (e) { remindMsg = e.message === 'denied' ? 'remindDenied' : e.message === 'off' ? 'remindOff' : 'remindErr'; }
  remindBusy = false; render();
}
on('remind', () => reminderDo(() => ((getProfile().remind || {}).on ? disableReminder() : enableReminder((getProfile().remind || {}).time || '19:00'))));
on('remindtime', v => reminderDo(() => enableReminder(v)));

/** Progress: saved into a file (a phone: the share sheet — Files, Drive, a message to oneself) and loaded from one. */
let progMsg = '', progAsk = false;
function progressBox() {
  return `<div class="group" id="progress">
    <div class="row"><span><b>${T('progT')}</b><br><small style="color:var(--muted)">${T('progD')}</small></span></div>
    <div class="actions" style="margin-top:0">
      <button class="big ghost" data-act="progsave">${T('progSave')}</button>
      ${progAsk ? `<p class="note" role="alert" style="margin:0">${T('progAsk')}</p>
        <button class="big" data-act="progpick">${T('progPick')}</button><button class="big ghost" data-act="progno">${T('cancel')}</button>`
        : `<button class="big ghost" data-act="progload">${T('progLoad')}</button>`}
    </div>
    <input type="file" id="progfile" accept=".json,application/json" hidden>
    ${progMsg ? `<p class="note" role="status" style="margin:0">${T(progMsg)}</p>` : ''}
  </div>`;
}
async function saveProgress() {
  const name = `e4u-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([exportProfile()], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  // a phone: the share sheet saves it to Files / Drive or sends it; a computer: an ordinary download
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'E4U' }); return 'progSaved'; } catch (e) { if (e.name === 'AbortError') return ''; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return 'progSaved';
}
on('progsave', async () => { progAsk = false; progMsg = await saveProgress().catch(() => 'progErr'); render(); });
on('progload', () => { progAsk = true; progMsg = ''; render(); });
on('progno', () => { progAsk = false; render(); });
// the picker opens in the same tap (a browser allows it only then); the new profile takes effect after a reload
on('progpick', () => {
  const input = document.getElementById('progfile');
  input.onchange = async () => {
    const f = input.files && input.files[0];
    if (!f) return;
    try { importProfile(await f.text()); location.reload(); } catch (e) { progAsk = false; progMsg = 'progBad'; render(); }
  };
  input.click();
});

register('settings', () => {
  const P = getProfile();
  return `<div class="screen">
    ${backBar('home')}
    <h1>${T('settings')}</h1>
    <div class="group"><span class="label">${T('language')}${getLang() === 'en' ? '' : ' · Language'}</span>${langChoice()}</div>
    <div class="group">
      <div class="row"><b>${T('sound')}</b><button class="switch" role="switch" data-act="toggle" data-v="sound" aria-checked="${P.sound}" aria-label="${T('sound')}"></button></div>
      <div class="row"><span><b>${T('speakT')}</b><br><small style="color:var(--muted)">${canSpeak() ? T('speakD') : T('noVoice')}</small></span><button class="switch" role="switch" data-act="toggle" data-v="speak" aria-checked="${canSpeak() && P.speak !== false}" aria-label="${T('speakT')}" ${canSpeak() ? '' : 'disabled'}></button></div>
      ${voiceRow()}
      <div class="row" style="flex-direction:column;align-items:stretch;gap:8px"><span><b>${T('theme')}</b><br><small style="color:var(--muted)">${T('themeD')}</small></span>
        <div class="seg" role="group" aria-label="${T('theme')}">${THEMES.map(t => `<button data-act="theme" data-v="${t}" aria-pressed="${(P.theme || 'auto') === t}">${T('theme_' + t)}</button>`).join('')}</div></div>
    </div>
    ${reminderBox()}
    ${progressBox()}
    <button class="linkbtn" data-act="go" data-v="privacy">${T('privacy')}</button>
    ${writeAuthorLink()}
    ${adminLink()}
    <p class="foot">E4U ${APP.version}</p>
  </div>`;
});

/* ---------- reference ---------- */
register('ref', ({ section: id }) => {
  const S = getSection(id);
  app().innerHTML = `<div class="screen">${backBar('hub', S.id)}<h1>${T(S.referenceTitleKey)}</h1><div class="group" id="refbody"></div></div>`;
  S.mountReference(document.getElementById('refbody'));
});

on('toggle', v => { const P = getProfile(); P[v] = !P[v]; save(); render(); });
