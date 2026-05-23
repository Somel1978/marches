<!-- apps/frontend/src/routes/(protected)/dm/quests/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving = $state(false);

	type Reward = { type: string; amount: number; itemRarity?: string; itemCategory?: string; itemMaxValue?: number };
	let rewards = $state<Reward[]>([{ type: 'XP', amount: 0 }, { type: 'GOLD', amount: 0 }]);

	function addReward() { rewards = [...rewards, { type: 'GOLD', amount: 0 }]; }
	function removeReward(i: number) { rewards = rewards.filter((_, idx) => idx !== i); }

	// Region/location selectors
	const _allWorlds      = $derived(((data as any).allWorlds ?? []) as any[]);
	let selectedWorldId    = $state('');
	let selectedRegionId   = $state('');
	let selectedLocationId = $state('');
	const selectedWorld   = $derived(_allWorlds.find((w: any) => w.id === selectedWorldId));
	const regionOptions   = $derived((selectedWorld?.regions ?? []) as any[]);
	const locationOptions = $derived(
		regionOptions.find((r: any) => r.id === selectedRegionId)?.locations ?? [] as any[]
	);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/dm" class="back-link">← DM Dashboard</a>
			<h2 class="page__title">New quest</h2>
		</div>
	</div>

	<div class="card" style="max-width:600px;">
		{#if form?.message}<div class="form-error">{form.message}</div>{/if}

		<form method="post" use:enhance={() => {
			saving = true;
			return async ({ update }) => { saving = false; await update(); };
		}}>
			<div class="fields">
				<div class="field">
					<label class="label" for="title">Title</label>
					<input id="title" name="title" type="text" class="input" placeholder="Quest title" required />
				</div>
				<div class="field">
					<label class="label" for="description">Description <span class="optional">(optional)</span></label>
					<textarea id="description" name="description" class="input" rows="3" placeholder="What is this quest about?"></textarea>
				</div>
				<div class="field">
					<label class="label" for="missionXp">Mission XP</label>
					<input id="missionXp" name="missionXp" type="number" class="input" min="0" value="0" required />
					<p class="field-hint">Total XP for the mission — split equally among confirmed players.</p>
				</div>
				<div class="field">
					<label class="label" for="rules">Rules <span class="optional">(optional)</span></label>
					<textarea id="rules" name="rules" class="input" rows="5">{data.dmRules}</textarea>
					<p class="field-hint">Pre-filled from your DM profile rules. Edit as needed.</p>
				</div>

				<hr class="divider" />
				<h4 style="font-size:0.875rem; font-weight:600; margin:0;">Capacity</h4>
				<div style="display:flex; gap:1rem; flex-wrap:wrap;">
					<div class="field" style="flex:1; min-width:120px;">
						<label class="label" for="minCap">Min players</label>
						<input id="minCap" name="minCapacity" type="number" class="input" min={data.globalMinCap} max={data.globalMaxCap} value={data.globalMinCap} required />
					</div>
					<div class="field" style="flex:1; min-width:120px;">
						<label class="label" for="maxCap">Max players</label>
						<input id="maxCap" name="maxCapacity" type="number" class="input" min={data.globalMinCap} max={data.globalMaxCap} value={data.globalMaxCap} required />
					</div>
				</div>

				<hr class="divider" />
				<h4 style="font-size:0.875rem; font-weight:600; margin:0;">Character level requirement</h4>
				<div style="display:flex; gap:1rem; flex-wrap:wrap;">
					<div class="field" style="flex:1; min-width:120px;">
						<label class="label" for="minLv">Min level</label>
						<input id="minLv" name="minLevel" type="number" class="input" min="1" max="20" value="1" required />
					</div>
					<div class="field" style="flex:1; min-width:120px;">
						<label class="label" for="maxLv">Max level</label>
						<input id="maxLv" name="maxLevel" type="number" class="input" min="1" max="20" value="20" required />
					</div>
				</div>

				<hr class="divider" />
				<h4 style="font-size:0.875rem; font-weight:600; margin:0;">Rewards</h4>
				<p class="field-hint">Rewards are pre-approved with the quest. Changing them after approval requires re-approval.</p>
				<div class="class-alloc-list">
					{#each rewards as r, i}
						<div class="class-alloc-row">
							<div class="field" style="flex:2; min-width:100px;">
								<label class="label" for="rtype-{i}">Type</label>
								<select id="rtype-{i}" name="rewardType" class="input" bind:value={r.type}>
									<option value="XP">XP</option>
									<option value="GOLD">Gold</option>
									<option value="TOKEN">Tokens</option>
									<option value="ITEM">Random item</option>
								</select>
							</div>
							{#if r.type !== 'ITEM'}
								<div class="field" style="flex:2; min-width:100px;">
									<label class="label" for="ramt-{i}">Amount</label>
									<input id="ramt-{i}" name="rewardAmount" type="number" class="input" min="0" bind:value={r.amount} />
								</div>
							{:else}
								<input type="hidden" name="rewardAmount" value="0" />
							{/if}

							{#if r.type === 'ITEM'}
								<div style="display:flex; gap:0.5rem; flex-wrap:wrap; padding:0.5rem 0; width:100%;">
									<div class="field" style="flex:1 1 120px;">
										<label class="label" for="rrar-{i}">Rarity filter</label>
										<select id="rrar-{i}" name="itemRarity_{i}" class="input input--select" bind:value={rewards[i].itemRarity}>
											<option value="">Any rarity</option>
											{#each (data as any).itemRarities ?? [] as rar}
												<option value={rar}>{rar.replace('_',' ')}</option>
											{/each}
										</select>
									</div>
									<div class="field" style="flex:1 1 120px;">
										<label class="label" for="rcat-{i}">Category filter</label>
										<select id="rcat-{i}" name="itemCategory_{i}" class="input input--select" bind:value={rewards[i].itemCategory}>
											<option value="">Any category</option>
											{#each (data as any).itemCategories ?? [] as cat}
												<option value={cat}>{cat}</option>
											{/each}
										</select>
									</div>
									<div class="field" style="flex:1 1 100px;">
										<label class="label" for="rmv-{i}">Max value (gp)</label>
										<input id="rmv-{i}" name="itemMaxValue_{i}" type="number" class="input" min="0" bind:value={rewards[i].itemMaxValue} placeholder="No limit" />
									</div>
								</div>
							{/if}
							<button type="button" class="btn btn-ghost btn-sm btn-icon class-alloc-remove"
								onclick={() => removeReward(i)} aria-label="Remove">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
								</svg>
							</button>
						</div>
					{/each}
				</div>
				<button type="button" class="btn btn-ghost btn-sm" onclick={addReward}>+ Add reward</button>
			</div>

			<!-- Region & Location -->
			<div class="field">
				<label class="label" for="q-world">World <span class="optional">(optional)</span></label>
				<select id="q-world" class="input input--select"
					bind:value={selectedWorldId}
					onchange={() => { selectedRegionId = ''; selectedLocationId = ''; }}>
					<option value="">No world</option>
					{#each _allWorlds as w}
						<option value={w.id}>{w.name}</option>
					{/each}
				</select>
			</div>
			{#if regionOptions.length}
				<div class="field">
					<label class="label" for="q-region">Region</label>
					<select id="q-region" name="regionId" class="input input--select"
						bind:value={selectedRegionId}
						onchange={() => selectedLocationId = ''}>
						<option value="">None</option>
						{#each regionOptions as r}
							<option value={r.id}>{r.name}</option>
						{/each}
					</select>
				</div>
			{:else}
				<input type="hidden" name="regionId" value="" />
			{/if}
			{#if locationOptions.length}
				<div class="field">
					<label class="label" for="q-location">Location <span class="optional">(optional)</span></label>
					<select id="q-location" name="locationId" class="input input--select"
						bind:value={selectedLocationId}>
						<option value="">None</option>
						{#each locationOptions as l}
							<option value={l.id}>{l.name}</option>
						{/each}
					</select>
				</div>
			{:else}
				<input type="hidden" name="locationId" value="" />
			{/if}

			<div class="form-actions">
				<a href="/dm" class="btn btn-ghost">Cancel</a>
				<button type="submit" class="btn btn-primary" disabled={saving}>
					{saving ? 'Creating…' : 'Create quest'}
				</button>
			</div>
		</form>
	</div>
</div>