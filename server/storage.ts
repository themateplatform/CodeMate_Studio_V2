import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import { db } from "./db";

const PgSessionStore = connectPgSimple(session);

/**
 * Production-ready session store backed by PostgreSQL.
 * Automatically creates the 'session' table if it doesn't exist.
 */
export const sessionStore = new PgSessionStore({
  pool: db as any, // Drizzle pool is compatible with pg.Pool
  tableName: "session",
  createTableIfMissing: true,
  pruneSessionInterval: 60 * 15, // Clean up expired sessions every 15 minutes
});

export const storage = {
  sessionStore,
};
