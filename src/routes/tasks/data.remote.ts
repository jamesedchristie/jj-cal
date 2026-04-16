import { form, getRequestEvent, query } from '$app/server';
import {
	createListItem,
	deleteListItem,
	getOrCreatePrimaryList,
	getTaskItemsForUser,
	getTodoListsForUser,
	getUsersBasic,
	setListItemCompleted
} from '$lib/server/db/queries';
import type { RecurrenceInterval } from '$lib/server/db/schema';
import * as v from 'valibot';

const recurrenceField = v.pipe(
	v.string(),
	v.transform((s) => (s || null) as RecurrenceInterval | null)
);

/**
 * All todo-type lists the user can access — used for the list picker in the add form.
 * Ensures the user has at least a personal "My tasks" list via getOrCreatePrimaryList.
 */
export const getTodoLists = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.user) throw 'Not authenticated';
	// Ensure primary list exists before fetching
	await getOrCreatePrimaryList(locals.db, locals.user.id);
	return getTodoListsForUser(locals.db, locals.user.id);
});

/**
 * Task items across all accessible todo lists.
 * mode='mine' (default): items assigned to me or unassigned items I created.
 * mode='all':            every item in every accessible todo list.
 */
export const getTaskItems = query(async (mode: 'mine' | 'all' = 'mine') => {
	const { locals } = getRequestEvent();
	if (!locals.user) throw 'Not authenticated';
	await getOrCreatePrimaryList(locals.db, locals.user.id);
	return getTaskItemsForUser(locals.db, locals.user.id, mode);
});

export const getUsers = query(async () => {
	const { locals } = getRequestEvent();
	return getUsersBasic(locals.db);
});

/**
 * FAB shortcut — adds an item to the user's primary todo list without
 * requiring the caller to know the list ID.
 */
export const addItemToPrimaryList = form(
	v.object({ text: v.pipe(v.string(), v.nonEmpty()) }),
	async ({ text }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		const list = await getOrCreatePrimaryList(locals.db, locals.user.id);
		await createListItem(locals.db, {
			listId: list.id,
			text: text.trim(),
			createdById: locals.user.id,
			sortOrder: Date.now()
		});
		void getTaskItems('mine').refresh();
		void getTaskItems('all').refresh();
	}
);

export const addItem = form(
	v.object({
		list_id: v.pipe(v.string(), v.nonEmpty()),
		text: v.pipe(v.string(), v.nonEmpty()),
		due_date: v.pipe(v.string(), v.transform((s) => s || null)),
		assigned_to_id: v.pipe(v.string(), v.transform((s) => s || null)),
		recurrence_interval: recurrenceField
	}),
	async ({ list_id, text, due_date, assigned_to_id, recurrence_interval }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await createListItem(locals.db, {
			listId: list_id,
			text: text.trim(),
			createdById: locals.user.id,
			sortOrder: Date.now(),
			dueDate: due_date,
			assignedToId: assigned_to_id,
			recurrenceInterval: recurrence_interval
		});
		void getTaskItems('mine').refresh();
		void getTaskItems('all').refresh();
	}
);

export const toggleItem = form(
	v.object({
		id: v.pipe(v.string(), v.nonEmpty()),
		completed: v.pipe(v.string(), v.transform((val) => val === 'true'))
	}),
	async ({ id, completed }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await setListItemCompleted(locals.db, id, completed);
		void getTaskItems('mine').refresh();
		void getTaskItems('all').refresh();
	}
);

export const removeItem = form(
	v.object({ id: v.pipe(v.string(), v.nonEmpty()) }),
	async ({ id }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await deleteListItem(locals.db, id);
		void getTaskItems('mine').refresh();
		void getTaskItems('all').refresh();
	}
);
