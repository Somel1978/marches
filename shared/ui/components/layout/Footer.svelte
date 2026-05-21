<!-- shared/ui/components/layout/Footer.svelte -->
<script lang="ts">
	const year = new Date().getFullYear();
</script>

<footer class="footer">
	<div class="footer__inner">
		<span class="footer__copy">© {year} The Binder & Brew — Build. Share. Adventure.</span>
	</div>
</footer>

<style>
	.footer {
		border-top: 1px solid var(--border-muted);
		background-color: var(--bg-surface);
	}

	.footer__inner {
		max-width: 1280px;
		margin: 0 auto;
		padding: 1.25rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.footer__copy {
		font-size: 0.8125rem;
		color: var(--text-muted);
	}
</style>