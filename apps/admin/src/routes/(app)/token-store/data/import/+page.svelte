<!-- apps/admin/src/routes/(app)/token-store/data/import/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	let { form }: { form: ActionData } = $props();
</script>
<div class="page">
	<a href="/token-store" class="back-link">← Token Store</a>
	<h2 class="page__title" style="margin-top:1rem;">Import Token Store Items</h2>
	{#if (form as any)?.success}
		<div class="card" style="margin-bottom:1rem;">
			<p>✅ Created: {(form as any).created} · Updated: {(form as any).updated}</p>
			{#if (form as any)?.errors?.length}
				<p style="color:var(--color-danger);">Errors:</p>
				{#each (form as any).errors as e}<p style="font-size:0.8125rem;color:var(--color-danger);">{e}</p>{/each}
			{/if}
		</div>
	{/if}
	{#if (form as any)?.message}<p class="form-error">{(form as any).message}</p>{/if}
	<form method="post" enctype="multipart/form-data" use:enhance class="card" style="max-width:480px;margin-top:1rem;">
		<div class="field">
			<label class="label" for="file">XLSX File</label>
			<input id="file" name="file" type="file" accept=".xlsx" class="input" required />
		</div>
		<p style="font-size:0.8125rem;color:var(--text-muted);margin-top:0.5rem;">
			Columns: Name, Description, Image URL, Token Cost, Game System, Scope, World ID, Reward Type, Reward Value (JSON), Active, Stock
		</p>
		<div class="form-actions" style="margin-top:0.75rem;">
			<button type="submit" class="btn btn-primary">Import</button>
		</div>
	</form>
</div>
