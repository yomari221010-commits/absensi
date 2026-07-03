import { Pool } from "pg";

const globalForPg = globalThis as typeof globalThis & { __payrollinPg?: Pool };

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL belum diset. Tambahkan di .env.local atau Railway.");
  }

  if (!globalForPg.__payrollinPg) {
    const useSsl =
      process.env.PGSSLMODE === "require" ||
      process.env.NODE_ENV === "production" ||
      process.env.DATABASE_URL.includes("railway");

    globalForPg.__payrollinPg = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
  }

  return globalForPg.__payrollinPg;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const { rows } = await query<T>(text, params);
  return rows[0] ?? null;
}
