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
			<div class="table-wrap">
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