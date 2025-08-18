<script lang="ts">
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import { addEventToDate, editEvent, loadEvents, removeEvent } from './data.remote';
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
	let selectedDate = $state<Date | null>(null);
	let selectedEvent = $state<(typeof monthEvents)[number] | null>(null);
	let editingText = $state('');

	let dialog = $state<HTMLDialogElement>();

	function onEventEdit(date: Date, event: typeof selectedEvent = null) {
		selectedDate = date;
		selectedEvent = event;
		editingText = event?.text ?? '';
		toggleDialog();
	}

	function toggleDialog() {
		if (dialog) {
			if (dialog.open) dialog.requestClose();
			else dialog.showModal();
		}
	}

	function onsubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!selectedDate) return;
		if (selectedEvent) {
			if (editingText) editEventText(selectedEvent, editingText);
			else deleteEvent(selectedEvent);
		} else {
			createEvent(selectedDate, editingText);
		}
		toggleDialog();
	}

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
		await addEventToDate({
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			date: date.getDate(),
			text,
			name: user.name
		}).updates(loadEvents({ year, month }).withOverride((events) => [...events, newEvent]));
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

	async function deleteEvent(event: (typeof monthEvents)[number]) {
		await removeEvent({ id: event.id }).updates(
			loadEvents({ year, month }).withOverride((events) => events.filter((e) => e.id !== event.id))
		);
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
							<td
								class={{
									day: true,
									selected: selectedDate && date.getDate() === selectedDate.getDate()
								}}
								style:height="{Math.floor(100 / monthWeeks.length)}%"
							>
								<div class="date-label">
									{date.getDate()}
								</div>
								<div class="date-content">
									{#each events as event}
										<EventInput {event} onedit={() => onEventEdit(date, event)} />
									{/each}
									<EventInput onedit={() => onEventEdit(date)} />
								</div>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>

<dialog bind:this={dialog}>
	<form {onsubmit}>
		<div class="text-input">
			<label>
				{selectedEvent ? 'Edit' : 'Create'} Event
				<textarea bind:value={editingText}></textarea>
			</label>
		</div>
		<div class="actions">
			<button type="button" onclick={toggleDialog}>Close</button>
			<button>{selectedEvent ? (editingText ? 'Save' : 'Remove Event') : 'Create'}</button>
		</div>
	</form>
</dialog>

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
				height: 100%;
				border-collapse: collapse;
				& .day {
					position: relative;
					border: 1px solid black;
					width: 14%;
					& .date-label {
						position: absolute;
						top: 0;
						left: 0;
						right: 0;
						text-align: center;
						font-weight: bold;
					}
					& .date-content {
						min-height: 80px;
						padding: 5px;
						display: flex;
						flex-direction: column;
						justify-content: center;
						gap: 5px;
					}
				}
			}
		}
	}
	dialog {
		& form {
			display: flex;
			flex-direction: column;
			& label {
				display: flex;
				flex-direction: column;
			}
			& .actions {
				display: flex;
				justify-content: space-between;
			}
		}
	}
</style>
