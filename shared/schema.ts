import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean, integer, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Organizations for multi-tenancy
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  domain: text("domain"),
  settings: jsonb("settings"), // SSO, branding, etc.
  subscriptionStatus: text("subscription_status").default("trial"), // trial, active, suspended
  crossAppSharingEnabled: boolean("cross_app_sharing_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced users table with comprehensive auth + Replit Auth support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // Keep existing ID type for compatibility
  organizationId: varchar("organization_id").references(() => organizations.id),
  username: text("username").notNull().unique(),
  email: text("email").unique(), // Made nullable for Replit Auth
  password: text("password"), // For email/password auth
  emailVerified: boolean("email_verified").default(false),
  
  // Replit Auth fields
  firstName: varchar("first_name"), // Required for Replit Auth
  lastName: varchar("last_name"), // Required for Replit Auth
  profileImageUrl: varchar("profile_image_url"), // Required for Replit Auth
  
  // Existing fields
  githubUsername: text("github_username"),
  supabaseProjectUrl: text("supabase_project_url"),
  role: text("role").default("member"), // owner, admin, member, viewer
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: text("mfa_secret"), // TOTP secret
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"), // Additional user data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Passkeys/WebAuthn credentials
export const passkeys = pgTable("passkeys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").default(0),
  deviceName: text("device_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cross-app identity linking
export const appIdentities = pgTable("app_identities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  appId: text("app_id").notNull(), // Identifier for different apps
  externalUserId: text("external_user_id"), // User ID in external app
  sharedData: jsonb("shared_data"), // Shared profile/preferences
  permissions: jsonb("permissions"), // What data can be shared
  consentGiven: boolean("consent_given").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserApp: unique().on(table.userId, table.appId),
}));

// Audit logs for security and compliance (append-only)
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  organizationId: varchar("organization_id").references(() => organizations.id),
  action: text("action").notNull(), // login, logout, create_project, etc.
  resource: text("resource"), // project, user, organization
  resourceId: text("resource_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Immutability constraint - audit logs cannot be modified once created
  isImmutable: boolean("is_immutable").default(true).notNull(),
}, (table) => [
  // Indexes for efficient querying
  index("idx_audit_logs_user").on(table.userId),
  index("idx_audit_logs_org").on(table.organizationId),
  index("idx_audit_logs_created").on(table.createdAt),
  index("idx_audit_logs_action").on(table.action),
]);

// OAuth connections (GitHub, Google, etc.)
export const oauthConnections = pgTable("oauth_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  provider: text("provider").notNull(), // github, google, microsoft
  providerId: text("provider_id").notNull(), // External user ID
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  scopes: jsonb("scopes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueUserProvider: unique().on(table.userId, table.provider),
}));

// Enhanced projects with GitHub-first features
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id),
  name: text("name").notNull(),
  description: text("description"),
  githubRepoUrl: text("github_repo_url"),
  githubBranch: text("github_branch").default("main"),
  githubSyncEnabled: boolean("github_sync_enabled").default(false),
  githubWebhookId: text("github_webhook_id"),
  supabaseProjectId: text("supabase_project_id"),
  supabaseUrl: text("supabase_url"), // Supabase project URL
  provisioningStatus: text("provisioning_status").default("not_provisioned"), // not_provisioned, provisioning, provisioned, failed
  
  // Cross-app features
  parentAppId: varchar("parent_app_id"), // For linked apps
  sharedDesignTokens: jsonb("shared_design_tokens"), // Design system
  sharedComponents: jsonb("shared_components"), // Component library
  
  // Project settings
  isPublic: boolean("is_public").default(false),
  autonomyLevel: text("autonomy_level").default("ask_some"), // ask_everything, ask_some, ask_none
  deploymentConfig: jsonb("deployment_config"),
  
  // Brief/questionnaire responses
  briefResponses: jsonb("brief_responses"), // Answers to upfront questions
  techStack: jsonb("tech_stack"), // Selected technologies
  requirements: jsonb("requirements"), // Functional requirements
  
  // Test Coverage fields
  testCoverage: integer("test_coverage"), // Overall test coverage percentage (0-100)
  lastCoverageRun: timestamp("last_coverage_run"), // Last time coverage was calculated
  coverageEnforced: boolean("coverage_enforced").default(false), // Whether to enforce coverage threshold
  
  // Normalization fields
  lastNormalizationRun: varchar("last_normalization_run"),
  structureCompliance: integer("structure_compliance"), // 0-100 percentage
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =============================================================================
// SPECIFICATION SYSTEM - Living specifications as single source of truth
// =============================================================================

// Main specification documents - the living spec that guides everything
export const specs = pgTable("specs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  
  // Core spec components (living specification)
  purpose: text("purpose").notNull(), // Why this product exists
  audience: text("audience").notNull(), // Who it's for
  problemStatement: text("problem_statement"), // What problem it solves
  solutionOverview: text("solution_overview"), // How it solves the problem
  
  // Success criteria
  successMetrics: jsonb("success_metrics"), // KPIs and success measurements
  acceptanceCriteria: jsonb("acceptance_criteria"), // When it's done
  
  // Metadata
  status: text("status").default("draft"), // draft, review, approved, implemented
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  isTemplate: boolean("is_template").default(false), // Can be used as template
  
  // Governance
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_specs_project").on(table.projectId),
  index("idx_specs_status").on(table.status),
  index("idx_specs_template").on(table.isTemplate),
]);

// Version history for specs - immutable record of changes
export const specVersions = pgTable("spec_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  specId: varchar("spec_id").references(() => specs.id).notNull(),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  content: jsonb("content").notNull(), // Full spec content snapshot
  changeSummary: text("change_summary"), // What changed in this version
  changedBy: varchar("changed_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("unique_spec_version").on(table.specId, table.version),
  index("idx_spec_versions_spec").on(table.specId),
]);

// Extracted requirements from specs - functional and non-functional
export const specRequirements = pgTable("spec_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  specId: varchar("spec_id").references(() => specs.id).notNull(),
  type: text("type").notNull(), // functional, non-functional, business, technical
  category: text("category").notNull(), // ui, api, data, security, performance, etc.
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("medium"), // high, medium, low
  acceptanceCriteria: jsonb("acceptance_criteria"), // How to verify completion
  status: text("status").default("pending"), // pending, in-progress, completed, cancelled
  assignedTo: varchar("assigned_to").references(() => users.id),
  estimatedEffort: integer("estimated_effort"), // Story points or hours
  actualEffort: integer("actual_effort"), // Actual time spent
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_spec_requirements_spec").on(table.specId),
  index("idx_spec_requirements_type").on(table.type),
  index("idx_spec_requirements_status").on(table.status),
  index("idx_spec_requirements_assigned").on(table.assignedTo),
]);

// User journeys defined in specs - the core user experiences
export const specUserJourneys = pgTable("spec_user_journeys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  specId: varchar("spec_id").references(() => specs.id).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  userType: text("user_type").notNull(), // primary, secondary, admin, etc.
  steps: jsonb("steps").notNull(), // Ordered list of journey steps
  successCriteria: jsonb("success_criteria"), // How to measure journey success
  painPoints: jsonb("pain_points"), // Current problems this journey solves
  priority: text("priority").default("medium"), // high, medium, low
  status: text("status").default("draft"), // draft, reviewed, implemented
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_spec_journeys_spec").on(table.specId),
  index("idx_spec_journeys_user_type").on(table.userType),
]);

// Data models defined in specs - entities and relationships
export const specDataModels = pgTable("spec_data_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  specId: varchar("spec_id").references(() => specs.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // entity, value_object, aggregate, etc.
  fields: jsonb("fields").notNull(), // Field definitions with types, constraints
  relationships: jsonb("relationships"), // Relations to other data models
  businessRules: jsonb("business_rules"), // Validation rules, constraints
  status: text("status").default("draft"), // draft, reviewed, implemented
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_spec_data_models_spec").on(table.specId),
  index("idx_spec_data_models_type").on(table.type),
]);

// Success criteria and KPIs from specs
export const specSuccessCriteria = pgTable("spec_success_criteria", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  specId: varchar("spec_id").references(() => specs.id).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // kpi, metric, goal, outcome
  category: text("category").notNull(), // user_engagement, business, technical, quality
  targetValue: jsonb("target_value"), // Numeric target or qualitative measure
  currentValue: jsonb("current_value"), // Current measurement
  measurementMethod: text("measurement_method"), // How it's measured
  frequency: text("frequency"), // daily, weekly, monthly, quarterly
  responsible: varchar("responsible").references(() => users.id), // Who owns this metric
  status: text("status").default("active"), // active, paused, achieved, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_spec_success_criteria_spec").on(table.specId),
  index("idx_spec_success_criteria_type").on(table.type),
  index("idx_spec_success_criteria_category").on(table.category),
]);

// GitHub webhooks and sync tracking
export const githubSyncEvents = pgTable("github_sync_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  eventType: text("event_type").notNull(), // push, pull_request, commit
  githubEventId: text("github_event_id").notNull(),
  payload: jsonb("payload"),
  status: text("status").default("pending"), // pending, success, failed
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("unique_project_github_event").on(table.projectId, table.githubEventId),
  index("idx_github_sync_events_project").on(table.projectId),
  index("idx_github_sync_events_type").on(table.eventType),
  index("idx_github_sync_events_status").on(table.status),
  index("idx_github_sync_events_created").on(table.createdAt),
]);

