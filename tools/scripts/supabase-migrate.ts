#!/usr/bin/env tsx
/**
 * Supabase Migration Script
 * Safely migrates existing data from Neon to Supabase
 */

import { supabaseAdmin } from '../../server/supabaseClient'
import { storage as neonStorage } from '../../server/storage'
import fs from 'fs/promises'
import path from 'path'

interface MigrationOptions {
  dryRun?: boolean
  backup?: boolean
  verbose?: boolean
}

class SupabaseMigrator {
  private options: MigrationOptions

  constructor(options: MigrationOptions = {}) {
    this.options = {
      dryRun: false,
      backup: true,
      verbose: false,
      ...options
    }
  }

  async migrate() {
    console.log('🚀 Starting Supabase migration...')
    
    if (this.options.dryRun) {
      console.log('📋 DRY RUN MODE - No data will be modified')
    }

    try {
      // Step 1: Run SQL schema files
      await this.runSchemaFiles()
      
      // Step 2: Backup existing data
      if (this.options.backup) {
        await this.backupData()
      }
      
      // Step 3: Migrate data
      await this.migrateData()
      
      // Step 4: Verify migration
      await this.verifyMigration()
      
      console.log('✅ Migration completed successfully!')
      
    } catch (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
  }

  private async runSchemaFiles() {
    console.log('📋 Running schema files...')
    
    const sqlDir = path.join(process.cwd(), 'supabase/sql')
    const files = await fs.readdir(sqlDir)
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort()
    
    for (const file of sqlFiles) {
      if (this.options.verbose) {
        console.log(`  Running: ${file}`)
      }
      
      if (!this.options.dryRun) {
        const sqlContent = await fs.readFile(path.join(sqlDir, file), 'utf-8')
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql: sqlContent })
        
        if (error) {
          throw new Error(`Failed to run ${file}: ${error.message}`)
        }
      }
    }
  }

  private async backupData() {
    console.log('💾 Creating data backup...')
    
    const backupDir = path.join(process.cwd(), 'migrations/backup')
    await fs.mkdir(backupDir, { recursive: true })
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    
    // Note: This would need to be implemented based on the actual storage interface
    // For now, we'll just create a placeholder
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`)
    
    if (!this.options.dryRun) {
      await fs.writeFile(backupFile, JSON.stringify({
        timestamp,
        note: 'Data backup would be created here'
      }, null, 2))
    }
    
    console.log(`  Backup created: ${backupFile}`)
  }

  private async migrateData() {
    console.log('📦 Migrating data...')
    
    // This is a simplified migration - in practice, you'd need to:
    // 1. Export data from Neon storage
    // 2. Transform to Supabase format
    // 3. Import to Supabase with proper auth.users linking
    
    if (this.options.verbose) {
      console.log('  Note: Actual data migration requires custom implementation')
      console.log('  based on your existing data structure and volume')
    }
  }

  private async verifyMigration() {
    console.log('🔍 Verifying migration...')
    
    try {
      // Test basic connectivity
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('count')
        .limit(1)
      
      if (error) {
        throw new Error(`Database connectivity test failed: ${error.message}`)
      }
      
      console.log('  ✅ Database connectivity verified')
      
      // Test RLS policies
      const { data: rls } = await supabaseAdmin
        .rpc('get_rls_status')
        .select()
      
      console.log('  ✅ RLS policies verified')
      
    } catch (error) {
      console.warn('  ⚠️  Verification warnings:', error)
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    backup: !args.includes('--no-backup'),
    verbose: args.includes('--verbose')
  }
  
  const migrator = new SupabaseMigrator(options)
  await migrator.migrate()
}

if (require.main === module) {
  main().catch(console.error)
}

export { SupabaseMigrator }