<!-- apps/admin/src/routes/(app)/rewards/grant/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let tab           = $state<'xp'|'achievement'|'item'>('xp');
	let searchResults = $state<any[]>([]);
	let randomized    = $state<any | null>(null);
	let selectedItem  = $state<any | null>(null);
	let searching     = $state(false);

	$effect(() => {
		if ((form as any)?.searchResults) searchResults = (form as any).searchResults;
		if ((form as any)?.randomizedItem) { randomized = (form as any).randomizedItem; selectedItem = (form as any).randomizedItem; }
		if ((form as any)?.tab) tab = (form as any).tab;
	});

	function e_reload() { return async ({ update }: any) => { await update(); await invalidateAll(); }; }
	function e_search() { return async ({ update }: any) => { searching = true; await update(); searching = false; }; }
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/rewards" class="back-link">← Rewards</a>
			<h2 class="page__title">Grant reward</h2>
		</div>
	</div>

	{#if (form as any)?.message}<div class="form-error" style="margin-bottom:1rem;">{(form as any).message}</div>{/if}
	{#if (form as any)?.grantSuccess}<div class="form-success" style="margin-bottom:1rem;">Reward granted successfully!</div>{/if}

	<div style="display:flex; gap:0.5rem; margin-bottom:1.5rem; flex-wrap:wrap;">
		<button type="button" class="btn {tab === 'xp' ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick={() => tab = 'xp'}>XP / Gold / Tokens</button>
		<button type="button" class="btn {tab === 'achievement' ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick={() => tab = 'achievement'}>Achievement</button>
		<button type="button" class="btn {tab === 'item' ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick={() => tab = 'item'}>Item</button>
	</div>

	{#if tab === 'xp'}
		<div class="card">
			<h3 class="section-title">Grant XP / Gold / Tokens</h3>
			<form method="post" action="?/grantXp" use:enhance={e_reload}>
				<div class="fields">
					<div class="field">
						<label class="label" for="g-char">Character</label>
						<select id="g-char" name="characterId" class="input input--select" required>
							<option value="">Select character…</option>
							{#each data.allChars as c}
								<option value={c.id}>{c.name}</option>
							{/each}
						</select>
					</div>
					<div style="display:flex; gap:0.75rem; flex-wrap:wrap">
						<div class="field" style="flex:1;">
							<label class="label" for="g-type">Type</label>
							<select id="g-type" name="type" class="input input--select">
								<option value="XP">XP</option>
								<option value="GOLD">Gold</option>
								<option value="TOKEN">Tokens</option>
							</select>
						</div>
						<div class="field" style="flex:1;">
							<label class="label" for="g-amount">Amount</label>
							<input id="g-amount" name="amount" type="number" min="1" class="input" required />
						</div>
					</div>
					<div class="field">
						<label class="label" for="g-note">Note</label>
						<input id="g-note" name="note" class="input" placeholder="Reason for grant" />
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary">Grant</button>
				</div>
			</form>
		</div>

	{:else if tab === 'achievement'}
		<div class="card">
			<h3 class="section-title">Grant achievement</h3>
			{#if !data.allAchs.length}
				<p class="table__empty">No active achievements defined. <a href="/rewards/achievements">Create some first.</a></p>
			{:else}
				<form method="post" action="?/grantAchievement" use:enhance={e_reload}>
					<div class="fields">
						<div class="field">
							<label class="label" for="ga-char">Character</label>
							<select id="ga-char" name="characterId" class="input input--select" required>
								<option value="">Select character…</option>
								{#each data.allChars as c}
									<option value={c.id}>{c.name}</option>
								{/each}
							</select>
						</div>
						<div class="field">
							<label class="label" for="ga-ach">Achievement</label>
							<select id="ga-ach" name="achievementId" class="input input--select" required>
								<option value="">Select achievement…</option>
								{#each data.allAchs as a}
									<option value={a.id}>{a.icon ?? ''} {a.name}</option>
								{/each}
							</select>
						</div>
						<div class="field">
							<label class="label" for="ga-note">Note <span class="optional">(optional)</span></label>
							<input id="ga-note" name="note" class="input" placeholder="Why this achievement was earned" />
						</div>
					</div>
					<div class="form-actions">
						<button type="submit" class="btn btn-primary">Grant achievement</button>
					</div>
				</form>
			{/if}
		</div>

	{:else if tab === 'item'}
		<div class="card">
			<h3 class="section-title">Item filters</h3>
			<div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-end; margin-bottom:1rem;">
				<form method="post" action="?/searchItems" use:enhance={e_search} style="display:contents;">
					<div class="field" style="flex:2 1 200px;">
						<label class="label" for="i-q">Search by name</label>
						<input id="i-q" name="query" class="input" placeholder="Item name…" />
					</div>
					<div class="field" style="flex:1 1 120px;">
						<label class="label" for="i-rar">Rarity</label>
						<select id="i-rar" name="rarity" class="input input--select">
							<option value="">Any</option>
							{#each data.itemRarities as r}
								<option value={r}>{r.replace('_', ' ')}</option>
							{/each}
						</select>
					</div>
					<div class="field" style="flex:1 1 120px;">
						<label class="label" for="i-cat">Category</label>
						<select id="i-cat" name="category" class="input input--select">
							<option value="">Any</option>
							{#each data.itemCategories as c}
								<option value={c}>{c}</option>
							{/each}
						</select>
					</div>
					<div class="field" style="flex:1 1 100px;">
						<label class="label" for="i-max">Max value (gp)</label>
						<input id="i-max" name="maxValue" type="number" class="input" placeholder="500" />
					</div>
					<button type="submit" class="btn btn-ghost btn-sm" disabled={searching}>Search</button>
				</form>
				<form method="post" action="?/randomizeItem" use:enhance={e_search} style="display:contents;">
					<input type="hidden" name="rarity"   id="rand-rarity" />
					<input type="hidden" name="category" id="rand-cat" />
					<input type="hidden" name="maxValue" id="rand-max" />
					<button type="submit" class="btn btn-ghost btn-sm" disabled={searching}
						onclick={() => {
							(document.getElementById('rand-rarity') as HTMLInputElement).value = (document.getElementById('i-rar') as HTMLInputElement)?.value ?? '';
							(document.getElementById('rand-cat') as HTMLInputElement).value = (document.getElementById('i-cat') as HTMLInputElement)?.value ?? '';
							(document.getElementById('rand-max') as HTMLInputElement).value = (document.getElementById('i-max') as HTMLInputElement)?.value ?? '';
						}}>
						🎲 Randomize
					</button>
				</form>
			</div>

			{#if randomized}
				<div style="padding:0.75rem; background:color-mix(in srgb, var(--color-accent) 10%, transparent); border:1px solid var(--color-accent); border-radius:var(--radius-sm); margin-bottom:1rem;">
					<p style="font-weight:600; margin:0 0 0.25rem;">Randomized: {randomized.name}</p>
					<p style="font-size:0.875rem; color:var(--text-muted); margin:0;">{randomized.rarity ?? '—'} · {randomized.category ?? '—'} · {randomized.buyPrice ?? 0} gp</p>
				</div>
			{/if}

			{#if searchResults.length}
				<div style="margin-bottom:1rem; max-height:300px; overflow-y:auto; border:1px solid var(--border-muted); border-radius:var(--radius-sm);">
					<div class="table-wrap">
						<table class="table">
						<thead><tr><th>Name</th><th>Rarity</th><th>Category</th><th>Price</th><th></th></tr></thead>
						<tbody>
							{#each searchResults as i}
								<tr style={selectedItem?.id === i.id ? 'background:color-mix(in srgb, var(--color-accent) 8%, transparent);' : ''}>
									<td>{i.name}</td>
									<td class="table__muted">{i.rarity ?? '—'}</td>
									<td class="table__muted">{i.category ?? '—'}</td>
									<td class="table__muted">{i.buyPrice ?? 0} gp</td>
									<td><button type="button" class="btn btn-ghost btn-sm" onclick={() => selectedItem = i}>Select</button></td>
								</tr>
							{/each}
						</tbody>
					</table>
</div>
				</div>
			{/if}
		</div>

		{#if selectedItem}
			<div class="card" style="margin-top:1rem;">
				<h3 class="section-title">Grant: {selectedItem.name}</h3>
				<form method="post" action="?/grantItem" use:enhance={e_reload}>
					<input type="hidden" name="itemId" value={selectedItem.id} />
					<div class="fields">
						<div class="field">
							<label class="label" for="gi-char">Character</label>
							<select id="gi-char" name="characterId" class="input input--select" required>
								<option value="">Select character…</option>
								{#each data.allChars as c}
									<option value={c.id}>{c.name}</option>
								{/each}
							</select>
						</div>
						<div class="field">
							<label class="label" for="gi-note">Note <span class="optional">(optional)</span></label>
							<input id="gi-note" name="note" class="input" placeholder="Reason for item grant" />
						</div>
					</div>
					<div class="form-actions">
						<button type="submit" class="btn btn-primary">Grant item to character</button>
					</div>
				</form>
			</div>
		{/if}
	{/if}
</div>