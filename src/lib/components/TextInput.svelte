<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		value?: string;
		width?: string;
	}

	let { value = $bindable(''), type = 'text', width = '100%', ...rest }: Props = $props();

	let inputType = $derived(type);
</script>

<div class="input-wrapper" style:width>
	<input bind:value type={inputType} {...rest} />
	{#if type === 'password'}
		<button
			class="toggle-password"
			type="button"
			onclick={() => {
				inputType = inputType === 'password' ? 'text' : 'password';
			}}
		>
			{inputType === 'password' ? 'Show' : 'Hide'}
		</button>
	{/if}
</div>

<style>
	div.input-wrapper {
		display: inline-flex;
		position: relative;
	}

	input {
		display: block;
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-1) var(--space-2);
		width: 100%;
		height: var(--space-8);
		outline: none;
		transition: border-color var(--duration-fast) var(--ease-standard);

		&:focus {
			border-color: var(--color-focus-ring);
		}

		&::placeholder {
			color: var(--color-text-subtle);
		}
	}

	button.toggle-password {
		position: absolute;
		right: var(--space-2);
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
	}
</style>
