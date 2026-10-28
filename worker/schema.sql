-- E4U — tournament database (Cloudflare D1)
-- Copyright (c) 2026 Serg. All rights reserved.
--
-- Apply: npx wrangler d1 execute e4u --remote --file worker/schema.sql
-- Safe to run again (IF NOT EXISTS).

-- people who joined the tournament: the e-mail never leaves the server, others see only the nick
CREATE TABLE IF NOT EXISTS players (
  email    TEXT PRIMARY KEY,
  nick     TEXT NOT NULL,
  nick_key TEXT NOT NULL UNIQUE,      -- lower-case nick: "Ana" and "ana" are the same name
  hidden   INTEGER NOT NULL DEFAULT 0, -- set by the owner (moderation)
  joined   INTEGER NOT NULL            -- ms
);

-- one row per finished round of a participant
CREATE TABLE IF NOT EXISTS rounds (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  email    TEXT NOT NULL,
  ts       INTEGER NOT NULL,           -- ms
  week     TEXT NOT NULL,              -- Monday of the week in Bratislava time, 'YYYY-MM-DD'
  section  TEXT NOT NULL,
  mode     TEXT NOT NULL,
  level    TEXT NOT NULL,
  xp       INTEGER NOT NULL,
  score    INTEGER NOT NULL,
  answered INTEGER NOT NULL,
  correct  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rounds_week  ON rounds (week, email);
CREATE INDEX IF NOT EXISTS rounds_blitz ON rounds (mode, level, email, score);

-- task statistics for the author (worker/stats.js): anonymous shared counters, no e-mail and no name
CREATE TABLE IF NOT EXISTS task_stats (
  section TEXT NOT NULL,
  key     TEXT NOT NULL,               -- the task's key in its section (e.g. 'kniha', 'n:47')
  label   TEXT NOT NULL,               -- what was asked, as the results screen shows it
  answer  TEXT NOT NULL,               -- the right answer
  good    INTEGER NOT NULL DEFAULT 0,   -- answered right
  bad     INTEGER NOT NULL DEFAULT 0,   -- answered wrong
  last    INTEGER NOT NULL,            -- ms
  PRIMARY KEY (section, key)
);
-- the wrong answers given, counted
CREATE TABLE IF NOT EXISTS task_given (
  section TEXT NOT NULL,
  key     TEXT NOT NULL,
  given   TEXT NOT NULL,
  n       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (section, key, given)
);

-- crashes in the app (worker/stats.js, www/js/core/errors.js): anonymous, no e-mail and no name
CREATE TABLE IF NOT EXISTS app_errors (
  msg      TEXT NOT NULL,              -- the error message
  file     TEXT NOT NULL,              -- the program file, e.g. 'js/games/engine.js'
  line     INTEGER NOT NULL,
  version  TEXT NOT NULL,              -- E4U version
  screen   TEXT NOT NULL,              -- the screen it happened on (home, game, settings…)
  device   TEXT NOT NULL,              -- 'android' | 'ios' | 'desktop'
  n        INTEGER NOT NULL DEFAULT 0,  -- how many times
  first    INTEGER NOT NULL,           -- ms
  last     INTEGER NOT NULL,           -- ms
  PRIMARY KEY (msg, file, line, version, screen, device)
);

-- reminders of the daily training (worker/push.js): the device's push address, the time and time zone chosen — no e-mail, no name
CREATE TABLE IF NOT EXISTS push_subs (
  id        TEXT PRIMARY KEY,          -- SHA-256 of the endpoint
  endpoint  TEXT NOT NULL,             -- the browser's push service address of this device
  p256dh    TEXT NOT NULL DEFAULT '',  -- the device's public key and auth secret: the payload is encrypted for it alone
  auth      TEXT NOT NULL DEFAULT '',
  time      TEXT NOT NULL,             -- 'HH:MM', local time of the reminder
  tz        TEXT NOT NULL,             -- IANA time zone, e.g. 'Europe/Bratislava'
  last_day  TEXT NOT NULL DEFAULT '',  -- the last day the daily training was done ('YYYY-MM-DD', local)
  last_sent TEXT NOT NULL DEFAULT '',  -- the last day a reminder was sent
  session_exp INTEGER NOT NULL DEFAULT 0, -- when the sign-in with a code ends (ms): reminders the day before and when it ended
  sent_soon INTEGER NOT NULL DEFAULT 0, -- the session_exp of the last "tomorrow" reminder
  sent_over INTEGER NOT NULL DEFAULT 0, -- the session_exp of the last "ended" reminder
  fails     INTEGER NOT NULL DEFAULT 0,
  created   INTEGER NOT NULL           -- ms
);
