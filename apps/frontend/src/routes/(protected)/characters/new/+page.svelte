<!-- apps/frontend/src/routes/(protected)/characters/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving          = $state(false);
	let selectedSystem  = $state<string>('');
	let classes         = $state<{ classId: string; subclassId: string | null; allocatedLevel: number }[]>([
		{ classId: '', subclassId: null, allocatedLevel: 1 }
	]);

	const currentSystem = $derived(
		data.systems.find((s: any) => s.id === selectedSystem)
	);

	// We need full system details for classes/species — server pre-loads first system
	// When user changes system we reload via form submission feedback
	const systemDetails = $derived(
		selectedSystem === data.systemDetails?.id ? data.systemDetails : null
	);

	const availableClasses = $derived(
		((data as any).systemData?.classes ?? []).filter((c: any) => c.isAvailable)
	);

	const availableSpecies = $derived(
		((data as any).systemData?.species ?? []).filter((s: any) => s.isAvailable)
	);

	function getSubclasses(classId: string) {
		return availableClasses.find((c: any) => c.id === classId)?.subclasses?.filter((s: any) => s.isAvailable) ?? [];
	}

	function addClass() {
		classes = [...classes, { classId: '', subclassId: null, allocatedLevel: 1 }];
	}

	function removeClass(i: number) {
		if (classes.length > 1) classes = classes.filter((_, idx) => idx !== i);
	}

	const allocTotal = $derived(classes.reduce((s, c) => s + (c.allocatedLevel || 0), 0));
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/characters" class="back-link">← My Characters</a>
			<h2 class="page__title">New character</h2>
		</div>
	</div>

	<div class="card" style="max-width: 560px;">
		{#if form?.message}
			<div class="form-error">{form.message}</div>
		{/if}

		<form method="post" use:enhance={() => {
			saving = true;
			return async ({ update }) => { saving = false; await update(); };
		}}>
			<input type="hidden" name="classes" value={JSON.stringify(classes)} />

			<div class="fields">
				<!-- Basic info -->
				<div class="field">
					<label class="label" for="name">Character name</label>
					<input id="name" name="name" type="text" class="input"
						value={form?.name ?? ''} placeholder="Your character's name" required />
					<p class="field-hint">Must be unique across all characters.</p>
				</div>

				<div class="field">
					<label class="label" for="gameSystemId">Game system</label>
					<select id="gameSystemId" name="gameSystemId" class="input" required
						bind:value={selectedSystem}>
						<option value="">Select a system…</option>
						{#each data.systems as system}
							<option value={system.id}>{system.name}</option>
						{/each}
					</select>
				</div>

				<!-- Species (if available for selected system) -->
				{#if availableSpecies.length}
					<div class="field">
						<label class="label" for="speciesId">Species <span class="optional">(optional)</span></label>
						<select id="speciesId" name="speciesId" class="input">
							<option value="">None</option>
							{#each availableSpecies as sp}
								<option value={sp.id}>{sp.name}</option>
							{/each}
						</select>
					</div>
				{/if}

				<!-- Images -->
				<div class="field">
					<label class="label" for="avatarUrl">Avatar URL <span class="optional">(optional)</span></label>
					<input id="avatarUrl" name="avatarUrl" type="url" class="input" placeholder="https://..." />
					<p class="field-hint">Small circular image shown on lists.</p>
				</div>
				<div class="field">
					<label class="label" for="portraitUrl">Portrait URL <span class="optional">(optional)</span></label>
					<input id="portraitUrl" name="portraitUrl" type="url" class="input" placeholder="https://..." />
				</div>
			</div>

			<!-- Initial class allocation -->
			{#if selectedSystem && availableClasses.length}
				<hr class="divider" />
				<h4 style="font-size:0.9375rem; font-weight:600; margin:0 0 0.75rem;">Starting classes</h4>
				<p class="field-hint" style="margin-bottom:0.75rem;">You can always update these later pending admin approval.</p>

				<div class="class-alloc-list">
					{#each classes as alloc, i}
						<div class="class-alloc-row">
							<div class="field" style="flex:2; min-width:130px;">
								<label class="label" for="cls-{i}">Class</label>
								<select id="cls-{i}" class="input" bind:value={alloc.classId}
									onchange={() => { alloc.subclassId = null; }}>
									<option value="">Select…</option>
									{#each availableClasses as cls}
										<option value={cls.id}>{cls.name}</option>
									{/each}
								</select>
							</div>
							<div class="field" style="flex:2; min-width:130px;">
								<label class="label" for="sub-{i}">Subclass <span class="optional">(opt)</span></label>
								<select id="sub-{i}" class="input" bind:value={alloc.subclassId}>
									<option value={null}>None</option>
									{#each getSubclasses(alloc.classId) as sub}
										<option value={sub.id}>{sub.name}</option>
									{/each}
								</select>
							</div>
							<div class="field" style="flex:1; min-width:70px;">
								<label class="label" for="lv-{i}">Levels</label>
								<input id="lv-{i}" type="number" class="input"
									bind:value={alloc.allocatedLevel} min="1" max="20" />
							</div>
							{#if classes.length > 1}
								<button type="button" class="btn btn-ghost btn-sm btn-icon class-alloc-remove"
									onclick={() => removeClass(i)} aria-label="Remove">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
									</svg>
								</button>
							{/if}
						</div>
					{/each}
				</div>
				<div style="display:flex; align-items:center; gap:1rem; margin-top:0.5rem;">
					<button type="button" class="btn btn-ghost btn-sm" onclick={addClass}>+ Add class</button>
					<span class="table__muted" style="font-size:0.8125rem;">Total: <strong>{allocTotal}</strong></span>
				</div>
			{/if}

			<div class="form-actions" style="margin-top:1.5rem;">
				<a href="/characters" class="btn btn-ghost">Cancel</a>
				<button type="submit" class="btn btn-primary" disabled={saving}>
					{saving ? 'Creating…' : 'Create character'}
				</button>
			</div>
		</form>
	</div>
</div>