<!-- apps/admin/src/routes/(app)/dms/settings/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving = $state(false);

	function val(key: string) {
		return data.settings.find(s => s.key === key)?.value ?? '';
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/dms" class="back-link">← DM Hub</a>
			<h2 class="page__title">DM Hub settings</h2>
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
					<label class="label" for="ratingsEnabled">DM ratings enabled</label>
					<select id="ratingsEnabled" name="dm.ratingsEnabled" class="input input--select">
						<option value="true"  selected={val('dm.ratingsEnabled') === 'true'}>Yes</option>
						<option value="false" selected={val('dm.ratingsEnabled') !== 'true'}>No</option>
					</select>
					<p class="field-hint">Allow players to rate DMs after completing quests.</p>
				</div>
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={saving}>
					{saving ? 'Saving…' : 'Save settings'}
				</button>
			</div>
		</form>
	</div>
</div>
