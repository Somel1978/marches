<!-- apps/admin/src/routes/(app)/rewards/achievements/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function e_reload() { return async ({ update }: any) => { await update(); await invalidateAll(); }; }
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/rewards" class="back-link">← Rewards</a>
			<h2 class="page__title">Achievements</h2>
		</div>
	</div>

	{#if (form as any)?.message}<div class="form-error">{(form as any).message}</div>{/if}

	<div class="card" style="margin-bottom:1.5rem;">
		<h3 class="section-title">New achievement</h3>
		<form method="post" action="?/create" use:enhance={e_reload}>
			<div class="fields">
				<div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:flex-end;">
					<div class="field" style="flex:0 0 4rem;">
						<label class="label" for="ach-icon">Icon</label>
						<input id="ach-icon" name="icon" class="input" placeholder="🏆" maxlength="4" />
					</div>
					<div class="field" style="flex:1 1 180px;">
						<label class="label" for="ach-name">Name</label>
						<input id="ach-name" name="name" class="input" placeholder="Dragon Slayer" required />
					</div>
					<div class="field" style="flex:2 1 280px;">
						<label class="label" for="ach-desc">Description <span class="optional">(optional)</span></label>
						<input id="ach-desc" name="description" class="input" placeholder="Defeated a dragon" />
					</div>
					<button type="submit" class="btn btn-primary btn-sm">Add</button>
				</div>
			</div>
		</form>
	</div>

	<div class="card">
		{#if data.achievements.length}
			<table class="table">
				<thead><tr><th>Icon</th><th>Name</th><th>Description</th><th>Status</th><th></th></tr></thead>
				<tbody>
					{#each data.achievements as a}
						<tr>
							<td style="font-size:1.25rem;">{a.icon ?? ''}</td>
							<td class="table__name">{a.name}</td>
							<td class="table__muted">{a.description ?? '—'}</td>
							<td>
								<span class="badge {a.isActive ? 'badge-success' : 'badge-muted'}">{a.isActive ? 'Active' : 'Inactive'}</span>
							</td>
							<td>
								<form method="post" action="?/toggle" use:enhance={e_reload} style="display:contents;">
									<input type="hidden" name="id" value={a.id} />
									<input type="hidden" name="isActive" value={a.isActive} />
									<button type="submit" class="btn btn-ghost btn-sm">{a.isActive ? 'Deactivate' : 'Activate'}</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="table__empty">No achievements defined yet.</p>
		{/if}
	</div>
</div>
