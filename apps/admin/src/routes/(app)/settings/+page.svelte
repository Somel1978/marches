<!-- apps/admin/src/routes/(app)/settings/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving = $state(false);

	// Group settings by prefix
	const groups = $derived(() => {
		const map: Record<string, typeof data.settings> = {};
		for (const s of data.settings) {
			const group = s.key.split('.')[0];
			map[group] ??= [];
			map[group].push(s);
		}
		return map;
	});

	const GROUP_LABELS: Record<string, string> = {
		smtp:    'SMTP (Outgoing Mail)',
		discord: 'Discord Integration',
		email: 'Email Defaults',
		site:  'Site Configuration',
	};
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">Settings</h2>
	</div>

	{#if form?.message}
		<div class="form-error">{form.message}</div>
	{/if}
	{#if form?.success}
		<div class="form-success">Settings saved.</div>
	{/if}

	<form
		method="post"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => { saving = false; await update(); };
		}}
	>
		{#each Object.entries(groups()) as [group, settings]}
			<div class="card settings-group">
				<h3 class="group-title">{GROUP_LABELS[group] ?? group}</h3>
				<div class="fields">
					{#each settings as setting}
						<div class="field">
							<label class="label" for={setting.key}>
								{setting.key}
								{#if setting.isSecret}
									<span class="badge badge-muted">secret</span>
								{/if}
							</label>
							{#if setting.description}
								<p class="field-hint">{setting.description}</p>
							{/if}
							<input
								id={setting.key}
								name={setting.key}
								type={setting.isSecret ? 'password' : 'text'}
								class="input"
								value={setting.value ?? ''}
								placeholder={setting.isSecret ? 'Leave blank to keep current' : ''}
								autocomplete="off"
							/>
						</div>
					{/each}
				</div>
			</div>
		{/each}

		<div class="save-bar">
			<button type="submit" class="btn btn-primary" disabled={saving}>
				{saving ? 'Saving…' : 'Save settings'}
			</button>
		</div>
	</form>
</div>