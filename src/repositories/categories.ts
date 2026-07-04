import { query } from "../db/pool.js";

export interface Category {
  id: number;
  name: string;
  icon: string | null;
}

const VALID_CATEGORIES = [
  "alimentação",
  "transporte",
  "lazer",
  "saúde",
  "moradia",
  "outros",
] as const;

export type CategoryName = (typeof VALID_CATEGORIES)[number];

export function isValidCategory(name: string): name is CategoryName {
  return (VALID_CATEGORIES as readonly string[]).includes(name);
}

export function normalizeCategory(name: string | null): CategoryName {
  if (name && isValidCategory(name.toLowerCase().trim())) {
    return name.toLowerCase().trim() as CategoryName;
  }
  return "outros";
}

export async function getCategoryByName(name: CategoryName): Promise<Category> {
  const result = await query<Category>(
    "SELECT id, name, icon FROM categories WHERE name = $1",
    [name]
  );

  if (!result.rows[0]) {
    throw new Error(`Categoria não encontrada: ${name}`);
  }

  return result.rows[0];
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const result = await query<Category>(
    "SELECT id, name, icon FROM categories WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getAllCategories(): Promise<Category[]> {
  const result = await query<Category>(
    "SELECT id, name, icon FROM categories ORDER BY id"
  );
  return result.rows;
}
