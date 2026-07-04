-- Log de classificação de intent para revisão e melhoria contínua
ALTER TABLE messages_log ADD COLUMN IF NOT EXISTS detected_intent VARCHAR(50);
ALTER TABLE messages_log ADD COLUMN IF NOT EXISTS intent_source VARCHAR(20);
