<!-- shared/ui/src/gamesystems/dnd5e/Dnd5eSpellbooks.svelte -->
<!-- Pure UI component — all actions via callbacks. No SvelteKit imports. -->
<script lang="ts">
	let {
		charSheet,
		systemData,
		spellbooks       = [],
		onCreateSpellbook,
		onRenameSpellbook,
		onDeleteSpellbook,
		onAddEntry,
		onRemoveEntry,
		onTogglePrepared,
		canEdit          = false,
	}: {
		charSheet?:           any;
		systemData?:          any;
		spellbooks?:          any[];
		onCreateSpellbook?:   (name: string) => Promise<void>;
		onRenameSpellbook?:   (id: string, name: string) => Promise<void>;
		onDeleteSpellbook?:   (id: string) => Promise<void>;
		onAddEntry?:          (spellbookId: string, spellId: number, classId: string, className: string) => Promise<void>;
		onRemoveEntry?:       (entryId: string) => Promise<void>;
		onTogglePrepared?:    (entryId: string, prepared: boolean) => Promise<void>;
		canEdit?:             boolean;
	} = $props();

	// ── Computed ─────────────────────────────────────────────────────────────

	// All spellcasting classes the character has
	const spellcastingClasses = $derived(
		(charSheet?.characterClasses ?? []).filter((cc: any) => cc.classRef?.canCastSpells)
	);

	const hasAnySpellcasting = $derived(spellcastingClasses.length > 0);

	// Slot progressions from systemData keyed by classId
	const slotProgressions = $derived((systemData?.spellSlotProgressions ?? []) as any[]);
	const knownProgressions = $derived((systemData?.spellsKnownProgressions ?? []) as any[]);

	// Compute multiclass combined slots
	// Warlock pact slots are separate; others sum fractional levels and look up FULL table
	const combinedSlots = $derived.by(() => {
		const nonPact = spellcastingClasses.filter((cc: any) => {
			const classSlots = slotProgressions.filter((r: any) => r.classId === cc.classId);
			return classSlots.length > 0 && classSlots[0]?.casterType !== 'PACT';
		});
		if (nonPact.length === 0) return null;

		// Sum fractional caster levels
		let combined = 0;
		for (const cc of nonPact) {
			const classSlots = slotProgressions.filter((r: any) => r.classId === cc.classId);
			if (!classSlots.length) continue;
			const type  = classSlots[0].casterType as string;
			const level = cc.allocatedLevel as number;
			if (type === 'FULL')  combined += level;
			else if (type === 'HALF')  combined += Math.floor(level / 2);
			else if (type === 'THIRD') combined += Math.floor(level / 3);
		}
		if (combined === 0) return null;

		// Find the FULL caster table to look up combined level
		// We use the first FULL caster's progression table as the reference
		const fullTable = slotProgressions.filter((r: any) => r.casterType === 'FULL');
		if (!fullTable.length) return null;

		// Find the row matching the combined caster level
		const row = fullTable.find((r: any) => r.classLevel === Math.min(combined, 20));
		if (!row) return null;
		return { combined, row };
	});

	// Warlock pact slots
	const warlockClass = $derived(
		spellcastingClasses.find((cc: any) => {
			const classSlots = slotProgressions.filter((r: any) => r.classId === cc.classId);
			return classSlots[0]?.casterType === 'PACT';
		}) ?? null
	);
	const pactSlots = $derived.by(() => {
		if (!warlockClass) return null;
		const row = slotProgressions.find((r: any) => r.classId === warlockClass.classId && r.classLevel === warlockClass.allocatedLevel);
		return row ?? null;
	});

	// All available spells from systemData
	const allSpells = $derived((systemData?.spells ?? []) as any[]);

	// ── UI state ──────────────────────────────────────────────────────────────
	let activeBook     = $state(0);
	let activeClass    = $state<Record<string, string>>({});  // bookId → classId
	let spellSearch    = $state<Record<string, string>>({});  // bookId → query
	let addingEntry    = $state<Record<string, boolean>>({});
	let newBookName    = $state('Spellbook');
	let showNewBook    = $state(false);
	let renamingBook   = $state<string | null>(null);
	let renameVal      = $state('');
	let saving         = $state(false);

	function levelLabel(n: number) { return n === 0 ? 'Cantrip' : `Lv ${n}`; }

	function getActiveClass(bookId: string) {
		return activeClass[bookId] ?? spellcastingClasses[0]?.classId ?? '';
	}

	function getSearch(bookId: string) { return spellSearch[bookId] ?? ''; }

	function spellsForClass(classId: string) {
		const cc = spellcastingClasses.find((c: any) => c.classId === classId);
		if (!cc) return [];
		const className = cc.classRef?.name ?? '';
		return allSpells.filter((s: any) => {
			if (!s.spellList) return false;
			return s.spellList.split(',').map((n: string) => n.trim().toLowerCase()).includes(className.toLowerCase());
		});
	}

	function knownLimits(classId: string, level: number) {
		return knownProgressions.find((r: any) => r.classId === classId && r.classLevel === level) ?? null;
	}

	function bookEntries(book: any, classId: string) {
		return (book.entries ?? []).filter((e: any) => e.classId === classId);
	}

	function countCantrips(book: any, classId: string) {
		return bookEntries(book, classId).filter((e: any) => {
			const sp = allSpells.find((s: any) => s.spellId === e.spellId);
			return sp?.level === 0;
		}).length;
	}

	function countSpells(book: any, classId: string) {
		return bookEntries(book, classId).filter((e: any) => {
			const sp = allSpells.find((s: any) => s.spellId === e.spellId);
			return sp && sp.level > 0;
		}).length;
	}

	async function handleCreate() {
		if (!newBookName.trim() || saving) return;
		saving = true;
		await onCreateSpellbook?.(newBookName.trim());
		newBookName = 'Spellbook';
		showNewBook = false;
		saving = false;
	}

	async function handleRename(id: string) {
		if (!renameVal.trim() || saving) return;
		saving = true;
		await onRenameSpellbook?.(id, renameVal.trim());
		renamingBook = null;
		saving = false;
	}

	async function handleDelete(id: string) {
		if (saving) return;
		saving = true;
		await onDeleteSpellbook?.(id);
		saving = false;
	}

	async function handleAddEntry(bookId: string, classId: string, className: string, spellId: number) {
		if (saving) return;
		saving = true;
		await onAddEntry?.(bookId, spellId, classId, className);
		saving = false;
	}

	async function handleRemoveEntry(entryId: string) {
		if (saving) return;
		saving = true;
		await onRemoveEntry?.(entryId);
		saving = false;
	}

	async function handleToggle(entryId: string, prepared: boolean) {
		if (saving) return;
		saving = true;
		await onTogglePrepared?.(entryId, prepared);
		saving = false;
	}
