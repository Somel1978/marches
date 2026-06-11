<!-- apps/frontend/src/routes/(protected)/token-store/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	const item     = $derived((data as any).item);
	const eligible = $derived((data as any).eligible ?? []);
	const rv       = $derived((item as any)?.rewardValue ?? {});

	const dirLabel: Record<string,string> = {
		RETROSPECTIVE: 'past quest transactions',
		FUTURE:        'future quest rewards',
		BOTH:          'past and future quest rewards',
	};
	const rewardLabel: Record<string,string> = {
		XP_BOOST: '⭐ Quest XP Boost', GOLD_BOOST: '💰 Quest GP Boost', MANUAL: '📋 Special Reward',
	};
</script>

<div class="page">
	<a href="/token-store" class="back-link">← Token Store</a>

	<div class="card" style="max-width:560px;margin-top:1rem;">
		{#if item?.imageUrl}
			<div style="aspect-ratio:16/9;overflow:hidden;border-radius:var(--radius-sm);background:var(--bg-overlay);margin-bottom:1rem;">
				<img src={item.imageUrl} alt={item.name} style="width:100%;height:100%;object-fit:cover;" />
			</div>
		{/if}

		<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
			<h2 style="font-size:1.25rem;font-weight:700;margin:0;">{item?.name}</h2>
			<span style="font-size:1.25rem;font-weight:700;color:var(--color-accent);">🪙 {item?.tokenCost}</span>
		</div>

		{#if item?.description}
			<p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:1rem;">{item.description}</p>
		{/if}

		<!-- Reward details -->
		<div class="card" style="background:var(--bg-overlay);margin-bottom:1rem;padding:0.75rem;">
			<p style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin:0 0 0.375rem;">Reward</p>
			<p style="font-size:0.9rem;font-weight:600;margin:0 0 0.25rem;">{rewardLabel[item?.rewardType] ?? item?.rewardType}</p>
			{#if item?.rewardType !== 'MANUAL' && (rv as any).percent}
				<p style="font-size:0.8125rem;color:var(--text-secondary);margin:0;">
					+{(rv as any).percent}% bonus applied to {dirLabel[(rv as any).direction] ?? (rv as any).direction}
				</p>
			{:else if item?.rewardType === 'MANUAL'}
				<p style="font-size:0.8125rem;color:var(--text-secondary);margin:0;">Applied manually by an admin or DM after approval.</p>
			{/if}
		</div>

		{#if (form as any)?.success}
			<div class="card" style="background:rgba(34,197,94,0.1);border-color:rgba(34,197,94,0.3);margin-bottom:1rem;padding:0.75rem;">
				<p style="color:#16a34a;font-weight:600;margin:0;">✅ Purchase submitted — awaiting approval.</p>
			</div>
		{/if}
		{#if (form as any)?.message}
			<p class="form-error">{(form as any).message}</p>
		{/if}

		{#if !eligible.length}
			<p style="font-size:0.875rem;color:var(--text-muted);">No eligible characters for this item.</p>
		{:else}
			<form method="post" action="?/buy" use:enhance>
				<div class="field">
					<label class="label" for="characterId">Purchase as</label>
					<select id="characterId" name="characterId" class="input input--select" required>
						<option value="">— Select character —</option>
						{#each eligible as c}
							<option value={c.id}>{c.name} (🪙 {c.totalTokens})</option>
						{/each}
					</select>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary">Purchase for 🪙 {item?.tokenCost}</button>
				</div>
			</form>
		{/if}
	</div>
</div>