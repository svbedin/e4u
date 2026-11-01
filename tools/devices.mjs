/*!
 * E4U — screenshots and checks on tablets and computers: `npm run devices`
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * The phone check (`npm run screens`) goes through every screen at 390 px. This one opens the app in a hidden
 * Edge / Chrome window at tablet and computer sizes — 768×1024 and 1024×768 (tablet, touch), 1366×768 (laptop),
 * 1920×1080 (big monitor) — and goes through the home screen, the settings, every section's menu, one task of every
 * section, typing, pairs, the tables and the grammar. On each screen: nothing scrolls sideways, the content column
 * is not stretched over the whole width, the answer buttons fit on the screen; on a computer the physical keyboard
 * types into a typing task. PNGs go to a folder printed at the end. Exit code 1 if a check fails.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUT = join(tmpdir(), 'e4u-devices');
const PORT = 8097, CDP = 9337, URL0 = `http://localhost:${PORT}/`;
const DEVICES = [
  { name: 'tablet-portrait', width: 768, height: 1024, mobile: true },
  { name: 'tablet-landscape', width: 1024, height: 768, mobile: true },
  { name: 'laptop', width: 1366, height: 768, mobile: false },
  { name: 'desktop', width: 1920, height: 1080, mobile: false },
];
const BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
const browserPath = BROWSERS.find(existsSync);
if (!browserPath) { console.error('Не найден Edge или Chrome'); process.exit(1); }

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const PROFILE = join(tmpdir(), 'e4u-devices-profile');
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
    await sleep(400); check(`кнопка не найдена: ${sel}`, ok); return ok;
  };
  // a voice and the server answers, as in the phone check (headless browsers have no voices; there is no server here)
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
    const v = [{ lang: 'en-GB', name: 'Kate (test)', voiceURI: 'kate' }];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => v, speak() {}, cancel() {}, addEventListener() {} } });
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    const of = window.fetch;
    window.fetch = async (u, o = {}) => { const s = String(u), J = d => new Response(JSON.stringify(d), { headers: { 'Content-Type': 'application/json' } });
      if (s.includes('api/me')) return J({ email: 'owner@example.com', admin: true });
      if (s.includes('api/')) return J({ ok: true, week: [], blitz: { a1: [], a2: [] }, me: { nick: '' }, items: [], errors: [], total: { tasks: 0, good: 0, bad: 0 } });
      return of(u, o); };` });
  await cdp('Page.enable'); await cdp('Runtime.enable');

  for (const D of DEVICES) {
    console.log(`${D.name} ${D.width}×${D.height}`);
    await cdp('Emulation.setDeviceMetricsOverride', { width: D.width, height: D.height, deviceScaleFactor: 1, mobile: D.mobile });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: D.mobile });
    await cdp('Page.navigate', { url: URL0 }); await sleep(1500);
    await js('localStorage.clear()'); await cdp('Page.navigate', { url: URL0 }); await sleep(1500);
    const shot = async name => {
      await sleep(300);
      const { result } = await cdp('Page.getLayoutMetrics');
      const h = Math.ceil(Math.max(D.height, result.cssContentSize?.height || D.height));
      const r = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: D.width, height: h, scale: 1 } });
      writeFileSync(join(OUT, `${D.name}-${name}.png`), Buffer.from(r.result.data, 'base64'));
      const m = await js(`(() => { const s = document.querySelector('.screen'); const r = s ? s.getBoundingClientRect() : { width: 0, left: 0 };
        return { over: document.documentElement.scrollWidth > innerWidth ? document.documentElement.scrollWidth : 0, w: Math.round(r.width), left: Math.round(r.left) }; })()`);
      check(`${D.name} ${name}: горизонтальная прокрутка (${m.over}px)`, !m.over);
      // the content stays a readable column, centred, not stretched to the window
      check(`${D.name} ${name}: колонка растянута на ${m.w}px`, m.w <= 900);
      check(`${D.name} ${name}: колонка не по центру (слева ${m.left}px)`, D.width < 900 || Math.abs(m.left * 2 + m.w - D.width) < 40);
    };
    // the answer buttons of a task are on the screen without scrolling
    const answersVisible = name => js(`(() => { const b = [...document.querySelectorAll('.opts .opt, .kb button')]; return !b.length || b.every(x => x.getBoundingClientRect().bottom <= innerHeight + 1); })()`)
      .then(ok => check(`${D.name} ${name}: ответы не помещаются на экран`, ok));

    await shot('01-home');
    const hubs = await js(`[...document.querySelectorAll('[data-act="go"][data-v^="hub:"]')].map(b => b.dataset.v.slice(4))`);
    check(`${D.name}: на главной нет разделов`, hubs && hubs.length >= 5);
    await click('[data-act="go"][data-v="settings"]'); await shot('02-settings');
    await click('[data-act="go"][data-v="home"]');
    // B1: every stage of every section is on
    await click('[data-act="level"][data-v="a2"]');
    for (const h of hubs) {
      await click(`[data-act="go"][data-v="hub:${h}"]`); await shot(`03-hub-${h}`);
      if (await js(`!!document.querySelector('[data-act="play"][data-v="${h}:quiz"]')`)) {
        await click(`[data-act="play"][data-v="${h}:quiz"]`); await shot(`04-quiz-${h}`); await answersVisible(`quiz ${h}`);
        await click('[data-act="quit"]'); await sleep(300);
      }
      await click('[data-act="go"][data-v="home"]');
    }
    // typing: the on-screen keyboard fits; on a computer the physical keyboard types too
    await click('[data-act="go"][data-v="hub:verbs"]');
    await click('[data-act="play"][data-v="verbs:type"]'); await shot('05-verbs-type'); await answersVisible('письмо');
    if (!D.mobile) {
      for (const key of ['s', 'o', 'm']) {
        await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key, text: key, unmodifiedText: key });
        await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key });
      }
      await sleep(300);
      check(`${D.name}: клавиатура компьютера не печатает в «Письме»`, await js(`(document.getElementById('ti')?.textContent || '').includes('som')`));
    }
    await click('[data-act="quit"]'); await sleep(300);
    await click('[data-act="play"][data-v="verbs:match"]'); await shot('06-verbs-match'); await click('[data-act="quit"]'); await sleep(300);
    await click('[data-act="go"][data-v="ref:verbs"]'); await shot('07-verbs-ref');
    // back from a table leads to the section's menu, from there home
    await click('[data-act="go"][data-v="hub:verbs"]'); await click('[data-act="go"][data-v="home"]');
    await click('[data-act="go"][data-v="hub:nouns"]'); await click('[data-act="go"][data-v="ref:nouns"]');
    await js(`document.querySelector('details.v')?.setAttribute('open', '')`); await shot('08-nouns-ref');
    await click('[data-act="go"][data-v="hub:nouns"]'); await click('[data-act="go"][data-v="home"]'); await click('[data-act="go"][data-v="grammar"]'); await shot('09-grammar');
    await click('[data-act="go"][data-v="home"]'); await click('[data-act="play"][data-v="daily:daily"]'); await shot('10-daily'); await answersVisible('тренировка дня');
    await click('[data-act="quit"]'); await sleep(300);
  }

  console.log(`\nСнимков: ${readdirSync(OUT).length} (${DEVICES.length} размера экрана), папка: ${OUT}`);
  console.log(problems.length ? `Найдено проблем: ${problems.length}` : 'Планшеты и компьютеры: все проверки пройдены.');
  process.exitCode = problems.length ? 1 : 0;
} catch (e) {
  console.error(e); process.exitCode = 1;
} finally {
  browser.kill(); server.kill();
  await sleep(500); rmSync(PROFILE, { recursive: true, force: true });
}
