import type { RemoteQueryOverride, RemoteQueryUpdate } from '@sveltejs/kit';
import { encodeForm, offlineQueue } from '$lib/offline-queue.svelte';
import { isEffectivelyComplete, type RecurrenceInterval } from '$lib/recurrence';
import { getTaskItems } from './data.remote';

type TaskItem = Awaited<ReturnType<typeof getTaskItems>>[number];

type EnhanceSubmit = () => Promise<boolean> & {
	updates: (...updates: RemoteQueryUpdate[]) => Promise<boolean>;
};
type EnhanceArgs = { form: HTMLFormElement; submit: EnhanceSubmit };

type AddInput = {
	id: string;
	listId: string;
	listName: string;
	text: string;
	dueDate: string | null;
	assignedToId: string | null;
	recurrenceInterval: RecurrenceInterval | null;
};

/** An override applied to BOTH 'mine' and 'all' caches so the UI stays coherent when the user toggles the view. */
function applyToBothViews(fn: (items: TaskItem[]) => TaskItem[]) {
	const release1 = getTaskItems('mine').withOverride(fn);
	const release2 = getTaskItems('all').withOverride(fn);
	return { release1, release2 };
}

export function createTasksStore(getMode: () => 'mine' | 'all') {
	const offlineReleases = new Set<() => void>();

	$effect(() =>
		offlineQueue.onDrained(() => {
			void getTaskItems('mine').refresh();
			void getTaskItems('all').refresh();
			for (const release of offlineReleases) release();
			offlineReleases.clear();
		})
	);

	const items = $derived<TaskItem[]>(getTaskItems(getMode()).current ?? []);
	const incomplete = $derived(items.filter((t) => !isEffectivelyComplete(t)));
	const complete = $derived(items.filter((t) => isEffectivelyComplete(t)));
	const oneDayAgo = $derived(Date.now() - 24 * 60 * 60 * 1000);
	const recentlyCompleted = $derived(
		complete.filter((t) => t.completedAt && t.completedAt.getTime() > oneDayAgo)
	);
	const archivedCompleted = $derived(
		complete.filter((t) => !t.completedAt || t.completedAt.getTime() <= oneDayAgo)
	);

	function dispatch(
		{ form, submit }: EnhanceArgs,
		overrides: { release1: RemoteQueryOverride; release2: RemoteQueryOverride }
	) {
		const { release1, release2 } = overrides;
		if (!offlineQueue.online) {
			offlineQueue.enqueue(form.action, encodeForm(form));
			offlineReleases.add(release1);
			offlineReleases.add(release2);
			return;
		}
		void submit().updates(release1, release2);
	}

	return {
		get items() {
			return items;
		},
		get incomplete() {
			return incomplete;
		},
		get recentlyCompleted() {
			return recentlyCompleted;
		},
		get archivedCompleted() {
			return archivedCompleted;
		},

		toggleHandler(itemId: string, completed: boolean) {
			return (ctx: EnhanceArgs) => {
				const overrides = applyToBothViews((items) =>
					items.map((i) =>
						i.id === itemId ? { ...i, completed, completedAt: completed ? new Date() : null } : i
					)
				);
				dispatch(ctx, overrides);
			};
		},

		removeHandler(itemId: string) {
			return (ctx: EnhanceArgs) => {
				const overrides = applyToBothViews((items) => items.filter((i) => i.id !== itemId));
				dispatch(ctx, overrides);
			};
		},

		editHandler(itemId: string, newText: string) {
			return (ctx: EnhanceArgs) => {
				const overrides = applyToBothViews((items) =>
					items.map((i) => (i.id === itemId ? { ...i, text: newText } : i))
				);
				dispatch(ctx, overrides);
			};
		},

		addHandler(input: AddInput) {
			return (ctx: EnhanceArgs) => {
				const optimistic: TaskItem = {
					id: input.id,
					listId: input.listId,
					listName: input.listName,
					text: input.text,
					completed: false,
					completedAt: null,
					dueDate: input.dueDate,
					assignedToId: input.assignedToId,
					recurrenceInterval: input.recurrenceInterval,
					sortOrder: Date.now(),
					createdAt: new Date(),
					createdById: ''
				} as TaskItem;
				const overrides = applyToBothViews((items) => [
					...items.filter((i) => i.id !== optimistic.id),
					optimistic
				]);
				dispatch(ctx, overrides);
			};
		},

		reorderHandler() {
			return (ctx: EnhanceArgs & { data: { ids: string } }) => {
				const ids = ctx.data.ids.split(',');
				const rank = new Map(ids.map((id, idx) => [id, idx]));
				const overrides = applyToBothViews((items) =>
					[...items].sort((a, b) => {
						const ra = rank.get(a.id);
						const rb = rank.get(b.id);
						if (ra === undefined && rb === undefined) return 0;
						if (ra === undefined) return 1;
						if (rb === undefined) return -1;
						return ra - rb;
					})
				);
				dispatch(ctx, overrides);
			};
		}
	};
}

export type TasksStore = ReturnType<typeof createTasksStore>;
