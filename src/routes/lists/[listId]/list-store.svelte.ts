import type { RemoteQueryUpdate } from '@sveltejs/kit';
import { getToastService, ToastMessage } from '$lib/components/toast/toastService.svelte';
import { offlineQueue } from '$lib/offline-queue.svelte';
import { isEffectivelyComplete, type RecurrenceInterval } from '$lib/recurrence';
import { getItems } from './data.remote';

export type ListItem = {
	id: string;
	listId: string;
	text: string;
	completed: boolean;
	completedAt: Date | null;
	dueDate: string | null;
	sortOrder: number;
	createdAt: Date;
	createdById: string;
	assignedToId: string | null;
	recurrenceInterval: RecurrenceInterval | null;
};

// Shape of the object SvelteKit's form.enhance passes to our callback. `submit`
// returns a Promise that also exposes a chainable `.updates()` — that's how we
// tie the query override's lifecycle to the submission.
type EnhanceSubmit = () => Promise<boolean> & {
	updates: (...updates: RemoteQueryUpdate[]) => Promise<boolean>;
};
type EnhanceArgs = { form: HTMLFormElement; submit: EnhanceSubmit };

type AddInput = {
	id: string;
	text: string;
	dueDate: string | null;
	assignedToId: string | null;
	recurrenceInterval: RecurrenceInterval | null;
};

function encodeForm(form: HTMLFormElement): string {
	return new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString();
}

export function createListStore(listId: string) {
	const toast = getToastService();
	function showError(msg: string) {
		toast().show(new ToastMessage(msg, { type: 'error' }));
	}

	// Overrides applied while offline — released when the queue drains successfully.
	const offlineReleases = new Set<() => void>();

	$effect(() =>
		offlineQueue.onDrained(() => {
			void getItems().refresh();
			for (const release of offlineReleases) release();
			offlineReleases.clear();
		})
	);

	// Single source of truth: the remote query's cached value. Overrides applied
	// via withOverride flow through here automatically.
	const allItems = $derived<ListItem[]>(getItems().current ?? []);
	const incomplete = $derived(allItems.filter((t) => !isEffectivelyComplete(t)));
	const complete = $derived(allItems.filter((t) => isEffectivelyComplete(t)));
	const oneDayAgoMs = $derived(Date.now() - 24 * 60 * 60 * 1000);
	const recentlyCompleted = $derived(
		complete.filter((t) => t.completedAt && t.completedAt.getTime() > oneDayAgoMs)
	);
	const archivedCompleted = $derived(
		complete.filter((t) => !t.completedAt || t.completedAt.getTime() <= oneDayAgoMs)
	);

	// Submits the form online (tying the override to the submission) or, if
	// offline, keeps the override alive and enqueues the raw form for replay.
	function dispatch({ form, submit }: EnhanceArgs, override: () => void, errorMsg: string) {
		if (!offlineQueue.online) {
			offlineQueue.enqueue(form.action, encodeForm(form));
			offlineReleases.add(override);
			return;
		}
		submit()
			.updates(override)
			.then((ok) => {
				if (!ok) showError(errorMsg);
			});
	}

	return {
		get items() {
			return allItems;
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
				const override = getItems().withOverride((items) =>
					items.map((i) =>
						i.id === itemId ? { ...i, completed, completedAt: completed ? new Date() : null } : i
					)
				);
				dispatch(ctx, override, 'Failed to update item');
			};
		},

		removeHandler(itemId: string) {
			return (ctx: EnhanceArgs) => {
				const override = getItems().withOverride((items) => items.filter((i) => i.id !== itemId));
				dispatch(ctx, override, 'Failed to delete item');
			};
		},

		editHandler(itemId: string, newText: string) {
			return (ctx: EnhanceArgs) => {
				const override = getItems().withOverride((items) =>
					items.map((i) => (i.id === itemId ? { ...i, text: newText } : i))
				);
				dispatch(ctx, override, 'Failed to save');
			};
		},

		addHandler(input: AddInput) {
			return (ctx: EnhanceArgs) => {
				const optimistic: ListItem = {
					id: input.id,
					listId,
					text: input.text,
					completed: false,
					completedAt: null,
					dueDate: input.dueDate,
					assignedToId: input.assignedToId,
					recurrenceInterval: input.recurrenceInterval,
					sortOrder: Date.now(),
					createdAt: new Date(),
					createdById: ''
				};
				// Upsert-by-id so drain-then-refresh can't briefly duplicate the item
				// if the server ends up with the same id the form sent.
				const override = getItems().withOverride((items) => [
					...items.filter((i) => i.id !== optimistic.id),
					optimistic
				]);
				dispatch(ctx, override, 'Failed to add item');
			};
		},

		reorderHandler() {
			return (ctx: EnhanceArgs & { data: { ids: string } }) => {
				const ids = ctx.data.ids.split(',');
				const rank = new Map(ids.map((id, idx) => [id, idx]));
				const override = getItems().withOverride((items) => {
					const reordered = [...items].sort((a, b) => {
						const ra = rank.get(a.id);
						const rb = rank.get(b.id);
						if (ra === undefined && rb === undefined) return 0;
						if (ra === undefined) return 1;
						if (rb === undefined) return -1;
						return ra - rb;
					});
					return reordered;
				});
				dispatch(ctx, override, 'Failed to reorder');
			};
		}
	};
}

export type ListStore = ReturnType<typeof createListStore>;
