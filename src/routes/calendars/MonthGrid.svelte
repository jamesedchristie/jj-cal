<script lang="ts">
	import { loadEvents } from './data.remote';
	import { CalendarEvent } from './events.svelte';
	import EventsList from './EventsList.svelte';

	interface Props {
		year: number;
		month: number;
		todayY: number;
		todayM: number;
		todayD: number;
		hiddenCalendarIds: Set<number>;
		onDateClick: (date: Date, events: CalendarEvent[]) => void;
	}

	let { year, month, todayY, todayM, todayD, hiddenCalendarIds, onDateClick }: Props = $props();

	// Load lazily once visible
	let visible = $state(false);

	function observeOnce(onVisible: () => void) {
		return (el: HTMLElement) => {
			const observer = new IntersectionObserver(
				([entry]) => {
					if (entry.isIntersecting) {
						onVisible();
						observer.disconnect();
					}
				},
				{ rootMargin: '400px' }
			);
			observer.observe(el);
			return () => observer.disconnect();
		};
	}

	const rawEvents = $derived(visible ? await loadEvents({ year, month }) : []);
	const allEvents = $derived(rawEvents.map((e) => new CalendarEvent(e)));
	const events = $derived(allEvents.filter((e) => !hiddenCalendarIds.has(e.calendar_id)));

	const monthName = $derived(
		new Date(year, month - 1).toLocaleString('default', { month: 'long' })
	);

	const weeks = $derived.by(() => {
		const result: Date[][] = [];
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		let first = new Date(year, month - 1, 1);
		if (first.getDay() !== 0) first.setDate(first.getDate() - first.getDay());
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		let last = new Date(year, month, 0); // last day of month
		if (last.getDay() !== 6) last.setDate(last.getDate() + (6 - last.getDay()));
		let week: Date[] = [];
		for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
			week.push(new Date(d));
			if (d.getDay() === 6) {
				result.push(week);
				week = [];
			}
		}
		return result;
	});

	function isToday(date: Date) {
		return date.getFullYear() === todayY && date.getMonth() + 1 === todayM && date.getDate() === todayD;
	}

	function isSameDay(datetime: number, date: Date) {
		const e = new Date(datetime);
		return e.getFullYear() === date.getFullYear() && e.getMonth() === date.getMonth() && e.getDate() === date.getDate();
	}

	function eventsForDay(date: Date) {
		return events.filter((e) => isSameDay(e.datetime, date));
	}
</script>

<section id="month-{year}-{String(month).padStart(2, '0')}" class="month-section" {@attach observeOnce(() => (visible = true))}>
	<h2 class="month-heading">{monthName} {year}</h2>

	<div class="grid">
		<div class="day-headers">
			{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as d (d)}
				<span>{d}</span>
			{/each}
		</div>

		{#each weeks as week (week[0]?.getTime())}
			<div class="week-row">
				{#each week as date (date.getTime())}
					{@const dayEvents = eventsForDay(date)}
					{@const otherMonth = date.getMonth() + 1 !== month}
					<button
						type="button"
						class="day"
						class:other-month={otherMonth}
						class:today={isToday(date)}
						onclick={() => onDateClick(date, dayEvents)}
					>
						<span class="date-num">{date.getDate()}</span>
						<EventsList events={dayEvents} />
					</button>
				{/each}
			</div>
		{/each}
	</div>
</section>

<style>
	.month-section {
		padding: 0;
	}

	.month-heading {
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
		background: var(--color-bg);
		padding: var(--space-3) var(--space-4) var(--space-2);
		font-size: var(--font-size-md);
		font-family: var(--font-heading);
		font-weight: var(--font-weight-bold);
	}

	.grid {
		border: 1px solid var(--color-border);
		border-left: none;
		border-right: none;
		overflow: hidden;
	}

	.day-headers {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface-sunken);

		span {
			text-align: center;
			font-size: var(--font-size-xs);
			font-family: var(--font-body);
			color: var(--color-text-muted);
			padding: var(--space-1) 0;
		}
	}

	.week-row {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		border-top: 1px solid var(--color-border);

		&:first-of-type {
			border-top: none;
		}
	}

	.day {
		min-height: var(--space-16);
		padding: var(--space-1);
		border: none;
		border-left: 1px solid var(--color-border);
		background: var(--color-surface);
		cursor: pointer;
		text-align: left;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 2px;
		overflow: hidden;
		min-width: 0;
		transition: background var(--duration-fast) var(--ease-standard);

		&:first-child {
			border-left: none;
		}

		&:hover {
			background: color-mix(in srgb, var(--color-text) 5%, transparent);
		}

		&.other-month {
			background: var(--color-surface-sunken);

			.date-num {
				color: var(--color-text-subtle);
			}
		}

		&.today .date-num {
			background: var(--color-accent);
			color: var(--color-text-inverse);
			font-weight: var(--font-weight-bold);
		}
	}

	.date-num {
		display: flex;
		align-items: center;
		justify-content: center;
		align-self: flex-end;
		width: var(--space-5);
		height: var(--space-5);
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text);
		border-radius: var(--radius-full);
		line-height: 1;
		flex: none;

		@media (max-width: 400px) {
			width: var(--space-4);
			height: var(--space-4);
			font-size: 9px;
		}
	}

	@media (max-width: 400px) {
		.day-headers span,
		:global(.event-text) {
			font-size: 9px;
		}

		.day {
			min-height: var(--space-12);
			padding: 2px;
		}
	}
</style>
