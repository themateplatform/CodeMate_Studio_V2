# Getting Started with BuildMate Studio

## Prerequisites

### Required
- Node.js 18+ or 20+
- npm, yarn, or pnpm
- Git
- A text editor (VS Code recommended)

### Optional
- Docker (for local database)
- PostgreSQL (if not using Docker)
- API keys for AI providers (OpenAI, Anthropic, etc.)

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/buildmate-studio.git
cd buildmate-studio
```

### 2. Install Dependencies
```bash
# Using npm
npm install

# Using pnpm (recommended)
pnpm install

# Using yarn
yarn install
```

### 3. Set Up Environment Variables
Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` and add your configuration:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/buildmate

# Session Secret
SESSION_SECRET=your-secret-key-here

# AI Provider API Keys (optional for basic features)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
XAI_API_KEY=...

# Supabase (optional)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 4. Initialize Database
```bash
npm run db:push
```

### 5. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:5000` to see BuildMate Studio in action!

## Quick Start: Generate Your First App

### Using the Web Interface

1. **Navigate to App Builder**
   - Click "App Builder" in the navigation
   - Or visit `http://localhost:5000/app-builder`

2. **Enter Your Prompt**
   ```
   Create a blog with posts, dark mode, and a contact form
   ```

3. **Configure Options** (optional)
   - Select backend provider (Supabase, Firebase, AWS, etc.)
   - Choose hosting provider (Vercel, Netlify, etc.)
   - Adjust quality thresholds

4. **Generate**
   - Click "Generate App"
   - Watch the automation workflow:
     - Planning (analyzing requirements)
     - Executing (generating code)
     - Scoring (validating quality)
     - Deciding (determining next steps)

5. **Review Results**
   - View generated files
   - Check quality score report
   - Download or deploy

### Using the API

```typescript
import { runAutomation } from '@/buildmate';

const result = await runAutomation(
  'Create a blog with posts, dark mode, and a contact form',
  './output',
  {
    maxRetries: 3,
    qualityThreshold: 70,
    enableAccessibility: true,
    enablePerformance: true,
    enableSecurity: true,
    autoApprove: false,
  }
);

console.log('Generation complete!');
console.log('Overall score:', result.scores[0].overall);
console.log('Files generated:', result.executionResults[0].filesGenerated.length);
```

### Using the CLI (Future)
```bash
# Generate app from prompt
buildmate generate "Create a blog app" --output ./my-blog

# With options
buildmate generate "Dashboard with analytics" \
  --output ./dashboard \
  --backend supabase \
  --hosting vercel \
  --auto-approve
```

## Understanding the Workflow

### 1. Planning Phase
**What happens**: Analyzes your prompt and creates a structured plan

**Output**:
- List of objectives
- Technology stack
- Project structure
- Data models
- Task breakdown

**Model used**: Claude Sonnet 4.5 (best for planning)

**Duration**: 10-30 seconds

### 2. Execution Phase
**What happens**: Generates code based on the plan

**Output**:
- Project configuration files
- React components
- Pages and routing
- Styling and design tokens
- Tests (if enabled)

**Model used**: GPT-5 Codex (specialized for code)

**Duration**: 30-90 seconds

### 3. Scoring Phase
**What happens**: Validates generated code for quality

**Checks**:
- Test coverage
- Accessibility (WCAG 2.1 AA)
- Performance (bundle size, optimization)
- Security (no secrets, XSS prevention)
- Code quality (TypeScript, component size)

**Model used**: GPT-5 or Claude (validation)

**Duration**: 10-20 seconds

### 4. Deciding Phase
**What happens**: Determines next action based on score

**Decisions**:
- **Continue**: Quality meets thresholds → complete
- **Retry**: Issues found → fix and re-execute
- **Request Input**: Manual review needed
- **Complete**: Success!
- **Fail**: Max retries exceeded

**Duration**: < 1 second

## Working with Generated Code

### Project Structure
```
my-app/
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── vite.config.ts        # Vite config
├── tailwind.config.ts    # Tailwind config
├── index.html            # Entry HTML
├── src/
│   ├── main.tsx         # React entry point
│   ├── App.tsx          # Main app component
│   ├── pages/           # Page components
│   ├── components/      # Reusable components
│   ├── lib/             # Utilities
│   └── styles/          # Design tokens
└── README.md            # Generated documentation
```

### Running Generated App
```bash
cd my-app
npm install
npm run dev
```

### Building for Production
```bash
npm run build
npm run preview
```

