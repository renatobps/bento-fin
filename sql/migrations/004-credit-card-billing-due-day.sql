ALTER TABLE credit_cards
  ADD COLUMN IF NOT EXISTS billing_due_day SMALLINT;
