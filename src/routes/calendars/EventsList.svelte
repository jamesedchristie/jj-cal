<script lang="ts">
	import type { CalendarEvent } from './events.svelte';

	interface Props {
		events: CalendarEvent[];
	}

	let { events }: Props = $props();

	let ul = $state<HTMLUListElement>();
	let displayMode = $state<'list' | 'summary'>('list');

	$effect(() => {
		if (!ul) return;
		displayMode = events.length > 1 && ul.scrollHeight > ul.clientHeight ? 'summary' : 'list';
	});
</script>

<ul bind:this={ul} class={{ list: displayMode === 'list', summary: displayMode === 'summary' }}>
	{#each events as event (event.id)}
		<li class="event">
			{#if event.calendar_colour}
				<span
					class="cal-dot"
					style="background: var(--color-{event.calendar_colour})"
					aria-hidden="true"
				></span>
			{/if}
			<span class="event-text">{event.text}</span>
		</li>
	{/each}
</ul>

<style>
	ul {
		max-height: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		overflow: hidden;

		&.summary li {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}

	.event {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
	}

	.cal-dot {
		flex: none;
		width: 6px;
		height: 6px;
		border-radius: var(--radius-full);
	}

	.event-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
