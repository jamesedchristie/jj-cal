<script lang="ts">
	/**
	 * UserAvatar — circular initials badge in the user's family colour.
	 *
	 * Usage:
	 *   <UserAvatar name="James" displayName="Jim" colour="family-3" />
	 *   <UserAvatar name="Jasmin" colour="family-8" size="lg" />
	 *
	 * The `colour` prop is a CSS variable suffix stored in the DB:
	 *   "family-1" → var(--color-family-1)
	 * When null/undefined the avatar falls back to --color-text-muted.
	 */

	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		name: string;
		displayName?: string | null;
		colour?: string | null;
		size?: Size;
	}

	let { name, displayName, colour, size = 'md' }: Props = $props();

	const initials = $derived.by(() => {
		const source = (displayName || name).trim();
		const parts = source.split(/\s+/);
		if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		return source.slice(0, 2).toUpperCase();
	});

	const colorValue = $derived(
		colour ? `var(--color-${colour})` : 'var(--color-text-muted)'
	);
</script>

<span
	class="avatar avatar--{size}"
	style:--avatar-bg={colorValue}
	title={displayName || name}
	aria-label={displayName || name}
>
	{initials}
</span>

<style>
	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-full);
		background-color: var(--avatar-bg);
		color: var(--color-text-inverse);
		font-weight: var(--font-weight-semibold);
		font-family: var(--font-body);
		letter-spacing: var(--letter-spacing-tight);
		flex-shrink: 0;
		user-select: none;
	}

	.avatar--sm {
		width: 24px;
		height: 24px;
		font-size: var(--font-size-xs);
	}

	.avatar--md {
		width: 32px;
		height: 32px;
		font-size: var(--font-size-sm);
	}

	.avatar--lg {
		width: 48px;
		height: 48px;
		font-size: var(--font-size-base);
	}
</style>
