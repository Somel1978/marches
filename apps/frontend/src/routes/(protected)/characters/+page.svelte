<!-- apps/frontend/src/routes/(protected)/characters/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

	const statusColors: Record<string, string> = {
		PENDING:   'badge-warning',
		ACTIVE:    'badge-success',
		RESTING:   'badge-accent',
		SUSPENDED: 'badge-danger',
		RETIRED:   'badge-muted',
		DECEASED:  'badge-muted',
	};

	function totalLevel(char: any) {
		return (char as any).level ?? char.classes?.reduce((s: number, c: any) => s + c.allocatedLevel, 0) ?? 0;
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">My Characters</h2>
			<p class="page__subtitle">
				{data.slotInfo.used} of {data.slotInfo.total} slots used
				{#if data.slotInfo.available > 0}
					· {data.slotInfo.available} available
				{/if}
			</p>
		</div>
		{#if data.slotInfo.available > 0}
			<a href="/characters/new" class="btn btn-primary">New character</a>
		{/if}
	</div>

	{#if data.characters.length === 0}
		<div class="card" style="text-align:center; padding:3rem;">
			<p style="font-size:2rem; margin-bottom:0.5rem;">⚔</p>
			<p style="color:var(--text-secondary);">No characters yet.</p>
			{#if data.slotInfo.available > 0}
				<a href="/characters/new" class="btn btn-primary">Create your first character</a>
			{/if}
		</div>
	{:else}
		<div class="character-grid">
			{#each data.characters as char}
				<a href="/characters/{char.id}" class="character-card card">
					<div class="character-card__portrait">
						{#if char.portraitUrl}
							<img src={char.portraitUrl} alt={char.name} class="character-card__img" />
						{:else if char.avatarUrl}
							<img src={char.avatarUrl} alt={char.name} class="character-card__img" />
						{:else}
							<div class="character-card__placeholder">⚔</div>
						{/if}
					</div>
					<div class="character-card__body">
						<div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; flex-wrap:wrap">
							<h3 class="character-card__name">{char.name}</h3>
							<span class="badge {statusColors[char.status] ?? 'badge-muted'}">{char.status}</span>
						</div>
						<p class="character-card__level">Level {totalLevel(char)}</p>
						{#if (char as any).dnd5eClasses?.length}
							<p class="character-card__classes">
								{(char as any).dnd5eClasses.map((c: any) => c.subclassName ? `${c.name} (${c.subclassName})` : c.name).join(' · ')}
							</p>
						{/if}
						<div class="character-card__stats">
							<span>{char.totalXp.toLocaleString()} XP</span>
							<span>{char.totalGold.toLocaleString()} GP</span>
							<span>{char.totalTokens.toLocaleString()} Tokens</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>