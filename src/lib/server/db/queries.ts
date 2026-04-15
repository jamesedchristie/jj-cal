import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';
import { type DrizzleClient } from '.';
import { calendarsTable, eventsTable, invitesTable, listItemsTable, listsTable, type ListType, usersTable } from './schema';

// ---------------------------------------------------------------------------
// User management is now handled by better-auth. These helpers have been
// removed: getUserByToken, getUserByName, setUserToken, createUser.
// ---------------------------------------------------------------------------

// jj-cal-4v2c / jj-cal-85er: fetch user display fields for colour-coding and assignee picker
export async function getUsersBasic(db: DrizzleClient) {
	const rows = await db.select().from(usersTable);
	return rows.map((u) => ({
		id: u.id,
		name: u.name,
		displayName: u.displayName,
		colour: u.colour
	}));
}

// jj-cal-4rop: invite system

export async function createInvite(
	db: DrizzleClient,
	input: { id: string; token: string; createdById: string; createdAt: Date; expiresAt: Date }
) {
	const { id, token, createdById, createdAt, expiresAt } = input;
	const rows = await db
		.insert(invitesTable)
		.values({ id, token, createdById, createdAt, expiresAt })
		.returning();
	return rows[0];
}

export async function getAllInvites(db: DrizzleClient) {
	return db.select().from(invitesTable).orderBy(desc(invitesTable.createdAt));
}

export async function getInviteByToken(db: DrizzleClient, token: string) {
	const rows = await db.select().from(invitesTable).where(eq(invitesTable.token, token));
	return rows[0] ?? null;
}

export async function revokeInvite(db: DrizzleClient, id: string) {
	await db
		.update(invitesTable)
		.set({ revokedAt: new Date() })
		.where(eq(invitesTable.id, id));
}

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

// jj-cal-o6bu / jj-cal-m3vk: lists + list items

export async function getListsForUser(db: DrizzleClient, userId: string) {
	return db
		.select()
		.from(listsTable)
		.where(eq(listsTable.createdById, userId))
		.orderBy(asc(listsTable.createdAt));
}

export async function createList(
	db: DrizzleClient,
	input: { id: string; name: string; type: ListType; createdById: string }
) {
	const rows = await db
		.insert(listsTable)
		.values({ ...input, createdAt: new Date() })
		.returning();
	return rows[0];
}

/**
 * Return the first todo-type list for the user, creating a "My tasks" list if
 * none exists yet (new users who never had any todos won't have one after the
 * migration).
 */
export async function getOrCreatePrimaryList(db: DrizzleClient, userId: string) {
	const existing = await db
		.select()
		.from(listsTable)
		.where(and(eq(listsTable.createdById, userId), eq(listsTable.type, 'todo')))
		.orderBy(asc(listsTable.createdAt))
		.limit(1);

	if (existing[0]) return existing[0];

	const rows = await db
		.insert(listsTable)
		.values({
			id: crypto.randomUUID(),
			name: 'My tasks',
			type: 'todo',
			createdById: userId,
			createdAt: new Date()
		})
		.returning();
	return rows[0];
}

export async function getListItems(db: DrizzleClient, listId: string) {
	return db
		.select()
		.from(listItemsTable)
		.where(eq(listItemsTable.listId, listId))
		.orderBy(asc(listItemsTable.sortOrder), asc(listItemsTable.createdAt));
}

export async function createListItem(
	db: DrizzleClient,
	input: {
		listId: string;
		text: string;
		createdById: string;
		sortOrder: number;
		dueDate?: string | null;
		assignedToId?: string | null;
	}
) {
	const rows = await db
		.insert(listItemsTable)
		.values({ ...input, id: crypto.randomUUID(), createdAt: new Date() })
		.returning();
	return rows[0];
}

export async function setListItemCompleted(db: DrizzleClient, id: string, completed: boolean) {
	const rows = await db
		.update(listItemsTable)
		.set({ completed, completedAt: completed ? new Date() : null })
		.where(eq(listItemsTable.id, id))
		.returning();
	return rows[0];
}

export async function deleteListItem(db: DrizzleClient, id: string) {
	await db.delete(listItemsTable).where(eq(listItemsTable.id, id));
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
