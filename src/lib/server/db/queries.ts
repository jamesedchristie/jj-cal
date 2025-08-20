import { and, eq, gt, lt } from 'drizzle-orm';
import { type DrizzleClient } from '.';
import { calendarsTable, eventsTable, usersTable } from './schema';

export async function getUserByName(db: DrizzleClient, name: string) {
	const user = await db.select().from(usersTable).where(eq(usersTable.name, name));
	return user[0] ?? null;
}

export async function getUserByToken(db: DrizzleClient, token: string) {
	const user = await db.select().from(usersTable).where(eq(usersTable.token, token));
	return user[0] ?? null;
}

export async function createUser(db: DrizzleClient, name: string) {
	const user = await db.insert(usersTable).values({ name }).returning();
	return user[0];
}

export async function setUserToken(db: DrizzleClient, user_id: number, token: string) {
	const user = await db
		.update(usersTable)
		.set({ token })
		.where(eq(usersTable.id, user_id))
		.returning();
	return user[0];
}

export async function createCalendar(
	db: DrizzleClient,
	input: { name: string; slug: string; created_by_name: string; created_by_id: number }
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
	input: { calendarSlug: string; datetime: number; text: string; name: string }
) {
	const { datetime, text, name } = input;
	const user = await getUserByName(db, name);
	if (!user) throw 'User not found';
	const calendar = await getCalendarBySlug(db, input.calendarSlug);
	if (!calendar) throw 'Calendar not found';
	const event = await db
		.insert(eventsTable)
		.values({
			calendar_id: calendar.id,
			calendar_slug: calendar.slug,
			datetime,
			text,
			created_by_name: user.name,
			created_by_id: user.id
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
