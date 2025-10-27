# Design Integration Guide

BuildMate Studio automatically integrates with DesignMate Studio to ensure consistent styling across all generated applications. This guide explains how the integration works and how to leverage it.

## Overview

**DesignMate Studio** is the design system authority that stores and manages design tokens for all products in The Mate Platform ecosystem.

**BuildMate Studio** consumes these tokens during code generation to ensure:
- Visual consistency across applications
- No hardcoded colors or spacing values
- Automatic updates when design tokens change
- Design system compliance by default

## How It Works

### 1. Design Token Fetching

When you specify a design system in your spec:

```yaml
design_system: employse
```

BuildMate:
1. Queries the DesignMate API for `employse` tokens
2. Caches tokens locally for the generation session
3. Validates that all required tokens exist
4. Falls back to defaults if tokens are missing

### 2. Token-Based Code Generation

Instead of generating hardcoded values:

```tsx
// ❌ Without DesignMate integration
<button className="bg-[#FF5733] text-[#FFFFFF] px-4 py-2 rounded">
  Submit
</button>
```

BuildMate generates token references:

```tsx
// ✅ With DesignMate integration
<button className="bg-employse-primary text-employse-text-light px-employse-spacing-md py-employse-spacing-sm rounded-employse-radius-md">
  Submit
</button>
```

### 3. Token Definition Import

BuildMate automatically adds token imports to generated apps:

```typescript
// tailwind.config.ts (auto-generated)
import { employseTokens } from '@designmate/tokens';

export default {
  theme: {
    extend: {
      colors: employseTokens.colors,
      spacing: employseTokens.spacing,
      borderRadius: employseTokens.radius,
      fontFamily: employseTokens.fonts,
    }
  }
}
```

## Design Token Structure

DesignMate organizes tokens by category:

### Colors
```typescript
{
  colors: {
    primary: '#FF5733',
    secondary: '#3498DB',
    accent: '#F39C12',
    background: {
      light: '#FFFFFF',
      dark: '#1A1A1A'
    },
    text: {
      light: '#FFFFFF',
      dark: '#333333',
      muted: '#888888'
    },
    status: {
      success: '#27AE60',
      warning: '#F39C12',
      error: '#E74C3C',
      info: '#3498DB'
    }
  }
}
```

### Spacing
```typescript
{
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    xxl: '3rem'      // 48px
  }
}
```

### Typography
```typescript
{
  fonts: {
    display: 'Inter Variable, sans-serif',
    sans: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace'
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem'
  },
  lineHeights: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75'
  }
}
```

### Radius & Shadows
```typescript
{
  radius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.15)',
    xl: '0 20px 25px rgba(0,0,0,0.2)'
  }
}
```

## Using Design Tokens in Specs

### Automatic Token Usage

When you specify a design system, BuildMate automatically applies tokens:

```yaml
name: Employee Dashboard
design_system: employse

# BuildMate will:
# - Use employse-primary for primary buttons
# - Use employse-text-light for light text
# - Use employse-spacing-md for consistent spacing
# - Use employse-radius-md for rounded corners
```

### Custom Token Overrides

Override specific tokens when needed:

```yaml
design_system: employse

styling:
  overrides:
    primary_color: employse-accent  # Use accent instead of primary
    button_radius: employse-radius-full  # Fully rounded buttons
    heading_font: employse-font-display
```

### Component-Specific Tokens

Apply tokens to specific components:

```yaml
components:
  - name: PrimaryButton
    styling:
      background: employse-primary
      text: employse-text-light
      padding: "employse-spacing-md employse-spacing-lg"
      radius: employse-radius-md
      hover:
        background: employse-primary-dark
```

## DesignMate API Integration

### Configuration

Configure DesignMate connection in your environment:

```bash
# .env
VITE_DESIGNMATE_API_URL=https://designmate-studio-api.com
VITE_DESIGNMATE_API_KEY=your-api-key
```

### API Client Usage

BuildMate includes a DesignMate client:

```typescript
// services/designmateClient.ts
import { DesignMateClient } from '@/lib/designmate';

const client = new DesignMateClient({
  apiUrl: import.meta.env.VITE_DESIGNMATE_API_URL,
  apiKey: import.meta.env.VITE_DESIGNMATE_API_KEY
});

// Fetch design tokens
const tokens = await client.getTokens('employse');

// Fetch specific token category
const colors = await client.getColors('employse');

// Validate token exists
const isValid = await client.validateToken('employse', 'primary');
```

