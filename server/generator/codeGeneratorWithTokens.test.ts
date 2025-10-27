import { describe, it, expect } from 'vitest';
import {
  generateComponentWithTokens,
  generateButtonWithTokens,
  generateCSSWithTokens,
  generateTailwindConfigWithTokens,
  generateProjectWithTokens,
  type GenerationOptions
} from './codeGeneratorWithTokens';

const mockTokens = {
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#f59e0b',
    background: '#ffffff',
    foreground: '#000000'
  },
  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, sans-serif',
      mono: 'Monaco, monospace'
    },
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  radius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    full: '9999px'
  },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)'
  }
};

const mockOptions: GenerationOptions = {
  tokens: mockTokens,
  targetApp: 'employse'
};

describe('Code Generator with Design Tokens', () => {
  describe('generateComponentWithTokens', () => {
    it('should generate component with token references', () => {
      const code = generateComponentWithTokens('TestCard', mockOptions);

      expect(code).toContain('TestCard');
      expect(code).toContain(mockTokens.colors.background);
      expect(code).toContain(mockTokens.colors.foreground);
      expect(code).toContain(mockTokens.spacing.lg);
      expect(code).toContain(mockTokens.typography.fontFamily.sans);
      // The generated code uses token values directly in inline styles
      expect(code).toContain('backgroundColor:');
    });

    it('should include proper TypeScript types', () => {
      const code = generateComponentWithTokens('TestCard', mockOptions);

      expect(code).toContain('interface TestCardProps');
      expect(code).toContain('ReactNode');
    });
  });

  describe('generateButtonWithTokens', () => {
    it('should generate button with token-based styles', () => {
      const code = generateButtonWithTokens(mockOptions);

      expect(code).toContain('Button');
      expect(code).toContain(mockTokens.colors.primary);
      expect(code).toContain(mockTokens.colors.secondary);
      expect(code).toContain(mockTokens.spacing.sm);
      expect(code).toContain(mockTokens.radius.md);
    });

    it('should support variant prop', () => {
      const code = generateButtonWithTokens(mockOptions);

      expect(code).toContain("variant?: 'primary' | 'secondary'");
      expect(code).toContain('primary:');
      expect(code).toContain('secondary:');
    });
  });

  describe('generateCSSWithTokens', () => {
    it('should generate CSS with custom properties', () => {
      const css = generateCSSWithTokens(mockOptions);

      expect(css).toContain(':root {');
      expect(css).toContain('--color-primary:');
      expect(css).toContain('--font-sans:');
      expect(css).toContain('--spacing-md:');
      expect(css).toContain('--radius-lg:');
      expect(css).toContain('--shadow-sm:');
    });

    it('should include utility classes', () => {
      const css = generateCSSWithTokens(mockOptions);

      expect(css).toContain('.btn-primary');
      expect(css).toContain('.card');
      expect(css).toContain('var(--color-primary)');
    });
  });

  describe('generateTailwindConfigWithTokens', () => {
    it('should generate valid Tailwind config', () => {
      const config = generateTailwindConfigWithTokens(mockOptions);

      expect(config).toContain('/** @type {import(\'tailwindcss\').Config} */');
      expect(config).toContain('export default');
      expect(config).toContain('theme:');
      expect(config).toContain('extend:');
    });

    it('should include all token categories', () => {
      const config = generateTailwindConfigWithTokens(mockOptions);

      expect(config).toContain('colors:');
      expect(config).toContain('fontFamily:');
      expect(config).toContain('fontSize:');
      expect(config).toContain('spacing:');
      expect(config).toContain('borderRadius:');
      expect(config).toContain('boxShadow:');
    });

    it('should use token values', () => {
      const config = generateTailwindConfigWithTokens(mockOptions);

      expect(config).toContain(mockTokens.colors.primary);
      expect(config).toContain(mockTokens.typography.fontFamily.sans);
      expect(config).toContain(mockTokens.spacing.md);
    });
  });

  describe('generateProjectWithTokens', () => {
    it('should generate multiple files', async () => {
      const projectSpec = { name: 'TestProject', targetApp: 'employse' };
      const files = await generateProjectWithTokens(projectSpec, mockTokens);

      expect(files).toHaveProperty('src/components/Card.tsx');
      expect(files).toHaveProperty('src/components/Button.tsx');
      expect(files).toHaveProperty('src/styles/tokens.css');
      expect(files).toHaveProperty('tailwind.config.js');
    });

    it('should use design tokens in all generated files', async () => {
      const projectSpec = { name: 'TestProject', targetApp: 'employse' };
      const files = await generateProjectWithTokens(projectSpec, mockTokens);

      // Check that files contain token values
      const allContent = Object.values(files).join('\n');
      expect(allContent).toContain(mockTokens.colors.primary);
      expect(allContent).toContain(mockTokens.typography.fontFamily.sans);
    });

    it('should generate consistent styles across files', async () => {
      const projectSpec = { name: 'TestProject', targetApp: 'employse' };
      const files = await generateProjectWithTokens(projectSpec, mockTokens);

      // All files should reference the same token values
      const allContent = Object.values(files).join('\n');
      
      // Check files contain token references
      expect(allContent).toContain(mockTokens.colors.primary);
      expect(allContent).toContain(mockTokens.spacing.md);
    });
  });
});
