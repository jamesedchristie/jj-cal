import type { RemoteQueryOverride } from '@sveltejs/kit';
import { offlineQueue } from '$lib/offline-queue.svelte';
import type { EventRecurrenceRule } from '$lib/server/db/schema';
import {
	addEventToDate,
	editEvent,
	getCalendars,
	loadEvents,
	removeEvent,
	removeFutureEvents
} from './data.remote';

type EventRow = Awaited<ReturnType<typeof loadEvents>>[number];
type Month = { year: number; month: number };

// Register each command so writes queued while offline can be replayed by key.
offlineQueue.registerCommand('calendars:addEvent', (args) => addEventToDate(args as never));
offlineQueue.registerCommand('calendars:editEvent', (args) => editEvent(args as never));
offlineQueue.registerCommand('calendars:removeEvent', (args) => removeEvent(args as never));
offlineQueue.registerCommand('calendars:removeFutureEvents', (args) =>
	removeFutureEvents(args as never)
);

// Negative, page-lifetime-unique IDs for optimistic events so they never collide
// with real server IDs (positive) or each other.
let optimisticCounter = -1;
function nextOptimisticId() {
	return optimisticCounter--;
}

type AddEventInput = {
	calendarId: number;
	calendarName: string;
	calendarColour: string | null;
	year: number;
	month: number;
	date: number;
	text: string;
	recurrenceRule: EventRecurrenceRule | null;
	recurrenceEndsOn: string | null;
};

export function createCalendarStore(months: Month[]) {
	const offlineReleases = new Set<() => void>();

	$effect(() =>
		offlineQueue.onDrained(() => {
			void getCalendars().refresh();
			for (const { year, month } of months) {
				void loadEvents({ year, month }).refresh();
			}
			for (const release of offlineReleases) release();
			offlineReleases.clear();
		})
	);

	function dispatchCommand<T>(
		key: string,
		args: unknown,
		run: () => Promise<T>,
		override: RemoteQueryOverride
	): Promise<T> | void {
		if (!offlineQueue.online) {
			offlineQueue.enqueueCommand(key, args);
			offlineReleases.add(override);
			return;
		}
		return run();
	}

	return {
		addEvent(input: AddEventInput) {
			const {
				calendarId,
				calendarName,
				calendarColour,
				year,
				month,
				date,
				text,
				recurrenceRule,
				recurrenceEndsOn
			} = input;
			// Build an optimistic row using the same shape the query returns.
			const optimistic: EventRow = {
				id: nextOptimisticId(),
				calendar_id: calendarId,
				calendar_slug: '',
				calendar_name: calendarName,
				calendar_colour: calendarColour,
				datetime: new Date(year, month - 1, date).getTime(),
				text,
				created_by_name: '',
				created_by_id: '',
				isRecurring: !!recurrenceRule,
				recurrenceGroupId: null
			} as EventRow;
			const override = loadEvents({ year, month }).withOverride((events) => [
				...events,
				optimistic
			]);
			const args = {
				calendarId,
				year,
				month,
				date,
				text,
				recurrenceRule,
				recurrenceEndsOn
			};
			return dispatchCommand(
				'calendars:addEvent',
				args,
				() => addEventToDate(args).updates(override),
				override
			);
		},

		editEvent(id: number, datetime: number, text: string) {
			const d = new Date(datetime);
			const year = d.getFullYear();
			const month = d.getMonth() + 1;
			const override = loadEvents({ year, month }).withOverride((events) =>
				events.map((e) => (e.id === id ? { ...e, text } : e))
			);
			const args = { id, text };
			return dispatchCommand(
				'calendars:editEvent',
				args,
				() => editEvent(args).updates(override),
				override
			);
		},

		removeEvent(id: number, datetime: number) {
			const d = new Date(datetime);
			const year = d.getFullYear();
			const month = d.getMonth() + 1;
			const override = loadEvents({ year, month }).withOverride((events) =>
				events.filter((e) => e.id !== id)
			);
			const args = { id };
			return dispatchCommand(
				'calendars:removeEvent',
				args,
				() => removeEvent(args).updates(override),
				override
			);
		},

		removeFutureEvents(recurrenceGroupId: string, fromDatetime: number) {
			const d = new Date(fromDatetime);
			const year = d.getFullYear();
			const month = d.getMonth() + 1;
			const override = loadEvents({ year, month }).withOverride((events) =>
				events.filter(
					(e) => !(e.recurrenceGroupId === recurrenceGroupId && e.datetime >= fromDatetime)
				)
			);
			const args = { recurrenceGroupId, fromDatetime };
			return dispatchCommand(
				'calendars:removeFutureEvents',
				args,
				() => removeFutureEvents(args).updates(override),
				override
			);
		}
	};
}

export type CalendarStore = ReturnType<typeof createCalendarStore>;
