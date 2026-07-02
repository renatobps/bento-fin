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
  input_tokens INTEGER,
  output_tokens INTEGER,
  detected_intent VARCHAR(50),
  intent_source VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_state (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  pending_context JSONB,
  expires_at TIMESTAMP,
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

-- Fase 2: categorias de receita
CREATE TABLE IF NOT EXISTS income_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(20)
);

INSERT INTO income_categories (name, icon) VALUES
  ('salário', '💼'),
  ('freelance', '💻'),
  ('venda', '🛍️'),
  ('investimento', '📈'),
  ('presente', '🎁'),
  ('outros', '💰')
ON CONFLICT (name) DO NOTHING;

-- Fase 2: receitas
CREATE TABLE IF NOT EXISTS income (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount NUMERIC(10,2) NOT NULL,
  category_id INTEGER REFERENCES income_categories(id),
  description TEXT,
  income_date DATE NOT NULL,
  source VARCHAR(10) DEFAULT 'text',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_user_date ON income (user_id, income_date);

-- Fase 2: cartões de crédito
CREATE TABLE IF NOT EXISTS credit_cards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(50) NOT NULL,
  credit_limit NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Fase 2: pagamentos de fatura
CREATE TABLE IF NOT EXISTS credit_payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  amount NUMERIC(10,2) NOT NULL,
  card_name VARCHAR(50),
  payment_date DATE NOT NULL,
  source VARCHAR(10) DEFAULT 'text',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_payments_user_date ON credit_payments (user_id, payment_date);

-- Fase 2: saldo inicial por usuário
CREATE TABLE IF NOT EXISTS account_balance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  initial_balance NUMERIC(10,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Fase 2: método de pagamento nos gastos
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'dinheiro';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS card_name VARCHAR(50);
