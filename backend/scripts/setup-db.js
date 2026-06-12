import dotenv from "dotenv";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL || "postgres://postgres:tab778899@localhost:5432/cryptowallet";
const mode = process.argv[2] || "all";
const files = mode === "schema"
  ? ["../db/schema.sql"]
  : mode === "seed"
    ? ["../db/seed.sql"]
    : ["../db/schema.sql", "../db/seed.sql"];

const client = new pg.Client({
  connectionString,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
});

await client.connect();
try {
  for (const file of files) {
    const fullPath = resolve(__dirname, file);
    const sql = await fs.readFile(fullPath, "utf8");
    await client.query(sql);
    console.log(`Applied ${file.replace("../db/", "")}`);
  }
  console.log("Database setup complete.");
} finally {
  await client.end();
}
