<!-- apps/frontend/src/routes/(protected)/dm-request/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving = $state(false);

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<div class="page">
	<div class="page__header">
		<div>
			<h2 class="page__title">Become a DM</h2>
			<p class="page__subtitle">Request the DM role to create and run quests.</p>
		</div>
	</div>

	<div class="card" style="max-width:520px;">
		{#if data.latestRequest?.status === 'PENDING'}
			<div class="pending-banner">
				<p style="font-weight:600;">Your request is pending review.</p>
				<p style="margin-top:0.5rem; font-size:0.875rem;">Submitted: {formatDate(data.latestRequest.createdAt)}</p>
				<p style="margin-top:0.25rem; font-size:0.875rem; color:var(--text-muted);">"{data.latestRequest.reason}"</p>
			</div>

		{:else if data.latestRequest?.status === 'APPROVED'}
			<!-- Approved but session not yet refreshed — prompt re-login -->
			<div class="form-success" style="margin-bottom:1rem;">
				<p style="font-weight:600;">Your DM request was approved! 🎉</p>
				<p style="margin-top:0.5rem; font-size:0.875rem;">
					Please sign out and sign back in to activate your DM role.
				</p>
			</div>
			<form method="post" action="/signout">
				<button type="submit" class="btn btn-primary">Sign out to activate DM role</button>
			</form>

		{:else if data.latestRequest?.status === 'REJECTED'}
			<div class="form-error" style="margin-bottom:1rem;">
				<p style="font-weight:600;">Your previous request was not approved.</p>
				{#if data.latestRequest.reviewNote}
					<p style="margin-top:0.25rem; font-size:0.875rem;">Reason: {data.latestRequest.reviewNote}</p>
				{/if}
			</div>
			<!-- Allow resubmission after rejection -->
			{#if data.dmRole}
				{#if form?.message}<div class="form-error">{form.message}</div>{/if}
				{#if form?.success}<div class="form-success">New request submitted!</div>{/if}
				<form method="post" use:enhance={() => {
					saving = true;
					return async ({ update }) => { saving = false; await update(); await invalidateAll(); };
				}}>
					<input type="hidden" name="roleId" value={data.dmRole.id} />
					<div class="fields">
						<div class="field">
							<label class="label" for="reason">Why do you want to be a DM?</label>
							<textarea id="reason" name="reason" class="input" rows="4" required
								placeholder="Tell us about your experience..."></textarea>
						</div>
					</div>
					<div class="form-actions">
						<button type="submit" class="btn btn-primary" disabled={saving}>
							{saving ? 'Submitting…' : 'Resubmit request'}
						</button>
					</div>
				</form>
			{/if}

		{:else if data.dmRole}
			{#if form?.message}<div class="form-error">{form.message}</div>{/if}
			{#if form?.success}<div class="form-success">Request submitted! An admin will review it shortly.</div>{/if}

			<form method="post" use:enhance={() => {
				saving = true;
				return async ({ update }) => { saving = false; await update(); await invalidateAll(); };
			}}>
				<input type="hidden" name="roleId" value={data.dmRole.id} />
				<div class="fields">
					<div class="field">
						<label class="label" for="reason">Why do you want to be a DM?</label>
						<textarea id="reason" name="reason" class="input" rows="4" required
							placeholder="Tell us about your experience and what kind of quests you want to run..."></textarea>
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn-primary" disabled={saving}>
						{saving ? 'Submitting…' : 'Submit request'}
					</button>
				</div>
			</form>
		{:else}
			<p class="table__muted">DM role requests are not available at this time.</p>
		{/if}
	</div>
</div>