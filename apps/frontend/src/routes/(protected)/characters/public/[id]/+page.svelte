<!-- apps/frontend/src/routes/(protected)/characters/public/[id]/+page.svelte -->
<script lang="ts">
	import Dnd5eCardSection from './_cards/Dnd5eCardSection.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const character  = $derived((data as any).character);
	const charSheet  = $derived((data as any).charSheet);
	const systemData = $derived((data as any).systemData);
	const systemSlug = $derived((data as any).systemSlug ?? '');
</script>

<div class="page">
	<a href="/characters/public" class="back-link">← Characters</a>

	<div style="display:flex;justify-content:center;margin-top:1rem;">
		{#if character.isPrivate}
			<!-- Private — show minimal card -->
			<div style="text-align:center;padding:2rem;">
				{#if character.portraitUrl || character.avatarUrl}
					<img src={character.portraitUrl ?? character.avatarUrl} alt={character.name}
						style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:2px solid var(--color-accent);margin-bottom:0.75rem;" />
				{:else}
					<div style="width:120px;height:120px;border-radius:50%;background:var(--bg-overlay);display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin:0 auto 0.75rem;">🧙</div>
				{/if}
				<h2 style="font-size:1.25rem;font-weight:700;margin:0 0 0.25rem;">{character.name}</h2>
				<p style="font-size:0.8125rem;color:var(--text-muted);">This character's details are private.</p>
			</div>
		{:else if systemSlug === 'dnd5e'}
			<Dnd5eCardSection {character} {charSheet} {systemData} />
		{:else}
			<!-- Generic fallback for unknown/future systems -->
			<div class="card" style="max-width:420px;width:100%;text-align:center;padding:2rem;">
				{#if character.portraitUrl || character.avatarUrl}
					<img src={character.portraitUrl ?? character.avatarUrl} alt={character.name}
						style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:2px solid var(--color-accent);margin-bottom:0.75rem;" />
				{:else}
					<div style="width:120px;height:120px;border-radius:50%;background:var(--bg-overlay);display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin:0 auto 0.75rem;">🧙</div>
				{/if}
				<h2 style="font-size:1.375rem;font-weight:700;margin:0 0 0.25rem;">{character.name}</h2>
				<p style="font-size:0.8125rem;color:var(--text-muted);margin:0 0 0.5rem;">{character.user?.name ?? ''}</p>
				<span class="badge badge-muted">{character.gameSystem?.name ?? ''}</span>
			</div>
		{/if}
	</div>
</div>
