// apps/admin/svelte.config.js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isProd = process.env.NODE_ENV === 'production';

const { default: adapter } = isProd
	? await import('@sveltejs/adapter-node')
	: await import('@sveltejs/adapter-auto');

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},

	kit: {
		adapter: adapter(),
		csrf: {
			trustedOrigins: (process.env.TRUSTED_ORIGINS ?? '').split(',').map(o => o.trim()).filter(Boolean),
		},
	}
};

export default config;