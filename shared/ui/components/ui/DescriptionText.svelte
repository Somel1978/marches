<!-- shared/ui/components/ui/DescriptionText.svelte -->
<!-- Renders Markdown when detected; otherwise plain text (escaped, preserves newlines). -->
<script lang="ts">
	import { looksLikeMarkdown, renderMarkdown } from '../../src/markdown.ts';

	let {
		text = '',
		class: className = '',
	}: {
		text?: string | null;
		class?: string;
	} = $props();

	const value = $derived((text ?? '').trim() ? String(text) : '');
	const asMarkdown = $derived(looksLikeMarkdown(value));
</script>

{#if value}
	{#if asMarkdown}
		<div class="markdown-body description-text {className}">{@html renderMarkdown(value)}</div>
	{:else}
		<p class="description-text description-text--plain {className}">{value}</p>
	{/if}
{/if}

<style>
	.description-text--plain {
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.5;
	}

	.description-text :global(p:last-child) {
		margin-bottom: 0;
	}
</style>