</script>

<div>
	{#if !hasAnySpellcasting}
		<p class="table__empty">This character has no spellcasting classes.</p>
	{:else}

		<!-- Combined slot display -->
		{#if combinedSlots || pactSlots}
			<div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-bottom:1rem;">
				{#if combinedSlots}
					<div style="padding:0.625rem 0.875rem;background:var(--bg-overlay);border-radius:var(--radius-md);flex:1;min-width:250px;">
						<p style="margin:0 0 0.375rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);">
							Combined Spell Slots
							<span style="font-weight:400;color:var(--text-muted);text-transform:none;"> (caster level {combinedSlots.combined})</span>
						</p>
						<div style="display:flex;gap:0.375rem;flex-wrap:wrap;">
							{#each [1,2,3,4,5,6,7,8,9] as sl}
								{@const count = (combinedSlots.row as any)[`slot${sl}`] ?? 0}
								{#if count > 0}
									<div style="padding:0.25rem 0.5rem;background:rgba(184,115,74,0.12);border-radius:var(--radius-sm);text-align:center;min-width:36px;">
										<p style="margin:0;font-size:0.6875rem;color:var(--text-muted);">{sl}{sl===1?'st':sl===2?'nd':sl===3?'rd':'th'}</p>
										<p style="margin:0;font-size:0.875rem;font-weight:700;color:var(--brand-accent);">{count}</p>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
				{#if pactSlots}
					<div style="padding:0.625rem 0.875rem;background:var(--bg-overlay);border-radius:var(--radius-md);">
						<p style="margin:0 0 0.375rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);">Pact Magic Slots</p>
						<div style="display:flex;gap:0.375rem;flex-wrap:wrap;">
							{#each [1,2,3,4,5] as sl}
								{@const count = (pactSlots as any)[`slot${sl}`] ?? 0}
								{#if count > 0}
									<div style="padding:0.25rem 0.5rem;background:rgba(142,68,173,0.12);border-radius:var(--radius-sm);text-align:center;min-width:36px;">
										<p style="margin:0;font-size:0.6875rem;color:var(--text-muted);">{sl}{sl===1?'st':sl===2?'nd':sl===3?'rd':'th'}</p>
										<p style="margin:0;font-size:0.875rem;font-weight:700;color:#8E44AD;">{count}</p>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Spellbook tabs -->
		{#if spellbooks.length > 0}
			<div style="display:flex;gap:0.375rem;margin-bottom:0.75rem;flex-wrap:wrap;align-items:center;">
				{#each spellbooks as book, i}
					<button
						class="btn btn-sm"
						class:btn-primary={activeBook === i}
						class:btn-ghost={activeBook !== i}
						onclick={() => activeBook = i}>
						{book.name}
					</button>
				{/each}
				{#if canEdit && spellbooks.length < 3}
					<button class="btn btn-ghost btn-sm" onclick={() => showNewBook = !showNewBook}>+ New</button>
				{/if}
			</div>
		{/if}

		{#if showNewBook && canEdit}
			<div style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.75rem;padding:0.625rem;background:var(--bg-overlay);border-radius:var(--radius-md);">
				<input type="text" class="input" style="max-width:220px;" bind:value={newBookName} placeholder="Spellbook name" />
				<button class="btn btn-primary btn-sm" onclick={handleCreate} disabled={saving}>Create</button>
				<button class="btn btn-ghost btn-sm" onclick={() => showNewBook = false}>Cancel</button>
			</div>
		{/if}

		{#if spellbooks.length === 0 && canEdit}
			<div class="card" style="padding:1rem;text-align:center;">
				<p class="table__empty">No spellbooks yet.</p>
				{#if !showNewBook}
					<button class="btn btn-primary btn-sm" onclick={() => showNewBook = true}>+ Create Spellbook</button>
				{/if}
			</div>
		{/if}

		{#each spellbooks as book, i}
			{#if activeBook === i}
				{@const bookId = book.id}

				<!-- Book header -->
				<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;flex-wrap:wrap;">
					{#if renamingBook === bookId}
						<input type="text" class="input" style="max-width:200px;font-size:0.875rem;" bind:value={renameVal} />
						<button class="btn btn-primary btn-sm" onclick={() => handleRename(bookId)} disabled={saving}>Save</button>
						<button class="btn btn-ghost btn-sm" onclick={() => renamingBook = null}>Cancel</button>
					{:else}
						<h4 style="margin:0;font-size:1rem;font-weight:700;">{book.name}</h4>
						{#if canEdit}
							<button class="btn btn-ghost btn-sm" onclick={() => { renamingBook = bookId; renameVal = book.name; }}>Rename</button>
							<button class="btn btn-ghost btn-sm" style="color:var(--color-danger);" onclick={() => handleDelete(bookId)} disabled={saving}>Delete</button>
						{/if}
					{/if}
				</div>

				<!-- Class subsections -->
				<div style="display:flex;gap:0.375rem;margin-bottom:0.75rem;flex-wrap:wrap;">
					{#each spellcastingClasses as cc}
						<button
							class="btn btn-sm"
							class:btn-primary={getActiveClass(bookId) === cc.classId}
							class:btn-ghost={getActiveClass(bookId) !== cc.classId}
							onclick={() => activeClass = { ...activeClass, [bookId]: cc.classId }}>
							{cc.classRef?.name ?? cc.classId}
						</button>
					{/each}
				</div>

				{#each spellcastingClasses as cc}
					{#if getActiveClass(bookId) === cc.classId}
						{@const classId = cc.classId}
						{@const className = cc.classRef?.name ?? classId}
						{@const classLevel = cc.allocatedLevel}
						{@const limits = knownLimits(classId, classLevel)}
						{@const entries = bookEntries(book, classId)}
						{@const cantripCount = countCantrips(book, classId)}
						{@const spellCount   = countSpells(book, classId)}
						{@const classSpells  = spellsForClass(classId)}
						{@const srch = getSearch(bookId)}

						<div>
							<!-- Limits banner -->
							<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;font-size:0.8125rem;">
								{#if limits?.cantrips != null}
									<span style="padding:0.25rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-sm);">
										Cantrips: <strong style="color:{cantripCount > limits.cantrips ? 'var(--color-danger)' : 'var(--color-success)'};">{cantripCount}</strong> / {limits.cantrips}
									</span>
								{/if}
								{#if limits?.prepared != null}
									<span style="padding:0.25rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-sm);">
										Spells: <strong style="color:{spellCount > limits.prepared ? 'var(--color-danger)' : 'var(--color-success)'};">{spellCount}</strong> / {limits.prepared}
									</span>
								{:else if limits?.note}
									<span style="padding:0.25rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-sm);color:var(--text-muted);">
										{limits.note} · <strong>{spellCount}</strong> selected
									</span>
								{/if}
								{#if limits?.additional}
									<span style="padding:0.25rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-sm);">
										+{limits.additional} additional
									</span>
								{/if}
							</div>

							<!-- Current entries -->
							{#if entries.length > 0}
								<div style="display:flex;flex-direction:column;gap:0.25rem;margin-bottom:0.75rem;">
									{#each entries as entry}
										{@const sp = allSpells.find((s: any) => s.spellId === entry.spellId)}
										{#if sp}
											<div style="padding:0.5rem 0.625rem;background:var(--bg-overlay);border-radius:var(--radius-md);display:flex;align-items:flex-start;gap:0.625rem;">
												<div style="flex:1;min-width:0;">
													<div style="display:flex;align-items:center;gap:0.375rem;flex-wrap:wrap;">
														<span style="font-weight:700;font-size:0.875rem;">{sp.name}</span>
														<span class="badge badge-muted" style="font-size:0.625rem;">{levelLabel(sp.level)}</span>
														<span class="badge badge-muted" style="font-size:0.625rem;">{sp.school}</span>
														{#if sp.concentration}<span class="badge badge-muted" style="font-size:0.625rem;">Conc.</span>{/if}
														{#if sp.ritual}<span class="badge badge-muted" style="font-size:0.625rem;">Ritual</span>{/if}
													</div>
													{#if sp.spellDamage || sp.cantripDamage}
														<p style="margin:0.125rem 0 0;font-size:0.75rem;color:var(--color-danger);">
															⚔ {sp.level === 0 ? sp.cantripDamage : sp.spellDamage}
														</p>
													{/if}
													{#if sp.link}
														<a href={sp.link} target="_blank" style="font-size:0.75rem;color:var(--brand-accent);">DDB ↗</a>
													{/if}
												</div>
												<div style="display:flex;gap:0.25rem;align-items:center;flex-shrink:0;">
													{#if sp.level > 0}
														<button
															class="btn btn-sm"
															class:btn-primary={entry.prepared}
															class:btn-ghost={!entry.prepared}
															style="font-size:0.75rem;padding:0.125rem 0.5rem;"
															onclick={() => handleToggle(entry.id, !entry.prepared)}>
															{entry.prepared ? '✓ Prepared' : 'Prepare'}
														</button>
													{/if}
													{#if canEdit}
														<button class="btn btn-ghost btn-sm" style="color:var(--color-danger);"
															onclick={() => handleRemoveEntry(entry.id)}>✕</button>
													{/if}
												</div>
											</div>
										{/if}
									{/each}
								</div>
							{/if}

							<!-- Add spell picker -->
							{#if canEdit}
								{#if addingEntry[bookId]}
									<div style="padding:0.625rem;background:var(--bg-overlay);border-radius:var(--radius-md);">
										<input type="text" class="input" style="margin-bottom:0.5rem;font-size:0.8125rem;"
											placeholder="Search spells…"
											value={srch}
											oninput={(e) => spellSearch = { ...spellSearch, [bookId]: (e.target as HTMLInputElement).value }} />
										<div style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:0.25rem;">
											{#each classSpells.filter((s: any) => {
												if (entries.some((e: any) => e.spellId === s.spellId)) return false;
												if (!srch) return true;
												return s.name.toLowerCase().includes(srch.toLowerCase());
											}) as sp}
												<button type="button"
													style="text-align:left;padding:0.375rem 0.5rem;background:var(--bg-surface);border:1px solid var(--border-muted);border-radius:var(--radius-sm);cursor:pointer;"
													onclick={() => handleAddEntry(bookId, classId, className, sp.spellId)}>
													<div style="display:flex;align-items:center;gap:0.375rem;flex-wrap:wrap;">
														<span style="font-weight:600;font-size:0.8125rem;">{sp.name}</span>
														<span class="badge badge-muted" style="font-size:0.625rem;">{levelLabel(sp.level)}</span>
														<span style="font-size:0.75rem;color:var(--text-muted);">{sp.school}</span>
													</div>
													{#if sp.spellDamage || sp.cantripDamage}
														<p style="margin:0.0625rem 0 0;font-size:0.75rem;color:var(--color-danger);">{sp.level === 0 ? sp.cantripDamage : sp.spellDamage}</p>
													{/if}
												</button>
											{:else}
												<p style="font-size:0.8125rem;color:var(--text-muted);padding:0.5rem;">
													{srch ? 'No spells match.' : 'No spells available for this class.'}
												</p>
											{/each}
										</div>
										<button class="btn btn-ghost btn-sm" style="margin-top:0.5rem;"
											onclick={() => addingEntry = { ...addingEntry, [bookId]: false }}>Close</button>
									</div>
								{:else}
									<button class="btn btn-ghost btn-sm"
										onclick={() => addingEntry = { ...addingEntry, [bookId]: true }}>
										+ Add Spell
									</button>
								{/if}
							{/if}
						</div>
					{/if}
				{/each}
			{/if}
		{/each}
	{/if}
</div>
