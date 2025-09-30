# Overview

CodeVibe is a full-stack web-based IDE (Integrated Development Environment) that enables users to create, edit, and manage projects with AI-powered code generation capabilities. The application provides a complete development environment with features including a Monaco-based code editor, real-time preview, GitHub integration, database schema management, and an AI chat assistant for code generation and project assistance.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent design system
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Code Editor**: Monaco Editor integration for syntax highlighting and code editing
- **Styling**: CSS custom properties for theming with dark mode support

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Development Server**: Vite development server with custom middleware integration
- **WebSocket**: Built-in WebSocket server for real-time communication
- **Storage Layer**: Abstracted storage interface with in-memory implementation (IStorage interface)
- **API Design**: RESTful API with JSON responses and proper error handling

## Data Management
- **ORM**: Drizzle ORM for type-safe database interactions
- **Database**: PostgreSQL with Neon serverless database support
- **Schema**: Centralized schema definitions in shared directory for type consistency
- **Migrations**: Drizzle Kit for database migrations and schema management
- **Validation**: Zod for runtime type validation and schema parsing

## Authentication & Sessions
- **Session Management**: PostgreSQL-backed session storage using connect-pg-simple
- **GitHub Integration**: OAuth-based GitHub authentication with Octokit client
- **Replit Integration**: Built-in support for Replit environment variables and connectors

## Real-time Features
- **WebSocket Communication**: Custom WebSocket implementation for live collaboration
- **File Synchronization**: Real-time file updates and project state management
- **Live Preview**: Dynamic preview generation with mobile/desktop responsive modes

## AI Integration
- **Provider**: OpenAI GPT-5 integration for code generation and chat assistance
- **Features**: Code generation, code improvement, and contextual chat assistance
- **Context Awareness**: Project-aware AI responses with file and schema context

# External Dependencies

## Core Technologies
- **Database**: Neon serverless PostgreSQL for production data storage
- **AI Services**: OpenAI API (GPT-5) for code generation and chat functionality
- **Version Control**: GitHub API integration via Octokit for repository management
- **Development Platform**: Replit-specific integrations and environment support

## Third-party Services
- **GitHub**: Repository cloning, file synchronization, and OAuth authentication
- **Supabase**: Optional database schema integration and management
- **Replit Connectors**: Built-in connector system for external service authentication
- **CDN Resources**: Monaco Editor loaded from unpkg CDN for code editing capabilities

## UI Component Libraries
- **Radix UI**: Headless components for accessibility and consistent behavior
- **Lucide Icons**: Comprehensive icon system for UI elements
- **React Hook Form**: Form handling with validation resolver support
- **Class Variance Authority**: Type-safe component variant management

## Development Tools
- **ESBuild**: Fast bundling for production builds
- **TSX**: TypeScript execution for development server
- **Tailwind CSS**: Utility-first CSS framework with custom theme configuration
- **PostCSS**: CSS processing with Tailwind and Autoprefixer plugins