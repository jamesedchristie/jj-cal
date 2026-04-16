<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Button from '$lib/components/Button.svelte';
	import Textarea from '$lib/components/Textarea.svelte';
	import Toast from '$lib/components/toast/Toast.svelte';
	import { getToastService, ToastMessage } from '$lib/components/toast/toastService.svelte';
	import type { EventRecurrenceRule } from '$lib/server/db/schema';
	import { tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		addEventToDate,
		cancelOccurrence,
		createNewCalendar,
		editEvent,
		getCalendars,
		loadEvents,
		overrideOccurrenceText,
		removeEvent
	} from './data.remote';
	import { CalendarEvent } from './events.svelte';
	import EventsList from './EventsList.svelte';

	const toastService = getToastService();

	// Use a stable "now" reference — re-reads on mount, not reactive to time passing
	const today = new Date();
	const todayY = today.getFullYear();
	const todayM = today.getMonth() + 1; // 1-based
	const todayD = today.getDate();

	let year = $derived(Number(page.url.searchParams.get('year') || todayY));
	let month = $derived(Number(page.url.searchParams.get('month') || todayM));

	let isCurrentMonth = $derived(year === todayY && month === todayM);
	let todayHref = resolve(`/calendars?year=${todayY}&month=${todayM}`);

	let prevMonthHref = $derived.by(() => {
		const d = new Date(year, month - 2);
		return resolve(`/calendars?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
	});
	let monthName = $derived(new Date(year, month - 1).toLocaleString('default', { month: 'long' }));
	let nextMonthHref = $derived.by(() => {
		const d = new Date(year, month);
		return resolve(`/calendars?year=${d.getFullYear()}&month=${d.getMonth() + 1}`);
	});

	let monthWeeks = $derived.by(() => {
		const weeks: Date[][] = [];
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		let first = new Date(year, month - 1, 1);
		if (first.getDay() !== 0) first.setDate(first.getDate() - first.getDay());
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		let last = new Date(year, month - 1, 1);
		last.setMonth(last.getMonth() + 1);
		if (last.getDay() !== 6) last.setDate(last.getDate() + (6 - last.getDay()));
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

	function isToday(date: Date) {
		return (
			date.getFullYear() === todayY && date.getMonth() + 1 === todayM && date.getDate() === todayD
		);
	}

	function isSameDay(datetime: number, date: Date) {
		const e = new Date(datetime);
		return (
			e.getFullYear() === date.getFullYear() &&
			e.getMonth() === date.getMonth() &&
			e.getDate() === date.getDate()
		);
	}

	function isSelected(date: Date) {
		return (
			selectedDate !== null &&
			date.getFullYear() === selectedDate.getFullYear() &&
			date.getMonth() === selectedDate.getMonth() &&
			date.getDate() === selectedDate.getDate()
		);
	}

	// ---- Data ----
	let calendars = $derived(await getCalendars());
	let hiddenCalendarIds = $state(new Set<number>());

	function toggleCalendarFilter(id: number) {
		const next = new SvelteSet(hiddenCalendarIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		hiddenCalendarIds = next;
	}

	let monthEventsData = $derived(await loadEvents({ year, month }));
	let allMonthEvents = $derived(monthEventsData.map((e) => new CalendarEvent(e)));
	let monthEvents = $derived(allMonthEvents.filter((e) => !hiddenCalendarIds.has(e.calendar_id)));

	// Upcoming: events from today onwards, sorted, capped at 5. Only shown on current month.
	let upcomingEvents = $derived.by(() => {
		if (!isCurrentMonth) return [];
		const todayMidnight = new Date(todayY, todayM - 1, todayD).getTime();
		return [...monthEvents]
			.filter((e) => e.datetime >= todayMidnight)
			.sort((a, b) => a.datetime - b.datetime)
			.slice(0, 5);
	});

	function formatUpcomingDate(datetime: number): string {
		const d = new Date(datetime);
		const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
		const todayMidnight = new Date(todayY, todayM - 1, todayD).getTime();
		const diff = Math.round((dMidnight - todayMidnight) / 86_400_000);
		if (diff === 0) return 'Today';
		if (diff === 1) return 'Tomorrow';
		return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
	}

	// ---- Dialog ----
	let selectedDate = $state<Date | null>(null);
	let selectedDateEvents = $derived(
		monthEvents.filter((e) => selectedDate && isSameDay(e.datetime, selectedDate))
	);

	let selectedCalendarId = $derived(calendars[0]?.id ?? 0);
	let newEventCalendarId = $state<number | null>(null);
	let effectiveCalendarId = $derived(newEventCalendarId ?? selectedCalendarId);

	let editingText = $state('');
	let newEventRepeat = $state<EventRecurrenceRule | ''>('');
	let newEventEndsOn = $state('');
	let showCreateCalendar = $state(false);
	let newCalName = $state('');
	let newCalSlug = $derived(
		newCalName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
	);

	let dialog = $state<HTMLDialogElement>();

	function handleDateClick(date: Date) {
		selectedDate = date;
		showDialog();
	}

	async function showDialog() {
		if (!dialog) await tick();
		dialog?.showModal();
	}

	function hideDialog() {
		dialog?.close();
	}

	function formatDialogDate(date: Date): string {
		return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
	}

	// ---- Mutations ----
	async function createEvent(date: Date, text: string) {
		const rule = newEventRepeat || null;
		const newEvent: (typeof allMonthEvents)[number] = {
			id: Infinity,
			calendar_id: effectiveCalendarId,
			calendar_slug: '',
			calendar_name: calendars.find((c) => c.id === effectiveCalendarId)?.name ?? '',
			calendar_colour: calendars.find((c) => c.id === effectiveCalendarId)?.colour ?? null,
			datetime: date.getTime(),
			text,
			created_by_name: '',
			created_by_id: '',
			recurrenceRule: rule,
			isRecurring: !!rule,
			baseEventId: null,
			originalDatetime: null
		};
		await addEventToDate({
			calendarId: effectiveCalendarId,
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			date: date.getDate(),
			text,
			recurrenceRule: rule,
			recurrenceEndsOn: newEventEndsOn || null
		}).updates(loadEvents({ year, month }).withOverride((events) => [...events, newEvent]));
		newEventRepeat = '';
		newEventEndsOn = '';
		toastService().show(new ToastMessage('Event created!'));
	}

	async function editEventText(event: (typeof allMonthEvents)[number], text: string) {
		if (!text.trim()) {
			if (event.isRecurring && event.baseEventId != null && event.originalDatetime != null) {
				// Cancel this occurrence rather than deleting the whole series
				await cancelThisOccurrence(event);
			} else {
				await deleteEvent(event);
			}
			return;
		}
		if (event.isRecurring && event.baseEventId != null && event.originalDatetime != null) {
			// Override just this occurrence's text
			await overrideOccurrenceText({
				eventId: event.baseEventId,
				originalDatetime: event.originalDatetime,
				text
			}).updates(
				loadEvents({ year, month }).withOverride((events) =>
					events.map((e) =>
						e.baseEventId === event.baseEventId && e.originalDatetime === event.originalDatetime
							? { ...e, text }
							: e
					)
				)
			);
		} else {
			await editEvent({ id: event.id, text }).updates(
				loadEvents({ year, month }).withOverride((events) =>
					events.map((e) => (e.id === event.id ? { ...e, text } : e))
				)
			);
		}
	}

	async function deleteEvent(event: (typeof allMonthEvents)[number]) {
		await removeEvent({ id: event.id }).updates(
			loadEvents({ year, month }).withOverride((events) => events.filter((e) => e.id !== event.id))
		);
	}

	async function cancelThisOccurrence(event: (typeof allMonthEvents)[number]) {
		if (event.baseEventId == null || event.originalDatetime == null) return;
		await cancelOccurrence({
			eventId: event.baseEventId,
			originalDatetime: event.originalDatetime
		}).updates(
			loadEvents({ year, month }).withOverride((events) =>
				events.filter(
					(e) =>
						!(e.baseEventId === event.baseEventId && e.originalDatetime === event.originalDatetime)
				)
			)
		);
	}
</script>

<div class="calendar-wrapper">
	<!-- Filter chips -->
	<section class="filter-bar">
		{#each calendars as cal (cal.id)}
			<button
				type="button"
				class="filter-chip"
				class:dimmed={hiddenCalendarIds.has(cal.id)}
				onclick={() => toggleCalendarFilter(cal.id)}
				style="--chip-color: var(--color-{cal.colour ?? 'text-muted'})"
			>
				<span class="chip-dot"></span>
				{cal.name}
			</button>
		{/each}
		<button
			type="button"
			class="add-cal-btn"
			onclick={() => (showCreateCalendar = !showCreateCalendar)}
			aria-label="Add calendar">+</button
		>
	</section>

	{#if showCreateCalendar}
		<section class="create-calendar">
			<form {...createNewCalendar}>
				<input type="hidden" name="slug" value={newCalSlug} />
				<input
					name="name"
					type="text"
					placeholder="Calendar name"
					bind:value={newCalName}
					required
				/>
				<Button type="submit">Create</Button>
				<Button onclick={() => (showCreateCalendar = false)}>Cancel</Button>
			</form>
		</section>
	{/if}

	<!-- Empty state when no calendars exist -->
	{#if calendars.length === 0 && !showCreateCalendar}
		<div class="no-calendars">
			<p>No calendars yet.</p>
			<button type="button" onclick={() => (showCreateCalendar = true)}
				>Create your first calendar →</button
			>
		</div>
	{/if}

	<!-- Grid -->
	<section class="calendar">
		<table>
			<thead>
				<tr>
					{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as d (d)}
						<th>{d}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each monthWeeks as week (week[0]?.getTime())}
					<tr style:flex="1 1 {Math.floor(100 / monthWeeks.length)}%">
						{#each week as date (date.getTime())}
							{@const events = monthEvents.filter((e) => isSameDay(e.datetime, date))}
							<td
								class:day={true}
								class:differentMonth={date.getMonth() + 1 !== month}
								class:today={isToday(date)}
								class:selected={isSelected(date)}
							>
								<div class="date-content">
									<div class="date-label">
										<span class="date-num">{date.getDate()}</span>
									</div>
									<button type="button" onclick={() => handleDateClick(date)}>
										<EventsList {events} />
									</button>
								</div>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</section>

	<!-- Month nav -->
	<section class="controls">
		<Button href={prevMonthHref}>&lt;</Button>
		<div class="controls-center">
			<h3>{monthName} {year}</h3>
			{#if !isCurrentMonth}
				<a href={todayHref} class="today-link">Today</a>
			{/if}
		</div>
		<Button href={nextMonthHref}>&gt;</Button>
	</section>

	<!-- Upcoming events strip (current month only) -->
	{#if upcomingEvents.length > 0}
		<section class="upcoming">
			{#each upcomingEvents as event (event.isRecurring ? `${event.baseEventId}:${event.originalDatetime}` : event.id)}
				<button
					type="button"
					class="upcoming-row"
					onclick={() => handleDateClick(new Date(event.datetime))}
				>
					{#if event.calendar_colour}
						<span class="upcoming-dot" style="background: var(--color-{event.calendar_colour})"
						></span>
					{/if}
					<span class="upcoming-date">{formatUpcomingDate(event.datetime)}</span>
					<span class="upcoming-text">{event.text}</span>
				</button>
			{/each}
		</section>
	{/if}
</div>

<!-- Day dialog -->
<dialog bind:this={dialog} closedby="any">
	<Toast />

	<div class="dialog-header">
		{#if selectedDate}
			<h2 class="dialog-date">{formatDialogDate(selectedDate)}</h2>
		{/if}
		<button class="dialog-close" onclick={hideDialog} aria-label="Close">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
			</svg>
		</button>
	</div>

	<section class="events">
		{#if selectedDateEvents.length}
			<ul>
				{#each selectedDateEvents as event (event.isRecurring ? `${event.baseEventId}:${event.originalDatetime}` : event.id)}
					<li animate:flip>
						<div class="event-input">
							<div class="event-meta">
								{#if event.calendar_colour}
									<span
										class="event-cal-badge"
										style="background: var(--color-{event.calendar_colour})"
										>{event.calendar_name}</span
									>
								{/if}
								{#if event.isRecurring}
									<span class="recurrence-badge" title="Recurring event"
										>↻ {event.recurrenceRule}</span
									>
								{/if}
							</div>
							<Textarea
								bind:value={event.text}
								onchange={() => editEventText(event, event.text || '')}
								style="width: 100%"
							></Textarea>
							{#if event.isRecurring}
								<div class="event-actions">
									<button
										type="button"
										class="action-link danger"
										onclick={() => cancelThisOccurrence(event)}
									>
										Cancel this date
									</button>
									<button type="button" class="action-link" onclick={() => deleteEvent(event)}>
										Delete all
									</button>
								</div>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="no-events">No events — add one below.</p>
		{/if}
	</section>

	<section class="new-event">
		{#if calendars.length > 1}
			<div class="cal-picker">
				{#each calendars as cal (cal.id)}
					<button
						type="button"
						class="cal-pick-btn"
						class:active={effectiveCalendarId === cal.id}
						onclick={() => (newEventCalendarId = cal.id)}
						style="--chip-color: var(--color-{cal.colour ?? 'text-muted'})"
					>
						<span class="chip-dot"></span>{cal.name}
					</button>
				{/each}
			</div>
		{/if}
		<form
			onsubmit={(e) => {
				e.preventDefault();
				if (selectedDate) createEvent(selectedDate, editingText);
				editingText = '';
			}}
		>
			<Textarea
				bind:value={editingText}
				placeholder="Add event…"
				style="width: 100%"
				onkeydown={(e) => {
					if (e.key === 'Enter' && e.metaKey) {
						e.preventDefault();
						if (selectedDate) createEvent(selectedDate, editingText);
						editingText = '';
					}
				}}
			></Textarea>
			<div class="repeat-row">
				<label class="repeat-label" for="repeat-select">Repeat</label>
				<select id="repeat-select" class="repeat-select" bind:value={newEventRepeat}>
					<option value="">No repeat</option>
					<option value="daily">Daily</option>
					<option value="weekly">Weekly</option>
					<option value="fortnightly">Fortnightly</option>
					<option value="monthly">Monthly</option>
					<option value="yearly">Yearly</option>
				</select>
				{#if newEventRepeat}
					<label class="repeat-label" for="ends-on-input">Ends</label>
					<input
						id="ends-on-input"
						type="date"
						class="ends-on-input"
						bind:value={newEventEndsOn}
						placeholder="No end"
					/>
				{/if}
			</div>
			<div class="actions">
				<Button type="submit" disabled={!editingText.length || calendars.length === 0}>Add</Button>
			</div>
		</form>
	</section>
</dialog>

<style>
	.calendar-wrapper {
		flex: auto;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* ---- Filter bar ---- */
	.filter-bar {
		flex: none;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		flex-wrap: wrap;
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-full);
		border: 1px solid var(--chip-color, var(--color-border));
		background: transparent;
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text);
		cursor: pointer;
		transition: opacity var(--duration-fast) var(--ease-standard);

		.chip-dot {
			width: 8px;
			height: 8px;
			border-radius: var(--radius-full);
			background: var(--chip-color, var(--color-border));
			flex: none;
		}

		&.dimmed {
			opacity: 0.35;
		}
	}

	.no-calendars {
		flex: auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		color: var(--color-text-subtle);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);

		button {
			background: none;
			border: none;
			cursor: pointer;
			color: var(--color-accent);
			font-size: var(--font-size-sm);
			font-family: var(--font-body);
			text-decoration: underline;
			text-underline-offset: 2px;
		}
	}

	.add-cal-btn {
		background: none;
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-full);
		width: var(--space-6);
		height: var(--space-6);
		font-size: var(--font-size-base);
		color: var(--color-text-subtle);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		&:hover {
			color: var(--color-text);
			border-color: var(--color-border-strong);
		}
	}

	/* ---- Create calendar ---- */
	.create-calendar {
		flex: none;
		padding: var(--space-2) var(--space-4);
		border-bottom: 1px solid var(--color-border-subtle);

		form {
			display: flex;
			align-items: center;
			gap: var(--space-2);

			input[type='text'] {
				flex: 1;
				border: 1px solid var(--color-border);
				border-radius: var(--radius-sm);
				padding: var(--space-1) var(--space-2);
				font-size: var(--font-size-sm);
				font-family: var(--font-body);
				background: var(--color-surface);
				color: var(--color-text);
				outline: none;
				&:focus {
					border-color: var(--color-accent);
				}
			}
		}
	}

	/* ---- Calendar grid ---- */
	.calendar {
		flex: auto;
		overflow-y: auto;

		table {
			width: 100%;
			height: 100%;
			border-collapse: collapse;
			display: flex;
			flex-direction: column;
			align-items: stretch;
		}

		thead {
			flex: none;
			display: block;
			width: 100%;

			tr {
				width: 100%;
				display: flex;

				th {
					flex: 1 1 14%;
					height: var(--space-5);
					font-weight: var(--font-weight-regular);
					font-size: var(--font-size-xs);
					font-family: var(--font-body);
					color: var(--color-text-muted);
				}
			}
		}

		tbody {
			flex: auto;
			display: flex;
			flex-direction: column;

			tr {
				width: 100%;
				display: flex;
				border-top: 1px solid var(--color-border);
				overflow: hidden;

				&:last-child {
					border-bottom: 1px solid var(--color-border);
				}

				td.day {
					flex: 1 1 14%;
					position: relative;
					width: 14%;
					border-left: 1px solid var(--color-border);
					padding: 0;

					&:last-child {
						border-right: 1px solid var(--color-border);
					}

					&.selected {
						background: color-mix(in srgb, var(--color-accent) 10%, transparent);
					}

					div.date-content {
						display: flex;
						flex-direction: column;
						width: 100%;
						height: 100%;
						overflow: hidden;

						div.date-label {
							position: absolute;
							top: 2px;
							right: 2px;
							display: flex;
							align-items: center;
							justify-content: center;

							.date-num {
								display: flex;
								align-items: center;
								justify-content: center;
								width: 18px;
								height: 18px;
								font-size: var(--font-size-xs);
								font-family: var(--font-body);
								color: var(--color-text);
								border-radius: var(--radius-full);
								line-height: 1;
							}
						}

						button {
							width: 100%;
							flex: auto;
							min-height: var(--space-10);
							padding: 2px;
							padding-top: 20px; /* clear the date-label */
							background-color: transparent;
							border: none;
							text-align: left;
							hyphens: auto;
							font-size: var(--font-size-xs);
							cursor: pointer;
							display: flex;
							flex-direction: column;
							justify-content: flex-start;

							&:hover {
								background-color: color-mix(in srgb, var(--color-text) 8%, transparent);
							}
						}
					}

					&.differentMonth {
						div.date-label .date-num {
							color: var(--color-text-subtle);
						}
						button {
							background-color: color-mix(in srgb, var(--color-text) 4%, transparent);
						}
					}

					/* Today: accent circle around the date number */
					&.today div.date-label .date-num {
						background: var(--color-accent);
						color: var(--color-text-inverse);
						font-weight: var(--font-weight-bold);
					}
				}
			}
		}
	}

	/* ---- Controls ---- */
	section.controls {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4) var(--space-3);
		gap: var(--space-4);
	}

	.controls-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);

		h3 {
			font-size: var(--font-size-xl);
			font-family: var(--font-heading);
			font-weight: var(--font-weight-bold);
		}
	}

	.today-link {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-accent);
		text-decoration: none;
		&:hover {
			text-decoration: underline;
		}
	}

	/* ---- Upcoming strip ---- */
	.upcoming {
		display: none;
		flex: none;
		border-top: 1px solid var(--color-border-subtle);
		padding: var(--space-2) var(--space-4) var(--space-4);
		flex-direction: column;
		gap: 2px;
		max-height: 140px;
		overflow-y: auto;
	}

	.upcoming-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-sm);
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		width: 100%;
		transition: background var(--duration-fast) var(--ease-standard);

		&:hover {
			background: var(--color-surface-sunken);
		}
	}

	.upcoming-dot {
		flex: none;
		width: 6px;
		height: 6px;
		border-radius: var(--radius-full);
	}

	.upcoming-date {
		flex: none;
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-muted);
		min-width: 60px;
	}

	.upcoming-text {
		flex: 1;
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ---- Dialog ---- */
	dialog {
		padding: 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		color: var(--color-text);
		width: calc(min(90vw, 520px));
		box-shadow: var(--shadow-xl);
	}

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-4) var(--space-3);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.dialog-date {
		font-size: var(--font-size-md);
		font-family: var(--font-heading);
		font-weight: var(--font-weight-bold);
	}

	.dialog-close {
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-muted);
		display: flex;
		align-items: center;
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		transition: color var(--duration-fast) var(--ease-standard);

		&:hover {
			color: var(--color-text);
		}

		svg {
			width: var(--size-icon-sm);
			height: var(--size-icon-sm);
		}
	}

	.events {
		padding: var(--space-3) var(--space-4);

		ul {
			display: flex;
			flex-direction: column;
			gap: var(--space-2);

			li .event-input {
				display: flex;
				flex-direction: column;
				gap: var(--space-1);
				align-items: flex-start;
			}
		}
	}

	.no-events {
		color: var(--color-text-subtle);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
	}

	.event-meta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.event-cal-badge {
		display: inline-block;
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-inverse);
		padding: 2px var(--space-2);
		border-radius: var(--radius-full);
		line-height: var(--line-height-normal);
	}

	.recurrence-badge {
		display: inline-flex;
		align-items: center;
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text-muted);
		gap: var(--space-1);
	}

	.event-actions {
		display: flex;
		gap: var(--space-3);
	}

	.action-link {
		background: none;
		border: none;
		padding: 0;
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text-muted);
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;

		&:hover {
			color: var(--color-text);
		}
		&.danger:hover {
			color: var(--color-danger);
		}
	}

	.cal-picker {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
		flex-wrap: wrap;
	}

	.cal-pick-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-full);
		border: 1px solid var(--chip-color, var(--color-border));
		background: transparent;
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-standard);

		.chip-dot {
			width: 8px;
			height: 8px;
			border-radius: var(--radius-full);
			background: var(--chip-color, var(--color-border));
			flex: none;
		}

		&.active {
			background: var(--chip-color, var(--color-border));
			color: var(--color-text-inverse);
		}
	}

	.new-event {
		padding: var(--space-2) var(--space-4) var(--space-4);
		border-top: 1px solid var(--color-border-subtle);

		form .actions {
			display: flex;
			justify-content: flex-end;
			margin-top: var(--space-2);
		}
	}

	.repeat-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-2);
		flex-wrap: wrap;
	}

	.repeat-label {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text-muted);
	}

	.repeat-select,
	.ends-on-input {
		font-size: var(--font-size-xs);
		font-family: var(--font-body);
		color: var(--color-text);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: 2px var(--space-2);
		outline: none;

		&:focus {
			border-color: var(--color-accent);
		}
	}
</style>
