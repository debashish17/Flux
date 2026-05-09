import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.test' });

export default defineConfig({
    testDir: './tests-e2e',
    fullyParallel: false,    // most tests share a single test user
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list']],

    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },

    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],

    // Auto-start the dev server when running `npm run e2e`
    webServer: process.env.E2E_NO_SERVER
        ? undefined
        : {
            command: 'npm run dev',
            url: 'http://localhost:5173',
            reuseExistingServer: true,
            timeout: 120_000,
        },
});
