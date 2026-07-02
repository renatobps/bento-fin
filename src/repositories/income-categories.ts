import { query } from "../db/pool.js";

export interface IncomeCategory {
  id: number;
  name: string;
  icon: string | null;
}

const VALID_INCOME_CATEGORIES = [
  "salário",
  "freelance",
  "venda",
  "investimento",
  "presente",
  "outros",
] as const;

export type IncomeCategoryName = (typeof VALID_INCOME_CATEGORIES)[number];

export function normalizeIncomeCategory(name: string | null): IncomeCategoryName {
  if (!name) return "outros";
  const normalized = name.toLowerCase().trim();
  if ((VALID_INCOME_CATEGORIES as readonly string[]).includes(normalized)) {
    return normalized as IncomeCategoryName;
  }
  return "outros";
}

export async function getIncomeCategoryByName(
  name: string
): Promise<IncomeCategory> {
  const normalized = normalizeIncomeCategory(name);
  const result = await query<IncomeCategory>(
    "SELECT id, name, icon FROM income_categories WHERE name = $1",
    [normalized]
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  const fallback = await query<IncomeCategory>(
    "SELECT id, name, icon FROM income_categories WHERE name = 'outros'"
  );

  if (!fallback.rows[0]) {
    throw new Error("Categoria de receita 'outros' não encontrada");
  }

  return fallback.rows[0];
}
