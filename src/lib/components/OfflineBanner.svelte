<script lang="ts">
	import { offlineQueue } from '$lib/offline-queue.svelte';
</script>

{#if !offlineQueue.online}
	<div class="offline-banner" role="status" aria-live="polite">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<line x1="1" y1="1" x2="23" y2="23" />
			<path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
			<path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
			<path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
			<path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
			<path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
			<line x1="12" y1="20" x2="12.01" y2="20" />
		</svg>
		{#if offlineQueue.pendingCount > 0}
			Offline — {offlineQueue.pendingCount}
			{offlineQueue.pendingCount === 1 ? 'change' : 'changes'} queued
		{:else}
			Offline — changes will sync when reconnected
		{/if}
	</div>
{/if}

<style>
	.offline-banner {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		background: var(--color-warning-bg);
		color: var(--color-warning-text);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);

		svg {
			flex: none;
			width: var(--size-icon-sm);
			height: var(--size-icon-sm);
		}
	}
</style>
