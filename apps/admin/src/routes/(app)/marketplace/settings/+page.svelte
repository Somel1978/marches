<!-- apps/admin/src/routes/(app)/marketplace/settings/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving = $state(false);

	function val(key: string) { return data.settings.find(s => s.key === key)?.value ?? ''; }

	const RARITIES = ['Mundane', 'Common', 'Uncommon', 'Rare', 'Very_Rare', 'Legendary', 'Artifact', 'Unknown'];
	const CATEGORIES = ['Combat', 'Consumable', 'Utility', 'Destroyable'];

	type Tier = {
		minLevel: number;
		maxLevel: number;
		maxRarity: string | null;
		maxValue: number | null;
		allowedCategories: string[];
	};

	let tiers = $state<Tier[]>([]);
	$effect.pre(() => {
		try {
			const raw = val('marketplace.levelRestrictions');
			tiers = raw ? JSON.parse(raw) : [];
		} catch {
			tiers = [];
		}
	});

	function addTier() {
		tiers = [...tiers, { minLevel: 1, maxLevel: 4, maxRarity: 'Common', maxValue: 100, allowedCategories: [] }];
	}
	function removeTier(i: number) {
		tiers = tiers.filter((_, idx) => idx !== i);
	}

	function tiersJson() { return JSON.stringify(tiers); }

	function toggleCategory(tier: Tier, cat: string) {
		if (tier.allowedCategories.includes(cat)) {
			tier.allowedCategories = tier.allowedCategories.filter(c => c !== cat);
		} else {
			tier.allowedCategories = [...tier.allowedCategories, cat];
		}
		tiers = [...tiers];
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/marketplace/items" class="back-link">← Marketplace</a>
			<h2 class="page__title">Marketplace settings</h2>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.success}<div class="form-success">Settings saved.</div>{/if}

	<form method="post" use:enhance={() => {
		saving = true;
		return async ({ update }) => { saving = false; await update(); };
	}}>
		<input type="hidden" name="levelRestrictions" value={tiersJson()} />

		<div class="card" style="max-width:500px; margin-bottom:1.5rem;">
			<h3 class="section-title">General</h3>
			<div class="fields">
				<div class="field">
					<label class="label" for="sellPct">Sell price (% of buy price)</label>
					<input id="sellPct" name="sellPricePercent" type="number" class="input" min="0" max="100" value={val('marketplace.sellPricePercent')} />
					<p class="field-hint">e.g. 50 = characters sell items for 50% of buy price.</p>
				</div>
				<div class="field field--inline">
					<label class="label" for="stockEnabled">Stock management enabled</label>
					<select id="stockEnabled" name="stockEnabled" class="input input--select">
						<option value="true"  selected={val('marketplace.stockEnabled') === 'true'}>Yes</option>
						<option value="false" selected={val('marketplace.stockEnabled') !== 'true'}>No</option>
					</select>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="page__header" style="margin-bottom:1rem;">
				<h3 class="section-title" style="margin:0;">Level restrictions</h3>
				<button type="button" class="btn btn-ghost btn-sm" onclick={addTier}>+ Add tier</button>
			</div>
			<p class="field-hint" style="margin-bottom:1rem;">Define what characters can buy based on their total level. Leave categories empty to allow all.</p>

			{#if tiers.length === 0}
				<p class="table__empty">No restrictions configured — all items available at all levels.</p>
			{:else}
				<div style="display:flex; flex-direction:column; gap:1rem;">
					{#each tiers as tier, i}
						<div class="card" style="border-color:var(--border-accent); position:relative; padding:1rem;">
							<button type="button" class="btn btn-ghost btn-sm btn-icon"
								style="position:absolute; top:0.75rem; right:0.75rem;"
								onclick={() => removeTier(i)} aria-label="Remove tier">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
								</svg>
							</button>
							<div style="display:flex; gap:1rem; flex-wrap:wrap;">
								<div class="field" style="flex:1; min-width:80px;">
									<label class="label" for="t-minlv-{i}">Min level</label>
									<input id="t-minlv-{i}" type="number" class="input" min="1" max="20" bind:value={tier.minLevel} />
								</div>
								<div class="field" style="flex:1; min-width:80px;">
									<label class="label" for="t-maxlv-{i}">Max level</label>
									<input id="t-maxlv-{i}" type="number" class="input" min="1" max="20" bind:value={tier.maxLevel} />
								</div>
								<div class="field" style="flex:2; min-width:120px;">
									<label class="label" for="t-rarity-{i}">Max rarity</label>
									<select id="t-rarity-{i}" class="input input--select" bind:value={tier.maxRarity}>
										<option value={null}>No limit</option>
										{#each RARITIES as r}
											<option value={r}>{r.replace('_', ' ')}</option>
										{/each}
									</select>
								</div>
								<div class="field" style="flex:2; min-width:120px;">
									<label class="label" for="t-maxval-{i}">Max value (GP)</label>
									<input id="t-maxval-{i}" type="number" class="input" min="0" placeholder="No limit"
										value={tier.maxValue ?? ''}
										oninput={(e) => { const v = (e.target as HTMLInputElement).value; tier.maxValue = v === '' ? null : Number(v); tiers = [...tiers]; }} />
								</div>
							</div>
							<div class="field" style="margin-top:0.5rem;">
								<span class="label">Allowed categories <span class="optional">(empty = all)</span></span>
								<div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:0.25rem;">
									{#each CATEGORIES as cat}
										<label class="role-option" style="cursor:pointer;">
											<input type="checkbox"
												checked={tier.allowedCategories.includes(cat)}
												onchange={() => toggleCategory(tier, cat)} />
											{cat}
										</label>
									{/each}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="form-actions" style="margin-top:1.5rem;">
			<button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
		</div>
	</form>
</div>