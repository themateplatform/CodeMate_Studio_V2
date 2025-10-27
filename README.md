# BuildMate Studio

AI-powered low/no-code builder that generates production-ready TypeScript + React applications from specifications.

## What Makes BuildMate Different

**Not a Code Analyzer** - that's CodeMate (an agent in MateHub Studio)

**BuildMate is a Builder:**
- 🎯 Spec-to-code generation (natural language or structured specs)
- 🎨 Design-intelligent (automatically uses DesignMate Studio tokens)
- ✏️ Monaco-based code editor with real-time collaboration
- 🚀 Production-ready output (not prototypes)
- 🔗 Direct GitHub integration (commits, PRs, deployment)

## How It Works

### 1. Describe What You Want

Use natural language or structured specs:
```
"Build a dashboard for Employse with:
- Employee list with search
- Shift calendar view
- Real-time notifications
- Uses Employse design tokens"
```

### 2. BuildMate Generates Code

- Fetches design tokens from DesignMate Studio
- Generates TypeScript + React + Tailwind
- Creates proper component structure
- Implements business logic
- Adds error handling

### 3. Edit & Refine

- Monaco editor with syntax highlighting
- AI-assisted editing
- Real-time preview
- Multi-user collaboration (via Yjs)

### 4. Deploy

- Direct commit to GitHub
- Create PR with description
- Deploy to Vercel/Replit/Lovable
- CI/CD integration

## Design Intelligence

BuildMate automatically integrates with DesignMate Studio:

**Before code generation:**
- Queries DesignMate for target app's design tokens
- Uses token references (not hardcoded values)
- Ensures design system compliance

**Example:**

Instead of:
```tsx
<button className="bg-blue-500 text-white rounded-lg">
  Click Me
</button>
```

BuildMate generates:
```tsx
<button className="bg-[var(--employse-primary)] text-[var(--employse-on-primary)] rounded-[var(--radius-md)]">
  Click Me
</button>
```

**Result:** Consistent styling across all generated apps.

## Architecture

```
BuildMate Studio = Spec Editor + AI Generation + Monaco IDE + Deployment

Integrates with:
  ├── DesignMate Studio (design tokens)
  ├── GitHub (version control)
  └── MateHub Studio (orchestration)
```

## Tech Stack

- **Frontend**: React 18.3 + Vite
- **Editor**: Monaco Editor + Yjs (collaboration)
- **Database**: Neon DB + Supabase
- **AI**: OpenRouter (Claude, GPT-4, Gemini)
- **Deployment**: Replit, Vercel, Lovable

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

```bash
# BuildMate Studio
VITE_APP_NAME=BuildMate Studio
VITE_APP_URL=https://buildmate-studio.com

# DesignMate Integration
VITE_DESIGNMATE_API_URL=https://designmate-studio-api.com

# Database
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=

# AI Models
OPENROUTER_API_KEY=

# GitHub Integration
GITHUB_TOKEN=

# Deployment
VERCEL_TOKEN=
REPLIT_TOKEN=
```

## Project Structure

```
buildmate-studio/
├── src/
│   ├── components/
│   │   ├── SpecEditor.tsx      # Spec input interface
│   │   ├── CodeEditor.tsx      # Monaco editor
│   │   └── PreviewPane.tsx     # Live preview
│   ├── services/
│   │   ├── codeGenerator.ts    # AI code generation
│   │   ├── designmateClient.ts # Design token fetching
│   │   └── githubClient.ts     # GitHub integration
│   └── pages/
│       ├── Projects.tsx        # Project list
│       └── Builder.tsx         # Main builder interface
├── docs/
│   ├── SPEC_FORMAT.md         # Spec documentation
│   └── DEPLOYMENT.md          # Deployment guide
└── examples/
    ├── dashboard-spec.yaml    # Example specs
    └── landing-page-spec.yaml
```

## Use Cases

### 1. Rapid Prototyping
Generate working prototypes in minutes instead of hours.

### 2. Design System Compliance
Automatically uses approved design tokens - no manual styling needed.

### 3. Multi-App Consistency
Build multiple apps with guaranteed visual consistency.

### 4. Developer Productivity
Let AI handle boilerplate while you focus on business logic.

## Example Specs

### Dashboard Spec
```yaml
name: Employse Dashboard
type: dashboard
features:
  - employee_list
  - shift_calendar
  - notifications
design_system: employse
framework: react
database: supabase
```

### Landing Page Spec
```yaml
name: Hottr Landing Page
type: landing_page
sections:
  - hero
  - features
  - pricing
  - cta
design_system: hottr
animations: true
responsive: mobile-first
```

## Documentation

- [Spec Format](./docs/SPEC_FORMAT.md) - How to write specs
- [Design Integration](./docs/DESIGN_INTEGRATION.md) - DesignMate connection
- [Deployment](./docs/DEPLOYMENT.md) - Deploy generated apps
- [API Reference](./docs/API.md) - BuildMate API

## Comparison

| Feature | BuildMate Studio | CodeMate Agent |
|---------|-----------------|----------------|
| **Purpose** | Build new apps | Analyze existing code |
| **Input** | Specs/requirements | Code repositories |
| **Output** | Generated code | Analysis/fixes |
| **Location** | Separate app | Agent in MateHub Studio |
| **Use Case** | Create from scratch | Understand/improve existing |

## Related Projects

- **MateHub Studio** - Business operations HQ (orchestration)
- **DesignMate Studio** - Design system authority (provides tokens)
- **Mate** - Personal AI companion (can orchestrate BuildMate)

## Roadmap

**Current (v1.0):**
- ✅ Spec-to-code generation
- ✅ Monaco editor
- ✅ GitHub integration
- 🔶 DesignMate integration (in progress)

**Next (v1.1):**
- Real-time collaboration (Yjs)
- Template library
- One-click deployment
- Advanced AI models

**Future (v2.0):**
- Visual spec builder (drag & drop)
- Multi-framework support (Vue, Svelte)
- Testing framework generation
- API generation

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines.

---

**Built by The Mate Platform Team**
