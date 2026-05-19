<!-- apps/admin/src/routes/(app)/quests/settings/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving = $state(false);

	function val(key: string) { return data.settings.find(s => s.key === key)?.value ?? ''; }
</script>

<div class="page">
	<div class="page__header">
		<div>
			<a href="/quests" class="back-link">← Quests</a>
			<h2 class="page__title">Quest settings</h2>
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
				<div class="field">
					<label class="label" for="minCap">Global minimum capacity</label>
					<input id="minCap" name="quest.minCapacity" type="number" class="input" min="1" value={val('quest.minCapacity')} required />
					<p class="field-hint">DMs cannot set a minimum below this value.</p>
				</div>
				<div class="field">
					<label class="label" for="maxCap">Global maximum capacity</label>
					<input id="maxCap" name="quest.maxCapacity" type="number" class="input" min="1" value={val('quest.maxCapacity')} required />
					<p class="field-hint">DMs cannot set a maximum above this value.</p>
				</div>
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
			</div>
		</form>
	</div>
</div>
