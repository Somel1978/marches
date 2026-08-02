<!-- shared/ui/src/gamesystems/dnd5e/Dnd5eSpellbooks.svelte -->
<!-- Pure UI component — no SvelteKit imports. All actions via callbacks. -->
<script lang="ts">
	import { confirmModal } from '../../../components/ui/confirm-modal-singleton.ts';
	import {
		spellOrdinal as ordinal,
		spellLevelLabel as levelLabel,
		spellDamageRaw,
	} from './spell-display.ts';
	import Dnd5eSpellDetail from './Dnd5eSpellDetail.svelte';
	import SpellDamageBadges from './SpellDamageBadges.svelte';
	let {
		charSheet, systemData, spellbooks = [],
		onCreateSpellbook, onRenameSpellbook, onDeleteSpellbook,
		onAddEntry, onRemoveEntry, onTogglePrepared,
		canEdit = false,
		canViewDescriptions = false,
	}: {
		charSheet?: any; systemData?: any; spellbooks?: any[];
		onCreateSpellbook?:  (name: string) => Promise<void>;
		onRenameSpellbook?:  (id: string, name: string) => Promise<void>;
		onDeleteSpellbook?:  (id: string) => Promise<void>;
		onAddEntry?:         (spellbookId: string, spellId: number, classId: string, className: string) => Promise<void>;
		onRemoveEntry?:      (entryId: string) => Promise<void>;
		onTogglePrepared?:   (entryId: string, prepared: boolean) => Promise<void>;
		canEdit?: boolean;
		canViewDescriptions?: boolean;
	} = $props();

	// ── Computed data ─────────────────────────────────────────────────────────
	const spellcastingClasses = $derived(
		(charSheet?.enrichedClasses ?? []).filter((cc: any) =>
			cc.classRef?.canCastSpells || cc.subclassRef?.canCastSpells
		)
	);
	const hasAnySpellcasting = $derived(spellcastingClasses.length > 0);
	const slotProgressions   = $derived((systemData?.spellSlotProgressions  ?? []) as any[]);
	const knownProgressions  = $derived((systemData?.spellsKnownProgressions ?? []) as any[]);
	const allSpells          = $derived((systemData?.spells ?? []) as any[]);

	// Combined multiclass slots
	const combinedSlots = $derived.by(() => {
		const contributions: { level: number }[] = [];
		for (const cc of spellcastingClasses) {
			const isClassCaster = !!cc.classRef?.canCastSpells;
			const subclassId    = cc.subclassId ?? '';
			const row = isClassCaster
				? slotProgressions.find((r: any) => r.classId === cc.classId && (!r.subclassId || r.subclassId === '') && r.classLevel === cc.allocatedLevel)
				: slotProgressions.find((r: any) => r.subclassId === subclassId && r.classLevel === cc.allocatedLevel);
			if (!row || row.casterType === 'PACT') continue;
			const lvl = cc.allocatedLevel as number;
			let c = 0;
			if      (row.casterType === 'FULL')  c = lvl;
			else if (row.casterType === 'HALF')  c = Math.floor(lvl / 2);
			else if (row.casterType === 'THIRD') c = Math.floor(lvl / 3);
			if (c > 0) contributions.push({ level: c });
		}
		if (!contributions.length) return null;
		const combined = contributions.reduce((s, c) => s + c.level, 0);
		const fullTable = slotProgressions.filter((r: any) => r.casterType === 'FULL' && (!r.subclassId || r.subclassId === ''));
		const lookupRow = fullTable.find((r: any) => r.classLevel === Math.min(combined, 20));
		if (!lookupRow) return null;
		return { combined, row: lookupRow };
	});

	const pactSlots = $derived.by(() => {
		for (const cc of spellcastingClasses) {
			const isClassCaster = !!cc.classRef?.canCastSpells;
			const subclassId    = cc.subclassId ?? '';
			const row = isClassCaster
				? slotProgressions.find((r: any) => r.classId === cc.classId && (!r.subclassId || r.subclassId === '') && r.classLevel === cc.allocatedLevel)
				: slotProgressions.find((r: any) => r.subclassId === subclassId && r.classLevel === cc.allocatedLevel);
			if (row?.casterType === 'PACT') return row;
		}
		return null;
	});

	function getKnownLimits(cc: any) {
		const isClassCaster = !!cc.classRef?.canCastSpells;
		const subclassId    = cc.subclassId ?? '';
		return isClassCaster
			? knownProgressions.find((r: any) => r.classId === cc.classId && (!r.subclassId || r.subclassId === '') && r.classLevel === cc.allocatedLevel)
			: knownProgressions.find((r: any) => r.subclassId === subclassId && r.classLevel === cc.allocatedLevel);
	}

	function spellsForClass(cc: any) {
		const name    = cc.classRef?.name    ?? '';
		const subName = cc.subclassRef?.name ?? '';
		return allSpells.filter((s: any) => {
			if (!s.spellList) return false;
			const list = s.spellList.split(',').map((n: string) => n.trim().toLowerCase());
			return list.includes(name.toLowerCase()) || (subName && list.includes(subName.toLowerCase()));
		});
	}

	function bookEntries(book: any, cc: any) {
		return (book.entries ?? []).filter((e: any) => e.classId === cc.classId);
	}

	function displayName(cc: any) {
		const base = cc.classRef?.name ?? cc.classId;
		const sub  = cc.subclassRef?.name;
		return sub ? `${base} (${sub})` : base;
	}

	// ── UI state ──────────────────────────────────────────────────────────────
	let activeBook     = $state(0);
	let activeClassIdx = $state<Record<string, number>>({});
	let expandedEntry  = $state<string | null>(null);
	let showNewBook    = $state(false);
	let renamingBook   = $state<string | null>(null);
	let renameVal      = $state('');
	let newBookName    = $state('Spellbook');
	let saving         = $state(false);

	// Picker filters
	let pickerSearch  = $state<Record<string, string>>({});
	let pickerLevel   = $state<Record<string, string>>({});
	let pickerSchool  = $state<Record<string, string>>({});
	let pickerConc    = $state<Record<string, boolean>>({});
	let pickerRitual  = $state<Record<string, boolean>>({});
	let addingEntry   = $state<Record<string, boolean>>({});

	function getActiveCC(bookId: string) {
		const idx = activeClassIdx[bookId] ?? 0;
		return spellcastingClasses[Math.min(idx, spellcastingClasses.length - 1)] ?? null;
	}

	const SCHOOLS = ['Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'];

	function filteredPicker(bookId: string, classSpells: any[], entries: any[]) {
		const srch   = (pickerSearch[bookId] ?? '').toLowerCase();
		const level  = pickerLevel[bookId]  ?? '';
		const school = pickerSchool[bookId] ?? '';
		const conc   = pickerConc[bookId]   ?? false;
		const ritual = pickerRitual[bookId] ?? false;
		return classSpells.filter((s: any) => {
			if (entries.some((e: any) => e.spellId === s.spellId)) return false;
			if (srch   && !s.name.toLowerCase().includes(srch)) return false;
			if (level  !== '') {
				const l = level === 'Cantrip' ? 0 : Number(level);
				if (s.level !== l) return false;
			}
			if (school && s.school !== school) return false;
			if (conc   && !s.concentration) return false;
			if (ritual && !s.ritual)        return false;
			return true;
		});
	}

	function groupByLevel(spells: any[]) {
		const map = new Map<number, any[]>();
		for (const s of spells) {
			if (!map.has(s.level)) map.set(s.level, []);
			map.get(s.level)!.push(s);
		}
		return [...map.entries()].sort((a, b) => a[0] - b[0]);
	}

	async function handleCreate() {
		if (!newBookName.trim() || saving) return;
		saving = true;
		await onCreateSpellbook?.(newBookName.trim());
		newBookName = 'Spellbook'; showNewBook = false; saving = false;
	}
	async function handleRename(id: string) {
		if (!renameVal.trim() || saving) return;
		saving = true;
		await onRenameSpellbook?.(id, renameVal.trim());
		renamingBook = null; saving = false;
	}
	async function handleDelete(id: string) {
		saving = true; await onDeleteSpellbook?.(id); saving = false;
	}
	async function handleAddEntry(bookId: string, cc: any, spellId: number) {
		saving = true;
		await onAddEntry?.(bookId, spellId, cc.classId, cc.classRef?.name ?? cc.classId);
		saving = false;
	}
	async function handleRemoveEntry(entryId: string, spellName: string) {
		if (!await confirmModal('Remove Spell', `Remove "${spellName}" from this spellbook?`)) return;
		saving = true; await onRemoveEntry?.(entryId); saving = false;
	}
	async function handleToggle(entryId: string, prepared: boolean) {
		saving = true; await onTogglePrepared?.(entryId, prepared); saving = false;
	}
