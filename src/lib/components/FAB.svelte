<script lang="ts">
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { addItemToPrimaryList } from '../../routes/tasks/data.remote';

	const section = $derived(
		page.url.pathname.startsWith('/tasks') ? 'tasks' : null
	);

	let open = $state(false);
	let inputEl = $state<HTMLInputElement | undefined>();

	async function openSheet() {
		open = true;
		await tick();
		inputEl?.focus();
	}

	function closeSheet() {
		open = false;
	}
</script>

{#if section && !open}
	<button
		class="fab"
		onclick={openSheet}
		aria-label={section === 'tasks' ? 'Add task' : 'Add'}
		transition:fade={{ duration: 150 }}
	>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<line x1="12" y1="5" x2="12" y2="19"/>
			<line x1="5" y1="12" x2="19" y2="12"/>
		</svg>
	</button>
{/if}

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="backdrop"
		onclick={closeSheet}
		role="presentation"
		transition:fade={{ duration: 200 }}
	></div>

	<div class="sheet" transition:fly={{ y: 240, duration: 280, opacity: 1 }}>
		<div class="handle"></div>

		{#if section === 'tasks'}
			<p class="sheet-label">New task</p>
			<form
				{...addItemToPrimaryList.enhance(async ({ form, submit }) => {
					await submit();
					form.reset();
					closeSheet();
				})}
				class="sheet-form"
			>
				<input
					bind:this={inputEl}
					{...addItemToPrimaryList.fields.text.as('text')}
					placeholder="What needs to be done?"
					autocomplete="off"
					class="sheet-input"
				/>
				<button type="submit" class="sheet-submit">Add task</button>
			</form>
		{/if}
	</div>
{/if}

<style>
	.fab {
		position: fixed;
		bottom: calc(var(--nav-height) + var(--safe-bottom));
		right: var(--space-5);
		width: var(--size-fab);
		height: var(--size-fab);
		border-radius: var(--radius-full);
		background: var(--color-primary);
		border: none;
		color: var(--color-primary-text);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: var(--shadow-fab);
		z-index: var(--z-fab);
		transition: transform var(--duration-fast) var(--ease-standard),
			box-shadow var(--duration-fast) var(--ease-standard);

		svg {
			width: var(--size-icon-lg);
			height: var(--size-icon-lg);
		}

		&:active {
			transform: scale(0.93);
			box-shadow: var(--shadow-fab-pressed);
		}
	}

	.backdrop {
		position: fixed;
		inset: 0;
		background: var(--color-overlay);
		z-index: var(--z-modal);
	}

	.sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--color-surface);
		border-radius: var(--radius-xl) var(--radius-xl) 0 0;
		padding: var(--space-2) var(--space-5) calc(var(--space-7) + var(--safe-bottom));
		z-index: calc(var(--z-modal) + 1);
		box-shadow: var(--shadow-sheet);
	}

	.handle {
		width: var(--size-handle-width);
		height: var(--space-1);
		background: var(--color-border);
		border-radius: var(--radius-xs);
		margin: 0 auto var(--space-5);
	}

	.sheet-label {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: var(--letter-spacing-wide);
		margin: 0 0 var(--space-3);
	}

	.sheet-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.sheet-input {
		width: 100%;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-3) var(--space-4);
		font-size: var(--font-size-base);
		outline: none;
		background: var(--color-surface-sunken);
		box-sizing: border-box;
		transition: border-color var(--duration-fast) var(--ease-standard),
			background var(--duration-fast) var(--ease-standard);

		&:focus {
			border-color: var(--color-text);
			background: var(--color-surface);
		}
	}

	.sheet-submit {
		background: var(--color-primary);
		color: var(--color-primary-text);
		border: none;
		border-radius: var(--radius-md);
		padding: var(--space-3);
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-semibold);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard);

		&:active {
			background: var(--color-primary-hover);
		}
	}
</style>
