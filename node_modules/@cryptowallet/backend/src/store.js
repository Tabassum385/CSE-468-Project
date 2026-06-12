import dotenv from "dotenv";
import pg from "pg";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

export const hasDatabase = Boolean(process.env.DATABASE_URL);

const pool = hasDatabase
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
    })
  : null;

export async function query(text, params) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }
  return pool.query(text, params);
}
