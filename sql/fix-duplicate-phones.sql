-- Unifica usuários duplicados por variação do 9º dígito (celular BR)
-- Mantém o registro com telefone no formato WhatsApp (12 dígitos: 55 + DDD + 8)

UPDATE expenses e
SET user_id = canonical.id
FROM users canonical, users duplicate
WHERE canonical.phone = '556198595681'
  AND duplicate.phone = '5561998595681'
  AND e.user_id = duplicate.id;

UPDATE messages_log m
SET user_id = canonical.id
FROM users canonical, users duplicate
WHERE canonical.phone = '556198595681'
  AND duplicate.phone = '5561998595681'
  AND m.user_id = duplicate.id;

UPDATE conversation_state c
SET user_id = canonical.id
FROM users canonical, users duplicate
WHERE canonical.phone = '556198595681'
  AND duplicate.phone = '5561998595681'
  AND c.user_id = duplicate.id
  AND NOT EXISTS (SELECT 1 FROM conversation_state WHERE user_id = canonical.id);

DELETE FROM conversation_state
WHERE user_id IN (SELECT id FROM users WHERE phone = '5561998595681');

UPDATE auth_otp SET phone = '556198595681' WHERE phone = '5561998595681';

DELETE FROM users WHERE phone = '5561998595681';
