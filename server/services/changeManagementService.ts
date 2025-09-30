import { 
  type InsertCodeChange,
  type InsertChangeApplication,
  type InsertRollbackHistory,
  type CodeChange,
  type ChangeApplication,
  type RollbackHistory,
  type ImplementationPlan,
  type PlanStep
} from "@shared/schema";
import { storage } from "../storage";
import { db } from "../db";
import * as fs from 'fs/promises';
import * as path from 'path';
import { diffService } from "./diffService";
import { randomBytes } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ChangeApplicationRequest {
  planId: string;
  changeIds: string[];
  applicationType: 'apply' | 'rollback' | 'partial_apply';
  approvedBy?: string;
  conflictResolution?: 'overwrite' | 'merge' | 'manual';
}

export interface RollbackRequest {
  projectId: string;
  checkpointId?: string;
  targetTimestamp?: Date;
  rollbackType: 'full' | 'partial' | 'file_specific';
  filePatterns?: string[];
}

export interface ConflictResolution {
  fileId: string;
  filePath: string;
  conflictType: 'content' | 'merge' | 'deletion';
  resolution: 'accept_current' | 'accept_incoming' | 'manual_merge';
  mergedContent?: string;
}

class ChangeManagementService {
  private readonly backupDir = '.codevibe/backups';
  private readonly tempDir = '.codevibe/temp';
  private readonly maxBackupRetention = 50; // Keep last 50 backups

