-- Segurança: limitar tentativas de verificação do código OTP

ALTER TABLE auth_otp
  ADD COLUMN IF NOT EXISTS attempts SMALLINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_auth_otp_phone_active
  ON auth_otp (phone, used, expires_at);