// GitHub branch state tracking for 2-way sync
export const githubBranchStates = pgTable("github_branch_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  branchName: text("branch_name").notNull(),
  lastLocalSha: text("last_local_sha"), // Last commit SHA from CodeVibe -> GitHub
  lastRemoteSha: text("last_remote_sha"), // Last commit SHA from GitHub -> CodeVibe  
  lastSyncedSha: text("last_synced_sha"), // Base SHA for conflict resolution
  origin: text("origin").notNull().default("codevibe"), // codevibe, github, merged
  syncStatus: text("sync_status").default("synced"), // synced, diverged, conflicted, syncing
  lastSyncAt: timestamp("last_sync_at"),
  conflictFiles: text("conflict_files").array(), // Files with unresolved conflicts
  metadata: jsonb("metadata"), // Additional sync metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_project_branch").on(table.projectId, table.branchName),
  index("idx_github_branch_states_project").on(table.projectId),
  index("idx_github_branch_states_status").on(table.syncStatus),
  index("idx_github_branch_states_sync").on(table.lastSyncAt),
]);

// GitHub commit synchronization tracking for loop prevention
export const githubCommitSyncs = pgTable("github_commit_syncs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  branchName: text("branch_name").notNull(),
  commitSha: text("commit_sha").notNull(),
  origin: text("origin").notNull(), // codevibe, github
  direction: text("direction").notNull(), // push, pull  
  syncEventId: varchar("sync_event_id").references(() => githubSyncEvents.id),
  files: jsonb("files"), // Array of file paths affected
  commitMessage: text("commit_message"),
  authorEmail: text("author_email"),
  commitTrailer: text("commit_trailer"), // e.g., [cv-origin=codevibe]
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("unique_commit_sha").on(table.commitSha),
  index("idx_github_commit_syncs_project").on(table.projectId),
  index("idx_github_commit_syncs_branch").on(table.branchName),
  index("idx_github_commit_syncs_origin").on(table.origin),
  index("idx_github_commit_syncs_processed").on(table.processed),
]);

// GitHub releases tracking for advanced features
export const githubReleases = pgTable("github_releases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  releaseId: text("release_id").notNull(), // GitHub release ID
  tagName: text("tag_name").notNull(),
  releaseName: text("release_name"),
  description: text("description"),
  isDraft: boolean("is_draft").default(false),
  isPrerelease: boolean("is_prerelease").default(false),
  targetCommitish: text("target_commitish"), // Branch or commit SHA
  publishedAt: timestamp("published_at"),
  assets: jsonb("assets"), // Release assets metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_project_release").on(table.projectId, table.releaseId),
  index("idx_github_releases_project").on(table.projectId),
  index("idx_github_releases_tag").on(table.tagName),
  index("idx_github_releases_published").on(table.publishedAt),
]);

// Design tokens for cross-app styling
export const designTokens = pgTable("design_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // color, typography, spacing, motion
  value: text("value").notNull(),
  description: text("description"),
  isShared: boolean("is_shared").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shared component registry
export const sharedComponents = pgTable("shared_components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  version: text("version").notNull(),
  code: text("code").notNull(),
  props: jsonb("props"), // Component prop definitions
  category: text("category"), // form, layout, data, media
  isPublic: boolean("is_public").default(false),
  authorId: varchar("author_id").references(() => users.id).notNull(),
  downloads: integer("downloads").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Component usage tracking
export const componentUsages = pgTable("component_usages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  componentId: varchar("component_id").references(() => sharedComponents.id).notNull(),
  version: text("version").notNull(),
  filePath: text("file_path"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Provisioning Logs for tracking Supabase provisioning attempts
export const provisioningLogs = pgTable("provisioning_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  status: text("status").notNull(), // started, in_progress, completed, failed
  step: text("step"), // validate_credentials, detect_schema, setup_database, apply_migrations, verify_connection
  message: text("message"),
  error: text("error"),
  metadata: jsonb("metadata"), // Additional details about the provisioning attempt
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_provisioning_logs_project").on(table.projectId),
  index("idx_provisioning_logs_status").on(table.status),
  index("idx_provisioning_logs_started").on(table.startedAt),
]);

// Coverage Reports for tracking test coverage history
export const coverageReports = pgTable("coverage_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  coverage: integer("coverage").notNull(), // Overall coverage percentage (0-100)
  statementsCoverage: integer("statements_coverage").notNull(), // Statements coverage percentage
  branchesCoverage: integer("branches_coverage").notNull(), // Branches coverage percentage
  functionsCoverage: integer("functions_coverage").notNull(), // Functions coverage percentage
  linesCoverage: integer("lines_coverage").notNull(), // Lines coverage percentage
  passed: boolean("passed").default(false), // Whether coverage meets threshold
  reportData: jsonb("report_data"), // Detailed coverage data (file-level metrics, gaps, etc.)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_coverage_reports_project").on(table.projectId),
  index("idx_coverage_reports_created").on(table.createdAt),
  index("idx_coverage_reports_passed").on(table.passed),
]);

// Normalization Runs for tracking structure normalization attempts
export const normalizationRuns = pgTable("normalization_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  
  // Status tracking
  status: text("status").notNull().default("pending"), // pending, analyzing, planning, applying, completed, failed, cancelled
  phase: text("phase"), // analyze, plan, apply, optimize, validate
  progress: integer("progress").default(0), // 0-100 percentage
  
  // Detection and classification
  detectedType: text("detected_type"), // react-vite, next-fullstack, api-backend, hybrid, unknown
  detectedFrameworks: jsonb("detected_frameworks"), // {react: true, nextjs: false, express: true}
  detectedStructure: jsonb("detected_structure"), // Current file structure analysis
  
  // Normalization plan
  normalizationPlan: jsonb("normalization_plan"), // Detailed plan of changes to apply
  rulesApplied: jsonb("rules_applied"), // Which rule packs were used
  estimatedChanges: integer("estimated_changes"), // Number of changes to apply
  
  // Results and summary
  summary: text("summary"), // Human-readable summary of what was done
  findings: jsonb("findings"), // Detailed findings and recommendations
  filesModified: integer("files_modified").default(0),
  filesMoved: integer("files_moved").default(0),
  filesDeleted: integer("files_deleted").default(0),
  importsUpdated: integer("imports_updated").default(0),
  
  // Compliance metrics
  complianceBefore: integer("compliance_before"), // Structure compliance before normalization (0-100)
  complianceAfter: integer("compliance_after"), // Structure compliance after normalization (0-100)
  
  // Dependency optimization
  dependenciesRemoved: jsonb("dependencies_removed"), // List of removed dependencies
  dependenciesUpdated: jsonb("dependencies_updated"), // List of updated dependencies
  dependencyReduction: integer("dependency_reduction"), // Percentage reduction in dependencies
  
  // Safety and reversibility
  isDryRun: boolean("is_dry_run").default(false),
  isReversible: boolean("is_reversible").default(true),
  backupCreated: boolean("backup_created").default(false),
  rollbackData: jsonb("rollback_data"), // Data needed to rollback changes
  
  // Integration tracking
  pullRequestUrl: text("pull_request_url"), // PR created for review
  workflowRunId: varchar("workflow_run_id"), // Link to workflow engine run
  
  // Error handling
  error: text("error"),
  errorDetails: jsonb("error_details"),
  warnings: jsonb("warnings"), // Non-fatal warnings
  
  // Timing
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // Duration in seconds
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_normalization_runs_project").on(table.projectId),
  index("idx_normalization_runs_status").on(table.status),
  index("idx_normalization_runs_created").on(table.createdAt),
  index("idx_normalization_runs_type").on(table.detectedType),
]);

export const projectFiles = pgTable("project_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  content: text("content").notNull(),
  language: text("language"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiGenerations = pgTable("ai_generations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  prompt: text("prompt").notNull(),
  generatedCode: text("generated_code").notNull(),
  language: text("language"),
  fileName: text("file_name"),
  status: text("status").default("success"), // success, error, pending
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  role: text("role").notNull(), // user, assistant
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  routerId: varchar("router_id").references(() => routerAnalysis.id), // Link to router analysis
  createdAt: timestamp("created_at").defaultNow(),
});

// Dynamic Intelligence Router Analysis Table - Core of BuildMate system
export const routerAnalysis = pgTable("router_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  requestContent: text("request_content").notNull(),
  complexityScore: integer("complexity_score").notNull(), // 1-10 scale
  complexityReasoning: text("complexity_reasoning"),
  selectedModel: text("selected_model").notNull(), // gpt-4o-mini, gpt-4o, gpt-5
  escalationTrigger: text("escalation_trigger"), // timeout, error, user_request, complexity_increase
  tokenBudget: integer("token_budget"),
  tokenUsed: integer("token_used"),
  responseTime: integer("response_time"), // milliseconds
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  routerVersion: text("router_version").default("1.0"),
  workflowStep: text("workflow_step"), // requirements, architecture, schema, codegen, assembly, tests, deploy
  metadata: jsonb("metadata"), // Additional routing data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_router_analysis_complexity").on(table.complexityScore),
  index("idx_router_analysis_model").on(table.selectedModel),
  index("idx_router_analysis_project").on(table.projectId),
  index("idx_router_analysis_created").on(table.createdAt),
]);

// Model Performance Tracking for auto-optimization
export const modelPerformance = pgTable("model_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  model: text("model").notNull(),
  complexityRange: text("complexity_range").notNull(), // "1-3", "4-6", "7-10"
  avgResponseTime: integer("avg_response_time"), // milliseconds
  successRate: integer("success_rate"), // percentage 0-100
  avgTokenUsage: integer("avg_token_usage"),
  costPerRequest: integer("cost_per_request"), // in cents
  sampleSize: integer("sample_size").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
}, (table) => [
  unique().on(table.model, table.complexityRange),
  index("idx_model_performance_model").on(table.model),
]);