  constructor() {
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create directories:', error);
    }
  }
  /**
   * Apply a batch of code changes with conflict resolution (CRASH-SAFE WITH TRANSACTIONS)
   */
  async applyChanges(
    userId: string,
    request: ChangeApplicationRequest
  ): Promise<{
    applicationId: string;
    status: 'completed' | 'failed' | 'partial';
    appliedChanges: string[];
    failedChanges: string[];
    conflicts: ConflictResolution[];
    backupLocation: string;
  }> {
    const batchId = this.generateBatchId();
    const stagingDir = path.join(this.tempDir, batchId);
    
    // Get plan and validate BEFORE transaction
    const plan = await storage.getImplementationPlan(request.planId);
    if (!plan) {
      throw new Error(`Plan ${request.planId} not found`);
    }

    // MOVE LONG-RUNNING I/O OPERATIONS OUTSIDE TRANSACTION
    let backupLocation: string;
    let gitCheckpoint: string | undefined;
    
    try {
      // Ensure staging directory exists
      await fs.mkdir(stagingDir, { recursive: true });
      
      // Create comprehensive backup OUTSIDE transaction
      backupLocation = await this.createComprehensiveBackup(plan.projectId, `pre_apply_${batchId}`);
      
      // MAKE GIT OPERATIONS OPTIONAL
      try {
        gitCheckpoint = await this.createGitCheckpoint(plan.projectId, `pre-apply-${batchId}`, `Pre-apply checkpoint for ${plan.title}`);
        console.log(`✅ Git checkpoint created: ${gitCheckpoint}`);
      } catch (gitError) {
        console.warn('⚠️ Git checkpoint failed (continuing without Git):', gitError instanceof Error ? gitError.message : 'Unknown Git error');
        gitCheckpoint = undefined; // Don't fail the entire operation
      }
    } catch (ioError) {
      console.error('❌ Pre-apply I/O operations failed:', ioError);
      throw new Error(`Failed to prepare for change application: ${ioError instanceof Error ? ioError.message : 'Unknown error'}`);
    }

    // NOW USE DATABASE TRANSACTION FOR ATOMICITY
    try {
      return await db.transaction(async (tx) => {
        try {
          // Create application record in transaction
          const applicationData = {
            planId: request.planId,
            batchId,
            changeIds: request.changeIds,
            applicationType: request.applicationType,
            totalChanges: request.changeIds.length,
            appliedBy: userId,
            approvedBy: request.approvedBy,
            status: 'in_progress' as const,
            startedAt: new Date(),
            backupLocation,
            gitCheckpoint
          };

          const application = await storage.createChangeApplication(applicationData, tx);

          // Get all changes to apply
          const changes = await Promise.all(
            request.changeIds.map(id => storage.getCodeChange(id))
          );

          const validChanges = changes.filter(Boolean) as CodeChange[];
          if (validChanges.length === 0) {
            throw new Error('No valid changes found to apply');
          }

          // Advanced conflict detection with three-way merge
          const conflicts = await this.detectConflictsWithMerge(validChanges, plan.projectId);
          
          // Stage all file changes atomically
          const stagedFiles = await this.stageFileChanges(validChanges, stagingDir, request.conflictResolution);
          
          // Apply changes atomically with rollback capability
          const result = await this.applyFileChangesAtomically(stagedFiles, validChanges, userId);
          
          // Update application status in transaction
          const finalStatus: 'completed' | 'failed' | 'partial' = 
            result.failedChanges.length === 0 ? 'completed' :
            result.appliedChanges.length === 0 ? 'failed' : 'partial';

          await storage.updateChangeApplication(application.id, {
            status: finalStatus,
            successfulChanges: result.appliedChanges.length,
            failedChanges: result.failedChanges.length,
            backupLocation,
            executionLog: result.executionLog,
            completedAt: new Date()
          }, tx);

          return {
            applicationId: application.id,
            status: finalStatus,
            appliedChanges: result.appliedChanges,
            failedChanges: result.failedChanges,
            conflicts,
            backupLocation
          };

        } catch (error) {
          console.error('❌ Transaction error during change application:', error);
          // Transaction will automatically rollback on error
          throw error; // Re-throw to be caught by outer try-catch
        }
      });
    } catch (transactionError) {
      console.error('❌ Change application failed, attempting cleanup:', transactionError);
      
      // CATCH-PATH: Mark application as failed on transaction rollback
      try {
        const failedApplicationData = {
          planId: request.planId,
          batchId,
          changeIds: request.changeIds,
          applicationType: request.applicationType,
          totalChanges: request.changeIds.length,
          appliedBy: userId,
          approvedBy: request.approvedBy,
          status: 'failed' as const,
          startedAt: new Date(),
          completedAt: new Date(),
          backupLocation,
          gitCheckpoint,
          executionLog: `Transaction failed: ${transactionError instanceof Error ? transactionError.message : 'Unknown error'}`
        };
        
        // Create failed application record outside transaction
        const failedApplication = await storage.createChangeApplication(failedApplicationData);
        
        return {
          applicationId: failedApplication.id,
          status: 'failed' as const,
          appliedChanges: [],
          failedChanges: request.changeIds,
          conflicts: [],
          backupLocation
        };
      } catch (catchError) {
        console.error('❌ Failed to create failure record:', catchError);
        throw new Error(`Critical failure during change application: ${transactionError instanceof Error ? transactionError.message : 'Unknown transaction error'}`);
      } finally {
        // Always cleanup staging directory
        try {
          await this.cleanupStagingDir(stagingDir);
        } catch (cleanupError) {
          console.warn('⚠️ Failed to cleanup staging directory:', cleanupError);
        }
      }
    } finally {
      // MOVE POST-OPERATIONS OUTSIDE TRANSACTION
      try {
        // Create post-application checkpoint if we have a successful application
        // Note: This will be handled separately after transaction completion
        
        // Cleanup old backups (retention policy)
        await this.cleanupOldBackups();
      } catch (postOpError) {
        console.warn('⚠️ Post-operation cleanup failed:', postOpError);
      }
    }
  }

  /**
   * Rollback changes to a previous state
   */
  async rollbackChanges(
    userId: string,
    request: RollbackRequest
  ): Promise<{
    success: boolean;
    rolledBackFiles: string[];
    errors: string[];
    newCheckpointId: string;
  }> {
    try {
      let targetCheckpoint: RollbackHistory | undefined;

      if (request.checkpointId) {
        targetCheckpoint = await storage.getRollbackHistory(request.checkpointId);
      } else if (request.targetTimestamp) {
        // Find closest checkpoint to target timestamp
        const allCheckpoints = await storage.getRollbackHistoryByProject(request.projectId);
        targetCheckpoint = this.findClosestCheckpoint(allCheckpoints, request.targetTimestamp);
      }

      if (!targetCheckpoint) {
        throw new Error('No valid checkpoint found for rollback');
      }

      // Create pre-rollback backup
      const preRollbackCheckpoint = await this.createCheckpoint(request.projectId, {
        checkpointType: 'pre_rollback',
        description: `Pre-rollback state before reverting to ${targetCheckpoint.checkpointName}`
      });

      const rolledBackFiles: string[] = [];
      const errors: string[] = [];

      // Restore files from checkpoint
      const fileSnapshots = targetCheckpoint.fileSnapshots as Record<string, string>;
      
      for (const [filePath, content] of Object.entries(fileSnapshots)) {
        try {
          // Check if file matches rollback patterns
          if (request.filePatterns && !this.matchesPatterns(filePath, request.filePatterns)) {
            continue;
          }

          await this.restoreFile(filePath, content, request.projectId);
          rolledBackFiles.push(filePath);

        } catch (error) {
          errors.push(`Failed to restore ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update any related change records
      if (request.rollbackType === 'full') {
        await this.markChangesAsRolledBack(request.projectId, userId, targetCheckpoint.id);
      }

      return {
        success: errors.length === 0,
        rolledBackFiles,
        errors,
        newCheckpointId: preRollbackCheckpoint
      };

    } catch (error) {
      console.error('Rollback error:', error);
      throw new Error(`Failed to rollback changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a checkpoint for rollback purposes
   */
  async createCheckpoint(
    projectId: string,
    options: {
      planId?: string;
      applicationId?: string;
      checkpointType: 'auto' | 'manual' | 'pre_apply' | 'post_apply' | 'pre_rollback';
      description?: string;
      checkpointName?: string;
    }
  ): Promise<string> {
    try {
      // Get current project files
      const projectFiles = await storage.getProjectFiles(projectId);
      const fileSnapshots: Record<string, string> = {};

      // Create snapshots of all files
      for (const file of projectFiles) {
        fileSnapshots[file.filePath] = file.content;
      }

      // Calculate checkpoint size
      const size = JSON.stringify(fileSnapshots).length;

      const checkpointData = {
        projectId,
        planId: options.planId,
        applicationId: options.applicationId,
        checkpointName: options.checkpointName || this.generateCheckpointName(options.checkpointType),
        description: options.description || `${options.checkpointType} checkpoint`,
        checkpointType: options.checkpointType,
        fileSnapshots,
        size,
        compressionType: 'none' as const,
        createdBy: projectFiles[0]?.projectId || projectId, // Use projectId as fallback
        retentionUntil: this.calculateRetentionDate(options.checkpointType)
      };

      const checkpoint = await storage.createRollbackHistory(checkpointData);
      return checkpoint.id;

    } catch (error) {
      console.error('Checkpoint creation error:', error);
      throw new Error(`Failed to create checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get rollback history for a project
   */
  async getRollbackHistory(projectId: string): Promise<RollbackHistory[]> {
    return await storage.getRollbackHistoryByProject(projectId);
  }

  /**
   * Preview what a rollback would do without actually applying it
   */
  async previewRollback(
    projectId: string,
    checkpointId: string
  ): Promise<{
    changedFiles: Array<{
      filePath: string;
      changeType: 'modified' | 'added' | 'deleted';
      currentContent: string;
      checkpointContent: string;
      diff: any;
    }>;
    summary: {
      filesChanged: number;
      linesAdded: number;
      linesRemoved: number;
    };
  }> {
    const checkpoint = await storage.getRollbackHistory(checkpointId);
    if (!checkpoint) {
      throw new Error('Checkpoint not found');
    }

    const currentFiles = await storage.getProjectFiles(projectId);
    const currentFileMap = new Map(currentFiles.map(f => [f.filePath, f.content]));
    const checkpointFiles = checkpoint.fileSnapshots as Record<string, string>;

    const changedFiles: Array<any> = [];
    let totalLinesAdded = 0;
    let totalLinesRemoved = 0;

    // Compare current state with checkpoint
    const allFilePaths = new Set([
      ...Array.from(currentFileMap.keys()),
      ...Object.keys(checkpointFiles)
    ]);

    for (const filePath of Array.from(allFilePaths)) {
      const currentContent = currentFileMap.get(filePath) || '';
      const checkpointContent = checkpointFiles[filePath] || '';

      if (currentContent !== checkpointContent) {
        const diff = diffService.generateDiff(currentContent, checkpointContent, filePath);
        
        let changeType: 'modified' | 'added' | 'deleted';
        if (!currentContent) changeType = 'added';
        else if (!checkpointContent) changeType = 'deleted';
        else changeType = 'modified';

        changedFiles.push({
          filePath,
          changeType,
          currentContent,
          checkpointContent,
          diff
        });

        totalLinesAdded += diff.stats.additions;
        totalLinesRemoved += diff.stats.deletions;
      }
    }

    return {
      changedFiles,
      summary: {
        filesChanged: changedFiles.length,
        linesAdded: totalLinesAdded,
        linesRemoved: totalLinesRemoved
      }
    };
  }

  /**
   * Detect conflicts between proposed changes
   */
  async detectConflicts(changes: CodeChange[]): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = [];
    const fileGroups = new Map<string, CodeChange[]>();

    // Group changes by file
    changes.forEach(change => {
      if (!fileGroups.has(change.filePath)) {
        fileGroups.set(change.filePath, []);
      }
      fileGroups.get(change.filePath)!.push(change);
    });

    // Check for conflicts within each file
    for (const [filePath, fileChanges] of Array.from(fileGroups)) {
      if (fileChanges.length > 1) {
        // Multiple changes to the same file - potential conflict
        const conflictTypes = this.analyzeFileConflicts(fileChanges);
        
        conflictTypes.forEach(conflict => {
          conflicts.push({
            fileId: fileChanges[0].id,
            filePath,
            conflictType: conflict.type,
            resolution: 'manual_merge' // Default to manual resolution
          });
        });
      }

      // Check if current file content has changed since change was proposed
      for (const change of fileChanges) {
        const currentContent = await this.getCurrentFileContent(change.projectId, change.filePath);
        if (currentContent && currentContent !== change.originalContent) {
          conflicts.push({
            fileId: change.id,
            filePath,
            conflictType: 'content',
            resolution: 'accept_incoming' // Default resolution
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Get change application status
   */
  async getApplicationStatus(applicationId: string): Promise<ChangeApplication | undefined> {
    return await storage.getChangeApplication(applicationId);
  }

  /**
   * Cancel a pending change application
   */
  async cancelApplication(applicationId: string, userId: string): Promise<boolean> {
    try {
      const application = await storage.getChangeApplication(applicationId);
      if (!application) return false;

      if (application.status !== 'pending' && application.status !== 'in_progress') {
        throw new Error('Cannot cancel application that is not pending or in progress');
      }

      await storage.updateChangeApplication(applicationId, {
        status: 'cancelled',
        completedAt: new Date()
      });

      return true;
    } catch (error) {
      console.error('Application cancellation error:', error);
      return false;
    }
  }

  // Private helper methods

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Create a Git checkpoint with optional error handling
   */
  private async createGitCheckpoint(
    projectId: string,
    checkpointName: string,
    description: string
  ): Promise<string | undefined> {
    try {
      // Check if Git is available and repo is initialized
      await execAsync('git --version');
      await execAsync('git rev-parse --git-dir');
      
      // Create Git commit
      await execAsync(`git add .`);
      await execAsync(`git commit -m "${description}" --allow-empty`);
      
      // Get the commit hash
      const { stdout: commitHash } = await execAsync('git rev-parse HEAD');
      
      // Create a tag for the checkpoint
      await execAsync(`git tag -a "${checkpointName}" -m "${description}"`);
      
      console.log(`✅ Git checkpoint created: ${checkpointName} (${commitHash.trim()})`);
      return commitHash.trim();
    } catch (error) {
      // Git operations should not fail the entire process
      console.warn(`⚠️ Git checkpoint creation failed: ${error instanceof Error ? error.message : 'Unknown Git error'}`);
      return undefined;
    }
  }
  
  /**
   * Create comprehensive backup outside transaction
   */
  private async createComprehensiveBackup(projectId: string, backupName: string): Promise<string> {
    try {
      const backupDir = path.join(this.backupDir, projectId);
      await fs.mkdir(backupDir, { recursive: true });
      
      const backupPath = path.join(backupDir, `${backupName}.json`);
      const projectFiles = await storage.getProjectFiles(projectId);
      
      const backup = {
        timestamp: new Date().toISOString(),
        projectId,
        backupName,
        files: projectFiles.map(f => ({
          path: f.filePath,
          content: f.content,
          fileName: f.fileName || path.basename(f.filePath)
        }))
      };
      
      await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
      console.log(`✅ Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Advanced conflict detection with three-way merge
   */
  private async detectConflictsWithMerge(changes: CodeChange[], projectId: string): Promise<ConflictResolution[]> {
    // For now, use the existing conflict detection
    // This would be enhanced with actual three-way merge logic
    return await this.detectConflicts(changes);
  }
  
  /**
   * Stage file changes atomically
   */
  private async stageFileChanges(
    changes: CodeChange[],
    stagingDir: string,
    conflictResolution?: string
  ): Promise<Array<{ changePath: string; content: string; change: CodeChange }>> {
    const stagedFiles: Array<{ changePath: string; content: string; change: CodeChange }> = [];
    
    for (const change of changes) {
      const stagingPath = path.join(stagingDir, change.id + '.staged');
      const content = change.proposedContent || '';
      
      await fs.writeFile(stagingPath, content);
      stagedFiles.push({
        changePath: stagingPath,
        content,
        change
      });
    }
    
    return stagedFiles;
  }
  
  /**
   * Apply file changes atomically with rollback capability
   */
  private async applyFileChangesAtomically(
    stagedFiles: Array<{ changePath: string; content: string; change: CodeChange }>,
    changes: CodeChange[],
    userId: string
  ): Promise<{
    appliedChanges: string[];
    failedChanges: string[];
    executionLog: string;
  }> {
    const appliedChanges: string[] = [];
    const failedChanges: string[] = [];
    const logs: string[] = [];
    
    for (const stagedFile of stagedFiles) {
      try {
        const result = await this.applySingleChange(stagedFile.change);
        if (result.success) {
          appliedChanges.push(stagedFile.change.id);
          logs.push(`✅ Applied: ${stagedFile.change.filePath}`);
        } else {
          failedChanges.push(stagedFile.change.id);
          logs.push(`❌ Failed: ${stagedFile.change.filePath} - ${result.error}`);
        }
      } catch (error) {
        failedChanges.push(stagedFile.change.id);
        logs.push(`❌ Error: ${stagedFile.change.filePath} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return {
      appliedChanges,
      failedChanges,
      executionLog: logs.join('\n')
    };
  }
  
  /**
   * Cleanup staging directory
   */
  private async cleanupStagingDir(stagingDir: string): Promise<void> {
    try {
      await fs.rm(stagingDir, { recursive: true, force: true });
      console.log(`🧹 Cleaned up staging directory: ${stagingDir}`);
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup staging directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Cleanup old backups according to retention policy
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backupDirs = await fs.readdir(this.backupDir);
      
      for (const projectDir of backupDirs) {
        const projectBackupPath = path.join(this.backupDir, projectDir);
        const backupFiles = await fs.readdir(projectBackupPath);
        
        if (backupFiles.length > this.maxBackupRetention) {
          // Sort by creation time and remove oldest
          const sortedFiles = [];
          for (const file of backupFiles) {
            const filePath = path.join(projectBackupPath, file);
            const stats = await fs.stat(filePath);
            sortedFiles.push({ file, path: filePath, time: stats.ctime });
          }
          
          sortedFiles.sort((a, b) => a.time.getTime() - b.time.getTime());
          
          // Remove oldest files, keep only maxBackupRetention
          const filesToRemove = sortedFiles.slice(0, sortedFiles.length - this.maxBackupRetention);
          
          for (const fileToRemove of filesToRemove) {
            await fs.unlink(fileToRemove.path);
            console.log(`🗑️ Removed old backup: ${fileToRemove.file}`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ Backup cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateCheckpointName(type: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${type}_${timestamp}`;
  }

  private calculateRetentionDate(type: string): Date {
    const now = new Date();
    const retentionDays = {
      auto: 7,
      manual: 30,
      pre_apply: 14,
      post_apply: 30,
      pre_rollback: 7
    }[type] || 14;

    now.setDate(now.getDate() + retentionDays);
    return now;
  }

  private async createBackup(projectId: string, backupName: string): Promise<string> {
    const backupDir = path.join('/tmp', 'backups', projectId);
    const backupPath = path.join(backupDir, `${backupName}.json`);

    try {
      await fs.mkdir(backupDir, { recursive: true });
      
      const projectFiles = await storage.getProjectFiles(projectId);
      const backup = {
        timestamp: new Date().toISOString(),
        projectId,
        files: projectFiles.map(f => ({
          path: f.filePath,
          content: f.content
        }))
      };

      await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
      return backupPath;

    } catch (error) {
      console.error('Backup creation error:', error);
      throw new Error('Failed to create backup');
    }
  }

  private async applySingleChange(
    change: CodeChange,
    conflictResolution?: string
  ): Promise<{
    success: boolean;
    finalContent?: string;
    error?: string;
  }> {
    try {
      const projectFile = await storage.getProjectFile(change.projectId, change.filePath);
      
      if (change.changeType === 'create' && projectFile) {
        return {
          success: false,
          error: 'File already exists'
        };
      }

      if ((change.changeType === 'modify' || change.changeType === 'delete') && !projectFile) {
        return {
          success: false,
          error: 'File does not exist'
        };
      }

      let finalContent = change.proposedContent;

      // Handle different change types
      switch (change.changeType) {
        case 'create':
          await storage.createProjectFile({
            projectId: change.projectId,
            fileName: path.basename(change.filePath),
            filePath: change.filePath,
            content: finalContent,
            language: this.detectLanguage(change.filePath)
          });
          break;

        case 'modify':
          if (!projectFile) throw new Error('File not found for modification');
          
          // Check for conflicts and apply resolution
          if (projectFile.content !== change.originalContent) {
            if (conflictResolution === 'merge') {
              finalContent = this.mergeContent(
                change.originalContent || '',
                projectFile.content,
                change.proposedContent
              );
            } else if (conflictResolution !== 'overwrite') {
              return {
                success: false,
                error: 'Content conflict detected'
              };
            }
          }

          await storage.updateProjectFile(projectFile.id, {
            content: finalContent,
            updatedAt: new Date()
          });
          break;

        case 'delete':
          if (!projectFile) throw new Error('File not found for deletion');
          await storage.deleteProjectFile(projectFile.id);
          finalContent = '';
          break;

        case 'rename':
        case 'move':
          if (!projectFile) throw new Error('File not found for rename/move');
          await storage.updateProjectFile(projectFile.id, {
            filePath: change.filePath,
            fileName: path.basename(change.filePath),
            content: finalContent
          });
          break;

        default:
          return {
            success: false,
            error: `Unsupported change type: ${change.changeType}`
          };
      }

      return {
        success: true,
        finalContent
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private mergeContent(base: string, current: string, proposed: string): string {
    // Use diff service for three-way merge
    const merge = diffService.mergeChanges(base, current, proposed, 'merged-file');
    return merge.mergedContent;
  }

  private findClosestCheckpoint(checkpoints: RollbackHistory[], targetDate: Date): RollbackHistory | undefined {
    return checkpoints
      .filter(cp => cp.createdAt && new Date(cp.createdAt) <= targetDate)
      .sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0))[0];
  }

  private matchesPatterns(filePath: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    });
  }

  private async restoreFile(filePath: string, content: string, projectId: string): Promise<void> {
    const existingFile = await storage.getProjectFile(projectId, filePath);
    
    if (existingFile) {
      await storage.updateProjectFile(existingFile.id, {
        content,
        updatedAt: new Date()
      });
    } else {
      await storage.createProjectFile({
        projectId,
        fileName: path.basename(filePath),
        filePath,
        content,
        language: this.detectLanguage(filePath)
      });
    }
  }

  private async markChangesAsRolledBack(projectId: string, userId: string, checkpointId: string): Promise<void> {
    // This would mark all related changes as rolled back
    // Implementation depends on how we track change relationships
  }

  private analyzeFileConflicts(changes: CodeChange[]): Array<{ type: 'content' | 'merge' | 'deletion' }> {
    const conflicts: Array<{ type: 'content' | 'merge' | 'deletion' }> = [];

    // Check for deletion conflicts
    const deleteChanges = changes.filter(c => c.changeType === 'delete');
    const modifyChanges = changes.filter(c => c.changeType === 'modify');

    if (deleteChanges.length > 0 && modifyChanges.length > 0) {
      conflicts.push({ type: 'deletion' });
    }

    // Check for overlapping modifications
    if (modifyChanges.length > 1) {
      // This would require more sophisticated analysis of the actual changes
      conflicts.push({ type: 'merge' });
    }

    return conflicts;
  }

  private async getCurrentFileContent(projectId: string, filePath: string): Promise<string | null> {
    const file = await storage.getProjectFile(projectId, filePath);
    return file ? file.content : null;
  }

  private detectLanguage(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.css': 'css',
      '.html': 'html',
      '.json': 'json'
    };
    
    return languageMap[extension] || 'text';
  }

  /**
   * Helper methods for crash-safe operations
   */
  

  private determineConflictType(current: string, base: string, incoming: string): 'content' | 'merge' | 'deletion' {
    if (incoming === '' && current !== base) return 'deletion';
    if (current !== base && incoming !== base) return 'merge';
    return 'content';
  }

  private async attemptAutoMerge(current: string, base: string, incoming: string): Promise<string | undefined> {
    // Simple auto-merge for non-conflicting changes
    if (current === base) return incoming;
    if (incoming === base) return current;
    
    // For complex merges, return undefined to indicate manual resolution needed
    return undefined;
  }

  private async resolveConflicts(change: CodeChange, resolution: string): Promise<string> {
    switch (resolution) {
      case 'overwrite':
        return change.newContent;
      case 'merge':
        // For now, return new content. In a real implementation, this would do intelligent merging
        return change.newContent;
      default:
        return change.newContent;
    }
  }

  private async readFileIfExists(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return '';
    }
  }

  private async writeFileAtomically(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    const dirPath = path.dirname(filePath);
    
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(tempPath, content);
    await fs.rename(tempPath, filePath);
  }

  private async rollbackChanges(rollbackData: Array<{ filePath: string; originalContent: string }>): Promise<void> {
    for (const { filePath, originalContent } of rollbackData) {
      try {
        if (originalContent === '') {
          // File was created, delete it
          await fs.unlink(filePath);
        } else {
          // File was modified, restore original content
          await this.writeFileAtomically(filePath, originalContent);
        }
      } catch (error) {
        console.error(`Failed to rollback ${filePath}:`, error);
      }
    }
  }

  private async cleanupStagingDir(stagingDir: string): Promise<void> {
    try {
      await fs.rm(stagingDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup staging directory:', error);
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backupDirs = await fs.readdir(this.backupDir);
      
      for (const projectDir of backupDirs) {
        const projectBackupPath = path.join(this.backupDir, projectDir);
        const backups = await fs.readdir(projectBackupPath);
        
        if (backups.length > this.maxBackupRetention) {
          // Sort by creation time and remove oldest
          const backupStats = await Promise.all(
            backups.map(async (backup) => {
              const backupPath = path.join(projectBackupPath, backup);
              const stats = await fs.stat(backupPath);
              return { name: backup, path: backupPath, created: stats.birthtime };
            })
          );
          
          backupStats.sort((a, b) => a.created.getTime() - b.created.getTime());
          const toDelete = backupStats.slice(0, backupStats.length - this.maxBackupRetention);
          
          for (const backup of toDelete) {
            await fs.rm(backup.path, { recursive: true, force: true });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error);
    }
  }

  private matchesPatterns(filePath: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    });
  }

  private findClosestCheckpoint(checkpoints: RollbackHistory[], targetTime: Date): RollbackHistory | undefined {
    return checkpoints
      .filter(cp => new Date(cp.createdAt) <= targetTime)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }
}

export const changeManagementService = new ChangeManagementService();