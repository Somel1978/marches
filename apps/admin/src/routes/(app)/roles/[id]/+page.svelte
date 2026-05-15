<!-- apps/admin/src/routes/(app)/roles/[id]/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { PermissionCell } from '@core/ui';
	import type { PageData, ActionData } from './$types';

	type AccessLevel = 'NONE' | 'OWN' | 'ALL';

	type PermRow = {
		canCreate: AccessLevel;
		canRead:   AccessLevel;
		canUpdate: AccessLevel;
		canDelete: AccessLevel;
	};

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const locked = $derived(data.role.name === 'SUPERADMIN');

	// Build reactive permission state from server data
	// $state initialised from $derived so it updates on navigation but stays mutable for edits
	let permBase = $derived(
		Object.fromEntries(
			data.modules.flatMap(m => m.resources).map(r => [
				r.key,
				data.permMap[r.key] ?? { canCreate: 'NONE' as PermRow['canCreate'], canRead: 'NONE' as PermRow['canRead'], canUpdate: 'NONE' as PermRow['canUpdate'], canDelete: 'NONE' as PermRow['canDelete'] },
			])
		)
	);
	let perms = $state<Record<string, PermRow>>({});
	$effect(() => { perms = { ...permBase }; });

	function set(key: string, action: keyof PermRow, value: AccessLevel) {
		perms[key] = { ...perms[key], [action]: value };
	}

	// Serialize for form submission
	const serialized = $derived(
		JSON.stringify(
			Object.entries(perms)
				.filter(([, p]) => Object.values(p).some(v => v !== 'NONE'))
				.map(([resourceKey, p]) => ({ resourceKey, ...p }))
		)
	);

	let saving  = $state(false);
	let deleting = $state(false);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/roles" class="back-link">← Roles</a>
			<div class="page__title-row">
				<h2 class="page__title">{data.role.name}</h2>
				{#if locked}
					<span class="badge badge-accent">System — read only</span>
				{/if}
			</div>
			{#if data.role.description}
				<p class="page__subtitle">{data.role.description}</p>
			{/if}
		</div>

		{#if !locked}
			<form
				method="post"
				action="?/delete"
				use:enhance={() => {
					if (!confirm('Delete this role? This cannot be undone.')) return () => {};
					deleting = true;
					return async ({ update }) => { deleting = false; await update(); };
				}}
			>
				<button type="submit" class="btn btn-danger btn-sm" disabled={deleting}>
					{deleting ? 'Deleting…' : 'Delete role'}
				</button>
			</form>
		{/if}
	</div>

	{#if form?.message}
		<div class="form-error">{form.message}</div>
	{/if}
	{#if form?.success}
		<div class="form-success">Permissions saved.</div>
	{/if}

	<form
		method="post"
		action="?/save"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => { saving = false; await update(); };
		}}
	>
		<input type="hidden" name="permissions" value={serialized} />

		<div class="matrix-wrap card">
			<table class="matrix">
				<thead>
					<tr>
						<th class="matrix__resource">Resource</th>
						<th class="matrix__cell">Nav</th>
						<th class="matrix__cell">Create</th>
						<th class="matrix__cell">Read</th>
						<th class="matrix__cell">Update</th>
						<th class="matrix__cell">Delete</th>
					</tr>
				</thead>
				<tbody>
					{#each data.modules as module}
						<tr class="matrix__group">
							<td colspan="5">{module.name}</td>
						</tr>
						{#each module.resources as resource}
							<tr>
								<td class="matrix__resource-name">{resource.displayName}</td>
								<td class="matrix__cell matrix__nav">
									<span class="nav-badge nav-badge--{resource.navVisibility.toLowerCase()}" title="Nav visibility: {resource.navVisibility}">
										{resource.navVisibility}
									</span>
								</td>
								<td class="matrix__cell">
									<PermissionCell
										value={perms[resource.key]?.canCreate ?? 'NONE'}
										{locked}
										onchange={(v) => set(resource.key, 'canCreate', v)}
									/>
								</td>
								<td class="matrix__cell">
									<PermissionCell
										value={perms[resource.key]?.canRead ?? 'NONE'}
										{locked}
										onchange={(v) => set(resource.key, 'canRead', v)}
									/>
								</td>
								<td class="matrix__cell">
									<PermissionCell
										value={perms[resource.key]?.canUpdate ?? 'NONE'}
										{locked}
										onchange={(v) => set(resource.key, 'canUpdate', v)}
									/>
								</td>
								<td class="matrix__cell">
									<PermissionCell
										value={perms[resource.key]?.canDelete ?? 'NONE'}
										{locked}
										onchange={(v) => set(resource.key, 'canDelete', v)}
									/>
								</td>
							</tr>
						{/each}
					{/each}
				</tbody>
			</table>
		</div>

		{#if !locked}
			<div class="save-bar">
				<p class="save-bar__hint">
					<span class="legend legend--none"></span>None
					<span class="legend legend--own"></span>Own
					<span class="legend legend--all"></span>All
				</p>
				<button type="submit" class="btn btn-primary" disabled={saving}>
					{saving ? 'Saving…' : 'Save permissions'}
				</button>
			</div>
		{/if}
	</form>
</div>

<style>
	.page { display: flex; flex-direction: column; gap: 1.5rem; }

	.page__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.page__title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.25rem;
	}

	.page__title { font-size: 1.25rem; font-weight: 700; }
	.page__subtitle { font-size: 0.875rem; color: var(--text-secondary); margin: 0.25rem 0 0; }
	.back-link { font-size: 0.875rem; color: var(--text-muted); text-decoration: none; }
	.back-link:hover { color: var(--text-primary); }

	.form-error {
		background-color: rgba(139, 58, 58, 0.15);
		border: 1px solid var(--color-danger);
		border-radius: var(--radius-md);
		padding: 0.625rem 0.875rem;
		font-size: 0.875rem;
		color: #e08080;
	}

	.form-success {
		background-color: rgba(74, 124, 89, 0.15);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-md);
		padding: 0.625rem 0.875rem;
		font-size: 0.875rem;
		color: #80c090;
	}

	.matrix-wrap { padding: 0; overflow-x: auto; }

	.matrix {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.matrix th {
		padding: 0.75rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-muted);
		border-bottom: 1px solid var(--border-muted);
		white-space: nowrap;
	}

	.matrix th.matrix__cell { text-align: center; width: 80px; }

	.matrix td {
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--border-muted);
		vertical-align: middle;
	}

	.matrix tr:last-child td { border-bottom: none; }

	.matrix__group td {
		padding: 0.5rem 1rem 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background-color: var(--bg-overlay);
		border-bottom: 1px solid var(--border-muted);
	}

	.matrix__resource { text-align: left; }
	.matrix__nav { text-align: center; width: 60px; }

	.nav-badge {
		display: inline-block;
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.nav-badge--none { background-color: var(--bg-overlay); color: var(--text-disabled); }
	.nav-badge--any  { background-color: rgba(184, 115, 74, 0.15); color: var(--accent-light); }
	.nav-badge--all  { background-color: rgba(184, 115, 74, 0.3);  color: var(--accent); }
	.matrix__resource-name { color: var(--text-secondary); padding-left: 1.5rem !important; }
	.matrix__cell { text-align: center; width: 80px; }

	.save-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-top: 0.5rem;
	}

	.save-bar__hint {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.8125rem;
		color: var(--text-muted);
		margin: 0;
	}

	.legend {
		display: inline-block;
		width: 14px;
		height: 14px;
		border-radius: 3px;
		vertical-align: middle;
	}
	.legend--none { border: 1.5px solid var(--text-disabled); }
	.legend--own  { border: 1.5px solid var(--brand-accent-light); background: transparent; border-radius: 50%; }
	.legend--all  { background: var(--accent); }
</style>