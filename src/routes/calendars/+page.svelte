<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Textarea from '$lib/components/Textarea.svelte';
	import Toast from '$lib/components/toast/Toast.svelte';
	import { enqueueOrSubmit } from '$lib/offline-queue.svelte';
	import type { EventRecurrenceRule } from '$lib/server/db/schema';
	import { flip } from 'svelte/animate';
	import { SvelteSet } from 'svelte/reactivity';
	import { createCalendarStore } from './calendar-store.svelte';
	import { createNewCalendar, getCalendars, loadEvents } from './data.remote';
	import { CalendarEvent } from './events.svelte';
	import MonthGrid from './MonthGrid.svelte';

	const today = new Date();
	const todayY = today.getFullYear();
	const todayM = today.getMonth() + 1;
	const todayD = today.getDate();

	// 2 months prior + current + 11 months forward = 14 months
	const months = Array.from({ length: 14 }, (_, i) => {
		const d = new Date(todayY, todayM - 1 + (i - 2));
		return { year: d.getFullYear(), month: d.getMonth() + 1 };
	});

	const store = createCalendarStore(months);

	// ---- Calendars & filters ----
	let calendars = $derived(await getCalendars());
	let hiddenCalendarIds = $state(new Set<number>());

	function toggleCalendarFilter(id: number) {
		const next = new SvelteSet(hiddenCalendarIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		hiddenCalendarIds = next;
	}

	// ---- Selected date & events ----
	let selectedDate = $state<Date>(new Date(today));

	function isSameDay(datetime: number, date: Date) {
		const e = new Date(datetime);
		return (
			e.getFullYear() === date.getFullYear() &&
			e.getMonth() === date.getMonth() &&
			e.getDate() === date.getDate()
		);
	}

	function formatSelectedDate(date: Date): string {
		return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
	}

	// Derive events for the selected date — shares cache with MonthGrid's loadEvents call
	const rawSelectedMonthEvents = $derived(
		await loadEvents({ year: selectedDate.getFullYear(), month: selectedDate.getMonth() + 1 })
	);
	const selectedDateEvents = $derived(
		rawSelectedMonthEvents
			.map((e) => new CalendarEvent(e))
			.filter((e) => !hiddenCalendarIds.has(e.calendar_id))
			.filter((e) => isSameDay(e.datetime, selectedDate))
	);

	// ---- Scroll area ----
	let scrollAreaEl = $state<HTMLDivElement>();
	let showTodayBtn = $state(false);

	function scrollToToday() {
		const id = `month-${todayY}-${String(todayM).padStart(2, '0')}`;
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	// Track whether current month is visible to show/hide back-to-today
	$effect(() => {
		if (!scrollAreaEl) return;
		const id = `month-${todayY}-${String(todayM).padStart(2, '00')}`;
		const target = document.getElementById(id);
		if (!target) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				showTodayBtn = !entry.isIntersecting;
			},
			{ root: scrollAreaEl, threshold: 0.1 }
		);
		observer.observe(target);
		return () => observer.disconnect();
	});

	// Scroll to current month on first mount
	$effect(() => {
		if (!scrollAreaEl) return;
		requestAnimationFrame(scrollToToday);
	});

	// Auto-select date based on scroll position: pick the topmost visible month
	function updateSelectedDateFromScroll() {
		if (!scrollAreaEl) return;
		const scrollTop = scrollAreaEl.scrollTop;

		let currentMonth = months[0];
		for (const m of months) {
			const id = `month-${m.year}-${String(m.month).padStart(2, '0')}`;
			const el = document.getElementById(id);
			if (el && el.offsetTop <= scrollTop + 10) {
				currentMonth = m;
			}
		}

		const { year, month } = currentMonth;
		if (selectedDate.getFullYear() !== year || selectedDate.getMonth() + 1 !== month) {
			selectedDate =
				year === todayY && month === todayM ? new Date(today) : new Date(year, month - 1, 1);
		}
	}

	$effect(() => {
		if (!scrollAreaEl) return;
		scrollAreaEl.addEventListener('scroll', updateSelectedDateFromScroll, { passive: true });
		return () => scrollAreaEl.removeEventListener('scroll', updateSelectedDateFromScroll);
	});

	// ---- Event form state ----
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

	function handleDateClick(date: Date) {
		selectedDate = date;
	}

	// ---- Mutations ----
	function createEvent(date: Date, text: string) {
		const cal = calendars.find((c) => c.id === effectiveCalendarId);
		store.addEvent({
			calendarId: effectiveCalendarId,
			calendarName: cal?.name ?? '',
			calendarColour: cal?.colour ?? null,
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			date: date.getDate(),
			text,
			recurrenceRule: newEventRepeat || null,
			recurrenceEndsOn: newEventEndsOn || null
		});
		newEventRepeat = '';
		newEventEndsOn = '';
	}

	function editEventText(event: CalendarEvent, text: string) {
		if (!text.trim()) {
			deleteThisEvent(event);
			return;
		}
		store.editEvent(event.id, event.datetime, text);
	}

	function deleteThisEvent(event: CalendarEvent) {
		store.removeEvent(event.id, event.datetime);
	}

	function deleteThisAndFuture(event: CalendarEvent) {
		if (!event.recurrenceGroupId) return;
		store.removeFutureEvents(event.recurrenceGroupId, event.datetime);
	}
