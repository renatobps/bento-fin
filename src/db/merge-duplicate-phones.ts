import { pool } from "./pool.js";
import { normalizePhone } from "../utils/phone.js";

const USER_FK_TABLES = [
  "expenses",
  "income",
  "messages_log",
  "spending_limits",
  "limit_notifications",
  "credit_cards",
  "credit_payments",
  "account_balance",
  "usage_counters",
] as const;

async function mergeDuplicatePhones() {
  const { rows: users } = await pool.query<{ id: number; phone: string }>(
    "SELECT id, phone FROM users ORDER BY id"
  );

  const groups = new Map<string, { id: number; phone: string }[]>();

  for (const user of users) {
    const canonical = normalizePhone(user.phone);
    const list = groups.get(canonical) ?? [];
    list.push(user);
    groups.set(canonical, list);
  }

  for (const [canonical, members] of groups) {
    if (members.length === 1) {
      const user = members[0];
      if (user.phone !== canonical) {
        await pool.query("UPDATE users SET phone = $1 WHERE id = $2", [
          canonical,
          user.id,
        ]);
        console.log(`Telefone corrigido: ${user.phone} → ${canonical}`);
      }
      continue;
    }

    members.sort((a, b) => a.id - b.id);
    const keep = members[0];
    const duplicates = members.slice(1);

    console.log(
      `Mesclando ${members.length} usuários para ${canonical} (mantendo id=${keep.id})`
    );

    for (const dup of duplicates) {
      for (const table of USER_FK_TABLES) {
        await pool.query(
          `UPDATE ${table} SET user_id = $1 WHERE user_id = $2`,
          [keep.id, dup.id]
        );
      }

      await pool.query(
        `UPDATE auth_otp SET phone = $1 WHERE phone = $2`,
        [canonical, dup.phone]
      );
      await pool.query(`DELETE FROM conversation_state WHERE user_id = $1`, [
        dup.id,
      ]);
      await pool.query(`DELETE FROM users WHERE id = $1`, [dup.id]);

      console.log(`  → usuário ${dup.id} (${dup.phone}) removido`);
    }

    if (keep.phone !== canonical) {
      await pool.query("UPDATE users SET phone = $1 WHERE id = $2", [
        canonical,
        keep.id,
      ]);
      console.log(`  → telefone atualizado: ${keep.phone} → ${canonical}`);
    }
  }

  await pool.end();
  console.log("Concluído.");
}

mergeDuplicatePhones().catch((err) => {
  console.error(err);
  process.exit(1);
});
