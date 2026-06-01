<!-- apps/admin/src/routes/(app)/marketplace/data/import/+page.svelte -->
<script lang="ts">
	import type { PageData, ActionData } from './$types';
	let { form }: { form: ActionData } = $props();
	let submitting = $state(false);
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/marketplace/items" class="back-link">← Items</a>
			<h2 class="page__title">Import Items</h2>
		</div>
		<a href="/marketplace/data/export" class="btn btn-ghost btn-sm" download>↓ Export all items</a>
	</div>

	{#if form?.message}<div class="form-error">{form.message}</div>{/if}
	{#if (form as any)?.success}
		<div class="form-success">
			Import complete — {(form as any).created} created, {(form as any).updated} updated.
			{#if (form as any).errors?.length}
				<p style="margin-top:0.5rem; font-size:0.875rem;">{(form as any).errors.length} errors — check rows: {(form as any).errors.map((e: any) => e.row).join(', ')}</p>
			{/if}
		</div>
	{/if}

	<div class="card" style="max-width:480px;">
		<p style="font-size:0.875rem; color:var(--text-muted); margin-bottom:1rem;">
			Upload an xlsx file with columns: <strong>Category, Name, Price, Base Item, Var., Rarity, Att., Requirements, Weight, Source, Image, Link</strong>.
			Items are upserted by name — existing items are updated, new items are created.
		</p>
		<form method="post" enctype="multipart/form-data"
			onsubmit={() => submitting = true}>
			<div class="fields">
				<div class="field">
					<label class="label" for="file">xlsx file</label>
					<input id="file" name="file" type="file" class="input" accept=".xlsx,.xls" required />
				</div>
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={submitting}>
					{submitting ? 'Importing…' : 'Import'}
				</button>
			</div>
		</form>
	</div>
</div>
