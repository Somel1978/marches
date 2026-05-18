<!-- apps/admin/src/routes/(app)/characters/settings/+page.svelte -->
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
			<a href="/characters" class="back-link">← Characters</a>
			<h2 class="page__title">Character settings</h2>
		</div>
	</div>

	<div class="card" style="max-width: 480px;">
		{#if form?.message}<div class="form-error">{form.message}</div>{/if}
		{#if form?.success}<div class="form-success">Settings saved.</div>{/if}

		<form method="post" use:enhance={() => {
			saving = true;
			return async ({ update }) => { saving = false; await update(); };
		}}>
			<div class="fields">
				<div class="field">
					<label class="label" for="baseSlots">Base character slots</label>
					<input id="baseSlots" name="character.baseSlots" type="number"
						class="input" min="1" value={val('character.baseSlots')} required />
					<p class="field-hint">Number of character slots every player starts with.</p>
				</div>
				<div class="field">
					<label class="label" for="startingGold">Starting gold</label>
					<input id="startingGold" name="character.startingGold" type="number"
						class="input" min="0" value={val('character.startingGold')} required />
					<p class="field-hint">Gold each new character receives on creation.</p>
				</div>
				<div class="field">
					<label class="label" for="restDays">Rest days after quest</label>
					<input id="restDays" name="character.restDays" type="number"
						class="input" min="0" value={val('character.restDays')} required />
					<p class="field-hint">Days a character rests after completing a quest.</p>
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
