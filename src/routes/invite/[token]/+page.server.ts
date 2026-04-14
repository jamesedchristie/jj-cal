import { getInviteByToken } from '$lib/server/db/queries';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const invite = await getInviteByToken(locals.db, params.token);

	if (!invite) {
		error(404, 'Invite link not found');
	}
	if (invite.revokedAt) {
		error(410, 'This invite link has been revoked');
	}
	if (new Date(invite.expiresAt) < new Date()) {
		error(410, 'This invite link has expired');
	}

	return { token: params.token };
};