// Secrets Management System
export const secrets = pgTable("secrets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  key: text("key").notNull(), // Secret identifier (e.g. "openai_api_key", "github_token")
  name: text("name").notNull(), // Human readable name
  description: text("description"),
  encryptedValue: text("encrypted_value").notNull(), // AES-256 encrypted value
  keyHash: text("key_hash").notNull(), // Hash for key derivation
  keyVersion: integer("key_version").notNull().default(1), // Version for key rotation
  category: text("category").notNull().default("api"), // api, database, auth, custom
  environment: text("environment").notNull().default("production"), // production, staging, development
  isActive: boolean("is_active").default(true),
  rotationEnabled: boolean("rotation_enabled").default(false),
  rotationInterval: integer("rotation_interval"), // Days between rotations
  nextRotation: timestamp("next_rotation"),
  lastRotated: timestamp("last_rotated"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  updatedBy: varchar("updated_by").references(() => users.id),
  metadata: jsonb("metadata"), // Additional configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_org_key_env").on(table.organizationId, table.key, table.environment),
  index("idx_secrets_organization").on(table.organizationId),
  index("idx_secrets_category").on(table.category),
  index("idx_secrets_rotation").on(table.nextRotation),
]);

// Secret access tracking for audit trail
export const secretAccess = pgTable("secret_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  secretId: varchar("secret_id").references(() => secrets.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  serviceId: text("service_id"), // For service-to-service access
  accessType: text("access_type").notNull(), // read, write, rotate, delete
  accessMethod: text("access_method").notNull(), // ui, api, token, cli
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  requestId: text("request_id"), // For correlating with other audit logs
  success: boolean("success").default(true).notNull(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Immutability constraint - access logs cannot be modified
  isImmutable: boolean("is_immutable").default(true).notNull(),
}, (table) => [
  index("idx_secret_access_secret").on(table.secretId),
  index("idx_secret_access_user").on(table.userId),
  index("idx_secret_access_created").on(table.createdAt),
]);

// Secret rotation history
export const secretRotations = pgTable("secret_rotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  secretId: varchar("secret_id").references(() => secrets.id).notNull(),
  oldValueHash: text("old_value_hash").notNull(), // Hash of previous value for verification
  rotationType: text("rotation_type").notNull(), // manual, automatic, emergency
  rotatedBy: varchar("rotated_by").references(() => users.id),
  reason: text("reason"), // Reason for rotation
  rollbackAvailable: boolean("rollback_available").default(true),
  rollbackDeadline: timestamp("rollback_deadline"), // When rollback expires
  status: text("status").default("completed"), // pending, completed, failed, rolled_back
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Additional rotation details
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_secret_rotations_secret").on(table.secretId),
  index("idx_secret_rotations_status").on(table.status),
  index("idx_secret_rotations_created").on(table.createdAt),
]);

// Short-lived access tokens for service-to-service communication
export const secretTokens = pgTable("secret_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenHash: text("token_hash").notNull().unique(), // Hash of the token for lookup
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  serviceId: text("service_id").notNull(), // Identifier for the requesting service
  permissions: jsonb("permissions").notNull(), // Array of secret IDs or patterns this token can access
  scopedSecrets: text("scoped_secrets").array().notNull(), // Specific secret IDs this token can access
  expiresAt: timestamp("expires_at").notNull(),
  lastUsed: timestamp("last_used"),
  usageCount: integer("usage_count").default(0),
  maxUsages: integer("max_uses"), // Optional usage limit
  ipRestrictions: text("ip_restrictions").array(), // Optional IP restrictions
  isRevoked: boolean("is_revoked").default(false),
  revokedAt: timestamp("revoked_at"),
  revokedBy: varchar("revoked_by").references(() => users.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_secret_tokens_hash").on(table.tokenHash),
  index("idx_secret_tokens_org").on(table.organizationId),
  index("idx_secret_tokens_service").on(table.serviceId),
  index("idx_secret_tokens_expires").on(table.expiresAt),
]);

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  auditLogs: many(auditLogs),
  secrets: many(secrets),
  secretTokens: many(secretTokens),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  projects: many(projects),
  passkeys: many(passkeys),
  appIdentities: many(appIdentities),
  auditLogs: many(auditLogs),
  oauthConnections: many(oauthConnections),
  sharedComponents: many(sharedComponents),
  createdSecrets: many(secrets, { relationName: "CreatedSecrets" }),
  updatedSecrets: many(secrets, { relationName: "UpdatedSecrets" }),
  secretAccess: many(secretAccess),
  secretRotations: many(secretRotations),
  createdSecretTokens: many(secretTokens),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  files: many(projectFiles),
  aiGenerations: many(aiGenerations),
  chatMessages: many(chatMessages),
  githubSyncEvents: many(githubSyncEvents),
  githubBranchStates: many(githubBranchStates),
  githubCommitSyncs: many(githubCommitSyncs),
  githubReleases: many(githubReleases),
  designTokens: many(designTokens),
  componentUsages: many(componentUsages),
}));

export const passkeysRelations = relations(passkeys, ({ one }) => ({
  user: one(users, {
    fields: [passkeys.userId],
    references: [users.id],
  }),
}));

export const appIdentitiesRelations = relations(appIdentities, ({ one }) => ({
  user: one(users, {
    fields: [appIdentities.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
}));

export const oauthConnectionsRelations = relations(oauthConnections, ({ one }) => ({
  user: one(users, {
    fields: [oauthConnections.userId],
    references: [users.id],
  }),
}));

export const sharedComponentsRelations = relations(sharedComponents, ({ one, many }) => ({
  author: one(users, {
    fields: [sharedComponents.authorId],
    references: [users.id],
  }),
  usages: many(componentUsages),
}));

export const componentUsagesRelations = relations(componentUsages, ({ one }) => ({
  project: one(projects, {
    fields: [componentUsages.projectId],
    references: [projects.id],
  }),
  component: one(sharedComponents, {
    fields: [componentUsages.componentId],
    references: [sharedComponents.id],
  }),
}));

export const secretsRelations = relations(secrets, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [secrets.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [secrets.createdBy],
    references: [users.id],
    relationName: "CreatedSecrets",
  }),
  updatedBy: one(users, {
    fields: [secrets.updatedBy],
    references: [users.id],
    relationName: "UpdatedSecrets",
  }),
  access: many(secretAccess),
  rotations: many(secretRotations),
}));

export const secretAccessRelations = relations(secretAccess, ({ one }) => ({
  secret: one(secrets, {
    fields: [secretAccess.secretId],
    references: [secrets.id],
  }),
  user: one(users, {
    fields: [secretAccess.userId],
    references: [users.id],
  }),
}));

export const secretRotationsRelations = relations(secretRotations, ({ one }) => ({
  secret: one(secrets, {
    fields: [secretRotations.secretId],
    references: [secrets.id],
  }),
  rotatedBy: one(users, {
    fields: [secretRotations.rotatedBy],
    references: [users.id],
  }),
}));

export const secretTokensRelations = relations(secretTokens, ({ one }) => ({
  organization: one(organizations, {
    fields: [secretTokens.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [secretTokens.createdBy],
    references: [users.id],
  }),
  revokedBy: one(users, {
    fields: [secretTokens.revokedBy],
    references: [users.id],
  }),
}));

// GitHub sync tables relations
export const githubSyncEventsRelations = relations(githubSyncEvents, ({ one }) => ({
  project: one(projects, {
    fields: [githubSyncEvents.projectId],
    references: [projects.id],
  }),
}));

export const githubBranchStatesRelations = relations(githubBranchStates, ({ one }) => ({
  project: one(projects, {
    fields: [githubBranchStates.projectId],
    references: [projects.id],
  }),
}));

export const githubCommitSyncsRelations = relations(githubCommitSyncs, ({ one }) => ({
  project: one(projects, {
    fields: [githubCommitSyncs.projectId],
    references: [projects.id],
  }),
  syncEvent: one(githubSyncEvents, {
    fields: [githubCommitSyncs.syncEventId],
    references: [githubSyncEvents.id],
  }),
}));

export const githubReleasesRelations = relations(githubReleases, ({ one }) => ({
  project: one(projects, {
    fields: [githubReleases.projectId],
    references: [projects.id],
  }),
}));

// =============================================================================
// SPECIFICATION SYSTEM RELATIONS
// =============================================================================

export const specsRelations = relations(specs, ({ one, many }) => ({
  project: one(projects, {
    fields: [specs.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [specs.createdBy],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [specs.approvedBy],
    references: [users.id],
  }),
  versions: many(specVersions),
  requirements: many(specRequirements),
  userJourneys: many(specUserJourneys),
  dataModels: many(specDataModels),
  successCriteria: many(specSuccessCriteria),
}));

export const specVersionsRelations = relations(specVersions, ({ one }) => ({
  spec: one(specs, {
    fields: [specVersions.specId],
    references: [specs.id],
  }),
  changedBy: one(users, {
    fields: [specVersions.changedBy],
    references: [users.id],
  }),
}));

export const specRequirementsRelations = relations(specRequirements, ({ one }) => ({
  spec: one(specs, {
    fields: [specRequirements.specId],
    references: [specs.id],
  }),
  assignedTo: one(users, {
    fields: [specRequirements.assignedTo],
    references: [users.id],
  }),
}));

export const specUserJourneysRelations = relations(specUserJourneys, ({ one }) => ({
  spec: one(specs, {
    fields: [specUserJourneys.specId],
    references: [specs.id],
  }),
}));

export const specDataModelsRelations = relations(specDataModels, ({ one }) => ({
  spec: one(specs, {
    fields: [specDataModels.specId],
    references: [specs.id],
  }),
}));

export const specSuccessCriteriaRelations = relations(specSuccessCriteria, ({ one }) => ({
  spec: one(specs, {
    fields: [specSuccessCriteria.specId],
    references: [specs.id],
  }),
  responsible: one(users, {
    fields: [specSuccessCriteria.responsible],
    references: [users.id],
  }),
}));

// Real-time Collaboration System Tables

// Collaboration rooms - one per file for isolated collaboration
export const collaborationRooms = pgTable("collaboration_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  fileId: varchar("file_id").references(() => projectFiles.id).notNull(),
  roomName: text("room_name").notNull(), // Format: "project_id:file_path"
  yDocState: text("y_doc_state"), // Persisted Y.js document state
  stateVector: text("state_vector"), // Y.js state vector for sync
  lastActivity: timestamp("last_activity").defaultNow(),
  isActive: boolean("is_active").default(true),
  maxParticipants: integer("max_participants").default(10),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_room_per_file").on(table.projectId, table.fileId),
  index("idx_collaboration_rooms_project").on(table.projectId),
  index("idx_collaboration_rooms_activity").on(table.lastActivity),
]);

// Room participants - users currently in collaboration rooms
export const roomParticipants = pgTable("room_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => collaborationRooms.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
  isOnline: boolean("is_online").default(true),
  cursorPosition: jsonb("cursor_position"), // { line, column, selection }
  presence: jsonb("presence"), // { color, name, avatar, status }
  permissions: text("permissions").default("edit"), // edit, view, comment
  clientId: text("client_id").notNull(), // Y.js client identifier
  metadata: jsonb("metadata"), // Additional presence data
}, (table) => [
  unique("unique_user_per_room").on(table.roomId, table.userId),
  index("idx_room_participants_room").on(table.roomId),
  index("idx_room_participants_user").on(table.userId),
  index("idx_room_participants_online").on(table.isOnline),
]);

