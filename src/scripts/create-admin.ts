import * as readline from "readline";
import "dotenv/config";
import { pool } from "../db/pool.js";
import { createAdminUser, findAdminByEmail, hashAdminPassword } from "../repositories/admin.js";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("=== Criar admin Bento ===\n");

  const name = await prompt("Nome: ");
  const email = await prompt("E-mail: ");
  const password = await prompt("Senha: ");

  if (!name || !email || !password) {
    console.error("Nome, e-mail e senha são obrigatórios.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Senha deve ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const existing = await findAdminByEmail(email);
  if (existing) {
    console.error("Já existe um admin com este e-mail.");
    process.exit(1);
  }

  const passwordHash = await hashAdminPassword(password);
  const id = await createAdminUser({ name, email, passwordHash });

  console.log(`\nAdmin criado com sucesso (id: ${id}).`);
  console.log(`E-mail: ${email.toLowerCase()}`);
  console.log("Acesse /admin/login no dashboard.");
  await pool.end();
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
