import { defineConfig } from '@playwright/test';
import { rutaChromium } from './scripts/plataforma';

const chromiumExecutable = rutaChromium();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5180',
    trace: 'off',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: chromiumExecutable,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    },
  },
  projects: [
    {
      name: 'escritorio',
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'movil',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: 'pnpm build:mocks && pnpm preview --port 5180 --strictPort',
    port: 5180,
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },
});
