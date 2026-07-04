import "dotenv/config";
import { pool } from "./pool.js";

/**
 * Apaga todos os dados de usuários e interações.
 * Mantém categorias (gastos/receitas) — estrutura base do Bento.
 */
async function resetDatabase(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Tabelas sem FK para users
    await client.query("TRUNCATE auth_otp RESTART IDENTITY");
    await client.query("TRUNCATE message_dedup RESTART IDENTITY");

    // CASCADE remove expenses, income, logs, cartões, limites, usage_counters, etc.
    await client.query("TRUNCATE users RESTART IDENTITY CASCADE");

    await client.query("COMMIT");

    console.log("✓ Banco zerado — nenhum usuário ou transação restante.");
    console.log("  Categorias de gasto e receita foram mantidas.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase().catch((err) => {
  console.error("Erro ao zerar banco:", err);
  process.exit(1);
});
