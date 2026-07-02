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
