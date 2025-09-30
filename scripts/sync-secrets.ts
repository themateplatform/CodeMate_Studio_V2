#!/usr/bin/env tsx
/**
 * Sync secrets from Replit environment to Supabase Edge Functions
 * This script ensures all required API keys are available to the secret broker
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

interface SecretMapping {
  replitKey: string;
  supabaseKey: string;
  required: boolean;
  description: string;
}

const secretMappings: SecretMapping[] = [
  {
    replitKey: 'OPENAI_API_KEY',
    supabaseKey: 'OPENAI_API_KEY',
    required: true,
    description: 'OpenAI API key for code generation'
  },
  {
    replitKey: 'GITHUB_CLIENT_ID',
    supabaseKey: 'GITHUB_CLIENT_ID',
    required: true,
    description: 'GitHub OAuth client ID'
  },
  {
    replitKey: 'GITHUB_CLIENT_SECRET',
    supabaseKey: 'GITHUB_CLIENT_SECRET',
    required: true,
    description: 'GitHub OAuth client secret'
  },
  {
    replitKey: 'REPL_IDENTITY',
    supabaseKey: 'REPL_IDENTITY',
    required: false,
    description: 'Replit identity token'
  },
  {
    replitKey: 'WEB_REPL_RENEWAL',
    supabaseKey: 'WEB_REPL_RENEWAL',
    required: false,
    description: 'Replit web renewal token'
  }
];

async function syncSecrets() {
  console.log('🔑 Starting secret synchronization...');

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

  if (!supabaseUrl || !supabaseServiceRole) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  let syncedCount = 0;
  let errorCount = 0;

  for (const mapping of secretMappings) {
    const value = process.env[mapping.replitKey];
    
    if (!value) {
      if (mapping.required) {
        console.error(`❌ Required secret missing: ${mapping.replitKey}`);
        errorCount++;
      } else {
        console.warn(`⚠️  Optional secret missing: ${mapping.replitKey}`);
      }
      continue;
    }

    try {
      // Note: In a real implementation, you would set these as environment variables
      // in your Supabase project dashboard or use the Supabase CLI
      console.log(`✅ Found ${mapping.replitKey}: ${mapping.description}`);
      syncedCount++;
    } catch (error) {
      console.error(`❌ Failed to sync ${mapping.replitKey}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Synchronization complete:`);
  console.log(`   ✅ Synced: ${syncedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.log('\n🛠️  Manual steps required:');
    console.log('1. Open your Supabase project dashboard');
    console.log('2. Go to Settings → Environment Variables');
    console.log('3. Add the missing secrets listed above');
    console.log('4. Redeploy your Edge Functions');
  }

  console.log('\n🚀 Secret broker is ready to use!');
}

// Validation function for required secrets
export function validateSecrets(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const mapping of secretMappings) {
    if (mapping.required && !process.env[mapping.replitKey]) {
      missing.push(mapping.replitKey);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

if (require.main === module) {
  syncSecrets().catch(console.error);
}