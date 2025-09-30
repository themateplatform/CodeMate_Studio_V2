CREATE TABLE "ai_generations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"prompt" text NOT NULL,
	"generated_code" text NOT NULL,
	"language" text,
	"file_name" text,
	"status" text DEFAULT 'success',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "app_identities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"app_id" text NOT NULL,
	"external_user_id" text,
	"shared_data" jsonb,
	"permissions" jsonb,
	"consent_given" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "app_identities_user_id_app_id_unique" UNIQUE("user_id","app_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"organization_id" varchar,
	"action" text NOT NULL,
	"resource" text,
	"resource_id" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_immutable" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_applications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"batch_id" varchar NOT NULL,
	"change_ids" jsonb NOT NULL,
	"application_type" text NOT NULL,
	"status" text DEFAULT 'pending',
	"total_changes" integer NOT NULL,
	"successful_changes" integer DEFAULT 0,
	"failed_changes" integer DEFAULT 0,
	"backup_location" text,
	"conflict_resolutions" jsonb,
	"execution_log" jsonb,
	"error_details" jsonb,
	"applied_by" varchar NOT NULL,
	"approved_by" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "code_changes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"step_id" varchar,
	"project_id" varchar NOT NULL,
	"file_path" text NOT NULL,
	"change_type" text NOT NULL,
	"status" text DEFAULT 'proposed',
	"original_content" text,
	"proposed_content" text NOT NULL,
	"applied_content" text,
	"diff_data" jsonb,
	"conflict_resolution" jsonb,
	"backup_path" text,
	"approved_by" varchar,
	"applied_by" varchar,
	"rolled_back_by" varchar,
	"rollback_reason" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"applied_at" timestamp,
	"rolled_back_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "code_diffs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"change_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"language" text,
	"original_lines" jsonb,
	"modified_lines" jsonb,
	"hunks" jsonb,
	"stats" jsonb,
	"context_lines" integer DEFAULT 3,
	"rendering_options" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_change_diff" UNIQUE("change_id")
);
--> statement-breakpoint
CREATE TABLE "collaboration_cursors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"client_id" text NOT NULL,
	"position" jsonb NOT NULL,
	"color" text NOT NULL,
	"label" text,
	"is_active" boolean DEFAULT true,
	"last_updated" timestamp DEFAULT now(),
	"metadata" jsonb,
	CONSTRAINT "unique_user_cursor_per_room" UNIQUE("room_id","user_id","client_id")
);
--> statement-breakpoint
CREATE TABLE "collaboration_rooms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"file_id" varchar NOT NULL,
	"room_name" text NOT NULL,
	"y_doc_state" text,
	"state_vector" text,
	"last_activity" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"max_participants" integer DEFAULT 10,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_room_per_file" UNIQUE("project_id","file_id")
);
--> statement-breakpoint
CREATE TABLE "collaboration_timeline" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"operation_type" text NOT NULL,
	"operation" jsonb NOT NULL,
	"position" jsonb,
	"content" text,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"client_clock" integer NOT NULL,
	"dependencies" text[],
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "component_usages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"component_id" varchar NOT NULL,
	"version" text NOT NULL,
	"file_path" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"host" text,
	"port" integer,
	"database" text,
	"credentials_secret_id" varchar NOT NULL,
	"connection_config" jsonb,
	"pool_config" jsonb,
	"ssl_config" jsonb,
	"status" text DEFAULT 'inactive',
	"last_test_at" timestamp,
	"last_test_result" jsonb,
	"last_sync_at" timestamp,
	"last_error_at" timestamp,
	"last_error" text,
	"auto_introspect" boolean DEFAULT true,
	"introspection_schedule" text,
	"excluded_tables" jsonb,
	"included_tables" jsonb,
	"generate_crud_apis" boolean DEFAULT true,
	"api_prefix" text,
	"rate_limit_config" jsonb,
	"allowed_methods" jsonb,
	"access_control_rules" jsonb,
	"audit_enabled" boolean DEFAULT true,
	"tags" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_connection_name_org" UNIQUE("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "deployment_env_vars" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployment_id" varchar NOT NULL,
	"target_id" varchar,
	"key" text NOT NULL,
	"value_secret_id" varchar NOT NULL,
	"description" text,
	"is_system_generated" boolean DEFAULT false,
	"is_required" boolean DEFAULT false,
	"category" text,
	"scope" text DEFAULT 'runtime',
	"is_secret" boolean DEFAULT false,
	"is_editable" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_env_var_deployment_target" UNIQUE("deployment_id","target_id","key")
);
--> statement-breakpoint
CREATE TABLE "deployment_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployment_id" varchar NOT NULL,
	"target_id" varchar,
	"trigger_type" text NOT NULL,
	"triggered_by" varchar,
	"git_commit_sha" text,
	"git_branch" text,
	"pull_request_number" integer,
	"pull_request_url" text,
	"webhook_provider" text,
	"webhook_event_id" text,
	"webhook_event_type" text,
	"webhook_signature" text,
	"webhook_processed_at" timestamp,
	"build_number" integer NOT NULL,
	"build_command" text,
	"build_logs" text,
	"build_duration" integer,
	"build_artifact_size" integer,
	"deployment_url" text,
	"preview_url" text,
	"provider_deployment_id" text,
	"provider_metadata" jsonb,
	"status" text DEFAULT 'queued',
	"phase" text,
	"progress" integer DEFAULT 0,
	"error_code" text,
	"error_message" text,
	"failure_reason" text,
	"retry_count" integer DEFAULT 0,
	"can_retry" boolean DEFAULT true,
	"queue_duration" integer,
	"build_started_at" timestamp,
	"build_completed_at" timestamp,
	"deploy_started_at" timestamp,
	"deploy_completed_at" timestamp,
	"environment_variables" jsonb,
	"build_configuration" jsonb,
	"deployment_configuration" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_deployment_build_number" UNIQUE("deployment_id","build_number"),
	CONSTRAINT "unique_webhook_deployment_event" UNIQUE("webhook_provider","webhook_event_id")
);
--> statement-breakpoint
CREATE TABLE "deployment_targets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployment_id" varchar NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"branch" text,
	"auto_deploy_enabled" boolean DEFAULT true,
	"protection_rules" jsonb,
	"url" text,
	"custom_domain" text,
	"aliases" jsonb,
	"is_production" boolean DEFAULT false,
	"provider_target_id" text,
	"provider_config" jsonb,
	"status" text DEFAULT 'active',
	"last_deployed_at" timestamp,
	"last_deployment_run_id" varchar,
	"deployment_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_deployment_target_name" UNIQUE("deployment_id","name")
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"organization_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"provider" text NOT NULL,
	"git_branch" text DEFAULT 'main',
	"git_commit_sha" text,
	"build_command" text,
	"build_directory" text,
	"install_command" text,
	"framework" text,
	"node_version" text DEFAULT '18',
	"root_directory" text DEFAULT '/',
	"output_directory" text,
	"public_directory" text,
	"functions" jsonb,
	"provider_config" jsonb,
	"credentials_secret_id" varchar,
	"auto_deploy_enabled" boolean DEFAULT true,
	"preview_deploy_enabled" boolean DEFAULT true,
	"deploy_on_push" boolean DEFAULT true,
	"deploy_on_pr" boolean DEFAULT true,
	"is_public" boolean DEFAULT false,
	"custom_domain" text,
	"https_enabled" boolean DEFAULT true,
	"password_protected" boolean DEFAULT false,
	"status" text DEFAULT 'active',
	"last_deployed_at" timestamp,
	"last_deployment_id" varchar,
	"deployment_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_deployment_name_project" UNIQUE("project_id","name")
);
--> statement-breakpoint
CREATE TABLE "design_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"is_shared" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "generated_tests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"change_id" varchar,
	"project_id" varchar NOT NULL,
	"test_type" text NOT NULL,
	"test_framework" text,
	"target_file" text,
	"test_file" text NOT NULL,
	"test_content" text NOT NULL,
	"test_data" jsonb,
	"dependencies" jsonb,
	"setup_code" text,
	"status" text DEFAULT 'generated',
	"execution_results" jsonb,
	"coverage" jsonb,
	"performance" jsonb,
	"generated_by" varchar NOT NULL,
	"last_executed_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_executed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "github_sync_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"event_type" text NOT NULL,
	"github_event_id" text,
	"payload" jsonb,
	"status" text DEFAULT 'pending',
	"error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "implementation_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"prompt" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending',
	"priority" text DEFAULT 'medium',
	"estimated_effort" integer,
	"actual_effort" integer,
	"dependencies" jsonb,
	"tags" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "oauth_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp,
	"scopes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "oauth_connections_user_id_provider_unique" UNIQUE("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"domain" text,
	"settings" jsonb,
	"subscription_status" text DEFAULT 'trial',
	"cross_app_sharing_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0,
	"device_name" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "passkeys_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "plan_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"step_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending',
	"file_path" text,
	"expected_changes" text,
	"dependencies" jsonb,
	"estimated_minutes" integer,
	"actual_minutes" integer,
	"ai_instructions" jsonb,
	"validation_criteria" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"completed_at" timestamp,
	CONSTRAINT "unique_plan_step_number" UNIQUE("plan_id","step_number")
);
--> statement-breakpoint
CREATE TABLE "preview_mappings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployment_id" varchar NOT NULL,
	"deployment_run_id" varchar,
	"pull_request_number" integer NOT NULL,
	"pull_request_title" text,
	"pull_request_url" text,
	"pull_request_author" text,
	"pull_request_branch" text,
	"preview_url" text,
	"preview_domain" text,
	"provider_preview_id" text,
	"status" text DEFAULT 'pending',
	"is_active" boolean DEFAULT true,
	"auto_teardown_enabled" boolean DEFAULT true,
	"teardown_at" timestamp,
	"last_github_event_id" text,
	"last_github_event_type" text,
	"last_commit_sha" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"destroyed_at" timestamp,
	CONSTRAINT "unique_preview_deployment_pr" UNIQUE("deployment_id","pull_request_number")
);
--> statement-breakpoint
CREATE TABLE "project_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"content" text NOT NULL,
	"language" text,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"organization_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"github_repo_url" text,
	"github_branch" text DEFAULT 'main',
	"github_sync_enabled" boolean DEFAULT false,
	"github_webhook_id" text,
	"supabase_project_id" text,
	"parent_app_id" varchar,
	"shared_design_tokens" jsonb,
	"shared_components" jsonb,
	"is_public" boolean DEFAULT false,
	"autonomy_level" text DEFAULT 'ask_some',
	"deployment_config" jsonb,
	"brief_responses" jsonb,
	"tech_stack" jsonb,
	"requirements" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_credentials" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"credentials_secret_id" varchar NOT NULL,
	"provider_user_id" text,
	"provider_team_id" text,
	"provider_metadata" jsonb,
	"scopes" jsonb,
	"expires_at" timestamp,
	"status" text DEFAULT 'active',
	"last_validated_at" timestamp,
	"last_validation_result" jsonb,
	"last_used_at" timestamp,
	"deployment_count" integer DEFAULT 0,
	"last_deployment_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_provider_credential_name_org" UNIQUE("organization_id","provider","name")
);
--> statement-breakpoint
CREATE TABLE "rollback_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"plan_id" varchar,
	"application_id" varchar,
	"checkpoint_name" text NOT NULL,
	"description" text,
	"checkpoint_type" text NOT NULL,
	"file_snapshots" jsonb NOT NULL,
	"git_commit_hash" text,
	"metadata" jsonb,
	"size" integer,
	"compression_type" text,
	"is_active" boolean DEFAULT true,
	"retention_until" timestamp,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "room_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"last_seen" timestamp DEFAULT now(),
	"is_online" boolean DEFAULT true,
	"cursor_position" jsonb,
	"presence" jsonb,
	"permissions" text DEFAULT 'edit',
	"client_id" text NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "unique_user_per_room" UNIQUE("room_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "schema_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" varchar NOT NULL,
	"version" integer NOT NULL,
	"snapshot_type" text NOT NULL,
	"trigger_type" text NOT NULL,
	"triggered_by" varchar,
	"schema_data" jsonb NOT NULL,
	"table_count" integer,
	"view_count" integer,
	"function_count" integer,
	"changes_from_previous" jsonb,
	"changes_summary" jsonb,
	"has_breaking_changes" boolean DEFAULT false,
	"zod_schemas" jsonb,
	"typescript_types" text,
	"crud_routes" jsonb,
	"status" text DEFAULT 'processing',
	"processing_started_at" timestamp,
	"processing_completed_at" timestamp,
	"processing_error" text,
	"schema_checksum" text,
	"content_hash" text,
	"retention_until" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_connection_version" UNIQUE("connection_id","version")
);
--> statement-breakpoint
CREATE TABLE "secret_access" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"secret_id" varchar NOT NULL,
	"user_id" varchar,
	"service_id" text,
	"access_type" text NOT NULL,
	"access_method" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_immutable" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secret_rotations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"secret_id" varchar NOT NULL,
	"old_value_hash" text NOT NULL,
	"rotation_type" text NOT NULL,
	"rotated_by" varchar,
	"reason" text,
	"rollback_available" boolean DEFAULT true,
	"rollback_deadline" timestamp,
	"status" text DEFAULT 'completed',
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "secret_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"organization_id" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"service_id" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"scoped_secrets" text[] NOT NULL,
	"expires_at" timestamp NOT NULL,
	"last_used" timestamp,
	"usage_count" integer DEFAULT 0,
	"max_uses" integer,
	"ip_restrictions" text[],
	"is_revoked" boolean DEFAULT false,
	"revoked_at" timestamp,
	"revoked_by" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "secret_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "secrets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"encrypted_value" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"category" text DEFAULT 'api' NOT NULL,
	"environment" text DEFAULT 'production' NOT NULL,
	"is_active" boolean DEFAULT true,
	"rotation_enabled" boolean DEFAULT false,
	"rotation_interval" integer,
	"next_rotation" timestamp,
	"last_rotated" timestamp,
	"created_by" varchar NOT NULL,
	"updated_by" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_org_key_env" UNIQUE("organization_id","key","environment")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_components" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"code" text NOT NULL,
	"props" jsonb,
	"category" text,
	"is_public" boolean DEFAULT false,
	"author_id" varchar NOT NULL,
	"downloads" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" varchar NOT NULL,
	"snapshot_id" varchar,
	"event_type" text NOT NULL,
	"event_subtype" text,
	"operation" text,
	"target_table" text,
	"target_entity" text,
	"record_id" text,
	"request_data" jsonb,
	"response_data" jsonb,
	"error_data" jsonb,
	"status" text NOT NULL,
	"duration_ms" integer,
	"records_affected" integer,
	"data_size" integer,
	"user_id" varchar,
	"client_id" text,
	"request_id" text,
	"ip_address" text,
	"user_agent" text,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"next_retry_at" timestamp,
	"tags" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"username" text NOT NULL,
	"email" text,
	"password" text,
	"email_verified" boolean DEFAULT false,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"github_username" text,
	"supabase_project_url" text,
	"role" text DEFAULT 'member',
	"mfa_enabled" boolean DEFAULT false,
	"mfa_secret" text,
	"last_login_at" timestamp,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "y_doc_states" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" varchar NOT NULL,
	"doc_name" text NOT NULL,
	"state_vector" text NOT NULL,
	"document_update" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"checksum" text,
	"compaction_level" integer DEFAULT 0,
	"is_snapshot" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "unique_doc_version" UNIQUE("room_id","doc_name","version")
);
--> statement-breakpoint
ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_identities" ADD CONSTRAINT "app_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_applications" ADD CONSTRAINT "change_applications_plan_id_implementation_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."implementation_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_applications" ADD CONSTRAINT "change_applications_applied_by_users_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_applications" ADD CONSTRAINT "change_applications_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_changes" ADD CONSTRAINT "code_changes_plan_id_implementation_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."implementation_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_changes" ADD CONSTRAINT "code_changes_step_id_plan_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."plan_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_changes" ADD CONSTRAINT "code_changes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_changes" ADD CONSTRAINT "code_changes_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_changes" ADD CONSTRAINT "code_changes_applied_by_users_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_changes" ADD CONSTRAINT "code_changes_rolled_back_by_users_id_fk" FOREIGN KEY ("rolled_back_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_diffs" ADD CONSTRAINT "code_diffs_change_id_code_changes_id_fk" FOREIGN KEY ("change_id") REFERENCES "public"."code_changes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_cursors" ADD CONSTRAINT "collaboration_cursors_room_id_collaboration_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."collaboration_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_cursors" ADD CONSTRAINT "collaboration_cursors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_rooms" ADD CONSTRAINT "collaboration_rooms_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_rooms" ADD CONSTRAINT "collaboration_rooms_file_id_project_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."project_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_timeline" ADD CONSTRAINT "collaboration_timeline_room_id_collaboration_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."collaboration_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collaboration_timeline" ADD CONSTRAINT "collaboration_timeline_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_usages" ADD CONSTRAINT "component_usages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "component_usages" ADD CONSTRAINT "component_usages_component_id_shared_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."shared_components"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_connections" ADD CONSTRAINT "data_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_connections" ADD CONSTRAINT "data_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_connections" ADD CONSTRAINT "data_connections_credentials_secret_id_secrets_id_fk" FOREIGN KEY ("credentials_secret_id") REFERENCES "public"."secrets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_env_vars" ADD CONSTRAINT "deployment_env_vars_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_env_vars" ADD CONSTRAINT "deployment_env_vars_target_id_deployment_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."deployment_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_env_vars" ADD CONSTRAINT "deployment_env_vars_value_secret_id_secrets_id_fk" FOREIGN KEY ("value_secret_id") REFERENCES "public"."secrets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_runs" ADD CONSTRAINT "deployment_runs_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_runs" ADD CONSTRAINT "deployment_runs_target_id_deployment_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."deployment_targets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_runs" ADD CONSTRAINT "deployment_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_targets" ADD CONSTRAINT "deployment_targets_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_credentials_secret_id_secrets_id_fk" FOREIGN KEY ("credentials_secret_id") REFERENCES "public"."secrets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_tokens" ADD CONSTRAINT "design_tokens_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_tests" ADD CONSTRAINT "generated_tests_plan_id_implementation_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."implementation_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_tests" ADD CONSTRAINT "generated_tests_change_id_code_changes_id_fk" FOREIGN KEY ("change_id") REFERENCES "public"."code_changes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_tests" ADD CONSTRAINT "generated_tests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_tests" ADD CONSTRAINT "generated_tests_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_tests" ADD CONSTRAINT "generated_tests_last_executed_by_users_id_fk" FOREIGN KEY ("last_executed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_sync_events" ADD CONSTRAINT "github_sync_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "implementation_plans" ADD CONSTRAINT "implementation_plans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "implementation_plans" ADD CONSTRAINT "implementation_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_steps" ADD CONSTRAINT "plan_steps_plan_id_implementation_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."implementation_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preview_mappings" ADD CONSTRAINT "preview_mappings_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preview_mappings" ADD CONSTRAINT "preview_mappings_deployment_run_id_deployment_runs_id_fk" FOREIGN KEY ("deployment_run_id") REFERENCES "public"."deployment_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_credentials_secret_id_secrets_id_fk" FOREIGN KEY ("credentials_secret_id") REFERENCES "public"."secrets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollback_history" ADD CONSTRAINT "rollback_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollback_history" ADD CONSTRAINT "rollback_history_plan_id_implementation_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."implementation_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollback_history" ADD CONSTRAINT "rollback_history_application_id_change_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."change_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollback_history" ADD CONSTRAINT "rollback_history_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_room_id_collaboration_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."collaboration_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_snapshots" ADD CONSTRAINT "schema_snapshots_connection_id_data_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."data_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schema_snapshots" ADD CONSTRAINT "schema_snapshots_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_access" ADD CONSTRAINT "secret_access_secret_id_secrets_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_access" ADD CONSTRAINT "secret_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_rotations" ADD CONSTRAINT "secret_rotations_secret_id_secrets_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."secrets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_rotations" ADD CONSTRAINT "secret_rotations_rotated_by_users_id_fk" FOREIGN KEY ("rotated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_tokens" ADD CONSTRAINT "secret_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_tokens" ADD CONSTRAINT "secret_tokens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secret_tokens" ADD CONSTRAINT "secret_tokens_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_components" ADD CONSTRAINT "shared_components_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_connection_id_data_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."data_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_snapshot_id_schema_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."schema_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "y_doc_states" ADD CONSTRAINT "y_doc_states_room_id_collaboration_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."collaboration_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_org" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_change_applications_plan" ON "change_applications" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_change_applications_batch" ON "change_applications" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_change_applications_status" ON "change_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_change_applications_user" ON "change_applications" USING btree ("applied_by");--> statement-breakpoint
CREATE INDEX "idx_change_applications_created" ON "change_applications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_code_changes_plan" ON "code_changes" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_code_changes_step" ON "code_changes" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "idx_code_changes_project" ON "code_changes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_code_changes_file" ON "code_changes" USING btree ("file_path");--> statement-breakpoint
CREATE INDEX "idx_code_changes_status" ON "code_changes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_code_changes_type" ON "code_changes" USING btree ("change_type");--> statement-breakpoint
CREATE INDEX "idx_code_diffs_change" ON "code_diffs" USING btree ("change_id");--> statement-breakpoint
CREATE INDEX "idx_cursors_room" ON "collaboration_cursors" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_cursors_active" ON "collaboration_cursors" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_cursors_updated" ON "collaboration_cursors" USING btree ("last_updated");--> statement-breakpoint
CREATE INDEX "idx_collaboration_rooms_project" ON "collaboration_rooms" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_collaboration_rooms_activity" ON "collaboration_rooms" USING btree ("last_activity");--> statement-breakpoint
CREATE INDEX "idx_timeline_room" ON "collaboration_timeline" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_user" ON "collaboration_timeline" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_timestamp" ON "collaboration_timeline" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_timeline_type" ON "collaboration_timeline" USING btree ("operation_type");--> statement-breakpoint
CREATE INDEX "idx_data_connections_org" ON "data_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_data_connections_user" ON "data_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_data_connections_type" ON "data_connections" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_data_connections_status" ON "data_connections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_data_connections_created" ON "data_connections" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_deployment_env_vars_deployment" ON "deployment_env_vars" USING btree ("deployment_id");--> statement-breakpoint
CREATE INDEX "idx_deployment_env_vars_target" ON "deployment_env_vars" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "idx_deployment_env_vars_key" ON "deployment_env_vars" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_deployment_env_vars_scope" ON "deployment_env_vars" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "idx_deployment_runs_deployment" ON "deployment_runs" USING btree ("deployment_id");--> statement-breakpoint
CREATE INDEX "idx_deployment_runs_target" ON "deployment_runs" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "idx_deployment_runs_status" ON "deployment_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_deployment_runs_trigger" ON "deployment_runs" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "idx_deployment_runs_commit" ON "deployment_runs" USING btree ("git_commit_sha");--> statement-breakpoint
CREATE INDEX "idx_deployment_runs_pr" ON "deployment_runs" USING btree ("pull_request_number");--> statement-breakpoint
CREATE INDEX "idx_deployment_runs_created" ON "deployment_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_deployment_runs_webhook" ON "deployment_runs" USING btree ("webhook_provider","webhook_event_id");--> statement-breakpoint
CREATE INDEX "idx_deployment_targets_deployment" ON "deployment_targets" USING btree ("deployment_id");--> statement-breakpoint
CREATE INDEX "idx_deployment_targets_type" ON "deployment_targets" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_deployment_targets_branch" ON "deployment_targets" USING btree ("branch");--> statement-breakpoint
CREATE INDEX "idx_deployment_targets_status" ON "deployment_targets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_deployments_project" ON "deployments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_deployments_user" ON "deployments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_deployments_provider" ON "deployments" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "idx_deployments_status" ON "deployments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_deployments_created" ON "deployments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_generated_tests_plan" ON "generated_tests" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_generated_tests_change" ON "generated_tests" USING btree ("change_id");--> statement-breakpoint
CREATE INDEX "idx_generated_tests_project" ON "generated_tests" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_generated_tests_type" ON "generated_tests" USING btree ("test_type");--> statement-breakpoint
CREATE INDEX "idx_generated_tests_status" ON "generated_tests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_generated_tests_target" ON "generated_tests" USING btree ("target_file");--> statement-breakpoint
CREATE INDEX "idx_implementation_plans_project" ON "implementation_plans" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_implementation_plans_user" ON "implementation_plans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_implementation_plans_status" ON "implementation_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_implementation_plans_created" ON "implementation_plans" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_plan_steps_plan" ON "plan_steps" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_plan_steps_order" ON "plan_steps" USING btree ("plan_id","step_number");--> statement-breakpoint
CREATE INDEX "idx_plan_steps_status" ON "plan_steps" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_preview_mappings_deployment" ON "preview_mappings" USING btree ("deployment_id");--> statement-breakpoint
CREATE INDEX "idx_preview_mappings_run" ON "preview_mappings" USING btree ("deployment_run_id");--> statement-breakpoint
CREATE INDEX "idx_preview_mappings_pr" ON "preview_mappings" USING btree ("pull_request_number");--> statement-breakpoint
CREATE INDEX "idx_preview_mappings_status" ON "preview_mappings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_preview_mappings_teardown" ON "preview_mappings" USING btree ("teardown_at");--> statement-breakpoint
CREATE INDEX "idx_provider_credentials_org" ON "provider_credentials" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_provider_credentials_user" ON "provider_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_provider_credentials_provider" ON "provider_credentials" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "idx_provider_credentials_status" ON "provider_credentials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_provider_credentials_expires" ON "provider_credentials" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_rollback_history_project" ON "rollback_history" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_rollback_history_plan" ON "rollback_history" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_rollback_history_application" ON "rollback_history" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "idx_rollback_history_type" ON "rollback_history" USING btree ("checkpoint_type");--> statement-breakpoint
CREATE INDEX "idx_rollback_history_created" ON "rollback_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_rollback_history_retention" ON "rollback_history" USING btree ("retention_until");--> statement-breakpoint
CREATE INDEX "idx_room_participants_room" ON "room_participants" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_room_participants_user" ON "room_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_room_participants_online" ON "room_participants" USING btree ("is_online");--> statement-breakpoint
CREATE INDEX "idx_schema_snapshots_connection" ON "schema_snapshots" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_schema_snapshots_version" ON "schema_snapshots" USING btree ("connection_id","version");--> statement-breakpoint
CREATE INDEX "idx_schema_snapshots_type" ON "schema_snapshots" USING btree ("snapshot_type");--> statement-breakpoint
CREATE INDEX "idx_schema_snapshots_trigger" ON "schema_snapshots" USING btree ("trigger_type");--> statement-breakpoint
CREATE INDEX "idx_schema_snapshots_created" ON "schema_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_schema_snapshots_status" ON "schema_snapshots" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_secret_access_secret" ON "secret_access" USING btree ("secret_id");--> statement-breakpoint
CREATE INDEX "idx_secret_access_user" ON "secret_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_secret_access_created" ON "secret_access" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_secret_rotations_secret" ON "secret_rotations" USING btree ("secret_id");--> statement-breakpoint
CREATE INDEX "idx_secret_rotations_status" ON "secret_rotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_secret_rotations_created" ON "secret_rotations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_secret_tokens_hash" ON "secret_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_secret_tokens_org" ON "secret_tokens" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_secret_tokens_service" ON "secret_tokens" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "idx_secret_tokens_expires" ON "secret_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_secrets_organization" ON "secrets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_secrets_category" ON "secrets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_secrets_rotation" ON "secrets" USING btree ("next_rotation");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_sync_events_connection" ON "sync_events" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "idx_sync_events_snapshot" ON "sync_events" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "idx_sync_events_type" ON "sync_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_sync_events_status" ON "sync_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sync_events_user" ON "sync_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sync_events_table" ON "sync_events" USING btree ("target_table");--> statement-breakpoint
CREATE INDEX "idx_sync_events_created" ON "sync_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_sync_events_scheduled" ON "sync_events" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_sync_events_retry" ON "sync_events" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "idx_ydoc_room" ON "y_doc_states" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_ydoc_version" ON "y_doc_states" USING btree ("version");--> statement-breakpoint
CREATE INDEX "idx_ydoc_updated" ON "y_doc_states" USING btree ("updated_at");