### Running Tests
```bash
npm test
```

## Customizing Generation

### Design Tokens
All colors, spacing, and typography are defined in `src/styles/tokens.ts`:

```typescript
import { designTokens } from './styles/tokens';

// Use design tokens in components
<div style={{ 
  color: designTokens.colors.primary[500],
  padding: designTokens.spacing.md 
}}>
```

### Backend Connection
Configure backend in your prompt or through the UI:

```typescript
import { BackendManager } from '@/buildmate';

const manager = new BackendManager();

await manager.connect('supabase', {
  url: process.env.VITE_SUPABASE_URL,
  anonKey: process.env.VITE_SUPABASE_ANON_KEY,
});
```

### Hosting Deployment
Deploy through the UI or programmatically:

```typescript
import { HostingManager } from '@/buildmate';

const manager = new HostingManager();

const deployment = await manager.deploy('vercel', './dist', {
  projectName: 'my-blog',
  token: process.env.VERCEL_TOKEN,
});

console.log('Deployed to:', deployment.url);
```

## Advanced Features

### Custom Model Selection
Override model selection for specific tasks:

```typescript
import { executeTask } from '@/buildmate';

const result = await executeTask(task, {
  modelOverride: 'gpt-5-codex',
  temperature: 0.2,
  useDesignTokens: true,
});
```

### Quality Thresholds
Adjust quality requirements:

```typescript
const config = {
  qualityThreshold: 85,  // Overall score threshold
  thresholds: {
    testsCoverage: 80,
    accessibility: 90,
    performance: 80,
    security: 95,
    codeQuality: 75,
  },
};
```

### Automation Configuration
Control automation behavior:

```typescript
const config = {
  maxRetries: 5,           // Max retry attempts
  autoApprove: false,      // Wait for user approval
  verbose: true,           // Detailed logging
  enableAccessibility: true,
  enablePerformance: true,
  enableSecurity: true,
};
```

## Troubleshooting

### Common Issues

**Problem**: "Model not found" error
**Solution**: Check API keys in `.env` file

**Problem**: Generation fails with "Max retries exceeded"
**Solution**: Lower quality thresholds or fix specific issues manually

**Problem**: Slow generation
**Solution**: 
- Check internet connection
- Use `preferSpeed: true` in model selection
- Consider simpler prompts

**Problem**: TypeScript errors in generated code
**Solution**: Run `npm run check` to see errors, usually auto-fixed in retry

### Debug Mode
Enable verbose logging:

```typescript
const orchestrator = new AutomationOrchestrator(
  prompt,
  outputDir,
  { verbose: true }
);

// Check history
const history = orchestrator.getHistory();
console.log(history);
```

### Getting Help
- Check [Issues](https://github.com/yourusername/buildmate-studio/issues)
- Read [Documentation](./README.md)
- Join [Discord Community](#)
- Contact support@buildmate.studio

## Best Practices

### 1. Clear, Specific Prompts
**Good**: "Create a blog with posts list, individual post pages, dark mode toggle, and contact form with validation"

**Not ideal**: "Make a website"

### 2. Iterative Development
- Start with MVP features
- Generate and test
- Add more features incrementally

### 3. Review Generated Code
- Always review security-critical code
- Customize styling and branding
- Add business logic specific to your needs

### 4. Use Version Control
```bash
cd my-app
git init
git add .
git commit -m "Initial BuildMate generation"
```

### 5. Test Thoroughly
- Run generated tests
- Add custom test cases
- Test accessibility with screen readers
- Test on multiple devices/browsers

## Next Steps

### Learning Resources
- [Vision Document](./vision.md) - Understand BuildMate philosophy
- [Model Routing](./model-routing.md) - Learn about AI model selection
- [API Reference](#) - Detailed API documentation
- [Examples](#) - Sample applications

### Tutorials
- Building a Blog
- Creating a Dashboard
- E-commerce Store
- SaaS Application

### Community
- Share your generated apps
- Contribute improvements
- Report bugs and suggestions
- Help other users

## Support

### Documentation
- [Vision](./vision.md)
- [Model Routing](./model-routing.md)
- [API Reference](#)

### Community
- GitHub Discussions
- Discord Server
- Twitter @BuildMateStudio

### Commercial Support
- Priority support
- Custom model training
- Enterprise features
- SLA guarantees

Contact: enterprise@buildmate.studio

---

**Ready to build?** Start with a simple prompt and watch BuildMate transform it into a production-ready application!
