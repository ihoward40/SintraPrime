import { createPool, type Pool } from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

import * as schema from "./schema";

let pool: Pool | undefined;
let db: MySql2Database<typeof schema> | undefined;

function getMysqlUrl(): string | undefined {
  return process.env.MYSQL_URL ?? process.env.DATABASE_URL;
}

export function getDb(): MySql2Database<typeof schema> {
  if (db) return db;

  const mysqlUrl = getMysqlUrl();
  if (!mysqlUrl) {
    console.warn("MYSQL_URL not set. MySQL database operations will fail.");
    throw new Error("MYSQL_URL is required");
  }

  pool = createPool({
    uri: mysqlUrl,
    connectionLimit: 10,
    enableKeepAlive: true,
    dateStrings: true,
  });

  db = drizzle(pool, { schema, mode: "default" });
  return db;
}

export async function pingDb(): Promise<void> {
  const database = getDb();
  await database.execute(sql`select 1`);
}

export async function closeDb(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = undefined;
  db = undefined;
}

export { schema };
