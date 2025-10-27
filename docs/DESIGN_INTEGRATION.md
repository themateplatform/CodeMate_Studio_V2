# DesignMate Studio Integration

BuildMate automatically fetches design tokens from DesignMate Studio to ensure generated code follows design system guidelines.

## Overview

This integration connects CodeMate Studio with DesignMate Studio to:
- Fetch design tokens for target applications
- Validate generated code against design system rules
- Ensure brand consistency across generated applications
- Provide fallback tokens when DesignMate is unavailable

## How It Works

1. **User selects target app** (Employse, Hottr, Noche, etc.) via the AppSelector component
2. **BuildMate queries DesignMate API** for that app's design tokens
3. **Code generator uses token references** instead of hardcoded values
4. **Compliance validation** checks generated code for violations
5. **Fallback behavior** ensures graceful degradation when API is unavailable

## Components

### DesignMate Client (`client/src/lib/designmateClient.ts`)

The core service that communicates with DesignMate Studio API.

**Methods:**
- `getTokensForApp(appName: string)` - Fetch design tokens for a specific app
- `validateCompliance(code: string, appName: string)` - Validate generated code
- `getAvailableApps()` - Get list of available design systems

**Example usage:**
```typescript
import { designmateClient } from '@/lib/designmateClient';

// Fetch tokens
const tokens = await designmateClient.getTokensForApp('employse');

// Validate code
const compliance = await designmateClient.validateCompliance(code, 'employse');
if (!compliance.compliant) {
  console.warn('Violations found:', compliance.violations);
}
```

### AppSelector Component (`client/src/components/AppSelector.tsx`)

UI component for selecting target application design system.

**Props:**
- `value: string` - Currently selected app
- `onChange: (app: string) => void` - Callback when selection changes

**Example usage:**
```tsx
import { AppSelector } from '@/components/AppSelector';

function BuilderPage() {
  const [targetApp, setTargetApp] = useState('employse');
  
  return (
    <AppSelector value={targetApp} onChange={setTargetApp} />
  );
}
```

### TokenPreview Component (`client/src/components/TokenPreview.tsx`)

Displays design tokens that will be used for code generation.

**Props:**
- `appName: string` - App to display tokens for

**Example usage:**
```tsx
import { TokenPreview } from '@/components/TokenPreview';

function BuilderPage() {
  const [targetApp] = useState('employse');
  
  return (
    <TokenPreview appName={targetApp} />
  );
}
```

## Configuration

Add to `.env.local`:

```env
# DesignMate Studio Integration
VITE_DESIGNMATE_API_URL=https://designmate-studio-api.com
VITE_DESIGNMATE_API_KEY=your-api-key-here
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_DESIGNMATE_API_URL` | Base URL for DesignMate Studio API | No |
| `VITE_DESIGNMATE_API_KEY` | API key for authentication | No |

**Note:** Both variables are optional. If not configured, the system uses fallback tokens.

## Token Usage

Generated code uses CSS variables referencing design tokens:

### Instead of Hardcoded Values
```tsx
// ❌ Bad: Hardcoded colors
<button className="bg-[#3b82f6] text-white">
  Click me
</button>
```

### Use Token References
```tsx
// ✅ Good: Token references
<button className="bg-[var(--colors-primary)] text-[var(--colors-foreground)]">
  Click me
</button>
```

Or better yet, use semantic token classes:
```tsx
// ✅ Best: Semantic classes from design system
<button className="bg-semantic-primary text-semantic-primary-foreground">
  Click me
</button>
```

## Fallback Behavior

When DesignMate Studio is unavailable:
- **Fallback tokens** are used automatically
- **Warning logged** to console
- **Generated code still works** with sensible defaults
- **No errors thrown** - graceful degradation

