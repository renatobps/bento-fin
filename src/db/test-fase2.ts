import "dotenv/config";
import { query, pool } from "./pool.js";
import { findOrCreateUser } from "../repositories/users.js";
import { createIncome } from "../repositories/income.js";
import { getIncomeCategoryByName } from "../repositories/income-categories.js";
import { calculateBalance } from "../services/balance-calculator.js";
import { upsertCreditCard } from "../repositories/credit-cards.js";
import { getTodayISO } from "../utils/format.js";

const TEST_PHONE = process.env.LOJA_WHATSAPP ?? "5561996690313";

async function main() {
  console.log(`Teste Fase 2 — usuário: ${TEST_PHONE}`);

  const user = await findOrCreateUser(TEST_PHONE, "Teste Fase 2");
  console.log(`User ID: ${user.id}`);

  const category = await getIncomeCategoryByName("freelance");
  const income = await createIncome({
    userId: user.id,
    amount: 123.45,
    categoryId: category.id,
    description: "Teste Fase 2",
    incomeDate: getTodayISO(),
    source: "test",
  });
  console.log("createIncome OK:", income.id);

  const card = await upsertCreditCard(user.id, "TestCard", 5000);
  console.log("upsertCreditCard OK:", card.name);

  const balance = await calculateBalance(user.id);
  console.log("calculateBalance:", JSON.stringify(balance, null, 2));

  await query("DELETE FROM income WHERE id = $1", [income.id]);
  await query("DELETE FROM credit_cards WHERE id = $1", [card.id]);
  console.log("Dados de teste removidos.");

  await pool.end();
}

main().catch((err) => {
  console.error("Erro no teste Fase 2:", err);
  process.exit(1);
});
