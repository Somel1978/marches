<!-- apps/admin/src/routes/(app)/settings/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
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

	const oauthResult = $derived(page.url.searchParams.get('smtpOauth'));
	const oauthMessage = $derived(page.url.searchParams.get('message'));
	const smtpAuthMode = $derived(
		data.settings.find(s => s.key === 'smtp.authMode')?.value === 'oauth2' ? 'oauth2' : 'password'
	);

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

	// SMTP test-send state
	let testEmailTo   = $state('');
	let testSending   = $state(false);
	let testResult    = $state<{ ok: boolean; message: string } | null>(null);
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">Settings</h2>
	</div>

	{#each Object.entries(groups) as [group, settings]}
		<div class="card settings-group" style="margin-bottom:1rem;">
			<h3 class="group-title">{GROUP_LABELS[group] ?? group}</h3>

			{#if group === 'smtp'}
				{#if oauthResult === 'connected'}
					<p style="font-size:0.8125rem; color:var(--color-success); margin:0 0 0.75rem;">✓ Microsoft account connected — SMTP is now using OAuth2.</p>
				{:else if oauthResult === 'error'}
					<p style="font-size:0.8125rem; color:var(--color-danger); margin:0 0 0.75rem;">✕ Connection failed: {oauthMessage}</p>
				{/if}
				<div class="field" style="margin-bottom:0.75rem; padding-bottom:0.75rem; border-bottom:1px solid var(--border-muted);">
					<p class="field-hint" style="margin:0 0 0.5rem;">
						Many providers (Microsoft 365 / Outlook.com in particular) have disabled username/password SMTP login entirely —
						sending will fail with <code>535 5.7.139</code> regardless of a correct password. Use <strong>oauth2</strong> mode for those.
						Current mode: <strong>{smtpAuthMode === 'oauth2' ? 'OAuth2' : 'Username / Password'}</strong>.
					</p>
					{#if smtpAuthMode === 'oauth2'}
						<p class="field-hint" style="margin:0 0 0.5rem;">
							1. Register an app in <a href="https://entra.microsoft.com" target="_blank" rel="noopener">Entra ID</a> with a Web redirect URI of
							<code>{typeof window !== 'undefined' ? window.location.origin : ''}/settings/smtp-oauth/callback</code> and the
							<code>Mail.Send</code> / <code>offline_access</code> delegated permissions.<br />
							2. Fill in Tenant ID, Client ID, and Client Secret below and save each.<br />
							3. Click Connect — you'll sign in as the sending mailbox and grant consent once.
						</p>
						<a class="btn btn-ghost btn-sm" href="/settings/smtp-oauth">Connect Microsoft account</a>
					{/if}
				</div>
			{/if}

			<div class="fields">
				{#each settings as setting}
					{#if !(group === 'smtp' && setting.key === 'smtp.pass' && smtpAuthMode === 'oauth2') && !(group === 'smtp' && setting.key.startsWith('smtp.oauth2.') && smtpAuthMode === 'password')}
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
								{#if setting.key === 'smtp.authMode'}
									<select
										id={setting.key}
										name="value"
										class="input input--select"
										style="flex:1;"
										value={setting.value ?? 'password'}
									>
										<option value="password">Username / Password</option>
										<option value="oauth2">OAuth2 (Microsoft)</option>
									</select>
								{:else}
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
								{/if}
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
					{/if}
				{/each}
			</div>
			{#if group === 'smtp'}
				<div class="field" style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid var(--border-muted);">
					<label class="label" for="smtp-test-to">Test connection</label>
					<p class="field-hint">Send a test email using the settings above (save them first) to confirm SMTP is actually working — not just formatted correctly.</p>
					<form method="post" action="?/testSmtp"
						use:enhance={() => {
							testSending = true;
							testResult  = null;
							return async ({ result, update }) => {
								testSending = false;
								await update({ reset: false });
								if (result.type === 'success') testResult = { ok: true, message: `Test email sent to ${testEmailTo}.` };
								else if (result.type === 'failure') testResult = { ok: false, message: (result as any).data?.message ?? 'Test failed.' };
							};
						}}>
						<div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap">
							<input
								id="smtp-test-to"
								name="to"
								type="email"
								class="input"
								style="flex:1;"
								placeholder="you@example.com"
								bind:value={testEmailTo}
								autocomplete="off"
							/>
							<button type="submit" class="btn btn-ghost btn-sm" disabled={testSending || !testEmailTo}>
								{testSending ? 'Sending…' : 'Send test email'}
							</button>
						</div>
						{#if testResult}
							<p style="font-size:0.75rem; margin:0.375rem 0 0; color:{testResult.ok ? 'var(--color-success)' : 'var(--color-danger)'};">
								{testResult.ok ? '✓' : '✕'} {testResult.message}
							</p>
						{/if}
					</form>
				</div>
			{/if}
		</div>
	{/each}
</div>