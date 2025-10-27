/**
 * Code Generation Helpers with Design Token Integration
 * Helper utilities for generating code with DesignMate Studio tokens
 */

import { designmateClient, DesignTokens } from './designmateClient';

export interface GenerateCodeOptions {
  targetApp?: string;
  validateCompliance?: boolean;
}

export interface GenerateCodeResult {
  code: string;
  tokens: DesignTokens;
  compliance?: {
    compliant: boolean;
    violations: Array<{
      line: number;
      message: string;
      severity: 'error' | 'warning';
    }>;
    score: number;
  };
}

/**
 * Generate code with design tokens integrated
 * 
 * @param codeTemplate - Template function that receives tokens and returns code
 * @param options - Generation options including target app
 * @returns Generated code with tokens and optional compliance report
 */
export async function generateCodeWithTokens(
  codeTemplate: (tokens: DesignTokens) => string,
  options: GenerateCodeOptions = {}
): Promise<GenerateCodeResult> {
  const { targetApp = 'default', validateCompliance = false } = options;

  // 1. Fetch design tokens for the target app
  const tokens = await designmateClient.getTokensForApp(targetApp);

  // 2. Generate code using the tokens
  const code = codeTemplate(tokens);

  // 3. Optionally validate compliance
  let compliance;
  if (validateCompliance) {
    compliance = await designmateClient.validateCompliance(code, targetApp);
    
    if (!compliance.compliant) {
      console.warn(
        `Design compliance violations for ${targetApp}:`,
        compliance.violations
      );
    }
  }

  return {
    code,
    tokens,
    compliance
  };
}

/**
 * Generate button styles using design tokens
 */
export function generateButtonStyles(tokens: DesignTokens): string {
  return `
    backgroundColor: '${tokens.colors.primary}',
    color: '${tokens.colors.foreground}',
    borderRadius: '${tokens.radius.md}',
    padding: '${tokens.spacing.sm} ${tokens.spacing.md}',
    fontFamily: '${tokens.typography.fontFamily.sans}',
    fontWeight: ${tokens.typography.fontWeight.medium},
    boxShadow: '${tokens.shadow.sm}'
  `.trim();
}

/**
 * Generate card styles using design tokens
 */
export function generateCardStyles(tokens: DesignTokens): string {
  return `
    backgroundColor: '${tokens.colors.background}',
    color: '${tokens.colors.foreground}',
    borderRadius: '${tokens.radius.lg}',
    padding: '${tokens.spacing.lg}',
    boxShadow: '${tokens.shadow.md}'
  `
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

/**
 * Generate typography CSS using design tokens
 */
export function generateTypographyCSS(tokens: DesignTokens): string {
  return `
    fontFamily: '${tokens.typography.fontFamily.sans}',
    fontSize: '${tokens.typography.fontSize.base}',
    fontWeight: ${tokens.typography.fontWeight.normal},
    color: '${tokens.colors.foreground}'
  `.trim();
}

/**
 * Generate CSS variables from design tokens
 * Useful for injecting into stylesheets
 */
export function generateCSSVariables(tokens: DesignTokens): string {
  const vars: string[] = [':root {'];

  // Colors
  Object.entries(tokens.colors).forEach(([name, value]) => {
    vars.push(`  --color-${name}: ${value};`);
  });

  // Typography
  vars.push(`  --font-sans: ${tokens.typography.fontFamily.sans};`);
  vars.push(`  --font-mono: ${tokens.typography.fontFamily.mono};`);
  
  Object.entries(tokens.typography.fontSize).forEach(([name, value]) => {
    vars.push(`  --font-size-${name}: ${value};`);
  });
  
  Object.entries(tokens.typography.fontWeight).forEach(([name, value]) => {
    vars.push(`  --font-weight-${name}: ${value};`);
  });

  // Spacing
  Object.entries(tokens.spacing).forEach(([name, value]) => {
    vars.push(`  --spacing-${name}: ${value};`);
  });

  // Radius
  Object.entries(tokens.radius).forEach(([name, value]) => {
    vars.push(`  --radius-${name}: ${value};`);
  });

  // Shadows
  Object.entries(tokens.shadow).forEach(([name, value]) => {
    vars.push(`  --shadow-${name}: ${value};`);
  });

  vars.push('}');
  return vars.join('\n');
}
