/**
 * Design Tokens Module
 * 
 * Central export point for design tokens functionality in CodeMate Studio.
 * This module provides:
 * - Tailwind preset with HubMate token schema
 * - Runtime token sync for dev mode
 * - Type definitions for token usage
 */

export { designTokensPreset } from './preset';
export { initDesignTokenSync, getDesignTokenSync, refreshDesignTokens } from './sync';

// Re-export types
export type { default as Config } from 'tailwindcss';
