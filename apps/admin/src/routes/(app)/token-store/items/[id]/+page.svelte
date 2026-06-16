<!-- apps/admin/src/routes/(app)/token-store/items/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { ConfirmModal } from '@core/ui';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	const item      = $derived((data as any).item);
	const systems   = $derived((data as any).systems   ?? []);
	const allWorlds = $derived((data as any).worlds    ?? []);
	let scope      = $state('GLOBAL');
	let rewardType = $state('MANUAL');
	$effect.pre(() => { scope = (item as any)?.scope ?? 'GLOBAL'; rewardType = (item as any)?.rewardType ?? 'MANUAL'; });
	const rv       = $derived((item as any)?.rewardValue ?? {});

	// ── Confirm modal ────────────────────────────────────────────────────────
	let _confirmOpen  = $state(false);
	let _confirmMsg   = $state('');
	let _confirmTitle = $state('');
	let _confirmCb    = $state<() => void>(() => {});
	function askConfirm(title: string, msg: string, cb: () => void) {
		_confirmTitle = title; _confirmMsg = msg; _confirmCb = cb; _confirmOpen = true;
	}
</script>

<div class="page">
	<a href="/token-store" class="back-link">← Token Store</a>
	<h2 class="page__title" style="margin-top:1rem;">Edit: {item?.name}</h2>
	{#if (form as any)?.message}<p class="form-error">{(form as any).message}</p>{/if}
	{#if (form as any)?.success}<p class="form-success">Saved.</p>{/if}

	<form method="post" action="?/update" use:enhance class="card" style="max-width:600px;margin-top:1rem;display:flex;flex-direction:column;gap:0.75rem;">
		<div class="field"><label class="label" for="name">Name *</label>
			<input id="name" name="name" class="input" value={item?.name ?? ''} required /></div>
		<div class="field"><label class="label" for="description">Description</label>
			<textarea id="description" name="description" class="input" rows="3">{item?.description ?? ''}</textarea></div>
		<div class="field"><label class="label" for="imageUrl">Image URL</label>
			<input id="imageUrl" name="imageUrl" type="url" class="input" value={item?.imageUrl ?? ''} /></div>
		<div class="sections">
			<div class="field"><label class="label" for="tokenCost">Token Cost *</label>
				<input id="tokenCost" name="tokenCost" type="number" min="0" class="input" value={item?.tokenCost ?? 1} required /></div>
			<div class="field"><label class="label" for="stock">Stock</label>
				<input id="stock" name="stock" type="number" min="0" class="input" value={item?.stock ?? ''} placeholder="Unlimited" /></div>
		</div>
		<div class="sections">
			<div class="field"><label class="label" for="gameSystemId">Game System</label>
				<select id="gameSystemId" name="gameSystemId" class="input input--select">
					<option value="" selected={!item?.gameSystemId}>Universal</option>
					{#each systems as s}<option value={s.id} selected={item?.gameSystemId === s.id}>{s.name}</option>{/each}
				</select></div>
			<div class="field"><label class="label" for="scope">Scope</label>
				<select id="scope" name="scope" class="input input--select" bind:value={scope}>
					<option value="GLOBAL" selected={scope === 'GLOBAL'}>🌍 Global</option>
					<option value="WORLD"  selected={scope === 'WORLD'}>🌐 World</option>
				</select></div>
		</div>
		{#if scope === 'WORLD'}
			<div class="field"><label class="label" for="worldId">World</label>
				<select id="worldId" name="worldId" class="input input--select">
					<option value="">— Select world —</option>
					{#each (allWorlds as any[]).filter((w: any) => w.isActive) as w}
						<option value={w.id} selected={item?.worldId === w.id}>{w.name}</option>
					{/each}
				</select></div>
		{/if}
		<div class="field"><label class="label" for="rewardType">Reward Type</label>
			<select id="rewardType" name="rewardType" class="input input--select" bind:value={rewardType}>
				<option value="XP_BOOST"   selected={rewardType === 'XP_BOOST'}>⭐ Quest XP Boost</option>
				<option value="GOLD_BOOST" selected={rewardType === 'GOLD_BOOST'}>💰 Quest GP Boost</option>
				<option value="MANUAL"     selected={rewardType === 'MANUAL'}>📋 Manual</option>
			</select></div>
		{#if rewardType !== 'MANUAL'}
			<div class="sections">
				<div class="field"><label class="label" for="percent">Boost %</label>
					<input id="percent" name="percent" type="number" min="1" max="500" class="input" value={(rv as any).percent ?? 10} /></div>
				<div class="field"><label class="label" for="direction">Apply To</label>
					<select id="direction" name="direction" class="input input--select">
						<option value="RETROSPECTIVE" selected={(rv as any).direction === 'RETROSPECTIVE'}>Past transactions</option>
						<option value="FUTURE"        selected={(rv as any).direction === 'FUTURE'}>Future quests</option>
						<option value="BOTH"          selected={(rv as any).direction === 'BOTH'}>Both</option>
					</select></div>
			</div>
		{/if}
		<div class="field"><label class="label" for="isActive">Status</label>
			<select id="isActive" name="isActive" class="input input--select">
				<option value="true"  selected={item?.isActive}>Active</option>
				<option value="false" selected={!item?.isActive}>Inactive</option>
			</select></div>
		<div class="form-actions">
			<button type="submit" class="btn btn-primary">Save</button>
		</div>
	</form>

	<form method="post" action="?/delete" use:enhance style="margin-top:1rem;">
		<button type="submit" class="btn btn-danger btn-sm"
			onclick={(ev) => askConfirm('Confirm', 'Delete this item?', () => { (ev.currentTarget as HTMLElement)?.closest('form')?.requestSubmit(); })}>
			Delete Item
		</button>
	</form>
</div>
<ConfirmModal
	open={_confirmOpen}
	title={_confirmTitle}
	message={_confirmMsg}
	confirmLabel="Confirm"
	confirmClass="btn-danger"
	onconfirm={() => { _confirmOpen = false; _confirmCb(); }}
	oncancel={() => { _confirmOpen = false; }}
/>