Default fallback tokens include:
- **Colors**: Primary (#3b82f6), Secondary (#8b5cf6), Accent (#f59e0b)
- **Typography**: Inter font family, standard size scale
- **Spacing**: xs (0.25rem) through xl (2rem)
- **Radius**: sm (0.25rem) through full (9999px)
- **Shadow**: sm, md, lg variants

## API Contract

### GET `/api/apps`

Returns list of available design systems.

**Response:**
```json
{
  "apps": ["employse", "hottr", "noche", "default"]
}
```

### GET `/api/tokens/:appName`

Fetches design tokens for specified app.

**Response:**
```json
{
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#8b5cf6",
    "accent": "#f59e0b",
    "background": "#ffffff",
    "foreground": "#000000"
  },
  "typography": {
    "fontFamily": {
      "sans": "Inter, system-ui, sans-serif",
      "mono": "Monaco, monospace"
    },
    "fontSize": {
      "sm": "0.875rem",
      "base": "1rem",
      "lg": "1.125rem"
    },
    "fontWeight": {
      "normal": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    }
  },
  "spacing": {
    "xs": "0.25rem",
    "sm": "0.5rem",
    "md": "1rem",
    "lg": "1.5rem",
    "xl": "2rem"
  },
  "radius": {
    "sm": "0.25rem",
    "md": "0.5rem",
    "lg": "1rem",
    "full": "9999px"
  },
  "shadow": {
    "sm": "0 1px 2px rgba(0,0,0,0.05)",
    "md": "0 4px 6px rgba(0,0,0,0.1)",
    "lg": "0 10px 15px rgba(0,0,0,0.1)"
  }
}
```

### POST `/api/validate`

Validates generated code against design system rules.

**Request:**
```json
{
  "code": "const Button = () => <button className=\"bg-[#3b82f6]\">Click</button>",
  "app": "employse"
}
```

**Response:**
```json
{
  "compliant": false,
  "violations": [
    {
      "line": 1,
      "column": 45,
      "message": "Hardcoded color value detected. Use design token instead.",
      "severity": "error"
    }
  ],
  "score": 85
}
```

## Integration with Code Generation

When generating code:

1. **Fetch tokens** for the target app
2. **Pass tokens** to the code generator
3. **Generate code** using token references
4. **Validate compliance** before finalizing
5. **Display warnings** if violations found

```typescript
import { designmateClient } from '@/lib/designmateClient';

async function generateCode(spec: ProjectSpec): Promise<string> {
  // 1. Fetch design tokens
  const tokens = await designmateClient.getTokensForApp(
    spec.targetApp || 'default'
  );

  // 2. Generate code with token references
  const code = generateWithTokens(spec, tokens);

  // 3. Validate compliance
  const compliance = await designmateClient.validateCompliance(
    code,
    spec.targetApp || 'default'
  );

  if (!compliance.compliant) {
    console.warn('Design compliance violations:', compliance.violations);
    // Optionally auto-fix or warn user
  }

  return code;
}
```

## Testing

Test token fetching:
```typescript
const tokens = await designmateClient.getTokensForApp('employse');
expect(tokens.colors.primary).toBeDefined();
expect(tokens.typography.fontFamily.sans).toBeDefined();
```

Test code generation with tokens:
```typescript
const spec = { name: 'Test App', targetApp: 'employse' };
const code = await generateCode(spec);
expect(code).toContain(tokens.colors.primary);
expect(code).not.toContain('#3b82f6'); // No hardcoded colors
```

Test compliance validation:
```typescript
const compliance = await designmateClient.validateCompliance(code, 'employse');
expect(compliance.compliant).toBe(true);
expect(compliance.score).toBeGreaterThan(90);
```

## Troubleshooting

### API Connection Issues

If you see warnings about DesignMate being unavailable:
1. Check `VITE_DESIGNMATE_API_URL` is correct
2. Verify API key is valid
3. Check network connectivity
4. Review API logs for errors

The system will continue to work with fallback tokens.

### Token Not Applying

If tokens aren't showing in generated code:
1. Verify app name is correct
2. Check token structure matches expected format
3. Review code generator logic
4. Test with fallback tokens first

### Validation Errors

If compliance validation fails unexpectedly:
1. Review violation messages
2. Check token usage in generated code
3. Verify design system rules
4. Test with known-good code samples

## Related Documentation

- [Design Tokens](./DESIGN_TOKENS.md) - Core design token system
- [HubMate Integration](./INTEGRATION-HUB.md) - Platform integration overview

## Future Enhancements

Planned improvements:
- Auto-fix for common violations
- Real-time token preview during generation
- Design system version locking
- Multi-theme support
- Token usage analytics
