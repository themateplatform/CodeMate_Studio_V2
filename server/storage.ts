import connectPgSimple from "connect-pg-simple";
import createMemoryStore from "memorystore";
import session from "express-session";
import { isDatabaseConfigured, pool } from "./db";

const PgSessionStore = connectPgSimple(session);
const MemoryStore = createMemoryStore(session);

/**
 * Production-ready session store backed by PostgreSQL when available.
 * Falls back to an in-memory store for local development environments where
 * DATABASE_URL is not configured.
 */
const sessionStore: session.Store = isDatabaseConfigured && pool
  ? new PgSessionStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15, // Clean up expired sessions every 15 minutes
    })
  : new MemoryStore({
      checkPeriod: 60 * 60 * 1000, // Prune expired sessions every hour
      max: 1000,
    });

export { sessionStore };

if (!isDatabaseConfigured) {
  console.warn(
    "[storage] Using in-memory session store because DATABASE_URL is not configured. Sessions will reset on restart.",
  );
}

export const storage = {
  sessionStore,
};
