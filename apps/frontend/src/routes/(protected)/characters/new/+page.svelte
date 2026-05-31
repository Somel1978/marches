<!-- apps/frontend/src/routes/(protected)/characters/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const systems    = $derived((data as any).systems   ?? []);
	const systemData = $derived((data as any).systemData);

	const availableClasses     = $derived((systemData?.classes     ?? []).filter((c: any) => c.isAvailable));
	const availableSpecies     = $derived((systemData?.species     ?? []).filter((s: any) => s.isAvailable));
	const availableBackgrounds = $derived((systemData?.backgrounds ?? []).filter((b: any) => b.isAvailable));

	// Class rows
	type ClassRow = { classId: string; subclassId: string; allocatedLevel: number };
	let classRows = $state<ClassRow[]>([{ classId: '', subclassId: '', allocatedLevel: 1 }]);

	function addClassRow() {
		classRows = [...classRows, { classId: '', subclassId: '', allocatedLevel: 1 }];
	}
	function removeClassRow(i: number) {
		classRows = classRows.filter((_, idx) => idx !== i);
	}

	function getSubclasses(classId: string, level: number) {
		const cls = availableClasses.find((c: any) => c.id === classId);
		if (!cls) return [];
		const availAt = cls.subclassAvailableAtLevel ?? 3;
		if (level < availAt) return [];
		return cls.subclasses?.filter((s: any) => s.isAvailable) ?? [];
	}

	const totalLevel = $derived(classRows.reduce((s, r) => s + (r.allocatedLevel || 0), 0));
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">New character</h2>
	</div>

	{#if (form as any)?.message}
		<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>
	{/if}

	<form method="post" action="?/create" use:enhance>
		<div class="sections">

			<!-- System -->
			<div class="card">
				<h3 class="section-title">Game system</h3>
				<div class="field">
					<label class="label" for="gameSystemId">System</label>
					<select id="gameSystemId" name="gameSystemId" class="input input--select" required>
						{#each systems as s}
							<option value={s.id}>{s.name}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Identity -->
			<div class="card">
				<h3 class="section-title">Identity</h3>
				<div class="fields">
					<div class="field">
						<label class="label" for="name">Name <span class="required">*</span></label>
						<input id="name" name="name" type="text" class="input" required
							value={(form as any)?.name ?? ''} />
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="speciesId">Species <span class="required">*</span></label>
							<select id="speciesId" name="speciesId" class="input input--select" required>
								<option value="">Select species…</option>
								{#each availableSpecies as s}
									<option value={s.id}>{s.name}
										{#if s.isSubrace}(Subrace){/if}
										{#if s.isLegacy}(Legacy){/if}
									</option>
								{/each}
							</select>
						</div>
						<div class="field" style="flex:1 1 200px;">
							<label class="label" for="backgroundId">Background <span class="required">*</span></label>
							<select id="backgroundId" name="backgroundId" class="input input--select" required>
								<option value="">Select background…</option>
								{#each availableBackgrounds as b}
									<option value={b.id}>{b.name}</option>
								{/each}
							</select>
						</div>
					</div>
				</div>
			</div>

			<!-- Classes -->
			<div class="card">
				<h3 class="section-title">Classes <span class="required">*</span> — Total level: {totalLevel}</h3>
				{#each classRows as row, i}
					<div style="display:flex; gap:0.5rem; align-items:flex-end; flex-wrap:wrap; margin-bottom:0.5rem; padding:0.5rem; background:var(--bg-overlay); border-radius:var(--radius-md);">
						<div class="field" style="flex:2 1 160px; margin:0;">
							<label class="label" for="class-{i}">Class</label>
							<select id="class-{i}" name="classId" class="input input--select" required
								bind:value={row.classId}
								onchange={() => { row.subclassId = ''; }}>
								<option value="">Select class…</option>
								{#each availableClasses as c}
									<option value={c.id}>{c.name}</option>
								{/each}
							</select>
						</div>
						<div class="field" style="flex:0 0 70px; margin:0;">
							<label class="label" for="level-{i}">Level</label>
							<input id="level-{i}" name="allocatedLevel" type="number" class="input"
								min="1" max="20" bind:value={row.allocatedLevel} required />
						</div>
						<div class="field" style="flex:2 1 160px; margin:0;">
							<label class="label" for="subclass-{i}">Subclass</label>
							{#if getSubclasses(row.classId, row.allocatedLevel).length}
								<select name="subclassId" class="input input--select" bind:value={row.subclassId}>
									<option value="">None yet</option>
									{#each getSubclasses(row.classId, row.allocatedLevel) as sub}
										<option value={sub.id}>{sub.name}</option>
									{/each}
								</select>
							{:else}
								<input type="hidden" name="subclassId" value="" />
								<p class="field-hint" style="margin:0; padding:0.5rem 0;">
									{#if row.classId}
										{@const cls = availableClasses.find((c: any) => c.id === row.classId)}
										Available at level {cls?.subclassAvailableAtLevel ?? 3}
									{:else}
										Select a class first
									{/if}
								</p>
							{/if}
						</div>
						{#if classRows.length > 1}
							<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);"
								onclick={() => removeClassRow(i)}>✕</button>
						{/if}
					</div>
				{/each}
				<button type="button" class="btn btn-ghost btn-sm" onclick={addClassRow}>+ Add class</button>
			</div>

			<!-- Backstory -->
			<div class="card">
				<h3 class="section-title">Backstory <span class="optional">(optional)</span></h3>
				<div class="field">
					<label class="label" for="description">Description</label>
					<textarea id="description" name="description" class="input" rows="5"
						placeholder="Tell your character's story…">{(form as any)?.description ?? ''}</textarea>
				</div>
				<div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
					<div class="field" style="flex:1 1 200px;">
						<label class="label" for="avatarUrl">Avatar URL <span class="optional">(optional)</span></label>
						<input id="avatarUrl" name="avatarUrl" type="text" class="input"
							value={(form as any)?.avatarUrl ?? ''} placeholder="https://…" />
					</div>
				</div>
			</div>

		</div>

		<!-- World assignment -->
		{#if ((data as any).activeWorlds ?? []).length}
			<div class="card" style="margin-top:1rem;">
				<h3 class="section-title">World <span class="optional">(optional)</span></h3>
				<p class="field-hint" style="margin-bottom:0.75rem;">Assign this character to a world. If left blank the character will be global.</p>
				<div class="field">
					<label class="label" for="worldId">World</label>
					<select id="worldId" name="worldId" class="input input--select">
						<option value="">Global (no world)</option>
						{#each (data as any).activeWorlds as w}
							<option value={w.id}>{w.name}</option>
						{/each}
					</select>
				</div>
			</div>
		{/if}

		<div class="form-actions" style="margin-top:1rem;">
			<a href="/characters" class="btn btn-ghost">Cancel</a>
			<button type="submit" class="btn btn-primary">Submit for approval</button>
		</div>
	</form>
</div>