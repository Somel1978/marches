<!-- apps/frontend/src/routes/(auth)/signup/pending/+page.svelte -->
<div class="auth-card card">
	<div class="pending__icon">📧</div>
	<h1 class="auth-card__title">Check your email</h1>
	<p class="auth-card__subtitle">
		We've sent a verification link to your email address.
		Click the link to verify your account and get started.
	</p>
	<p style="font-size:0.875rem; color:var(--text-muted); margin-top:0.75rem;">
		Didn't receive it? Check your spam folder or contact an administrator.
	</p>
	<a href="/login" class="btn btn-ghost btn-full" style="margin-top:1.5rem;">Back to login</a>
</div>