// Collaboration timeline - history of all edit operations
export const collaborationTimeline = pgTable("collaboration_timeline", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => collaborationRooms.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  operationType: text("operation_type").notNull(), // insert, delete, format, cursor_move
  operation: jsonb("operation").notNull(), // Y.js operation data
  position: jsonb("position"), // { line, column, length }
  content: text("content"), // Inserted/deleted text content
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  clientClock: integer("client_clock").notNull(), // Y.js logical clock
  dependencies: text("dependencies").array(), // Operation dependencies
  metadata: jsonb("metadata"), // Additional operation data
}, (table) => [
  index("idx_timeline_room").on(table.roomId),
  index("idx_timeline_user").on(table.userId),
  index("idx_timeline_timestamp").on(table.timestamp),
  index("idx_timeline_type").on(table.operationType),
]);

// Y.js document persistence for offline support
export const yDocStates = pgTable("y_doc_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => collaborationRooms.id).notNull(),
  docName: text("doc_name").notNull(), // Y.js document identifier
  stateVector: text("state_vector").notNull(), // Y.js state vector
  documentUpdate: text("document_update").notNull(), // Y.js update binary data (base64)
  version: integer("version").notNull().default(1), // Document version
  checksum: text("checksum"), // Integrity verification
  compactionLevel: integer("compaction_level").default(0), // For optimizing storage
  isSnapshot: boolean("is_snapshot").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_doc_version").on(table.roomId, table.docName, table.version),
  index("idx_ydoc_room").on(table.roomId),
  index("idx_ydoc_version").on(table.version),
  index("idx_ydoc_updated").on(table.updatedAt),
]);

// Real-time cursor positions for live collaboration
export const collaborationCursors = pgTable("collaboration_cursors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").references(() => collaborationRooms.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  clientId: text("client_id").notNull(), // Y.js client identifier
  position: jsonb("position").notNull(), // { line, column, selection_start, selection_end }
  color: text("color").notNull(), // Hex color for cursor
  label: text("label"), // User display name
  isActive: boolean("is_active").default(true),
  lastUpdated: timestamp("last_updated").defaultNow(),
  metadata: jsonb("metadata"), // Additional cursor styling/data
}, (table) => [
  unique("unique_user_cursor_per_room").on(table.roomId, table.userId, table.clientId),
  index("idx_cursors_room").on(table.roomId),
  index("idx_cursors_active").on(table.isActive),
  index("idx_cursors_updated").on(table.lastUpdated),
]);

// Insert schemas
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(8).optional(), // Make password validation explicit
});

// Replit Auth specific upsert schema
export const upsertUserSchema = z.object({
  id: z.string(),
  email: z.string().email().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  profileImageUrl: z.string().url().nullable(),
  username: z.string().optional(),
});

export const insertPasskeySchema = createInsertSchema(passkeys).omit({
  id: true,
  createdAt: true,
});

