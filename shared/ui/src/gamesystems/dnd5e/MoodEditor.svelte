<!-- shared/ui/src/gamesystems/dnd5e/MoodEditor.svelte -->
<!-- Inline emoji + text mood editor with save-on-blur behaviour -->
<script lang="ts">
	import { MOOD_EMOJIS } from './skills.ts';

	let {
		emoji      = $bindable(''),
		text       = $bindable(''),
		readonly   = false,
		onSave,
	}: {
		emoji?:   string;
		text?:    string;
		readonly?: boolean;
		onSave?:  (emoji: string, text: string) => Promise<void>;
	} = $props();

	let showPicker = $state(false);
	let saving     = $state(false);
	let inputEl    = $state<HTMLInputElement | null>(null);

	async function handleBlur() {
		if (saving) return;
		saving = true;
		await onSave?.(emoji ?? '', text ?? '');
		saving = false;
	}

	function pickEmoji(e: string) {
		emoji      = e;
		showPicker = false;
		inputEl?.focus();
	}

	function handleKeydown(ev: KeyboardEvent) {
		if (ev.key === 'Escape') showPicker = false;
	}
</script>

<div class="mood-editor" class:mood-editor--readonly={readonly}>
	{#if readonly}
		{#if emoji || text}
			<div class="mood-display">
				{#if emoji}<span class="mood-emoji">{emoji}</span>{/if}
				{#if text}<span class="mood-text">{text}</span>{/if}
			</div>
		{/if}
	{:else}
		<div class="mood-input-row">
			<!-- Emoji trigger -->
			<button
				type="button"
				class="mood-emoji-btn"
				onclick={() => showPicker = !showPicker}
				aria-label="Pick mood emoji"
				aria-expanded={showPicker}
			>
				{emoji || '😶'}
			</button>

			<!-- Text input -->
			<input
				bind:this={inputEl}
				type="text"
				class="mood-text-input"
				placeholder="How is your character feeling?"
				maxlength="80"
				bind:value={text}
				onblur={handleBlur}
				onkeydown={handleKeydown}
			/>

			{#if saving}
				<span class="mood-saving">saving…</span>
			{/if}
		</div>

		<!-- Emoji picker -->
		{#if showPicker}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="mood-picker" onkeydown={handleKeydown}>
				{#each MOOD_EMOJIS as group}
					<div class="mood-picker__group">
						<div class="mood-picker__label">{group.label}</div>
						<div class="mood-picker__grid">
							{#each group.emojis as e}
								<button
									type="button"
									class="mood-picker__emoji"
									class:mood-picker__emoji--active={emoji === e}
									onclick={() => pickEmoji(e)}
									aria-label={e}
								>{e}</button>
							{/each}
						</div>
					</div>
				{/each}
				{#if emoji}
					<button type="button" class="mood-picker__clear" onclick={() => { emoji = ''; showPicker = false; }}>
						Clear emoji
					</button>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
.mood-editor { position: relative; }

/* Read-only display */
.mood-display { display: inline-flex; align-items: center; gap: 0.375rem; }
.mood-emoji   { font-size: 1.125rem; line-height: 1; }
.mood-text    { font-size: 0.875rem; color: var(--text-secondary); font-style: italic; }

/* Edit mode */
.mood-input-row { display: flex; align-items: center; gap: 0.5rem; }
.mood-emoji-btn {
	width: 2rem; height: 2rem; font-size: 1.25rem; line-height: 1;
	background: var(--bg-overlay); border: 1px solid var(--border-base);
	border-radius: var(--radius-sm); cursor: pointer; flex-shrink: 0;
	display: flex; align-items: center; justify-content: center;
	transition: border-color var(--transition-fast);
}
.mood-emoji-btn:hover { border-color: var(--border-accent); }

.mood-text-input {
	flex: 1; background: var(--bg-overlay); border: 1px solid var(--border-base);
	border-radius: var(--radius-sm); color: var(--text-primary);
	padding: 0.375rem 0.625rem; font-size: 0.875rem;
	transition: border-color var(--transition-fast);
}
.mood-text-input:focus { outline: none; border-color: var(--accent); }
.mood-text-input::placeholder { color: var(--text-muted); }

.mood-saving { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }

/* Picker dropdown */
.mood-picker {
	position: absolute; top: calc(100% + 4px); left: 0; z-index: 50;
	background: var(--bg-surface); border: 1px solid var(--border-base);
	border-radius: var(--radius-md); padding: 0.75rem;
	box-shadow: 0 8px 24px rgba(0,0,0,0.4);
	min-width: 240px;
}
.mood-picker__group { margin-bottom: 0.625rem; }
.mood-picker__label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 0.25rem; }
.mood-picker__grid  { display: flex; flex-wrap: wrap; gap: 2px; }
.mood-picker__emoji {
	width: 2rem; height: 2rem; font-size: 1.125rem; line-height: 1;
	background: none; border: 1px solid transparent; border-radius: var(--radius-sm);
	cursor: pointer; display: flex; align-items: center; justify-content: center;
	transition: background var(--transition-fast);
}
.mood-picker__emoji:hover         { background: var(--bg-overlay); }
.mood-picker__emoji--active       { background: var(--accent-dim); border-color: var(--accent); }
.mood-picker__clear {
	width: 100%; margin-top: 0.375rem; padding: 0.25rem;
	background: none; border: none; cursor: pointer;
	font-size: 0.75rem; color: var(--text-muted); text-align: left;
	transition: color var(--transition-fast);
}
.mood-picker__clear:hover { color: var(--color-danger); }
</style>
