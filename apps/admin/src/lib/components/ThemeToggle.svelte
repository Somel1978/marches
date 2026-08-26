<!-- apps/admin/src/lib/components/ThemeToggle.svelte -->
<!-- Compact header theme picker for admin. Applies the chosen theme
     immediately (optimistic) and persists it via POST /api/theme —
     mirrors the pattern used on the frontend profile page, scoped
     down for a header dropdown instead of a full settings page. -->
<script lang="ts">
	import { getAvailableThemes, validateTheme } from '$lib/themes';

	let { currentTheme }: { currentTheme: string } = $props();

	const themes = getAvailableThemes();

	let open   = $state(false);
	let active = $state(validateTheme(currentTheme));

	function toggle() { open = !open; }

	async function select(key: string) {
		if (key === active) { open = false; return; }
		active = key;
		open = false;
		document.documentElement.setAttribute('data-theme', key);

		const fd = new FormData();
		fd.append('theme', key);
		try {
			await fetch('/api/theme', { method: 'POST', body: fd });
		} catch {
			/* Theme still applied client-side; persistence retried on next change. */
		}
	}

	function onWindowClick(e: MouseEvent) {
		if (!open) return;
		const el = e.target as HTMLElement;
		if (!el.closest('.theme-toggle')) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} />

<div class="theme-toggle">
	<button type="button" class="theme-toggle__btn" onclick={toggle} aria-label="Change theme" title="Change theme">
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
			<circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
			<circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
			<circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
			<path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h2.3c1.9 0 3.4-1.5 3.4-3.4C21 6.7 17.1 2 12 2z" />
		</svg>
	</button>

	{#if open}
		<div class="theme-toggle__menu">
			{#each themes as theme}
				<button
					type="button"
					class="theme-toggle__item"
					class:theme-toggle__item--active={active === theme.key}
					onclick={() => select(theme.key)}
				>
					<span class="theme-toggle__swatch" style="background:{theme.bgBase}; border-color:{theme.accent};">
						<span style="background:{theme.accent};"></span>
					</span>
					{theme.name}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.theme-toggle { position: relative; }

	.theme-toggle__btn {
		display: flex; align-items: center; justify-content: center;
		width: 36px; height: 36px; border-radius: var(--radius-md);
		background: transparent; border: 1px solid var(--border-base);
		color: var(--text-secondary); cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.theme-toggle__btn:hover { background: var(--bg-overlay); color: var(--text-primary); }

	.theme-toggle__menu {
		position: absolute; top: calc(100% + 6px); right: 0; z-index: 50;
		min-width: 180px; max-height: 320px; overflow-y: auto;
		background: var(--bg-overlay); border: 1px solid var(--border-base);
		border-radius: var(--radius-md); box-shadow: 0 8px 24px rgba(0,0,0,0.35);
		padding: 4px;
	}

	.theme-toggle__item {
		display: flex; align-items: center; gap: 8px; width: 100%;
		padding: 6px 8px; border-radius: var(--radius-sm); border: none;
		background: transparent; color: var(--text-secondary);
		font-size: 0.8125rem; text-align: left; cursor: pointer;
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.theme-toggle__item:hover { background: var(--bg-muted); color: var(--text-primary); }
	.theme-toggle__item--active { color: var(--text-primary); font-weight: 600; }

	.theme-toggle__swatch {
		flex-shrink: 0; width: 16px; height: 16px; border-radius: 50%;
		border: 1.5px solid; display: flex; align-items: center; justify-content: center;
	}
	.theme-toggle__swatch span {
		width: 8px; height: 8px; border-radius: 50%;
	}
</style>
