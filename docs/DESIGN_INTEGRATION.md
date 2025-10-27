# Design Integration with DesignMate Studio

BuildMate Studio automatically integrates with DesignMate Studio to ensure all generated applications follow your design system.

## Overview

Instead of using hardcoded colors and styles, BuildMate:
1. Queries DesignMate for design tokens
2. Uses CSS variable references in generated code
3. Ensures design system compliance across all apps

## How It Works

### 1. Design System Reference

In your spec, reference a design system:

```yaml
name: My App
design_system: employse
```

### 2. Token Fetching

BuildMate queries DesignMate Studio API:
```
GET /api/design-systems/employse/tokens
```

Response includes:
```json
{
  "colors": {
    "primary": "#0066CC",
    "secondary": "#6C757D",
    "background": "#FFFFFF"
  },
  "spacing": {
    "sm": "8px",
    "md": "16px",
    "lg": "24px"
  },
  "typography": {
    "font-family": "Inter, sans-serif",
    "sizes": {
      "h1": "32px",
      "body": "16px"
    }
  }
}
```

### 3. Code Generation

BuildMate generates code using CSS variables:

**Bad (hardcoded):**
```tsx
<button className="bg-blue-500 text-white px-4 py-2">
  Click Me
</button>
```

**Good (design tokens):**
```tsx
<button className="bg-[var(--employse-primary)] text-[var(--employse-on-primary)] px-[var(--spacing-md)] py-[var(--spacing-sm)]">
  Click Me
</button>
```

## Configuration

### Environment Variables

```bash
# DesignMate Studio API
VITE_DESIGNMATE_API_URL=https://designmate-studio-api.com
VITE_DESIGNMATE_API_KEY=your_api_key
```

### Design System Mapping

If your design system has a different name in DesignMate, create a mapping:

```typescript
// config/design-systems.ts
export const designSystemMappings = {
  'my-app': 'employse',
  'marketing-site': 'hottr'
};
```

## Token Categories

### Colors
```css
--{system}-primary
--{system}-secondary
--{system}-background
--{system}-surface
--{system}-error
--{system}-warning
--{system}-success
```

### Spacing
```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px
```

### Typography
```css
--font-family-primary
--font-family-secondary
--font-size-h1
--font-size-body
--font-weight-regular
--font-weight-bold
```

### Border Radius
```css
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 16px
--radius-full: 9999px
```

### Shadows
```css
--shadow-sm
--shadow-md
--shadow-lg
```

## Benefits

1. **Consistency**: All apps automatically match your design system
2. **Easy Updates**: Change tokens in DesignMate, all apps update
3. **No Manual Styling**: Developers don't need to know hex codes
4. **Brand Compliance**: Enforces corporate identity automatically

## Example: Complete Integration

### 1. Define Design System in DesignMate

Create "employse" design system with tokens:
- Primary: #0066CC
- Secondary: #6C757D
- Font: Inter

### 2. Reference in BuildMate Spec

```yaml
name: Employee Portal
design_system: employse
features:
  - dashboard
  - employee_list
```

### 3. Generated Code Uses Tokens

```tsx
// components/Dashboard.tsx
export function Dashboard() {
  return (
    <div className="bg-[var(--employse-background)] text-[var(--employse-on-background)]">
      <h1 className="text-[var(--font-size-h1)] font-[var(--font-weight-bold)]">
        Dashboard
      </h1>
      <button className="bg-[var(--employse-primary)] text-[var(--employse-on-primary)] rounded-[var(--radius-md)]">
        Action
      </button>
    </div>
  );
}
```

## Testing

Verify design integration:

```bash
# Generate app with design system
npm run generate -- --spec examples/dashboard-spec.yaml

# Check generated code uses tokens
grep -r "var(--employse" generated/
```

## Troubleshooting

### Design System Not Found
```
Error: Design system 'employse' not found in DesignMate
```
**Solution**: Verify design system exists in DesignMate Studio

### Missing Tokens
```
Warning: Token 'primary' not found, using fallback
```
**Solution**: Add missing tokens to your design system

### API Connection Failed
```
Error: Cannot connect to DesignMate API
```
**Solution**: Check `VITE_DESIGNMATE_API_URL` and network connectivity

## Next Steps

- [Spec Format](./SPEC_FORMAT.md) - Learn spec syntax
- [API Reference](./API.md) - Programmatic usage
- [Deployment](./DEPLOYMENT.md) - Deploy generated apps
