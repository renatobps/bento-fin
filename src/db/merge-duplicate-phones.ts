import { pool } from "./pool.js";
import { normalizePhone } from "../utils/phone.js";

async function mergeDuplicatePhones() {
  const { rows: users } = await pool.query<{ id: number; phone: string }>(
    "SELECT id, phone FROM users ORDER BY id"
  );

  const canonicalByPhone = new Map<string, number>();

  for (const user of users) {
    const canonical = normalizePhone(user.phone);
    const keepId = canonicalByPhone.get(canonical);

    if (keepId === undefined) {
      if (user.phone !== canonical) {
        await pool.query("UPDATE users SET phone = $1 WHERE id = $2", [
          canonical,
          user.id,
        ]);
        console.log(`Telefone corrigido: ${user.phone} → ${canonical}`);
      }
      canonicalByPhone.set(canonical, user.id);
      continue;
    }

    if (user.id === keepId) continue;

    await pool.query("UPDATE expenses SET user_id = $1 WHERE user_id = $2", [
      keepId,
      user.id,
    ]);
    await pool.query("UPDATE messages_log SET user_id = $1 WHERE user_id = $2", [
      keepId,
      user.id,
    ]);
    await pool.query("UPDATE auth_otp SET phone = $1 WHERE phone = $2", [
      canonical,
      user.phone,
    ]);
    await pool.query("DELETE FROM conversation_state WHERE user_id = $1", [
      user.id,
    ]);
    await pool.query("DELETE FROM users WHERE id = $1", [user.id]);

    console.log(
      `Usuário ${user.id} (${user.phone}) mesclado em ${keepId} (${canonical})`
    );
  }

  await pool.end();
  console.log("Concluído.");
}

mergeDuplicatePhones().catch((err) => {
  console.error(err);
  process.exit(1);
});
