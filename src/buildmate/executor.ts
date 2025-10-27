/**
 * Executor - Code scaffolding and implementation
 * Uses GPT-5 Codex for code generation
 */

import { selectModel } from './modelRouter';
import type { Task, ExecutionResult, GeneratedFile, ExecutionError } from './types';
import { designTokens } from '../styles/tokens';

export interface ExecutorConfig {
  modelOverride?: string;
  temperature?: number;
  maxTokens?: number;
  useDesignTokens?: boolean;
  validateOutput?: boolean;
}

/**
 * Execute a task and generate code
 */
export async function executeTask(
  task: Task,
  config: ExecutorConfig = {}
): Promise<ExecutionResult> {
  const startTime = Date.now();
  
  // Select model for code generation
  const model = selectModel({
    taskType: task.type,
    preferQuality: !task.description.toLowerCase().includes('quick'),
  });
  
  console.log(`[Executor] Executing task: ${task.description}`);
  console.log(`[Executor] Using ${model.displayName}`);
  
  const filesGenerated: GeneratedFile[] = [];
  const errors: ExecutionError[] = [];
  const warnings: string[] = [];
  
  try {
    // Generate files based on task type
    switch (task.type) {
      case 'code-scaffold':
        filesGenerated.push(...await scaffoldProject(task, config));
        break;
      case 'code-implementation':
        filesGenerated.push(...await implementFeature(task, config));
        break;
      case 'code-refactor':
        filesGenerated.push(...await refactorCode(task, config));
        break;
      case 'test-generation':
        filesGenerated.push(...await generateTests(task, config));
        break;
      case 'documentation':
        filesGenerated.push(...await generateDocumentation(task, config));
        break;
      default:
        throw new Error(`Unsupported task type: ${task.type}`);
    }
    
    // Validate output if enabled
    if (config.validateOutput !== false) {
      const validationErrors = validateGeneratedFiles(filesGenerated, config);
      errors.push(...validationErrors);
    }
    
    const duration = Date.now() - startTime;
    
    return {
      taskId: task.id,
      success: errors.filter(e => e.severity === 'error').length === 0,
      filesGenerated,
      filesModified: task.files || [],
      errors,
      warnings,
      metadata: {
        modelUsed: model.model,
        tokensUsed: estimateTokens(filesGenerated),
        duration,
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      taskId: task.id,
      success: false,
      filesGenerated,
      filesModified: [],
      errors: [{
        type: 'runtime',
        message: error instanceof Error ? error.message : 'Unknown error',
        severity: 'error',
      }],
      warnings,
      metadata: {
        modelUsed: model.model,
        tokensUsed: 0,
        duration,
      },
    };
  }
}

/**
 * Scaffold a new project structure
 */
async function scaffoldProject(task: Task, config: ExecutorConfig): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  
  // Generate package.json
  files.push({
    path: 'package.json',
    content: generatePackageJson(),
    language: 'json',
    size: 0,
  });
  
  // Generate tsconfig.json
  files.push({
    path: 'tsconfig.json',
    content: generateTsConfig(),
    language: 'json',
    size: 0,
  });
  
  // Generate vite.config.ts
  files.push({
    path: 'vite.config.ts',
    content: generateViteConfig(),
    language: 'typescript',
    size: 0,
  });
  
  // Generate tailwind.config.ts
  files.push({
    path: 'tailwind.config.ts',
    content: generateTailwindConfig(),
    language: 'typescript',
    size: 0,
  });
  
  // Generate index.html
  files.push({
    path: 'index.html',
    content: generateIndexHtml(),
    language: 'html',
    size: 0,
  });
  
  // Generate main entry point
  files.push({
    path: 'src/main.tsx',
    content: generateMainTsx(),
    language: 'typescript',
    size: 0,
  });
  
  // Generate App component
  files.push({
    path: 'src/App.tsx',
    content: generateAppTsx(config),
    language: 'typescript',
    size: 0,
  });
  
  // Update file sizes
  files.forEach(file => {
    file.size = Buffer.byteLength(file.content, 'utf8');
  });
  
  return files;
}

/**
 * Implement a feature
 */
async function implementFeature(task: Task, config: ExecutorConfig): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  
  // This would call the actual LLM API to generate feature code
  // For now, generate basic templates
  
  if (task.description.toLowerCase().includes('blog')) {
    files.push({
      path: 'client/src/pages/blog.tsx',
      content: generateBlogPage(config),
      language: 'typescript',
      size: 0,
    });
    
    files.push({
      path: 'client/src/components/PostCard.tsx',
      content: generatePostCard(config),
      language: 'typescript',
      size: 0,
    });
  }
  
  if (task.description.toLowerCase().includes('dashboard')) {
    files.push({
      path: 'client/src/pages/dashboard.tsx',
      content: generateDashboardPage(config),
      language: 'typescript',
      size: 0,
    });
  }
  
  // Update file sizes
  files.forEach(file => {
    file.size = Buffer.byteLength(file.content, 'utf8');
  });
  
  return files;
}

/**
 * Refactor existing code
 */
