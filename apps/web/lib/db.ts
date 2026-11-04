import { Pool, type QueryResultRow } from "pg";

const globalDb = globalThis as typeof globalThis & { techhubPool?: Pool };

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return (globalDb.techhubPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  }));
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: readonly unknown[] = [],
): Promise<T[]> {
  return queryWithRole<T>(sql, values);
}

export async function queryAsUser<T extends QueryResultRow = QueryResultRow>(
  userId: string,
  sql: string,
  values: readonly unknown[] = [],
): Promise<T[]> {
  return queryWithRole<T>(sql, values, userId);
}

async function queryWithRole<T extends QueryResultRow>(
  sql: string,
  values: readonly unknown[],
  userId?: string,
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("set local role techhub_app");
    if (userId) await client.query("select set_config('app.user_id', $1, true)", [userId]);
    const result = await client.query<T>(sql, [...values]);
    await client.query("commit");
    return result.rows;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** Only for authenticated account deletion; the normal query path uses RLS. */
export async function deleteAuthenticatedUser(userId: string): Promise<void> {
  await getPool().query('delete from "user" where id = $1::uuid', [userId]);
}
