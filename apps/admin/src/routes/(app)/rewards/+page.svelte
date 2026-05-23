<!-- apps/admin/src/routes/(app)/rewards/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
	function e_reload() { return async ({ update }: any) => { await update(); await invalidateAll(); }; }
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">Rewards</h2>
	</div>

	<div class="page__nav" style="display:flex; gap:0.5rem; margin-bottom:1.5rem; flex-wrap:wrap;">
		<a href="/rewards/achievements" class="btn btn-ghost btn-sm">🏆 Achievements</a>
		<a href="/rewards/grant" class="btn btn-ghost btn-sm">🎁 Grant reward</a>
	</div>

	{#if data.pendingItemUsages.length}
		<div class="card" style="border-color:var(--color-warning); margin-bottom:1.5rem;">
			<h3 class="section-title" style="color:var(--color-warning);">Pending item usage approvals ({data.pendingItemUsages.length})</h3>
			<table class="table">
				<thead><tr><th>Character</th><th>Item</th><th>Qty</th><th>Quest</th><th>Actions</th></tr></thead>
				<tbody>
					{#each data.pendingItemUsages as u}
						<tr>
							<td>{u.characterName}</td>
							<td>{u.itemName}</td>
							<td>{u.quantityUsed}</td>
							<td><a href="/quests/{u.questId}" class="table__name">{u.questTitle}</a></td>
							<td>
								<a href="/quests/{u.questId}" class="btn btn-primary btn-sm">Review</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<div class="card">
		<h3 class="section-title">Recent achievement grants</h3>
		{#if data.recentGrants.length}
			<table class="table">
				<thead><tr><th>Character</th><th>Achievement</th><th>Date</th><th></th></tr></thead>
				<tbody>
					{#each data.recentGrants as g}
						<tr>
							<td>{g.characterName}</td>
							<td>{g.achievement?.icon ?? ''} {g.achievement?.name ?? g.achievementId}</td>
							<td class="table__muted">{new Date(g.grantedAt).toLocaleDateString('en-GB')}</td>
							<td>
								<form method="post" action="?/revokeAchievement" use:enhance={e_reload} style="display:contents;">
									<input type="hidden" name="characterId"   value={g.characterId} />
									<input type="hidden" name="achievementId" value={g.achievementId} />
									<button type="submit" class="btn btn-ghost btn-sm"
										onclick={(e) => { if (!window.confirm('Revoke this achievement?')) e.preventDefault(); }}>
										Revoke
									</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="table__empty">No achievements granted yet.</p>
		{/if}
	</div>
</div>