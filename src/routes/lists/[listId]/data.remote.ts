import { error } from '@sveltejs/kit';
import { form, getRequestEvent, query } from '$app/server';
import {
	createListItem,
	deleteListItem,
	getListAccess,
	getListItems,
	getListWithAccess,
	getUsersBasic,
	setListItemCompleted
} from '$lib/server/db/queries';
import * as v from 'valibot';

export const getList = query(async () => {
	const { locals, params } = getRequestEvent();
	if (!locals.user) throw 'Not authenticated';
	const list = await getListWithAccess(locals.db, params.listId, locals.user.id);
	if (!list) error(404, 'List not found');
	return list;
});

export const getItems = query(async () => {
	const { locals, params } = getRequestEvent();
	if (!locals.user) throw 'Not authenticated';
	// Verify access before returning items
	const access = await getListAccess(locals.db, params.listId, locals.user.id);
	if (!access) error(403, 'Access denied');
	return getListItems(locals.db, params.listId);
});

export const getUsers = query(async () => {
	const { locals } = getRequestEvent();
	return getUsersBasic(locals.db);
});

async function requireEditor(db: Parameters<typeof getListAccess>[0], listId: string, userId: string) {
	const access = await getListAccess(db, listId, userId);
	if (!access) error(403, 'Access denied');
	if (access === 'viewer') error(403, 'Editor access required');
}

export const addItem = form(
	v.object({
		list_id: v.pipe(v.string(), v.nonEmpty()),
		text: v.pipe(v.string(), v.nonEmpty()),
		due_date: v.pipe(v.string(), v.transform((s) => s || null)),
		assigned_to_id: v.pipe(v.string(), v.transform((s) => s || null))
	}),
	async ({ list_id, text, due_date, assigned_to_id }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await requireEditor(locals.db, list_id, locals.user.id);
		await createListItem(locals.db, {
			listId: list_id,
			text: text.trim(),
			createdById: locals.user.id,
			sortOrder: Date.now(),
			dueDate: due_date,
			assignedToId: assigned_to_id
		});
		void getItems().refresh();
	}
);

export const toggleItem = form(
	v.object({
		id: v.pipe(v.string(), v.nonEmpty()),
		list_id: v.pipe(v.string(), v.nonEmpty()),
		completed: v.pipe(v.string(), v.transform((val) => val === 'true'))
	}),
	async ({ id, list_id, completed }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await requireEditor(locals.db, list_id, locals.user.id);
		await setListItemCompleted(locals.db, id, completed);
		void getItems().refresh();
	}
);

export const removeItem = form(
	v.object({
		id: v.pipe(v.string(), v.nonEmpty()),
		list_id: v.pipe(v.string(), v.nonEmpty())
	}),
	async ({ id, list_id }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await requireEditor(locals.db, list_id, locals.user.id);
		await deleteListItem(locals.db, id);
		void getItems().refresh();
	}
);
