# CodeMate Studio

> An AI-powered full-stack IDE for building modern web applications

CodeMate Studio (CodeVibe) is a web-based integrated development environment that empowers developers to create, edit, and manage full-stack applications with intelligent AI assistance. Built with React, TypeScript, and Express, it provides a complete development workflow from code generation to deployment.

## ✨ Features

- 🎨 **Monaco Code Editor** - Professional code editing with syntax highlighting and IntelliSense
- 🤖 **AI-Powered Development** - Code generation and intelligent suggestions via OpenAI GPT-5
- 📊 **Database Management** - Visual schema editor with Drizzle ORM integration
- 🔄 **GitHub Integration** - Two-way sync with GitHub repositories
- 🚀 **Live Preview** - Real-time application preview with responsive design testing
- 🔐 **Security First** - Built-in security best practices and secret management
- 🧪 **Testing Framework** - Comprehensive testing with Vitest
- 📱 **Responsive Design** - Mobile-optimized interface with PWA capabilities

## 🚀 Quick Start

### Prerequisites

- Node.js 20 or higher
- PostgreSQL database (or Neon serverless)
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd fertile-ground-base

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Push database schema
npm run db:push

# Start development server
npm run dev

# Open http://localhost:5000
```

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Session
SESSION_SECRET=your-secret-key-here

# Optional: Supabase Integration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Optional: AI Features
OPENAI_API_KEY=your-openai-api-key

# Optional: GitHub Integration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **TanStack Query** - Server state management
- **Monaco Editor** - Code editing capabilities

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Drizzle ORM** - Type-safe database queries
- **PostgreSQL** - Primary database
- **Zod** - Schema validation
- **WebSocket** - Real-time features

### AI & Integrations
- **OpenAI API** - Code generation and assistance
- **GitHub API** - Repository management
- **Supabase** - Optional database and auth
- **Replit** - Deployment platform

## 📖 Documentation

- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Phase Documentation](docs/)** - Detailed phase implementation guides
- **[Deployment Guide](docs/DEPLOYMENT-GUIDE.md)** - Deployment instructions
- **[GitHub Copilot Instructions](.github/copilot-instructions.md)** - Copilot configuration and context

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server

# Building
npm run build           # Build for production
npm run build:dev       # Build in development mode

# Testing & Quality
npm run check           # TypeScript type checking
npm test                # Run unit tests

# Database
npm run db:push         # Push schema to database
```

### Development Workflow

1. Create a feature branch: `agent/phase-X-feature-name`
2. Make changes following our [coding standards](.github/copilot-instructions.md)
3. Write tests for new functionality
4. Commit using [conventional commits](CONTRIBUTING.md#commit-guidelines)
5. Push and create a pull request
6. Ensure all CI checks pass

## 🎯 Phase-Gated Development

CodeMate Studio follows a 12-phase development methodology:

1. ✅ **Phase 1**: Repository & Infrastructure Audit
2. ✅ **Phase 2**: Supabase Baseplate Implementation
3. ✅ **Phase 3**: Edge Function Secret Broker
4. ✅ **Phase 4**: GitHub 2-Way Sync + CI
5. 🔄 **Phase 5**: Replit Deployments (In Progress)
6. **Phase 6**: PWA Hardening
7. **Phase 7**: Mobile Capabilities
8. **Phase 8**: Store Readiness Wizard
9. **Phase 9**: Agentic Workflow Planning
10. **Phase 10**: Templates & Data-First Starters
11. **Phase 11**: Observability & SLOs
12. **Phase 12**: Enterprise Features

Each phase must be complete and secure before proceeding to the next.

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development setup and workflow
- Coding standards and best practices
- Commit message format
- Pull request process
- Security guidelines

### Quick Contribution Checklist

- [ ] Follow TypeScript strict mode
- [ ] Use conventional commits
- [ ] Write tests for new features
- [ ] Update documentation
- [ ] Pass all CI checks
- [ ] Complete security checklist

## 🔐 Security

Security is our top priority. Please review our [security guidelines](CONTRIBUTING.md#security-guidelines) before contributing.

**Key Security Principles**:
- No secrets in source code
- Row Level Security (RLS) on all database tables
- Input validation with Zod schemas
- Authentication required for protected routes
- CORS properly configured

**Reporting Security Issues**: Please create a private security advisory through GitHub.

## 📝 GitHub Copilot Configuration

This repository is configured with comprehensive GitHub Copilot instructions to provide context-aware suggestions. The instructions include:

- Repository purpose and architecture
- Technology stack and frameworks
- Coding standards and best practices
- Security guidelines and requirements
- Commit conventions and branching strategy
- Common patterns and examples

View the full [Copilot Instructions](.github/copilot-instructions.md) for details.

### Testing Copilot Context

To verify Copilot understands the repository context:

1. **Ask about the tech stack**: "What database ORM does this project use?"
   - Expected: Copilot should mention Drizzle ORM with PostgreSQL

2. **Request a component**: "Create a new user profile component"
   - Expected: Copilot should generate a TypeScript React component using shadcn/ui patterns

3. **Ask about security**: "How should I store API keys?"
   - Expected: Copilot should recommend environment variables and mention security guidelines

4. **Query commit format**: "How should I format my commit message?"
   - Expected: Copilot should describe conventional commits with phase-aware scopes

## 🚀 Deployment

### Replit Deployment

CodeMate Studio is designed for deployment on Replit:

```bash
# Deploy with autoscale
./scripts/deploy.sh autoscale
```

See the [Deployment Guide](docs/DEPLOYMENT-GUIDE.md) for detailed instructions including:
- Autoscale deployment configuration
- Environment variable setup
- Health checks and monitoring
- Zero-downtime deployments

## 📊 Project Status

- **Status**: Active Development
- **Current Phase**: Phase 4 Complete, Phase 5 In Progress
- **License**: MIT
- **Node Version**: 20+
- **CI/CD**: GitHub Actions

## 📞 Support

### Getting Help

- **Documentation**: Check the `/docs` directory
- **Issues**: Search [existing issues](../../issues) or create a new one
- **Discussions**: Use [GitHub Discussions](../../discussions) for questions
- **Security**: Report security issues via private advisory

### Useful Links

- [Contributing Guidelines](CONTRIBUTING.md)
- [GitHub Copilot Setup](.github/copilot-instructions.md)
- [Phase Documentation](docs/)
- [Deployment Guide](docs/DEPLOYMENT-GUIDE.md)

## 📄 License

MIT License - see LICENSE file for details

---

Built with ❤️ by the CodeMate Studio team. Together, we're building the future of AI-powered application development.
