import type { getEventsForMonthAllCalendars } from '$lib/server/db/queries';
import type { EventRecurrenceRule } from '$lib/server/db/schema';

type EventRow = Awaited<ReturnType<typeof getEventsForMonthAllCalendars>>[number];

export class CalendarEvent {
	id: number;
	datetime: number;
	text: string;
	calendar_slug: string;
	calendar_id: number;
	calendar_name: string;
	calendar_colour: string | null;
	created_by_name: string;
	created_by_id: string;
	recurrenceRule: EventRecurrenceRule | null;
	isRecurring: boolean;
	baseEventId: number | null;
	originalDatetime: number | null;

	constructor(e: EventRow) {
		this.id = $state(e.id);
		this.datetime = $state(e.datetime);
		this.text = $state(e.text);
		this.calendar_slug = $state(e.calendar_slug);
		this.calendar_id = $state(e.calendar_id);
		this.calendar_name = $state(e.calendar_name);
		this.calendar_colour = $state(e.calendar_colour);
		this.created_by_name = $state(e.created_by_name);
		this.created_by_id = $state(e.created_by_id);
		this.recurrenceRule = $state(e.recurrenceRule);
		this.isRecurring = $state(e.isRecurring);
		this.baseEventId = $state(e.baseEventId);
		this.originalDatetime = $state(e.originalDatetime);
	}
}
