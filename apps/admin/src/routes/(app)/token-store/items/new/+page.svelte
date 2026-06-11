<!-- apps/admin/src/routes/(app)/token-store/items/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	const systems   = $derived((data as any).systems   ?? []);
	const allWorlds = $derived((data as any).worlds    ?? []);
	let scope      = $state('GLOBAL');
	let rewardType = $state('MANUAL');
</script>

<div class="page">
	<a href="/token-store" class="back-link">← Token Store</a>
	<h2 class="page__title" style="margin-top:1rem;">New Token Store Item</h2>
	{#if (form as any)?.message}<p class="form-error">{(form as any).message}</p>{/if}
	<form method="post" use:enhance class="card" style="max-width:600px;margin-top:1rem;display:flex;flex-direction:column;gap:0.75rem;">
		<div class="field"><label class="label" for="name">Name *</label>
			<input id="name" name="name" class="input" required /></div>
		<div class="field"><label class="label" for="description">Description</label>
			<textarea id="description" name="description" class="input" rows="3"></textarea></div>
		<div class="field"><label class="label" for="imageUrl">Image URL</label>
			<input id="imageUrl" name="imageUrl" type="url" class="input" /></div>
		<div class="sections">
			<div class="field"><label class="label" for="tokenCost">Token Cost *</label>
				<input id="tokenCost" name="tokenCost" type="number" min="0" class="input" value="1" required /></div>
			<div class="field"><label class="label" for="stock">Stock (blank = unlimited)</label>
				<input id="stock" name="stock" type="number" min="0" class="input" placeholder="Unlimited" /></div>
		</div>
		<div class="sections">
			<div class="field"><label class="label" for="gameSystemId">Game System</label>
				<select id="gameSystemId" name="gameSystemId" class="input input--select">
					<option value="">Universal</option>
					{#each systems as s}<option value={s.id}>{s.name}</option>{/each}
				</select></div>
			<div class="field"><label class="label" for="scope">Scope</label>
				<select id="scope" name="scope" class="input input--select" bind:value={scope}>
					<option value="GLOBAL">🌍 Global</option>
					<option value="WORLD">🌐 World</option>
				</select></div>
		</div>
		{#if scope === 'WORLD'}
			<div class="field"><label class="label" for="worldId">World *</label>
				<select id="worldId" name="worldId" class="input input--select" required>
					<option value="">— Select world —</option>
					{#each (allWorlds as any[]).filter((w: any) => w.isActive) as w}
						<option value={w.id}>{w.name}</option>
					{/each}
				</select></div>
		{/if}
		<div class="field"><label class="label" for="rewardType">Reward Type *</label>
			<select id="rewardType" name="rewardType" class="input input--select" bind:value={rewardType}>
				<option value="XP_BOOST">⭐ Quest XP Boost</option>
				<option value="GOLD_BOOST">💰 Quest GP Boost</option>
				<option value="MANUAL">📋 Manual</option>
			</select></div>
		{#if rewardType !== 'MANUAL'}
			<div class="sections">
				<div class="field"><label class="label" for="percent">Boost %</label>
					<input id="percent" name="percent" type="number" min="1" max="500" class="input" value="10" /></div>
				<div class="field"><label class="label" for="direction">Apply To</label>
					<select id="direction" name="direction" class="input input--select">
						<option value="RETROSPECTIVE">Past transactions</option>
						<option value="FUTURE">Future quests</option>
						<option value="BOTH">Both</option>
					</select></div>
			</div>
		{/if}
		<div class="field"><label class="label" for="isActive">Status</label>
			<select id="isActive" name="isActive" class="input input--select">
				<option value="true">Active</option>
				<option value="false">Inactive</option>
			</select></div>
		<div class="form-actions">
			<button type="submit" class="btn btn-primary">Create Item</button>
		</div>
	</form>
</div>