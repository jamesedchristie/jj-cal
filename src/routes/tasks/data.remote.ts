import { form, getRequestEvent, query } from '$app/server';
import {
	createListItem,
	deleteListItem,
	getListItems,
	getOrCreatePrimaryList,
	getUsersBasic,
	setListItemCompleted
} from '$lib/server/db/queries';
import * as v from 'valibot';

export const getPrimaryList = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.user) throw 'Not authenticated';
	return getOrCreatePrimaryList(locals.db, locals.user.id);
});

export const getItems = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.user) throw 'Not authenticated';
	const list = await getOrCreatePrimaryList(locals.db, locals.user.id);
	return getListItems(locals.db, list.id);
});

export const getUsers = query(async () => {
	const { locals } = getRequestEvent();
	return getUsersBasic(locals.db);
});

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
		completed: v.pipe(v.string(), v.transform((val) => val === 'true'))
	}),
	async ({ id, completed }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await setListItemCompleted(locals.db, id, completed);
		void getItems().refresh();
	}
);

export const removeItem = form(
	v.object({ id: v.pipe(v.string(), v.nonEmpty()) }),
	async ({ id }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await deleteListItem(locals.db, id);
		void getItems().refresh();
	}
);
