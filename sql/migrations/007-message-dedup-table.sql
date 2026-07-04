CREATE TABLE IF NOT EXISTS message_dedup (
  id SERIAL PRIMARY KEY,
  message_key VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_message_dedup_key ON message_dedup(message_key);
CREATE INDEX IF NOT EXISTS idx_message_dedup_created ON message_dedup(created_at);
