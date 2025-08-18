<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { addEventToDate, editEvent, loadEvents } from './data.remote';
	import EventInput from './EventInput.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let { user } = $derived(data);

	let now = new Date();
	let year = $derived(Number(page.url.searchParams.get('year') || now.getFullYear()));
	let month = $derived(Number(page.url.searchParams.get('month') || now.getMonth() + 1));

	let prevMonthName = $derived.by(() => {
		const date = new Date(year, month - 2);
		return date.toLocaleString('default', { month: 'long' });
	});
	let prevMonthHref = $derived.by(() => {
		const date = new Date(year, month - 2);
		return `/calendar?year=${date.getFullYear()}&month=${date.getMonth() + 1}`;
	});
	let monthName = $derived.by(() => {
		const date = new Date(year, month - 1);
		return date.toLocaleString('default', { month: 'long' });
	});
	let nextMonthName = $derived.by(() => {
		const date = new Date(year, month);
		return date.toLocaleString('default', { month: 'long' });
	});
	let nextMonthHref = $derived.by(() => {
		const date = new Date(year, month);
		return `/calendar?year=${date.getFullYear()}&month=${date.getMonth() + 1}`;
	});

	let selectedDate = $state<number | null>(null);

	let monthWeeks = $derived.by(() => {
		const weeks: Date[][] = [];
		let first = new Date(year, month - 1, 1);
		if (first.getDay() !== 0) {
			first.setDate(first.getDate() - first.getDay());
		}
		let last = new Date(year, month - 1, 1);
		last.setMonth(last.getMonth() + 1);
		if (last.getDay() !== 6) {
			last.setDate(last.getDate() + (6 - last.getDay()));
		}
		let week: Date[] = [];
		for (let d = first; d <= last; d.setDate(d.getDate() + 1)) {
			week.push(new Date(d));
			if (d.getDay() === 6) {
				weeks.push(week);
				week = [];
			}
		}
		return weeks;
	});

	let monthEvents = $derived(await loadEvents({ year, month }));

	function isSameDay(datetime: number, date: Date) {
		const eventDate = new Date(datetime);
		return (
			eventDate.getFullYear() === date.getFullYear() &&
			eventDate.getMonth() === date.getMonth() &&
			eventDate.getDate() === date.getDate()
		);
	}

	async function createEvent(date: Date, text: string) {
		if (!user) return false;
		const newEvent: (typeof monthEvents)[number] = {
			id: Infinity,
			datetime: date.getTime(),
			text,
			created_by_name: user?.name ?? '',
			created_by_id: user?.id ?? 1
		};
		await addEventToDate({ year, month, date, text, name: user.name }).updates(
			loadEvents({ year, month }).withOverride((events) => [...events, newEvent])
		);
		return true;
	}

	async function editEventText(event: (typeof monthEvents)[number], text: string) {
		if (!user) return false;
		await editEvent({ id: event.id, text }).updates(
			loadEvents({ year, month }).withOverride((events) =>
				events.map((e) => (e.id === event.id ? { ...e, text } : e))
			)
		);
		return true;
	}
</script>

<div class="calendar-wrapper">
	<section class="controls">
		<div class="controls-left">
			<a href={prevMonthHref}>{'<-'} {prevMonthName}</a>
		</div>
		<div class="controls-center">
			<h2>{monthName} {year}</h2>
		</div>
		<div class="controls-right">
			<a href={nextMonthHref}>{nextMonthName} {'->'}</a>
		</div>
	</section>
	<section class="calendar" style:--numWeeks={monthWeeks.length}>
		<table>
			<thead>
				<tr>
					<th>Sun</th>
					<th>Mon</th>
					<th>Tue</th>
					<th>Wed</th>
					<th>Thu</th>
					<th>Fri</th>
					<th>Sat</th>
				</tr>
			</thead>
			<tbody>
				{#each monthWeeks as week}
					<tr>
						{#each week as date}
							{@const events = monthEvents.filter((event) => isSameDay(event.datetime, date))}
							<td class={{ day: true, selected: date.getDate() === selectedDate }}>
								<div class="date-label">
									{date.getDate()}
								</div>
								<div class="date-content">
									{#each events as event}
										<EventInput {event} onedit={(text) => editEventText(event, text)} />
									{/each}
									<EventInput oncreate={(text) => createEvent(date, text)} />
								</div>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>

<style>
	.calendar-wrapper {
		flex: auto;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		& .controls {
			flex: none;
			width: 100%;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		& .calendar {
			flex: auto;
			overflow-y: auto;
			& table {
				width: 100%;
				border-collapse: collapse;
				& .day {
					position: relative;
					border: 1px solid black;
					width: 14%;
					height: calc(80dvh / var(--numWeeks));
					padding: 5px;
					& .date-label {
						position: absolute;
						top: 0;
						left: 0;
						right: 0;
						text-align: center;
						font-weight: bold;
					}
				}
			}
		}
	}
</style>
