CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(20)
);

INSERT INTO categories (name, icon) VALUES
  ('alimentação', '🍔'),
  ('transporte', '🚗'),
  ('lazer', '🎮'),
  ('saúde', '💊'),
  ('moradia', '🏠'),
  ('outros', '📦')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount NUMERIC(10,2) NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  description TEXT,
  expense_date DATE NOT NULL,
  source VARCHAR(10) DEFAULT 'text',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  raw_message TEXT,
  message_type VARCHAR(50),
  processed_successfully BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_state (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  pending_context JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_otp (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_phone ON auth_otp(phone);

CREATE TABLE IF NOT EXISTS spending_limits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE NOT NULL,
  daily_limit NUMERIC(10,2),
  weekly_limit NUMERIC(10,2),
  monthly_limit NUMERIC(10,2),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS limit_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  period_type VARCHAR(10) NOT NULL,
  period_key DATE NOT NULL,
  notified_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, period_type, period_key)
);

CREATE INDEX IF NOT EXISTS idx_limit_notifications_user ON limit_notifications(user_id);
