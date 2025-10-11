/**
 * Design Tokens Preset for CodeMate Studio
 * Vendored from @themateplatform/design-tokens (temporary until package is available)
 * 
 * This preset provides shared design tokens from HubMate Studio following the schema:
 * - core: fundamental colors and base values
 * - semantic: contextual tokens (primary, secondary, success, warning, error, info)
 * - surfaces: background, card, popover
 * - feedback: destructive, success states
 * - cta: call-to-action elements
 * - chrome: application chrome (toolbar, statusbar)
 * - sidebar: navigation sidebar tokens
 */

import type { Config } from "tailwindcss";

export const designTokensPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        // Core tokens
        core: {
          brand: {
            primary: "var(--core-brand-primary)",
            secondary: "var(--core-brand-secondary)",
            accent: "var(--core-brand-accent)",
          },
          neutral: {
            50: "var(--core-neutral-50)",
            100: "var(--core-neutral-100)",
            200: "var(--core-neutral-200)",
            300: "var(--core-neutral-300)",
            400: "var(--core-neutral-400)",
            500: "var(--core-neutral-500)",
            600: "var(--core-neutral-600)",
            700: "var(--core-neutral-700)",
            800: "var(--core-neutral-800)",
            900: "var(--core-neutral-900)",
          },
        },
        // Semantic tokens
        semantic: {
          primary: {
            DEFAULT: "var(--semantic-primary)",
            foreground: "var(--semantic-primary-foreground)",
            hover: "var(--semantic-primary-hover)",
            active: "var(--semantic-primary-active)",
            700: "var(--semantic-primary-700)",
            800: "var(--semantic-primary-800)",
            900: "var(--semantic-primary-900)",
          },
          secondary: {
            DEFAULT: "var(--semantic-secondary)",
            foreground: "var(--semantic-secondary-foreground)",
            hover: "var(--semantic-secondary-hover)",
          },
          success: {
            DEFAULT: "var(--semantic-success)",
            foreground: "var(--semantic-success-foreground)",
          },
          warning: {
            DEFAULT: "var(--semantic-warning)",
            foreground: "var(--semantic-warning-foreground)",
          },
          error: {
            DEFAULT: "var(--semantic-error)",
            foreground: "var(--semantic-error-foreground)",
          },
          info: {
            DEFAULT: "var(--semantic-info)",
            foreground: "var(--semantic-info-foreground)",
          },
        },
        // Surface tokens
        surfaces: {
          background: "var(--surfaces-background)",
          foreground: "var(--surfaces-foreground)",
          card: {
            DEFAULT: "var(--surfaces-card)",
            foreground: "var(--surfaces-card-foreground)",
          },
          popover: {
            DEFAULT: "var(--surfaces-popover)",
            foreground: "var(--surfaces-popover-foreground)",
          },
          muted: {
            DEFAULT: "var(--surfaces-muted)",
            foreground: "var(--surfaces-muted-foreground)",
          },
        },
        // Feedback tokens
        feedback: {
          destructive: {
            DEFAULT: "var(--feedback-destructive)",
            foreground: "var(--feedback-destructive-foreground)",
          },
          success: {
            DEFAULT: "var(--feedback-success)",
            foreground: "var(--feedback-success-foreground)",
          },
        },
        // CTA tokens
        cta: {
          primary: {
            DEFAULT: "var(--cta-primary)",
            foreground: "var(--cta-primary-foreground)",
            hover: "var(--cta-primary-hover)",
          },
          secondary: {
            DEFAULT: "var(--cta-secondary)",
            foreground: "var(--cta-secondary-foreground)",
            hover: "var(--cta-secondary-hover)",
          },
        },
        // Chrome tokens (app UI)
        chrome: {
          background: "var(--chrome-background)",
          foreground: "var(--chrome-foreground)",
          border: "var(--chrome-border)",
          toolbar: {
            DEFAULT: "var(--chrome-toolbar)",
            foreground: "var(--chrome-toolbar-foreground)",
          },
          statusbar: {
            DEFAULT: "var(--chrome-statusbar)",
            foreground: "var(--chrome-statusbar-foreground)",
          },
        },
        // Sidebar tokens
        sidebar: {
          background: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
          // Legacy aliases for backward compatibility
          DEFAULT: "var(--sidebar-background)",
        },
      },
      borderRadius: {
        "token-sm": "var(--radius-sm)",
        "token-md": "var(--radius-md)",
        "token-lg": "var(--radius-lg)",
      },
      spacing: {
        "token-xs": "var(--spacing-xs)",
        "token-sm": "var(--spacing-sm)",
        "token-md": "var(--spacing-md)",
        "token-lg": "var(--spacing-lg)",
        "token-xl": "var(--spacing-xl)",
      },
    },
  },
};

export default designTokensPreset;
