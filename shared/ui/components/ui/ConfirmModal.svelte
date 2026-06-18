<!-- shared/ui/components/ui/ConfirmModal.svelte -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { registerConfirmModal, unregisterConfirmModal } from './confirm-modal-singleton.ts';

	interface Props {
		open?:          boolean;
		title?:         string;
		message?:       string;
		confirmLabel?:  string;
		confirmClass?:  string;
		extra?:         Snippet;
		onconfirm?:     () => void;
		oncancel?:      () => void;
	}

	let {
		open = false, title = '', message = '',
		confirmLabel = 'Confirm',
		confirmClass = 'btn-danger',
		extra, onconfirm, oncancel,
	}: Props = $props();

	// ── Prop-driven dialog ────────────────────────────────────────────────────
	let dialogEl = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		if (!dialogEl) return;
		if (open) dialogEl.showModal();
		else       dialogEl.close();
	});

	function handleConfirm() { onconfirm?.(); }
	function handleCancel()  { oncancel?.(); }

	// ── Imperative dialog (use:enhance pattern) ───────────────────────────────
	let imperativeDialogEl = $state<HTMLDialogElement | null>(null);
	let imperativeOpen     = $state(false);
	let imperativeTitle    = $state('');
	let imperativeMsg      = $state('');
	let imperativeResolve  = $state<((v: boolean) => void) | null>(null);

	$effect(() => {
		if (!imperativeDialogEl) return;
		if (imperativeOpen) imperativeDialogEl.showModal();
		else                imperativeDialogEl.close();
	});

	function handleImperativeConfirm() {
		imperativeOpen = false;
		imperativeResolve?.(true);
		imperativeResolve = null;
	}
	function handleImperativeCancel() {
		imperativeOpen = false;
		imperativeResolve?.(false);
		imperativeResolve = null;
	}

	// $effect never runs on the server — SSR safe.
	// Register on mount, clean up on destroy via return function.
	$effect(() => {
		const fn = (t: string, m: string): Promise<boolean> =>
			new Promise<boolean>((resolve) => {
				imperativeTitle   = t;
				imperativeMsg     = m;
				imperativeResolve = resolve;
				imperativeOpen    = true;
			});

		registerConfirmModal(fn);
		(window as any).confirmModal = fn;

		return () => {
			unregisterConfirmModal();
			delete (window as any).confirmModal;
		};
	});
</script>

<!-- Prop-driven modal -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={dialogEl}
	class="modal-dialog"
	onclick={(e) => { if (e.target === dialogEl) handleCancel(); }}
	onclose={handleCancel}>
	<div class="modal-box">
		<h3 class="modal-box__title">{title}</h3>
		<p class="modal-box__message">{message}</p>
		{#if extra}{@render extra()}{/if}
		<div class="modal-box__actions">
			<button type="button" class="btn btn-ghost"       onclick={handleCancel}>Cancel</button>
			<button type="button" class="btn {confirmClass}"  onclick={handleConfirm}>{confirmLabel}</button>
		</div>
	</div>
</dialog>

<!-- Imperative modal -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<dialog
	bind:this={imperativeDialogEl}
	class="modal-dialog"
	onclick={(e) => { if (e.target === imperativeDialogEl) handleImperativeCancel(); }}
	onclose={handleImperativeCancel}>
	<div class="modal-box">
		<h3 class="modal-box__title">{imperativeTitle}</h3>
		<p class="modal-box__message">{imperativeMsg}</p>
		<div class="modal-box__actions">
			<button type="button" class="btn btn-ghost"   onclick={handleImperativeCancel}>Cancel</button>
			<button type="button" class="btn btn-danger"  onclick={handleImperativeConfirm}>Confirm</button>
		</div>
	</div>
</dialog>