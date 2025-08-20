import type { LayoutServerLoad } from './$types';
import { loadCalendar } from './data.remote';

export const load: LayoutServerLoad = async ({ params }) => {
	const calendar = await loadCalendar(params.slug);
	return {
		calendar
	};
};
