/*!
 * E4U — keys for the reminders (push notifications): `npm run vapid`
 * Copyright (c) 2026 Serg. All rights reserved.
 *
 * Makes a new VAPID key pair (ECDSA P-256). The public key goes into wrangler.jsonc (VAPID_PUBLIC, it is public);
 * the private key goes straight into the Cloudflare secret VAPID_PRIVATE (`wrangler secret put`), it is never
 * printed or saved to a file. Run once by the owner (needs `npx wrangler login`), then `npm run deploy`.
 * Running it again makes new keys: devices that had the reminder on must switch it on again.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pub = Buffer.from(await crypto.subtle.exportKey('raw', pair.publicKey)).toString('base64url');
const priv = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey));

console.log('1/2 Секретный ключ → Cloudflare (VAPID_PRIVATE)…');
const code = await new Promise(resolve => {
  const p = spawn('npx', ['wrangler', 'secret', 'put', 'VAPID_PRIVATE'], { cwd: ROOT, shell: true, stdio: ['pipe', 'inherit', 'inherit'] });
  p.stdin.end(priv);
  p.on('close', resolve);
});
if (code !== 0) { console.error('Не получилось сохранить секрет. Войдите в Cloudflare: npx wrangler login — и запустите снова.'); process.exit(1); }

const path = join(ROOT, 'wrangler.jsonc');
const conf = await readFile(path, 'utf8');
if (!/"VAPID_PUBLIC":\s*"[^"]*"/.test(conf)) { console.error('В wrangler.jsonc нет VAPID_PUBLIC'); process.exit(1); }
await writeFile(path, conf.replace(/"VAPID_PUBLIC":\s*"[^"]*"/, `"VAPID_PUBLIC": "${pub}"`));
console.log('2/2 Открытый ключ записан в wrangler.jsonc (VAPID_PUBLIC).');
console.log('Готово. Осталось выложить: npm run deploy');
