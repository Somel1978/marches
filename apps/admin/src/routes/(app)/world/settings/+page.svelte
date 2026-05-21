<!-- apps/admin/src/routes/(app)/world/settings/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving = $state(false);
	function val(key: string) { return data.settings.find(s => s.key === key)?.value ?? 'true'; }
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/world" class="back-link">← Worlds</a>
			<h2 class="page__title">World settings</h2>
		</div>
	</div>

	<div class="card" style="max-width:480px;">
		{#if form?.message}<div class="form-error">{form.message}</div>{/if}
		{#if form?.success}<div class="form-success">Settings saved.</div>{/if}

		<form method="post" use:enhance={() => {
			saving = true;
			return async ({ update }) => { saving = false; await update(); };
		}}>
			<div class="fields">
				<div class="field field--inline">
					<label class="label" for="showDanger">Show danger rating</label>
					<select id="showDanger" name="world.showDangerRating" class="input input--select">
						<option value="true"  selected={val('world.showDangerRating') === 'true'}>Yes</option>
						<option value="false" selected={val('world.showDangerRating') !== 'true'}>No</option>
					</select>
					<p class="field-hint">Show danger rating badges on regions and locations in the frontend.</p>
				</div>
				<div class="field field--inline">
					<label class="label" for="showLevel">Show level range</label>
					<select id="showLevel" name="world.showLevelRange" class="input input--select">
						<option value="true"  selected={val('world.showLevelRange') === 'true'}>Yes</option>
						<option value="false" selected={val('world.showLevelRange') !== 'true'}>No</option>
					</select>
					<p class="field-hint">Show level range badges on regions and locations in the frontend.</p>
				</div>
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
			</div>
		</form>
	</div>
</div>
