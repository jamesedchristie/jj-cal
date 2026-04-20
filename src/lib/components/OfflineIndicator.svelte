<script lang="ts">
	import { offlineQueue } from '$lib/offline-queue.svelte';

	const pending = $derived(offlineQueue.pendingCount);
	const failures = $derived(offlineQueue.failures);
	const offline = $derived(!offlineQueue.online);
	const show = $derived(offline || pending > 0 || failures.length > 0);
</script>

{#if show}
	<div class="indicator" role="status" aria-live="polite">
		{#if offline}
			<span class="pill offline">
				Offline{#if pending > 0}&nbsp;—&nbsp;{pending} pending{/if}
			</span>
		{:else if pending > 0}
			<span class="pill pending">Syncing&nbsp;{pending}…</span>
		{/if}
		{#each failures as f (f.id)}
			<span class="pill failure">
				{f.reason === 'server' ? 'Write rejected by server' : 'Write gave up after retries'}
				<button type="button" onclick={() => offlineQueue.dismissFailure(f.id)} aria-label="Dismiss">×</button>
			</span>
		{/each}
	</div>
{/if}

<style>
	.indicator {
		position: fixed;
		top: var(--safe-top, 0);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2);
		z-index: var(--z-toast);
		pointer-events: none;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		box-shadow: var(--shadow-sm);
		pointer-events: auto;
	}

	.offline {
		background: var(--color-warning-bg);
		color: var(--color-warning-text);
	}

	.pending {
		background: var(--color-info-bg);
		color: var(--color-info-text);
	}

	.failure {
		background: var(--color-danger-bg);
		color: var(--color-danger-text);
	}

	button {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		font-size: var(--font-size-base);
		line-height: 1;
		padding: 0 var(--space-1);
	}
</style>
