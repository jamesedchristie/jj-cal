import { form, getRequestEvent, query } from '$app/server';
import { createList, getListsWithCounts } from '$lib/server/db/queries';
import type { ListType } from '$lib/server/db/schema';
import * as v from 'valibot';

export const getLists = query(async () => {
	const { locals } = getRequestEvent();
	if (!locals.user) throw 'Not authenticated';
	return getListsWithCounts(locals.db, locals.user.id);
});

export const newList = form(
	v.object({
		name: v.pipe(v.string(), v.nonEmpty()),
		type: v.pipe(
			v.string(),
			v.picklist(['todo', 'shopping', 'packing', 'custom']),
			v.transform((v) => v as ListType)
		)
	}),
	async ({ name, type }) => {
		const { locals } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		await createList(locals.db, {
			id: crypto.randomUUID(),
			name: name.trim(),
			type,
			createdById: locals.user.id
		});
		void getLists().refresh();
	}
);
