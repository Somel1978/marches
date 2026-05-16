<!-- apps/admin/src/routes/(app)/roles/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/roles" class="back-link">← Roles</a>
			<h2 class="page__title">New role</h2>
		</div>
	</div>

	<div class="card" style="max-width: 480px;">
		<form
			method="post"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => { loading = false; await update(); };
			}}
		>
			{#if form?.message}
				<div class="form-error">{form.message}</div>
			{/if}

			<div class="field">
				<label class="label" for="name">Name</label>
				<input
					id="name"
					name="name"
					type="text"
					class="input"
					placeholder="e.g. GAME_MASTER"
					value={form?.name ?? ''}
					required
				/>
			</div>

			<div class="field">
				<label class="label" for="description">Description <span class="optional">(optional)</span></label>
				<input
					id="description"
					name="description"
					type="text"
					class="input"
					placeholder="What this role is for"
					value={form?.description ?? ''}
				/>
			</div>

			<div class="form-actions">
				<a href="/roles" class="btn btn-ghost">Cancel</a>
				<button type="submit" class="btn btn-primary" disabled={loading}>
					{loading ? 'Creating…' : 'Create role'}
				</button>
			</div>
		</form>
	</div>
</div>