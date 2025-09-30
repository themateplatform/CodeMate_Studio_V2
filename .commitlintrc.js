// Conventional Commits configuration for CodeMate Studio
// Phase 4: GitHub 2-Way Sync + CI Implementation

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation changes
        'style',    // Code style changes (formatting, etc.)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Test additions or modifications
        'chore',    // Build process or auxiliary tool changes
        'ci',       // CI/CD changes
        'build',    // Build system changes
        'revert',   // Revert previous commit
        'phase',    // Phase-specific changes
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'core',
        'ui',
        'api',
        'auth',
        'db',
        'ci',
        'deployment',
        'docs',
        'phase-1',
        'phase-2',
        'phase-3',
        'phase-4',
        'phase-5',
        'phase-6',
        'phase-7',
        'phase-8',
        'phase-9',
        'phase-10',
        'phase-11',
        'phase-12',
      ],
    ],
    'subject-case': [1, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 100],
    'subject-min-length': [2, 'always', 10],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
  },
};