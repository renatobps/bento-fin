-- Fase 3.1: painel admin

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_email VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS admin_password_hash VARCHAR(200),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id) NOT NULL,
  token_hash VARCHAR(200) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash);

CREATE TABLE IF NOT EXISTS admin_actions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id) NOT NULL,
  action VARCHAR(50) NOT NULL,
  target_user_id INTEGER REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id, created_at);
