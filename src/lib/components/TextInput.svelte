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
		font-size: var(--input-font-size, 14px);
		border: var(--input-border, 1px solid lightgray);
		border-radius: var(--input-border-radius, 4px);
		padding: var(--input-padding, 5px);
		width: 100%;
		height: var(--input-height, 30px);
	}
	button.toggle-password {
		position: absolute;
		right: 5px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		font-size: 12px;
	}
</style>
