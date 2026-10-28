-- E4U 2.47.0: the table of crash reports. Once: npx wrangler d1 execute e4u --remote --file worker/migrate-2.47.sql -y
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
