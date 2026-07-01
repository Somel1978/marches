// apps/admin/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	testMatch: '**/*.e2e.ts',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

	use: {
		baseURL: 'http://localhost:5174',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},

	projects: [
		// ── Auth setup ────────────────────────────────────────────────────────
		{ name: 'setup-admin', testMatch: '**/auth/admin.setup.e2e.ts' },

		// ── Desktop Chrome ────────────────────────────────────────────────────
		{
			name: 'desktop-chrome',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'tests/.auth/admin.json',
			},
			dependencies: ['setup-admin'],
			testIgnore: '**/auth/**',
		},

		// ── Desktop Firefox ───────────────────────────────────────────────────
		{
			name: 'desktop-firefox',
			use: {
				...devices['Desktop Firefox'],
				storageState: 'tests/.auth/admin.json',
			},
			dependencies: ['setup-admin'],
			testIgnore: '**/auth/**',
		},

		// ── Mobile Chrome ─────────────────────────────────────────────────────
		{
			name: 'mobile-chrome',
			use: {
				...devices['Pixel 5'],
				storageState: 'tests/.auth/admin.json',
			},
			dependencies: ['setup-admin'],
			testIgnore: '**/auth/**',
		},

		// ── Mobile Safari ─────────────────────────────────────────────────────
		{
			name: 'mobile-safari',
			use: {
				...devices['iPhone 12'],
				storageState: 'tests/.auth/admin.json',
			},
			dependencies: ['setup-admin'],
			testIgnore: '**/auth/**',
		},
	],

	webServer: {
		command: 'pnpm dev --port 5174',
		port: 5174,
		reuseExistingServer: true,
		timeout: 30_000,
	},
});
