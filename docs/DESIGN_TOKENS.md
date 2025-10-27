# Design Tokens Integration

BuildMate Studio consumes design tokens from HubMate Studio to maintain visual consistency across TheMate Platform applications.

## Overview

Design tokens are shared style values (colors, spacing, typography) that ensure all platform apps have a cohesive look and feel while allowing app-specific customization.

## Architecture

### 1. Token Sources

BuildMate Studio supports two token sources:

#### Production: Vendored Package (default)
```
client/src/lib/design-tokens/
├── global.css          # Base HubMate tokens
├── buildmate-overrides.css  # BuildMate brand overrides
├── preset.ts           # Tailwind preset
└── sync.ts            # Runtime sync utility
```

The vendored tokens are:
- Always available (no network dependency)
- Optimized for production
- Updated when HubMate publishes new package versions

#### Development: Live API Sync (optional)
```
VITE_DESIGN_TOKENS_SYNC=true
VITE_HUBMATE_API_URL=http://localhost:3000
```

When enabled, tokens are fetched from HubMate's live API:
- Instant preview of token changes
- No rebuild required
- Useful for cross-app design work

### 2. Token Schema

Tokens follow HubMate's semantic naming convention:

```css
/* Core tokens - fundamental values */
--core-brand-primary
--core-brand-secondary
--core-neutral-[50-900]

/* Semantic tokens - contextual meaning */
--semantic-primary
--semantic-secondary
--semantic-success
--semantic-warning
--semantic-error

/* Surface tokens - backgrounds and cards */
--surfaces-background
--surfaces-card
--surfaces-popover

/* Feedback tokens - user notifications */
--feedback-destructive
--feedback-success

/* CTA tokens - call-to-action elements */
--cta-primary
--cta-secondary

/* Chrome tokens - app UI elements */
--chrome-toolbar
--chrome-statusbar
--chrome-border

/* Sidebar tokens - navigation */
--sidebar-background
--sidebar-foreground
--sidebar-primary
--sidebar-accent
```

### 3. Backward Compatibility

Legacy token names are preserved via aliases:

```css
/* Legacy → Canonical mapping */
--background → --surfaces-background
--primary → --semantic-primary
--sidebar → --sidebar-background
```

All existing components continue to work without changes.

## Usage

### In CSS
```css
.my-component {
  background: var(--surfaces-card);
  color: var(--surfaces-card-foreground);
  border: 1px solid var(--chrome-border);
}
```

### In Tailwind
```jsx
<div className="bg-surfaces-background text-surfaces-foreground">
  <button className="bg-cta-primary text-cta-primary-foreground">
    Click me
  </button>
</div>
```

### With Legacy Names (backward compatible)
```jsx
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">
    Click me
  </button>
</div>
```

## BuildMate Brand Overrides

BuildMate-specific brand values are defined in `buildmate-overrides.css`:

```css
:root {
  --hotter-pink: hsl(316, 100%, 53%);
  --electric-purple: hsl(265, 100%, 59%);
  --electric-blue: hsl(187, 68%, 41%);
  
  /* Override HubMate defaults */
  --core-brand-primary: var(--hotter-pink);
  --core-brand-secondary: var(--electric-purple);
  --core-brand-accent: var(--electric-blue);
}
```

**Important:** These overrides maintain BuildMate's unique visual identity while still participating in the shared token system.

## Development Workflow

### Using Live API Sync

1. **Enable sync in `.env.local`:**
```env
VITE_DESIGN_TOKENS_SYNC=true
VITE_HUBMATE_API_URL=http://localhost:3000
# Optional: poll for updates every 5 seconds
VITE_DESIGN_TOKENS_POLL_INTERVAL=5000
```

2. **Start development server:**
```bash
npm run dev
```

3. **Watch for token updates:**
The console will show:
```
[DesignTokenSync] Initializing...
[DesignTokenSync] Fetching tokens from http://localhost:3000/api/design-tokens?app=buildmate&env=dev&mode=light
[DesignTokenSync] Applied 127 tokens to :root
```

