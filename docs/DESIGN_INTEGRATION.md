# DesignMate Studio Integration

BuildMate automatically fetches design tokens from DesignMate Studio to ensure consistency and compliance across all generated applications.

## Overview

The DesignMate Studio integration enables:
- **Automatic token fetching**: Retrieves design tokens for the selected app
- **Design system compliance**: Ensures all generated code follows brand guidelines
- **Fallback support**: Works offline with sensible default tokens
- **Live preview**: Shows tokens before code generation
- **Validation**: Checks generated code for design compliance

## How It Works

### 1. User Selects Target App

When using the code generator or builder, users can select which app's design system to use:
- Employse
- Hottr
- Noche
- Default

### 2. Token Fetching

BuildMate queries the DesignMate API for that app's design tokens:
```typescript
const tokens = await designmateClient.getTokensForApp('employse');
```

Returns a structured token object containing:
- **Colors**: primary, secondary, accent, background, foreground
- **Typography**: font families, sizes, weights
- **Spacing**: standardized spacing scale
- **Radius**: border radius values
- **Shadow**: box shadow definitions

### 3. Code Generation

The code generator uses token references instead of hardcoded values:

**Before (hardcoded):**
```tsx
<Button className="bg-blue-500 text-white rounded-md px-4 py-2">
  Click me
</Button>
```

**After (token-based):**
```tsx
<Button 
  style={{
    backgroundColor: tokens.colors.primary,
    color: tokens.colors.foreground,
    borderRadius: tokens.radius.md,
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`
  }}
>
  Click me
</Button>
```

### 4. Compliance Validation

After generation, BuildMate can validate the code:
```typescript
const report = await designmateClient.validateCompliance(code, 'employse');
if (!report.compliant) {
  console.warn('Design violations:', report.violations);
}
```

## Components

### AppSelector

UI component for selecting the target app's design system:

```tsx
import { AppSelector } from '@/components/AppSelector';

function MyBuilder() {
  const [targetApp, setTargetApp] = useState('employse');
  
  return <AppSelector value={targetApp} onChange={setTargetApp} />;
}
```

### TokenPreview

Shows a visual preview of all design tokens:

```tsx
import { TokenPreview } from '@/components/TokenPreview';

function MyBuilder() {
  return <TokenPreview appName="employse" />;
}
```

## API Contract

### GET /api/apps

Returns list of available design systems.

**Response:**
```json
{
  "apps": ["employse", "hottr", "noche", "default"]
}
```

### GET /api/tokens/:appName

Returns design tokens for specified app.

**Response:**
```json
{
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#8b5cf6",
    ...
  },
  "typography": {
    "fontFamily": {
      "sans": "Inter, system-ui, sans-serif",
      "mono": "Monaco, monospace"
    },
    ...
  },
  ...
}
```

### POST /api/validate

Validates code against design system compliance.

**Request:**
```json
{
  "code": "const Button = () => <button className='bg-blue-500'>...",
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
      "message": "Hardcoded color value instead of design token",
      "severity": "error"
    }
  ],
  "score": 75
}
```

## Configuration

Add to `.env`:

```bash
# DesignMate Studio Integration
VITE_DESIGNMATE_API_URL=https://designmate-studio-api.com
VITE_DESIGNMATE_API_KEY=your-api-key-here
```

## Fallback Mode

If DesignMate Studio is unavailable or not configured:

1. A warning is logged to the console
2. Default fallback tokens are used
3. Generated code still works correctly
4. No errors thrown to the user

The fallback tokens provide sensible defaults based on modern design best practices.

## Usage Example

```typescript
import { designmateClient } from '@/services/designmateClient';

async function generateComponent(spec: ComponentSpec) {
  // 1. Fetch tokens
  const tokens = await designmateClient.getTokensForApp(spec.targetApp);
  
  // 2. Generate code using tokens
  const code = `
    <div style={{
      backgroundColor: '${tokens.colors.background}',
      color: '${tokens.colors.foreground}',
      padding: '${tokens.spacing.md}',
      borderRadius: '${tokens.radius.md}',
      fontFamily: '${tokens.typography.fontFamily.sans}'
    }}>
      {children}
    </div>
  `;
  
  // 3. Validate compliance
  const report = await designmateClient.validateCompliance(code, spec.targetApp);
  
  if (!report.compliant) {
    console.warn('Compliance issues found:', report.violations);
  }
  
  return code;
}
```

## Benefits

- **Consistency**: All apps use the same design language
- **Maintainability**: Update designs in one place, propagate everywhere
- **Compliance**: Automatic validation prevents design drift
- **Speed**: No manual design token copying
- **Quality**: Professional, polished output every time

## Related Documentation

- [Design Tokens Overview](./DESIGN_TOKENS.md)
- [Code Generation Guide](./CODE_GENERATION.md)
- [Builder UI Guide](./BUILDER_UI.md)

## Support

If you encounter issues with the DesignMate integration:

1. Check that environment variables are set correctly
2. Verify API connectivity to DesignMate Studio
3. Review console logs for specific error messages
4. Fallback mode should handle most failures gracefully

For persistent issues, contact the DesignMate Studio team.
