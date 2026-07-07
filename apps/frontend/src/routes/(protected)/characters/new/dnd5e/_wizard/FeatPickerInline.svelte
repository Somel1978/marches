<!-- apps/frontend/src/routes/(protected)/characters/new/dnd5e/_wizard/FeatPickerInline.svelte -->
<!--
	Generic search + browse + preview + select feat picker. Replaces 3
	near-duplicate implementations that used to exist: the background
	feat-category browser, the feature/trait feat-grant browser, and the
	ASI-step feat browser.

	Two modes:
	- "immediate" (default): clicking a row selects it right away (used by
	  background feat pick and feature/trait feat grants).
	- "preview": clicking a row only previews it; a separate "Select" button
	  commits the choice (used by ASI/Epic Boon slots, where committing also
	  needs to trigger side effects like ASI stat auto-fill in the parent).
-->
<script lang="ts">
	let {
		feats,
		selectedId,
		onSelect,
		search = $bindable(''),
		mode = 'immediate',
		previewId = $bindable(''),
		canViewDescriptions = true,
		emptyHint = 'Select a feat to view details.',
		searchPlaceholder = 'Search feats…',
	}: {
		feats: any[];
		selectedId: string;
		onSelect: (featId: string) => void;
		search?: string;
		mode?: 'immediate' | 'preview';
		previewId?: string;
		canViewDescriptions?: boolean;
		emptyHint?: string;
		searchPlaceholder?: string;
	} = $props();

	const filtered = $derived(feats.filter((f: any) => !search || f.name.toLowerCase().includes(search.toLowerCase())));
	const activeId = $derived(mode === 'preview' ? (previewId || selectedId) : selectedId);
	const activeFeat = $derived(feats.find((f: any) => f.id === activeId) ?? null);

	function rowClick(featId: string) {
		if (mode === 'preview') previewId = featId;
		else onSelect(featId);
	}
	function commitPreview() {
		if (activeFeat) onSelect(activeFeat.id);
		if (mode === 'preview') previewId = '';
	}
</script>

<div class="wiz-browser wiz-browser--compact">
	<div class="wiz-browser__list">
		<div class="wiz-browser__search">
			<input type="text" placeholder={searchPlaceholder} bind:value={search} />
		</div>
		<div class="wiz-browser__rows">
			{#each filtered as feat (feat.id)}
				<button type="button" class="wiz-row" class:wiz-row--selected={activeId === feat.id}
					onclick={() => rowClick(feat.id)}>
					<div class="wiz-row__body">
						<p class="wiz-row__name">{feat.name}</p>
						<div class="wiz-row__sub">
							{#if feat.isEpicBoon}<span class="wiz-tag wiz-tag--epic">Epic Boon</span>{/if}
							{#each (feat.categories ?? '').split(',').map((s: string) => s.trim()).filter(Boolean) as cat}
								<span class="wiz-tag wiz-tag--general">{cat}</span>
							{/each}
						</div>
					</div>
					{#if selectedId === feat.id}<span class="wiz-row__check">✓</span>{/if}
				</button>
			{/each}
		</div>
	</div>
	<div class="wiz-browser__panel">
		{#if activeFeat}
			<h4 class="wiz-panel__title" style="font-size:0.9375rem;">{activeFeat.name}</h4>
			{#if activeFeat.prerequisites}<p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 6px;">Prereq: {activeFeat.prerequisites}</p>{/if}
			{#if canViewDescriptions && activeFeat.description}
				<p class="wiz-panel__desc">{activeFeat.description}</p>
			{:else if !canViewDescriptions}
				<p class="wiz-panel__desc" style="font-style:italic;color:var(--text-muted);">📖 Description not available — contact your DM.</p>
			{/if}
			{#if mode === 'preview'}
				<div class="wiz-panel__commit">
					{#if selectedId === activeFeat.id}
						<button type="button" class="btn btn-ghost btn-sm" style="width:100%;border-color:var(--border-accent);color:var(--accent-light);" disabled>✓ Selected</button>
					{:else}
						<button type="button" class="btn btn-primary btn-sm" style="width:100%;" onclick={commitPreview}>Select {activeFeat.name}</button>
					{/if}
				</div>
			{:else if selectedId === activeFeat.id}
				<p style="font-size:0.75rem;color:var(--color-success);font-weight:600;">✓ Selected</p>
			{/if}
		{:else}
			<div class="wiz-browser__empty" style="min-height:80px;">
				<p>{emptyHint}</p>
			</div>
		{/if}
	</div>
</div>
