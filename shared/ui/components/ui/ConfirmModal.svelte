<!-- shared/ui/components/ui/ConfirmModal.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	interface Props {
		open:          boolean;
		title:         string;
		message:       string;
		confirmLabel?: string;
		confirmClass?: string;
		extra?:        Snippet;
		onconfirm:     () => void;
		oncancel:      () => void;
	}

	let {
		open, title, message,
		confirmLabel = 'Confirm',
		confirmClass = 'btn-danger',
		extra, onconfirm, oncancel,
	}: Props = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!dialogEl) return;
		if (open) dialogEl.showModal();
		else       dialogEl.close();
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialogEl}
	class="modal-dialog"
	onclick={(e) => { if (e.target === dialogEl) oncancel(); }}
	onclose={oncancel}>
	<div class="modal-box">
		<h3 class="modal-box__title">{title}</h3>
		<p class="modal-box__message">{message}</p>
		{#if extra}{@render extra()}{/if}
		<div class="modal-box__actions">
			<button type="button" class="btn btn-ghost" onclick={oncancel}>Cancel</button>
			<button type="button" class="btn {confirmClass}" onclick={onconfirm}>{confirmLabel}</button>
		</div>
	</div>
</dialog>