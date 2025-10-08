module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      1, // downgrade from error to warning (2 -> 1)
      'always',
      [
        'feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'build', 'revert', 'phase',
        'wip', // work in progress
        'temp', // temporary
        'misc', // miscellaneous
      ],
    ],
    'scope-enum': [
      1, // warning instead of error
      'always',
      [
        'core', 'ui', 'api', 'auth', 'db', 'ci', 'deployment', 'docs',
        // phase-1...phase-12
        ...Array.from({ length: 12 }, (_, i) => `phase-${i+1}`),
        'misc', 'temp', 'any', // add more general scopes
      ],
    ],
    'subject-case': [0], // turn off lowercase requirement
    'subject-max-length': [1, 'always', 120], // allow longer subjects
    'subject-min-length': [1, 'always', 5], // allow shorter subjects
    'subject-empty': [2, 'never'],
    'subject-full-stop': [0], // allow period at the end
  },
};
