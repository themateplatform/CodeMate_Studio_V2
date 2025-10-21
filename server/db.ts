import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { WebSocket } from "ws";
import * as schema from "@shared/schema";

const disabledMessage = "[db] Database disabled in dev (no DATABASE_URL).";

const createDisabledProxy = <T extends object>(label: string): T => {
  const handler: ProxyHandler<any> = {
    get: (_target, property) => {
      if (property === Symbol.toStringTag) {
        return label;
      }

      if (
        property === "toString" ||
        property === "valueOf" ||
        property === Symbol.toPrimitive
      ) {
        return () => label;
      }

      if (property === "then") {
        return undefined;
      }

      return createDisabledProxy(`${label}.${String(property)}`);
    },
    apply: () => {
      throw new Error(disabledMessage);
    },
    construct: () => {
      throw new Error(disabledMessage);
    },
  };

  return new Proxy(() => {
    throw new Error(disabledMessage);
  }, handler) as T;
};

neonConfig.webSocketConstructor = WebSocket;

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.warn("[db] DATABASE_URL not set — starting in no-DB mode");
  process.env.DISABLE_DB = "1";
} else if (process.env.DISABLE_DB === "1") {
  delete process.env.DISABLE_DB;
}

const pool: Pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : createDisabledProxy<Pool>("Pool");

type DatabaseClient = NeonDatabase<typeof schema>;

const db: DatabaseClient = databaseUrl
  ? drizzle({ client: pool, schema })
  : createDisabledProxy<DatabaseClient>("Database");

export { pool, db };
