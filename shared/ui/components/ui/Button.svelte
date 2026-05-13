<!-- shared/ui/components/ui/Button.svelte -->
<script lang="ts">
	interface Props {
		variant?: 'primary' | 'ghost' | 'danger';
		size?:    'sm' | 'md' | 'lg';
		disabled?: boolean;
		type?:    'button' | 'submit' | 'reset';
		onclick?: () => void;
		children: any;
	}

	let {
		variant  = 'primary',
		size     = 'md',
		disabled = false,
		type     = 'button',
		onclick,
		children,
	}: Props = $props();

	const cls = $derived(
		['btn', `btn-${variant}`, size !== 'md' ? `btn-${size}` : ''].filter(Boolean).join(' ')
	);
</script>

<button {type} class={cls} {disabled} {onclick}>
	{@render children()}
</button>