export const insertAppIdentitySchema = createInsertSchema(appIdentities).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertOauthConnectionSchema = createInsertSchema(oauthConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGithubSyncEventSchema = createInsertSchema(githubSyncEvents).omit({
  id: true,
  createdAt: true,
});

export const insertGithubBranchStateSchema = createInsertSchema(githubBranchStates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGithubCommitSyncSchema = createInsertSchema(githubCommitSyncs).omit({
  id: true,
  createdAt: true,
});

export const insertGithubReleaseSchema = createInsertSchema(githubReleases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDesignTokenSchema = createInsertSchema(designTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProvisioningLogSchema = createInsertSchema(provisioningLogs).omit({
  id: true,
  startedAt: true,
});

export const insertSharedComponentSchema = createInsertSchema(sharedComponents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComponentUsageSchema = createInsertSchema(componentUsages).omit({
  id: true,
  createdAt: true,
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCoverageReportSchema = createInsertSchema(coverageReports).omit({
  id: true,
  createdAt: true,
});

export const insertAiGenerationSchema = createInsertSchema(aiGenerations).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertRouterAnalysisSchema = createInsertSchema(routerAnalysis).omit({
  id: true,
  createdAt: true,
});

export const insertModelPerformanceSchema = createInsertSchema(modelPerformance).omit({
  id: true,
  lastUpdated: true,
});

export const insertSecretSchema = createInsertSchema(secrets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  encryptedValue: true,
  keyHash: true,
  keyVersion: true,
});

export const insertSecretAccessSchema = createInsertSchema(secretAccess).omit({
  id: true,
  createdAt: true,
});

export const insertSecretRotationSchema = createInsertSchema(secretRotations).omit({
  id: true,
  createdAt: true,
});

export const insertSecretTokenSchema = createInsertSchema(secretTokens).omit({
  id: true,
  createdAt: true,
});

// Collaboration insert schemas
export const insertCollaborationRoomSchema = createInsertSchema(collaborationRooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomParticipantSchema = createInsertSchema(roomParticipants).omit({
  id: true,
  joinedAt: true,
  lastSeen: true,
});

export const insertCollaborationTimelineSchema = createInsertSchema(collaborationTimeline).omit({
  id: true,
  timestamp: true,
});

export const insertYDocStateSchema = createInsertSchema(yDocStates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCollaborationCursorSchema = createInsertSchema(collaborationCursors).omit({
  id: true,
  lastUpdated: true,
});

// =============================================================================
// SPECIFICATION SYSTEM ZOD SCHEMAS
// =============================================================================

export const insertSpecSchema = createInsertSchema(specs).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSpecVersionSchema = createInsertSchema(specVersions).omit({
  id: true,
  createdAt: true,
});

export const insertSpecRequirementSchema = createInsertSchema(specRequirements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSpecUserJourneySchema = createInsertSchema(specUserJourneys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSpecDataModelSchema = createInsertSchema(specDataModels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSpecSuccessCriteriaSchema = createInsertSchema(specSuccessCriteria).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>; // Required for Replit Auth

export type Passkey = typeof passkeys.$inferSelect;
export type InsertPasskey = z.infer<typeof insertPasskeySchema>;

export type AppIdentity = typeof appIdentities.$inferSelect;
export type InsertAppIdentity = z.infer<typeof insertAppIdentitySchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type OauthConnection = typeof oauthConnections.$inferSelect;
export type InsertOauthConnection = z.infer<typeof insertOauthConnectionSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type GithubSyncEvent = typeof githubSyncEvents.$inferSelect;
export type InsertGithubSyncEvent = z.infer<typeof insertGithubSyncEventSchema>;

export type GithubBranchState = typeof githubBranchStates.$inferSelect;
export type InsertGithubBranchState = z.infer<typeof insertGithubBranchStateSchema>;

export type GithubCommitSync = typeof githubCommitSyncs.$inferSelect;
export type InsertGithubCommitSync = z.infer<typeof insertGithubCommitSyncSchema>;

export type GithubRelease = typeof githubReleases.$inferSelect;
export type InsertGithubRelease = z.infer<typeof insertGithubReleaseSchema>;

export type DesignToken = typeof designTokens.$inferSelect;
export type InsertDesignToken = z.infer<typeof insertDesignTokenSchema>;

export type ProvisioningLog = typeof provisioningLogs.$inferSelect;
export type InsertProvisioningLog = z.infer<typeof insertProvisioningLogSchema>;

export type SharedComponent = typeof sharedComponents.$inferSelect;
export type InsertSharedComponent = z.infer<typeof insertSharedComponentSchema>;

export type ComponentUsage = typeof componentUsages.$inferSelect;
export type InsertComponentUsage = z.infer<typeof insertComponentUsageSchema>;

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;

export type CoverageReport = typeof coverageReports.$inferSelect;
export type InsertCoverageReport = z.infer<typeof insertCoverageReportSchema>;

export type AiGeneration = typeof aiGenerations.$inferSelect;
export type InsertAiGeneration = z.infer<typeof insertAiGenerationSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type RouterAnalysis = typeof routerAnalysis.$inferSelect;
export type InsertRouterAnalysis = z.infer<typeof insertRouterAnalysisSchema>;

export type ModelPerformance = typeof modelPerformance.$inferSelect;
export type InsertModelPerformance = z.infer<typeof insertModelPerformanceSchema>;

export type Secret = typeof secrets.$inferSelect;
export type InsertSecret = z.infer<typeof insertSecretSchema>;

export type SecretAccess = typeof secretAccess.$inferSelect;
export type InsertSecretAccess = z.infer<typeof insertSecretAccessSchema>;

export type SecretRotation = typeof secretRotations.$inferSelect;
export type InsertSecretRotation = z.infer<typeof insertSecretRotationSchema>;

export type SecretToken = typeof secretTokens.$inferSelect;
export type InsertSecretToken = z.infer<typeof insertSecretTokenSchema>;

// =============================================================================
// SPECIFICATION SYSTEM TYPES
// =============================================================================

export type Spec = typeof specs.$inferSelect;
export type InsertSpec = z.infer<typeof insertSpecSchema>;

export type SpecVersion = typeof specVersions.$inferSelect;
export type InsertSpecVersion = z.infer<typeof insertSpecVersionSchema>;

export type SpecRequirement = typeof specRequirements.$inferSelect;
export type InsertSpecRequirement = z.infer<typeof insertSpecRequirementSchema>;

export type SpecUserJourney = typeof specUserJourneys.$inferSelect;
export type InsertSpecUserJourney = z.infer<typeof insertSpecUserJourneySchema>;

export type SpecDataModel = typeof specDataModels.$inferSelect;
export type InsertSpecDataModel = z.infer<typeof insertSpecDataModelSchema>;

export type SpecSuccessCriteria = typeof specSuccessCriteria.$inferSelect;
export type InsertSpecSuccessCriteria = z.infer<typeof insertSpecSuccessCriteriaSchema>;

// AGENTIC BUILDER SYSTEM TABLES

// Implementation Plans - AI-generated development plans
export const implementationPlans = pgTable("implementation_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  prompt: text("prompt").notNull(), // Original user prompt
  title: text("title").notNull(), // Generated plan title
  description: text("description"), // Plan overview
  status: text("status").default("pending"), // pending, in_progress, completed, failed, cancelled
  priority: text("priority").default("medium"), // low, medium, high, urgent
  estimatedEffort: integer("estimated_effort"), // Minutes estimated
  actualEffort: integer("actual_effort"), // Minutes actually spent
  dependencies: jsonb("dependencies"), // Array of dependency IDs
  tags: jsonb("tags"), // Array of tags for categorization
  metadata: jsonb("metadata"), // Additional AI-generated insights
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_implementation_plans_project").on(table.projectId),
  index("idx_implementation_plans_user").on(table.userId),
  index("idx_implementation_plans_status").on(table.status),
  index("idx_implementation_plans_created").on(table.createdAt),
]);

// Plan Steps - Individual actionable steps within each plan
export const planSteps = pgTable("plan_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => implementationPlans.id).notNull(),
  stepNumber: integer("step_number").notNull(), // Order within the plan
  title: text("title").notNull(), // Step title
  description: text("description").notNull(), // Detailed description
  type: text("type").notNull(), // create_file, modify_file, delete_file, create_test, run_command
  status: text("status").default("pending"), // pending, in_progress, completed, skipped, failed, queued, running, succeeded, blocked, canceled
  filePath: text("file_path"), // Target file for code changes
  expectedChanges: text("expected_changes"), // What should change
  dependencies: jsonb("dependencies"), // Array of step IDs this depends on (deprecated - use dependsOn)
  
  // Workflow engine fields
  dependsOn: text("depends_on").array(), // Array of step IDs this step depends on (workflow engine)
  routerAnalysisId: varchar("router_analysis_id").references(() => routerAnalysis.id), // Link to router analysis
  retries: integer("retries").default(0), // Current retry count
  maxRetries: integer("max_retries").default(3), // Maximum retries allowed
  
  // Time tracking
  estimatedMinutes: integer("estimated_minutes"), // Time estimate for this step
  actualMinutes: integer("actual_minutes"), // Actual time spent
  estimatedHours: integer("estimated_hours"), // Time estimate for this step (workflow compatibility)
  actualHours: integer("actual_hours"), // Actual time spent (workflow compatibility)
  assignedTo: varchar("assigned_to").references(() => users.id), // User assigned to step
  
  // Execution data
  aiInstructions: jsonb("ai_instructions"), // Detailed AI instructions
  validationCriteria: jsonb("validation_criteria"), // How to validate completion
  metrics: jsonb("metrics"), // Execution metrics (tokens, time, model)
  artifacts: jsonb("artifacts"), // Step outputs and results
  metadata: jsonb("metadata"), // Additional metadata
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  finishedAt: timestamp("finished_at"), // When step execution finished (workflow engine)
}, (table) => [
  index("idx_plan_steps_plan").on(table.planId),
  index("idx_plan_steps_order").on(table.planId, table.stepNumber),
  index("idx_plan_steps_status").on(table.status),
  unique("unique_plan_step_number").on(table.planId, table.stepNumber),
]);

// Code Changes - Proposed and applied code modifications
export const codeChanges = pgTable("code_changes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => implementationPlans.id).notNull(),
  stepId: varchar("step_id").references(() => planSteps.id),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  filePath: text("file_path").notNull(), // Target file path
  changeType: text("change_type").notNull(), // create, modify, delete, rename, move
  status: text("status").default("proposed"), // proposed, approved, applied, rejected, rolled_back
  originalContent: text("original_content"), // Content before change
  proposedContent: text("proposed_content").notNull(), // Proposed new content
  appliedContent: text("applied_content"), // Actually applied content (may differ)
  diffData: jsonb("diff_data"), // Structured diff information
  conflictResolution: jsonb("conflict_resolution"), // How conflicts were resolved
  backupPath: text("backup_path"), // Path to backup file
  approvedBy: varchar("approved_by").references(() => users.id),
  appliedBy: varchar("applied_by").references(() => users.id),
  rolledBackBy: varchar("rolled_back_by").references(() => users.id),
  rollbackReason: text("rollback_reason"),
  metadata: jsonb("metadata"), // Additional change metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  appliedAt: timestamp("applied_at"),
  rolledBackAt: timestamp("rolled_back_at"),
}, (table) => [
  index("idx_code_changes_plan").on(table.planId),
  index("idx_code_changes_step").on(table.stepId),
  index("idx_code_changes_project").on(table.projectId),
  index("idx_code_changes_file").on(table.filePath),
  index("idx_code_changes_status").on(table.status),
  index("idx_code_changes_type").on(table.changeType),
]);

// Code Diffs - Structured diff data for Monaco editor
export const codeDiffs = pgTable("code_diffs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  changeId: varchar("change_id").references(() => codeChanges.id).notNull(),
  fileName: text("file_name").notNull(),
  language: text("language"), // Programming language for syntax highlighting
  originalLines: jsonb("original_lines"), // Array of original lines with metadata
  modifiedLines: jsonb("modified_lines"), // Array of modified lines with metadata
  hunks: jsonb("hunks"), // Diff hunks for efficient rendering
  stats: jsonb("stats"), // Lines added, deleted, modified counts
  contextLines: integer("context_lines").default(3), // Context lines around changes
  renderingOptions: jsonb("rendering_options"), // Monaco diff viewer settings
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_code_diffs_change").on(table.changeId),
  unique("unique_change_diff").on(table.changeId), // One diff per change
]);

// Generated Tests - Auto-generated test suites
export const generatedTests = pgTable("generated_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => implementationPlans.id).notNull(),
  changeId: varchar("change_id").references(() => codeChanges.id),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  testType: text("test_type").notNull(), // unit, integration, e2e, performance, snapshot
  testFramework: text("test_framework"), // jest, vitest, cypress, playwright
  targetFile: text("target_file"), // File being tested
  testFile: text("test_file").notNull(), // Generated test file path
  testContent: text("test_content").notNull(), // Generated test code
  testData: jsonb("test_data"), // Mock data and fixtures
  dependencies: jsonb("dependencies"), // Required test dependencies
  setupCode: text("setup_code"), // Setup/teardown code
  status: text("status").default("generated"), // generated, saved, executed, passed, failed
  executionResults: jsonb("execution_results"), // Test execution output
  coverage: jsonb("coverage"), // Code coverage data
  performance: jsonb("performance"), // Performance metrics
  generatedBy: varchar("generated_by").references(() => users.id).notNull(),
  lastExecutedBy: varchar("last_executed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastExecutedAt: timestamp("last_executed_at"),
}, (table) => [
  index("idx_generated_tests_plan").on(table.planId),
  index("idx_generated_tests_change").on(table.changeId),
  index("idx_generated_tests_project").on(table.projectId),
  index("idx_generated_tests_type").on(table.testType),
  index("idx_generated_tests_status").on(table.status),
  index("idx_generated_tests_target").on(table.targetFile),
]);

// Change Applications - Track when changes are applied/rolled back
export const changeApplications = pgTable("change_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => implementationPlans.id).notNull(),
  batchId: varchar("batch_id").notNull(), // Group related changes applied together
  changeIds: jsonb("change_ids").notNull(), // Array of applied change IDs
  applicationType: text("application_type").notNull(), // apply, rollback, partial_apply
  status: text("status").default("pending"), // pending, in_progress, completed, failed, cancelled
  totalChanges: integer("total_changes").notNull(),
  successfulChanges: integer("successful_changes").default(0),
  failedChanges: integer("failed_changes").default(0),
  backupLocation: text("backup_location"), // Location of pre-application backup
  conflictResolutions: jsonb("conflict_resolutions"), // How conflicts were resolved
  executionLog: jsonb("execution_log"), // Step-by-step application log
  errorDetails: jsonb("error_details"), // Detailed error information
  appliedBy: varchar("applied_by").references(() => users.id).notNull(),
  approvedBy: varchar("approved_by").references(() => users.id),
  metadata: jsonb("metadata"), // Additional application metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("idx_change_applications_plan").on(table.planId),
  index("idx_change_applications_batch").on(table.batchId),
  index("idx_change_applications_status").on(table.status),
  index("idx_change_applications_user").on(table.appliedBy),
  index("idx_change_applications_created").on(table.createdAt),
]);

// Rollback History - Version history for safe rollbacks
export const rollbackHistory = pgTable("rollback_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  planId: varchar("plan_id").references(() => implementationPlans.id),
  applicationId: varchar("application_id").references(() => changeApplications.id),
  checkpointName: text("checkpoint_name").notNull(), // Human-readable checkpoint name
  description: text("description"), // What this checkpoint represents
  checkpointType: text("checkpoint_type").notNull(), // auto, manual, pre_apply, post_apply
  fileSnapshots: jsonb("file_snapshots").notNull(), // Complete file state at this point
  gitCommitHash: text("git_commit_hash"), // Associated git commit if available
  metadata: jsonb("metadata"), // Additional checkpoint metadata
  size: integer("size"), // Checkpoint size in bytes
  compressionType: text("compression_type"), // gzip, lzma, none
  isActive: boolean("is_active").default(true), // Can be rolled back to
  retentionUntil: timestamp("retention_until"), // Automatic cleanup date
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_rollback_history_project").on(table.projectId),
  index("idx_rollback_history_plan").on(table.planId),
  index("idx_rollback_history_application").on(table.applicationId),
  index("idx_rollback_history_type").on(table.checkpointType),
  index("idx_rollback_history_created").on(table.createdAt),
  index("idx_rollback_history_retention").on(table.retentionUntil),
]);

// DATA CONNECTORS SYSTEM TABLES

// Data Connections - External data source connections
export const dataConnections = pgTable("data_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(), // Creator
  name: text("name").notNull(), // User-friendly connection name
  description: text("description"), // Optional description
  
  // Connection configuration
  type: text("type").notNull(), // postgres, supabase, mysql, firebase, airtable
  host: text("host"), // Database host (for SQL databases)
  port: integer("port"), // Database port (for SQL databases)
  database: text("database"), // Database name (for SQL databases)
  
  // Credentials (stored encrypted via SecretsService)
  credentialsSecretId: varchar("credentials_secret_id").references(() => secrets.id).notNull(),
  
  // Connection settings
  connectionConfig: jsonb("connection_config"), // Provider-specific connection options
  poolConfig: jsonb("pool_config"), // Connection pooling configuration
  sslConfig: jsonb("ssl_config"), // SSL/TLS configuration
  
  // Status and health
  status: text("status").default("inactive"), // inactive, active, error, testing
  lastTestAt: timestamp("last_test_at"),
  lastTestResult: jsonb("last_test_result"), // Test connection results
  lastSyncAt: timestamp("last_sync_at"),
  lastErrorAt: timestamp("last_error_at"),
  lastError: text("last_error"),
  
  // Schema introspection settings
  autoIntrospect: boolean("auto_introspect").default(true),
  introspectionSchedule: text("introspection_schedule"), // Cron expression
  excludedTables: jsonb("excluded_tables"), // Array of table names to exclude
  includedTables: jsonb("included_tables"), // Array of table names to include (if specified, only these)
  
  // API generation settings
  generateCrudApis: boolean("generate_crud_apis").default(true),
  apiPrefix: text("api_prefix"), // Custom API path prefix
  rateLimitConfig: jsonb("rate_limit_config"), // Rate limiting for generated APIs
  
  // Security and access control
  allowedMethods: jsonb("allowed_methods"), // Array of allowed HTTP methods [GET, POST, PUT, DELETE]
  accessControlRules: jsonb("access_control_rules"), // Row-level security rules
  auditEnabled: boolean("audit_enabled").default(true),
  
  // Metadata
  tags: jsonb("tags"), // Array of tags for organization
  metadata: jsonb("metadata"), // Additional connection metadata
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_data_connections_org").on(table.organizationId),
  index("idx_data_connections_user").on(table.userId),
  index("idx_data_connections_type").on(table.type),
  index("idx_data_connections_status").on(table.status),
  index("idx_data_connections_created").on(table.createdAt),
  unique("unique_connection_name_org").on(table.organizationId, table.name),
]);

// Schema Snapshots - Captured database schemas with versioning
export const schemaSnapshots = pgTable("schema_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id").references(() => dataConnections.id).notNull(),
  
  // Snapshot metadata
  version: integer("version").notNull(), // Incremental version number
  snapshotType: text("snapshot_type").notNull(), // full, incremental, change_only
  triggerType: text("trigger_type").notNull(), // manual, scheduled, webhook, auto
  triggeredBy: varchar("triggered_by").references(() => users.id),
  
  // Schema content
  schemaData: jsonb("schema_data").notNull(), // Complete schema structure
  tableCount: integer("table_count"),
  viewCount: integer("view_count"),
  functionCount: integer("function_count"),
  
  // Change tracking
  changesFromPrevious: jsonb("changes_from_previous"), // Diff from previous snapshot
  changesSummary: jsonb("changes_summary"), // Summary of changes (added, modified, deleted)
  hasBreakingChanges: boolean("has_breaking_changes").default(false),
  
  // Generated schemas and types
  zodSchemas: jsonb("zod_schemas"), // Generated Zod validation schemas
  typescriptTypes: text("typescript_types"), // Generated TypeScript types
  crudRoutes: jsonb("crud_routes"), // Generated CRUD route definitions
  
  // Status and processing
  status: text("status").default("processing"), // processing, completed, failed
  processingStartedAt: timestamp("processing_started_at"),
  processingCompletedAt: timestamp("processing_completed_at"),
  processingError: text("processing_error"),
  
  // Checksums for integrity
  schemaChecksum: text("schema_checksum"), // Hash of schema data for integrity
  contentHash: text("content_hash"), // Hash of all content for deduplication
  
  // Retention and cleanup
  retentionUntil: timestamp("retention_until"), // Automatic cleanup date
  isActive: boolean("is_active").default(true), // Can be used for code generation
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_schema_snapshots_connection").on(table.connectionId),
  index("idx_schema_snapshots_version").on(table.connectionId, table.version),
  index("idx_schema_snapshots_type").on(table.snapshotType),
  index("idx_schema_snapshots_trigger").on(table.triggerType),
  index("idx_schema_snapshots_created").on(table.createdAt),
  index("idx_schema_snapshots_status").on(table.status),
  unique("unique_connection_version").on(table.connectionId, table.version),
]);

// Sync Events - Track synchronization events and operations
export const syncEvents = pgTable("sync_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  connectionId: varchar("connection_id").references(() => dataConnections.id).notNull(),
  snapshotId: varchar("snapshot_id").references(() => schemaSnapshots.id),
  
  // Event details
  eventType: text("event_type").notNull(), // connection_test, schema_introspection, crud_operation, webhook_received
  eventSubtype: text("event_subtype"), // create, read, update, delete, batch_insert, bulk_update
  operation: text("operation"), // Specific operation performed
  
  // Target information
  targetTable: text("target_table"), // Target table for CRUD operations
  targetEntity: text("target_entity"), // Target entity/collection name
  recordId: text("record_id"), // Specific record ID for CRUD operations
  
  // Event data and context
  requestData: jsonb("request_data"), // Original request data
  responseData: jsonb("response_data"), // Response from external system
  errorData: jsonb("error_data"), // Error details if operation failed
  
  // Performance and metrics
  status: text("status").notNull(), // pending, in_progress, completed, failed, timeout
  durationMs: integer("duration_ms"), // Operation duration in milliseconds
  recordsAffected: integer("records_affected"), // Number of records affected
  dataSize: integer("data_size"), // Size of data processed in bytes
  
  // Request context
  userId: varchar("user_id").references(() => users.id), // User who triggered the event
  clientId: text("client_id"), // Client application/session ID
  requestId: text("request_id"), // Unique request identifier
  ipAddress: text("ip_address"), // Source IP address
  userAgent: text("user_agent"), // User agent string
  
  // Timing and scheduling
  scheduledAt: timestamp("scheduled_at"), // When event was scheduled
  startedAt: timestamp("started_at"), // When event processing started
  completedAt: timestamp("completed_at"), // When event completed
  
  // Retry and reliability
  retryCount: integer("retry_count").default(0), // Number of retry attempts
  maxRetries: integer("max_retries").default(3), // Maximum retry attempts
  nextRetryAt: timestamp("next_retry_at"), // When to retry if failed
  
  // Metadata
  tags: jsonb("tags"), // Array of tags for categorization
  metadata: jsonb("metadata"), // Additional event metadata
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sync_events_connection").on(table.connectionId),
  index("idx_sync_events_snapshot").on(table.snapshotId),
  index("idx_sync_events_type").on(table.eventType),
  index("idx_sync_events_status").on(table.status),
  index("idx_sync_events_user").on(table.userId),
  index("idx_sync_events_table").on(table.targetTable),
  index("idx_sync_events_created").on(table.createdAt),
  index("idx_sync_events_scheduled").on(table.scheduledAt),
  index("idx_sync_events_retry").on(table.nextRetryAt),
]);

// DEPLOYMENT SYSTEM TABLES

// Deployments - Main deployment configuration
export const deployments = pgTable("deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(), // Creator
  organizationId: varchar("organization_id").references(() => organizations.id),
  
  // Deployment configuration
  name: text("name").notNull(), // User-friendly deployment name
  description: text("description"),
  provider: text("provider").notNull(), // vercel, fly_io, cloudflare_pages, replit
  
  // Git configuration
  gitBranch: text("git_branch").default("main"),
  gitCommitSha: text("git_commit_sha"),
  
  // Build configuration
  buildCommand: text("build_command"), // npm run build, yarn build, etc.
  buildDirectory: text("build_directory"), // dist, build, .next, etc.
  installCommand: text("install_command"), // npm install, yarn install
  framework: text("framework"), // react, nextjs, vue, svelte, static
  nodeVersion: text("node_version").default("18"),
  
  // Environment configuration
  rootDirectory: text("root_directory").default("/"), // Monorepo support
  outputDirectory: text("output_directory"), // Override for build output
  publicDirectory: text("public_directory"), // Static assets directory
  functions: jsonb("functions"), // Serverless function configuration
  
  // Provider-specific configuration
  providerConfig: jsonb("provider_config"), // Provider-specific settings
  credentialsSecretId: varchar("credentials_secret_id").references(() => secrets.id),
  
  // Deployment settings
  autoDeployEnabled: boolean("auto_deploy_enabled").default(true),
  previewDeployEnabled: boolean("preview_deploy_enabled").default(true),
  deployOnPush: boolean("deploy_on_push").default(true),
  deployOnPR: boolean("deploy_on_pr").default(true),
  
  // Security and access
  isPublic: boolean("is_public").default(false),
  customDomain: text("custom_domain"),
  httpsEnabled: boolean("https_enabled").default(true),
  passwordProtected: boolean("password_protected").default(false),
  
  // Status and metadata
  status: text("status").default("active"), // active, paused, error, deleted
  lastDeployedAt: timestamp("last_deployed_at"),
  lastDeploymentId: varchar("last_deployment_id"),
  deploymentCount: integer("deployment_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_deployments_project").on(table.projectId),
  index("idx_deployments_user").on(table.userId),
  index("idx_deployments_provider").on(table.provider),
  index("idx_deployments_status").on(table.status),
  index("idx_deployments_created").on(table.createdAt),
  unique("unique_deployment_name_project").on(table.projectId, table.name),
]);

