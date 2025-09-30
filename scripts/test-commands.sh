#!/bin/bash

# Test command scripts for Vitest
# Since package.json cannot be edited, use these commands directly

case "$1" in
  "test")
    npx vitest
    ;;
  "test:ui")
    npx vitest --ui
    ;;
  "test:run")
    npx vitest run
    ;;
  "test:watch")
    npx vitest --watch
    ;;
  "test:coverage")
    npx vitest run --coverage
    ;;
  "test:coverage:check")
    npx vitest run --coverage --coverage.thresholdAutoUpdate=false
    ;;
  "test:coverage:watch")
    npx vitest --coverage --watch
    ;;
  "test:coverage:ui")
    npx vitest --coverage --ui
    ;;
  *)
    echo "Usage: $0 {test|test:ui|test:run|test:watch|test:coverage|test:coverage:check|test:coverage:watch|test:coverage:ui}"
    exit 1
    ;;
esac