4. **Change themes:**
Theme switches (light/dark) automatically refetch appropriate tokens.

### Refreshing Tokens Manually

In browser console:
```javascript
import { refreshDesignTokens } from '@/lib/design-tokens';
await refreshDesignTokens();
```

## Production Build

In production:
- Live sync is automatically disabled
- Vendored tokens are used
- No runtime API calls
- Optimal performance

Build as usual:
```bash
npm run build
```

## Updating Tokens

### From HubMate Package (recommended)
```bash
npm install @themateplatform/design-tokens@latest
# Update vendored files in client/src/lib/design-tokens/
```

### Manual Updates
1. Edit `client/src/lib/design-tokens/global.css`
2. Update token values
3. Test with `npm run dev`
4. Commit changes

## Adding New Tokens

### In HubMate (source of truth)
1. Add token to HubMate's token schema
2. Publish new version
3. Update BuildMate's vendored files

### BuildMate-only tokens
Add to `buildmate-overrides.css`:
```css
:root {
  --codemate-special-color: hsl(180, 50%, 50%);
}
```

## Tailwind Configuration

The preset is automatically applied in `tailwind.config.ts`:

```typescript
import { designTokensPreset } from "./client/src/lib/design-tokens/preset";

export default {
  presets: [designTokensPreset],
  // ... rest of config
}
```

Container defaults are unified:
```typescript
container: {
  center: true,
  padding: "2rem",
  screens: {
    "2xl": "1400px",
  },
}
```

## Theme Switching

BuildMate uses class-based dark mode:

```html
<html class="dark">
```

Toggle programmatically:
```typescript
document.documentElement.classList.toggle('dark');
```

Tokens automatically switch between light/dark variants.

## Troubleshooting

### Tokens not applying
1. Check CSS import order in `index.css`
2. Verify global.css loads before overrides
3. Clear browser cache
4. Restart dev server

### Live sync not working
1. Verify `VITE_DESIGN_TOKENS_SYNC=true` in `.env.local`
2. Check HubMate API is running
3. Check browser console for errors
4. Verify API URL is correct

### Visual regressions
1. Check if canonical token names changed
2. Verify BuildMate overrides are present
3. Compare with legacy token mappings
4. Test both light and dark modes

## API Reference

### `initDesignTokenSync()`
Initialize token sync on app startup. Called automatically in `main.tsx`.

**Returns:** `DesignTokenSync | null`

### `getDesignTokenSync()`
Get current sync instance.

**Returns:** `DesignTokenSync | null`

### `refreshDesignTokens()`
Manually trigger token refresh.

**Returns:** `Promise<void>`

### Events

Listen for token updates:
```typescript
window.addEventListener('design-tokens-updated', (event) => {
  console.log('Tokens updated:', event.detail);
});
```

## Best Practices

1. **Use semantic tokens** over core tokens in components
2. **Preserve legacy aliases** for backward compatibility  
3. **Test both light and dark modes** after changes
4. **Document BuildMate-specific overrides** in buildmate-overrides.css
5. **Keep vendored tokens in sync** with HubMate releases
6. **Use live sync in dev** for rapid iteration
7. **Disable live sync in prod** for performance

## Migration Guide

Migrating existing components:

### Before
```jsx
<div className="bg-[#0B0B15]">
```

### After
```jsx
<div className="bg-surfaces-background">
```

### Legacy (still works)
```jsx
<div className="bg-background">
```

## Contributing

When adding new tokens:
1. Propose in HubMate design system first
2. Update global.css with new tokens
3. Add to preset.ts Tailwind config
4. Document in this README
5. Test across light/dark modes
6. Update TypeScript types if needed

## Support

- HubMate Design System: [docs link]
- Token Schema: See `client/src/lib/design-tokens/preset.ts`
- Issues: [GitHub Issues]
