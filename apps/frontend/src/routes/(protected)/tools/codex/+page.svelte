<!-- apps/frontend/src/routes/(protected)/tools/codex/+page.svelte -->
<script lang="ts">
	import {
		DescriptionText,
		Dnd5eSpellDetail,
		SpellDamageBadges,
		spellLevelLabel,
		spellDamageRaw,
	} from '@core/ui';
	import {
		FIELD_CATALOG, opsForKind, opLabel,
		filterClasses, filterSpecies, filterFlat,
		type CodexType, type FilterRow, type FieldDef, type FilterJoin,
	} from './codex-filter';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const TYPES: { id: CodexType; label: string }[] = [
		{ id: 'classes',     label: 'Classes' },
		{ id: 'species',     label: 'Species' },
		{ id: 'feats',       label: 'Feats' },
		{ id: 'backgrounds', label: 'Backgrounds' },
		{ id: 'spells',      label: 'Spells' },
	];

	let selectedTypes = $state<CodexType[]>([]);
	let nextFilterId  = $state(1);
	let filters       = $state<FilterRow[]>([]);

	function toggleType(t: CodexType) {
		if (selectedTypes.includes(t)) selectedTypes = selectedTypes.filter(x => x !== t);
		else selectedTypes = [...selectedTypes, t];
	}

	function addFilter() {
		const type = selectedTypes[0] ?? 'classes';
		const first = FIELD_CATALOG[type][0];
		filters = [...filters, {
			id: nextFilterId++,
			field: first.key,
			op: opsForKind(first.kind)[0],
			value: first.kind === 'boolean' ? 'true' : '',
			join: 'and',
		}];
	}

	function removeFilter(id: number) {
		filters = filters.filter(f => f.id !== id);
	}

	function clearFilters() {
		filters = [];
	}

	function onFieldChange(row: FilterRow) {
		const def = fieldsForFilters().find(f => f.key === row.field)
			?? Object.values(FIELD_CATALOG).flat().find(f => f.key === row.field);
		if (!def) return;
		const ops = opsForKind(def.kind);
		if (!ops.includes(row.op)) row.op = ops[0];
		if (def.kind === 'boolean' && row.value !== 'true' && row.value !== 'false') {
			row.value = 'true';
		}
	}

	function fieldsForFilters(): FieldDef[] {
		const types = selectedTypes.length ? selectedTypes : (['classes'] as CodexType[]);
		const seen = new Set<string>();
		const out: FieldDef[] = [];
		for (const t of types) {
			for (const fd of FIELD_CATALOG[t]) {
				if (seen.has(fd.key)) continue;
				seen.add(fd.key);
				out.push(fd);
			}
		}
		return out;
	}

	function fieldGroups(): { label: string; fields: FieldDef[] }[] {
		const list = fieldsForFilters();
		const order: string[] = [];
		const map = new Map<string, FieldDef[]>();
		for (const fd of list) {
			if (!map.has(fd.group)) {
				order.push(fd.group);
				map.set(fd.group, []);
			}
			map.get(fd.group)!.push(fd);
		}
		return order.map(label => ({ label, fields: map.get(label)! }));
	}

	function fieldDef(row: FilterRow): FieldDef {
		return fieldsForFilters().find(f => f.key === row.field)
			?? FIELD_CATALOG.classes[0];
	}

	const activeFilters = $derived(filters.filter(f => f.value.trim() !== ''));

	function filtersForType(type: CodexType): FilterRow[] | null {
		const keys = new Set(FIELD_CATALOG[type].map(f => f.key));
		if (activeFilters.length && !activeFilters.some(f => keys.has(f.field))) return null;

		const relevant: FilterRow[] = [];
		for (let i = 0; i < activeFilters.length; i++) {
			const row = activeFilters[i];
			if (!keys.has(row.field)) continue;
			const prevRelevant = i > 0 && keys.has(activeFilters[i - 1].field);
			relevant.push({
				...row,
				join: (relevant.length === 0 || !prevRelevant ? 'and' : row.join) as FilterJoin,
			});
		}
		return relevant;
	}

	const classResults = $derived.by(() => {
		if (!selectedTypes.includes('classes')) return [];
		const f = filtersForType('classes');
		if (f === null) return [];
		return filterClasses((data.codex as any).classes ?? [], f);
	});
	const speciesResults = $derived.by(() => {
		if (!selectedTypes.includes('species')) return [];
		const f = filtersForType('species');
		if (f === null) return [];
		return filterSpecies((data.codex as any).species ?? [], f);
	});
	const featResults = $derived.by(() => {
		if (!selectedTypes.includes('feats')) return [];
		const f = filtersForType('feats');
		if (f === null) return [];
		return filterFlat((data.codex as any).feats ?? [], 'feats', f);
	});
	const backgroundResults = $derived.by(() => {
		if (!selectedTypes.includes('backgrounds')) return [];
		const f = filtersForType('backgrounds');
		if (f === null) return [];
		return filterFlat((data.codex as any).backgrounds ?? [], 'backgrounds', f);
	});
	const spellResults = $derived.by(() => {
		if (!selectedTypes.includes('spells')) return [];
		const f = filtersForType('spells');
		if (f === null) return [];
		return filterFlat((data.codex as any).spells ?? [], 'spells', f);
	});

	const totalParents = $derived(
		classResults.length + speciesResults.length + featResults.length
		+ backgroundResults.length + spellResults.length,
	);

	function boolLabel(v: boolean | null | undefined) {
		if (v === true) return 'Yes';
		if (v === false) return 'No';
		return '—';
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">D&D 5e Codex</h2>
			<p class="page__subtitle">
				{(data.gameSystem as any).name} · structured search across classes, species, feats, backgrounds, and spells
			</p>
		</div>
		<span class="badge badge-muted">{totalParents} match{totalParents === 1 ? '' : 'es'}</span>
	</div>

	<!-- Search scope -->
	<div class="card">
		<h3 class="section-title">Search in</h3>
		<div class="wiz-chip-group" role="group" aria-label="Entity types">
			{#each TYPES as t}
				<button
					type="button"
					class="wiz-chip"
					class:wiz-chip--chosen={selectedTypes.includes(t.id)}
					onclick={() => toggleType(t.id)}
				>
					{t.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Filter builder -->
	<div class="card">
		<div class="codex-card__head">
			<h3 class="section-title">Filters</h3>
			<div class="toolbar">
				<button type="button" class="btn btn-ghost btn-sm" onclick={clearFilters} disabled={!filters.length}>Clear</button>
				<button type="button" class="btn btn-primary btn-sm" onclick={addFilter} disabled={!selectedTypes.length}>Add filter</button>
			</div>
		</div>

		{#if !filters.length}
			<p class="field-hint">No filters — showing all entries for the selected types. Combine rows with AND / OR.</p>
		{:else}
			<div class="codex-filters">
				{#each filters as row, idx (row.id)}
					{@const def = fieldDef(row)}
					{@const ops = opsForKind(def.kind)}
					{#if idx > 0}
						<div class="codex-filters__join">
							<div class="wiz-toggle" role="group" aria-label="Combine with previous filter">
								<button
									type="button"
									class="wiz-toggle__btn"
									class:wiz-toggle__btn--active={row.join === 'and'}
									onclick={() => { row.join = 'and'; }}
								>AND</button>
								<button
									type="button"
									class="wiz-toggle__btn"
									class:wiz-toggle__btn--active={row.join === 'or'}
									onclick={() => { row.join = 'or'; }}
								>OR</button>
							</div>
						</div>
					{/if}
					<div class="codex-filters__row">
						<div class="field">
							<label class="label" for="f-field-{row.id}">Field</label>
							<select
								id="f-field-{row.id}"
								class="input"
								bind:value={row.field}
								onchange={() => onFieldChange(row)}
							>
								{#each fieldGroups() as g}
									<optgroup label={g.label}>
										{#each g.fields as fd}
											<option value={fd.key}>{fd.label}</option>
										{/each}
									</optgroup>
								{/each}
							</select>
						</div>
						<div class="field codex-filters__op">
							<label class="label" for="f-op-{row.id}">Op</label>
							<select id="f-op-{row.id}" class="input" bind:value={row.op}>
								{#each ops as op}
									<option value={op}>{opLabel(op)}</option>
								{/each}
							</select>
						</div>
						<div class="field">
							<label class="label" for="f-val-{row.id}">Value</label>
							{#if def.kind === 'boolean'}
								<select id="f-val-{row.id}" class="input" bind:value={row.value}>
									<option value="true">Yes</option>
									<option value="false">No</option>
								</select>
							{:else}
								<input
									id="f-val-{row.id}"
									class="input"
									type={def.kind === 'number' ? 'number' : 'text'}
									bind:value={row.value}
									placeholder={def.kind === 'number' ? '0' : 'text…'}
								/>
							{/if}
						</div>
						<button
							type="button"
							class="btn btn-danger btn-sm codex-filters__remove"
							onclick={() => removeFilter(row.id)}
							aria-label="Remove filter"
						>Remove</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Results -->
	{#if !selectedTypes.length}
		<div class="card"><p class="table__empty">Select at least one type above.</p></div>
	{:else if totalParents === 0}
		<div class="card"><p class="table__empty">No matches for the current filters.</p></div>
	{:else}
		{#if selectedTypes.includes('classes') && classResults.length}
			<section class="card">
				<h3 class="section-title">Classes <span class="badge badge-muted">{classResults.length}</span></h3>
				<div class="codex-list">
					{#each classResults as hit}
						<details class="codex-item">
							<summary class="codex-item__summary">
								<span class="codex-item__title">{hit.parent.name}</span>
								{#if hit.parent.source}<span class="badge badge-muted">{hit.parent.source}</span>{/if}
								<span class="table__muted">d{hit.parent.hitDice ?? '?'} · {hit.features.length} features · {hit.subclasses.length} subclasses</span>
							</summary>
							<div class="codex-item__body">
								{#if hit.parent.description}
									<DescriptionText text={hit.parent.description} class="codex-desc" />
								{/if}
								{#if hit.parent.primaryAbilities}
									<p class="field-hint">Primary abilities: {hit.parent.primaryAbilities}</p>
								{/if}

								{#if hit.features.length}
									<h4 class="codex-subhead">Class features</h4>
									<ul class="codex-children">
										{#each hit.features as f}
											<li>
												<strong>L{f.requiredLevel} — {f.name}</strong>
												{#if f.description}<DescriptionText text={f.description} class="codex-desc" />{/if}
											</li>
										{/each}
									</ul>
								{/if}

								{#if hit.subclasses.length}
									<h4 class="codex-subhead">Subclasses</h4>
									<div class="codex-nested">
										{#each hit.subclasses as sc}
											<details class="codex-item">
												<summary class="codex-item__summary">
													<span class="codex-item__title">{sc.parent.name}</span>
													{#if sc.parent.source}<span class="badge badge-muted">{sc.parent.source}</span>{/if}
												</summary>
												<div class="codex-item__body">
													{#if sc.parent.description}
														<DescriptionText text={sc.parent.description} class="codex-desc" />
													{/if}
													{#if sc.features.length}
														<ul class="codex-children">
															{#each sc.features as f}
																<li>
																	<strong>L{f.requiredLevel} — {f.name}</strong>
																	{#if f.description}<DescriptionText text={f.description} class="codex-desc" />{/if}
																</li>
															{/each}
														</ul>
													{/if}
												</div>
											</details>
										{/each}
									</div>
								{/if}
							</div>
						</details>
					{/each}
				</div>
			</section>
		{/if}

		{#if selectedTypes.includes('species') && speciesResults.length}
			<section class="card">
				<h3 class="section-title">Species <span class="badge badge-muted">{speciesResults.length}</span></h3>
				<div class="codex-list">
					{#each speciesResults as hit}
						<details class="codex-item">
							<summary class="codex-item__summary">
								<span class="codex-item__title">{hit.parent.name}</span>
								{#if hit.parent.isSubrace}<span class="badge badge-accent">Subrace</span>{/if}
								{#if hit.parent.source}<span class="badge badge-muted">{hit.parent.source}</span>{/if}
								<span class="table__muted">{hit.traits.length} traits</span>
							</summary>
							<div class="codex-item__body">
								{#if hit.parent.description}
									<DescriptionText text={hit.parent.description} class="codex-desc" />
								{/if}
								{#if hit.traits.length}
									<h4 class="codex-subhead">Traits</h4>
									<ul class="codex-children">
										{#each hit.traits as t}
											<li>
												<strong>{t.name}</strong>
												{#if t.requiredLevel}<span class="table__muted"> · L{t.requiredLevel}+</span>{/if}
												{#if t.size}<span class="table__muted"> · {t.size}</span>{/if}
												{#if t.description}<DescriptionText text={t.description} class="codex-desc" />{/if}
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						</details>
					{/each}
				</div>
			</section>
		{/if}

		{#if selectedTypes.includes('feats') && featResults.length}
			<section class="card">
				<h3 class="section-title">Feats <span class="badge badge-muted">{featResults.length}</span></h3>
				<div class="codex-list">
					{#each featResults as f}
						<details class="codex-item">
							<summary class="codex-item__summary">
								<span class="codex-item__title">{f.name}</span>
								{#if f.isEpicBoon}<span class="badge badge-accent">Epic Boon</span>{/if}
								{#if f.categories}<span class="badge badge-muted">{f.categories}</span>{/if}
							</summary>
							<div class="codex-item__body">
								{#if f.prerequisites}<p class="field-hint">Prerequisites: {f.prerequisites}</p>{/if}
								{#if f.snippet}<p class="codex-desc"><em>{f.snippet}</em></p>{/if}
								{#if f.description}<DescriptionText text={f.description} class="codex-desc" />{/if}
								<p class="field-hint">Repeatable: {boolLabel(f.repeatable)}{#if f.source} · {f.source}{/if}</p>
							</div>
						</details>
					{/each}
				</div>
			</section>
		{/if}

		{#if selectedTypes.includes('backgrounds') && backgroundResults.length}
			<section class="card">
				<h3 class="section-title">Backgrounds <span class="badge badge-muted">{backgroundResults.length}</span></h3>
				<div class="codex-list">
					{#each backgroundResults as b}
						<details class="codex-item">
							<summary class="codex-item__summary">
								<span class="codex-item__title">{b.name}</span>
								{#if b.featureName}<span class="table__muted">{b.featureName}</span>{/if}
							</summary>
							<div class="codex-item__body">
								{#if b.shortDescription}<DescriptionText text={b.shortDescription} class="codex-desc" />{/if}
								{#if b.grantsSkills}<p class="field-hint">Skills: {b.grantsSkills}</p>{/if}
								{#if b.grantsTools || b.toolProficiencies}
									<p class="field-hint">Tools: {b.grantsTools ?? b.toolProficiencies}</p>
								{/if}
								{#if b.grantsLanguages || b.languages}
									<p class="field-hint">Languages: {b.grantsLanguages ?? b.languages}</p>
								{/if}
								{#if b.grantsFeat?.name}<p class="field-hint">Grants feat: {b.grantsFeat.name}</p>{/if}
							</div>
						</details>
					{/each}
				</div>
			</section>
		{/if}

		{#if selectedTypes.includes('spells') && spellResults.length}
			<section class="card">
				<h3 class="section-title">Spells <span class="badge badge-muted">{spellResults.length}</span></h3>
				<div class="codex-list">
					{#each spellResults as s}
						<details class="codex-item">
							<summary class="codex-item__summary">
								<span class="codex-item__title">{s.name}</span>
								<span class="badge badge-muted">{spellLevelLabel(s.level)}</span>
								{#if s.school}<span class="badge badge-muted">{s.school}</span>{/if}
								{#if s.concentration}<span class="badge badge-muted">Conc.</span>{/if}
								{#if s.ritual}<span class="badge badge-muted">Ritual</span>{/if}
								<SpellDamageBadges raw={spellDamageRaw(s)} size="sm" />
							</summary>
							<div class="codex-item__body">
								<Dnd5eSpellDetail spell={s} canViewDescriptions={true} />
							</div>
						</details>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<style>
	.codex-card__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}
	.codex-card__head .section-title { margin: 0; }

	.codex-filters {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.codex-filters__join {
		display: flex;
		justify-content: flex-start;
	}
	.codex-filters__row {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(6.5rem, 0.7fr) minmax(0, 1.4fr) auto;
		gap: 0.75rem;
		align-items: end;
	}
	.codex-filters__op { min-width: 0; }
	.codex-filters__remove { align-self: end; }
	@media (max-width: 720px) {
		.codex-filters__row {
			grid-template-columns: 1fr 1fr;
		}
		.codex-filters__remove { grid-column: 1 / -1; justify-self: start; }
	}

	.codex-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.section-title .badge {
		margin-left: 0.5rem;
		vertical-align: middle;
	}

	.codex-item {
		border: 1px solid var(--border-muted);
		border-radius: var(--radius-md);
		background: var(--bg-overlay);
		overflow: hidden;
	}
	.codex-item + .codex-item { margin-top: 0.5rem; }

	.codex-item__summary {
		cursor: pointer;
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		transition: background var(--transition-fast);
	}
	.codex-item__summary::-webkit-details-marker { display: none; }
	.codex-item__summary::before {
		content: '▸';
		color: var(--text-muted);
		transition: transform 0.15s ease;
		flex-shrink: 0;
	}
	.codex-item[open] > .codex-item__summary {
		background: var(--bg-muted);
		border-bottom: 1px solid var(--border-muted);
	}
	.codex-item[open] > .codex-item__summary::before { transform: rotate(90deg); }
	.codex-item__summary:hover { background: var(--bg-muted); }

	.codex-item__title {
		font-weight: 600;
		color: var(--text-primary);
	}
	.codex-item__body {
		padding: 0.875rem 1rem 1rem;
		background: var(--bg-surface);
	}

	:global(.codex-desc) {
		margin: 0.375rem 0 0;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}
	.codex-subhead {
		margin: 1rem 0 0.5rem;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.codex-subhead:first-child { margin-top: 0; }

	.codex-children {
		margin: 0;
		padding-left: 1.125rem;
		font-size: 0.875rem;
		color: var(--text-primary);
	}
	.codex-children li + li { margin-top: 0.625rem; }

	.codex-nested {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-left: 0.25rem;
		padding-left: 0.75rem;
		border-left: 2px solid var(--border-accent);
	}
	.codex-nested .codex-item {
		background: var(--bg-surface);
	}

</style>
