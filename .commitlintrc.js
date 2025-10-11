module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      1,
      'always',
      [
        'feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'build', 'revert', 'phase',
        'wip', 'temp', 'misc',
      ],
    ],
    'scope-enum': [
      1,
      'always',
      [
        'core', 'ui', 'api', 'auth', 'db', 'ci', 'deployment', 'docs',
        'phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5', 'phase-6',
        'phase-7', 'phase-8', 'phase-9', 'phase-10', 'phase-11', 'phase-12',
        'misc', 'temp', 'any',
      ],
    ],
    'subject-case': [0],
    'subject-max-length': [1, 'always', 120],
    'subject-min-length': [1, 'always', 5],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [0],
  },
};
