<!-- apps/admin/src/routes/(app)/game-systems/new/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let saving = $state(false);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/game-systems" class="back-link">← Game Systems</a>
			<h2 class="page__title">New game system</h2>
		</div>
	</div>

	<div class="card" style="max-width: 480px;">
		{#if form?.message}
			<div class="form-error">{form.message}</div>
		{/if}

		<form method="post" use:enhance={() => {
			saving = true;
			return async ({ update }) => { saving = false; await update(); };
		}}>
			<div class="fields">
				<div class="field">
					<label class="label" for="name">Name</label>
					<input id="name" name="name" type="text" class="input"
						value={form?.name ?? ''} placeholder="e.g. D&D 5e" required />
				</div>
				<div class="field">
					<label class="label" for="description">
						Description <span class="optional">(optional)</span>
					</label>
					<input id="description" name="description" type="text" class="input"
						value={form?.description ?? ''} placeholder="Short description" />
				</div>
			</div>
			<div class="form-actions">
				<a href="/game-systems" class="btn btn-ghost">Cancel</a>
				<button type="submit" class="btn btn-primary" disabled={saving}>
					{saving ? 'Creating…' : 'Create game system'}
				</button>
			</div>
		</form>
	</div>
</div>
