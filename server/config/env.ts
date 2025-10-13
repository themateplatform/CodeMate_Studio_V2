const requiredEnv = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
] as const;

type RequiredEnvKey = (typeof requiredEnv)[number];

type Config = Record<RequiredEnvKey, string> & {
  SUPABASE_SERVICE_ROLE: string;
};

const missing: RequiredEnvKey[] = [];
const envValues = Object.create(null) as Config;

for (const key of requiredEnv) {
  const value = process.env[key];
  if (!value) {
    missing.push(key);
    continue;
  }
  envValues[key] = value;
}

envValues.SUPABASE_SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE || envValues.SUPABASE_SERVICE_ROLE_KEY || "";

if (!envValues.SUPABASE_SERVICE_ROLE) {
  missing.push("SUPABASE_SERVICE_ROLE_KEY");
}

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}. Please configure Supabase Vault secrets.`
  );
}

export const env = {
  supabaseUrl: envValues.SUPABASE_URL,
  supabaseAnonKey: envValues.SUPABASE_ANON_KEY,
  supabaseServiceRole: envValues.SUPABASE_SERVICE_ROLE,
  openAIApiKey: envValues.OPENAI_API_KEY,
};
