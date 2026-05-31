<!-- apps/admin/src/routes/(app)/characters/slots/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let expandedUser = $state<string | null>(null);

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/characters" class="back-link">← Characters</a>
			<h2 class="page__title">Character slots</h2>
			<p class="page__subtitle">{data.slotData.length} users</p>
		</div>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if form?.success}<div class="form-success">Slot grant saved.</div>{/if}

	<div class="table-wrap card">
		<div class="table-wrap">
			<table class="table">
			<thead>
				<tr>
					<th>User</th>
					<th>Base</th>
					<th>Bonus</th>
					<th>Total</th>
					<th>Used</th>
					<th>Available</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.slotData as row}
					<tr>
						<td>
							<a href="/users/{row.user.id}" class="table__name">{row.user.name}</a>
							<span class="table__muted" style="font-size:0.8125rem; display:block;">{row.user.email}</span>
						</td>
						<td>{row.base}</td>
						<td>
							{#if row.bonus !== 0}
								<span class="badge {row.bonus > 0 ? 'badge-success' : 'badge-danger'}">{row.bonus > 0 ? '+' : ''}{row.bonus}</span>
							{:else}
								<span class="table__muted">—</span>
							{/if}
						</td>
						<td><strong>{row.total}</strong></td>
						<td>{row.used}</td>
						<td>
							<span class="badge {row.available > 0 ? 'badge-success' : 'badge-muted'}">{row.available}</span>
						</td>
						<td class="table__action">
							<button class="btn btn-ghost btn-sm"
								onclick={() => expandedUser = expandedUser === row.user.id ? null : row.user.id}>
								{expandedUser === row.user.id ? 'Close' : 'Manage'}
							</button>
						</td>
					</tr>

					{#if expandedUser === row.user.id}
						<tr>
							<td colspan="7" style="padding:1rem; background:var(--bg-overlay);">
								<!-- Grant history -->
								{#if row.grants.length}
									<div class="table-wrap">
										<table class="table" style="margin-bottom:1rem;">
										<thead><tr><th>Delta</th><th>Reason</th><th>Granted by</th><th>Date</th></tr></thead>
										<tbody>
											{#each row.grants as grant}
												<tr>
													<td><span class="badge {grant.delta > 0 ? 'badge-success' : 'badge-danger'}">{grant.delta > 0 ? '+' : ''}{grant.delta}</span></td>
													<td>{grant.reason}</td>
													<td class="table__muted">{(grant as any).grantedByName}</td>
													<td class="table__muted">{formatDate(grant.createdAt)}</td>
												</tr>
											{/each}
										</tbody>
									</table>
</div>
								{/if}

								<!-- Grant form -->
								<form method="post" action="?/grantSlot"
									use:enhance={() => { return async ({ update }) => { await update(); await invalidateAll(); }; }}>
									<input type="hidden" name="userId" value={row.user.id} />
									<div class="fields" style="flex-direction:row; align-items:flex-end; flex-wrap:wrap;">
										<div class="field" style="min-width:100px; flex:1;">
											<label class="label" for="delta-{row.user.id}">Delta</label>
											<input id="delta-{row.user.id}" name="delta" type="number"
												class="input" placeholder="+1 or -1" required />
										</div>
										<div class="field" style="min-width:200px; flex:3;">
											<label class="label" for="reason-{row.user.id}">Reason</label>
											<input id="reason-{row.user.id}" name="reason" type="text"
												class="input" placeholder="e.g. Quest reward, Event prize" required />
										</div>
										<button type="submit" class="btn btn-primary btn-sm" style="align-self:flex-end; margin-bottom:0.125rem;">
											Grant
										</button>
									</div>
								</form>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
</div>
	</div>
</div>