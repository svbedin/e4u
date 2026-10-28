# E4U — easy for you, English for you

Игровой тренажёр английского языка с уровня A1 · интерфейс на русском, словацком, украинском.
Адрес: https://e4u.slovko.win (доступ только для приглашённых тестеров). © 2026 Serg.

Код сделан на основе Slovko; устройство и команды — в `CLAUDE.md`.

## Первая публикация (делает владелец, один раз)

Все команды — в папке `C:\Users\Sergiy\Documents\E4U` (в Claude Code — с `!` в начале). Вход в Cloudflare уже есть
(тот же, что для Slovko).

1. **Хранилище тестеров и база:**
   ```
   npx wrangler kv namespace create TESTERS
   npx wrangler d1 create e4u
   ```
   Каждая команда печатает `id` — их нужно вписать в `wrangler.jsonc` вместо `TODO-KV-ID` и `TODO-D1-ID`
   (Claude впишет, если прислать ему вывод). Затем таблицы базы:
   ```
   npx wrangler d1 execute e4u --remote --file worker/schema.sql -y
   ```
2. **Доступ (Cloudflare Zero Trust → Access controls):**
   - **Policies → Add a policy:** имя **E4U testers**, Action **Allow**, Include → **Emails** → ваш e-mail. Сохранить.
   - **Applications → Add an application → Self-hosted:** имя `E4U`, адрес `e4u.slovko.win`, политика **E4U testers**,
     Session Duration — 7 дней (как у Slovko). Сохранить и скопировать **Application Audience (AUD) Tag** —
     его вписать в `wrangler.jsonc` → `ACCESS_AUD`.
   - **Ещё одно приложение — для установки на Android:** `E4U — значок`, адреса `e4u.slovko.win/manifest.webmanifest`
     и `e4u.slovko.win/icons/*`, политика **Open for all** (уже есть со Slovko — выбрать в «Add existing policy»).
3. **Секреты сервера** (каждая команда спросит значение — вставить, Enter; на экран не выводится):
   ```
   npx wrangler secret put CF_API_TOKEN     (тот же токен, что у Slovko: Access — Apps and Policies — Edit)
   npx wrangler secret put ADMIN_EMAILS     (ваш e-mail)
   npx wrangler secret put RESEND_API_KEY   (тот же ключ Resend, что у Slovko)
   npm run vapid                            (ключи напоминаний)
   ```
   > Секреты Worker «e4u» отдельные от Slovko: их нужно ввести ещё раз, даже если значения те же.
4. **Выложить:** `npm run deploy`. Адрес `e4u.slovko.win` Cloudflare создаст сам (домен уже ваш).
5. Открыть https://e4u.slovko.win, войти кодом → шестерёнка → «Тестеры» → приглашать.

## Лимиты

- Cloudflare Access бесплатно — **50 человек на весь аккаунт**, вместе с тестерами Slovko.
- Письма (Resend) — общий лимит 100 писем в день, 3000 в месяц.
