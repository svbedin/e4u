/*!
 * E4U — "Mistakes in tasks" for the author: where testers go wrong most, what they answer instead, and crashes
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Reads the anonymous counters of worker/stats.js (owner only). A wrong answer given often may be right in fact:
 * then the data (accepted answers, forms) needs a look.
 */
import { T, addStrings } from '../core/i18n.js';
import { register, on, app, currentScreen } from '../core/router.js';
import { backBar } from '../core/ui.js';
import { esc } from '../core/util.js';
import { SECTIONS } from '../sections/registry.js';
import { call } from './admin.js';

addStrings({
  ru: { stErr: 'Сбои приложения', stErrD: 'Ошибки программы у тестеров — без имён. Пришлите их Claude, он найдёт причину.', stErrNone: 'Сбоев нет.', stErrSeen: 'последний раз', stErrClear: 'Очистить сбои', stT: 'Ошибки в заданиях', stD: 'Где тестеры ошибаются чаще всего. Без имён и почты — только общие счётчики.', stTasks: 'заданий', stAnswers: 'ответов', stMistakes: 'ошибок', stAll: 'Все', stGiven: 'Отвечали', stEmpty: 'Ошибок пока нет.', stClear: 'Очистить статистику', stClearYes: 'Да, очистить', stNote: 'Если неверный ответ дают часто, проверьте: может быть, он тоже правильный — тогда его нужно принять в данных.' },
  en: { stErr: 'App crashes', stErrD: 'Program errors on testers’ devices — no names. Send them to Claude to find the cause.', stErrNone: 'No crashes.', stErrSeen: 'last', stErrClear: 'Clear the crashes', stT: 'Mistakes in tasks', stD: 'Where testers go wrong most. No names or e-mails — shared counters only.', stTasks: 'tasks', stAnswers: 'answers', stMistakes: 'mistakes', stAll: 'All', stGiven: 'Answered', stEmpty: 'No mistakes yet.', stClear: 'Clear the statistics', stClearYes: 'Yes, clear', stNote: 'If a wrong answer is given often, check whether it is right too — then the data should accept it.' },
  uk: { stErr: 'Збої застосунку', stErrD: 'Помилки програми в тестувальників — без імен. Надішліть їх Claude, він знайде причину.', stErrNone: 'Збоїв немає.', stErrSeen: 'востаннє', stErrClear: 'Очистити збої', stT: 'Помилки в завданнях', stD: 'Де тестувальники помиляються найчастіше. Без імен і пошти — лише спільні лічильники.', stTasks: 'завдань', stAnswers: 'відповідей', stMistakes: 'помилок', stAll: 'Усі', stGiven: 'Відповідали', stEmpty: 'Помилок поки немає.', stClear: 'Очистити статистику', stClearYes: 'Так, очистити', stNote: 'Якщо неправильну відповідь дають часто, перевірте: можливо, вона теж правильна — тоді її треба прийняти в даних.' },
  es: { stErr: 'Fallos de la aplicación', stErrD: 'Errores del programa en los dispositivos de los testers, sin nombres. Envíaselos a Claude para encontrar la causa.', stErrNone: 'No hay fallos.', stErrSeen: 'último', stErrClear: 'Borrar los fallos', stT: 'Errores en las tareas', stD: 'Dónde se equivocan más los testers. Sin nombres ni correos: solo contadores comunes.', stTasks: 'tareas', stAnswers: 'respuestas', stMistakes: 'errores', stAll: 'Todas', stGiven: 'Respondieron', stEmpty: 'Aún no hay errores.', stClear: 'Borrar las estadísticas', stClearYes: 'Sí, borrar', stNote: 'Si una respuesta «incorrecta» se da a menudo, compruebe si también es correcta: entonces los datos deben aceptarla.' },
  sk: { stErr: 'Chyby aplikácie', stErrD: 'Chyby programu u testerov — bez mien. Pošlite ich Claudovi, nájde príčinu.', stErrNone: 'Žiadne chyby.', stErrSeen: 'naposledy', stErrClear: 'Vymazať chyby', stT: 'Chyby v úlohách', stD: 'Kde sa testeri mýlia najčastejšie. Bez mien a e-mailov — len spoločné počítadlá.', stTasks: 'úloh', stAnswers: 'odpovedí', stMistakes: 'chýb', stAll: 'Všetky', stGiven: 'Odpovedali', stEmpty: 'Zatiaľ žiadne chyby.', stClear: 'Vymazať štatistiku', stClearYes: 'Áno, vymazať', stNote: 'Ak sa nesprávna odpoveď dáva často, overte, či nie je tiež správna — potom ju treba v dátach prijať.' },
});

