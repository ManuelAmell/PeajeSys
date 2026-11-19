import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    css: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        maxForks: 2,
        minForks: 1,
      },
    },
    maxWorkers: 2,
    minWorkers: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html'],
      include: [
        'src/lib/**',
        'src/components/**',
        'src/api/**',
        'src/mocks/**',
        'src/types/**',
        'src/features/**',
      ],
      exclude: [
        'src/components/ui/sonner.tsx',
        'src/mocks/browser.ts',
        'src/mocks/server.ts',
        'src/mocks/semilla.tipos.ts',
        'src/types/ddl.ts',
        '**/*.test.{ts,tsx}',
        'src/features/**/capturar-*.ts',
        'src/features/**/*.test.{ts,tsx}',
        'src/test/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
