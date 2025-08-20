import type { eventsTable } from '$lib/server/db/schema';

export class CalendarEvent {
	id: number;
	datetime: number;
	text: string;
	calendar_slug: string;
	calendar_id: number;
	created_by_name: string;
	created_by_id: number;
	constructor(e: typeof eventsTable.$inferSelect) {
		this.id = $state(e.id);
		this.datetime = $state(e.datetime);
		this.text = $state(e.text);
		this.calendar_slug = $state(e.calendar_slug);
		this.calendar_id = $state(e.calendar_id);
		this.created_by_name = $state(e.created_by_name);
		this.created_by_id = $state(e.created_by_id);
	}
}
