<!-- shared/ui/src/gamesystems/dnd5e/Dnd5eCharacterCard.svelte -->
<!-- Read-only public character card. No SvelteKit imports. -->
<script lang="ts">
	let {
		character,
		charSheet,
		systemData,
	}: {
		character:  any;
		charSheet:  any;
		systemData: any;
	} = $props();

	// charSheet shape: { sheet, enrichedClasses, speciesRef, backgroundRef, asiSlots, chosenFeats, abilityScores }
	const abilityScores   = $derived((charSheet?.abilityScores ?? []) as any[]);
	const enrichedClasses = $derived((charSheet?.enrichedClasses ?? []) as any[]);
	const chosenFeats     = $derived((charSheet?.chosenFeats ?? []) as any[]);
	const speciesRef      = $derived(charSheet?.speciesRef ?? null);
	const backgroundRef   = $derived(charSheet?.backgroundRef ?? null);

	// Ability scores map — stat enum is STRENGTH/DEXTERITY etc, card uses str/dex etc
	const STAT_MAP: Record<string,string> = {
		STRENGTH:'str', DEXTERITY:'dex', CONSTITUTION:'con',
		INTELLIGENCE:'int', WISDOM:'wis', CHARISMA:'cha',
	};
	const stats = $derived(
		Object.fromEntries(abilityScores.map((s: any) => [STAT_MAP[s.stat] ?? s.stat.toLowerCase(), s.baseScore ?? s.value ?? 10]))
	);

	const STATS = ['str','dex','con','int','wis','cha'] as const;
	const STAT_LABEL: Record<string,string> = { str:'STR', dex:'DEX', con:'CON', int:'INT', wis:'WIS', cha:'CHA' };

	function mod(score: number): string {
		const m = Math.floor((score - 10) / 2);
		return m >= 0 ? `+${m}` : `${m}`;
	}

	// Class line from enrichedClasses
	const classLine = $derived(
		enrichedClasses.map((ec: any) => {
			const sub = ec.subclassRef?.name;
			return sub ? `${ec.classRef?.name ?? ''} (${sub})` : (ec.classRef?.name ?? '');
		}).filter(Boolean).join(' / ')
	);

	const speciesName     = $derived(speciesRef?.name ?? '');
	const backgroundName  = $derived(backgroundRef?.name ?? '');

	// Total level
	const totalLevel = $derived(
		enrichedClasses.reduce((s: number, ec: any) => s + (ec.allocatedLevel ?? 0), 0)
	);

	// Proficiency bonus from level
	const profBonus = $derived(Math.ceil(totalLevel / 4) + 1);

	// Features from all enriched classes (class + subclass features)
	const allFeatures = $derived(
		enrichedClasses.flatMap((ec: any) => [
			...(ec.classFeatures ?? []).map((f: any) => ({ ...f, source: ec.classRef?.name ?? '' })),
			...(ec.subclassFeatures ?? []).map((f: any) => ({ ...f, source: ec.subclassRef?.name ?? '' })),
		])
	);

	// Feats (non-ASI)
	const featList = $derived(
		chosenFeats.filter((f: any) => f.feat?.name !== 'Ability Score Improvement').slice(0, 4)
	);

	// Inventory from universal character model
	const inventory = $derived((charSheet?.inventory ?? []) as any[]);

	// Campaign name from systemData or character
	const campaignName = $derived((systemData?.platformName ?? 'THE BINDER & BREW').toUpperCase());
</script>

<div class="char-card">
	<!-- Header -->
	<div class="char-card__header">
		<div class="char-card__campaign">{campaignName}</div>
		<div class="char-card__subtitle">CHARACTER DOSSIER</div>
		<div class="char-card__divider">⚔</div>
	</div>

	<!-- Portrait -->
	{#if character.portraitUrl || character.avatarUrl}
		<div class="char-card__portrait">
			<img src={character.portraitUrl ?? character.avatarUrl} alt={character.name} />
		</div>
	{/if}

	<!-- Name + identity -->
	<div class="char-card__identity">
		<h2 class="char-card__name">{character.name}</h2>
		<p class="char-card__identity-line">
			{[speciesName, classLine].filter(Boolean).join(' | ')}
		</p>
		{#if backgroundName}
			<p class="char-card__identity-line" style="font-size:0.75rem;margin-top:0.125rem;">{backgroundName}</p>
		{/if}
	</div>

	<!-- Ability scores -->
	<div class="char-card__stats">
		{#each STATS as st}
			<div class="char-card__stat-box">
				<div class="char-card__stat-label">{STAT_LABEL[st]}</div>
				<div class="char-card__stat-value">{stats[st] ?? 10}</div>
				<div class="char-card__stat-mod">{mod(stats[st] ?? 10)}</div>
			</div>
		{/each}
	</div>

	<!-- Combat stats — level and proficiency only (HP/AC not tracked yet) -->
	<div class="char-card__combat">
		<div class="char-card__combat-badge">Level: {totalLevel}</div>
		<div class="char-card__combat-badge">Proficiency: +{profBonus}</div>
	</div>

	<!-- Two-column lower section -->
	<div class="char-card__lower">
		<!-- Features & Traits -->
		<div class="char-card__section">
			<div class="char-card__section-title">FEATURES &amp; TRAITS</div>
			{#if allFeatures.length}
				{#each allFeatures.slice(0, 5) as feat}
					<div class="char-card__feature">
						<span class="char-card__feature-name">{feat.name}</span>
						{#if feat.source}
							<span class="char-card__feature-desc"> ({feat.source})</span>
						{/if}
					</div>
				{/each}
			{:else}
				<p style="font-size:0.6875rem;color:var(--text-muted);margin:0;">None yet</p>
			{/if}
		</div>

		<!-- Feats & Key Abilities -->
		<div class="char-card__section">
			<div class="char-card__section-title">FEATS &amp; KEY ABILITIES</div>
			{#if featList.length}
				{#each featList as feat}
					<div class="char-card__feature">
						<span class="char-card__feature-name">{feat.feat?.name ?? ''}</span>
						{#if feat.feat?.snippet}
							<span class="char-card__feature-desc"> – {feat.feat.snippet.slice(0, 60)}{feat.feat.snippet.length > 60 ? '…' : ''}</span>
						{/if}
					</div>
				{/each}
			{:else}
				<p style="font-size:0.6875rem;color:var(--text-muted);margin:0;">None yet</p>
			{/if}
		</div>
	</div>

	<!-- Inventory -->
	{#if inventory.length}
		<div class="char-card__inventory">
			<div class="char-card__section-title">INVENTORY</div>
			<div class="char-card__inventory-cols">
				<div>
					{#each inventory.slice(0, 4) as item}
						<div class="char-card__inventory-item">{item.itemName}{item.quantity > 1 ? ` (×${item.quantity})` : ''}</div>
					{/each}
				</div>
				<div>
					{#each inventory.slice(4, 8) as item}
						<div class="char-card__inventory-item">{item.itemName}{item.quantity > 1 ? ` (×${item.quantity})` : ''}</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>