<!-- apps/frontend/src/routes/(protected)/settings/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="page">
	<div class="page__header">
		<h2 class="page__title">Settings</h2>
	</div>

	{#if (data as any).successMsg === 'discord_linked'}
		<div class="form-success" style="margin-bottom:1rem;">Discord account linked successfully!</div>
	{/if}
	{#if (data as any).errorMsg}
		<div class="form-error" style="margin-bottom:1rem;">Something went wrong. Please try again.</div>
	{/if}

	<!-- Discord linking -->
	<div class="card">
		<h3 class="section-title">Discord</h3>
		{#if (data as any).user?.discordHandle}
			<div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
				<div>
					<p style="font-weight:600; margin:0;">Connected as <span style="color:var(--color-accent);">@{(data as any).user.discordHandle}</span></p>
					<p class="table__muted" style="font-size:0.8125rem; margin:0.125rem 0 0;">Your Discord is linked. You can receive quest invites via DM and use bot commands.</p>
				</div>
				<a href="/auth/discord/unlink" class="btn btn-ghost btn-sm" style="color:var(--color-danger);">Unlink</a>
			</div>
		{:else}
			<p class="table__muted" style="margin-bottom:0.75rem;">Link your Discord account to receive quest invites via DM and use slash commands in Discord.</p>
			<a href="/auth/discord" class="btn btn-primary btn-sm">Connect Discord</a>
		{/if}
	</div>
</div>