// Deployment Runs - Individual deployment executions
export const deploymentRuns = pgTable("deployment_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deploymentId: varchar("deployment_id").references(() => deployments.id).notNull(),
  targetId: varchar("target_id").references(() => deploymentTargets.id),
  
  // Trigger information
  triggerType: text("trigger_type").notNull(), // manual, git_push, pull_request, webhook, scheduled
  triggeredBy: varchar("triggered_by").references(() => users.id),
  gitCommitSha: text("git_commit_sha"),
  gitBranch: text("git_branch"),
  pullRequestNumber: integer("pull_request_number"),
  pullRequestUrl: text("pull_request_url"),
  
  // Webhook idempotency
  webhookProvider: text("webhook_provider"), // github, gitlab, bitbucket
  webhookEventId: text("webhook_event_id"), // X-GitHub-Delivery or equivalent
  webhookEventType: text("webhook_event_type"), // push, pull_request, etc
  webhookSignature: text("webhook_signature"), // Verification signature for audit
  webhookProcessedAt: timestamp("webhook_processed_at"),
  
  // Build information
  buildNumber: integer("build_number").notNull(),
  buildCommand: text("build_command"),
  buildLogs: text("build_logs"),
  buildDuration: integer("build_duration"), // Duration in seconds
  buildArtifactSize: integer("build_artifact_size"), // Size in bytes
  
  // Deployment information
  deploymentUrl: text("deployment_url"), // Live URL of the deployment
  previewUrl: text("preview_url"), // Preview URL if different from deployment URL
  providerDeploymentId: text("provider_deployment_id"), // External deployment ID
  providerMetadata: jsonb("provider_metadata"), // Provider-specific metadata
  
  // Status and lifecycle
  status: text("status").default("queued"), // queued, building, deploying, success, failed, cancelled
  phase: text("phase"), // queued, cloning, building, uploading, deploying, ready
  progress: integer("progress").default(0), // 0-100 percentage
  
  // Error handling
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").default(0),
  canRetry: boolean("can_retry").default(true),
  
  // Performance metrics
  queueDuration: integer("queue_duration"), // Time spent in queue (seconds)
  buildStartedAt: timestamp("build_started_at"),
  buildCompletedAt: timestamp("build_completed_at"),
  deployStartedAt: timestamp("deploy_started_at"),
  deployCompletedAt: timestamp("deploy_completed_at"),
  
  // Environment and configuration
  environmentVariables: jsonb("environment_variables"), // Resolved env vars at deployment time
  buildConfiguration: jsonb("build_configuration"), // Build settings used
  deploymentConfiguration: jsonb("deployment_configuration"), // Deployment settings used
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_deployment_runs_deployment").on(table.deploymentId),
  index("idx_deployment_runs_target").on(table.targetId),
  index("idx_deployment_runs_status").on(table.status),
  index("idx_deployment_runs_trigger").on(table.triggerType),
  index("idx_deployment_runs_commit").on(table.gitCommitSha),
  index("idx_deployment_runs_pr").on(table.pullRequestNumber),
  index("idx_deployment_runs_created").on(table.createdAt),
  index("idx_deployment_runs_webhook").on(table.webhookProvider, table.webhookEventId),
  unique("unique_deployment_build_number").on(table.deploymentId, table.buildNumber),
  // CRITICAL: Prevent duplicate webhook processing
  unique("unique_webhook_deployment_event").on(table.webhookProvider, table.webhookEventId),
]);

