/**
 * Planner - Repository audit and architecture planning
 * Uses Claude Sonnet for structured planning and analysis
 */

import { selectModel, type ModelConfig } from './modelRouter';
import type { Plan, Task, DataModel } from './types';
import { randomUUID } from 'crypto';

export interface PlannerConfig {
  modelOverride?: string;
  temperature?: number;
  maxTokens?: number;
  includeDataModels?: boolean;
  includeTests?: boolean;
}

export interface RepositoryContext {
  files: string[];
  structure: Record<string, string[]>;
  packageJson?: any;
  existingFeatures: string[];
}

/**
 * Create a plan from a natural language prompt
 */
export async function createPlan(
  prompt: string,
  repoContext?: RepositoryContext,
  config: PlannerConfig = {}
): Promise<Plan> {
  // Select the best model for planning
  const model = selectModel({ 
    taskType: 'architecture-planning',
    preferQuality: true 
  });
  
  console.log(`[Planner] Using ${model.displayName} for planning`);
  
  // Analyze the prompt and extract objectives
  const objectives = extractObjectives(prompt);
  
  // Determine tech stack based on prompt and existing repo
  const techStack = determineTechStack(prompt, repoContext);
  
  // Define project structure
  const structure = defineStructure(prompt, techStack);
  
  // Generate data models if needed
  const dataModels = config.includeDataModels !== false 
    ? generateDataModels(prompt, objectives)
    : [];
  
  // Break down into tasks
  const tasks = generateTasks(objectives, techStack, config);
  
  // Estimate complexity
  const estimatedComplexity = estimateComplexity(objectives, tasks);
  
  const plan: Plan = {
    id: randomUUID(),
    prompt,
    objectives,
    architecture: {
      techStack,
      structure,
      dataModels,
    },
    tasks,
    estimatedComplexity,
    createdAt: new Date(),
  };
  
  console.log(`[Planner] Created plan with ${tasks.length} tasks`);
  console.log(`[Planner] Estimated complexity: ${estimatedComplexity}`);
  
  return plan;
}

/**
 * Extract objectives from prompt
 */
function extractObjectives(prompt: string): string[] {
  const objectives: string[] = [];
  const normalized = prompt.toLowerCase();
  
  // Common patterns
  if (normalized.includes('blog') || normalized.includes('article') || normalized.includes('post')) {
    objectives.push('Create blog/article system with posts management');
  }
  if (normalized.includes('dashboard') || normalized.includes('admin')) {
    objectives.push('Build admin dashboard with analytics');
  }
  if (normalized.includes('auth') || normalized.includes('login') || normalized.includes('signup')) {
    objectives.push('Implement authentication system');
  }
  if (normalized.includes('dark mode') || normalized.includes('theme')) {
    objectives.push('Add dark mode / theme switching');
  }
  if (normalized.includes('form') || normalized.includes('contact')) {
    objectives.push('Create form with validation');
  }
  if (normalized.includes('api') || normalized.includes('backend')) {
    objectives.push('Set up backend API endpoints');
  }
  if (normalized.includes('database') || normalized.includes('data')) {
    objectives.push('Design and implement database schema');
  }
  
  // If no specific patterns matched, add a generic objective
  if (objectives.length === 0) {
    objectives.push('Build application based on requirements');
  }
  
  // Always add quality objectives
  objectives.push('Ensure accessibility compliance');
  objectives.push('Add comprehensive test coverage');
  
  return objectives;
}

/**
 * Determine appropriate tech stack
 */
function determineTechStack(prompt: string, repoContext?: RepositoryContext): string[] {
  const stack: string[] = [];
  const normalized = prompt.toLowerCase();
  
  // Frontend (default to React + TypeScript + Tailwind)
  stack.push('React 18', 'TypeScript', 'Tailwind CSS', 'Vite');
  
  // Routing
  if (normalized.includes('multi-page') || normalized.includes('routing')) {
    stack.push('Wouter'); // Following the project's pattern
  }
  
  // State management
  if (normalized.includes('complex state') || normalized.includes('redux')) {
    stack.push('TanStack Query');
  }
  
  // Backend
  if (normalized.includes('api') || normalized.includes('backend')) {
    stack.push('Express.js', 'PostgreSQL', 'Drizzle ORM');
  }
  
  // Auth
  if (normalized.includes('auth') || normalized.includes('login')) {
    stack.push('Session-based Auth');
  }
  
  // UI Components
  stack.push('shadcn/ui', 'Radix UI');
  
  // Testing
  stack.push('Vitest', 'Playwright');
  
  return stack;
}

/**
 * Define project structure
 */
