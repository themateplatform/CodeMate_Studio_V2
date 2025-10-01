import { User } from "@shared/schema";

// Safe user serializer that removes sensitive data
export function safeUser(user: User) {
  const { password, mfaSecret, ...safeUserData } = user;
  return safeUserData;
}

// Runtime environment checks
export function validateEnvironment() {
  if (!process.env.SESSION_SECRET) {
    console.warn("SESSION_SECRET not set - using development fallback (not secure for production)");
  }
  
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not set - running in development mode without database");
  }
  
  // PRODUCTION REQUIREMENT: GitHub webhook secret must be present
  if (!process.env.GITHUB_WEBHOOK_SECRET) {
    console.warn("GITHUB_WEBHOOK_SECRET environment variable is missing - GitHub webhooks will not work");
  }
}

// PRODUCTION FIX: Database constraint validation at startup
export async function validateDatabaseConstraints() {
  try {
    const { sql } = await import("drizzle-orm");
    const { db } = await import("./db");
    
    if (!db) {
      console.warn("⚠️ Database not configured - skipping constraint validation");
      return false;
    }
    
    // Check for critical unique constraint on github_sync_events
    const constraintCheck = await db.execute(sql`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conrelid = 'github_sync_events'::regclass 
        AND contype = 'u'
    `);
    
    if (constraintCheck.rows.length === 0) {
      console.warn("⚠️ Warning: No unique constraints found on github_sync_events table");
      // Create the constraint if missing
      try {
        await db.execute(sql`
          ALTER TABLE github_sync_events 
          ADD CONSTRAINT unique_project_github_event 
          UNIQUE (project_id, github_event_id)
        `);
        console.log("✅ Created missing unique constraint on github_sync_events");
      } catch (error) {
        console.error("Failed to create unique constraint:", error);
        throw new Error("Database schema validation failed - unable to create critical constraints");
      }
    } else {
      console.log("✅ Found unique constraint on github_sync_events");
    }
    
    // Check for change_applications table
    const tableCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'change_applications'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.error("❌ CRITICAL: Missing change_applications table");
      throw new Error("Database schema validation failed - missing required tables");
    }
    
    console.log("✅ Database constraints validated successfully");
    return true;
  } catch (error) {
    console.error("Database constraint validation failed:", error);
    throw error;
  }
}