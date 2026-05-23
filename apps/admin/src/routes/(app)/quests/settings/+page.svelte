<!-- apps/admin/src/routes/(app)/quests/settings/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	const selected = $derived(val('quest.destroyableCategories').split(',').map((s: string) => s.trim()).filter(Boolean));
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
				<fieldset style="border:none; padding:0; margin:0;">
					<legend class="label" style="margin-bottom:0.375rem;">Destroyable item categories</legend>
					<p class="field-hint" style="margin-bottom:0.5rem;">DMs can see and mark items in these categories as used during an active quest.</p>
					<div style="display:flex; flex-wrap:wrap; gap:0.75rem;">
						{#each ['Combat','Consumable','Utility','Destroyable'] as cat}
							<label style="display:flex; align-items:center; gap:0.375rem; cursor:pointer; font-size:0.875rem;">
								<input type="checkbox" name="quest.destroyableCategories[]" value={cat}
									checked={selected.includes(cat)} />
								{cat}
							</label>
						{/each}
					</div>
				</fieldset>
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
			</div>
		</form>
	</div>
</div>