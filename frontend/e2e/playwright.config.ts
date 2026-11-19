import { defineConfig } from '@playwright/test';

const chromiumExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium';

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5187',
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
});
