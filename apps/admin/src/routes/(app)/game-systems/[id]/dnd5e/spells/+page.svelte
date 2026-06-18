<!-- apps/admin/src/routes/(app)/game-systems/[id]/dnd5e/spells/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const system = $derived((data as any).system);
	const spells = $derived((data as any).spells as any[]);

	let search          = $state('');
	let filterLevel     = $state('');
	let filterSchool    = $state('');
	let filterSpellList = $state('');
	let filterConc      = $state('');  // '' | 'yes' | 'no'

	const SCHOOLS = ['Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'];
	const LEVELS  = ['Cantrip','1','2','3','4','5','6','7','8','9'];

	// Build unique spell list options from loaded data
	const spellListOptions = $derived.by(() => {
		const set = new Set<string>();
		for (const s of spells) {
			if (!s.spellList) continue;
			for (const name of s.spellList.split(',')) {
				const t = name.trim();
				if (t) set.add(t);
			}
		}
		return [...set].sort();
	});

	const filtered = $derived(spells.filter((s: any) => {
		if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
		if (filterLevel !== '') {
			const lvl = filterLevel === 'Cantrip' ? 0 : Number(filterLevel);
			if (s.level !== lvl) return false;
		}
		if (filterSchool && s.school !== filterSchool) return false;
		if (filterConc === 'yes' && !s.concentration) return false;
		if (filterConc === 'no'  &&  s.concentration) return false;
		if (filterSpellList) {
			if (!s.spellList) return false;
			const list = s.spellList.split(',').map((n: string) => n.trim().toLowerCase());
			if (!list.includes(filterSpellList.toLowerCase())) return false;
		}
		return true;
	}));

	function levelLabel(n: number) { return n === 0 ? 'Cantrip' : `Lv ${n}`; }

	function clearFilters() {
		search = ''; filterLevel = ''; filterSchool = ''; filterConc = ''; filterSpellList = '';
	}

	const hasFilters = $derived(!!(search || filterLevel || filterSchool || filterConc || filterSpellList));

	let _confirmOpen  = $state(false);
	let _confirmMsg   = $state('');
	let _confirmTitle = $state('');
	let _confirmCb    = $state<() => void>(() => {});
	function askConfirm(title: string, msg: string, cb: () => void) {
		_confirmTitle = title; _confirmMsg = msg; _confirmCb = cb; _confirmOpen = true;
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Spells</h2>
			<p style="margin:0;font-size:0.875rem;color:var(--text-muted);">{system.name} · {spells.length} spells</p>
		</div>
		<div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
			<a href="/game-systems/{system.id}/dnd5e/spells/slots"  class="btn btn-ghost btn-sm">Spell Slots</a>
			<a href="/game-systems/{system.id}/dnd5e/spells/known"  class="btn btn-ghost btn-sm">Spells Known</a>
			<a href="/game-systems/{system.id}/dnd5e/classes"        class="btn btn-ghost btn-sm">Classes</a>
			<a href="/game-systems/{system.id}/data/import/dnd5e"   class="btn btn-primary btn-sm">⬆ Import</a>
		</div>
	</div>

	{#if (form as any)?.message}<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>{/if}

	<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center;">
		<input type="text" class="input" style="max-width:220px;" placeholder="Search spells…" bind:value={search} />
		<select class="input input--select" style="max-width:120px;" bind:value={filterLevel}>
			<option value="">All levels</option>
			{#each LEVELS as l}<option value={l}>{l === 'Cantrip' ? 'Cantrip' : `Level ${l}`}</option>{/each}
		</select>
		<select class="input input--select" style="max-width:150px;" bind:value={filterSchool}>
			<option value="">All schools</option>
			{#each SCHOOLS as s}<option value={s}>{s}</option>{/each}
		</select>
		<select class="input input--select" style="max-width:160px;" bind:value={filterSpellList}>
			<option value="">All classes</option>
			{#each spellListOptions as opt}<option value={opt}>{opt}</option>{/each}
		</select>
		<select class="input input--select" style="max-width:150px;" bind:value={filterConc}>
			<option value="">Conc. — any</option>
			<option value="yes">Concentration</option>
			<option value="no">No concentration</option>
		</select>
		<span style="font-size:0.8125rem;color:var(--text-muted);">{filtered.length} results</span>
		{#if hasFilters}
			<button class="btn btn-ghost btn-sm" onclick={clearFilters}>✕ Clear</button>
		{/if}
	</div>

	<div class="card" style="padding:0;">
		<table class="table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Level</th>
					<th>School</th>
					<th style="text-align:center;">Conc.</th>
					<th style="text-align:center;">Ritual</th>
					<th>Spell List</th>
					<th>Source</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as sp}
					<tr>
						<td>
							<a href="/game-systems/{system.id}/dnd5e/spells/{sp.id}" style="font-weight:600;color:var(--brand-accent);">{sp.name}</a>
							{#if sp.isLegacy}<span class="badge badge-muted" style="font-size:0.625rem;margin-left:0.25rem;">Legacy</span>{/if}
							{#if sp.isHomebrew}<span class="badge badge-accent" style="font-size:0.625rem;margin-left:0.25rem;">Homebrew</span>{/if}
						</td>
						<td><span class="badge badge-muted">{levelLabel(sp.level)}</span></td>
						<td style="font-size:0.8125rem;">{sp.school}</td>
						<td style="text-align:center;font-size:0.875rem;">{sp.concentration ? '●' : ''}</td>
						<td style="text-align:center;font-size:0.875rem;">{sp.ritual ? '●' : ''}</td>
						<td style="font-size:0.75rem;color:var(--text-muted);">{sp.spellList ?? ''}</td>
						<td style="font-size:0.75rem;color:var(--text-muted);">{(sp as any).sourceBook ?? ''}</td>
						<td>
							<form id="del-{sp.id}" method="post" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={sp.id} />
								<button type="button" class="btn btn-ghost btn-sm" style="color:var(--color-danger);"
									onclick={() => askConfirm('Delete spell', `Delete "${sp.name}"?`, () => {
										(document.getElementById(`del-${sp.id}`) as HTMLFormElement)?.requestSubmit();
									})}>✕</button>
							</form>
						</td>
					</tr>
				{:else}
					<tr><td colspan="8" class="table__empty">No spells match. Use ⬆ Import to load spells.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<ConfirmModal
	open={_confirmOpen}
	title={_confirmTitle}
	message={_confirmMsg}
	onconfirm={() => { _confirmOpen = false; _confirmCb(); }}
	oncancel={() => { _confirmOpen = false; }}
/>