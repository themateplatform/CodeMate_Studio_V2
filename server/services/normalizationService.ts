import { db } from '../db';
import { 
  projects,
  normalizationRuns,
  projectFiles,
  type Project,
  type NormalizationRun,
  type InsertNormalizationRun,
  type ProjectFile
} from '@shared/schema';
import { eq, and, or, inArray, isNotNull, sql } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Project type definitions
export type ProjectType = 'react-vite' | 'next-fullstack' | 'api-backend' | 'hybrid' | 'unknown';

// Normalization rule definition
interface NormalizationRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | string;
  action: 'move' | 'rename' | 'update-import' | 'generate-barrel' | 'remove' | 'consolidate';
  target?: string;
  priority: number;
}

// Rule pack for different project types
interface RulePack {
  projectType: ProjectType;
  name: string;
  description: string;
  targetStructure: Record<string, string[]>;
  rules: NormalizationRule[];
  namingConventions: {
    components?: RegExp;
    pages?: RegExp;
    hooks?: RegExp;
    utils?: RegExp;
    types?: RegExp;
  };
}

// Transformation result
interface TransformationResult {
  success: boolean;
  filesModified: number;
  filesMoved: number;
  filesDeleted: number;
  importsUpdated: number;
  errors: string[];
  warnings: string[];
}

// Dependency analysis result
interface DependencyAnalysis {
  unused: string[];
  duplicates: Map<string, string[]>;
  outdated: Map<string, string>;
  devDepsInProd: string[];
  missingTypes: string[];
}

