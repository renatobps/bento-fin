import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const FASE2_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS income_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(20)
  )`,
  `INSERT INTO income_categories (name, icon) VALUES
    ('salário', '💼'),
    ('freelance', '💻'),
    ('venda', '🛍️'),
    ('investimento', '📈'),
    ('presente', '🎁'),
    ('outros', '💰')
  ON CONFLICT (name) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS income (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL,
    category_id INTEGER REFERENCES income_categories(id),
    description TEXT,
    income_date DATE NOT NULL,
    source VARCHAR(10) DEFAULT 'text',
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_income_user_date ON income (user_id, income_date)`,
  `CREATE TABLE IF NOT EXISTS credit_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(50) NOT NULL,
    credit_limit NUMERIC(10,2),
    billing_due_day SMALLINT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS credit_payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount NUMERIC(10,2) NOT NULL,
    card_name VARCHAR(50),
    payment_date DATE NOT NULL,
    source VARCHAR(10) DEFAULT 'text',
    created_at TIMESTAMP DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_credit_payments_user_date ON credit_payments (user_id, payment_date)`,
  `CREATE TABLE IF NOT EXISTS account_balance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    initial_balance NUMERIC(10,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
  )`,
  `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'dinheiro'`,
  `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS card_name VARCHAR(50)`,
];

async function runStatement(label: string, sql: string): Promise<void> {
  try {
    await pool.query(sql);
    console.log(`✓ ${label}`);
  } catch (err) {
    console.error(`✗ ${label}:`, err);
    throw err;
  }
}

async function migrate() {
  const schemaPath = join(__dirname, "../../sql/schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  console.log("Aplicando schema SQL...");
  await pool.query(schema);

  const migrationsDir = join(__dirname, "../../sql/migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    console.log(`Aplicando migration ${file}...`);
    await pool.query(sql);
  }

  console.log("Aplicando statements da Fase 2...");
  for (let i = 0; i < FASE2_STATEMENTS.length; i++) {
    await runStatement(`Fase 2 statement ${i + 1}`, FASE2_STATEMENTS[i]);
  }

  const { rows: categoryRows } = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM categories"
  );
  console.log(`Schema aplicado. Categorias de gasto: ${categoryRows[0].count}`);

  const { rows: incomeCategoryRows } = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM income_categories"
  );
  console.log(`Categorias de receita: ${incomeCategoryRows[0].count}`);

  await pool.end();
}

migrate().catch((err) => {
  console.error("Erro ao migrar:", err);
  process.exit(1);
});
