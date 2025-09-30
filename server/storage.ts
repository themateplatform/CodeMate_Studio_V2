import { 
  type User, 
  type InsertUser,
  type UpsertUser,
  type Organization,
  type InsertOrganization,
  type Project,
  type InsertProject,
  type ProjectFile,
  type InsertProjectFile,
  type AiGeneration,
  type InsertAiGeneration,
  type ChatMessage,
  type InsertChatMessage,
  type Passkey,
  type InsertPasskey,
  type AuditLog,
  type InsertAuditLog,
  type OauthConnection,
  type InsertOauthConnection,
  type AppIdentity,
  type InsertAppIdentity,
  type GithubSyncEvent,
  type InsertGithubSyncEvent,
  type GithubBranchState,
  type InsertGithubBranchState,
  type GithubCommitSync,
  type InsertGithubCommitSync,
  type GithubRelease,
  type InsertGithubRelease,
  type Secret,
  type InsertSecret,
  type SecretAccess,
  type InsertSecretAccess,
  type SecretRotation,
  type InsertSecretRotation,
  type SecretToken,
  type InsertSecretToken,
  type CollaborationRoom,
  type InsertCollaborationRoom,
  type RoomParticipant,
  type InsertRoomParticipant,
  type CollaborationTimeline,
  type InsertCollaborationTimeline,
  type YDocState,
  type InsertYDocState,
  type CollaborationCursor,
  type InsertCollaborationCursor,
  type ImplementationPlan,
  type InsertImplementationPlan,
  type PlanStep,
  type InsertPlanStep,
  type CodeChange,
  type InsertCodeChange,
  type CodeDiff,
  type InsertCodeDiff,
  type GeneratedTest,
  type InsertGeneratedTest,
  type ChangeApplication,
  type InsertChangeApplication,
  type RollbackHistory,
  type InsertRollbackHistory,
  type DataConnection,
  type InsertDataConnection,
  type SchemaSnapshot,
  type InsertSchemaSnapshot,
  type SyncEvent,
  type InsertSyncEvent,
  type Deployment,
  type InsertDeployment,
  type DeploymentRun,
  type InsertDeploymentRun,
  type DeploymentTarget,
  type InsertDeploymentTarget,
  type DeploymentEnvVar,
  type InsertDeploymentEnvVar,
  type PreviewMapping,
  type InsertPreviewMapping,
  type ProviderCredential,
  type InsertProviderCredential,
  type ProvisioningLog,
  type InsertProvisioningLog,
  type CoverageReport,
  type InsertCoverageReport,
  users,
  organizations,
  projects,
  projectFiles,
  aiGenerations,
  chatMessages,
  passkeys,
  auditLogs,
  oauthConnections,
  appIdentities,
  githubSyncEvents,
  githubBranchStates,
  githubCommitSyncs,
  githubReleases,
  secrets,
  secretAccess,
  secretRotations,
  secretTokens,
  collaborationRooms,
  roomParticipants,
  collaborationTimeline,
  yDocStates,
  collaborationCursors,
  implementationPlans,
  planSteps,
  codeChanges,
  codeDiffs,
  generatedTests,
  changeApplications,
  rollbackHistory,
  dataConnections,
  schemaSnapshots,
  syncEvents,
  deployments,
  deploymentRuns,
  deploymentTargets,
  deploymentEnvVars,
  previewMappings,
  providerCredentials,
  provisioningLogs,
  coverageReports
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Transaction type for Drizzle
type DbTransaction = PgTransaction<any, any, any>;

// Storage context that can be either normal db or transaction
type StorageContext = typeof db | DbTransaction;

export interface IStorage {
  // Session store for authentication
  sessionStore: session.Store;

  // Organization operations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, organization: Partial<Organization>): Promise<Organization | undefined>;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  getUsersByOrganization(organizationId: string): Promise<User[]>;
  
  // Replit Auth required method
  upsertUser(user: UpsertUser): Promise<User>;

  // Authentication operations
  createPasskey(passkey: InsertPasskey): Promise<Passkey>;
  getPasskeysByUser(userId: string): Promise<Passkey[]>;
  getPasskeyByCredentialId(credentialId: string): Promise<Passkey | undefined>;
  updatePasskeyCounter(id: string, counter: number): Promise<void>;

  // OAuth operations
  createOauthConnection(connection: InsertOauthConnection): Promise<OauthConnection>;
  getOauthConnection(userId: string, provider: string): Promise<OauthConnection | undefined>;
  updateOauthConnection(id: string, connection: Partial<OauthConnection>): Promise<OauthConnection | undefined>;
  upsertOauthConnection(connection: InsertOauthConnection): Promise<OauthConnection>;
  deleteOauthConnection(userId: string, provider: string): Promise<void>;

  // Cross-app identity operations
  createAppIdentity(identity: InsertAppIdentity): Promise<AppIdentity>;
  getAppIdentities(userId: string): Promise<AppIdentity[]>;
  getAppIdentity(userId: string, appId: string): Promise<AppIdentity | undefined>;
  updateAppIdentity(id: string, identity: Partial<AppIdentity>): Promise<AppIdentity | undefined>;

  // GitHub sync operations
  createGithubSyncEvent(event: InsertGithubSyncEvent): Promise<GithubSyncEvent>;
  getGithubSyncEvents(projectId: string): Promise<GithubSyncEvent[]>;
  updateGithubSyncEvent(id: string, event: Partial<GithubSyncEvent>): Promise<GithubSyncEvent | undefined>;

  // GitHub branch state operations
  createGithubBranchState(branchState: InsertGithubBranchState): Promise<GithubBranchState>;
  getGithubBranchState(projectId: string, branchName: string): Promise<GithubBranchState | undefined>;
  getGithubBranchStates(projectId: string): Promise<GithubBranchState[]>;
  updateGithubBranchState(id: string, branchState: Partial<GithubBranchState>): Promise<GithubBranchState | undefined>;
  upsertGithubBranchState(branchState: InsertGithubBranchState): Promise<GithubBranchState>;

  // GitHub commit sync operations
  createGithubCommitSync(commitSync: InsertGithubCommitSync): Promise<GithubCommitSync>;
  getGithubCommitSync(commitSha: string): Promise<GithubCommitSync | undefined>;
  getGithubCommitSyncs(projectId: string, options?: { branchName?: string; origin?: string; processed?: boolean }): Promise<GithubCommitSync[]>;
  updateGithubCommitSync(id: string, commitSync: Partial<GithubCommitSync>): Promise<GithubCommitSync | undefined>;
  markCommitSyncProcessed(commitSha: string): Promise<void>;

  // GitHub release operations
  createGithubRelease(release: InsertGithubRelease): Promise<GithubRelease>;
  getGithubRelease(projectId: string, releaseId: string): Promise<GithubRelease | undefined>;
  getGithubReleases(projectId: string): Promise<GithubRelease[]>;
  updateGithubRelease(id: string, release: Partial<GithubRelease>): Promise<GithubRelease | undefined>;
  deleteGithubRelease(id: string): Promise<boolean>;

  // Audit logging
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(organizationId?: string, userId?: string): Promise<AuditLog[]>;

  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  getProjectsByOrganization(organizationId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // Provisioning log operations
  createProvisioningLog(log: InsertProvisioningLog): Promise<ProvisioningLog>;
  updateProvisioningLog(id: string, log: Partial<ProvisioningLog>): Promise<ProvisioningLog | undefined>;
  getProvisioningLogsByProject(projectId: string): Promise<ProvisioningLog[]>;

  // Project file operations
  getProjectFiles(projectId: string): Promise<ProjectFile[]>;
  getProjectFile(id: string): Promise<ProjectFile | undefined>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  updateProjectFile(id: string, file: Partial<ProjectFile>): Promise<ProjectFile | undefined>;
  deleteProjectFile(id: string): Promise<boolean>;

  // AI generation operations
  getAiGenerations(projectId: string): Promise<AiGeneration[]>;
  createAiGeneration(generation: InsertAiGeneration): Promise<AiGeneration>;

  // Chat message operations
  getChatMessages(projectId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Secrets management operations
  getSecret(id: string): Promise<Secret | undefined>;
  getSecretsByOrganization(organizationId: string, options?: { category?: string; environment?: string }): Promise<Secret[]>;
  createSecret(secret: InsertSecret): Promise<Secret>;
  updateSecret(id: string, secret: Partial<Secret>): Promise<Secret | undefined>;
  deleteSecret(id: string): Promise<boolean>;

  // Secret access tracking
  createSecretAccess(access: InsertSecretAccess): Promise<SecretAccess>;
  getSecretAccessLog(secretId: string, limit?: number): Promise<SecretAccess[]>;

  // Secret rotation tracking
  createSecretRotation(rotation: InsertSecretRotation): Promise<SecretRotation>;
  getSecretRotations(secretId: string): Promise<SecretRotation[]>;

  // Secret tokens
  createSecretToken(token: InsertSecretToken): Promise<SecretToken>;
  getSecretToken(tokenHash: string): Promise<SecretToken | undefined>;
  updateSecretToken(id: string, token: Partial<SecretToken>): Promise<SecretToken | undefined>;
  getActiveTokensByOrganization(organizationId: string): Promise<SecretToken[]>;

  // Collaboration room operations
  getCollaborationRoom(projectId: string, fileId: string): Promise<CollaborationRoom | undefined>;
  createCollaborationRoom(room: InsertCollaborationRoom): Promise<CollaborationRoom>;
  updateCollaborationRoom(id: string, room: Partial<CollaborationRoom>): Promise<CollaborationRoom | undefined>;
  getActiveRoomsByProject(projectId: string): Promise<CollaborationRoom[]>;

  // Room participant operations
  createRoomParticipant(participant: InsertRoomParticipant): Promise<RoomParticipant>;
  updateRoomParticipant(roomId: string, userId: string, participant: Partial<RoomParticipant>): Promise<RoomParticipant | undefined>;
  getRoomParticipants(roomId: string): Promise<RoomParticipant[]>;
  removeRoomParticipant(roomId: string, userId: string): Promise<boolean>;

  // Collaboration timeline operations
  createCollaborationTimeline(timeline: InsertCollaborationTimeline): Promise<CollaborationTimeline>;
  getCollaborationTimeline(roomId: string, limit?: number): Promise<CollaborationTimeline[]>;

  // Y.js document state operations
  upsertYDocState(docState: InsertYDocState): Promise<YDocState>;
  getYDocState(roomId: string, docName: string): Promise<YDocState | undefined>;
  getLatestYDocState(roomId: string): Promise<YDocState | undefined>;

  // Collaboration cursor operations
  upsertCollaborationCursor(cursor: InsertCollaborationCursor): Promise<CollaborationCursor>;
  getActiveCursors(roomId: string): Promise<CollaborationCursor[]>;
  deactivateCursor(roomId: string, userId: string, clientId: string): Promise<void>;

  // Agentic Builder operations

  // Implementation Plan operations
  getImplementationPlan(id: string): Promise<ImplementationPlan | undefined>;
  getImplementationPlansByProject(projectId: string): Promise<ImplementationPlan[]>;
  getImplementationPlansByUser(userId: string): Promise<ImplementationPlan[]>;
  createImplementationPlan(plan: InsertImplementationPlan): Promise<ImplementationPlan>;
  updateImplementationPlan(id: string, plan: Partial<ImplementationPlan>): Promise<ImplementationPlan | undefined>;
  deleteImplementationPlan(id: string): Promise<boolean>;

  // Plan Step operations
  getPlanStep(id: string): Promise<PlanStep | undefined>;
  getPlanStepsByPlan(planId: string): Promise<PlanStep[]>;
  createPlanStep(step: InsertPlanStep): Promise<PlanStep>;
  updatePlanStep(id: string, step: Partial<PlanStep>): Promise<PlanStep | undefined>;
  deletePlanStep(id: string): Promise<boolean>;
  
  // Workflow Engine operations
  createPlanSteps(steps: InsertPlanStep[]): Promise<PlanStep[]>;
  getReadySteps(planId: string): Promise<PlanStep[]>;
  updateStepStatus(id: string, status: string, metrics?: any, artifacts?: any): Promise<PlanStep | undefined>;
  updateStepWithRouterAnalysis(id: string, routerAnalysisId: string): Promise<void>;
  getStepsByStatus(planId: string, status: string): Promise<PlanStep[]>;
  getAllStepsForPlan(planId: string): Promise<PlanStep[]>;

  // Code Change operations
  getCodeChange(id: string): Promise<CodeChange | undefined>;
  getCodeChangesByPlan(planId: string): Promise<CodeChange[]>;
  getCodeChangesByProject(projectId: string): Promise<CodeChange[]>;
  createCodeChange(change: InsertCodeChange): Promise<CodeChange>;
  updateCodeChange(id: string, change: Partial<CodeChange>): Promise<CodeChange | undefined>;
  deleteCodeChange(id: string): Promise<boolean>;

  // Code Diff operations
  getCodeDiff(changeId: string): Promise<CodeDiff | undefined>;
  createCodeDiff(diff: InsertCodeDiff): Promise<CodeDiff>;
  updateCodeDiff(changeId: string, diff: Partial<CodeDiff>): Promise<CodeDiff | undefined>;
  deleteCodeDiff(changeId: string): Promise<boolean>;

  // Generated Test operations
  getGeneratedTest(id: string): Promise<GeneratedTest | undefined>;
  getGeneratedTestsByPlan(planId: string): Promise<GeneratedTest[]>;
  getGeneratedTestsByProject(projectId: string): Promise<GeneratedTest[]>;
  createGeneratedTest(test: InsertGeneratedTest): Promise<GeneratedTest>;
  updateGeneratedTest(id: string, test: Partial<GeneratedTest>): Promise<GeneratedTest | undefined>;
  deleteGeneratedTest(id: string): Promise<boolean>;

  // Change Application operations
  getChangeApplication(id: string): Promise<ChangeApplication | undefined>;
  getChangeApplicationsByPlan(planId: string): Promise<ChangeApplication[]>;
  createChangeApplication(application: InsertChangeApplication, ctx?: StorageContext): Promise<ChangeApplication>;
  updateChangeApplication(id: string, application: Partial<ChangeApplication>, ctx?: StorageContext): Promise<ChangeApplication | undefined>;
  deleteChangeApplication(id: string): Promise<boolean>;

  // Rollback History operations
  getRollbackHistory(id: string): Promise<RollbackHistory | undefined>;
  getRollbackHistoryByProject(projectId: string): Promise<RollbackHistory[]>;
  createRollbackHistory(history: InsertRollbackHistory, ctx?: StorageContext): Promise<RollbackHistory>;
  updateRollbackHistory(id: string, history: Partial<RollbackHistory>, ctx?: StorageContext): Promise<RollbackHistory | undefined>;
  deleteRollbackHistory(id: string): Promise<boolean>;
  
  // Helper method for file operations
  getProjectFile(projectId: string, filePath: string): Promise<ProjectFile | undefined>;
  getProjectFileByPath(projectId: string, filePath: string): Promise<ProjectFile | undefined>;

  // Data Connections operations
  getDataConnection(id: string): Promise<DataConnection | undefined>;
  getDataConnectionsByOrganization(organizationId: string, options?: { type?: string; status?: string }): Promise<DataConnection[]>;
  getDataConnectionsByUser(userId: string): Promise<DataConnection[]>;
  createDataConnection(connection: InsertDataConnection): Promise<DataConnection>;
  updateDataConnection(id: string, connection: Partial<DataConnection>): Promise<DataConnection | undefined>;
  deleteDataConnection(id: string): Promise<boolean>;
  testDataConnection(id: string): Promise<{ success: boolean; error?: string; metadata?: any }>;

  // Schema Snapshots operations
  getSchemaSnapshot(id: string): Promise<SchemaSnapshot | undefined>;
  getSchemaSnapshotsByConnection(connectionId: string, options?: { limit?: number; includeInactive?: boolean }): Promise<SchemaSnapshot[]>;
  getLatestSchemaSnapshot(connectionId: string): Promise<SchemaSnapshot | undefined>;
  createSchemaSnapshot(snapshot: InsertSchemaSnapshot): Promise<SchemaSnapshot>;
  updateSchemaSnapshot(id: string, snapshot: Partial<SchemaSnapshot>): Promise<SchemaSnapshot | undefined>;
  deleteSchemaSnapshot(id: string): Promise<boolean>;
  compareSchemaSnapshots(snapshot1Id: string, snapshot2Id: string): Promise<any>;

  // Sync Events operations
  getSyncEvent(id: string): Promise<SyncEvent | undefined>;
  getSyncEventsByConnection(connectionId: string, options?: { limit?: number; eventType?: string; status?: string }): Promise<SyncEvent[]>;
  getSyncEventsByUser(userId: string, options?: { limit?: number }): Promise<SyncEvent[]>;
  createSyncEvent(event: InsertSyncEvent): Promise<SyncEvent>;
  updateSyncEvent(id: string, event: Partial<SyncEvent>): Promise<SyncEvent | undefined>;
  deleteSyncEvent(id: string): Promise<boolean>;
  getFailedSyncEvents(connectionId?: string): Promise<SyncEvent[]>;
  retryFailedSyncEvent(id: string): Promise<SyncEvent | undefined>;

  // Coverage operations  
  getCoverageReports(projectId: string, limit?: number): Promise<CoverageReport[]>;
  createCoverageReport(report: InsertCoverageReport): Promise<CoverageReport>;
  getLatestCoverageReport(projectId: string): Promise<CoverageReport | undefined>;

  // Deployment System operations

  // Deployment operations
  getDeployment(id: string): Promise<Deployment | undefined>;
  getDeploymentsByProject(projectId: string, options?: { provider?: string; status?: string }): Promise<Deployment[]>;
  getDeploymentsByUser(userId: string): Promise<Deployment[]>;
  getDeploymentsByOrganization(organizationId: string): Promise<Deployment[]>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeployment(id: string, deployment: Partial<Deployment>): Promise<Deployment | undefined>;
  deleteDeployment(id: string): Promise<boolean>;
  getDeploymentByName(projectId: string, name: string): Promise<Deployment | undefined>;

  // Deployment Run operations
  getDeploymentRun(id: string): Promise<DeploymentRun | undefined>;
  getDeploymentRunsByDeployment(deploymentId: string, options?: { limit?: number; status?: string }): Promise<DeploymentRun[]>;
  getDeploymentRunsByCommit(gitCommitSha: string): Promise<DeploymentRun[]>;
  getDeploymentRunsByPR(pullRequestNumber: number): Promise<DeploymentRun[]>;
  createDeploymentRun(run: InsertDeploymentRun): Promise<DeploymentRun>;
  updateDeploymentRun(id: string, run: Partial<DeploymentRun>): Promise<DeploymentRun | undefined>;
  deleteDeploymentRun(id: string): Promise<boolean>;
  getLatestDeploymentRun(deploymentId: string, targetId?: string): Promise<DeploymentRun | undefined>;
  getActiveDeploymentRuns(): Promise<DeploymentRun[]>;

  // Deployment Target operations
  getDeploymentTarget(id: string): Promise<DeploymentTarget | undefined>;
  getDeploymentTargetsByDeployment(deploymentId: string): Promise<DeploymentTarget[]>;
  createDeploymentTarget(target: InsertDeploymentTarget): Promise<DeploymentTarget>;
  updateDeploymentTarget(id: string, target: Partial<DeploymentTarget>): Promise<DeploymentTarget | undefined>;
  deleteDeploymentTarget(id: string): Promise<boolean>;
  getDeploymentTargetByName(deploymentId: string, name: string): Promise<DeploymentTarget | undefined>;

  // Deployment Environment Variable operations
  getDeploymentEnvVar(id: string): Promise<DeploymentEnvVar | undefined>;
  getDeploymentEnvVarsByDeployment(deploymentId: string, targetId?: string): Promise<DeploymentEnvVar[]>;
  getDeploymentEnvVarsByTarget(targetId: string): Promise<DeploymentEnvVar[]>;
  createDeploymentEnvVar(envVar: InsertDeploymentEnvVar): Promise<DeploymentEnvVar>;
  updateDeploymentEnvVar(id: string, envVar: Partial<DeploymentEnvVar>): Promise<DeploymentEnvVar | undefined>;
  deleteDeploymentEnvVar(id: string): Promise<boolean>;
  getDeploymentEnvVarByKey(deploymentId: string, targetId: string | null, key: string): Promise<DeploymentEnvVar | undefined>;

  // Preview Mapping operations
  getPreviewMapping(id: string): Promise<PreviewMapping | undefined>;
  getPreviewMappingsByDeployment(deploymentId: string): Promise<PreviewMapping[]>;
  getPreviewMappingByPR(deploymentId: string, pullRequestNumber: number): Promise<PreviewMapping | undefined>;
  createPreviewMapping(mapping: InsertPreviewMapping): Promise<PreviewMapping>;
  updatePreviewMapping(id: string, mapping: Partial<PreviewMapping>): Promise<PreviewMapping | undefined>;
  deletePreviewMapping(id: string): Promise<boolean>;
  getActivePreviewMappings(deploymentId?: string): Promise<PreviewMapping[]>;
  getExpiredPreviewMappings(): Promise<PreviewMapping[]>;

  // Provider Credential operations
  getProviderCredential(id: string): Promise<ProviderCredential | undefined>;
  getProviderCredentialsByOrganization(organizationId: string, provider?: string): Promise<ProviderCredential[]>;
  getProviderCredentialsByUser(userId: string): Promise<ProviderCredential[]>;
  createProviderCredential(credential: InsertProviderCredential): Promise<ProviderCredential>;
  updateProviderCredential(id: string, credential: Partial<ProviderCredential>): Promise<ProviderCredential | undefined>;
  deleteProviderCredential(id: string): Promise<boolean>;
  getProviderCredentialByName(organizationId: string, provider: string, name: string): Promise<ProviderCredential | undefined>;
  
  // CRITICAL SECURITY: Webhook idempotency operations
  getDeploymentRunByWebhookEvent(provider: string, eventId: string): Promise<DeploymentRun | undefined>;
  
  // CRITICAL SECURITY: RBAC validation helpers
  validateCredentialOrganization(credentialId: string, organizationId: string): Promise<boolean>;
  validateDeploymentAccess(deploymentId: string, userId: string, organizationId: string): Promise<boolean>;
  
  // Organization-scoped project operations
  getProjectsByGitHubRepoWithOrg(gitHubRepo: string, organizationId?: string): Promise<Project[]>;
  getProjectsByGitHubRepo(gitHubRepo: string): Promise<Project[]>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Organization operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org || undefined;
  }

  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organizations).values(organization).returning();
    return org;
  }

  async updateOrganization(id: string, organization: Partial<Organization>): Promise<Organization | undefined> {
    const [org] = await db.update(organizations).set(organization).where(eq(organizations.id, id)).returning();
    return org || undefined;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, user: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updatedUser || undefined;
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  // Replit Auth required method
  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUser(userData.id);
    
    if (existingUser) {
      // User exists - update without changing username to avoid conflicts
      const [user] = await db
        .update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          // Don't update username for existing users to avoid conflicts
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id))
        .returning();
      return user;
    } else {
      // New user - create with unique username
      const [user] = await db
        .insert(users)
        .values({
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          username: userData.username || userData.email?.split('@')[0] || `user_${userData.id.slice(-8)}`,
          emailVerified: true, // Replit Auth provides verified emails
          updatedAt: new Date(),
        })
        .returning();
      return user;
    }
  }

  // Authentication operations
  async createPasskey(passkey: InsertPasskey): Promise<Passkey> {
    const [newPasskey] = await db.insert(passkeys).values(passkey).returning();
    return newPasskey;
  }

  async getPasskeysByUser(userId: string): Promise<Passkey[]> {
    return await db.select().from(passkeys).where(eq(passkeys.userId, userId));
  }

  async getPasskeyByCredentialId(credentialId: string): Promise<Passkey | undefined> {
    const [passkey] = await db.select().from(passkeys).where(eq(passkeys.credentialId, credentialId));
    return passkey || undefined;
  }

  async updatePasskeyCounter(id: string, counter: number): Promise<void> {
    await db.update(passkeys).set({ counter }).where(eq(passkeys.id, id));
  }

  // OAuth operations
  async createOauthConnection(connection: InsertOauthConnection): Promise<OauthConnection> {
    const [newConnection] = await db.insert(oauthConnections).values(connection).returning();
    return newConnection;
  }

  async getOauthConnection(userId: string, provider: string): Promise<OauthConnection | undefined> {
    const [connection] = await db.select().from(oauthConnections)
      .where(and(
        eq(oauthConnections.userId, userId),
        eq(oauthConnections.provider, provider)
      ));
    return connection || undefined;
  }

  async updateOauthConnection(id: string, connection: Partial<OauthConnection>): Promise<OauthConnection | undefined> {
    const [updated] = await db.update(oauthConnections).set(connection).where(eq(oauthConnections.id, id)).returning();
    return updated || undefined;
  }

  async upsertOauthConnection(connection: InsertOauthConnection): Promise<OauthConnection> {
    // Check if connection already exists
    const existing = await this.getOauthConnection(connection.userId, connection.provider);
    
    if (existing) {
      // Update existing connection
      const [updated] = await db.update(oauthConnections)
        .set({
          ...connection,
          updatedAt: new Date()
        })
        .where(eq(oauthConnections.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new connection
      return await this.createOauthConnection(connection);
    }
  }

  async deleteOauthConnection(userId: string, provider: string): Promise<void> {
    await db.delete(oauthConnections)
      .where(and(
        eq(oauthConnections.userId, userId),
        eq(oauthConnections.provider, provider)
      ));
  }

  // Audit logging
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(organizationId?: string, userId?: string): Promise<AuditLog[]> {
    if (organizationId) {
      return await db.select().from(auditLogs).where(eq(auditLogs.organizationId, organizationId));
    }
    if (userId) {
      return await db.select().from(auditLogs).where(eq(auditLogs.userId, userId));
    }
    return await db.select().from(auditLogs);
  }

  // Project operations
  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId));
  }

  async getProjectsByOrganization(organizationId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.organizationId, organizationId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<Project>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set(project).where(eq(projects.id, id)).returning();
    return updated || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  // Provisioning log operations
  async createProvisioningLog(log: InsertProvisioningLog): Promise<ProvisioningLog> {
    const [created] = await db.insert(provisioningLogs).values(log).returning();
    if (!created) {
      throw new Error('Failed to create provisioning log');
    }
    return created;
  }
  
  async updateProvisioningLog(id: string, log: Partial<ProvisioningLog>): Promise<ProvisioningLog | undefined> {
    const [updated] = await db
      .update(provisioningLogs)
      .set(log)
      .where(eq(provisioningLogs.id, id))
      .returning();
    return updated || undefined;
  }
  
  async getProvisioningLogsByProject(projectId: string): Promise<ProvisioningLog[]> {
    return await db
      .select()
      .from(provisioningLogs)
      .where(eq(provisioningLogs.projectId, projectId))
      .orderBy(sql`${provisioningLogs.startedAt} DESC`);
  }

  // Project file operations
  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    return await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId));
  }

  async getProjectFile(id: string): Promise<ProjectFile | undefined> {
    const [file] = await db.select().from(projectFiles).where(eq(projectFiles.id, id));
    return file || undefined;
  }

  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const [newFile] = await db.insert(projectFiles).values(file).returning();
    return newFile;
  }

  async updateProjectFile(id: string, file: Partial<ProjectFile>): Promise<ProjectFile | undefined> {
    const [updated] = await db.update(projectFiles).set(file).where(eq(projectFiles.id, id)).returning();
    return updated || undefined;
  }

  async deleteProjectFile(id: string): Promise<boolean> {
    const result = await db.delete(projectFiles).where(eq(projectFiles.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // AI generation operations
  async getAiGenerations(projectId: string): Promise<AiGeneration[]> {
    return await db.select().from(aiGenerations).where(eq(aiGenerations.projectId, projectId));
  }

  async createAiGeneration(generation: InsertAiGeneration): Promise<AiGeneration> {
    const [newGeneration] = await db.insert(aiGenerations).values(generation).returning();
    return newGeneration;
  }

  // Chat message operations
  async getChatMessages(projectId: string): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages).where(eq(chatMessages.projectId, projectId));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  // Cross-app identity operations
  async createAppIdentity(identity: InsertAppIdentity): Promise<AppIdentity> {
    const [newIdentity] = await db.insert(appIdentities).values(identity).returning();
    return newIdentity;
  }

  async getAppIdentities(userId: string): Promise<AppIdentity[]> {
    return await db.select().from(appIdentities).where(eq(appIdentities.userId, userId));
  }

  async getAppIdentity(userId: string, appId: string): Promise<AppIdentity | undefined> {
    const [identity] = await db.select().from(appIdentities)
      .where(and(
        eq(appIdentities.userId, userId),
        eq(appIdentities.appId, appId)
      ));
    return identity || undefined;
  }

  async updateAppIdentity(id: string, identity: Partial<AppIdentity>): Promise<AppIdentity | undefined> {
    const [updated] = await db.update(appIdentities).set(identity).where(eq(appIdentities.id, id)).returning();
    return updated || undefined;
  }

  // GitHub sync operations
  async createGithubSyncEvent(event: InsertGithubSyncEvent): Promise<GithubSyncEvent> {
    const [newEvent] = await db.insert(githubSyncEvents).values(event).returning();
    return newEvent;
  }

  async getGithubSyncEvents(projectId: string): Promise<GithubSyncEvent[]> {
    return await db.select().from(githubSyncEvents).where(eq(githubSyncEvents.projectId, projectId));
  }

  async updateGithubSyncEvent(id: string, event: Partial<GithubSyncEvent>): Promise<GithubSyncEvent | undefined> {
    const [updated] = await db.update(githubSyncEvents).set(event).where(eq(githubSyncEvents.id, id)).returning();
    return updated || undefined;
  }

  // GitHub branch state operations
  async createGithubBranchState(branchState: InsertGithubBranchState): Promise<GithubBranchState> {
    const [newBranchState] = await db.insert(githubBranchStates).values(branchState).returning();
    return newBranchState;
  }

  async getGithubBranchState(projectId: string, branchName: string): Promise<GithubBranchState | undefined> {
    const [branchState] = await db.select().from(githubBranchStates).where(
      and(
        eq(githubBranchStates.projectId, projectId),
        eq(githubBranchStates.branchName, branchName)
      )
    );
    return branchState || undefined;
  }

  async getGithubBranchStates(projectId: string): Promise<GithubBranchState[]> {
    return await db.select().from(githubBranchStates).where(eq(githubBranchStates.projectId, projectId));
  }

  async updateGithubBranchState(id: string, branchState: Partial<GithubBranchState>): Promise<GithubBranchState | undefined> {
    const [updated] = await db.update(githubBranchStates).set(branchState).where(eq(githubBranchStates.id, id)).returning();
    return updated || undefined;
  }

  async upsertGithubBranchState(branchState: InsertGithubBranchState): Promise<GithubBranchState> {
    const existing = await this.getGithubBranchState(branchState.projectId, branchState.branchName);
    if (existing) {
      const [updated] = await db.update(githubBranchStates)
        .set({ ...branchState, updatedAt: new Date() })
        .where(eq(githubBranchStates.id, existing.id))
        .returning();
      return updated;
    } else {
      return this.createGithubBranchState(branchState);
    }
  }

  // GitHub commit sync operations
  async createGithubCommitSync(commitSync: InsertGithubCommitSync): Promise<GithubCommitSync> {
    const [newCommitSync] = await db.insert(githubCommitSyncs).values(commitSync).returning();
    return newCommitSync;
  }

  async getGithubCommitSync(commitSha: string): Promise<GithubCommitSync | undefined> {
    const [commitSync] = await db.select().from(githubCommitSyncs).where(eq(githubCommitSyncs.commitSha, commitSha));
    return commitSync || undefined;
  }

  async getGithubCommitSyncs(projectId: string, options: { branchName?: string; origin?: string; processed?: boolean } = {}): Promise<GithubCommitSync[]> {
    let query = db.select().from(githubCommitSyncs).where(eq(githubCommitSyncs.projectId, projectId));
    
    if (options.branchName) {
      query = query.where(eq(githubCommitSyncs.branchName, options.branchName));
    }
    if (options.origin) {
      query = query.where(eq(githubCommitSyncs.origin, options.origin));
    }
    if (options.processed !== undefined) {
      query = query.where(eq(githubCommitSyncs.processed, options.processed));
    }

    return await query;
  }

  async updateGithubCommitSync(id: string, commitSync: Partial<GithubCommitSync>): Promise<GithubCommitSync | undefined> {
    const [updated] = await db.update(githubCommitSyncs).set(commitSync).where(eq(githubCommitSyncs.id, id)).returning();
    return updated || undefined;
  }

  async markCommitSyncProcessed(commitSha: string): Promise<void> {
    await db.update(githubCommitSyncs)
      .set({ processed: true })
      .where(eq(githubCommitSyncs.commitSha, commitSha));
  }

  // GitHub release operations
  async createGithubRelease(release: InsertGithubRelease): Promise<GithubRelease> {
    const [newRelease] = await db.insert(githubReleases).values(release).returning();
    return newRelease;
  }

  async getGithubRelease(projectId: string, releaseId: string): Promise<GithubRelease | undefined> {
    const [release] = await db.select().from(githubReleases).where(
      and(
        eq(githubReleases.projectId, projectId),
        eq(githubReleases.releaseId, releaseId)
      )
    );
    return release || undefined;
  }

  async getGithubReleases(projectId: string): Promise<GithubRelease[]> {
    return await db.select().from(githubReleases).where(eq(githubReleases.projectId, projectId));
  }

  async updateGithubRelease(id: string, release: Partial<GithubRelease>): Promise<GithubRelease | undefined> {
    const [updated] = await db.update(githubReleases).set(release).where(eq(githubReleases.id, id)).returning();
    return updated || undefined;
  }

  async deleteGithubRelease(id: string): Promise<boolean> {
    const [deleted] = await db.delete(githubReleases).where(eq(githubReleases.id, id)).returning();
    return !!deleted;
  }

  // Secrets management operations
  async getSecret(id: string): Promise<Secret | undefined> {
    const [secret] = await db.select().from(secrets).where(eq(secrets.id, id));
    return secret || undefined;
  }

  async getSecretsByOrganization(organizationId: string, options: { category?: string; environment?: string } = {}): Promise<Secret[]> {
    let query = db.select().from(secrets).where(eq(secrets.organizationId, organizationId));
    
    if (options.category) {
      query = query.where(eq(secrets.category, options.category));
    }
    if (options.environment) {
      query = query.where(eq(secrets.environment, options.environment));
    }

    return await query;
  }

  async createSecret(secret: InsertSecret): Promise<Secret> {
    const [newSecret] = await db.insert(secrets).values(secret).returning();
    return newSecret;
  }

  async updateSecret(id: string, secret: Partial<Secret>): Promise<Secret | undefined> {
    const [updated] = await db.update(secrets).set(secret).where(eq(secrets.id, id)).returning();
    return updated || undefined;
  }

  async deleteSecret(id: string): Promise<boolean> {
    const result = await db.delete(secrets).where(eq(secrets.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Secret access tracking
  async createSecretAccess(access: InsertSecretAccess): Promise<SecretAccess> {
    const [newAccess] = await db.insert(secretAccess).values(access).returning();
    return newAccess;
  }

  async getSecretAccessLog(secretId: string, limit: number = 100): Promise<SecretAccess[]> {
    return await db.select().from(secretAccess)
      .where(eq(secretAccess.secretId, secretId))
      .orderBy(secretAccess.createdAt)
      .limit(limit);
  }

  // Secret rotation tracking
  async createSecretRotation(rotation: InsertSecretRotation): Promise<SecretRotation> {
    const [newRotation] = await db.insert(secretRotations).values(rotation).returning();
    return newRotation;
  }

  async getSecretRotations(secretId: string): Promise<SecretRotation[]> {
    return await db.select().from(secretRotations)
      .where(eq(secretRotations.secretId, secretId))
      .orderBy(secretRotations.createdAt);
  }

  // Secret tokens
  async createSecretToken(token: InsertSecretToken): Promise<SecretToken> {
    const [newToken] = await db.insert(secretTokens).values(token).returning();
    return newToken;
  }

  async getSecretToken(tokenHash: string): Promise<SecretToken | undefined> {
    const [token] = await db.select().from(secretTokens).where(eq(secretTokens.tokenHash, tokenHash));
    return token || undefined;
  }

  async updateSecretToken(id: string, token: Partial<SecretToken>): Promise<SecretToken | undefined> {
    const [updated] = await db.update(secretTokens).set(token).where(eq(secretTokens.id, id)).returning();
    return updated || undefined;
  }

  async getActiveTokensByOrganization(organizationId: string): Promise<SecretToken[]> {
    const now = new Date();
    return await db.select().from(secretTokens)
      .where(
        and(
          eq(secretTokens.organizationId, organizationId),
          eq(secretTokens.isRevoked, false)
        )
      );
  }

  // Collaboration room operations
  async getCollaborationRoom(projectId: string, fileId: string): Promise<CollaborationRoom | undefined> {
    const [room] = await db.select().from(collaborationRooms)
      .where(and(
        eq(collaborationRooms.projectId, projectId),
        eq(collaborationRooms.fileId, fileId)
      ));
    return room || undefined;
  }

  async createCollaborationRoom(room: InsertCollaborationRoom): Promise<CollaborationRoom> {
    const [newRoom] = await db.insert(collaborationRooms).values(room).returning();
    return newRoom;
  }

  async updateCollaborationRoom(id: string, room: Partial<CollaborationRoom>): Promise<CollaborationRoom | undefined> {
    const [updated] = await db.update(collaborationRooms).set(room).where(eq(collaborationRooms.id, id)).returning();
    return updated || undefined;
  }

  async getActiveRoomsByProject(projectId: string): Promise<CollaborationRoom[]> {
    return await db.select().from(collaborationRooms)
      .where(and(
        eq(collaborationRooms.projectId, projectId),
        eq(collaborationRooms.isActive, true)
      ));
  }

  // Room participant operations
  async createRoomParticipant(participant: InsertRoomParticipant): Promise<RoomParticipant> {
    const [newParticipant] = await db.insert(roomParticipants).values(participant).returning();
    return newParticipant;
  }

  async updateRoomParticipant(roomId: string, userId: string, participant: Partial<RoomParticipant>): Promise<RoomParticipant | undefined> {
    const [updated] = await db.update(roomParticipants)
      .set(participant)
      .where(and(
        eq(roomParticipants.roomId, roomId),
        eq(roomParticipants.userId, userId)
      ))
      .returning();
    return updated || undefined;
  }

  async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
    return await db.select().from(roomParticipants)
      .where(eq(roomParticipants.roomId, roomId));
  }

  async removeRoomParticipant(roomId: string, userId: string): Promise<boolean> {
    const result = await db.delete(roomParticipants)
      .where(and(
        eq(roomParticipants.roomId, roomId),
        eq(roomParticipants.userId, userId)
      ));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Collaboration timeline operations
  async createCollaborationTimeline(timeline: InsertCollaborationTimeline): Promise<CollaborationTimeline> {
    const [newTimeline] = await db.insert(collaborationTimeline).values(timeline).returning();
    return newTimeline;
  }

  async getCollaborationTimeline(roomId: string, limit: number = 100): Promise<CollaborationTimeline[]> {
    return await db.select().from(collaborationTimeline)
      .where(eq(collaborationTimeline.roomId, roomId))
      .orderBy(collaborationTimeline.timestamp)
      .limit(limit);
  }

  // Y.js document state operations
  async upsertYDocState(docState: InsertYDocState): Promise<YDocState> {
    const existing = await this.getYDocState(docState.roomId, docState.docName);
    
    if (existing) {
      const [updated] = await db.update(yDocStates)
        .set({
          ...docState,
          version: existing.version + 1,
          updatedAt: new Date()
        })
        .where(and(
          eq(yDocStates.roomId, docState.roomId),
          eq(yDocStates.docName, docState.docName)
        ))
        .returning();
      return updated;
    } else {
      const [newState] = await db.insert(yDocStates).values(docState).returning();
      return newState;
    }
  }

  async getYDocState(roomId: string, docName: string): Promise<YDocState | undefined> {
    const [state] = await db.select().from(yDocStates)
      .where(and(
        eq(yDocStates.roomId, roomId),
        eq(yDocStates.docName, docName)
      ))
      .orderBy(yDocStates.version)
      .limit(1);
    return state || undefined;
  }

  async getLatestYDocState(roomId: string): Promise<YDocState | undefined> {
    const [state] = await db.select().from(yDocStates)
      .where(eq(yDocStates.roomId, roomId))
      .orderBy(yDocStates.version)
      .limit(1);
    return state || undefined;
  }

  // Collaboration cursor operations
  async upsertCollaborationCursor(cursor: InsertCollaborationCursor): Promise<CollaborationCursor> {
    const existing = await db.select().from(collaborationCursors)
      .where(and(
        eq(collaborationCursors.roomId, cursor.roomId),
        eq(collaborationCursors.userId, cursor.userId),
        eq(collaborationCursors.clientId, cursor.clientId)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db.update(collaborationCursors)
        .set({
          ...cursor,
          lastUpdated: new Date()
        })
        .where(and(
          eq(collaborationCursors.roomId, cursor.roomId),
          eq(collaborationCursors.userId, cursor.userId),
          eq(collaborationCursors.clientId, cursor.clientId)
        ))
        .returning();
      return updated;
    } else {
      const [newCursor] = await db.insert(collaborationCursors).values(cursor).returning();
      return newCursor;
    }
  }

  async getActiveCursors(roomId: string): Promise<CollaborationCursor[]> {
    return await db.select().from(collaborationCursors)
      .where(and(
        eq(collaborationCursors.roomId, roomId),
        eq(collaborationCursors.isActive, true)
      ));
  }

  async deactivateCursor(roomId: string, userId: string, clientId: string): Promise<void> {
    await db.update(collaborationCursors)
      .set({ isActive: false })
      .where(and(
        eq(collaborationCursors.roomId, roomId),
        eq(collaborationCursors.userId, userId),
        eq(collaborationCursors.clientId, clientId)
      ));
  }

  // Agentic Builder operations

  // Implementation Plan operations
  async getImplementationPlan(id: string): Promise<ImplementationPlan | undefined> {
    const [plan] = await db.select().from(implementationPlans).where(eq(implementationPlans.id, id));
    return plan || undefined;
  }

  async getImplementationPlansByProject(projectId: string): Promise<ImplementationPlan[]> {
    return await db.select().from(implementationPlans).where(eq(implementationPlans.projectId, projectId));
  }

  async getImplementationPlansByUser(userId: string): Promise<ImplementationPlan[]> {
    return await db.select().from(implementationPlans).where(eq(implementationPlans.userId, userId));
  }

  async createImplementationPlan(plan: InsertImplementationPlan): Promise<ImplementationPlan> {
    const [newPlan] = await db.insert(implementationPlans).values(plan).returning();
    return newPlan;
  }

  async updateImplementationPlan(id: string, plan: Partial<ImplementationPlan>): Promise<ImplementationPlan | undefined> {
    const [updated] = await db.update(implementationPlans).set(plan).where(eq(implementationPlans.id, id)).returning();
    return updated || undefined;
  }

  async deleteImplementationPlan(id: string): Promise<boolean> {
    const result = await db.delete(implementationPlans).where(eq(implementationPlans.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Plan Step operations
  async getPlanStep(id: string): Promise<PlanStep | undefined> {
    const [step] = await db.select().from(planSteps).where(eq(planSteps.id, id));
    return step || undefined;
  }

  async getPlanStepsByPlan(planId: string): Promise<PlanStep[]> {
    return await db.select().from(planSteps).where(eq(planSteps.planId, planId));
  }

  async createPlanStep(step: InsertPlanStep): Promise<PlanStep> {
    const [newStep] = await db.insert(planSteps).values(step).returning();
    return newStep;
  }

  async updatePlanStep(id: string, step: Partial<PlanStep>): Promise<PlanStep | undefined> {
    const [updated] = await db.update(planSteps).set(step).where(eq(planSteps.id, id)).returning();
    return updated || undefined;
  }

  async deletePlanStep(id: string): Promise<boolean> {
    const result = await db.delete(planSteps).where(eq(planSteps.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  // Workflow Engine operations
  async createPlanSteps(steps: InsertPlanStep[]): Promise<PlanStep[]> {
    if (steps.length === 0) return [];
    return await db.insert(planSteps).values(steps).returning();
  }
  
  async getReadySteps(planId: string): Promise<PlanStep[]> {
    // Get all steps for the plan
    const allSteps = await db.select().from(planSteps)
      .where(eq(planSteps.planId, planId));
    
    // Filter for ready steps (queued with all dependencies succeeded)
    const readySteps: PlanStep[] = [];
    for (const step of allSteps) {
      if (step.status !== 'queued') continue;
      
      const deps = step.dependsOn || [];
      const allDepsSucceeded = deps.every(depId => {
        const depStep = allSteps.find(s => (s.metadata as any)?.stepId === depId || s.id === depId);
        return depStep?.status === 'succeeded';
      });
      
      if (allDepsSucceeded) {
        readySteps.push(step);
      }
    }
    
    return readySteps;
  }
  
  async updateStepStatus(id: string, status: string, metrics?: any, artifacts?: any): Promise<PlanStep | undefined> {
    const updateData: Partial<PlanStep> = { status };
    
    if (status === 'running') {
      updateData.startedAt = new Date();
    } else if (status === 'succeeded' || status === 'failed' || status === 'canceled') {
      updateData.finishedAt = new Date();
      updateData.completedAt = new Date();
    }
    
    if (metrics) {
      updateData.metrics = metrics;
    }
    
    if (artifacts) {
      updateData.artifacts = artifacts;
    }
    
    const [updated] = await db.update(planSteps)
      .set(updateData)
      .where(eq(planSteps.id, id))
      .returning();
      
    return updated || undefined;
  }
  
  async updateStepWithRouterAnalysis(id: string, routerAnalysisId: string): Promise<void> {
    await db.update(planSteps)
      .set({ routerAnalysisId })
      .where(eq(planSteps.id, id));
  }
  
  async getStepsByStatus(planId: string, status: string): Promise<PlanStep[]> {
    return await db.select().from(planSteps)
      .where(and(
        eq(planSteps.planId, planId),
        eq(planSteps.status, status)
      ));
  }
  
  async getAllStepsForPlan(planId: string): Promise<PlanStep[]> {
    return await db.select().from(planSteps)
      .where(eq(planSteps.planId, planId));
  }

  // Code Change operations
  async getCodeChange(id: string): Promise<CodeChange | undefined> {
    const [change] = await db.select().from(codeChanges).where(eq(codeChanges.id, id));
    return change || undefined;
  }

  async getCodeChangesByPlan(planId: string): Promise<CodeChange[]> {
    return await db.select().from(codeChanges).where(eq(codeChanges.planId, planId));
  }

  async getCodeChangesByProject(projectId: string): Promise<CodeChange[]> {
    return await db.select().from(codeChanges).where(eq(codeChanges.projectId, projectId));
  }

  async createCodeChange(change: InsertCodeChange): Promise<CodeChange> {
    const [newChange] = await db.insert(codeChanges).values(change).returning();
    return newChange;
  }

  async updateCodeChange(id: string, change: Partial<CodeChange>): Promise<CodeChange | undefined> {
    const [updated] = await db.update(codeChanges).set(change).where(eq(codeChanges.id, id)).returning();
    return updated || undefined;
  }

  async deleteCodeChange(id: string): Promise<boolean> {
    const result = await db.delete(codeChanges).where(eq(codeChanges.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Code Diff operations
  async getCodeDiff(changeId: string): Promise<CodeDiff | undefined> {
    const [diff] = await db.select().from(codeDiffs).where(eq(codeDiffs.changeId, changeId));
    return diff || undefined;
  }

  async createCodeDiff(diff: InsertCodeDiff): Promise<CodeDiff> {
    const [newDiff] = await db.insert(codeDiffs).values(diff).returning();
    return newDiff;
  }

  async updateCodeDiff(changeId: string, diff: Partial<CodeDiff>): Promise<CodeDiff | undefined> {
    const [updated] = await db.update(codeDiffs).set(diff).where(eq(codeDiffs.changeId, changeId)).returning();
    return updated || undefined;
  }

  async deleteCodeDiff(changeId: string): Promise<boolean> {
    const result = await db.delete(codeDiffs).where(eq(codeDiffs.changeId, changeId));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Generated Test operations
  async getGeneratedTest(id: string): Promise<GeneratedTest | undefined> {
    const [test] = await db.select().from(generatedTests).where(eq(generatedTests.id, id));
    return test || undefined;
  }

  async getGeneratedTestsByPlan(planId: string): Promise<GeneratedTest[]> {
    return await db.select().from(generatedTests).where(eq(generatedTests.planId, planId));
  }

  async getGeneratedTestsByProject(projectId: string): Promise<GeneratedTest[]> {
    return await db.select().from(generatedTests).where(eq(generatedTests.projectId, projectId));
  }

  async createGeneratedTest(test: InsertGeneratedTest): Promise<GeneratedTest> {
    const [newTest] = await db.insert(generatedTests).values(test).returning();
    return newTest;
  }

  async updateGeneratedTest(id: string, test: Partial<GeneratedTest>): Promise<GeneratedTest | undefined> {
    const [updated] = await db.update(generatedTests).set(test).where(eq(generatedTests.id, id)).returning();
    return updated || undefined;
  }

  async deleteGeneratedTest(id: string): Promise<boolean> {
    const result = await db.delete(generatedTests).where(eq(generatedTests.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Change Application operations
  async getChangeApplication(id: string): Promise<ChangeApplication | undefined> {
    const [application] = await db.select().from(changeApplications).where(eq(changeApplications.id, id));
    return application || undefined;
  }

  async getChangeApplicationsByPlan(planId: string): Promise<ChangeApplication[]> {
    return await db.select().from(changeApplications).where(eq(changeApplications.planId, planId));
  }

  async createChangeApplication(application: InsertChangeApplication, ctx: StorageContext = db): Promise<ChangeApplication> {
    const [newApplication] = await ctx.insert(changeApplications).values(application).returning();
    return newApplication;
  }

  async updateChangeApplication(id: string, application: Partial<ChangeApplication>, ctx: StorageContext = db): Promise<ChangeApplication | undefined> {
    const [updated] = await ctx.update(changeApplications).set(application).where(eq(changeApplications.id, id)).returning();
    return updated || undefined;
  }

  async deleteChangeApplication(id: string): Promise<boolean> {
    const result = await db.delete(changeApplications).where(eq(changeApplications.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Rollback History operations
  async getRollbackHistory(id: string): Promise<RollbackHistory | undefined> {
    const [history] = await db.select().from(rollbackHistory).where(eq(rollbackHistory.id, id));
    return history || undefined;
  }

  async getRollbackHistoryByProject(projectId: string): Promise<RollbackHistory[]> {
    return await db.select().from(rollbackHistory).where(eq(rollbackHistory.projectId, projectId));
  }

  async createRollbackHistory(history: InsertRollbackHistory, ctx: StorageContext = db): Promise<RollbackHistory> {
    const [newHistory] = await ctx.insert(rollbackHistory).values(history).returning();
    return newHistory;
  }

  async updateRollbackHistory(id: string, history: Partial<RollbackHistory>, ctx: StorageContext = db): Promise<RollbackHistory | undefined> {
    const [updated] = await ctx.update(rollbackHistory).set(history).where(eq(rollbackHistory.id, id)).returning();
    return updated || undefined;
  }

  async deleteRollbackHistory(id: string): Promise<boolean> {
    const result = await db.delete(rollbackHistory).where(eq(rollbackHistory.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Helper method for file operations
  async getProjectFile(projectId: string, filePath: string): Promise<ProjectFile | undefined> {
    const [file] = await db.select().from(projectFiles)
      .where(and(
        eq(projectFiles.projectId, projectId),
        eq(projectFiles.filePath, filePath)
      ));
    return file || undefined;
  }

  // Data Connections operations
  async getDataConnection(id: string): Promise<DataConnection | undefined> {
    const [connection] = await db.select().from(dataConnections).where(eq(dataConnections.id, id));
    return connection || undefined;
  }

  async getDataConnectionsByOrganization(organizationId: string, options?: { type?: string; status?: string }): Promise<DataConnection[]> {
    let query = db.select().from(dataConnections).where(eq(dataConnections.organizationId, organizationId));
    
    if (options?.type) {
      query = query.where(eq(dataConnections.type, options.type));
    }
    if (options?.status) {
      query = query.where(eq(dataConnections.status, options.status));
    }
    
    return await query;
  }

  async getDataConnectionsByUser(userId: string): Promise<DataConnection[]> {
    return await db.select().from(dataConnections).where(eq(dataConnections.userId, userId));
  }

  async createDataConnection(connection: InsertDataConnection): Promise<DataConnection> {
    const [newConnection] = await db.insert(dataConnections).values(connection).returning();
    return newConnection;
  }

  async updateDataConnection(id: string, connection: Partial<DataConnection>): Promise<DataConnection | undefined> {
    const [updated] = await db.update(dataConnections).set({
      ...connection,
      updatedAt: new Date()
    }).where(eq(dataConnections.id, id)).returning();
    return updated || undefined;
  }

  async deleteDataConnection(id: string): Promise<boolean> {
    const result = await db.delete(dataConnections).where(eq(dataConnections.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async testDataConnection(id: string): Promise<{ success: boolean; error?: string; metadata?: any }> {
    // Implementation placeholder - this will be implemented with the connector SDK
    // For now, just update the lastTestAt timestamp
    await this.updateDataConnection(id, { 
      lastTestAt: new Date(),
      lastTestResult: { tested: true, timestamp: new Date().toISOString() }
    });
    return { success: true, metadata: { message: "Test connection placeholder implemented" } };
  }

  // Schema Snapshots operations
  async getSchemaSnapshot(id: string): Promise<SchemaSnapshot | undefined> {
    const [snapshot] = await db.select().from(schemaSnapshots).where(eq(schemaSnapshots.id, id));
    return snapshot || undefined;
  }

  async getSchemaSnapshotsByConnection(connectionId: string, options?: { limit?: number; includeInactive?: boolean }): Promise<SchemaSnapshot[]> {
    let query = db.select().from(schemaSnapshots).where(eq(schemaSnapshots.connectionId, connectionId));
    
    if (!options?.includeInactive) {
      query = query.where(eq(schemaSnapshots.isActive, true));
    }
    
    query = query.orderBy(schemaSnapshots.version);
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    return await query;
  }

  async getLatestSchemaSnapshot(connectionId: string): Promise<SchemaSnapshot | undefined> {
    const [snapshot] = await db.select().from(schemaSnapshots)
      .where(and(
        eq(schemaSnapshots.connectionId, connectionId),
        eq(schemaSnapshots.isActive, true)
      ))
      .orderBy(schemaSnapshots.version)
      .limit(1);
    return snapshot || undefined;
  }

  async createSchemaSnapshot(snapshot: InsertSchemaSnapshot): Promise<SchemaSnapshot> {
    const [newSnapshot] = await db.insert(schemaSnapshots).values(snapshot).returning();
    return newSnapshot;
  }

  async updateSchemaSnapshot(id: string, snapshot: Partial<SchemaSnapshot>): Promise<SchemaSnapshot | undefined> {
    const [updated] = await db.update(schemaSnapshots).set(snapshot).where(eq(schemaSnapshots.id, id)).returning();
    return updated || undefined;
  }

  async deleteSchemaSnapshot(id: string): Promise<boolean> {
    const result = await db.delete(schemaSnapshots).where(eq(schemaSnapshots.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async compareSchemaSnapshots(snapshot1Id: string, snapshot2Id: string): Promise<any> {
    const [snapshot1, snapshot2] = await Promise.all([
      this.getSchemaSnapshot(snapshot1Id),
      this.getSchemaSnapshot(snapshot2Id)
    ]);
    
    if (!snapshot1 || !snapshot2) {
      throw new Error("One or both snapshots not found");
    }
    
    // Implementation placeholder - this will be implemented with the schema diffing system
    return {
      snapshot1: { id: snapshot1.id, version: snapshot1.version },
      snapshot2: { id: snapshot2.id, version: snapshot2.version },
      comparison: "Schema comparison placeholder implemented"
    };
  }

  // Sync Events operations
  async getSyncEvent(id: string): Promise<SyncEvent | undefined> {
    const [event] = await db.select().from(syncEvents).where(eq(syncEvents.id, id));
    return event || undefined;
  }

  async getSyncEventsByConnection(connectionId: string, options?: { limit?: number; eventType?: string; status?: string }): Promise<SyncEvent[]> {
    let query = db.select().from(syncEvents).where(eq(syncEvents.connectionId, connectionId));
    
    if (options?.eventType) {
      query = query.where(eq(syncEvents.eventType, options.eventType));
    }
    if (options?.status) {
      query = query.where(eq(syncEvents.status, options.status));
    }
    
    query = query.orderBy(syncEvents.createdAt);
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    return await query;
  }

  async getSyncEventsByUser(userId: string, options?: { limit?: number }): Promise<SyncEvent[]> {
    let query = db.select().from(syncEvents).where(eq(syncEvents.userId, userId));
    
    query = query.orderBy(syncEvents.createdAt);
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    return await query;
  }

  async createSyncEvent(event: InsertSyncEvent): Promise<SyncEvent> {
    const [newEvent] = await db.insert(syncEvents).values(event).returning();
    return newEvent;
  }

  async updateSyncEvent(id: string, event: Partial<SyncEvent>): Promise<SyncEvent | undefined> {
    const [updated] = await db.update(syncEvents).set(event).where(eq(syncEvents.id, id)).returning();
    return updated || undefined;
  }

  async deleteSyncEvent(id: string): Promise<boolean> {
    const result = await db.delete(syncEvents).where(eq(syncEvents.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getFailedSyncEvents(connectionId?: string): Promise<SyncEvent[]> {
    let query = db.select().from(syncEvents).where(eq(syncEvents.status, "failed"));
    
    if (connectionId) {
      query = query.where(eq(syncEvents.connectionId, connectionId));
    }
    
    return await query.orderBy(syncEvents.createdAt);
  }

  async retryFailedSyncEvent(id: string): Promise<SyncEvent | undefined> {
    const [updated] = await db.update(syncEvents).set({
      status: "pending",
      retryCount: sql`${syncEvents.retryCount} + 1`,
      nextRetryAt: new Date(Date.now() + 5 * 60 * 1000) // Retry in 5 minutes
    }).where(eq(syncEvents.id, id)).returning();
    return updated || undefined;
  }

  // Coverage operations
  async getCoverageReports(projectId: string, limit?: number): Promise<CoverageReport[]> {
    const query = db.select()
      .from(coverageReports)
      .where(eq(coverageReports.projectId, projectId))
      .orderBy(coverageReports.createdAt);
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async createCoverageReport(report: InsertCoverageReport): Promise<CoverageReport> {
    const [newReport] = await db.insert(coverageReports).values(report).returning();
    return newReport;
  }

  async getLatestCoverageReport(projectId: string): Promise<CoverageReport | undefined> {
    const [report] = await db
      .select()
      .from(coverageReports)
      .where(eq(coverageReports.projectId, projectId))
      .orderBy(coverageReports.createdAt)
      .limit(1);
    return report || undefined;
  }

  // Deployment System operations

  // Deployment operations
  async getDeployment(id: string): Promise<Deployment | undefined> {
    const [deployment] = await db.select().from(deployments).where(eq(deployments.id, id));
    return deployment || undefined;
  }

  async getDeploymentsByProject(projectId: string, options?: { provider?: string; status?: string }): Promise<Deployment[]> {
    let query = db.select().from(deployments).where(eq(deployments.projectId, projectId));
    
    if (options?.provider) {
      query = query.where(eq(deployments.provider, options.provider));
    }
    if (options?.status) {
      query = query.where(eq(deployments.status, options.status));
    }
    
    return await query.orderBy(deployments.createdAt);
  }

  async getDeploymentsByUser(userId: string): Promise<Deployment[]> {
    return await db.select().from(deployments).where(eq(deployments.userId, userId)).orderBy(deployments.createdAt);
  }

  async getDeploymentsByOrganization(organizationId: string): Promise<Deployment[]> {
    return await db.select().from(deployments).where(eq(deployments.organizationId, organizationId)).orderBy(deployments.createdAt);
  }

  async createDeployment(deployment: InsertDeployment): Promise<Deployment> {
    const [newDeployment] = await db.insert(deployments).values(deployment).returning();
    return newDeployment;
  }

  async updateDeployment(id: string, deployment: Partial<Deployment>): Promise<Deployment | undefined> {
    const [updated] = await db.update(deployments).set(deployment).where(eq(deployments.id, id)).returning();
    return updated || undefined;
  }

  async deleteDeployment(id: string): Promise<boolean> {
    const result = await db.delete(deployments).where(eq(deployments.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getDeploymentByName(projectId: string, name: string): Promise<Deployment | undefined> {
    const [deployment] = await db.select().from(deployments)
      .where(and(eq(deployments.projectId, projectId), eq(deployments.name, name)));
    return deployment || undefined;
  }

  // Deployment Run operations
  async getDeploymentRun(id: string): Promise<DeploymentRun | undefined> {
    const [run] = await db.select().from(deploymentRuns).where(eq(deploymentRuns.id, id));
    return run || undefined;
  }

  async getDeploymentRunsByDeployment(deploymentId: string, options?: { limit?: number; status?: string }): Promise<DeploymentRun[]> {
    let query = db.select().from(deploymentRuns).where(eq(deploymentRuns.deploymentId, deploymentId));
    
    if (options?.status) {
      query = query.where(eq(deploymentRuns.status, options.status));
    }
    
    query = query.orderBy(deploymentRuns.createdAt);
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    return await query;
  }

  async getDeploymentRunsByCommit(gitCommitSha: string): Promise<DeploymentRun[]> {
    return await db.select().from(deploymentRuns).where(eq(deploymentRuns.gitCommitSha, gitCommitSha)).orderBy(deploymentRuns.createdAt);
  }

  async getDeploymentRunsByPR(pullRequestNumber: number): Promise<DeploymentRun[]> {
    return await db.select().from(deploymentRuns).where(eq(deploymentRuns.pullRequestNumber, pullRequestNumber)).orderBy(deploymentRuns.createdAt);
  }

  async createDeploymentRun(run: InsertDeploymentRun): Promise<DeploymentRun> {
    const [newRun] = await db.insert(deploymentRuns).values(run).returning();
    return newRun;
  }

  async updateDeploymentRun(id: string, run: Partial<DeploymentRun>): Promise<DeploymentRun | undefined> {
    const [updated] = await db.update(deploymentRuns).set(run).where(eq(deploymentRuns.id, id)).returning();
    return updated || undefined;
  }

  async deleteDeploymentRun(id: string): Promise<boolean> {
    const result = await db.delete(deploymentRuns).where(eq(deploymentRuns.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getLatestDeploymentRun(deploymentId: string, targetId?: string): Promise<DeploymentRun | undefined> {
    let query = db.select().from(deploymentRuns).where(eq(deploymentRuns.deploymentId, deploymentId));
    
    if (targetId) {
      query = query.where(eq(deploymentRuns.targetId, targetId));
    }
    
    const [run] = await query.orderBy(deploymentRuns.createdAt).limit(1);
    return run || undefined;
  }

  async getActiveDeploymentRuns(): Promise<DeploymentRun[]> {
    return await db.select().from(deploymentRuns)
      .where(sql`${deploymentRuns.status} IN ('queued', 'building', 'deploying')`)
      .orderBy(deploymentRuns.createdAt);
  }

  // Deployment Target operations
  async getDeploymentTarget(id: string): Promise<DeploymentTarget | undefined> {
    const [target] = await db.select().from(deploymentTargets).where(eq(deploymentTargets.id, id));
    return target || undefined;
  }

  async getDeploymentTargetsByDeployment(deploymentId: string): Promise<DeploymentTarget[]> {
    return await db.select().from(deploymentTargets).where(eq(deploymentTargets.deploymentId, deploymentId)).orderBy(deploymentTargets.createdAt);
  }

  async createDeploymentTarget(target: InsertDeploymentTarget): Promise<DeploymentTarget> {
    const [newTarget] = await db.insert(deploymentTargets).values(target).returning();
    return newTarget;
  }

  async updateDeploymentTarget(id: string, target: Partial<DeploymentTarget>): Promise<DeploymentTarget | undefined> {
    const [updated] = await db.update(deploymentTargets).set(target).where(eq(deploymentTargets.id, id)).returning();
    return updated || undefined;
  }

  async deleteDeploymentTarget(id: string): Promise<boolean> {
    const result = await db.delete(deploymentTargets).where(eq(deploymentTargets.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getDeploymentTargetByName(deploymentId: string, name: string): Promise<DeploymentTarget | undefined> {
    const [target] = await db.select().from(deploymentTargets)
      .where(and(eq(deploymentTargets.deploymentId, deploymentId), eq(deploymentTargets.name, name)));
    return target || undefined;
  }

  // Deployment Environment Variable operations
  async getDeploymentEnvVar(id: string): Promise<DeploymentEnvVar | undefined> {
    const [envVar] = await db.select().from(deploymentEnvVars).where(eq(deploymentEnvVars.id, id));
    return envVar || undefined;
  }

  async getDeploymentEnvVarsByDeployment(deploymentId: string, targetId?: string): Promise<DeploymentEnvVar[]> {
    let query = db.select().from(deploymentEnvVars).where(eq(deploymentEnvVars.deploymentId, deploymentId));
    
    if (targetId) {
      query = query.where(eq(deploymentEnvVars.targetId, targetId));
    }
    
    return await query.orderBy(deploymentEnvVars.key);
  }

  async getDeploymentEnvVarsByTarget(targetId: string): Promise<DeploymentEnvVar[]> {
    return await db.select().from(deploymentEnvVars).where(eq(deploymentEnvVars.targetId, targetId)).orderBy(deploymentEnvVars.key);
  }

  async createDeploymentEnvVar(envVar: InsertDeploymentEnvVar): Promise<DeploymentEnvVar> {
    const [newEnvVar] = await db.insert(deploymentEnvVars).values(envVar).returning();
    return newEnvVar;
  }

  async updateDeploymentEnvVar(id: string, envVar: Partial<DeploymentEnvVar>): Promise<DeploymentEnvVar | undefined> {
    const [updated] = await db.update(deploymentEnvVars).set(envVar).where(eq(deploymentEnvVars.id, id)).returning();
    return updated || undefined;
  }

  async deleteDeploymentEnvVar(id: string): Promise<boolean> {
    const result = await db.delete(deploymentEnvVars).where(eq(deploymentEnvVars.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getDeploymentEnvVarByKey(deploymentId: string, targetId: string | null, key: string): Promise<DeploymentEnvVar | undefined> {
    const conditions = [
      eq(deploymentEnvVars.deploymentId, deploymentId),
      eq(deploymentEnvVars.key, key)
    ];
    
    if (targetId === null) {
      conditions.push(sql`${deploymentEnvVars.targetId} IS NULL`);
    } else {
      conditions.push(eq(deploymentEnvVars.targetId, targetId));
    }
    
    const [envVar] = await db.select().from(deploymentEnvVars).where(and(...conditions));
    return envVar || undefined;
  }

  // Preview Mapping operations
  async getPreviewMapping(id: string): Promise<PreviewMapping | undefined> {
    const [mapping] = await db.select().from(previewMappings).where(eq(previewMappings.id, id));
    return mapping || undefined;
  }

  async getPreviewMappingsByDeployment(deploymentId: string): Promise<PreviewMapping[]> {
    return await db.select().from(previewMappings).where(eq(previewMappings.deploymentId, deploymentId)).orderBy(previewMappings.createdAt);
  }

  async getPreviewMappingByPR(deploymentId: string, pullRequestNumber: number): Promise<PreviewMapping | undefined> {
    const [mapping] = await db.select().from(previewMappings)
      .where(and(eq(previewMappings.deploymentId, deploymentId), eq(previewMappings.pullRequestNumber, pullRequestNumber)));
    return mapping || undefined;
  }

  async createPreviewMapping(mapping: InsertPreviewMapping): Promise<PreviewMapping> {
    const [newMapping] = await db.insert(previewMappings).values(mapping).returning();
    return newMapping;
  }

  async updatePreviewMapping(id: string, mapping: Partial<PreviewMapping>): Promise<PreviewMapping | undefined> {
    const [updated] = await db.update(previewMappings).set(mapping).where(eq(previewMappings.id, id)).returning();
    return updated || undefined;
  }

  async deletePreviewMapping(id: string): Promise<boolean> {
    const result = await db.delete(previewMappings).where(eq(previewMappings.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getActivePreviewMappings(deploymentId?: string): Promise<PreviewMapping[]> {
    let query = db.select().from(previewMappings).where(eq(previewMappings.isActive, true));
    
    if (deploymentId) {
      query = query.where(eq(previewMappings.deploymentId, deploymentId));
    }
    
    return await query.orderBy(previewMappings.createdAt);
  }

  async getExpiredPreviewMappings(): Promise<PreviewMapping[]> {
    return await db.select().from(previewMappings)
      .where(and(
        eq(previewMappings.isActive, true),
        eq(previewMappings.autoTeardownEnabled, true),
        sql`${previewMappings.teardownAt} < NOW()`
      ))
      .orderBy(previewMappings.teardownAt);
  }

  // Provider Credential operations
  async getProviderCredential(id: string): Promise<ProviderCredential | undefined> {
    const [credential] = await db.select().from(providerCredentials).where(eq(providerCredentials.id, id));
    return credential || undefined;
  }

  async getProviderCredentialsByOrganization(organizationId: string, provider?: string): Promise<ProviderCredential[]> {
    let query = db.select().from(providerCredentials).where(eq(providerCredentials.organizationId, organizationId));
    
    if (provider) {
      query = query.where(eq(providerCredentials.provider, provider));
    }
    
    return await query.orderBy(providerCredentials.createdAt);
  }

  async getProviderCredentialsByUser(userId: string): Promise<ProviderCredential[]> {
    return await db.select().from(providerCredentials).where(eq(providerCredentials.userId, userId)).orderBy(providerCredentials.createdAt);
  }

  async createProviderCredential(credential: InsertProviderCredential): Promise<ProviderCredential> {
    const [newCredential] = await db.insert(providerCredentials).values(credential).returning();
    return newCredential;
  }

  async updateProviderCredential(id: string, credential: Partial<ProviderCredential>): Promise<ProviderCredential | undefined> {
    const [updated] = await db.update(providerCredentials).set(credential).where(eq(providerCredentials.id, id)).returning();
    return updated || undefined;
  }

  async deleteProviderCredential(id: string): Promise<boolean> {
    const result = await db.delete(providerCredentials).where(eq(providerCredentials.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getProviderCredentialByName(organizationId: string, provider: string, name: string): Promise<ProviderCredential | undefined> {
    const [credential] = await db.select().from(providerCredentials)
      .where(and(
        eq(providerCredentials.organizationId, organizationId),
        eq(providerCredentials.provider, provider),
        eq(providerCredentials.name, name)
      ));
    return credential || undefined;
  }

  // CRITICAL SECURITY: Webhook idempotency implementation
  async getDeploymentRunByWebhookEvent(provider: string, eventId: string): Promise<DeploymentRun | undefined> {
    const result = await db
      .select()
      .from(deploymentRuns)
      .where(and(
        eq(deploymentRuns.webhookProvider, provider),
        eq(deploymentRuns.webhookEventId, eventId)
      ))
      .limit(1);
    return result[0];
  }

  // CRITICAL SECURITY: Organization-scoped deployment operations for RBAC
  async getDeploymentsByOrganization(organizationId: string): Promise<Deployment[]> {
    return await db
      .select()
      .from(deployments)
      .leftJoin(projects, eq(deployments.projectId, projects.id))
      .where(eq(projects.organizationId, organizationId));
  }

  async getDeploymentRunsByOrganization(organizationId: string): Promise<DeploymentRun[]> {
    return await db
      .select()
      .from(deploymentRuns)
      .leftJoin(deployments, eq(deploymentRuns.deploymentId, deployments.id))
      .leftJoin(projects, eq(deployments.projectId, projects.id))
      .where(eq(projects.organizationId, organizationId));
  }

  // CRITICAL SECURITY: RBAC validation helpers
  async validateCredentialOrganization(credentialId: string, organizationId: string): Promise<boolean> {
    const credential = await db
      .select({ organizationId: providerCredentials.organizationId })
      .from(providerCredentials)
      .where(eq(providerCredentials.id, credentialId))
      .limit(1);
    return credential[0]?.organizationId === organizationId;
  }

  async validateDeploymentAccess(deploymentId: string, userId: string, organizationId: string): Promise<boolean> {
    const deployment = await db
      .select({ 
        userId: deployments.userId,
        projectOrganizationId: projects.organizationId 
      })
      .from(deployments)
      .leftJoin(projects, eq(deployments.projectId, projects.id))
      .where(eq(deployments.id, deploymentId))
      .limit(1);
      
    if (!deployment[0]) return false;
    
    // User owns the deployment directly OR same organization with proper role
    return deployment[0].userId === userId || deployment[0].projectOrganizationId === organizationId;
  }

  // Organization-scoped project operations for security
  async getProjectsByGitHubRepoWithOrg(gitHubRepo: string, organizationId?: string): Promise<Project[]> {
    let query = db
      .select()
      .from(projects)
      .where(eq(projects.gitHubRepo, gitHubRepo));
      
    if (organizationId) {
      query = query.where(eq(projects.organizationId, organizationId));
    }
    
    return await query;
  }

  // GitHub repository lookup with URL normalization
  async getProjectsByGitHubRepo(gitHubRepo: string): Promise<Project[]> {
    // Normalize the GitHub repository URL to handle various formats
    const normalizedRepo = this.normalizeGitHubRepoUrl(gitHubRepo);
    
    // Try exact match first
    let results = await db
      .select()
      .from(projects)
      .where(eq(projects.githubRepoUrl, normalizedRepo));
    
    // If no exact match, try case-insensitive search with ILIKE
    if (results.length === 0) {
      results = await db
        .select()
        .from(projects)
        .where(sql`lower(${projects.githubRepoUrl}) = lower(${normalizedRepo})`);
    }
    
    return results;
  }

  // Normalize GitHub repository URLs to handle SSH, HTTPS, and variant formats
  private normalizeGitHubRepoUrl(repoUrl: string): string {
    if (!repoUrl) return '';
    
    let url = repoUrl.trim();
    
    // Handle SSH format: git@github.com:user/repo.git -> https://github.com/user/repo
    if (url.startsWith('git@github.com:')) {
      url = url.replace('git@github.com:', 'https://github.com/');
    }
    
    // Remove .git suffix if present
    if (url.endsWith('.git')) {
      url = url.slice(0, -4);
    }
    
    // Remove trailing slash
    url = url.replace(/\/$/, '');
    
    // Ensure HTTPS format
    if (url.startsWith('http://github.com/')) {
      url = url.replace('http://github.com/', 'https://github.com/');
    }
    
    // Ensure it starts with https://github.com/
    if (!url.startsWith('https://github.com/') && url.includes('github.com')) {
      const match = url.match(/github\.com[\/:]([^\/\s]+)\/([^\/\s]+)/);
      if (match) {
        url = `https://github.com/${match[1]}/${match[2]}`;
      }
    }
    
    return url;
  }

  // Helper method for file operations
  async getProjectFileByPath(projectId: string, filePath: string): Promise<ProjectFile | undefined> {
    const [file] = await db
      .select()
      .from(projectFiles)
      .where(
        and(
          eq(projectFiles.projectId, projectId),
          eq(projectFiles.filePath, filePath)
        )
      )
      .limit(1);
    
    return file || undefined;
  }
}

export const storage = new DatabaseStorage();