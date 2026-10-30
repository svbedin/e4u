/*!
 * E4U — screenshots of every screen at phone width: `npm run screens`
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Starts the local server, opens the app in a hidden Microsoft Edge / Google Chrome window
 * 390 px wide, goes through all screens and game modes in the light and the dark theme
 * (all screens in Russian; home, settings and the menus also in Slovak and Ukrainian) and saves a PNG of each screen. Along the way it checks that nothing
 * scrolls sideways and that the language menu, the theme switch, the sound switch and the
 * on-screen keyboard work. The server answers (/api/...) are faked, so the admin screen
 * and the report sheet appear too. Exit code 1 if a check fails.
 * `npm run screens:quick` (--quick): only the light theme in Russian — for releases that change only words and phrases.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const QUICK = process.argv.includes('--quick');
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUT = join(tmpdir(), 'e4u-screens');
const PORT = 8091, CDP = 9333, URL0 = `http://localhost:${PORT}/`;
const BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
const browserPath = BROWSERS.find(existsSync);
if (!browserPath) { console.error('Не найден Edge или Chrome'); process.exit(1); }

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const PROFILE = join(tmpdir(), 'e4u-screens-profile');
rmSync(PROFILE, { recursive: true, force: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const check = (name, ok) => { if (!ok) { problems.push(name); console.log('  !!', name); } };

const server = spawn(process.execPath, [join(ROOT, 'tools', 'serve.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const browser = spawn(browserPath, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${PROFILE}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });

try {
  let list;
  for (let i = 0; i < 40 && !list; i++) { await sleep(250); try { list = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json(); } catch { /* not up yet */ } }
  if (!list) throw new Error('браузер не запустился');
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const cdp = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async expr => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  const click = async sel => {
    const ok = await js(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; e.click(); return true})()`);
    await sleep(450); check(`кнопка не найдена: ${sel}`, ok); return ok;
  };

  // fake English voices that record what they are asked to say (headless browsers have no audio);
  // sessionStorage 'novoice' simulates a device without an English voice
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__spoken = []; window.__voice = [];
    const laura = { lang: 'en-GB', name: 'Kate (test)', voiceURI: 'kate' }, filip = { lang: 'en-US', name: 'Daniel (test)', voiceURI: 'daniel' };
    const serena = { lang: 'en-GB', name: 'Serena (test)', voiceURI: 'serena' };
    const voices = sessionStorage.getItem('novoice') ? [] : sessionStorage.getItem('onevoice') ? [laura] : [laura, serena, filip];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => voices, speak: u => { window.__spoken.push(u.text); window.__voice.push(u.voice && u.voice.name); },
      cancel() {}, addEventListener() {} } });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };` });
  // fake server answers: the admin screen and the report sheet need them
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
    const of = window.fetch;
    window.fetch = async (u, o = {}) => { const s = String(u), J = d => new Response(JSON.stringify(d), { headers: { 'Content-Type': 'application/json' } });
      if (s.includes('api/me')) return J({ email: 'owner@example.com', admin: true });
      if (s.includes('api/testers')) { const N = Date.now(), D = 864e5;
        return J({ emails: ['anna@example.com', 'owner@example.com', 'very.long.address.for.layout.check@example-mail.com', 'new.tester@example.com', 'petra@example.sk'],
          admins: ['owner@example.com'], langs: { 'anna@example.com': 'uk', 'new.tester@example.com': 'en', 'petra@example.sk': 'sk' }, limit: 50, now: N,
          invited: { 'anna@example.com': N - 9 * D, 'new.tester@example.com': N - 2 * D, 'petra@example.sk': N - 20 * D },
          seen: { 'owner@example.com': { seen: N - 600e3, login: N - 2 * D, exp: N + 5 * D }, 'anna@example.com': { seen: N - 3 * D, login: N - 4 * D, exp: N + 3 * D },
            'very.long.address.for.layout.check@example-mail.com': { seen: N - 12 * D, login: N - 12 * D, exp: N - 5 * D }, 'petra@example.sk': { seen: N - 18 * D, login: N - 19 * D, exp: N - 12 * D } },
          ...(o.method === 'POST' ? { mail: 'sent', kind: 'invite' } : {}) }); }
      if (s.includes('api/feedback')) return J({ ok: true });
      // task statistics: what a round sends is kept in sessionStorage; the owner's screen gets two sample rows
      // a crash report (core/errors.js) is kept in sessionStorage too
      if (s.includes('api/stats/error')) { const l = JSON.parse(sessionStorage.getItem('crashes') || '[]'); l.push(JSON.parse(o.body)); sessionStorage.setItem('crashes', JSON.stringify(l)); return J({ ok: true, counted: 1 }); }
      if (s.includes('api/stats') && o.method === 'POST' && !s.includes('reset')) { const l = JSON.parse(sessionStorage.getItem('stats') || '[]'); l.push(...JSON.parse(o.body).items); sessionStorage.setItem('stats', JSON.stringify(l)); return J({ ok: true }); }
      if (s.includes('api/stats')) return J({ total: { tasks: 12, good: 40, bad: 9 }, items: [
        { section: 'nouns', key: 'child', label: 'child · plural', answer: 'children', good: 3, bad: 5, last: Date.now(), given: [{ given: 'childs', n: 4 }] },
        { section: 'verbs', key: 'go', label: 'go · I ___ · Past Simple', answer: 'went', good: 9, bad: 2, last: Date.now(), given: [{ given: 'goed', n: 2 }] }],
        errors: [{ msg: 'x is not a function', file: 'js/games/engine.js', line: 120, n: 3, last: Date.now(), versions: '2.47.0', screens: 'game', devices: 'android,ios' }] });
      // tournament: the player's nick and sent rounds live in sessionStorage
      if (s.includes('api/round')) { const l = JSON.parse(sessionStorage.getItem('rounds') || '[]'); l.push(JSON.parse(o.body)); sessionStorage.setItem('rounds', JSON.stringify(l)); return J({ ok: true }); }
      if (s.includes('api/tournament/nick')) { const n = JSON.parse(o.body).nick; if (n) sessionStorage.setItem('nick', n); else sessionStorage.removeItem('nick'); return J({ ok: true, nick: n }); }
      if (s.includes('api/tournament')) {
        const nick = sessionStorage.getItem('nick') || '', d = new Date(); d.setDate(d.getDate() - (d.getDay() + 6) % 7);
        const mine = nick ? [{ nick, xp: 210, rounds: 4, correct: 40, answered: 48, me: true }] : [];
        return J({ me: { nick, hidden: false }, weekStart: d.toISOString().slice(0, 10),
          week: [{ nick: 'Petra', xp: 540, rounds: 9, correct: 88, answered: 100 }, ...mine, { nick: 'A very long name 12', xp: 120, rounds: 2, correct: 20, answered: 24 }],
          blitz: { a1: [{ nick: 'Petra', score: 185 }, ...(nick ? [{ nick, score: 150, me: true }] : [])], a2: [] } }); }
      return of(u, o); };` });
  await cdp('Page.enable'); await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

  let shots = 0;
  async function shot(name) {
    await sleep(300);
    const { result } = await cdp('Page.getLayoutMetrics');
    const h = Math.ceil(Math.max(844, result.cssContentSize?.height || 844));
    const r = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: h, scale: 1 } });
    writeFileSync(join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64'));
    shots++;
    const over = await js(`document.documentElement.scrollWidth > 390 ? document.documentElement.scrollWidth : 0`);
    check(`${name}: горизонтальная прокрутка (${over}px)`, !over);
  }

  const cardText = () => js(`document.querySelector('.qcard')?.innerText || ''`);
  const quit = async () => { await click('[data-act="quit"]'); await sleep(300); };
  async function play(section, mode, name) {
    await click(`[data-act="play"][data-v="${section}:${mode}"]`); await shot(name);
    const ok = await js(`!!document.querySelector('.qcard, .pairs, .board, #dict, [data-act="ans"]')`);
    check(`${section} · ${mode}: задание не показано`, ok);
    await quit();
  }

  async function run(theme, lang) {
    console.log(`${theme === 'light' ? 'светлая' : 'тёмная'} тема, ${lang}`);
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
    await cdp('Page.navigate', { url: URL0 }); await sleep(1200);
    // the interface language is chosen in the settings
    await click('[data-act="go"][data-v="settings"]');
    check('настройки: три языка интерфейса', await js(`document.querySelectorAll('[data-act="lang"]').length`) === 3);
    await click(`[data-act="lang"][data-v="${lang}"]`);
    check(`язык ${lang} не выбран`, await js(`document.documentElement.lang`) === lang);
    const p = `${theme}-${lang}-`;
    await shot(p + '01b-settings');
    check('выбор голоса: из трёх голосов показаны два — женский и мужской', await js(`document.querySelectorAll('[data-act="voice"]').length`) === 2);
    await click('[data-act="go"][data-v="home"]'); await shot(p + '01-home');
    check('главная: глаголы, существительные, прилагательные, числа, фразы', await js(`['hub:verbs','hub:nouns','hub:adj','hub:nums','hub:phrases'].every(v => document.querySelector('[data-v="'+v+'"]'))`));
    check('главная: «Тренировка дня» и «Грамматика»', await js(`!!document.querySelector('[data-v="daily:daily"]') && !!document.querySelector('.screen > [data-v="grammar"]')`));
    if (lang !== 'ru') {  // the other languages: the menus only
      for (const s of ['verbs', 'nouns', 'adj', 'nums', 'phrases']) { await click(`[data-act="go"][data-v="hub:${s}"]`); await shot(`${p}02-hub-${s}`); await click('[data-act="go"][data-v="home"]'); }
      return;
    }
    // verbs: every mode; the typing keyboard has the apostrophe
    await click('[data-act="go"][data-v="hub:verbs"]'); await shot(p + '02-hub-verbs');
    check('глаголы: этапы to be … Past Simple, при A1 без Present Continuous и третьей формы', await js(`[...document.querySelectorAll('[data-act="verbs:stage"]')].map(b => b.dataset.v).join(',')`) === 'be,pres,past');
    for (const m of ['quiz', 'match', 'blitz']) await play('verbs', m, `${p}03-verbs-${m}`);
    await click('[data-act="play"][data-v="verbs:type"]'); await shot(p + '03-verbs-type');
    check('письмо: на клавиатуре есть апостроф ’', await js(`[...document.querySelectorAll('[data-act="key"]')].some(b => b.dataset.v === '’')`));
    await quit();
    await click('[data-act="go"][data-v="ref:verbs"]'); await shot(p + '04-verbs-ref');
    check('таблица глаголов: go — went — gone', await js(`document.querySelector('.screen').textContent.includes('went')`));
    await click('[data-act="go"][data-v="hub:verbs"]');
    // nouns
    await click('[data-act="go"][data-v="home"]'); await click('[data-act="go"][data-v="hub:nouns"]'); await shot(p + '05-hub-nouns');
    for (const m of ['quiz', 'type', 'match']) await play('nouns', m, `${p}06-nouns-${m}`);
    await click('[data-act="go"][data-v="ref:nouns"]'); await shot(p + '07-nouns-ref');
    await click('[data-act="go"][data-v="hub:nouns"]');
    // adjectives: at A1 the meaning and opposites only (the comparison is A2); every mode; the table
    await click('[data-act="go"][data-v="home"]'); await click('[data-act="go"][data-v="hub:adj"]'); await shot(p + '07e-hub-adj');
    check('прилагательные: при A1 этапы «значение» и «противоположное»', await js(`[...document.querySelectorAll('[data-act="adj:stage"]')].map(b => b.dataset.v).join(',')`) === 'mean,opp');
    for (const m of ['quiz', 'type', 'match']) await play('adj', m, `${p}07f-adj-${m}`);
    await click('[data-act="go"][data-v="ref:adj"]'); await shot(p + '07g-adj-ref');
    check('таблица прилагательных: big — bigger — the biggest', await js(`document.querySelector('.screen').textContent.includes('the biggest')`));
    await click('[data-act="go"][data-v="hub:adj"]');
    // numbers and time: every mode, the dictation too; the table of numbers
    await click('[data-act="go"][data-v="home"]'); await click('[data-act="go"][data-v="hub:nums"]'); await shot(p + '07b-hub-nums');
    check('числа: 7 этапов (0–100 … годы)', await js(`document.querySelectorAll('[data-act="nums:stage"]').length`) === 7);
    for (const m of ['quiz', 'type', 'match', 'dict']) await play('nums', m, `${p}07c-nums-${m}`);
    await click('[data-act="go"][data-v="ref:nums"]'); await shot(p + '07d-nums-ref');
    check('таблица чисел: half past six, twenty-first', await js(`(t => t.includes('half past six') && t.includes('twenty-first'))(document.querySelector('.screen').textContent)`));
    await click('[data-act="go"][data-v="hub:nums"]');
    // phrases: every mode, the dictation too (there is an English voice)
    await click('[data-act="go"][data-v="home"]'); await click('[data-act="go"][data-v="hub:phrases"]'); await shot(p + '08-hub-phrases');
    // the lessons' topics: 10 at A1 and "all"; picking one shows it pressed, "all" unpicks it
    check('фразы: «Все темы» и 10 тем A1', await js(`document.querySelectorAll('[data-act="phrases:topic"]').length`) === 11);
    await click('[data-act="phrases:topic"][data-v="2"]'); await shot(p + '08b-hub-phrases-topic');
    check('фразы: тема 2 выбрана', await js(`document.querySelector('[data-act="phrases:topic"][data-v="2"]').getAttribute('aria-pressed')`) === 'true');
    await play('phrases', 'quiz', p + '08c-phrases-topic-quiz');
    await click('[data-act="phrases:topic"][data-v="0"]');
    check('фразы: «Все темы» снова выбраны', await js(`document.querySelector('[data-act="phrases:topic"][data-v="0"]').getAttribute('aria-pressed')`) === 'true');
    for (const m of ['quiz', 'type', 'fix', 'order', 'translate', 'dialog', 'dict']) await play('phrases', m, `${p}09-phrases-${m}`);
    await click('[data-act="go"][data-v="ref:phrases"]'); await shot(p + '10-phrases-ref');
    await click('[data-act="go"][data-v="hub:phrases"]');
    // the daily training
    await click('[data-act="go"][data-v="home"]'); await play('daily', 'daily', p + '11-daily');
    // grammar: from the verbs menu its rules first and open
    await click('[data-act="go"][data-v="hub:verbs"]'); await click('[data-act="go"][data-v="grammar:verbs"]'); await shot(p + '12-grammar-verbs');
    check('грамматика: 12 правил, правило to be открыто первым', await js(`(() => { const d = [...document.querySelectorAll('details.gram')]; return d.length === 12 && d[0].open && d[0].id === 'g-be'; })()`));
    await click('[data-act="go"][data-v="hub:verbs"]');
    // the owner's screens
    await click('[data-act="go"][data-v="home"]'); await click('[data-act="go"][data-v="settings"]');
    await click('[data-act="go"][data-v="testers"]'); await sleep(500); await shot(p + '13-testers');
    await click('[data-act="go"][data-v="settings"]'); await click('[data-act="go"][data-v="stats"]'); await sleep(500); await shot(p + '14-stats');
    await click('[data-act="go"][data-v="settings"]'); await click('[data-act="go"][data-v="privacy"]'); await shot(p + '15-privacy');
    // A2: the past participle appears
    await click('[data-act="go"][data-v="settings"]'); await click('[data-act="go"][data-v="home"]');
    await click('[data-act="level"][data-v="a2"]'); await click('[data-act="go"][data-v="hub:verbs"]');
    check('глаголы при A2: появилась третья форма', await js(`!!document.querySelector('[data-act="verbs:stage"][data-v="pp"]')`));
    await click('[data-act="go"][data-v="home"]'); await click('[data-act="level"][data-v="a1"]');
  }

  for (const theme of QUICK ? ['light'] : ['light', 'dark']) for (const lang of QUICK ? ['ru'] : ['ru', 'sk', 'uk']) await run(theme, lang);

  // a device without an English voice: no 🔊 and no dictation
  console.log('без английского голоса');
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  await js(`sessionStorage.setItem('novoice', '1')`); await cdp('Page.reload'); await sleep(1500);
  await click('[data-act="go"][data-v="hub:phrases"]');
  check('без голоса: диктанта в фразах быть не должно', await js(`!document.querySelector('[data-v="phrases:dict"]')`));
  await js(`sessionStorage.removeItem('novoice')`);
  ws.close();
  console.log(`\nСнимков: ${shots}, папка: ${OUT}`);
} catch (e) {
  problems.push(String(e && e.message || e));
} finally {
  browser.kill(); server.kill();
  await sleep(500); rmSync(PROFILE, { recursive: true, force: true });
}
console.log(problems.length ? `Экраны: проблем ${problems.length}:\n  - ${problems.join('\n  - ')}` : 'Экраны: все проверки пройдены.');
process.exit(problems.length ? 1 : 0);
