<script lang="ts">
	/**
	 * NameTag — inline name badge used in calendar event lists.
	 *
	 * Accepts an optional `colour` prop (CSS variable suffix, e.g. "family-3").
	 * Falls back to --color-surface-sunken when no colour is set.
	 */
	interface Props {
		name: string;
		colour?: string | null;
	}

	let { name, colour }: Props = $props();

	const colorValue = $derived(
		colour ? `var(--color-${colour})` : 'var(--color-surface-sunken)'
	);
	const textValue = $derived(
		colour ? 'var(--color-text-inverse)' : 'var(--color-text-muted)'
	);
</script>

<span class="name-tag" style:--tag-bg={colorValue} style:--tag-text={textValue}>
	{name}
</span>

<style>
	.name-tag {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		background-color: var(--tag-bg);
		color: var(--tag-text);
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		white-space: nowrap;
	}
</style>
