import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { WebSocket } from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = WebSocket;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn(
    "[db] DATABASE_URL is not set. Falling back to development-safe mode with no database connection.",
  );
}

export const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : undefined;

export const db = pool ? drizzle({ client: pool, schema }) : undefined;

export const isDatabaseConfigured = Boolean(pool);
