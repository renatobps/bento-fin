import { query } from "../db/pool.js";
import { normalizePhone } from "../utils/phone.js";

export interface User {
  id: number;
  phone: string;
  name: string | null;
  email: string | null;
  created_at: Date;
  is_blocked: boolean;
}

const USER_SELECT =
  "id, phone, name, email, created_at, COALESCE(is_blocked, false) AS is_blocked";

export async function findOrCreateUser(
  phone: string,
  name?: string
): Promise<User> {
  const normalized = normalizePhone(phone);

  const existing = await query<User>(
    `SELECT ${USER_SELECT} FROM users WHERE phone = $1`,
    [normalized]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const created = await query<User>(
    `INSERT INTO users (phone, name) VALUES ($1, $2) RETURNING ${USER_SELECT}`,
    [normalized, name ?? null]
  );

  return created.rows[0];
}

export async function getUserById(userId: number): Promise<User | null> {
  const result = await query<User>(
    `SELECT ${USER_SELECT} FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function updateUserProfile(
  userId: number,
  updates: { name?: string | null; email?: string | null }
): Promise<User | null> {
  const sets: string[] = [];
  const params: unknown[] = [userId];
  let idx = 2;

  if (updates.name !== undefined) {
    sets.push(`name = $${idx++}`);
    params.push(updates.name);
  }
  if (updates.email !== undefined) {
    sets.push(`email = $${idx++}`);
    params.push(updates.email);
  }

  if (sets.length === 0) {
    return getUserById(userId);
  }

  const result = await query<User>(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $1 RETURNING ${USER_SELECT}`,
    params
  );

  return result.rows[0] ?? null;
}
