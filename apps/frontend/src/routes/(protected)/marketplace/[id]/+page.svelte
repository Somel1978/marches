<!-- apps/frontend/src/routes/(protected)/marketplace/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving         = $state(false);
	let selectedCharId = $state('');

	const selectedChar = $derived((data as any).activeChars?.find((c: any) => c.id === selectedCharId));

	// Resolve context for the selected character's world.
	// World-locked char → use their worldId. Global char → use '__global__'.
	const ctxKey = $derived(selectedChar?.worldId ?? '__global__');
	const ctx    = $derived((data as any).contexts?.[ctxKey] ?? (data as any).contexts?.['__global__']);

	// Default context shown before a character is selected (use URL worldId hint or global)
	const defaultCtxKey = $derived((data as any).urlWorldId ?? '__global__');
	const displayCtx    = $derived(ctx ?? (data as any).contexts?.[defaultCtxKey] ?? (data as any).contexts?.['__global__']);

	const effectiveSell = $derived(displayCtx ? Math.floor(displayCtx.price * displayCtx.sellPricePercent / 100) : 0);
	const isWorldPriced = $derived(!!displayCtx && displayCtx.price !== (data as any).item.buyPrice);

	const rarityColors: Record<string, string> = {
		Mundane:   'badge-muted',  Common:    'badge-muted',
		Uncommon:  'badge-accent', Rare:      'badge-success',
		Very_Rare: 'badge-warning', Legendary: 'badge-danger',
		Artifact:  'badge-danger', Unknown:   'badge-muted',
	};
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/marketplace{(data as any).urlWorldId ? `?worldId=${(data as any).urlWorldId}` : ''}" class="back-link">← Marketplace</a>
			<h2 class="page__title">{data.item.name}</h2>
			<div class="page__title-row">
				<span class="badge {rarityColors[data.item.rarity] ?? 'badge-muted'}">{data.item.rarity.replace('_', ' ')}</span>
				<span class="badge badge-muted">{data.item.category}</span>
				{#if data.item.requiresAttunement}<span class="badge badge-warning">Requires Attunement</span>{/if}
			</div>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if (form as any)?.success}
		<div class="form-success">Purchase request submitted — awaiting admin approval.</div>
	{/if}

	<div class="sections">
		<!-- Item details -->
		<div class="card">
			{#if data.item.imageUrl}
				<img src={data.item.imageUrl} alt={data.item.name} style="width:80px; height:80px; object-fit:contain; margin-bottom:0.75rem;" />
			{/if}
			<div class="fields" style="margin-bottom:0;">
				<div class="field">
					<span class="label">Buy price</span>
					{#if displayCtx}
						<strong>
							{displayCtx.price.toLocaleString()} GP
							{#if isWorldPriced}
								<span style="font-weight:400; color:var(--text-muted); font-size:0.8rem;"> (global: {(data as any).item.buyPrice.toLocaleString()} GP)</span>
							{/if}
						</strong>
					{:else}
						<strong>{(data as any).item.buyPrice.toLocaleString()} GP</strong>
					{/if}
				</div>
				<div class="field">
					<span class="label">Sell price</span>
					<span class="table__muted">{effectiveSell.toLocaleString()} GP</span>
				</div>
				{#if displayCtx?.stockEnabled && displayCtx.stock !== null}
					<div class="field">
						<span class="label">Stock</span>
						<span class="badge badge-accent">{displayCtx.stock} remaining</span>
					</div>
				{/if}
				{#if data.item.weight}<div class="field"><span class="label">Weight</span><span class="table__muted">{data.item.weight} lbs</span></div>{/if}
				{#if data.item.source}<div class="field"><span class="label">Source</span><span class="table__muted">{data.item.source}</span></div>{/if}
				{#if data.item.description}<div class="field"><span class="label">Description</span><p style="font-size:0.875rem; color:var(--text-secondary); margin:0; white-space:pre-wrap;">{data.item.description}</p></div>{/if}
				{#if data.item.requirements}<div class="field"><span class="label">Requirements</span><span class="table__muted">{data.item.requirements}</span></div>{/if}
				{#if data.item.link}<div class="field"><span class="label">Reference</span><a href={data.item.link} target="_blank" style="font-size:0.875rem;">D&D Beyond ↗</a></div>{/if}
			</div>
		</div>

		<!-- Purchase form -->
		{#if (data as any).activeChars.length}
			<div class="card" style="max-width:400px;">
				<h3 class="section-title">Purchase</h3>
				<p class="field-hint" style="margin-bottom:0.75rem;">
					Purchase requests require admin approval. Gold is reserved on request.
				</p>
				<form method="post" action="?/buy" use:enhance={() => {
					saving = true;
					return async ({ update }) => { saving = false; await update(); };
				}}>
					<div class="fields">
						<div class="field">
							<label class="label" for="characterId">Character</label>
							<select id="characterId" name="characterId" class="input" bind:value={selectedCharId} required>
								<option value="">Select…</option>
								{#each (data as any).activeChars as char}
									<option value={char.id}>
										{char.name} — {char.totalGold.toLocaleString()} GP
										{#if char.worldId}·  {(data as any).contexts?.[char.worldId]?.price !== (data as any).item.buyPrice ? '🌍' : ''}{/if}
									</option>
								{/each}
							</select>
							{#if selectedChar?.worldId && ctx?.price !== (data as any).item.buyPrice}
								<p class="field-hint" style="margin-top:0.25rem; color:var(--color-accent);">
									World price applies — {ctx.price.toLocaleString()} GP
								</p>
							{:else if selectedChar?.worldId}
								<p class="field-hint" style="margin-top:0.25rem;">World market active</p>
							{/if}
						</div>
						<div class="field">
							<label class="label" for="quantity">Quantity</label>
							<input id="quantity" name="quantity" type="number" class="input" min="1" value="1" required />
						</div>
					</div>
					<div class="form-actions">
						<button type="submit" class="btn btn-primary" disabled={saving || !selectedCharId}>
							{#if saving}
								Submitting…
							{:else if selectedChar && ctx}
								Request purchase — {ctx.price.toLocaleString()} GP
							{:else}
								Select a character to purchase
							{/if}
						</button>
					</div>
				</form>
			</div>
		{:else}
			<div class="card">
				<p class="table__muted">You need an active character to purchase items.</p>
			</div>
		{/if}
	</div>
</div>