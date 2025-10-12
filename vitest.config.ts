import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Full config with GitHub Codespaces-safe HMR
export default defineConfig({
  plugins: [react()],

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./client/src/test/setup.ts'],
    include: [
      'client/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'server/**/*.{test,spec}.{js,ts}',
      'shared/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      'coverage',
      'public'
    ],
    coverage: {
      provider: 'v8',
      enabled: true,
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      reportsDirectory: './coverage',
      all: true,
      include: [
        'client/src/**/*.{js,jsx,ts,tsx}',
        'server/**/*.{js,ts}',
        'shared/**/*.{js,ts}'
      ],
      exclude: [
        'node_modules',
        '**/test/**',
        '**/tests/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/types/**',
        '**/*.d.ts',
        '**/vite.config.*',
        '**/vitest.config.*',
        '**/drizzle.config.*',
        '**/tailwind.config.*',
        '**/postcss.config.*',
        'server/vite.ts',
        'client/src/main.tsx',
        'server/index.ts',
        'dist',
        'coverage',
        '**/*.config.{js,ts}',
        'server/templates/**',
        'migrations/**'
      ],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
        autoUpdate: false,
        perFile: false
      },
      clean: true,
      skipFull: false
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    isolate: true,
    threads: true,
    mockReset: true,
    restoreMocks: true,
    clearMocks: true
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@server': path.resolve(__dirname, './server'),
      '@lib': path.resolve(__dirname, './client/src/lib'),
      '@components': path.resolve(__dirname, './client/src/components'),
      '@hooks': path.resolve(__dirname, './client/src/hooks'),
      '@pages': path.resolve(__dirname, './client/src/pages'),
      '@assets': path.resolve(__dirname, './attached_assets')
    }
  },

  define: {
    'process.env': {}
  },

  server: {
    host: true,
    port: 5000,
    // Fix HMR inside GitHub Codespaces
    hmr: process.env.CODESPACE_NAME
      ? {
          protocol: 'wss',
          host: `${process.env.CODESPACE_NAME}-5000.app.github.dev`,
          clientPort: 443
        }
      : {
          protocol: 'ws',
          host: 'localhost',
          port: 5000
        },
    deps: {
      inline: ['@radix-ui/*']
    }
  }
});