export class NormalizationService {
  // Rule packs for different project types
  private rulePacks: Map<ProjectType, RulePack> = new Map([
    ['react-vite', {
      projectType: 'react-vite',
      name: 'React/Vite Structure',
      description: 'Standard structure for React applications with Vite',
      targetStructure: {
        'client/src/pages': ['Page components with routing'],
        'client/src/components': ['Reusable UI components'],
        'client/src/components/ui': ['Base UI components (buttons, inputs, etc)'],
        'client/src/hooks': ['Custom React hooks'],
        'client/src/lib': ['Utility functions and helpers'],
        'client/src/types': ['TypeScript type definitions'],
        'client/src/test': ['Test files and utilities'],
        'client/src/assets': ['Static assets (images, fonts, etc)'],
        'client/src/styles': ['Global styles and CSS modules']
      },
      rules: [
        {
          id: 'move-pages',
          name: 'Move page components',
          description: 'Move page-level components to pages directory',
          pattern: /client\/src\/(.*Page\.(tsx|jsx))$/,
          action: 'move',
          target: 'client/src/pages/$1',
          priority: 1
        },
        {
          id: 'move-hooks',
          name: 'Move custom hooks',
          description: 'Move custom hooks to hooks directory',
          pattern: /client\/src\/(?!hooks\/)(use[A-Z][a-zA-Z]*\.(ts|tsx|js|jsx))$/,
          action: 'move',
          target: 'client/src/hooks/$1',
          priority: 2
        },
        {
          id: 'generate-barrel-components',
          name: 'Generate barrel exports for components',
          description: 'Create index.ts files for component folders',
          pattern: 'client/src/components',
          action: 'generate-barrel',
          priority: 3
        },
        {
          id: 'consolidate-types',
          name: 'Consolidate type definitions',
          description: 'Move all type definitions to types directory',
          pattern: /client\/src\/(?!types\/)(.*)\/types\.(ts|tsx)$/,
          action: 'consolidate',
          target: 'client/src/types',
          priority: 4
        }
      ],
      namingConventions: {
        components: /^[A-Z][a-zA-Z]*\.(tsx|jsx)$/,
        pages: /^[A-Z][a-zA-Z]*Page\.(tsx|jsx)$/,
        hooks: /^use[A-Z][a-zA-Z]*\.(ts|tsx|js|jsx)$/,
        utils: /^[a-z][a-zA-Z]*\.(ts|js)$/,
        types: /^[a-z][a-zA-Z]*\.types\.(ts|tsx)$/
      }
    }],
    ['next-fullstack', {
      projectType: 'next-fullstack',
      name: 'Next.js App Structure',
      description: 'Standard structure for Next.js applications with app router',
      targetStructure: {
        'app': ['Next.js app router pages and layouts'],
        'app/components': ['Page-specific components'],
        'components': ['Shared components'],
        'lib': ['Utility functions and server utilities'],
        'types': ['TypeScript type definitions'],
        'public': ['Static assets'],
        'styles': ['Global styles']
      },
      rules: [
        {
          id: 'organize-app-routes',
          name: 'Organize app routes',
          description: 'Ensure proper Next.js app router structure',
          pattern: /app\/(?!api\/)(.*)\.tsx$/,
          action: 'move',
          target: 'app/$1/page.tsx',
          priority: 1
        },
        {
          id: 'move-api-routes',
          name: 'Organize API routes',
          description: 'Ensure API routes follow Next.js conventions',
          pattern: /pages\/api\/(.*)$/,
          action: 'move',
          target: 'app/api/$1/route.ts',
          priority: 2
        },
        {
          id: 'consolidate-server-components',
          name: 'Mark server components',
          description: 'Add "use server" directive where appropriate',
          pattern: /app\/.*\/(page|layout|loading|error)\.tsx$/,
          action: 'update-import',
          priority: 3
        }
      ],
      namingConventions: {
        components: /^[A-Z][a-zA-Z]*\.(tsx|jsx)$/,
        pages: /^page\.(tsx|jsx)$/,
        utils: /^[a-z][a-zA-Z]*\.(ts|js)$/,
        types: /^.*\.types\.(ts|tsx)$/
      }
    }],
    ['api-backend', {
      projectType: 'api-backend',
      name: 'API Backend Structure',
      description: 'Standard structure for Express/Node.js API backends',
      targetStructure: {
        'server/routes': ['API route handlers'],
        'server/services': ['Business logic and services'],
        'server/templates': ['Template files and generators'],
        'server/connectors': ['Database and external service connectors'],
        'server/jobs': ['Background jobs and workers'],
        'server/middleware': ['Express middleware'],
        'server/utils': ['Utility functions'],
        'server/types': ['TypeScript type definitions']
      },
      rules: [
        {
          id: 'organize-routes',
          name: 'Organize route handlers',
          description: 'Move route handlers to routes directory',
          pattern: /server\/(?!routes\/)(.*)Routes?\.(ts|js)$/,
          action: 'move',
          target: 'server/routes/$1.ts',
          priority: 1
        },
        {
          id: 'organize-services',
          name: 'Organize services',
          description: 'Move services to services directory',
          pattern: /server\/(?!services\/)(.*)Service\.(ts|js)$/,
          action: 'move',
          target: 'server/services/$1Service.ts',
          priority: 2
        },
        {
          id: 'consolidate-middleware',
          name: 'Consolidate middleware',
          description: 'Move middleware to middleware directory',
          pattern: /server\/(?!middleware\/)(.*)middleware\.(ts|js)$/i,
          action: 'move',
          target: 'server/middleware/$1.ts',
          priority: 3
        }
      ],
      namingConventions: {
        utils: /^[a-z][a-zA-Z]*\.(ts|js)$/,
        types: /^.*\.types\.(ts|js)$/
      }
    }]
  ]);

  constructor() {}

  /**
   * Detect project type based on file structure and package.json
   */
  async detectProjectType(projectId: string): Promise<{
    type: ProjectType;
    frameworks: Record<string, boolean>;
    structure: Record<string, string[]>;
  }> {
    // Get project files to analyze structure
    const files = await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .limit(1000);

    // Analyze file paths
    const structure: Record<string, string[]> = {};
    const frameworkIndicators = {
      react: false,
      nextjs: false,
      vite: false,
      express: false,
      typescript: false,
      tailwind: false
    };

    // Check for framework-specific files
    for (const file of files) {
      const filePath = file.filePath;
      
      // React detection
      if (filePath.includes('src/App.tsx') || filePath.includes('src/App.jsx')) {
        frameworkIndicators.react = true;
      }
      
      // Next.js detection
      if (filePath.includes('next.config.js') || filePath.includes('app/layout.tsx') || filePath.includes('pages/_app.tsx')) {
        frameworkIndicators.nextjs = true;
      }
      
      // Vite detection
      if (filePath.includes('vite.config.ts') || filePath.includes('vite.config.js')) {
        frameworkIndicators.vite = true;
      }
      
      // Express detection
      if (filePath.includes('server/index.ts') || filePath.includes('server/routes.ts')) {
        frameworkIndicators.express = true;
      }
      
      // TypeScript detection
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        frameworkIndicators.typescript = true;
      }
      
      // Tailwind detection
      if (filePath.includes('tailwind.config')) {
        frameworkIndicators.tailwind = true;
      }

      // Build structure map
      const dir = path.dirname(filePath);
      if (!structure[dir]) {
        structure[dir] = [];
      }
      structure[dir].push(path.basename(filePath));
    }