// Deployment Targets - Environment targets (production, preview, staging)
export const deploymentTargets = pgTable("deployment_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deploymentId: varchar("deployment_id").references(() => deployments.id).notNull(),
  
  // Target configuration
  name: text("name").notNull(), // production, staging, preview, development
  type: text("type").notNull(), // production, preview, custom
  description: text("description"),
  
  // Environment configuration
  branch: text("branch"), // Git branch for this target
  autoDeployEnabled: boolean("auto_deploy_enabled").default(true),
  protectionRules: jsonb("protection_rules"), // Deployment protection rules
  
  // URL and access
  url: text("url"), // Primary URL for this target
  customDomain: text("custom_domain"),
  aliases: jsonb("aliases"), // Array of domain aliases
  isProduction: boolean("is_production").default(false),
  
  // Provider configuration
  providerTargetId: text("provider_target_id"), // External target/environment ID
  providerConfig: jsonb("provider_config"), // Target-specific provider config
  
  // Status and metadata
  status: text("status").default("active"), // active, paused, disabled
  lastDeployedAt: timestamp("last_deployed_at"),
  lastDeploymentRunId: varchar("last_deployment_run_id"),
  deploymentCount: integer("deployment_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_deployment_targets_deployment").on(table.deploymentId),
  index("idx_deployment_targets_type").on(table.type),
  index("idx_deployment_targets_branch").on(table.branch),
  index("idx_deployment_targets_status").on(table.status),
  unique("unique_deployment_target_name").on(table.deploymentId, table.name),
]);

// Deployment Environment Variables - Environment variables per deployment/target
export const deploymentEnvVars = pgTable("deployment_env_vars", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deploymentId: varchar("deployment_id").references(() => deployments.id).notNull(),
  targetId: varchar("target_id").references(() => deploymentTargets.id), // Optional: target-specific vars
  
  // Variable configuration
  key: text("key").notNull(),
  valueSecretId: varchar("value_secret_id").references(() => secrets.id).notNull(), // Encrypted value
  description: text("description"),
  
  // Variable metadata
  isSystemGenerated: boolean("is_system_generated").default(false), // Generated by system vs user-defined
  isRequired: boolean("is_required").default(false),
  category: text("category"), // api, database, auth, custom, etc.
  
  // Scope and visibility
  scope: text("scope").default("runtime"), // build, runtime, both
  isSecret: boolean("is_secret").default(false), // Should be hidden in UI
  isEditable: boolean("is_editable").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_deployment_env_vars_deployment").on(table.deploymentId),
  index("idx_deployment_env_vars_target").on(table.targetId),
  index("idx_deployment_env_vars_key").on(table.key),
  index("idx_deployment_env_vars_scope").on(table.scope),
  unique("unique_env_var_deployment_target").on(table.deploymentId, table.targetId, table.key),
]);

// Preview Mappings - PR to preview environment mappings
export const previewMappings = pgTable("preview_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deploymentId: varchar("deployment_id").references(() => deployments.id).notNull(),
  deploymentRunId: varchar("deployment_run_id").references(() => deploymentRuns.id),
  
  // Pull request information
  pullRequestNumber: integer("pull_request_number").notNull(),
  pullRequestTitle: text("pull_request_title"),
  pullRequestUrl: text("pull_request_url"),
  pullRequestAuthor: text("pull_request_author"),
  pullRequestBranch: text("pull_request_branch"),
  
  // Preview environment details
  previewUrl: text("preview_url"),
  previewDomain: text("preview_domain"),
  providerPreviewId: text("provider_preview_id"), // External preview environment ID
  
  // Lifecycle status
  status: text("status").default("pending"), // pending, building, ready, failed, destroyed
  isActive: boolean("is_active").default(true),
  autoTeardownEnabled: boolean("auto_teardown_enabled").default(true),
  teardownAt: timestamp("teardown_at"), // Scheduled teardown time
  
  // GitHub event tracking
  lastGithubEventId: text("last_github_event_id"),
  lastGithubEventType: text("last_github_event_type"), // opened, synchronize, closed
  lastCommitSha: text("last_commit_sha"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  destroyedAt: timestamp("destroyed_at"),
}, (table) => [
  index("idx_preview_mappings_deployment").on(table.deploymentId),
  index("idx_preview_mappings_run").on(table.deploymentRunId),
  index("idx_preview_mappings_pr").on(table.pullRequestNumber),
  index("idx_preview_mappings_status").on(table.status),
  index("idx_preview_mappings_teardown").on(table.teardownAt),
  unique("unique_preview_deployment_pr").on(table.deploymentId, table.pullRequestNumber),
]);

