import { defineConfig, devices } from '@playwright/test';

import { api, base, reuse } from './tests/environment';

const selected = process.argv.filter(arg => arg.startsWith('--project=')).map(arg => arg.slice(10));
const needs = (kind: string) => !selected.length || selected.some(project => project === kind || project === `live-${kind}`);
export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: 0,
    workers: 2,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure', screenshot: 'only-on-failure' },
    projects: [
        { name: 'dev', testIgnore: '**/live.spec.ts', use: { baseURL: 'http://127.0.0.1:5173' } },
        { name: 'preview', testIgnore: '**/live.spec.ts', use: { baseURL: `http://127.0.0.1:4173${base}` } },
        { name: 'live-dev', testMatch: '**/live.spec.ts', use: { baseURL: 'http://127.0.0.1:5173' } },
        { name: 'live-preview', testMatch: '**/live.spec.ts', use: { baseURL: `http://127.0.0.1:4173${base}` } },
    ],
    webServer: [
        ...(needs('dev') ? [{ command: 'npm run dev', url: 'http://127.0.0.1:5173', env: { VITE_API_BASE_URL: api }, reuseExistingServer: reuse, gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 5000 } }] : []),
        ...(needs('preview') ? [{ command: `npm run build -- --base=${base} && npm run preview -- --base=${base}`, url: `http://127.0.0.1:4173${base}`, env: { VITE_API_BASE_URL: api }, reuseExistingServer: reuse, gracefulShutdown: { signal: 'SIGTERM' as const, timeout: 5000 } }] : []),
    ],
});
