<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { generateInvite, getInvites, revokeInviteAction } from './data.remote';

	const inviteList = $derived(await getInvites());

	// The currently-selected invite token for which to show the QR overlay.
	let qrToken = $state<string | null>(null);
	let qrCanvas = $state<HTMLCanvasElement | null>(null);

	function inviteUrl(token: string) {
		return `${window.location.origin}/invite/${token}`;
	}

	function isExpired(expiresAt: Date) {
		return new Date(expiresAt) < new Date();
	}

	function isRevoked(revokedAt: Date | null) {
		return revokedAt != null;
	}

	function isActive(invite: { expiresAt: Date; revokedAt: Date | null }) {
		return !isExpired(invite.expiresAt) && !isRevoked(invite.revokedAt);
	}

	$effect(() => {
		if (!qrToken || !qrCanvas) return;
		const url = inviteUrl(qrToken);
		import('qrcode').then(({ default: QRCode }) => {
			QRCode.toCanvas(qrCanvas!, url, { width: 240, margin: 2 });
		});
	});

	function copyLink(token: string) {
		navigator.clipboard.writeText(inviteUrl(token));
	}

	function formatDate(d: Date) {
		return new Date(d).toLocaleDateString('en-AU', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function closeQr() {
		qrToken = null;
	}
</script>

<div class="page">
	<h1>Invites</h1>
	<p class="hint">
		Each invite link can be used by multiple people. Share the link or QR code however you like.
		Links expire after 7 days.
	</p>

	<form
		{...generateInvite.enhance(async ({ submit }) => {
			await submit();
		})}
	>
		<Button type="submit">Generate invite link</Button>
	</form>

	{#if inviteList.length > 0}
		<ul class="invite-list">
			{#each inviteList as invite (invite.id)}
				{@const active = isActive(invite)}
				<li class="invite-item" class:inactive={!active}>
					<div class="invite-meta">
						<span class="token">{invite.token.slice(0, 12)}…</span>
						<span class="dates">
							{#if isRevoked(invite.revokedAt)}
								<span class="badge revoked">Revoked</span>
							{:else if isExpired(invite.expiresAt)}
								<span class="badge expired">Expired</span>
							{:else}
								<span class="badge active">Active</span>
							{/if}
							<span>Expires {formatDate(invite.expiresAt)}</span>
						</span>
					</div>

					{#if active}
						<div class="invite-actions">
							<Button onclick={() => copyLink(invite.token)}>Copy link</Button>
							<Button onclick={() => (qrToken = invite.token)}>QR code</Button>
							<form
								{...revokeInviteAction.enhance(async ({ submit }) => {
									await submit();
								})}
							>
								<input {...revokeInviteAction.fields.id.as('hidden', invite.id)} />
								<Button type="submit">Revoke</Button>
							</form>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="hint">No invites yet.</p>
	{/if}
</div>

{#if qrToken}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="overlay" onclick={closeQr}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="qr-card" onclick={(e) => e.stopPropagation()}>
			<p class="qr-hint">Scan to join JJ Cal</p>
			<canvas bind:this={qrCanvas}></canvas>
			<p class="qr-url">{inviteUrl(qrToken)}</p>
			<div class="qr-actions">
				<Button onclick={() => copyLink(qrToken!)}>Copy link</Button>
				<Button onclick={closeQr}>Close</Button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		padding: var(--space-4) var(--layout-gutter);
		max-width: var(--layout-max-width);
		margin: 0 auto;
		width: 100%;
	}

	h1 {
		font-size: var(--font-size-xl);
		font-family: var(--font-heading);
		font-weight: var(--font-weight-bold);
	}

	.hint {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.invite-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.invite-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		border-radius: var(--radius-md);
		background: var(--color-surface-raised);

		&.inactive {
			opacity: 0.5;
		}
	}

	.invite-meta {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.token {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}

	.dates {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.badge {
		display: inline-block;
		padding: 0 var(--space-2);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);

		&.active {
			background: var(--color-family-4);
			color: var(--color-text-inverse);
		}

		&.expired,
		&.revoked {
			background: var(--color-surface-sunken);
			color: var(--color-text-muted);
		}
	}

	.invite-actions {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
		align-items: center;

		form {
			display: contents;
		}
	}

	/* QR overlay */
	.overlay {
		position: fixed;
		inset: 0;
		background: color-mix(in srgb, var(--color-surface) 20%, transparent);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: var(--z-modal);
		padding: var(--space-4);
	}

	.qr-card {
		background: var(--color-surface-raised);
		border-radius: var(--radius-lg);
		padding: var(--space-6);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		box-shadow: var(--shadow-lg);
		max-width: 320px;
		width: 100%;
	}

	.qr-hint {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
		text-align: center;
	}

	.qr-url {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		word-break: break-all;
		text-align: center;
	}

	.qr-actions {
		display: flex;
		gap: var(--space-2);
	}
</style>
