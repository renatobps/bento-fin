import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const schemaPath = join(__dirname, "../../sql/schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  console.log("Aplicando schema SQL...");
  await pool.query(schema);

  const { rows } = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM categories"
  );
  console.log(`Schema aplicado. Categorias cadastradas: ${rows[0].count}`);

  await pool.end();
}

migrate().catch((err) => {
  console.error("Erro ao migrar:", err);
  process.exit(1);
});
