# CodeMate Studio V2

🚀 **AI-powered no/low-code platform** that transforms natural language prompts into production-ready applications.

Unlike visual-only builders, CodeMate generates **real, scalable code** (TypeScript + React + Tailwind) while letting you **choose any backend or hosting provider**.

## ✨ Key Features

- 🤖 **AI Engineering Team**: Intelligent orchestration with Plan → Execute → Score → Decide workflow
- 🎨 **Real Code Generation**: TypeScript + React + Tailwind, not proprietary formats
- 🔌 **Provider Flexibility**: Connect to Supabase, Firebase, AWS, or any custom backend
- 🚀 **Deploy Anywhere**: Vercel, Netlify, AWS, Cloudflare, or custom hosting
- ✅ **Quality First**: Built-in validation for accessibility, performance, security, and tests
- 🎯 **Smart Model Routing**: Automatically selects the best AI model for each task

## 📚 Documentation

### Core Docs
- **[Vision](./docs/vision.md)** - CodeMate Studio philosophy and comparison with other builders
- **[Model Routing](./docs/model-routing.md)** - Intelligent AI model selection system
- **[Getting Started](./docs/getting-started.md)** - Setup, deployment, and usage guide

### Additional Docs
- **[Design Tokens](./docs/DESIGN_TOKENS.md)** - How CodeMate consumes shared design tokens from HubMate Studio

## 🚀 Quick Start

### Installation
```bash
git clone https://github.com/themateplatform/CodeMate_Studio_V2.git
cd CodeMate_Studio_V2
npm install
```

### Setup Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Initialize Database
```bash
npm run db:push
```

### Start Development Server
```bash
npm run dev
```

Visit `http://localhost:5000` to start building!

## 🎯 Generate Your First App

### Using Web Interface
1. Navigate to App Builder
2. Enter a prompt: "Create a blog with posts, dark mode, and contact form"
3. Watch the AI orchestration workflow
4. Review and deploy your generated app

### Using API
```typescript
import { runAutomation } from '@/codemate';

const result = await runAutomation(
  'Create a blog with posts and dark mode',
  './output',
  {
    qualityThreshold: 70,
    enableAccessibility: true,
    autoApprove: false,
  }
);
```

See [Getting Started Guide](./docs/getting-started.md) for detailed instructions.

## 🏗️ Architecture

### CodeMate Core Modules
- **Planner** (`src/codemate/planner.ts`) - Repository audit & architecture planning
- **Executor** (`src/codemate/executor.ts`) - Code scaffolding & implementation
- **Scorer** (`src/codemate/scorer.ts`) - Quality validation (tests, accessibility, security)
- **Decider** (`src/codemate/decider.ts`) - State machine controller
- **Model Router** (`src/codemate/modelRouter.ts`) - Intelligent AI model selection
- **Orchestrator** (`src/codemate/orchestrator.ts`) - Main automation workflow

### Backend & Hosting Connectors
- **Backend Connectors** - Supabase, Firebase, AWS, Custom APIs
- **Hosting Connectors** - Vercel, Netlify, AWS, Cloudflare, Custom

### Design System
- **Design Tokens** (`src/styles/tokens.ts`) - Centralized design system
- No raw hex values - all styling uses tokens

## 🧪 Development

### Run Tests
```bash
npm test              # Unit tests with Vitest
npm run test:e2e      # E2E tests with Playwright
npm run test:coverage # Coverage report
```

### Type Checking
```bash
npm run check
```

### Build for Production
```bash
npm run build
npm start
```

## 📦 Tech Stack

### Generated Applications
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Vite + Vitest + Playwright
- Wouter (routing) + TanStack Query (state)

### CodeMate Platform
- Express.js + PostgreSQL + Drizzle ORM
- Session-based Auth + WebSocket + Yjs
- OpenAI, Anthropic, Google, xAI APIs