</script>

<Toast />

<div class="calendar-wrapper">
	<!-- Filter bar -->
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
			<form {...createNewCalendar.enhance(({ form, submit }) => enqueueOrSubmit(form, submit))}>
				<input type="hidden" name="slug" value={newCalSlug} />
				<input name="name" type="text" placeholder="Calendar name" bind:value={newCalName} required />
				<Button type="submit">Create</Button>
				<Button onclick={() => (showCreateCalendar = false)}>Cancel</Button>
			</form>
		</section>
	{/if}

	<div class="split-area">
		<!-- Top half: scrollable months -->
		<div class="top-panel">
			{#if calendars.length === 0 && !showCreateCalendar}
				<div class="no-calendars">
					<p>No calendars yet.</p>
					<button type="button" onclick={() => (showCreateCalendar = true)}
						>Create your first calendar →</button
					>
				</div>
			{:else}
				<div class="scroll-area" bind:this={scrollAreaEl}>
					{#each months as { year, month } (`${year}-${month}`)}
						<MonthGrid
							{year}
							{month}
							{todayY}
							{todayM}
							{todayD}
							{hiddenCalendarIds}
							{selectedDate}
							onDateClick={handleDateClick}
						/>
					{/each}
				</div>
			{/if}

			{#if showTodayBtn}
				<button type="button" class="today-fab" onclick={scrollToToday}>Today</button>
			{/if}
		</div>

		<!-- Bottom half: events for selected date -->
		<div class="bottom-panel">
			<div class="panel-header">
				<h2 class="panel-date">{formatSelectedDate(selectedDate)}</h2>
			</div>

			<div class="panel-body">
				<section class="events">
					{#if selectedDateEvents.length}
						<ul>
							{#each selectedDateEvents as event (event.isRecurring ? `${event.recurrenceGroupId}:${event.datetime}` : event.id)}
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
												<span class="recurrence-badge" title="Recurring event">↻</span>
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
													onclick={() => deleteThisEvent(event)}>Delete this</button
												>
												<button
													type="button"
													class="action-link danger"
													onclick={() => deleteThisAndFuture(event)}>Delete future</button
												>
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
							createEvent(selectedDate, editingText);
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
									createEvent(selectedDate, editingText);
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
							<Button type="submit" disabled={!editingText.length || calendars.length === 0}
								>Add</Button
							>
						</div>
					</form>
				</section>
			</div>
		</div>
	</div>
</div>

<style>
	.calendar-wrapper {
		flex: auto;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
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

	/* ---- Split area ---- */
	.split-area {
		flex: auto;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	/* ---- Top panel: scrollable months ---- */
	.top-panel {
		flex: 1;
		min-height: 0;
		position: relative;
		display: flex;
		flex-direction: column;
		overflow: hidden;
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

	.scroll-area {
		flex: auto;
		overflow-y: auto;
		padding-bottom: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	/* ---- Back to today FAB ---- */
	.today-fab {
		position: absolute;
		bottom: var(--space-4);
		left: 50%;
		transform: translateX(-50%);
		background: var(--color-accent);
		color: var(--color-text-inverse);
		border: none;
		border-radius: var(--radius-full);
		padding: var(--space-2) var(--space-5);
		font-size: var(--font-size-sm);
		font-family: var(--font-body);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		box-shadow: var(--shadow-lg);
		transition: background var(--duration-fast) var(--ease-standard);
		pointer-events: auto;
		z-index: var(--z-sticky);

		&:active {
			background: color-mix(in srgb, var(--color-accent) 85%, var(--color-primary));
		}
	}

	/* ---- Bottom panel: selected date events ---- */
	.bottom-panel {
		flex: 1;
		min-height: 0;
		border-top: 2px solid var(--color-border);
		display: flex;
		flex-direction: column;
	}

	.panel-header {
		flex: none;
		padding: var(--space-3) var(--space-4) var(--space-2);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.panel-date {
		font-size: var(--font-size-md);
		font-family: var(--font-heading);
		font-weight: var(--font-weight-bold);
	}

	.panel-body {
		flex: auto;
		overflow-y: auto;
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
