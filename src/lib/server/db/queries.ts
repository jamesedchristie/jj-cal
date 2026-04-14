import { and, asc, eq, gt, lt } from 'drizzle-orm';
import { type DrizzleClient } from '.';
import { calendarsTable, eventsTable, todosTable } from './schema';

// ---------------------------------------------------------------------------
// User management is now handled by better-auth. These helpers have been
// removed: getUserByToken, getUserByName, setUserToken, createUser.
// ---------------------------------------------------------------------------

export async function createCalendar(
	db: DrizzleClient,
	input: { name: string; slug: string; created_by_name: string; created_by_id: string }
) {
	const { name, slug, created_by_name, created_by_id } = input;
	const calendar = await db
		.insert(calendarsTable)
		.values({ name, slug, created_by_name, created_by_id })
		.returning();
	return calendar[0];
}

export async function getAllCalendars(db: DrizzleClient) {
	const calendars = await db.select().from(calendarsTable);
	return calendars;
}

export async function getCalendarBySlug(db: DrizzleClient, slug: string) {
	const calendar = await db.select().from(calendarsTable).where(eq(calendarsTable.slug, slug));
	return calendar[0] ?? null;
}

export async function createEvent(
	db: DrizzleClient,
	input: {
		calendarSlug: string;
		calendarId: number;
		datetime: number;
		text: string;
		created_by_name: string;
		created_by_id: string;
	}
) {
	const { calendarSlug, calendarId, datetime, text, created_by_name, created_by_id } = input;
	const event = await db
		.insert(eventsTable)
		.values({
			calendar_id: calendarId,
			calendar_slug: calendarSlug,
			datetime,
			text,
			created_by_name,
			created_by_id
		})
		.returning();
	return event[0];
}

export async function updateEventText(db: DrizzleClient, id: number, text: string) {
	const event = await db
		.update(eventsTable)
		.set({ text })
		.where(eq(eventsTable.id, id))
		.returning();
	return event[0];
}

export async function deleteEvent(db: DrizzleClient, id: number) {
	await db.delete(eventsTable).where(eq(eventsTable.id, id));
	return true;
}

export async function getAllTodos(db: DrizzleClient) {
	return db.select().from(todosTable).orderBy(asc(todosTable.sort_order), asc(todosTable.created_at));
}

export async function createTodo(
	db: DrizzleClient,
	input: { text: string; created_by_id: string; created_by_name: string; sort_order: number; due_date?: string | null }
) {
	const todo = await db
		.insert(todosTable)
		.values({ ...input, created_at: Date.now() })
		.returning();
	return todo[0];
}

export async function setTodoCompleted(db: DrizzleClient, id: number, completed: boolean) {
	const todo = await db
		.update(todosTable)
		.set({ completed, completed_at: completed ? Date.now() : null })
		.where(eq(todosTable.id, id))
		.returning();
	return todo[0];
}

export async function deleteTodo(db: DrizzleClient, id: number) {
	await db.delete(todosTable).where(eq(todosTable.id, id));
}

export async function getEventsForMonth(
	db: DrizzleClient,
	calendar_slug: string,
	year: number,
	month: number
) {
	const startOfMonth = new Date(year, month - 1, 1).getTime();
	const endOfMonth = new Date(year, month, 1).getTime();
	const events = await db
		.select()
		.from(eventsTable)
		.where(
			and(
				eq(eventsTable.calendar_slug, calendar_slug),
				gt(eventsTable.datetime, startOfMonth),
				lt(eventsTable.datetime, endOfMonth)
			)
		);
	return events;
}
