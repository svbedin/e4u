-- E4U 2.43.0 — reminders of the end of the sign-in: new columns in push_subs (the table was made in 2.42.0)
-- Copyright (c) 2026 Serg. All rights reserved.
--
-- Apply once: npx wrangler d1 execute e4u --remote --file worker/migrate-2.43.sql -y
-- (worker/schema.sql already has these columns for a new database.)
ALTER TABLE push_subs ADD COLUMN p256dh TEXT NOT NULL DEFAULT '';
ALTER TABLE push_subs ADD COLUMN auth TEXT NOT NULL DEFAULT '';
ALTER TABLE push_subs ADD COLUMN session_exp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE push_subs ADD COLUMN sent_soon INTEGER NOT NULL DEFAULT 0;
ALTER TABLE push_subs ADD COLUMN sent_over INTEGER NOT NULL DEFAULT 0;
