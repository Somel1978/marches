<!-- shared/ui/components/ui/Badge.svelte -->
<script lang="ts">
	interface Props {
		variant?: 'accent' | 'success' | 'warning' | 'danger' | 'muted';
		children: any;
	}

	let { variant = 'muted', children }: Props = $props();
</script>

<span class="badge badge-{variant}">
	{@render children()}
</span>
