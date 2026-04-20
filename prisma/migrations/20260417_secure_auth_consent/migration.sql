CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS token_hash TEXT;
UPDATE refresh_tokens SET token_hash = encode(digest(token, 'sha256'), 'hex') WHERE token_hash IS NULL;
ALTER TABLE refresh_tokens ALTER COLUMN token_hash SET NOT NULL;
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_token_key;
ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS token;
CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_hash_key ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_revoked_idx ON refresh_tokens(user_id, revoked);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx ON refresh_tokens(expires_at);

ALTER TABLE partner_refresh_tokens ADD COLUMN IF NOT EXISTS token_hash TEXT;
UPDATE partner_refresh_tokens SET token_hash = encode(digest(token, 'sha256'), 'hex') WHERE token_hash IS NULL;
ALTER TABLE partner_refresh_tokens ALTER COLUMN token_hash SET NOT NULL;
ALTER TABLE partner_refresh_tokens ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE partner_refresh_tokens DROP CONSTRAINT IF EXISTS partner_refresh_tokens_token_key;
ALTER TABLE partner_refresh_tokens DROP COLUMN IF EXISTS token;
CREATE UNIQUE INDEX IF NOT EXISTS partner_refresh_tokens_token_hash_key ON partner_refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS partner_refresh_tokens_partner_id_revoked_idx ON partner_refresh_tokens(partner_id, revoked);
CREATE INDEX IF NOT EXISTS partner_refresh_tokens_expires_at_idx ON partner_refresh_tokens(expires_at);

CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id TEXT NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consents_user_id_idx ON consents(user_id);
CREATE INDEX IF NOT EXISTS consents_partner_id_expires_at_idx ON consents(partner_id, expires_at);
