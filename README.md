# BuildMate Studio

**The AI-powered no-code builder for founders, developers, and agencies** that converts ideas into production-ready web applications in minutes.

BuildMate lets you describe what you want to build, and we generate **real, production-ready code** (TypeScript + React + Tailwind) that you own completely. No vendor lock-in, no proprietary formats—just clean, deployable code.

## ✨ How It Works

1. **Describe Your Vision** (FREE): Tell us about your project—goals, audience, features, branding preferences
2. **Get a Scope Document** (FREE): We research your idea and create a detailed scope of what we'll build
3. **Choose Your Direction** (FREE): Pick from 3 visual mood boards (colors, fonts, vibes—not mockups)
4. **See the Price** (THEN PAY): Before build starts, we show you the cost based on complexity
5. **Get Production-Ready Code**: Real TypeScript + React + Tailwind, fully styled, ready to deploy
6. **Deploy Anywhere**: Vercel, Netlify, Cloudflare, AWS, or self-hosted—your choice

## 🎯 Use Cases

- **Founders**: "I have an idea but no dev team"—get a fully functional SaaS, landing page, or MVP
- **Developers**: "I started my repo but need help finishing it"—BuildMate analyzes your code and creates a PR with completed features
- **Agencies**: "I need 5 sites for my portfolio companies with consistent branding"—create once, deploy many with brand kit reuse
- **Solo Creators**: Blogs, portfolios, booking sites—no code required

## 💰 Pricing

- **Free tier**: Intake interview + scope document + mood board selection
- **Builds**: $500–$7,500 based on complexity
  - Simple landing page: ~$500
  - Mid-tier SaaS (12 pages, auth, payments): ~$3,500
  - Complex app (20+ pages, custom integrations): ~$7,500

## 📚 Documentation

- **[Getting Started](./docs/getting-started.md)** - Installation, setup, and first build
- **[Vision & Product Strategy](./docs/vision.md)** - Product philosophy and roadmap
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and service boundaries
- **[Freemium Model](./docs/FREEMIUM-MODEL.md)** - Pricing funnel, user journeys, KPIs
- **[API Integration Guide](./docs/INTEGRATION-HUB.md)** - How to integrate with Mate ecosystem
- **[AI Agent Instructions](./github/copilot-instructions.md)** - For developers extending BuildMate

## 🚀 Quick Start

### Installation
```bash
git clone https://github.com/themateplatform/BuildMate_Studio_V2.git
cd BuildMate_Studio_V2
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
import { runAutomation } from '@/buildmate';

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

### BuildMate Core Modules
- **Planner** (`src/buildmate/planner.ts`) - Repository audit & architecture planning
- **Executor** (`src/buildmate/executor.ts`) - Code scaffolding & implementation
- **Scorer** (`src/buildmate/scorer.ts`) - Quality validation (tests, accessibility, security)
- **Decider** (`src/buildmate/decider.ts`) - State machine controller
- **Model Router** (`src/buildmate/modelRouter.ts`) - Intelligent AI model selection
- **Orchestrator** (`src/buildmate/orchestrator.ts`) - Main automation workflow

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

### BuildMate Platform
- Express.js + PostgreSQL + Drizzle ORM
- Session-based Auth + WebSocket + Yjs
- OpenAI, Anthropic, Google, xAI APIs
