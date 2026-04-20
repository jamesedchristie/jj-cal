import type { RemoteQueryUpdate } from '@sveltejs/kit';
import { encodeForm, offlineQueue } from '$lib/offline-queue.svelte';
import { getLists } from './data.remote';

type List = Awaited<ReturnType<typeof getLists>>[number];

type EnhanceSubmit = () => Promise<boolean> & {
	updates: (...updates: RemoteQueryUpdate[]) => Promise<boolean>;
};
type EnhanceArgs = { form: HTMLFormElement; submit: EnhanceSubmit };

type NewListInput = { id: string; name: string; type: List['type'] };

export function createListsStore() {
	const offlineReleases = new Set<() => void>();

	$effect(() =>
		offlineQueue.onDrained(() => {
			void getLists().refresh();
			for (const release of offlineReleases) release();
			offlineReleases.clear();
		})
	);

	const lists = $derived<List[]>(getLists().current ?? []);
	const taskLists = $derived(lists.filter((l) => l.type === 'todo'));
	const otherLists = $derived(lists.filter((l) => l.type !== 'todo'));

	function dispatch({ form, submit }: EnhanceArgs, override: () => void) {
		if (!offlineQueue.online) {
			offlineQueue.enqueue(form.action, encodeForm(form));
			offlineReleases.add(override);
			return;
		}
		void submit().updates(override);
	}

	return {
		get lists() {
			return lists;
		},
		get taskLists() {
			return taskLists;
		},
		get otherLists() {
			return otherLists;
		},

		newListHandler(input: NewListInput) {
			return (ctx: EnhanceArgs) => {
				const optimistic: List = {
					id: input.id,
					name: input.name,
					type: input.type,
					role: 'owner',
					incompleteCount: 0,
					sortOrder: Date.now(),
					createdAt: new Date(),
					createdById: ''
				} as List;
				const override = getLists().withOverride((items) => [
					...items.filter((l) => l.id !== optimistic.id),
					optimistic
				]);
				dispatch(ctx, override);
			};
		},

		reorderHandler() {
			return (ctx: EnhanceArgs & { data: { ids: string } }) => {
				const ids = ctx.data.ids.split(',');
				const rank = new Map(ids.map((id, idx) => [id, idx]));
				const override = getLists().withOverride((items) =>
					[...items].sort((a, b) => {
						const ra = rank.get(a.id);
						const rb = rank.get(b.id);
						if (ra === undefined && rb === undefined) return 0;
						if (ra === undefined) return 1;
						if (rb === undefined) return -1;
						return ra - rb;
					})
				);
				dispatch(ctx, override);
			};
		}
	};
}

export type ListsStore = ReturnType<typeof createListsStore>;
