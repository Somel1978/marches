<!-- apps/frontend/src/routes/(protected)/dm/worlds/[worldId]/+layout.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	const world      = $derived((data as any).world);
	const myWorlds   = $derived((data as any).myWorlds ?? []);
	const canManage  = $derived((data as any).canManage === true);

	// Tabs always visible
	const baseTabs = $derived([
		{ href: `/dm/worlds/${world.id}`,            label: 'Dashboard'   },
		{ href: `/dm/worlds/${world.id}/quests`,     label: 'Quests'      },
		{ href: `/dm/worlds/${world.id}/characters`, label: 'Characters'  },
		{ href: `/dm/worlds/${world.id}/transactions`, label: 'Transactions' },
		{ href: `/dm/worlds/${world.id}/factions`,   label: 'Factions'    },
		{ href: `/dm/worlds/${world.id}/npcs`,       label: 'NPCs'        },
	]);

	// Tabs only visible when canManage = true
	const manageTabs = $derived(canManage ? [
		{ href: `/dm/worlds/${world.id}/edit`,        label: 'Settings'    },
		{ href: `/dm/worlds/${world.id}/regions`,     label: 'Regions'     },
		{ href: `/dm/worlds/${world.id}/marketplace`, label: 'Marketplace' },
		{ href: `/dm/worlds/${world.id}/token-store`, label: 'Token Store' },
		{ href: `/dm/worlds/${world.id}/journal`,     label: 'Journal'     },
		{ href: `/dm/worlds/${world.id}/audit`,       label: 'Audit log'   },
	] : []);

	const navLinks = $derived([...baseTabs, ...manageTabs]);

	function isActive(href: string) {
		if (href === `/dm/worlds/${world.id}`) return $page.url.pathname === href;
		return $page.url.pathname.startsWith(href);
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

	<!-- Sub-navigation -->
	<div class="tabs" style="margin-bottom:1.5rem; margin-top:1rem; border-bottom:1px solid var(--border-muted); overflow-x:auto;">
		{#each navLinks as link}
			<a href={link.href} class="tab {isActive(link.href) ? 'tab--active' : ''}">{link.label}</a>
		{/each}
	</div>

	{@render children()}
</div>