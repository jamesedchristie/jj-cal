<script lang="ts">
	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import Button from '$lib/components/Button.svelte';
	import TextInput from '$lib/components/TextInput.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import type { LayoutData } from '../$types';
	import { updateProfile } from './data.remote';

	interface Props {
		data: Pick<LayoutData, 'user'>;
	}

	let { data }: Props = $props();

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

	// untrack: we intentionally capture the initial profile values to seed the form.
	const { displayName: savedDisplayName, colour: savedColour } = untrack(() => data.user) ?? {};
	let displayName = $state(savedDisplayName ?? '');
	let colour = $state(savedColour ?? 'family-6');
	let largeText = $state(browser ? localStorage.getItem('largeText') === 'true' : false);

	$effect(() => {
		if (!browser) return;
		localStorage.setItem('largeText', String(largeText));
		document.documentElement.classList.toggle('large-text', largeText);
	});
</script>

<div class="page">
	<h1>Profile</h1>

	<div class="avatar-preview">
		<UserAvatar
			name={data.user?.name ?? ''}
			displayName={displayName || null}
			{colour}
			size="lg"
		/>
		<div class="preview-labels">
			<span class="preview-name">{displayName || data.user?.name}</span>
			<span class="preview-username">@{data.user?.username ?? data.user?.name}</span>
		</div>
	</div>

	<form
		{...updateProfile.enhance(async ({ submit }) => {
			await submit();
		})}
		class="profile-form"
	>
		<div class="field">
			<label for="displayName">Display name</label>
			<TextInput
				id="displayName"
				{...updateProfile.fields.displayName.as('text')}
				placeholder={data.user?.name ?? 'Your name'}
				bind:value={displayName}
			/>
			<p class="hint">How your name appears to other family members.</p>
		</div>

		<fieldset class="field">
			<legend>Colour</legend>
			<div class="colour-grid">
				{#each COLOURS as c (c.id)}
					<label class="colour-option" title={c.label}>
						<input
							{...updateProfile.fields.colour.as('radio', c.id)}
							bind:group={colour}
						/>
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

		<Button type="submit">Save profile</Button>
	</form>

	<div class="field">
		<span class="field-label">Display</span>
		<label class="size-toggle-row">
			<span class="size-label">Normal</span>
			<button
				type="button"
				role="switch"
				aria-checked={largeText}
				class="switch"
				class:on={largeText}
				onclick={() => (largeText = !largeText)}
			>
				<span class="switch-thumb"></span>
			</button>
			<span class="size-label large">Large</span>
		</label>
		<p class="hint">Larger text for when you've left your glasses at home.</p>
	</div>
</div>

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

	.avatar-preview {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.preview-labels {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.preview-name {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text);
	}

	.preview-username {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.profile-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
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
		transition: transform var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out);

		.colour-option:hover & {
			transform: scale(1.1);
		}

		&.selected {
			border-color: var(--color-text);
			transform: scale(1.15);
		}
	}

	.field-label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text);
	}

	.size-toggle-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		cursor: pointer;
	}

	.size-label {
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		color: var(--color-text-muted);

		&.large {
			font-size: var(--font-size-lg);
		}
	}

	.switch {
		position: relative;
		width: var(--space-10);
		height: var(--space-6);
		border-radius: var(--radius-full);
		background: var(--color-border-strong);
		border: none;
		cursor: pointer;
		padding: 0;
		transition: background var(--duration-fast) var(--ease-standard);

		&.on {
			background: var(--color-primary);
		}
	}

	.switch-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: calc(var(--space-6) - 4px);
		height: calc(var(--space-6) - 4px);
		border-radius: var(--radius-full);
		background: var(--color-surface);
		transition: transform var(--duration-fast) var(--ease-standard);

		.on & {
			transform: translateX(calc(var(--space-10) - var(--space-6)));
		}
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