### Caching Strategy

BuildMate caches tokens to minimize API calls:

```typescript
// Tokens are cached for 1 hour
// Refresh manually if needed:
await client.refreshTokens('employse');

// Clear cache:
client.clearCache();
```

## Multi-App Consistency

### Shared Design Systems

Multiple apps can share the same design system:

```yaml
# App 1: Employee Dashboard
name: Employse Dashboard
design_system: employse

# App 2: Employee Mobile App
name: Employse Mobile
design_system: employse

# Result: Both apps use identical styling
```

### Brand Variations

Support multiple brands with design system variants:

```yaml
# Hottr Web App
design_system: hottr

# Hottr Admin Panel
design_system: hottr-admin  # Admin-specific variant
```

## Token Updates

When design tokens change in DesignMate:

1. **Automatic Detection**: BuildMate detects token updates
2. **Rebuild Prompt**: Prompts to regenerate affected apps
3. **Visual Diff**: Shows before/after comparison
4. **One-Click Update**: Apply changes across all apps

```bash
# CLI command to update all apps using a design system
buildmate update-design-system employse

# Preview changes before applying
buildmate update-design-system employse --preview

# Update specific apps only
buildmate update-design-system employse --apps dashboard,mobile
```

## Best Practices

### 1. Always Use Design Systems

```yaml
# ✅ Good: Specifies design system
design_system: employse

# ❌ Bad: No design system specified
design_system: null
```

### 2. Avoid Hardcoded Values

```tsx
// ❌ Bad: Hardcoded hex color
<div className="bg-[#FF5733]">

// ✅ Good: Token reference
<div className="bg-employse-primary">
```

### 3. Use Semantic Token Names

```typescript
// ❌ Bad: Generic names
colors: {
  red: '#FF0000',
  blue: '#0000FF'
}

// ✅ Good: Semantic names
colors: {
  primary: '#FF5733',
  secondary: '#3498DB',
  error: '#E74C3C'
}
```

### 4. Document Custom Tokens

```yaml
design_system: employse

# Document why custom tokens are needed
styling:
  overrides:
    # Using accent color for CTA buttons to increase visibility
    cta_background: employse-accent
```

### 5. Test Token Changes

Before deploying token updates:
- Preview changes in staging
- Test across different screen sizes
- Verify accessibility (contrast ratios)
- Check dark mode if applicable

## Troubleshooting

### Design System Not Found

```
Error: Design system 'employse' not found in DesignMate
```

**Solution**: Verify the design system name or create it in DesignMate Studio.

### Token Missing

```
Warning: Token 'employse-custom-color' not found, using fallback
```

**Solution**: Add the missing token in DesignMate or use an existing token.

### API Connection Failed

```
Error: Cannot connect to DesignMate API
```

**Solution**: Check `VITE_DESIGNMATE_API_URL` and network connectivity.

### Stale Token Cache

```
Warning: Using cached tokens from 2 hours ago
```

**Solution**: Run `buildmate refresh-tokens` or restart the dev server.

## Examples

### Full Integration Example

```yaml
name: Hottr Dating App
type: saas
design_system: hottr

pages:
  - name: Home
    route: /
    components:
      - Hero:
          background: hottr-primary-gradient
          text: hottr-text-light
          cta_button:
            background: hottr-accent
            text: hottr-text-dark
            radius: hottr-radius-full
            
      - Features:
          card_background: hottr-background-light
          card_border: hottr-border-subtle
          card_shadow: hottr-shadow-md
          icon_color: hottr-primary

styling:
  theme:
    mode: both  # Light and dark
    dark_mode:
      background: hottr-background-dark
      text: hottr-text-dark-mode
```

### Programmatic Token Usage

```typescript
import { useDesignTokens } from '@/hooks/useDesignTokens';

function CustomComponent() {
  const tokens = useDesignTokens('employse');
  
  return (
    <div
      style={{
        backgroundColor: tokens.colors.primary,
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.md
      }}
    >
      Content
    </div>
  );
}
```

## Related Documentation

- [Spec Format](./SPEC_FORMAT.md) - How to write specs
- [API Reference](./API.md) - Programmatic API usage
- DesignMate Studio documentation (coming soon) - Design token management

---

**Questions?** Contact the DesignMate team at designmate@themateplatform.com