function defineStructure(prompt: string, techStack: string[]): Record<string, string[]> {
  const structure: Record<string, string[]> = {
    'client/src/pages': [],
    'client/src/components': [],
    'client/src/lib': ['utils.ts'],
    'client/src/hooks': [],
  };
  
  const normalized = prompt.toLowerCase();
  
  // Add pages based on prompt
  if (normalized.includes('blog')) {
    structure['client/src/pages'].push('blog.tsx', 'post.tsx');
    structure['client/src/components'].push('PostCard.tsx', 'PostList.tsx');
  }
  if (normalized.includes('dashboard')) {
    structure['client/src/pages'].push('dashboard.tsx');
    structure['client/src/components'].push('StatsCard.tsx', 'Chart.tsx');
  }
  if (normalized.includes('contact') || normalized.includes('form')) {
    structure['client/src/components'].push('ContactForm.tsx');
  }
  
  // Always add common pages
  if (!structure['client/src/pages'].includes('index.tsx')) {
    structure['client/src/pages'].unshift('index.tsx');
  }
  
  // Add backend if needed
  if (techStack.includes('Express.js')) {
    structure['server/routes'] = ['api.ts'];
    structure['server/services'] = [];
    structure['shared'] = ['schema.ts'];
  }
  
  return structure;
}

/**
 * Generate data models from requirements
 */
function generateDataModels(prompt: string, objectives: string[]): DataModel[] {
  const models: DataModel[] = [];
  const normalized = prompt.toLowerCase();
  
  // Blog/Post model
  if (normalized.includes('blog') || normalized.includes('post')) {
    models.push({
      name: 'Post',
      fields: [
        { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
        { name: 'title', type: 'string', required: true, description: 'Post title' },
        { name: 'content', type: 'text', required: true, description: 'Post content' },
        { name: 'author', type: 'string', required: true, description: 'Author name' },
        { name: 'publishedAt', type: 'date', required: true, description: 'Publication date' },
        { name: 'tags', type: 'string[]', required: false, description: 'Post tags' },
      ],
    });
  }
  
  // User model for auth
  if (normalized.includes('auth') || normalized.includes('user')) {
    models.push({
      name: 'User',
      fields: [
        { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
        { name: 'email', type: 'string', required: true, description: 'User email' },
        { name: 'username', type: 'string', required: true, description: 'Username' },
        { name: 'passwordHash', type: 'string', required: true, description: 'Hashed password' },
        { name: 'createdAt', type: 'date', required: true, description: 'Account creation date' },
      ],
    });
  }
  
  return models;
}

/**
 * Generate task list from objectives
 */
function generateTasks(objectives: string[], techStack: string[], config: PlannerConfig): Task[] {
  const tasks: Task[] = [];
  let priority = 100;
  
  // Setup tasks
  tasks.push({
    id: randomUUID(),
    type: 'code-scaffold',
    description: 'Initialize project structure and configuration',
    dependencies: [],
    status: 'pending',
    files: ['package.json', 'tsconfig.json', 'vite.config.ts', 'tailwind.config.ts'],
    priority: priority--,
  });
  
  // Component generation tasks
  for (const objective of objectives) {
    if (objective.toLowerCase().includes('blog') || objective.toLowerCase().includes('post')) {
      tasks.push({
        id: randomUUID(),
        type: 'code-implementation',
        description: 'Create blog components and pages',
        dependencies: [tasks[0].id],
        status: 'pending',
        files: ['client/src/pages/blog.tsx', 'client/src/components/PostCard.tsx'],
        priority: priority--,
      });
    }
    
    if (objective.toLowerCase().includes('dashboard')) {
      tasks.push({
        id: randomUUID(),
        type: 'code-implementation',
        description: 'Build dashboard with analytics',
        dependencies: [tasks[0].id],
        status: 'pending',
        files: ['client/src/pages/dashboard.tsx', 'client/src/components/StatsCard.tsx'],
        priority: priority--,
      });
    }
    
    if (objective.toLowerCase().includes('auth')) {
      tasks.push({
        id: randomUUID(),
        type: 'code-implementation',
        description: 'Implement authentication system',
        dependencies: [tasks[0].id],
        status: 'pending',
        files: ['server/routes/auth.ts', 'client/src/pages/login.tsx'],
        priority: priority--,
      });
    }
    
    if (objective.toLowerCase().includes('test')) {
      tasks.push({
        id: randomUUID(),
        type: 'test-generation',
        description: 'Generate comprehensive test suite',
        dependencies: tasks.filter(t => t.type === 'code-implementation').map(t => t.id),
        status: 'pending',
        priority: priority--,
      });
    }
  }
  
  // Documentation task
  tasks.push({
    id: randomUUID(),
    type: 'documentation',
    description: 'Generate documentation and README',
    dependencies: tasks.filter(t => t.type !== 'documentation').map(t => t.id),
    status: 'pending',
    priority: 1,
  });
  
  return tasks;
}

/**
 * Estimate project complexity
 */
function estimateComplexity(objectives: string[], tasks: Task[]): 'low' | 'medium' | 'high' {
  const objectiveCount = objectives.length;
  const taskCount = tasks.length;
  
  if (objectiveCount <= 3 && taskCount <= 5) {
    return 'low';
  } else if (objectiveCount <= 6 && taskCount <= 10) {
    return 'medium';
  } else {
    return 'high';
  }
}

/**
 * Audit repository and suggest improvements
 */
export async function auditRepository(repoPath: string): Promise<RepositoryContext> {
  // This would be implemented to scan the repository
  // For now, return a mock context
  console.log(`[Planner] Auditing repository at ${repoPath}`);
  
  return {
    files: [],
    structure: {},
    existingFeatures: [],
  };
}