async function refactorCode(task: Task, config: ExecutorConfig): Promise<GeneratedFile[]> {
  // This would analyze existing code and apply refactoring
  console.log('[Executor] Refactoring code...');
  return [];
}

/**
 * Generate tests
 */
async function generateTests(task: Task, config: ExecutorConfig): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  
  // Generate a sample test file
  files.push({
    path: 'src/App.test.tsx',
    content: generateAppTest(),
    language: 'typescript',
    size: 0,
  });
  
  files.forEach(file => {
    file.size = Buffer.byteLength(file.content, 'utf8');
  });
  
  return files;
}

/**
 * Generate documentation
 */
async function generateDocumentation(task: Task, config: ExecutorConfig): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  
  files.push({
    path: 'README.md',
    content: generateReadme(),
    language: 'markdown',
    size: 0,
  });
  
  files.forEach(file => {
    file.size = Buffer.byteLength(file.content, 'utf8');
  });
  
  return files;
}

/**
 * Validate generated files
 */
function validateGeneratedFiles(files: GeneratedFile[], config: ExecutorConfig): ExecutionError[] {
  const errors: ExecutionError[] = [];
  
  for (const file of files) {
    // Check for raw hex colors if design tokens should be used
    if (config.useDesignTokens !== false && file.language === 'typescript') {
      const hexColorRegex = /#[0-9A-Fa-f]{6}/g;
      const matches = file.content.match(hexColorRegex);
      if (matches && matches.length > 0) {
        errors.push({
          type: 'validation',
          message: `Raw hex color found. Use design tokens from src/styles/tokens.ts`,
          file: file.path,
          severity: 'warning',
        });
      }
    }
    
    // Check component size (should be <= 200 LoC)
    if (file.language === 'typescript' && file.path.includes('component')) {
      const lines = file.content.split('\n').length;
      if (lines > 200) {
        errors.push({
          type: 'validation',
          message: `Component has ${lines} lines. Consider splitting (max 200 LoC)`,
          file: file.path,
          severity: 'warning',
        });
      }
    }
  }
  
  return errors;
}

/**
 * Estimate token usage
 */
function estimateTokens(files: GeneratedFile[]): number {
  const totalChars = files.reduce((sum, file) => sum + file.content.length, 0);
  return Math.ceil(totalChars / 4); // Rough estimate: 1 token ≈ 4 characters
}

// Template generators

function generatePackageJson(): string {
  return JSON.stringify({
    name: 'codemate-generated-app',
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
      test: 'vitest',
    },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      wouter: '^3.3.5',
    },
    devDependencies: {
      '@types/react': '^18.3.11',
      '@types/react-dom': '^18.3.1',
      '@vitejs/plugin-react': '^4.7.0',
      typescript: '^5.6.3',
      vite: '^6.3.6',
      vitest: '^3.2.4',
      tailwindcss: '^3.4.17',
      autoprefixer: '^10.4.20',
      postcss: '^8.4.47',
    },
  }, null, 2);
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
    },
    include: ['src'],
  }, null, 2);
}

function generateViteConfig(): string {
  return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`;
}

function generateTailwindConfig(): string {
  return `import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config
`;
}

function generateIndexHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CodeMate Generated App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function generateMainTsx(): string {
  return `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`;
}

function generateAppTsx(config: ExecutorConfig): string {
  const colors = config.useDesignTokens !== false 
    ? `import { designTokens } from './styles/tokens'` 
    : '';
    
  return `${colors ? colors + '\n\n' : ''}function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">
            CodeMate Generated App
          </h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4">
        <p className="text-gray-600">
          Welcome to your generated application!
        </p>
      </main>
    </div>
  )
}

export default App
`;
}

function generateBlogPage(config: ExecutorConfig): string {
  return `import { PostCard } from '../components/PostCard'

export default function BlogPage() {
  const posts = [
    { id: '1', title: 'First Post', excerpt: 'This is the first post', date: '2024-01-01' },
    { id: '2', title: 'Second Post', excerpt: 'This is the second post', date: '2024-01-02' },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
`;
}

function generatePostCard(config: ExecutorConfig): string {
  return `interface PostCardProps {
  post: {
    id: string
    title: string
    excerpt: string
    date: string
  }
}

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <h2 className="text-2xl font-bold mb-2">{post.title}</h2>
      <p className="text-gray-600 mb-4">{post.excerpt}</p>
      <time className="text-sm text-gray-500">{post.date}</time>
    </article>
  )
}
`;
}

function generateDashboardPage(config: ExecutorConfig): string {
  return `export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-2">Total Users</h3>
          <p className="text-3xl font-bold">1,234</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-2">Revenue</h3>
          <p className="text-3xl font-bold">$12,345</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-2">Active Sessions</h3>
          <p className="text-3xl font-bold">567</p>
        </div>
      </div>
    </div>
  )
}
`;
}

function generateAppTest(): string {
  return `import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText(/CodeMate Generated App/i)).toBeInTheDocument()
  })
})
`;
}

function generateReadme(): string {
  return `# CodeMate Generated Application

This application was generated by CodeMate Studio.

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Building

\`\`\`bash
npm run build
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- Vite
- Vitest

## License

MIT
`;
}
