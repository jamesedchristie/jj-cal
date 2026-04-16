<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Button from '$lib/components/Button.svelte';
	import TextInput from '$lib/components/TextInput.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';

	const COLOURS = [
		{ id: 'family-1', label: 'Red' },
		{ id: 'family-2', label: 'Orange' },
		{ id: 'family-3', label: 'Amber' },
		{ id: 'family-4', label: 'Green' },
		{ id: 'family-5', label: 'Teal' },
		{ id: 'family-6', label: 'Blue' },
		{ id: 'family-7', label: 'Violet' },
		{ id: 'family-8', label: 'Pink' }
	] as const;

	let username = $state('');
	let password = $state('');
	let displayName = $state('');
	let colour = $state('family-6');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			const res = await fetch('/api/auth/sign-up/email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: username,
					// better-auth requires an email; we synthesise a local-only one.
					email: `${username}@family.local`,
					password,
					username,
					displayName: displayName || null,
					colour
				})
			});

			if (!res.ok) {
				const body = (await res.json().catch(() => ({ message: '' }))) as { message?: string };
				error = body.message ?? 'Sign-up failed. Please try again.';
				return;
			}

			goto(resolve('/calendars'));
		} catch {
			error = 'Something went wrong. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="page">
	<h1>Join JJ Cal</h1>
	<p class="subtitle">You've been invited! Create your account to get started.</p>

	<div class="avatar-preview">
		<UserAvatar name={username || '?'} displayName={displayName || null} {colour} size="lg" />
		<span class="preview-name">{displayName || username || 'You'}</span>
	</div>

	<form class="sign-up-form" onsubmit={handleSubmit}>
		<div class="field">
			<label for="username">Username</label>
			<TextInput
				id="username"
				name="username"
				autocomplete="username"
				placeholder="your_name"
				bind:value={username}
				required
			/>
			<p class="hint">Used to sign in. Lowercase letters, numbers and underscores.</p>
		</div>

		<div class="field">
			<label for="password">Password</label>
			<TextInput
				id="password"
				name="password"
				type="password"
				autocomplete="new-password"
				placeholder="Choose a password"
				bind:value={password}
				required
			/>
		</div>

		<div class="field">
			<label for="displayName">Display name <span class="optional">(optional)</span></label>
			<TextInput
				id="displayName"
				name="displayName"
				placeholder={username || 'Your name'}
				bind:value={displayName}
			/>
			<p class="hint">How your name appears to other family members.</p>
		</div>

		<fieldset class="field">
			<legend>Your colour</legend>
			<div class="colour-grid">
				{#each COLOURS as c (c.id)}
					<label class="colour-option" title={c.label}>
						<input type="radio" name="colour" value={c.id} bind:group={colour} />
						<span
							class="swatch"
							class:selected={colour === c.id}
							style:background="var(--color-{c.id})"
							aria-hidden="true"
						></span>
						<span class="sr-only">{c.label}</span>
					</label>
				{/each}
			</div>
		</fieldset>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<Button type="submit" disabled={loading}>
			{loading ? 'Creating account…' : 'Create account'}
		</Button>
	</form>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		padding: var(--space-6) var(--layout-gutter);
		max-width: 480px;
		margin: 0 auto;
		width: 100%;
	}

	h1 {
		font-size: var(--font-size-xl);
		font-family: var(--font-heading);
		font-weight: var(--font-weight-bold);
	}

	.subtitle {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		margin-top: calc(var(--space-6) * -1);
	}

	.avatar-preview {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.preview-name {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}

	.sign-up-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		border: none;
		padding: 0;
		margin: 0;

		label,
		legend {
			font-size: var(--font-size-sm);
			font-weight: var(--font-weight-medium);
			color: var(--color-text);
		}
	}

	.optional {
		font-weight: var(--font-weight-regular);
		color: var(--color-text-muted);
	}

	.hint {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.colour-grid {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: var(--space-2);
	}

	.colour-option {
		cursor: pointer;

		input[type='radio'] {
			position: absolute;
			opacity: 0;
			width: 0;
			height: 0;
		}
	}

	.swatch {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		border-radius: var(--radius-full);
		border: 2px solid transparent;
		transition:
			transform var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out);

		.colour-option:hover & {
			transform: scale(1.1);
		}

		&.selected {
			border-color: var(--color-text);
			transform: scale(1.15);
		}
	}

	.error {
		font-size: var(--font-size-sm);
		color: var(--color-danger);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