const S = { data: null, busy: false, err: '', section: '', clearing: false };
const nameOf = id => { const s = SECTIONS.find(x => x.id === id); return s ? T(s.titleKey) : id; };

async function load(fn = () => call('GET', 'api/stats')) {
  S.busy = true; S.err = ''; paint();
  try { S.data = await fn(); } catch (e) { S.err = T(e.message === 'auth' ? 'authLost' : 'netErr'); }
  S.busy = false; paint();
}

register('stats', () => { paint(); if (!S.busy) load(); });

function paint() {
  if (currentScreen().name !== 'stats') return;
  const d = S.data, items = d ? d.items.filter(it => !S.section || it.section === S.section) : [];
  const ids = d ? [...new Set(d.items.map(it => it.section))] : [];
  const tot = d && d.total ? d.total : null;
  app().innerHTML = `<div class="screen">${backBar('settings')}
    <div><h1>${T('stT')}</h1><p class="sub">${T('stD')}${tot && tot.tasks ? ` · <b class="tab">${tot.tasks}</b> ${T('stTasks')} · <b class="tab">${(tot.good || 0) + (tot.bad || 0)}</b> ${T('stAnswers')} · <b class="tab">${tot.bad || 0}</b> ${T('stMistakes')}` : ''}</p></div>
    ${ids.length > 1 ? `<div class="chips">${['', ...ids].map(id => `<button class="chip" data-act="stsec" data-v="${id}" aria-pressed="${S.section === id}">${id ? esc(nameOf(id)) : T('stAll')}</button>`).join('')}</div>` : ''}
    ${errorsBox(d)}
    ${S.err ? `<p class="note" role="alert" style="color:var(--bad);border-color:var(--bad)">${S.err}</p>` : ''}
    <div class="mlist">${!d && S.busy ? `<p class="note">${T('loading')}</p>` : !items.length ? `<p class="note">${T('stEmpty')}</p>` : items.map(it => {
      const all = it.good + it.bad, pct = Math.round(it.bad / all * 100);
      return `<div class="mitem"><span style="min-width:0"><small style="color:var(--muted)">${esc(nameOf(it.section))}</small><br>
        <span style="overflow-wrap:anywhere">${esc(it.label)} → <b>${esc(it.answer)}</b></span>${it.given && it.given.length
          ? `<small class="tstat">${T('stGiven')}: ${it.given.map(g => `«${esc(g.given)}» ×${g.n}`).join(', ')}</small>` : ''}</span>
        <b class="tab" style="white-space:nowrap;color:${pct >= 50 ? 'var(--bad)' : 'var(--warm)'}">${it.bad}/${all} · ${pct}%</b></div>`;
    }).join('')}</div>
    <p class="note">${T('stNote')}</p>
    ${d && d.items.length ? `<div class="actions">${S.clearing
      ? `<button class="big" style="background:var(--bad)" data-act="stclearyes">${T('stClearYes')}${S.section ? ` · ${esc(nameOf(S.section))}` : ''}</button>`
      : `<button class="big ghost" data-act="stclear">${T('stClear')}</button>`}</div>` : ''}
  </div>`;
}

/** Crashes: message, place, how often, versions, screens and devices; newest first. */
function errorsBox(d) {
  if (!d || !d.errors) return '';
  const day = ms => { const t = new Date(ms); return `${t.getDate()}.${t.getMonth() + 1}. ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`; };
  return `<div class="group"><span class="label">${T('stErr')}</span><small style="color:var(--muted)">${T('stErrD')}</small>
    <div class="mlist">${!d.errors.length ? `<p class="note" style="margin:0">${T('stErrNone')}</p>` : d.errors.map(e => `<div class="mitem"><span style="min-width:0">
      <span style="overflow-wrap:anywhere"><b>${esc(e.msg)}</b></span>
      <small class="tstat" style="overflow-wrap:anywhere">${esc(e.file || '?')}:${e.line} · ${esc(e.versions || '')} · ${esc(e.screens || '')} · ${esc(e.devices || '')} · ${T('stErrSeen')} ${day(e.last)}</small></span>
      <b class="tab" style="white-space:nowrap;color:var(--bad)">×${e.n}</b></div>`).join('')}</div>
    ${d.errors.length ? `<button class="linkbtn" data-act="sterrclear">${T('stErrClear')}</button>` : ''}</div>`;
}

on('sterrclear', () => { if (!S.busy) load(async () => { await call('POST', 'api/stats/reset', { section: 'errors' }); return call('GET', 'api/stats'); }); });
on('stsec', v => { S.section = v; S.clearing = false; paint(); });
on('stclear', () => { S.clearing = true; paint(); });
on('stclearyes', () => { S.clearing = false; if (!S.busy) load(async () => { await call('POST', 'api/stats/reset', { section: S.section }); return call('GET', 'api/stats'); }); });
