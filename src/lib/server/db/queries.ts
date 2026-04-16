import { and, asc, count, desc, eq, gt, inArray, isNull, lt, or } from 'drizzle-orm';
import { type DrizzleClient } from '.';
import {
	calendarsTable,
	eventExceptionsTable,
	eventsTable,
	invitesTable,
	listItemsTable,
	listsTable,
	type EventRecurrenceRule,
	type ListType,
	type Permission,
	type RecurrenceInterval,
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
	// Auto-assign a colour from the family palette based on how many calendars exist.
	const existing = await db.select({ id: calendarsTable.id }).from(calendarsTable);
	const colour = `family-${(existing.length % 8) + 1}`;
	const calendar = await db
		.insert(calendarsTable)
		.values({ name, slug, created_by_name, created_by_id, colour })
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
		recurrenceRule?: EventRecurrenceRule | null;
		recurrenceEndsOn?: string | null;
	}
) {
	const { calendarSlug, calendarId, datetime, text, created_by_name, created_by_id, recurrenceRule, recurrenceEndsOn } = input;
	const event = await db
		.insert(eventsTable)
		.values({
			calendar_id: calendarId,
			calendar_slug: calendarSlug,
			datetime,
			text,
			created_by_name,
			created_by_id,
			recurrenceRule: recurrenceRule ?? null,
			recurrenceEndsOn: recurrenceEndsOn ?? null
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

export async function updateResourceSharePermission(
	db: DrizzleClient,
	shareId: string,
	permission: Permission
) {
	await db
		.update(resourceSharesTable)
		.set({ permission })
		.where(eq(resourceSharesTable.id, shareId));
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

/**
 * Returns shares for a list with user display info joined in.
 * Used by the sharing UI to show avatars and names.
 */
export async function getListSharesWithUsers(db: DrizzleClient, listId: string) {
	return db
		.select({
			shareId: resourceSharesTable.id,
			permission: resourceSharesTable.permission,
			userId: usersTable.id,
			name: usersTable.name,
			displayName: usersTable.displayName,
			colour: usersTable.colour
		})
		.from(resourceSharesTable)
		.innerJoin(usersTable, eq(resourceSharesTable.userId, usersTable.id))
		.where(
			and(
				eq(resourceSharesTable.resourceType, 'list'),
				eq(resourceSharesTable.resourceId, listId)
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
		recurrenceInterval?: RecurrenceInterval | null;
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

// ---------------------------------------------------------------------------
// Recurrence engine
// ---------------------------------------------------------------------------

/** Advance a timestamp by one recurrence interval. */
function advanceByRule(datetime: number, rule: EventRecurrenceRule): number {
	const d = new Date(datetime);
	switch (rule) {
		case 'daily':       d.setDate(d.getDate() + 1);       break;
		case 'weekly':      d.setDate(d.getDate() + 7);       break;
		case 'fortnightly': d.setDate(d.getDate() + 14);      break;
		case 'monthly':     d.setMonth(d.getMonth() + 1);     break;
		case 'yearly':      d.setFullYear(d.getFullYear() + 1); break;
	}
	return d.getTime();
}

/**
 * Generate all occurrence timestamps for a recurring event that fall within
 * [windowStart, windowEnd). Respects recurrenceEndsOn.
 */
function generateOccurrences(
	baseTime: number,
	rule: EventRecurrenceRule,
	endsOn: string | null | undefined,
	windowStart: number,
	windowEnd: number
): number[] {
	const endsOnMs = endsOn ? new Date(endsOn + 'T23:59:59').getTime() : Infinity;
	const occurrences: number[] = [];
	let t = baseTime;
	// Advance past old occurrences efficiently for fixed-ms intervals
	if (rule === 'daily' || rule === 'weekly' || rule === 'fortnightly') {
		const stepMs = rule === 'daily' ? 86_400_000 : rule === 'weekly' ? 7 * 86_400_000 : 14 * 86_400_000;
		if (t < windowStart) {
			const steps = Math.floor((windowStart - t) / stepMs);
			t += steps * stepMs;
		}
	}
	// Collect occurrences within the window
	while (t < windowEnd) {
		if (t > endsOnMs) break;
		if (t >= windowStart) occurrences.push(t);
		t = advanceByRule(t, rule);
	}
	return occurrences;
}

export type CalendarEventRow = {
	id: number;
	calendar_id: number;
	calendar_slug: string;
	datetime: number;
	text: string;
	created_by_name: string;
	created_by_id: string;
	calendar_name: string;
	calendar_colour: string | null;
	// Recurrence metadata (null for one-off events)
	recurrenceRule: EventRecurrenceRule | null;
	isRecurring: boolean;
	// For recurring instances: the base event id + original datetime (used for exceptions)
	baseEventId: number | null;
	originalDatetime: number | null;
};

/**
 * Fetch events for a month across all calendars.
 * Handles both regular events and recurring series (with exception support).
 */
export async function getEventsForMonthAllCalendars(
	db: DrizzleClient,
	year: number,
	month: number
): Promise<CalendarEventRow[]> {
	const windowStart = new Date(year, month - 1, 1).getTime();
	const windowEnd   = new Date(year, month, 1).getTime();

	// 1. One-off events in the window
	const oneOffRows = await db
		.select({
			id: eventsTable.id,
			calendar_id: eventsTable.calendar_id,
			calendar_slug: eventsTable.calendar_slug,
			datetime: eventsTable.datetime,
			text: eventsTable.text,
			created_by_name: eventsTable.created_by_name,
			created_by_id: eventsTable.created_by_id,
			calendar_name: calendarsTable.name,
			calendar_colour: calendarsTable.colour
		})
		.from(eventsTable)
		.innerJoin(calendarsTable, eq(eventsTable.calendar_id, calendarsTable.id))
		.where(
			and(
				isNull(eventsTable.recurrenceRule),
				gt(eventsTable.datetime, windowStart),
				lt(eventsTable.datetime, windowEnd)
			)
		);

	const oneOff: CalendarEventRow[] = oneOffRows.map((r) => ({
		...r,
		recurrenceRule: null,
		isRecurring: false,
		baseEventId: null,
		originalDatetime: null
	}));

	// 2. Recurring base events whose series could overlap the window
	const recurringBase = await db
		.select({
			id: eventsTable.id,
			calendar_id: eventsTable.calendar_id,
			calendar_slug: eventsTable.calendar_slug,
			datetime: eventsTable.datetime,
			text: eventsTable.text,
			created_by_name: eventsTable.created_by_name,
			created_by_id: eventsTable.created_by_id,
			calendar_name: calendarsTable.name,
			calendar_colour: calendarsTable.colour,
			recurrenceRule: eventsTable.recurrenceRule,
			recurrenceEndsOn: eventsTable.recurrenceEndsOn
		})
		.from(eventsTable)
		.innerJoin(calendarsTable, eq(eventsTable.calendar_id, calendarsTable.id))
		.where(
			and(
				// Has a recurrence rule
				isNull(eventsTable.recurrenceRule) ? undefined : gt(eventsTable.id, -1),
				// Base event starts before the end of the window
				lt(eventsTable.datetime, windowEnd)
			)
		)
		// Re-fetch only rows where recurrenceRule IS NOT NULL
		.then((rows) => rows.filter((r) => r.recurrenceRule != null));

	if (recurringBase.length === 0) return oneOff;

	// 3. Load all exceptions for these base events
	const baseEventIds = recurringBase.map((r) => r.id);
	const exceptions = await db
		.select()
		.from(eventExceptionsTable)
		.where(inArray(eventExceptionsTable.eventId, baseEventIds));

	// Key: `${eventId}:${originalDatetime}`
	const exceptionMap = new Map(
		exceptions.map((ex) => [`${ex.eventId}:${ex.originalDatetime}`, ex])
	);

	// 4. Generate instances, apply exceptions
	const recurring: CalendarEventRow[] = [];
	for (const base of recurringBase) {
		const occurrences = generateOccurrences(
			base.datetime,
			base.recurrenceRule!,
			base.recurrenceEndsOn,
			windowStart,
			windowEnd
		);
		for (const occ of occurrences) {
			const key = `${base.id}:${occ}`;
			const ex = exceptionMap.get(key);
			if (ex?.isCancelled) continue;
			recurring.push({
				id: base.id,
				calendar_id: base.calendar_id,
				calendar_slug: base.calendar_slug,
				datetime: occ,
				text: ex?.overrideText ?? base.text,
				created_by_name: base.created_by_name,
				created_by_id: base.created_by_id,
				calendar_name: base.calendar_name,
				calendar_colour: base.calendar_colour,
				recurrenceRule: base.recurrenceRule,
				isRecurring: true,
				baseEventId: base.id,
				originalDatetime: occ
			});
		}
	}

	return [...oneOff, ...recurring];
}

// ---------------------------------------------------------------------------
// Event exception mutations
// ---------------------------------------------------------------------------

/** Cancel a single occurrence of a recurring event. */
export async function cancelEventOccurrence(
	db: DrizzleClient,
	eventId: number,
	originalDatetime: number
) {
	const existing = await db
		.select({ id: eventExceptionsTable.id })
		.from(eventExceptionsTable)
		.where(
			and(
				eq(eventExceptionsTable.eventId, eventId),
				eq(eventExceptionsTable.originalDatetime, originalDatetime)
			)
		)
		.limit(1);

	if (existing[0]) {
		await db
			.update(eventExceptionsTable)
			.set({ isCancelled: true })
			.where(eq(eventExceptionsTable.id, existing[0].id));
	} else {
		await db.insert(eventExceptionsTable).values({
			id: crypto.randomUUID(),
			eventId,
			originalDatetime,
			isCancelled: true
		});
	}
}

/** Override the text of a single occurrence of a recurring event. */
export async function overrideEventOccurrenceText(
	db: DrizzleClient,
	eventId: number,
	originalDatetime: number,
	text: string
) {
	const existing = await db
		.select({ id: eventExceptionsTable.id })
		.from(eventExceptionsTable)
		.where(
			and(
				eq(eventExceptionsTable.eventId, eventId),
				eq(eventExceptionsTable.originalDatetime, originalDatetime)
			)
		)
		.limit(1);

	if (existing[0]) {
		await db
			.update(eventExceptionsTable)
			.set({ overrideText: text, isCancelled: false })
			.where(eq(eventExceptionsTable.id, existing[0].id));
	} else {
		await db.insert(eventExceptionsTable).values({
			id: crypto.randomUUID(),
			eventId,
			originalDatetime,
			isCancelled: false,
			overrideText: text
		});
	}
}

/**
 * All todo-type lists the user has access to (owned + shared), with role.
 */
export async function getTodoListsForUser(db: DrizzleClient, userId: string) {
	const owned = await db
		.select()
		.from(listsTable)
		.where(and(eq(listsTable.createdById, userId), eq(listsTable.type, 'todo')))
		.orderBy(asc(listsTable.createdAt));

	const shares = await db
		.select({ resourceId: resourceSharesTable.resourceId, permission: resourceSharesTable.permission })
		.from(resourceSharesTable)
		.where(
			and(eq(resourceSharesTable.resourceType, 'list'), eq(resourceSharesTable.userId, userId))
		);

	const sharedIds = shares.map((s) => s.resourceId);
	const sharedTodoLists =
		sharedIds.length > 0
			? await db
					.select()
					.from(listsTable)
					.where(and(inArray(listsTable.id, sharedIds), eq(listsTable.type, 'todo')))
			: [];

	const sharePermMap = new Map(shares.map((s) => [s.resourceId, s.permission as Permission]));

	return [
		...owned.map((l) => ({ ...l, role: 'owner' as const })),
		...sharedTodoLists.map((l) => ({ ...l, role: sharePermMap.get(l.id)! }))
	];
}

/**
 * All task items from accessible todo-type lists.
 * mode='mine': items assigned to userId, or unassigned items created by userId.
 * mode='all':  every item in every accessible todo list.
 */
export async function getTaskItemsForUser(
	db: DrizzleClient,
	userId: string,
	mode: 'mine' | 'all'
) {
	const todoLists = await getTodoListsForUser(db, userId);
	if (todoLists.length === 0) return [];
	const listIds = todoLists.map((l) => l.id);

	const listNameMap = new Map(todoLists.map((l) => [l.id, l.name]));

	const rows = await db
		.select()
		.from(listItemsTable)
		.where(
			and(
				inArray(listItemsTable.listId, listIds),
				mode === 'mine'
					? or(
							eq(listItemsTable.assignedToId, userId),
							and(isNull(listItemsTable.assignedToId), eq(listItemsTable.createdById, userId))
						)
					: undefined
			)
		)
		.orderBy(asc(listItemsTable.sortOrder), asc(listItemsTable.createdAt));

	return rows.map((item) => ({ ...item, listName: listNameMap.get(item.listId) ?? '' }));
}
