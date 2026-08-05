<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+layout.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	const world     = $derived((data as any).world);
	const myWorlds  = $derived((data as any).myWorlds ?? []);
	const canManage = $derived((data as any).canManage === true);

	type NavItem = { href: string; label: string; manageOnly?: boolean };
	type NavSection = { id: string; label: string; items: NavItem[] };

	const sections = $derived.by((): NavSection[] => {
		const id = world.id as string;
		const all: NavSection[] = [
			{
				id: 'play',
				label: 'Play',
				items: [
					{ href: `/dm/worlds/${id}`, label: 'Dashboard' },
					{ href: `/dm/worlds/${id}/quests`, label: 'Quests' },
					{ href: `/dm/worlds/${id}/characters`, label: 'Characters' },
					{ href: `/dm/worlds/${id}/timeline`, label: 'Timeline' },
					{ href: `/dm/worlds/${id}/calendar`, label: 'Calendar', manageOnly: true },
				],
			},
			{
				id: 'economy',
				label: 'Economy',
				items: [
					{ href: `/dm/worlds/${id}/marketplace`, label: 'Marketplace', manageOnly: true },
					{ href: `/dm/worlds/${id}/token-store`, label: 'Token Store', manageOnly: true },
					{ href: `/dm/worlds/${id}/transactions`, label: 'Transactions' },
				],
			},
			{
				id: 'world',
				label: 'World Building',
				items: [
					{ href: `/dm/worlds/${id}/factions`, label: 'Factions' },
					{ href: `/dm/worlds/${id}/npcs`, label: 'NPCs' },
					{ href: `/dm/worlds/${id}/neural`, label: 'Neural', manageOnly: true },
					{ href: `/dm/worlds/${id}/plot-quests`, label: 'Plot Quests', manageOnly: true },
					{ href: `/dm/worlds/${id}/journal`, label: 'Journal', manageOnly: true },
				],
			},
			{
				id: 'config',
				label: 'Configuration',
				items: [
					{ href: `/dm/worlds/${id}/edit`, label: 'Settings', manageOnly: true },
					{ href: `/dm/worlds/${id}/progression`, label: 'Progression', manageOnly: true },
					{ href: `/dm/worlds/${id}/regions`, label: 'Regions', manageOnly: true },
					{ href: `/dm/worlds/${id}/audit`, label: 'Audit log', manageOnly: true },
				],
			},
		];

		return all
			.map(s => ({
				...s,
				items: s.items.filter(i => !i.manageOnly || canManage),
			}))
			.filter(s => s.items.length > 0);
	});

	function itemActive(href: string) {
		const path = $page.url.pathname;
		if (href === `/dm/worlds/${world.id}`) return path === href;
		return path === href || path.startsWith(href + '/');
	}

	function sectionForPath(): string {
		for (const s of sections) {
			for (const item of s.items) {
				if (itemActive(item.href)) return s.id;
			}
		}
		return sections[0]?.id ?? 'play';
	}

	/** Manual section pick (click); null = follow URL. */
	let pickedSection = $state<string | null>(null);

	const activeSectionId = $derived(pickedSection ?? sectionForPath());

	const activeSection = $derived(
		sections.find(s => s.id === activeSectionId) ?? sections[0],
	);

	// Reset manual pick when the route already belongs to that section (or changes away).
	$effect(() => {
		const fromUrl = sectionForPath();
		void $page.url.pathname;
		if (pickedSection && pickedSection === fromUrl) pickedSection = null;
	});

	function selectSection(section: NavSection) {
		pickedSection = section.id;
		const first = section.items[0];
		if (!first) return;
		// If current page isn't in this section, go to its first item.
		const inSection = section.items.some(i => itemActive(i.href));
		if (!inSection) void goto(first.href);
	}
</script>

<div class="page">
	<!-- World header with switcher -->
	<div class="page__header" style="margin-bottom:0;">
		<div>
			<div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
				{#if myWorlds.length > 1}
					<a href="/dm/worlds" class="back-link" style="margin:0;">◀ Worlds</a>
					<span style="color:var(--border-muted);">|</span>
				{/if}
				<h2 class="page__title" style="margin:0;">{world.name}</h2>
				{#if !world.isActive}<span class="badge badge-muted">Inactive</span>{/if}
				{#if !canManage}<span class="badge badge-muted" title="You have quest access only">Quest DM</span>{/if}
			</div>
		</div>
		{#if myWorlds.length > 1}
			<div>
				<select class="input input--select" style="width:auto;"
					onchange={(e) => { window.location.href = `/dm/worlds/${(e.target as HTMLSelectElement).value}`; }}>
					{#each myWorlds as w}
						<option value={(w as any).id} selected={(w as any).id === world.id}>{(w as any).name}</option>
					{/each}
				</select>
			</div>
		{/if}
	</div>

	<nav class="world-hub-nav" aria-label="World sections">
		<div class="world-hub-nav__sections" role="tablist" aria-label="Sections">
			{#each sections as section}
				<button
					type="button"
					role="tab"
					class="world-hub-nav__section"
					class:world-hub-nav__section--active={activeSectionId === section.id}
					aria-selected={activeSectionId === section.id}
					onclick={() => selectSection(section)}
				>{section.label}</button>
			{/each}
		</div>

		{#if activeSection}
			<div class="world-hub-nav__items" role="tabpanel" aria-label="{activeSection.label} pages">
				{#each activeSection.items as link}
					<a
						href={link.href}
						class="world-hub-nav__item"
						class:world-hub-nav__item--active={itemActive(link.href)}
					>{link.label}</a>
				{/each}
			</div>
		{/if}
	</nav>

	{@render children()}
</div>

<style>
	.world-hub-nav {
		margin: 1rem 0 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.world-hub-nav__sections,
	.world-hub-nav__items {
		display: flex;
		flex-wrap: nowrap;
		align-items: stretch;
		gap: 0.15rem;
		/* overflow-x:auto alone promotes overflow-y to auto — that shows a useless vertical scrollbar */
		overflow-x: auto;
		overflow-y: hidden;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: thin;
	}

	.world-hub-nav__sections {
		border-bottom: 1px solid var(--border-base);
		padding-bottom: 0;
	}

	.world-hub-nav__section {
		flex: 0 0 auto;
		appearance: none;
		border: none;
		background: transparent;
		color: var(--text-muted);
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		padding: 0.55rem 0.85rem;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		white-space: nowrap;
	}
	.world-hub-nav__section:hover { color: var(--text-primary); }
	.world-hub-nav__section--active {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}

	.world-hub-nav__items {
		padding: 0.4rem 0 0.15rem;
		gap: 0.25rem;
		border-bottom: 1px solid var(--border-muted);
	}

	.world-hub-nav__item {
		flex: 0 0 auto;
		display: inline-flex;
		align-items: center;
		padding: 0.4rem 0.75rem;
		border-radius: 99px;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-decoration: none;
		white-space: nowrap;
		border: 1px solid transparent;
	}
	.world-hub-nav__item:hover {
		color: var(--text-primary);
		background: var(--bg-muted);
	}
	.world-hub-nav__item--active {
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 14%, transparent);
		border-color: color-mix(in srgb, var(--accent) 35%, transparent);
	}

	@media (max-width: 640px) {
		.world-hub-nav__section {
			font-size: 0.75rem;
			padding: 0.5rem 0.7rem;
		}
		.world-hub-nav__item {
			font-size: 0.8125rem;
			padding: 0.35rem 0.65rem;
		}
	}
</style>