// Provider Credentials - Encrypted provider API keys and tokens
export const providerCredentials = pgTable("provider_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(), // Creator
  
  // Provider information
  provider: text("provider").notNull(), // vercel, fly_io, cloudflare_pages, replit
  name: text("name").notNull(), // User-friendly credential name
  description: text("description"),
  
  // Credentials (stored encrypted via SecretsService)
  credentialsSecretId: varchar("credentials_secret_id").references(() => secrets.id).notNull(),
  
  // Provider-specific metadata
  providerUserId: text("provider_user_id"), // External user/account ID
  providerTeamId: text("provider_team_id"), // External team/organization ID
  providerMetadata: jsonb("provider_metadata"), // Additional provider-specific data
  
  // Scopes and permissions
  scopes: jsonb("scopes"), // Array of granted scopes/permissions
  expiresAt: timestamp("expires_at"), // Credential expiration (if applicable)
  
  // Status and validation
  status: text("status").default("active"), // active, expired, revoked, invalid
  lastValidatedAt: timestamp("last_validated_at"),
  lastValidationResult: jsonb("last_validation_result"),
  lastUsedAt: timestamp("last_used_at"),
  
  // Usage tracking
  deploymentCount: integer("deployment_count").default(0),
  lastDeploymentAt: timestamp("last_deployment_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_provider_credentials_org").on(table.organizationId),
  index("idx_provider_credentials_user").on(table.userId),
  index("idx_provider_credentials_provider").on(table.provider),
  index("idx_provider_credentials_status").on(table.status),
  index("idx_provider_credentials_expires").on(table.expiresAt),
  unique("unique_provider_credential_name_org").on(table.organizationId, table.provider, table.name),
]);

// Relations for Agentic Builder tables
export const implementationPlansRelations = relations(implementationPlans, ({ one, many }) => ({
  project: one(projects, {
    fields: [implementationPlans.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [implementationPlans.userId],
    references: [users.id],
  }),
  steps: many(planSteps),
  changes: many(codeChanges),
  tests: many(generatedTests),
  applications: many(changeApplications),
  rollbackHistory: many(rollbackHistory),
}));

export const planStepsRelations = relations(planSteps, ({ one, many }) => ({
  plan: one(implementationPlans, {
    fields: [planSteps.planId],
    references: [implementationPlans.id],
  }),
  changes: many(codeChanges),
}));

export const codeChangesRelations = relations(codeChanges, ({ one, many }) => ({
  plan: one(implementationPlans, {
    fields: [codeChanges.planId],
    references: [implementationPlans.id],
  }),
  step: one(planSteps, {
    fields: [codeChanges.stepId],
    references: [planSteps.id],
  }),
  project: one(projects, {
    fields: [codeChanges.projectId],
    references: [projects.id],
  }),
  approvedBy: one(users, {
    fields: [codeChanges.approvedBy],
    references: [users.id],
    relationName: "ApprovedChanges",
  }),
  appliedBy: one(users, {
    fields: [codeChanges.appliedBy],
    references: [users.id],
    relationName: "AppliedChanges",
  }),
  rolledBackBy: one(users, {
    fields: [codeChanges.rolledBackBy],
    references: [users.id],
    relationName: "RolledBackChanges",
  }),
  diff: one(codeDiffs),
  tests: many(generatedTests),
}));

export const codeDiffsRelations = relations(codeDiffs, ({ one }) => ({
  change: one(codeChanges, {
    fields: [codeDiffs.changeId],
    references: [codeChanges.id],
  }),
}));

export const generatedTestsRelations = relations(generatedTests, ({ one }) => ({
  plan: one(implementationPlans, {
    fields: [generatedTests.planId],
    references: [implementationPlans.id],
  }),
  change: one(codeChanges, {
    fields: [generatedTests.changeId],
    references: [codeChanges.id],
  }),
  project: one(projects, {
    fields: [generatedTests.projectId],
    references: [projects.id],
  }),
  generatedBy: one(users, {
    fields: [generatedTests.generatedBy],
    references: [users.id],
    relationName: "GeneratedTests",
  }),
  lastExecutedBy: one(users, {
    fields: [generatedTests.lastExecutedBy],
    references: [users.id],
    relationName: "ExecutedTests",
  }),
}));

export const changeApplicationsRelations = relations(changeApplications, ({ one }) => ({
  plan: one(implementationPlans, {
    fields: [changeApplications.planId],
    references: [implementationPlans.id],
  }),
  appliedBy: one(users, {
    fields: [changeApplications.appliedBy],
    references: [users.id],
    relationName: "ChangeApplications",
  }),
  approvedBy: one(users, {
    fields: [changeApplications.approvedBy],
    references: [users.id],
    relationName: "ApprovedApplications",
  }),
}));

export const rollbackHistoryRelations = relations(rollbackHistory, ({ one }) => ({
  project: one(projects, {
    fields: [rollbackHistory.projectId],
    references: [projects.id],
  }),
  plan: one(implementationPlans, {
    fields: [rollbackHistory.planId],
    references: [implementationPlans.id],
  }),
  application: one(changeApplications, {
    fields: [rollbackHistory.applicationId],
    references: [changeApplications.id],
  }),
  createdBy: one(users, {
    fields: [rollbackHistory.createdBy],
    references: [users.id],
    relationName: "RollbackHistory",
  }),
}));

// Agentic Builder insert schemas
export const insertImplementationPlanSchema = createInsertSchema(implementationPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlanStepSchema = createInsertSchema(planSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodeChangeSchema = createInsertSchema(codeChanges).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCodeDiffSchema = createInsertSchema(codeDiffs).omit({
  id: true,
  createdAt: true,
});

export const insertGeneratedTestSchema = createInsertSchema(generatedTests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChangeApplicationSchema = createInsertSchema(changeApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRollbackHistorySchema = createInsertSchema(rollbackHistory).omit({
  id: true,
  createdAt: true,
});

// Collaboration types
export type CollaborationRoom = typeof collaborationRooms.$inferSelect;
export type InsertCollaborationRoom = z.infer<typeof insertCollaborationRoomSchema>;

export type RoomParticipant = typeof roomParticipants.$inferSelect;
export type InsertRoomParticipant = z.infer<typeof insertRoomParticipantSchema>;

export type CollaborationTimeline = typeof collaborationTimeline.$inferSelect;
export type InsertCollaborationTimeline = z.infer<typeof insertCollaborationTimelineSchema>;

export type YDocState = typeof yDocStates.$inferSelect;
export type InsertYDocState = z.infer<typeof insertYDocStateSchema>;

export type CollaborationCursor = typeof collaborationCursors.$inferSelect;
export type InsertCollaborationCursor = z.infer<typeof insertCollaborationCursorSchema>;

// Agentic Builder types
export type ImplementationPlan = typeof implementationPlans.$inferSelect;
export type InsertImplementationPlan = z.infer<typeof insertImplementationPlanSchema>;

export type PlanStep = typeof planSteps.$inferSelect;
export type InsertPlanStep = z.infer<typeof insertPlanStepSchema>;

export type CodeChange = typeof codeChanges.$inferSelect;
export type InsertCodeChange = z.infer<typeof insertCodeChangeSchema>;

export type CodeDiff = typeof codeDiffs.$inferSelect;
export type InsertCodeDiff = z.infer<typeof insertCodeDiffSchema>;

export type GeneratedTest = typeof generatedTests.$inferSelect;
export type InsertGeneratedTest = z.infer<typeof insertGeneratedTestSchema>;

export type ChangeApplication = typeof changeApplications.$inferSelect;
export type InsertChangeApplication = z.infer<typeof insertChangeApplicationSchema>;

export type RollbackHistory = typeof rollbackHistory.$inferSelect;
export type InsertRollbackHistory = z.infer<typeof insertRollbackHistorySchema>;

// Data Connectors insert schemas
export const insertDataConnectionSchema = createInsertSchema(dataConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSchemaSnapshotSchema = createInsertSchema(schemaSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertSyncEventSchema = createInsertSchema(syncEvents).omit({
  id: true,
  createdAt: true,
});

// Data Connectors types
export type DataConnection = typeof dataConnections.$inferSelect;
export type InsertDataConnection = z.infer<typeof insertDataConnectionSchema>;

export type SchemaSnapshot = typeof schemaSnapshots.$inferSelect;
export type InsertSchemaSnapshot = z.infer<typeof insertSchemaSnapshotSchema>;

export type SyncEvent = typeof syncEvents.$inferSelect;
export type InsertSyncEvent = z.infer<typeof insertSyncEventSchema>;

// Deployment System insert schemas
export const insertDeploymentSchema = createInsertSchema(deployments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeploymentRunSchema = createInsertSchema(deploymentRuns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeploymentTargetSchema = createInsertSchema(deploymentTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeploymentEnvVarSchema = createInsertSchema(deploymentEnvVars).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPreviewMappingSchema = createInsertSchema(previewMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderCredentialSchema = createInsertSchema(providerCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Deployment System types
export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;

export type DeploymentRun = typeof deploymentRuns.$inferSelect;
export type InsertDeploymentRun = z.infer<typeof insertDeploymentRunSchema>;

export type DeploymentTarget = typeof deploymentTargets.$inferSelect;
export type InsertDeploymentTarget = z.infer<typeof insertDeploymentTargetSchema>;

export type DeploymentEnvVar = typeof deploymentEnvVars.$inferSelect;
export type InsertDeploymentEnvVar = z.infer<typeof insertDeploymentEnvVarSchema>;

export type PreviewMapping = typeof previewMappings.$inferSelect;
export type InsertPreviewMapping = z.infer<typeof insertPreviewMappingSchema>;

export type ProviderCredential = typeof providerCredentials.$inferSelect;
export type InsertProviderCredential = z.infer<typeof insertProviderCredentialSchema>;

// Normalization System insert schema
export const insertNormalizationRunSchema = createInsertSchema(normalizationRuns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Normalization System types
export type NormalizationRun = typeof normalizationRuns.$inferSelect;
export type InsertNormalizationRun = z.infer<typeof insertNormalizationRunSchema>;
