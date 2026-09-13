-- ALPHA-11 partner waitlist — D1 production path (not enabled yet).
-- Today the Worker stores rows in the existing KV namespace `alpha11-waitlist`.
-- When you want SQL/admin queries, create D1 and migrate:
--
--   npx wrangler d1 create alpha11
--   npx wrangler d1 execute alpha11 --file=worker/schema.sql --remote
--
-- Then add to wrangler.jsonc:
--   "d1_databases": [{ "binding": "DB", "database_name": "alpha11", "database_id": "<id>" }]
-- and switch worker/src/store.ts to prefer DB when bound.

CREATE TABLE IF NOT EXISTS partner_waitlist (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  budget_band TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'partners_form'
);

CREATE INDEX IF NOT EXISTS partner_waitlist_email_idx
  ON partner_waitlist (email);

CREATE INDEX IF NOT EXISTS partner_waitlist_created_idx
  ON partner_waitlist (created_at);
