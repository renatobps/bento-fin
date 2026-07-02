import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
