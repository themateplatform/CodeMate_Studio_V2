/**
 * Code Generator with Design Tokens Integration
 * 
 * Example utility showing how to generate code that uses design tokens
 * from DesignMate Studio instead of hardcoded values.
 */

import type { DesignTokens } from '../../client/src/lib/designmateClient';

export interface GenerationOptions {
  tokens: DesignTokens;
  targetApp: string;
}

/**
 * Generate a component with design token references
 */
export function generateComponentWithTokens(
  componentName: string,
  options: GenerationOptions
): string {
  const { tokens } = options;
  
  // Instead of hardcoded values, use token references
  return `import { ReactNode } from 'react';

interface ${componentName}Props {
  title?: string;
  description?: string;
  children?: ReactNode;
}

export default function ${componentName}({ 
  title = "${componentName}", 
  description,
  children
}: ${componentName}Props) {
  return (
    <div 
      className="rounded-lg border p-6"
      style={{
        backgroundColor: '${tokens.colors.background}',
        color: '${tokens.colors.foreground}',
        borderColor: '${tokens.colors.primary}',
        borderRadius: '${tokens.radius.lg}',
        padding: '${tokens.spacing.lg}',
        fontFamily: '${tokens.typography.fontFamily.sans}',
      }}
    >
      <h3 
        style={{ 
          fontSize: '${tokens.typography.fontSize.xl}',
          fontWeight: '${tokens.typography.fontWeight.semibold}',
          marginBottom: '${tokens.spacing.sm}'
        }}
      >
        {title}
      </h3>
      {description && (
        <p style={{ 
          fontSize: '${tokens.typography.fontSize.sm}',
          color: '${tokens.colors.secondary}',
          marginBottom: '${tokens.spacing.md}'
        }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
`;
}

/**
 * Generate a button component with design token references
 */
export function generateButtonWithTokens(
  options: GenerationOptions
): string {
  const { tokens } = options;
  
  return `import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}

export default function Button({ 
  variant = 'primary',
  children,
  ...props 
}: ButtonProps) {
  const styles = {
    primary: {
      backgroundColor: '${tokens.colors.primary}',
      color: '${tokens.colors.foreground}',
      borderColor: '${tokens.colors.primary}',
    },
    secondary: {
      backgroundColor: '${tokens.colors.secondary}',
      color: '${tokens.colors.foreground}',
      borderColor: '${tokens.colors.secondary}',
    }
  };

  return (
    <button 
      {...props}
      style={{
        ...styles[variant],
        padding: '${tokens.spacing.sm} ${tokens.spacing.md}',
        borderRadius: '${tokens.radius.md}',
        fontFamily: '${tokens.typography.fontFamily.sans}',
        fontSize: '${tokens.typography.fontSize.base}',
        fontWeight: '${tokens.typography.fontWeight.medium}',
        border: '1px solid',
        cursor: 'pointer',
        boxShadow: '${tokens.shadow.sm}',
        transition: 'all 0.2s ease',
        ...props.style
      }}
    >
      {children}
    </button>
  );
}
`;
}

/**
 * Generate CSS with design token variables
 */
export function generateCSSWithTokens(
  options: GenerationOptions
): string {
  const { tokens } = options;
  
  return `:root {
  /* Colors */
  --color-primary: ${tokens.colors.primary};
  --color-secondary: ${tokens.colors.secondary};
  --color-accent: ${tokens.colors.accent};
  --color-background: ${tokens.colors.background};
  --color-foreground: ${tokens.colors.foreground};
  
  /* Typography */
  --font-sans: ${tokens.typography.fontFamily.sans};
  --font-mono: ${tokens.typography.fontFamily.mono};
  --font-size-sm: ${tokens.typography.fontSize.sm};
  --font-size-base: ${tokens.typography.fontSize.base};
  --font-size-lg: ${tokens.typography.fontSize.lg};
  --font-size-xl: ${tokens.typography.fontSize.xl};
  --font-weight-normal: ${tokens.typography.fontWeight.normal};
  --font-weight-medium: ${tokens.typography.fontWeight.medium};
  --font-weight-semibold: ${tokens.typography.fontWeight.semibold};
  --font-weight-bold: ${tokens.typography.fontWeight.bold};
  
  /* Spacing */
  --spacing-xs: ${tokens.spacing.xs};
  --spacing-sm: ${tokens.spacing.sm};
  --spacing-md: ${tokens.spacing.md};
  --spacing-lg: ${tokens.spacing.lg};
  --spacing-xl: ${tokens.spacing.xl};
  
  /* Radius */
  --radius-sm: ${tokens.radius.sm};
  --radius-md: ${tokens.radius.md};
  --radius-lg: ${tokens.radius.lg};
  --radius-full: ${tokens.radius.full};
  
  /* Shadows */
  --shadow-sm: ${tokens.shadow.sm};
  --shadow-md: ${tokens.shadow.md};
  --shadow-lg: ${tokens.shadow.lg};
}

body {
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
  color: var(--color-foreground);
  background-color: var(--color-background);
}

.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-foreground);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-medium);
  box-shadow: var(--shadow-sm);
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  box-shadow: var(--shadow-md);
}

.card {
  background-color: var(--color-background);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}
`;
}

/**
 * Generate Tailwind config with design tokens
 */
export function generateTailwindConfigWithTokens(
  options: GenerationOptions
): string {
  const { tokens } = options;
  
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '${tokens.colors.primary}',
        secondary: '${tokens.colors.secondary}',
        accent: '${tokens.colors.accent}',
        background: '${tokens.colors.background}',
        foreground: '${tokens.colors.foreground}',
      },
      fontFamily: {
        sans: ['${tokens.typography.fontFamily.sans}'],
        mono: ['${tokens.typography.fontFamily.mono}'],
      },
      fontSize: {
        sm: '${tokens.typography.fontSize.sm}',
        base: '${tokens.typography.fontSize.base}',
        lg: '${tokens.typography.fontSize.lg}',
        xl: '${tokens.typography.fontSize.xl}',
      },
      fontWeight: {
        normal: ${tokens.typography.fontWeight.normal},
        medium: ${tokens.typography.fontWeight.medium},
        semibold: ${tokens.typography.fontWeight.semibold},
        bold: ${tokens.typography.fontWeight.bold},
      },
      spacing: {
        xs: '${tokens.spacing.xs}',
        sm: '${tokens.spacing.sm}',
        md: '${tokens.spacing.md}',
        lg: '${tokens.spacing.lg}',
        xl: '${tokens.spacing.xl}',
      },
      borderRadius: {
        sm: '${tokens.radius.sm}',
        md: '${tokens.radius.md}',
        lg: '${tokens.radius.lg}',
        full: '${tokens.radius.full}',
      },
      boxShadow: {
        sm: '${tokens.shadow.sm}',
        md: '${tokens.shadow.md}',
        lg: '${tokens.shadow.lg}',
      },
    },
  },
  plugins: [],
}
`;
}

/**
 * Example usage in a code generation flow
 */
export async function generateProjectWithTokens(
  projectSpec: { name: string; targetApp: string },
  tokens: DesignTokens
): Promise<Record<string, string>> {
  const options: GenerationOptions = {
    tokens,
    targetApp: projectSpec.targetApp
  };
  
  // Generate various files using design tokens
  const files: Record<string, string> = {
    'src/components/Card.tsx': generateComponentWithTokens('Card', options),
    'src/components/Button.tsx': generateButtonWithTokens(options),
    'src/styles/tokens.css': generateCSSWithTokens(options),
    'tailwind.config.js': generateTailwindConfigWithTokens(options),
  };
  
  return files;
}
