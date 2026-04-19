import { untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import type { RecurrenceInterval } from '$lib/recurrence';

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

class ListStore {
	#lists = new SvelteMap<string, ListItem[]>();
	// IDs of items added optimistically, not yet confirmed by server
	#pendingAddIds = new Set<string>();

	getItems(listId: string): ListItem[] {
		return this.#lists.get(listId) ?? [];
	}

	// Merge server items into store; keeps pending adds that haven't been confirmed yet
	sync(listId: string, serverItems: ListItem[]): void {
		const current = untrack(() => this.#lists.get(listId) ?? []);
		for (const item of serverItems) this.#pendingAddIds.delete(item.id);
		const stillPending = current.filter((i) => this.#pendingAddIds.has(i.id));
		this.#lists.set(listId, [...serverItems, ...stillPending]);
	}

	add(item: ListItem): void {
		this.#pendingAddIds.add(item.id);
		const current = this.#lists.get(item.listId) ?? [];
		this.#lists.set(item.listId, [...current, item]);
	}

	revertAdd(listId: string, itemId: string): void {
		this.#pendingAddIds.delete(itemId);
		const current = this.#lists.get(listId) ?? [];
		this.#lists.set(listId, current.filter((i) => i.id !== itemId));
	}

	toggle(listId: string, itemId: string, completed: boolean): void {
		const current = this.#lists.get(listId) ?? [];
		this.#lists.set(
			listId,
			current.map((i) =>
				i.id === itemId ? { ...i, completed, completedAt: completed ? new Date() : null } : i
			)
		);
	}

	edit(listId: string, itemId: string, text: string): void {
		const current = this.#lists.get(listId) ?? [];
		this.#lists.set(
			listId,
			current.map((i) => (i.id === itemId ? { ...i, text } : i))
		);
	}

	remove(listId: string, itemId: string): void {
		const current = this.#lists.get(listId) ?? [];
		this.#lists.set(listId, current.filter((i) => i.id !== itemId));
	}

	revertRemove(listId: string, item: ListItem): void {
		const current = this.#lists.get(listId) ?? [];
		this.#lists.set(listId, [...current, item]);
	}
}

export const listStore = new ListStore();
