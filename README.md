# CodeMate Studio V2

AI-powered code generation and development platform.

## Documentation

- **[Design Tokens](./docs/DESIGN_TOKENS.md)** - How CodeMate consumes shared design tokens from HubMate Studio

## Development

```bash
npm install
npm run dev
```

## Design System Integration

CodeMate Studio uses shared design tokens from HubMate Studio for consistent cross-platform styling.

### Quick Start

**Production (default):**
Uses vendored design tokens - no configuration needed.

**Development with live sync:**
```env
# .env.local
VITE_DESIGN_TOKENS_SYNC=true
VITE_HUBMATE_API_URL=http://localhost:3000
```

See [Design Tokens Documentation](./docs/DESIGN_TOKENS.md) for full details.

## Building

```bash
npm run build
```
