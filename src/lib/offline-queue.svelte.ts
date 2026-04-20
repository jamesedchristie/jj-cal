const STORAGE_KEY = 'jj-cal-write-queue';
const FAILURES_KEY = 'jj-cal-write-failures';
const MAX_NETWORK_ATTEMPTS = 5;

interface QueuedForm {
	kind: 'form';
	id: string;
	url: string;
	body: string; // application/x-www-form-urlencoded
	timestamp: number;
	attempts: number;
}

interface QueuedCommand {
	kind: 'command';
	id: string;
	key: string;
	args: unknown; // JSON-serializable
	timestamp: number;
	attempts: number;
}

type QueuedItem = QueuedForm | QueuedCommand;

export type FailedItem =
	| (QueuedForm & { reason: 'network' | 'server'; status?: number })
	| (QueuedCommand & { reason: 'network' | 'server' | 'unregistered' });

type CommandFn = (args: unknown) => Promise<unknown>;

function loadFromStorage<T>(key: string): T[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

class OfflineQueue {
	#queue = $state<QueuedItem[]>(loadFromStorage<QueuedItem>(STORAGE_KEY));
	#failures = $state<FailedItem[]>(loadFromStorage<FailedItem>(FAILURES_KEY));
	#drainCallbacks = new Set<() => void>();
	#commandRegistry = new Map<string, CommandFn>();
	online = $state(typeof navigator !== 'undefined' ? navigator.onLine : true);

	constructor() {
		if (typeof window === 'undefined') return;
		window.addEventListener('online', () => {
			this.online = true;
			this.drain();
		});
		window.addEventListener('offline', () => {
			this.online = false;
		});
	}

	get pendingCount() {
		return this.#queue.length;
	}

	get failures(): readonly FailedItem[] {
		return this.#failures;
	}

	/** Register a command so queued offline invocations can be replayed by key. Called at module load from data.remote.ts files. */
	registerCommand(key: string, fn: CommandFn): void {
		this.#commandRegistry.set(key, fn);
		// A queued command for this key may have been waiting for registration.
		if (this.online && this.#queue.some((q) => q.kind === 'command' && q.key === key)) {
			void this.drain();
		}
	}

	enqueue(url: string, body: string): void {
		this.#queue.push({
			kind: 'form',
			id: crypto.randomUUID(),
			url,
			body,
			timestamp: Date.now(),
			attempts: 0
		});
		this.#save();
	}

	enqueueCommand(key: string, args: unknown): void {
		this.#queue.push({
			kind: 'command',
			id: crypto.randomUUID(),
			key,
			args,
			timestamp: Date.now(),
			attempts: 0
		});
		this.#save();
	}

	dismissFailure(id: string): void {
		this.#failures = this.#failures.filter((f) => f.id !== id);
		this.#save();
	}

	/** Fires when a drain finishes with nothing left to retry. Server-rejected writes move to failures and do NOT block the callback — pages should refresh their queries on drain. */
	onDrained(cb: () => void): () => void {
		this.#drainCallbacks.add(cb);
		return () => this.#drainCallbacks.delete(cb);
	}

	async drain(): Promise<void> {
		if (this.#queue.length === 0) return;
		const toProcess = [...this.#queue];
		const retryable: QueuedItem[] = [];
		const newFailures: FailedItem[] = [];
		for (const item of toProcess) {
			if (item.kind === 'form') {
				const next: QueuedForm = { ...item, attempts: item.attempts + 1 };
				try {
					const res = await fetch(item.url, {
						method: 'POST',
						body: item.body,
						headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
					});
					if (res.ok) continue;
					newFailures.push({ ...next, reason: 'server', status: res.status });
				} catch {
					if (next.attempts >= MAX_NETWORK_ATTEMPTS) {
						newFailures.push({ ...next, reason: 'network' });
					} else {
						retryable.push(next);
					}
				}
			} else {
				const fn = this.#commandRegistry.get(item.key);
				if (!fn) {
					// Module owning this command hasn't loaded yet — keep queued for later.
					retryable.push(item);
					continue;
				}
				const next: QueuedCommand = { ...item, attempts: item.attempts + 1 };
				try {
					await fn(item.args);
					continue;
				} catch {
					if (next.attempts >= MAX_NETWORK_ATTEMPTS) {
						newFailures.push({ ...next, reason: 'network' });
					} else {
						retryable.push(next);
					}
				}
			}
		}
		this.#queue = retryable;
		if (newFailures.length) this.#failures = [...this.#failures, ...newFailures];
		this.#save();
		if (retryable.length === 0) {
			this.#drainCallbacks.forEach((cb) => cb());
		}
	}

	#save() {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#queue));
		localStorage.setItem(FAILURES_KEY, JSON.stringify(this.#failures));
	}
}

export const offlineQueue = new OfflineQueue();

/** Encode an HTMLFormElement as x-www-form-urlencoded, as required by offline replay. */
export function encodeForm(form: HTMLFormElement): string {
	return new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString();
}

/**
 * Minimal wrapper for form.enhance callbacks on pages that don't need optimistic
 * overrides — just queues the write when offline so it's not silently lost.
 * Returns a promise resolving to `ok` (true if queued or server accepted).
 */
export async function enqueueOrSubmit(
	form: HTMLFormElement,
	submit: () => Promise<boolean>
): Promise<boolean> {
	if (!offlineQueue.online) {
		offlineQueue.enqueue(form.action, encodeForm(form));
		return true;
	}
	return submit();
}
