<!-- apps/frontend/src/routes/(protected)/characters/public/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const characters = $derived((data as any).characters ?? []);
	let q = $state('');
	$effect.pre(() => { q = (data as any).q ?? ''; });
	let debounce: ReturnType<typeof setTimeout>;

	function onSearch() {
		clearTimeout(debounce);
		debounce = setTimeout(() => {
			goto(`/characters/public?q=${encodeURIComponent(q)}`, { replaceState: true });
		}, 300);
	}
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">🧙 Character Directory</h2>
		<div class="field" style="margin:0;width:280px;">
			<input
				type="search"
				class="input"
				placeholder="Search by name or player…"
				bind:value={q}
				oninput={onSearch}
			/>
		</div>
	</div>

	{#if !characters.length}
		<p class="table__empty">No characters found.</p>
	{:else}
		<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;">
			{#each characters as char}
				<a href="/characters/public/{char.id}" class="char-directory-card" style="text-decoration:none;">
					<div class="char-directory-card__portrait">
						{#if char.portraitUrl || char.avatarUrl}
							<img src={char.portraitUrl ?? char.avatarUrl} alt={char.name} />
						{:else}
							<div class="char-directory-card__portrait-placeholder">🧙</div>
						{/if}
					</div>
					<div class="char-directory-card__info">
						<p class="char-directory-card__name">{char.name}</p>
						<p class="char-directory-card__player">{char.user?.name ?? ''}</p>
						<div style="display:flex;gap:0.375rem;flex-wrap:wrap;margin-top:0.25rem;">
							{#if char.gameSystem}<span class="badge badge-muted" style="font-size:0.625rem;">{char.gameSystem.name}</span>{/if}
							{#if char.isPrivate}
								<span class="badge badge-muted" style="font-size:0.625rem;">🔒 Private</span>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>