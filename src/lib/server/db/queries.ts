import { and, asc, count, desc, eq, gt, inArray, lt } from 'drizzle-orm';
import { type DrizzleClient } from '.';
import {
	calendarsTable,
	eventsTable,
	invitesTable,
	listItemsTable,
	listsTable,
	type ListType,
	type Permission,
	type ResourceType,
	resourceSharesTable,
	usersTable
} from './schema';

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
// jj-cal-p8qn: ACL enforcement

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

/**
 * Returns 'owner' | 'editor' | 'viewer' for the given user+list, or null if
 * the user has no access at all. Owner access is implicit (createdById match);
 * editor/viewer come from resource_shares.
 */
export async function getListAccess(
	db: DrizzleClient,
	listId: string,
	userId: string
): Promise<'owner' | 'editor' | 'viewer' | null> {
	const list = await db
		.select({ createdById: listsTable.createdById })
		.from(listsTable)
		.where(eq(listsTable.id, listId))
		.limit(1);

	if (!list[0]) return null;
	if (list[0].createdById === userId) return 'owner';

	const share = await db
		.select({ permission: resourceSharesTable.permission })
		.from(resourceSharesTable)
		.where(
			and(
				eq(resourceSharesTable.resourceType, 'list'),
				eq(resourceSharesTable.resourceId, listId),
				eq(resourceSharesTable.userId, userId)
			)
		)
		.limit(1);

	if (!share[0]) return null;
	return share[0].permission as 'editor' | 'viewer';
}

/**
 * Fetch a list and attach the requesting user's access role. Returns null if
 * the list doesn't exist or the user has no access.
 */
export async function getListWithAccess(db: DrizzleClient, listId: string, userId: string) {
	const role = await getListAccess(db, listId, userId);
	if (!role) return null;

	const rows = await db
		.select()
		.from(listsTable)
		.where(eq(listsTable.id, listId))
		.limit(1);

	return rows[0] ? { ...rows[0], role } : null;
}

/**
 * All lists the user can see: owned lists + lists shared with them. Each entry
 * includes an `incompleteCount` and a `role` field.
 */
export async function getListsWithCounts(db: DrizzleClient, userId: string) {
	// Owned lists
	const owned = await db
		.select()
		.from(listsTable)
		.where(eq(listsTable.createdById, userId))
		.orderBy(asc(listsTable.createdAt));

	// Shares granted to this user for lists they don't own
	const shares = await db
		.select({ resourceId: resourceSharesTable.resourceId, permission: resourceSharesTable.permission })
		.from(resourceSharesTable)
		.where(
			and(
				eq(resourceSharesTable.resourceType, 'list'),
				eq(resourceSharesTable.userId, userId)
			)
		);

	const sharedIds = shares.map((s) => s.resourceId);
	const sharedLists =
		sharedIds.length > 0
			? await db.select().from(listsTable).where(inArray(listsTable.id, sharedIds))
			: [];

	const sharePermMap = new Map(shares.map((s) => [s.resourceId, s.permission as Permission]));

	const all = [
		...owned.map((l) => ({ ...l, role: 'owner' as const })),
		...sharedLists.map((l) => ({ ...l, role: sharePermMap.get(l.id)! }))
	];

	if (all.length === 0) return [];

	const counts = await db
		.select({ listId: listItemsTable.listId, n: count() })
		.from(listItemsTable)
		.where(
			and(
				inArray(listItemsTable.listId, all.map((l) => l.id)),
				eq(listItemsTable.completed, false)
			)
		)
		.groupBy(listItemsTable.listId);

	const countMap = new Map(counts.map((c) => [c.listId, c.n]));
	return all.map((l) => ({ ...l, incompleteCount: countMap.get(l.id) ?? 0 }));
}

// jj-cal-p8qn: ACL management (used by future sharing UI)

export async function shareResource(
	db: DrizzleClient,
	input: {
		resourceType: ResourceType;
		resourceId: string;
		userId: string;
		permission: Permission;
		createdById: string;
	}
) {
	const existing = await db
		.select({ id: resourceSharesTable.id })
		.from(resourceSharesTable)
		.where(
			and(
				eq(resourceSharesTable.resourceType, input.resourceType),
				eq(resourceSharesTable.resourceId, input.resourceId),
				eq(resourceSharesTable.userId, input.userId)
			)
		)
		.limit(1);

	if (existing[0]) {
		await db
			.update(resourceSharesTable)
			.set({ permission: input.permission })
			.where(eq(resourceSharesTable.id, existing[0].id));
		return existing[0].id;
	}

	const rows = await db
		.insert(resourceSharesTable)
		.values({ ...input, id: crypto.randomUUID(), createdAt: new Date() })
		.returning({ id: resourceSharesTable.id });
	return rows[0].id;
}

export async function removeResourceShare(db: DrizzleClient, shareId: string) {
	await db.delete(resourceSharesTable).where(eq(resourceSharesTable.id, shareId));
}

export async function getResourceSharesForResource(
	db: DrizzleClient,
	resourceType: ResourceType,
	resourceId: string
) {
	return db
		.select()
		.from(resourceSharesTable)
		.where(
			and(
				eq(resourceSharesTable.resourceType, resourceType),
				eq(resourceSharesTable.resourceId, resourceId)
			)
		);
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
