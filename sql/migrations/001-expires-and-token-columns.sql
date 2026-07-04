-- Migration para bancos existentes
ALTER TABLE conversation_state ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE messages_log ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE messages_log ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
