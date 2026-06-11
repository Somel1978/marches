<!-- apps/frontend/src/routes/(protected)/token-store/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	const items       = $derived((data as any).items       ?? []);
	const activeChars = $derived((data as any).activeChars ?? []);
	let search = $state('');
	$effect.pre(() => { search = (data as any).search ?? ''; });
	let debounce: ReturnType<typeof setTimeout>;

	const rewardLabel: Record<string,string> = {
		XP_BOOST: '⭐ Quest XP Boost', GOLD_BOOST: '💰 Quest GP Boost', MANUAL: '📋 Special',
	};

	function onSearch() {
		clearTimeout(debounce);
		debounce = setTimeout(() => {
			goto(`/token-store${search ? '?search=' + encodeURIComponent(search) : ''}`, { replaceState: true });
		}, 300);
	}
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">🪙 Token Store</h2>
		<div class="field" style="margin:0;width:240px;">
			<input type="search" class="input" placeholder="Search items…" bind:value={search} oninput={onSearch} />
		</div>
	</div>

	{#if !activeChars.length}
		<div class="card" style="text-align:center;padding:2rem;">
			<p style="color:var(--text-muted);">You need an active character to purchase from the token store.</p>
		</div>
	{:else if !items.length}
		<p class="table__empty">No items available.</p>
	{:else}
		<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;">
			{#each items as item}
				<a href="/token-store/{item.id}" class="card" style="text-decoration:none;display:flex;flex-direction:column;gap:0.5rem;">
					{#if item.imageUrl}
						<div style="aspect-ratio:16/9;overflow:hidden;border-radius:var(--radius-sm);background:var(--bg-overlay);">
							<img src={item.imageUrl} alt={item.name} style="width:100%;height:100%;object-fit:cover;" />
						</div>
					{/if}
					<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;">
						<h3 style="font-size:1rem;font-weight:700;margin:0;">{item.name}</h3>
						<span style="font-weight:700;white-space:nowrap;color:var(--color-accent);">🪙 {item.tokenCost}</span>
					</div>
					{#if item.description}
						<p style="font-size:0.8125rem;color:var(--text-secondary);margin:0;">{item.description.slice(0,100)}{item.description.length > 100 ? '…' : ''}</p>
					{/if}
					<div style="display:flex;gap:0.375rem;flex-wrap:wrap;margin-top:auto;">
						<span class="badge badge-muted" style="font-size:0.6875rem;">{rewardLabel[item.rewardType] ?? item.rewardType}</span>
						{#if item.scope === 'WORLD'}<span class="badge badge-muted" style="font-size:0.6875rem;">🌐 World</span>{/if}
						{#if item.stock !== null}<span class="badge badge-muted" style="font-size:0.6875rem;">Stock: {item.stock}</span>{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>