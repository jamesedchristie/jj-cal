<script lang="ts">
	import NameTag from '$lib/components/NameTag.svelte';
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
	{#each events as event}
		<li class="event">
			<span class="event-name"><NameTag name={event.created_by_name} /></span>
			<span class="event-text">{event.text}</span>
		</li>
	{/each}
</ul>

<style>
	ul {
		max-height: 100%;
		display: flex;
		flex-direction: column;
		gap: 5px;
		overflow: hidden;
		&.summary {
			/* flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			align-items: center; */
			& li {
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
			/* & .event-text {
				display: none;
			} */
		}
	}
</style>
