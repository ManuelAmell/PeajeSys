import { defineConfig } from '@playwright/test';

const chromiumExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ||
  (process.platform === 'linux' ? '/usr/bin/chromium' : undefined);

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5180',
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
