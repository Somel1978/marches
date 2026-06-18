<!-- apps/admin/src/routes/(app)/settings/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const groups = $derived(
		data.settings.reduce((map: Record<string, typeof data.settings>, s) => {
			const group = s.key.split('.')[0];
			map[group] ??= [];
			map[group].push(s);
			return map;
		}, {} as Record<string, typeof data.settings>)
	);

	const GROUP_LABELS: Record<string, string> = {
		smtp:    'SMTP (Outgoing Mail)',
		discord: 'Discord Integration',
		email:   'Email Defaults',
		site:    'Site Configuration',
	};

	// Track saved/saving state per key
	let savedKeys  = $state<Set<string>>(new Set());
	let savingKeys = $state<Set<string>>(new Set());
	let errorKeys  = $state<Map<string, string>>(new Map());

	function onSaved(key: string) {
		savedKeys  = new Set([...savedKeys, key]);
		savingKeys = new Set([...savingKeys].filter(k => k !== key));
		errorKeys  = new Map([...errorKeys].filter(([k]) => k !== key));
		setTimeout(() => {
			savedKeys = new Set([...savedKeys].filter(k => k !== key));
		}, 2000);
	}
	function onError(key: string, msg: string) {
		savingKeys = new Set([...savingKeys].filter(k => k !== key));
		errorKeys  = new Map([...errorKeys, [key, msg]]);
	}
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">Settings</h2>
	</div>

	{#each Object.entries(groups) as [group, settings]}
		<div class="card settings-group" style="margin-bottom:1rem;">
			<h3 class="group-title">{GROUP_LABELS[group] ?? group}</h3>
			<div class="fields">
				{#each settings as setting}
					<div class="field">
						<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:0.25rem; flex-wrap:wrap">
							<label class="label" for={setting.key} style="margin:0;">
								{setting.key}
								{#if setting.isSecret}<span class="badge badge-muted">secret</span>{/if}
							</label>
							{#if savedKeys.has(setting.key)}
								<span style="font-size:0.75rem; color:var(--color-success);">✓ Saved</span>
							{:else if savingKeys.has(setting.key)}
								<span style="font-size:0.75rem; color:var(--text-muted);">Saving…</span>
							{:else if errorKeys.has(setting.key)}
								<span style="font-size:0.75rem; color:var(--color-danger);">✕ Error</span>
							{/if}
						</div>
						{#if setting.description}
							<p class="field-hint">{setting.description}</p>
						{/if}
						<form method="post" action="?/saveSetting"
							use:enhance={() => {
								savingKeys = new Set([...savingKeys, setting.key]);
								return async ({ result, update }) => {
									await update({ reset: false });
									if (result.type === 'success') onSaved(setting.key);
									else if (result.type === 'failure') onError(setting.key, (result as any).data?.message ?? 'Save failed.');
									else savingKeys = new Set([...savingKeys].filter(k => k !== setting.key));
								};
							}}>
							<input type="hidden" name="key"      value={setting.key} />
							<input type="hidden" name="isSecret" value={String(setting.isSecret)} />
							<div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap">
								<input
									id={setting.key}
									name="value"
									type={setting.isSecret ? 'password' : 'text'}
									class="input"
									style="flex:1;"
									value={setting.isSecret ? '' : (setting.value ?? '')}
									placeholder={setting.isSecret ? (setting.value ? 'Set — enter new value to change' : 'Enter value') : ''}
									autocomplete="off"
								/>
								<button type="submit" class="btn btn-ghost btn-sm"
									disabled={savingKeys.has(setting.key)}>
									Save
								</button>
							</div>
							{#if errorKeys.has(setting.key)}
								<p style="font-size:0.75rem; color:var(--color-danger); margin:0.25rem 0 0;">{errorKeys.get(setting.key)}</p>
							{/if}
						</form>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>