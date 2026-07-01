// apps/frontend/playwright.config.ts
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
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},

	projects: [
		// ── Auth setup (runs first, saves sessions) ──────────────────────────
		{ name: 'setup-player',   testMatch: '**/auth/player.setup.e2e.ts' },
		{ name: 'setup-dm',       testMatch: '**/auth/dm.setup.e2e.ts' },

		// ── Desktop Chrome ────────────────────────────────────────────────────
		{
			name: 'desktop-chrome',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'tests/.auth/player.json',
			},
			dependencies: ['setup-player'],
			testIgnore: '**/auth/**',
		},

		// ── Desktop Firefox ───────────────────────────────────────────────────
		{
			name: 'desktop-firefox',
			use: {
				...devices['Desktop Firefox'],
				storageState: 'tests/.auth/player.json',
			},
			dependencies: ['setup-player'],
			testIgnore: '**/auth/**',
		},

		// ── Mobile Chrome (Pixel 5) ───────────────────────────────────────────
		{
			name: 'mobile-chrome',
			use: {
				...devices['Pixel 5'],
				storageState: 'tests/.auth/player.json',
			},
			dependencies: ['setup-player'],
			testIgnore: '**/auth/**',
		},

		// ── Mobile Safari (iPhone 12) ─────────────────────────────────────────
		{
			name: 'mobile-safari',
			use: {
				...devices['iPhone 12'],
				storageState: 'tests/.auth/player.json',
			},
			dependencies: ['setup-player'],
			testIgnore: '**/auth/**',
		},

		// ── DM-scoped tests (player with DM profile) ──────────────────────────
		{
			name: 'dm-chrome',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'tests/.auth/dm.json',
			},
			dependencies: ['setup-dm'],
			testMatch: '**/smoke/dm.e2e.ts',
		},
	],

	webServer: {
		command: 'pnpm dev',
		port: 5173,
		reuseExistingServer: true,
		timeout: 30_000,
	},
});
