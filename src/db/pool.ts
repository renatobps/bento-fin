import { Pool, QueryResultRow } from "pg";
import { env } from "../config/env.js";
import { TZ } from "../utils/timezone.js";

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on("connect", (client) => {
  client.query(`SET TIME ZONE '${TZ}'`).catch((err) => {
    console.error("Falha ao definir timezone da sessão:", err);
  });
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}
