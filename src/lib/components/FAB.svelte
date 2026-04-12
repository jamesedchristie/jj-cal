<script lang="ts">
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { addTodo } from '../../routes/tasks/data.remote';

	const section = $derived(
		page.url.pathname.startsWith('/tasks') ? 'tasks' : null
	);

	let open = $state(false);
	let inputEl: HTMLInputElement | undefined;

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
				{...addTodo.enhance(async ({ form, submit }) => {
					await submit();
					form.reset();
					closeSheet();
				})}
				class="sheet-form"
			>
				<input
					bind:this={inputEl}
					{...addTodo.fields.text.as('text')}
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
		bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
		right: 1.25rem;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: #111827;
		border: none;
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
		z-index: 40;
		transition: transform 0.15s ease, box-shadow 0.15s ease;

		svg {
			width: 24px;
			height: 24px;
		}

		&:active {
			transform: scale(0.93);
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		}
	}

	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		z-index: 50;
	}

	.sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: #fff;
		border-radius: 16px 16px 0 0;
		padding: 0.625rem 1.25rem calc(1.75rem + env(safe-area-inset-bottom, 0px));
		z-index: 51;
		box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.1);
	}

	.handle {
		width: 36px;
		height: 4px;
		background: #e5e7eb;
		border-radius: 2px;
		margin: 0 auto 1.25rem;
	}

	.sheet-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.75rem;
	}

	.sheet-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.sheet-input {
		width: 100%;
		border: 1.5px solid #e5e7eb;
		border-radius: 10px;
		padding: 0.875rem 1rem;
		font-size: 1rem;
		outline: none;
		background: #f9fafb;
		box-sizing: border-box;
		transition: border-color 0.15s ease, background 0.15s ease;

		&:focus {
			border-color: #111827;
			background: #fff;
		}
	}

	.sheet-submit {
		background: #111827;
		color: #fff;
		border: none;
		border-radius: 10px;
		padding: 0.875rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s ease;

		&:active {
			background: #374151;
		}
	}
</style>
