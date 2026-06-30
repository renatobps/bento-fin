import { query } from "../db/pool.js";

export interface User {
  id: number;
  phone: string;
  name: string | null;
}

export async function findOrCreateUser(
  phone: string,
  name?: string
): Promise<User> {
  const existing = await query<User>(
    "SELECT id, phone, name FROM users WHERE phone = $1",
    [phone]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const created = await query<User>(
    "INSERT INTO users (phone, name) VALUES ($1, $2) RETURNING id, phone, name",
    [phone, name ?? null]
  );

  return created.rows[0];
}
