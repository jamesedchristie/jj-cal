import { error } from '@sveltejs/kit';
import { form, getRequestEvent, query } from '$app/server';
import {
	getListAccess,
	getListSharesWithUsers,
	getListWithAccess,
	getUsersBasic,
	removeResourceShare,
	shareResource,
	updateResourceSharePermission
} from '$lib/server/db/queries';
import type { Permission } from '$lib/server/db/schema';
import * as v from 'valibot';

export const getList = query(async () => {
	const { locals, params } = getRequestEvent();
	if (!locals.user) throw 'Not authenticated';
	const list = await getListWithAccess(locals.db, params.listId, locals.user.id);
	if (!list) error(404, 'List not found');
	return list;
});

export const getShares = query(async () => {
	const { locals, params } = getRequestEvent();
	if (!locals.user) throw 'Not authenticated';
	const access = await getListAccess(locals.db, params.listId, locals.user.id);
	if (!access) error(403, 'Access denied');
	return getListSharesWithUsers(locals.db, params.listId);
});

/** All family members not already sharing this list (excludes the owner too). */
export const getShareableUsers = query(async () => {
	const { locals, params } = getRequestEvent();
	if (!locals.user) throw 'Not authenticated';
	const [allUsers, existing] = await Promise.all([
		getUsersBasic(locals.db),
		getListSharesWithUsers(locals.db, params.listId)
	]);
	const excludedIds = new Set([locals.user.id, ...existing.map((s) => s.userId)]);
	return allUsers.filter((u) => !excludedIds.has(u.id));
});

export const addShare = form(
	v.object({
		user_id: v.pipe(v.string(), v.nonEmpty()),
		permission: v.pipe(
			v.string(),
			v.picklist(['viewer', 'editor']),
			v.transform((v) => v as Permission)
		)
	}),
	async ({ user_id, permission }) => {
		const { locals, params } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		const access = await getListAccess(locals.db, params.listId, locals.user.id);
		if (access !== 'owner') error(403, 'Only the owner can manage sharing');
		await shareResource(locals.db, {
			resourceType: 'list',
			resourceId: params.listId,
			userId: user_id,
			permission,
			createdById: locals.user.id
		});
		void getShares().refresh();
		void getShareableUsers().refresh();
	}
);

export const updateShare = form(
	v.object({
		share_id: v.pipe(v.string(), v.nonEmpty()),
		permission: v.pipe(
			v.string(),
			v.picklist(['viewer', 'editor']),
			v.transform((v) => v as Permission)
		)
	}),
	async ({ share_id, permission }) => {
		const { locals, params } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		const access = await getListAccess(locals.db, params.listId, locals.user.id);
		if (access !== 'owner') error(403, 'Only the owner can manage sharing');
		await updateResourceSharePermission(locals.db, share_id, permission);
		void getShares().refresh();
	}
);

export const removeShare = form(
	v.object({ share_id: v.pipe(v.string(), v.nonEmpty()) }),
	async ({ share_id }) => {
		const { locals, params } = getRequestEvent();
		if (!locals.user) throw 'Not authenticated';
		const access = await getListAccess(locals.db, params.listId, locals.user.id);
		if (access !== 'owner') error(403, 'Only the owner can manage sharing');
		await removeResourceShare(locals.db, share_id);
		void getShares().refresh();
		void getShareableUsers().refresh();
	}
);
