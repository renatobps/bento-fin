ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS subscription_stripe_id VARCHAR(100);

CREATE TABLE IF NOT EXISTS usage_counters (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE NOT NULL,
  expenses_this_month INTEGER DEFAULT 0,
  income_this_month INTEGER DEFAULT 0,
  month_key VARCHAR(7) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_user_id ON usage_counters(user_id);