    // Determine project type
    let type: ProjectType = 'unknown';
    
    if (frameworkIndicators.nextjs) {
      type = 'next-fullstack';
    } else if (frameworkIndicators.react && frameworkIndicators.vite) {
      type = 'react-vite';
    } else if (frameworkIndicators.express && !frameworkIndicators.react) {
      type = 'api-backend';
    } else if (frameworkIndicators.express && frameworkIndicators.react) {
      type = 'hybrid';
    }

    return {
      type,
      frameworks: frameworkIndicators,
      structure
    };
  }

  /**
   * Analyze project structure compliance
   */
  async analyzeCompliance(projectId: string, projectType: ProjectType): Promise<number> {
    const rulePack = this.rulePacks.get(projectType);
    if (!rulePack) {
      return 0;
    }

    const files = await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId));

    let totalScore = 0;
    let maxScore = 0;

    // Check target structure compliance
    for (const [targetDir, description] of Object.entries(rulePack.targetStructure)) {
      maxScore += 10;
      const hasDir = files.some(f => f.filePath.startsWith(targetDir + '/'));
      if (hasDir) {
        totalScore += 10;
      }
    }

    // Check naming conventions
    for (const file of files) {
      const fileName = path.basename(file.filePath);
      const dir = path.dirname(file.filePath);
      
      if (dir.includes('components') && rulePack.namingConventions.components) {
        maxScore += 1;
        if (rulePack.namingConventions.components.test(fileName)) {
          totalScore += 1;
        }
      }
      
      if (dir.includes('hooks') && rulePack.namingConventions.hooks) {
        maxScore += 1;
        if (rulePack.namingConventions.hooks.test(fileName)) {
          totalScore += 1;
        }
      }
    }

    return Math.round((totalScore / maxScore) * 100);
  }

  /**
   * Generate normalization plan
   */
  async generatePlan(projectId: string): Promise<{
    plan: any;
    estimatedChanges: number;
    rulesApplied: string[];
  }> {
    const detection = await this.detectProjectType(projectId);
    const rulePack = this.rulePacks.get(detection.type);
    
    if (!rulePack) {
      return {
        plan: null,
        estimatedChanges: 0,
        rulesApplied: []
      };
    }

    const files = await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId));

    const plan: any = {
      moves: [],
      renames: [],
      importUpdates: [],
      barrelExports: [],
      deletions: []
    };

    const rulesApplied: string[] = [];
    
    // Apply each rule to generate plan
    for (const rule of rulePack.rules.sort((a, b) => a.priority - b.priority)) {
      for (const file of files) {
        if (rule.pattern instanceof RegExp) {
          const match = file.filePath.match(rule.pattern);
          if (match) {
            rulesApplied.push(rule.id);
            
            switch (rule.action) {
              case 'move':
                if (rule.target) {
                  const newPath = rule.target.replace(/\$(\d+)/g, (_, n) => match[parseInt(n)] || '');
                  plan.moves.push({
                    from: file.filePath,
                    to: newPath,
                    rule: rule.name
                  });
                }
                break;
              case 'generate-barrel':
                if (!plan.barrelExports.some((b: any) => b.directory === rule.pattern)) {
                  plan.barrelExports.push({
                    directory: rule.pattern,
                    rule: rule.name
                  });
                }
                break;
              case 'consolidate':
                if (rule.target) {
                  plan.moves.push({
                    from: file.filePath,
                    to: path.join(rule.target, path.basename(file.filePath)),
                    rule: rule.name
                  });
                }
                break;
            }
          }
        }
      }
    }

    // Calculate import updates needed
    for (const move of plan.moves) {
      // Find all files that import the moved file
      const importingFiles = files.filter(f => {
        if (!f.content) return false;
        const relativePath = path.relative(path.dirname(f.filePath), move.from);
        return f.content.includes(`from '${relativePath}'`) || 
               f.content.includes(`from "${relativePath}"`) ||
               f.content.includes(`import '${relativePath}'`) ||
               f.content.includes(`import "${relativePath}"`);
      });
      
      for (const importingFile of importingFiles) {
        plan.importUpdates.push({
          file: importingFile.filePath,
          oldImport: move.from,
          newImport: move.to
        });
      }
    }

    const estimatedChanges = 
      plan.moves.length + 
      plan.renames.length + 
      plan.importUpdates.length + 
      plan.barrelExports.length + 
      plan.deletions.length;

    return {
      plan,
      estimatedChanges,
      rulesApplied: [...new Set(rulesApplied)]
    };
  }

  /**
   * Apply codemod transformations
   */
  async applyTransformations(
    projectId: string, 
    plan: any,
    dryRun: boolean = false
  ): Promise<TransformationResult> {
    const result: TransformationResult = {
      success: true,
      filesModified: 0,
      filesMoved: 0,
      filesDeleted: 0,
      importsUpdated: 0,
      errors: [],
      warnings: []
    };

    try {
      // Apply file moves
      for (const move of plan.moves || []) {
        if (!dryRun) {
          const file = await db
            .select()
            .from(projectFiles)
            .where(and(
              eq(projectFiles.projectId, projectId),
              eq(projectFiles.filePath, move.from)
            ))
            .limit(1);
          
          if (file[0]) {
            await db
              .update(projectFiles)
              .set({ 
                filePath: move.to,
                fileName: path.basename(move.to),
                updatedAt: new Date()
              })
              .where(eq(projectFiles.id, file[0].id));
            
            result.filesMoved++;
          }
        } else {
          result.filesMoved++;
        }
      }

      // Update imports
      for (const update of plan.importUpdates || []) {
        if (!dryRun) {
          const file = await db
            .select()
            .from(projectFiles)
            .where(and(
              eq(projectFiles.projectId, projectId),
              eq(projectFiles.filePath, update.file)
            ))
            .limit(1);
          
          if (file[0] && file[0].content) {
            const oldRelativePath = path.relative(
              path.dirname(update.file), 
              update.oldImport
            ).replace(/\\/g, '/');
            const newRelativePath = path.relative(
              path.dirname(update.file), 
              update.newImport
            ).replace(/\\/g, '/');
            
            let updatedContent = file[0].content;
            
            // Update various import formats
            updatedContent = updatedContent.replace(
              new RegExp(`from ['"]${escapeRegExp(oldRelativePath)}['"]`, 'g'),
              `from '${newRelativePath}'`
            );
            updatedContent = updatedContent.replace(
              new RegExp(`import ['"]${escapeRegExp(oldRelativePath)}['"]`, 'g'),
              `import '${newRelativePath}'`
            );
            updatedContent = updatedContent.replace(
              new RegExp(`require\\(['"]${escapeRegExp(oldRelativePath)}['"]\\)`, 'g'),
              `require('${newRelativePath}')`
            );
            
            await db
              .update(projectFiles)
              .set({ 
                content: updatedContent,
                updatedAt: new Date()
              })
              .where(eq(projectFiles.id, file[0].id));
            
            result.importsUpdated++;
          }
        } else {
          result.importsUpdated++;
        }
      }

      // Generate barrel exports
      for (const barrel of plan.barrelExports || []) {
        if (!dryRun) {
          const dirFiles = await db
            .select()
            .from(projectFiles)
            .where(and(
              eq(projectFiles.projectId, projectId),
              sql`${projectFiles.filePath} LIKE ${barrel.directory + '/%'}`
            ));
          
          if (dirFiles.length > 0) {
            const exports: string[] = [];
            
            for (const file of dirFiles) {
              const fileName = path.basename(file.filePath, path.extname(file.filePath));
              if (fileName !== 'index' && !fileName.startsWith('.')) {
                // Check if it's a directory with its own index
                const isDirectory = dirFiles.some(f => 
                  f.filePath.startsWith(`${barrel.directory}/${fileName}/`)
                );
                
                if (isDirectory) {
                  exports.push(`export * from './${fileName}';`);
                } else {
                  exports.push(`export * from './${fileName}';`);
                }
              }
            }
            
            if (exports.length > 0) {
              const indexContent = exports.join('\n') + '\n';
              const indexPath = `${barrel.directory}/index.ts`;
              
              // Check if index already exists
              const existingIndex = await db
                .select()
                .from(projectFiles)
                .where(and(
                  eq(projectFiles.projectId, projectId),
                  eq(projectFiles.filePath, indexPath)
                ))
                .limit(1);
              
              if (existingIndex[0]) {
                await db
                  .update(projectFiles)
                  .set({ 
                    content: indexContent,
                    updatedAt: new Date()
                  })
                  .where(eq(projectFiles.id, existingIndex[0].id));
              } else {
                await db.insert(projectFiles).values({
                  projectId,
                  fileName: 'index.ts',
                  filePath: indexPath,
                  content: indexContent,
                  language: 'typescript'
                });
              }
              
              result.filesModified++;
            }
          }
        } else {
          result.filesModified++;
        }
      }

    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Analyze and optimize dependencies
   */
  async analyzeDependencies(projectId: string): Promise<DependencyAnalysis> {
    const analysis: DependencyAnalysis = {
      unused: [],
      duplicates: new Map(),
      outdated: new Map(),
      devDepsInProd: [],
      missingTypes: []
    };

    try {
      // Get package.json
      const packageFile = await db
        .select()
        .from(projectFiles)
        .where(and(
          eq(projectFiles.projectId, projectId),
          eq(projectFiles.fileName, 'package.json')
        ))
        .limit(1);

      if (!packageFile[0] || !packageFile[0].content) {
        return analysis;
      }

      const packageJson = JSON.parse(packageFile[0].content);
      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};
      const allDeps = { ...dependencies, ...devDependencies };

      // Get all project files
      const files = await db
        .select()
        .from(projectFiles)
        .where(eq(projectFiles.projectId, projectId));

      // Check for unused dependencies
      for (const [dep, version] of Object.entries(allDeps)) {
        const depName = dep as string;
        
        // Skip common build tools and frameworks
        if (depName.startsWith('@types/') || 
            depName.includes('eslint') || 
            depName.includes('prettier') ||
            depName.includes('vite') ||
            depName.includes('webpack') ||
            depName.includes('babel') ||
            depName === 'typescript') {
          continue;
        }

        // Check if dependency is imported anywhere
        const isUsed = files.some(file => {
          if (!file.content) return false;
          return file.content.includes(`from '${depName}'`) ||
                 file.content.includes(`from "${depName}"`) ||
                 file.content.includes(`require('${depName}')`) ||
                 file.content.includes(`require("${depName}")`);
        });

        if (!isUsed) {
          analysis.unused.push(depName);
        }
      }

      // Check for duplicates with different versions
      const versionMap = new Map<string, string[]>();
      for (const [dep, version] of Object.entries(allDeps)) {
        const basePackage = dep.replace(/@[^/]+$/, ''); // Remove version suffix
        if (!versionMap.has(basePackage)) {
          versionMap.set(basePackage, []);
        }
        versionMap.get(basePackage)?.push(`${dep}@${version}`);
      }

      for (const [base, versions] of versionMap) {
        if (versions.length > 1) {
          analysis.duplicates.set(base, versions);
        }
      }

      // Check for dev dependencies used in production code
      for (const [dep] of Object.entries(devDependencies)) {
        const isUsedInProd = files.some(file => {
          if (!file.content) return false;
          // Skip test files
          if (file.filePath.includes('.test.') || 
              file.filePath.includes('.spec.') ||
              file.filePath.includes('__tests__')) {
            return false;
          }
          return file.content.includes(`from '${dep}'`) ||
                 file.content.includes(`from "${dep}"`) ||
                 file.content.includes(`require('${dep}')`) ||
                 file.content.includes(`require("${dep}")`);
        });

        if (isUsedInProd) {
          analysis.devDepsInProd.push(dep);
        }
      }

      // Check for missing type definitions
      for (const dep of Object.keys(dependencies)) {
        if (!dep.startsWith('@types/')) {
          const typePackage = `@types/${dep.replace('/', '__')}`;
          if (!allDeps[typePackage] && !dep.includes('typescript')) {
            analysis.missingTypes.push(dep);
          }
        }
      }

    } catch (error) {
      console.error('Error analyzing dependencies:', error);
    }

    return analysis;
  }

  /**
   * Optimize dependencies
   */
  async optimizeDependencies(
    projectId: string,
    analysis: DependencyAnalysis,
    dryRun: boolean = false
  ): Promise<{
    removed: string[];
    updated: string[];
    added: string[];
  }> {
    const result = {
      removed: [] as string[],
      updated: [] as string[],
      added: [] as string[]
    };

    try {
      if (dryRun) {
        // Just return what would be done
        result.removed = analysis.unused;
        result.updated = Array.from(analysis.duplicates.keys());
        result.added = analysis.missingTypes.map(d => `@types/${d}`);
        return result;
      }

      // Get package.json
      const packageFile = await db
        .select()
        .from(projectFiles)
        .where(and(
          eq(projectFiles.projectId, projectId),
          eq(projectFiles.fileName, 'package.json')
        ))
        .limit(1);

      if (!packageFile[0] || !packageFile[0].content) {
        return result;
      }

      let packageJson = JSON.parse(packageFile[0].content);

      // Remove unused dependencies
      for (const dep of analysis.unused) {
        if (packageJson.dependencies?.[dep]) {
          delete packageJson.dependencies[dep];
          result.removed.push(dep);
        }
        if (packageJson.devDependencies?.[dep]) {
          delete packageJson.devDependencies[dep];
          result.removed.push(dep);
        }
      }

      // Move dev deps to prod if needed
      for (const dep of analysis.devDepsInProd) {
        if (packageJson.devDependencies?.[dep]) {
          packageJson.dependencies = packageJson.dependencies || {};
          packageJson.dependencies[dep] = packageJson.devDependencies[dep];
          delete packageJson.devDependencies[dep];
          result.updated.push(dep);
        }
      }

      // Update package.json
      await db
        .update(projectFiles)
        .set({
          content: JSON.stringify(packageJson, null, 2),
          updatedAt: new Date()
        })
        .where(eq(projectFiles.id, packageFile[0].id));

    } catch (error) {
      console.error('Error optimizing dependencies:', error);
    }

    return result;
  }

  /**
   * Run normalization process
   */
  async normalize(
    projectId: string,
    userId?: string,
    options: {
      dryRun?: boolean;
      skipDependencies?: boolean;
      createPR?: boolean;
    } = {}
  ): Promise<string> {
    const { dryRun = true, skipDependencies = false, createPR = false } = options;

    // Create normalization run record
    const [normalizationRun] = await db.insert(normalizationRuns).values({
      projectId,
      userId,
      status: 'analyzing',
      phase: 'analyze',
      isDryRun: dryRun,
      startedAt: new Date()
    }).returning();

    try {
      // Step 1: Detect project type
      await this.updateRunStatus(normalizationRun.id, 'analyzing', 'analyze', 10);
      const detection = await this.detectProjectType(projectId);
      
      // Step 2: Analyze compliance
      const complianceBefore = await this.analyzeCompliance(projectId, detection.type);

      // Step 3: Generate normalization plan
      await this.updateRunStatus(normalizationRun.id, 'planning', 'plan', 25);
      const { plan, estimatedChanges, rulesApplied } = await this.generatePlan(projectId);

      // Step 4: Apply transformations
      await this.updateRunStatus(normalizationRun.id, 'applying', 'apply', 50);
      const transformResult = await this.applyTransformations(projectId, plan, dryRun);

      // Step 5: Optimize dependencies
      let depResult = null;
      if (!skipDependencies) {
        await this.updateRunStatus(normalizationRun.id, 'applying', 'optimize', 75);
        const depAnalysis = await this.analyzeDependencies(projectId);
        depResult = await this.optimizeDependencies(projectId, depAnalysis, dryRun);
      }

      // Step 6: Re-analyze compliance
      await this.updateRunStatus(normalizationRun.id, 'applying', 'validate', 90);
      const complianceAfter = await this.analyzeCompliance(projectId, detection.type);

      // Generate summary
      const summary = this.generateSummary({
        detection,
        plan,
        transformResult,
        depResult,
        complianceBefore,
        complianceAfter
      });

      // Update normalization run with results
      await db.update(normalizationRuns)
        .set({
          status: 'completed',
          phase: 'validate',
          progress: 100,
          detectedType: detection.type,
          detectedFrameworks: detection.frameworks,
          detectedStructure: detection.structure,
          normalizationPlan: plan,
          rulesApplied,
          estimatedChanges,
          summary,
          filesModified: transformResult.filesModified,
          filesMoved: transformResult.filesMoved,
          filesDeleted: transformResult.filesDeleted,
          importsUpdated: transformResult.importsUpdated,
          complianceBefore,
          complianceAfter,
          dependenciesRemoved: depResult?.removed,
          dependenciesUpdated: depResult?.updated,
          completedAt: new Date(),
          duration: Math.floor((Date.now() - normalizationRun.createdAt.getTime()) / 1000)
        })
        .where(eq(normalizationRuns.id, normalizationRun.id));

      // Update project record
      if (!dryRun) {
        await db.update(projects)
          .set({
            lastNormalizationRun: normalizationRun.id,
            structureCompliance: complianceAfter,
            updatedAt: new Date()
          })
          .where(eq(projects.id, projectId));
      }

      return normalizationRun.id;

    } catch (error: any) {
      // Update run with error
      await db.update(normalizationRuns)
        .set({
          status: 'failed',
          error: error.message,
          errorDetails: { stack: error.stack },
          completedAt: new Date()
        })
        .where(eq(normalizationRuns.id, normalizationRun.id));
      
      throw error;
    }
  }

  /**
   * Get normalization run status
   */
  async getRunStatus(runId: string): Promise<NormalizationRun | null> {
    const [run] = await db
      .select()
      .from(normalizationRuns)
      .where(eq(normalizationRuns.id, runId))
      .limit(1);
    
    return run || null;
  }

  /**
   * Update run status
   */
  private async updateRunStatus(
    runId: string, 
    status: string, 
    phase: string, 
    progress: number
  ): Promise<void> {
    await db.update(normalizationRuns)
      .set({
        status,
        phase,
        progress,
        updatedAt: new Date()
      })
      .where(eq(normalizationRuns.id, runId));
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(data: any): string {
    const lines: string[] = [
      `## Normalization Summary`,
      '',
      `**Project Type:** ${data.detection.type}`,
      `**Compliance:** ${data.complianceBefore}% → ${data.complianceAfter}%`,
      '',
      `### Changes Applied`,
      `- Files moved: ${data.transformResult.filesMoved}`,
      `- Files modified: ${data.transformResult.filesModified}`,
      `- Imports updated: ${data.transformResult.importsUpdated}`,
      ''
    ];

    if (data.depResult) {
      lines.push(
        `### Dependency Optimization`,
        `- Dependencies removed: ${data.depResult.removed.length}`,
        `- Dependencies updated: ${data.depResult.updated.length}`,
        ''
      );
    }

    if (data.transformResult.errors.length > 0) {
      lines.push(
        `### Errors`,
        ...data.transformResult.errors.map(e => `- ${e}`),
        ''
      );
    }

    if (data.transformResult.warnings.length > 0) {
      lines.push(
        `### Warnings`,
        ...data.transformResult.warnings.map(w => `- ${w}`),
        ''
      );
    }

    return lines.join('\n');
  }
}

// Utility function to escape regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Export singleton instance
export const normalizationService = new NormalizationService();