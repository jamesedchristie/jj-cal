import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	// This load function can be used to fetch data needed for the page.
	// Currently, it just returns the data passed from the server.
	const { user } = await parent();
	if (user) {
		redirect(303, resolve('/calendars'));
	}
};