</script>

<div>
	{#if !hasAnySpellcasting}
		<p class="table__empty">This character has no spellcasting classes.</p>
	{:else}

		<!-- ── Slot summary ─────────────────────────────────────────────────── -->
		{#if combinedSlots || pactSlots}
			<div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-bottom:1.25rem;">
				{#if combinedSlots}
					<div style="padding:0.75rem 1rem;background:var(--bg-overlay);border-radius:var(--radius-md);flex:1;min-width:240px;">
						<p style="margin:0 0 0.5rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);">
							Spell Slots{spellcastingClasses.length > 1 ? ` — caster level ${combinedSlots.combined}` : ''}
						</p>
						<div style="display:flex;gap:0.375rem;flex-wrap:wrap;">
							{#each [1,2,3,4,5,6,7,8,9] as sl}
								{@const count = combinedSlots.row[`slot${sl}`] ?? 0}
								{#if count > 0}
									<div style="padding:0.375rem 0.625rem;background:rgba(184,115,74,0.15);border-radius:var(--radius-sm);text-align:center;min-width:44px;">
										<p style="margin:0;font-size:0.6875rem;color:var(--text-muted);">{ordinal(sl)}</p>
										<p style="margin:0;font-size:1.0625rem;font-weight:700;color:var(--brand-accent);">{count}</p>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
				{#if pactSlots}
					<div style="padding:0.75rem 1rem;background:var(--bg-overlay);border-radius:var(--radius-md);">
						<p style="margin:0 0 0.5rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Pact Magic</p>
						<div style="display:flex;gap:0.375rem;flex-wrap:wrap;">
							{#each [1,2,3,4,5] as sl}
								{@const count = pactSlots[`slot${sl}`] ?? 0}
								{#if count > 0}
									<div style="padding:0.375rem 0.625rem;background:rgba(142,68,173,0.15);border-radius:var(--radius-sm);text-align:center;min-width:44px;">
										<p style="margin:0;font-size:0.6875rem;color:var(--text-muted);">{ordinal(sl)}</p>
										<p style="margin:0;font-size:1.0625rem;font-weight:700;color:#8E44AD;">{count}</p>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- ── Book tabs ─────────────────────────────────────────────────────── -->
		<div style="display:flex;gap:0.375rem;margin-bottom:0.75rem;flex-wrap:wrap;align-items:center;">
			{#each spellbooks as book, i}
				<button class="btn btn-sm" class:btn-primary={activeBook===i} class:btn-ghost={activeBook!==i}
					onclick={() => activeBook = i}>{book.name}</button>
			{/each}
			{#if canEdit && spellbooks.length < 3}
				<button class="btn btn-ghost btn-sm" onclick={() => showNewBook = !showNewBook}>+ New</button>
			{/if}
		</div>

		{#if showNewBook && canEdit}
			<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.75rem;padding:0.625rem;background:var(--bg-overlay);border-radius:var(--radius-md);">
				<input type="text" class="input" style="max-width:220px;" bind:value={newBookName} placeholder="Spellbook name" />
				<button class="btn btn-primary btn-sm" onclick={handleCreate} disabled={saving}>Create</button>
				<button class="btn btn-ghost btn-sm"  onclick={() => showNewBook = false}>Cancel</button>
			</div>
		{/if}

		{#if spellbooks.length === 0 && canEdit}
			<div class="card" style="padding:1.25rem;text-align:center;">
				<p class="table__empty">No spellbooks yet.</p>
				{#if !showNewBook}
					<button class="btn btn-primary btn-sm" onclick={() => showNewBook = true}>+ Create Spellbook</button>
				{/if}
			</div>
		{/if}

		<!-- ── Active book ────────────────────────────────────────────────────── -->
		{#each spellbooks as book, i}
			{#if activeBook === i}
				{@const bookId = book.id}

				<!-- Book header -->
				<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.875rem;flex-wrap:wrap;">
					{#if renamingBook === bookId}
						<input type="text" class="input" style="max-width:200px;" bind:value={renameVal} />
						<button class="btn btn-primary btn-sm" onclick={() => handleRename(bookId)} disabled={saving}>Save</button>
						<button class="btn btn-ghost btn-sm"  onclick={() => renamingBook = null}>Cancel</button>
					{:else}
						<h4 style="margin:0;font-size:1rem;font-weight:700;">{book.name}</h4>
						{#if canEdit}
							<button class="btn btn-ghost btn-sm" onclick={() => { renamingBook = bookId; renameVal = book.name; }}>Rename</button>
							<button class="btn btn-ghost btn-sm" style="color:var(--color-danger);"  onclick={() => handleDelete(bookId)} disabled={saving}>Delete</button>
						{/if}
					{/if}
				</div>

				<!-- Class tabs -->
				<div style="display:flex;gap:0.375rem;margin-bottom:0.875rem;flex-wrap:wrap;">
					{#each spellcastingClasses as cc, ci}
						<button class="btn btn-sm"
							class:btn-primary={(activeClassIdx[bookId] ?? 0) === ci}
							class:btn-ghost={(activeClassIdx[bookId] ?? 0) !== ci}
							onclick={() => activeClassIdx = { ...activeClassIdx, [bookId]: ci }}>
							{displayName(cc)}
						</button>
					{/each}
				</div>

				{@const cc         = getActiveCC(bookId)}
				{#if cc}
					{@const limits     = getKnownLimits(cc)}
					{@const entries    = bookEntries(book, cc)}
					{@const classSpells = spellsForClass(cc)}
					{@const cantripCnt = entries.filter((e: any) => allSpells.find((s: any) => s.spellId === e.spellId)?.level === 0).length}
					{@const spellCnt   = entries.filter((e: any) => e.prepared && (allSpells.find((s: any) => s.spellId === e.spellId)?.level ?? 0) > 0).length}

					{@const maxSpellLevel = (() => {
						const isClassCaster = !!cc.classRef?.canCastSpells;
						const subclassId    = cc.subclassId ?? '';
						const row = isClassCaster
							? slotProgressions.find((r: any) => r.classId === cc.classId && (!r.subclassId || r.subclassId === '') && r.classLevel === cc.allocatedLevel)
							: slotProgressions.find((r: any) => r.subclassId === subclassId && r.classLevel === cc.allocatedLevel);
						if (!row) return 0;
						for (let s = 9; s >= 1; s--) { if ((row[`slot${s}`] ?? 0) > 0) return s; }
						return 0;
					})()}

					<!-- Limits -->
					<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.875rem;font-size:0.8125rem;">
						{#if limits?.cantrips != null}
							<span style="padding:0.25rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-sm);">
								Cantrips: <strong style="color:{cantripCnt > limits.cantrips ? 'var(--color-danger)' : 'var(--color-success)'};">{cantripCnt}</strong> / {limits.cantrips}
							</span>
						{/if}
						{#if limits?.prepared != null}
							<span style="padding:0.25rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-sm);">
								Prepared: <strong style="color:{spellCnt > limits.prepared ? 'var(--color-danger)' : 'var(--color-success)'};">{spellCnt}</strong> / {limits.prepared}
							</span>
						{:else if limits?.note}
							<!-- note: formula-based prep (e.g. "WIS mod + Cleric level") — 2014 rules only, not used in 2024. Kept for backward compatibility. -->
							<span style="padding:0.25rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-sm);color:var(--text-muted);">
								{limits.note} · <strong>{spellCnt}</strong> prepared
							</span>
						{/if}
						{#if maxSpellLevel > 0}
							<span style="padding:0.25rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-sm);">
								Max Spell Level: <strong style="color:var(--brand-accent);">{ordinal(maxSpellLevel)}</strong>
							</span>
						{/if}
					</div>

					<!-- ── Spell entries ───────────────────────────────────────── -->
					{#if entries.length > 0}
						<div style="display:flex;flex-direction:column;gap:0.375rem;margin-bottom:0.875rem;">
							{#each entries as entry}
								{@const sp = allSpells.find((s: any) => s.spellId === entry.spellId)}
								{#if sp}
									{@const isExpanded = expandedEntry === entry.id}
									<div style="background:var(--bg-overlay);border-radius:var(--radius-md);overflow:hidden;border:1px solid {isExpanded ? 'var(--border-accent)' : 'transparent'};">

										<!-- Collapsed header -->
										<button type="button" style="width:100%;text-align:left;background:none;border:none;cursor:pointer;padding:0.75rem 0.875rem;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;"
											onclick={() => expandedEntry = isExpanded ? null : entry.id}>
											<span style="font-weight:700;font-size:1rem;flex:1;min-width:140px;">{sp.name}</span>
											<span class="badge badge-muted">{sp.level === 0 ? 'Cantrip' : `${ordinal(sp.level)} lvl`}</span>
											<span class="badge badge-muted">{sp.school}</span>
											{#if sp.concentration}<span class="badge badge-muted">Conc.</span>{/if}
											{#if sp.ritual}<span class="badge badge-muted">Ritual</span>{/if}
											<SpellDamageBadges raw={spellDamageRaw(sp)} size="sm" />
											<span style="color:var(--text-muted);font-size:0.875rem;">{isExpanded ? '▲' : '▼'}</span>
										</button>

										<!-- Expanded body -->
										{#if isExpanded}
											<div style="padding:0.875rem;border-top:1px solid var(--border-muted);display:flex;flex-direction:column;gap:0.875rem;">
												<Dnd5eSpellDetail spell={sp} {canViewDescriptions} />
												<div style="display:flex;gap:0.375rem;justify-content:flex-end;flex-wrap:wrap;">
													{#if sp.level > 0}
														<button type="button" class="btn btn-sm" class:btn-primary={entry.prepared} class:btn-ghost={!entry.prepared}
															onclick={() => handleToggle(entry.id, !entry.prepared)}>
															{entry.prepared ? '✓ Prepared' : 'Prepare'}
														</button>
													{/if}
													{#if canEdit}
														<button type="button" class="btn btn-danger btn-sm" onclick={() => handleRemoveEntry(entry.id, sp.name)}>Remove</button>
													{/if}
												</div>
											</div>
										{:else}
											<!-- Collapsed quick-actions -->
											{#if sp.level > 0 || canEdit}
												<div style="padding:0 0.875rem 0.625rem;display:flex;gap:0.375rem;">
													{#if sp.level > 0}
														<button class="btn btn-sm" class:btn-primary={entry.prepared} class:btn-ghost={!entry.prepared}
															onclick={() => handleToggle(entry.id, !entry.prepared)}>
															{entry.prepared ? '✓ Prepared' : 'Prepare'}
														</button>
													{/if}
													{#if canEdit}
														<button class="btn btn-ghost btn-sm" style="color:var(--color-danger);margin-left:auto;" onclick={() => handleRemoveEntry(entry.id, sp.name)}>✕</button>
													{/if}
												</div>
											{/if}
										{/if}
									</div>
								{/if}
							{/each}
						</div>
					{/if}

					<!-- ── Add spell picker ─────────────────────────────────── -->
					{#if canEdit}
						{#if addingEntry[bookId]}
							<div style="border:1px solid var(--border-muted);border-radius:var(--radius-md);overflow:hidden;">
								<!-- Filter bar -->
								<div style="padding:0.625rem;background:var(--bg-overlay);display:flex;flex-wrap:wrap;gap:0.375rem;border-bottom:1px solid var(--border-muted);">
									<input type="text" class="input" style="flex:1;min-width:140px;font-size:0.875rem;" placeholder="Search spells…"
										value={pickerSearch[bookId] ?? ''}
										oninput={(e) => pickerSearch = { ...pickerSearch, [bookId]: (e.target as HTMLInputElement).value }} />
									<select class="input input--select" style="max-width:110px;font-size:0.8125rem;"
										value={pickerLevel[bookId] ?? ''}
										onchange={(e) => pickerLevel = { ...pickerLevel, [bookId]: (e.target as HTMLSelectElement).value }}>
										<option value="">All Levels</option>
										<option value="Cantrip">Cantrip</option>
										{#each [1,2,3,4,5,6,7,8,9] as n}<option value={String(n)}>{ordinal(n)}</option>{/each}
									</select>
									<select class="input input--select" style="max-width:130px;font-size:0.8125rem;"
										value={pickerSchool[bookId] ?? ''}
										onchange={(e) => pickerSchool = { ...pickerSchool, [bookId]: (e.target as HTMLSelectElement).value }}>
										<option value="">All Schools</option>
										{#each SCHOOLS as s}<option value={s}>{s}</option>{/each}
									</select>
									<label style="display:flex;align-items:center;gap:0.25rem;font-size:0.8125rem;cursor:pointer;white-space:nowrap;">
										<input type="checkbox" checked={pickerConc[bookId] ?? false}
											onchange={(e) => pickerConc = { ...pickerConc, [bookId]: (e.target as HTMLInputElement).checked }} />
										Conc.
									</label>
									<label style="display:flex;align-items:center;gap:0.25rem;font-size:0.8125rem;cursor:pointer;white-space:nowrap;">
										<input type="checkbox" checked={pickerRitual[bookId] ?? false}
											onchange={(e) => pickerRitual = { ...pickerRitual, [bookId]: (e.target as HTMLInputElement).checked }} />
										Ritual
									</label>
									<button class="btn btn-ghost btn-sm" onclick={() => addingEntry = { ...addingEntry, [bookId]: false }}>✕ Close</button>
								</div>

								<!-- Results grouped by level -->
								<div style="max-height:320px;overflow-y:auto;">
									{#if true}
										{@const filtered = filteredPicker(bookId, classSpells, entries)}
										{@const groups   = groupByLevel(filtered)}
										{#if groups.length === 0}
										<p style="padding:1rem;font-size:0.875rem;color:var(--text-muted);text-align:center;">No spells match filters.</p>
									{:else}
										{#each groups as [lvl, spells]}
											<div style="position:sticky;top:0;background:var(--bg-surface);padding:0.25rem 0.75rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);border-bottom:1px solid var(--border-muted);">
												{levelLabel(lvl)}
											</div>
											{#each spells as sp}
												<button type="button" style="width:100%;text-align:left;padding:0.5rem 0.75rem;background:none;border:none;border-bottom:1px solid var(--border-muted);cursor:pointer;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;"
													onclick={() => handleAddEntry(bookId, cc, sp.spellId)}>
													<span style="font-weight:600;font-size:0.9375rem;flex:1;min-width:120px;">{sp.name}</span>
													<span style="font-size:0.8125rem;color:var(--text-muted);">{sp.school}</span>
													{#if sp.concentration}<span class="badge badge-muted" style="font-size:0.625rem;">Conc.</span>{/if}
													{#if sp.ritual}<span class="badge badge-muted" style="font-size:0.625rem;">Ritual</span>{/if}
													<SpellDamageBadges raw={spellDamageRaw(sp)} size="sm" />
													<span style="font-size:0.8125rem;color:var(--brand-accent);font-weight:700;">+</span>
												</button>
											{/each}
										{/each}
									{/if}
									{/if}
								</div>
							</div>
						{:else}
							<button class="btn btn-ghost btn-sm" onclick={() => addingEntry = { ...addingEntry, [bookId]: true }}>+ Add Spell</button>
						{/if}
					{/if}
				{/if}
			{/if}
		{/each}
	{/if}
</div>