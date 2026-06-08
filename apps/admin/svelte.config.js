// apps/admin/svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},

	kit: {
		adapter: adapter(),
		// CSRF is handled by Better Auth's trustedOrigins — no need for SvelteKit's check.
		csrf: { trustedOrigins: [] },
	}
};

export default config;