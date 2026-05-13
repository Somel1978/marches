<!-- shared/ui/components/ui/Card.svelte -->
<script lang="ts">
	interface Props {
		variant?: 'default' | 'elevated' | 'parchment';
		children: any;
	}

	let { variant = 'default', children }: Props = $props();

	const cls = $derived({
		default:   'card',
		elevated:  'card-elevated',
		parchment: 'card-parchment',
	}[variant]);
</script>

<div class={cls}>
	{@render children()}
</div>